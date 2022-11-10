const { By, Builder, ThenableWebDriver } = require("selenium-webdriver")
const { suite } = require("selenium-webdriver/testing")
const { testServer } = require("../utils")
const chrome = require("selenium-webdriver/chrome")
const chai = require("chai")
const path = require("path")
const assert = chai.assert

suite(function (env) {
  describe("Browser integration", function () {
    /** @typedef { import('http').Server } Server */
    let /** @type Server */ server,
      /** @type string */ url,
      /** @type ThenableWebDriver */ driver

    before(async function () {
      ;({ server, url } = await testServer({
        "/index.html": `${__dirname}/index.html`,
        "/onnxruntime-web": path.resolve(
          `${__dirname}/../../node_modules/onnxruntime-web/dist`
        ),
      }))

      const chromeOptions = new chrome.Options().addArguments()

      driver = new Builder()
        .forBrowser("chrome")
        .setChromeOptions(chromeOptions)
        .build()
    })

    after(async () => {
      await driver.quit()
      server.close()
    })

    it("simple vad test", async function () {
      const counters = [
        "frameCounter",
        "speechStartCounter",
        "speechEndCounter",
      ]
      await driver.get(url)

      await driver.manage().setTimeouts({ implicit: 500 })
      await Promise.all(
        counters.map(async (elId) => {
          const currentVal = await elementToInt(driver, elId)
          assert.strictEqual(currentVal, 0)
        })
      )

      await new Promise((res) => setTimeout(res, 200))
      driver.findElement(By.id("file-upload")).sendKeys(`${__dirname}/test.wav`)
      driver.findElement(By.id("file-submit")).submit()

      await new Promise((res) => setTimeout(res, 400))
      await Promise.all(
        counters.map(async (elId) => {
          const curVal = await elementToInt(driver, elId)
          assert.isAbove(curVal, 0)
        })
      )
    })
  })
})

async function elementToInt(driver, id) {
  const element = await driver.findElement(By.id(id))
  const text = await element.getText()
  const value = parseInt(text, 10)
  return value
}
