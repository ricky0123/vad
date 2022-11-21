const express = require("express")
const portfinder = require("portfinder")
const path = require("path")
const fs = require("fs")

const distDir = path.resolve(__dirname, "../dist")

exports.audioSamplePath = path.resolve(__dirname, "./test.wav")

exports.testServer = async function testServer(files) {
  const app = express()

  app.use("/", express.static(distDir))
  Object.entries(files).forEach((entry) => {
    const [path, file] = entry

    if (fs.lstatSync(file).isDirectory()) {
      app.use("/onnxruntime-web", express.static(file))
    } else {
      app.get(path, (req, res) => {
        res.sendFile(file)
      })
    }
  })

  const port = await portfinder.getPortPromise()

  const server = await new Promise((resolve, reject) => {
    const _server = app.listen(port, () => {
      resolve(_server)
    })
  })
  const url = `http://localhost:${port}/index.html`
  return { app, port, server, url }
}
