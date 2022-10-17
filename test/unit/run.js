const { testServer } = require("../utils")

async function main() {
  const { app, port, server, url } = await testServer({
    "/index.html": `${__dirname}/index.html`,
    "/frame-processor.spec.js": `${__dirname}/frame-processor.spec.js`,
  })

  console.log(`Listening on url ${url}`)
}
main()
