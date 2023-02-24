import express from "express"
import fs from "fs"

export const server = async (
  files: { prefix: string; localPath: string }[]
) => {
  const app = express()

  files.forEach(({ prefix, localPath }) => {
    if (fs.lstatSync(localPath).isDirectory()) {
      app.use(prefix, express.static(localPath))
    } else {
      app.get(prefix, (req, res) => {
        res.sendFile(localPath)
      })
    }
  })

  await new Promise((resolve, reject) => {
    const _server = app.listen(3000, () => {
      resolve(_server)
    })
  })
}
