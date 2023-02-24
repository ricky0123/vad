import { test, expect } from "@playwright/test"
import { Page } from "@playwright/test"
import path from "path"

const audioSamplePath = path.resolve(__dirname, "./test.wav")

test("file", async ({ page }) => {
  await page.goto("/file.html")
  await expect(page.getByText("VAD is ready now")).toBeVisible()

  const counterId = "speechSegmentCounter"
  const counter = page.locator(`#${counterId}`)
  await expect(counter).toHaveText("0")

  await page.locator("#file-upload").setInputFiles(audioSamplePath)
  await page.locator("#file-submit").click()

  await expect
    .poll(async () => await elementToInt(page, counterId))
    .toBeGreaterThan(0)
})

test("mic", async ({ page }) => {
  await page.goto("/mic.html")

  const counterIDs = ["frameCounter", "speechStartCounter", "speechEndCounter"]
  for (const counterID of counterIDs) {
    const counter = page.locator(`#${counterID}`)
    await expect(counter).toHaveText("0")
  }

  await page.locator("#start-audio").click()
  await expect(page.getByText("VAD is ready now")).toBeVisible()

  await page.locator("#file-upload").setInputFiles(audioSamplePath)
  await page.locator("#file-submit").click()

  for (const counterID of counterIDs) {
    await expect
      .poll(async () => await elementToInt(page, counterID), { timeout: 6000 })
      .toBeGreaterThan(0)
  }
})

async function elementToInt(page: Page, id: string) {
  const intText = await page.locator(`#${id}`).textContent()
  if (intText === null) {
    throw new Error()
  }
  return parseInt(intText, 10)
}

const sleep = (timeout) => new Promise((res) => setTimeout(res, 300))
