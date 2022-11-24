#!/usr/bin/env node

const express = require("express")
const portfinder = require("portfinder")
const path = require("path")
const fsPromise = require("fs/promises")

const distDir = path.resolve(__dirname, "../../dist")

async function main() {
  const app = express()

  app.use("/", express.static(distDir))

  var index = await fsPromise.readFile(
    path.resolve(__dirname, "./index.html"),
    {
      encoding: "ascii",
    }
  )
  index = index.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@ricky0123\/vad@\d+\.\d+\.\d+\/dist/g,
    ""
  )
  app.get("/index.html", (req, res) => {
    res.set("Content-Type", "text/html")
    res.send(Buffer.from(index))
  })

  const port = await portfinder.getPortPromise()

  const server = await new Promise((resolve, reject) => {
    const _server = app.listen(port, () => {
      resolve(_server)
    })
  })
  const url = `http://localhost:${port}/index.html`
  console.log(`Listening on ${url}`)
  return { app, port, server, url }
}

main()
