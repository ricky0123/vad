import { NonRealTimeVAD, utils } from "@ricky0123/vad-web"

let showMs = true
;(window as any).toggleUnit = () => {
  showMs = !showMs
  document
    .querySelectorAll("#segment-results td:not(:first-child)")
    .forEach((td: Element) => {
      const ms = Number((td as HTMLElement).getAttribute("data-ms"))
      ;(td as HTMLElement).textContent = showMs
        ? Math.round(ms).toString()
        : (ms / 1000).toFixed(3)
    })
  document
    .querySelectorAll("#segment-results th:not(:first-child)")
    .forEach((th: Element) => {
      const text = (th as HTMLElement).textContent
      if (text) {
        ;(th as HTMLElement).textContent = text.replace(
          /\((.*?)\)/,
          `(${showMs ? "ms" : "s"})`
        )
      }
    })
  const button = document.querySelector("#segment-results button")
  if (button) {
    button.textContent = showMs ? "Switch to Seconds" : "Switch to Milliseconds"
  }
}
;(window as any).testNonRealTime = async () => {
  const myvad = await NonRealTimeVAD.new()
  const fileEl = document.getElementById("file-upload") as HTMLInputElement
  const audioFile = (fileEl.files as FileList)[0] as File
  const { audio, sampleRate } = await utils.audioFileToArray(audioFile)

  // Create or clear the results container
  let resultsContainer = document.getElementById("segment-results")
  if (!resultsContainer) {
    resultsContainer = document.createElement("div")
    resultsContainer.id = "segment-results"
    resultsContainer.className = "mt-4 ml-0 max-w-2xl"
    const form = fileEl.closest("form")
    form?.parentNode?.insertBefore(resultsContainer, form.nextSibling)
  } else {
    resultsContainer.innerHTML = ""
  }

  // Create header with toggle button
  const header = document.createElement("div")
  header.className = "mb-2 flex justify-between items-center"
  header.innerHTML = `
    <div class="font-medium text-lg"></div>
    <button onclick="toggleUnit()" class="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-1 text-sm">
      Switch to Seconds
    </button>
  `
  resultsContainer.appendChild(header)

  // Create table
  const table = document.createElement("table")
  table.className = "w-full mt-2 border-collapse"
  table.innerHTML = `
    <thead class="bg-violet-100">
      <tr>
        <th class="p-2 text-left">#</th>
        <th class="p-2 text-left">Start (ms)</th>
        <th class="p-2 text-left">End (ms)</th>
        <th class="p-2 text-left">Duration (ms)</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `
  resultsContainer.appendChild(table)
  const tbody = table.querySelector("tbody")!

  let segmentNumber = 0
  for await (const { start, end } of myvad.run(audio, sampleRate)) {
    segmentNumber++
    const row = document.createElement("tr")
    row.className = segmentNumber % 2 === 0 ? "bg-gray-50" : "bg-white"
    row.innerHTML = `
      <td class="p-2 font-medium">${segmentNumber}.</td>
      <td class="p-2" data-ms="${start}">${Math.round(start)}</td>
      <td class="p-2" data-ms="${end}">${Math.round(end)}</td>
      <td class="p-2" data-ms="${end - start}">${Math.round(end - start)}</td>
    `
    tbody.appendChild(row)
  }

  // Update summary
  const summaryDiv = header.querySelector("div")
  if (summaryDiv) {
    summaryDiv.textContent =
      segmentNumber === 0
        ? "No speech segments detected"
        : `Found ${segmentNumber} speech segment${
            segmentNumber === 1 ? "" : "s"
          }`
  }

  if (segmentNumber === 0) {
    const noResults = document.createElement("tr")
    noResults.innerHTML = `
      <td colspan="4" class="p-2 text-center text-gray-500 italic">
        No segments to display
      </td>
    `
    tbody.appendChild(noResults)
  }

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: "smooth" })
}
