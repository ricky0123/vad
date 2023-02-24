import path from "path"
import { server } from "./server"

const _resolve = (relativePath: string) => path.resolve(__dirname, relativePath)

server([
  { prefix: "/", localPath: _resolve("../dist") },
  { prefix: "/", localPath: _resolve("../test-site") },
  {
    prefix: "/onnxruntime-web",
    localPath: _resolve("../../../node_modules/onnxruntime-web/dist"),
  },
])
