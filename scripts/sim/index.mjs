#!/usr/bin/env node
// sim - generate speech with known boundaries, run it through the VAD, report
// what happened. See scripts/sim/README.md.
import { execFile as execFileCb, spawn } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs, promisify } from "node:util"

import * as esbuild from "esbuild"
import { chromium } from "playwright"

const execFile = promisify(execFileCb)

const SIM_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SIM_DIR, "../..")
const CACHE = path.join(ROOT, ".sim-cache")
const SAMPLE_RATE = 16000

const DEFAULTS = {
  text: ["the quick brown fox jumps over the lazy dog"],
  gap: "2000",
  voice: "en_US-lessac-medium",
  gain: "1",
  noise: "0",
  seed: "0",
  model: "v5",
  positive: "0.3",
  negative: "0.25",
  redemption: "1400",
  "pre-speech-pad": "800",
  "min-speech": "400",
  out: "sim-out",
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      text: { type: "string", multiple: true },
      gap: { type: "string" },
      voice: { type: "string" },
      gain: { type: "string" },
      noise: { type: "string" },
      seed: { type: "string" },
      model: { type: "string" },
      positive: { type: "string" },
      negative: { type: "string" },
      redemption: { type: "string" },
      "pre-speech-pad": { type: "string" },
      "min-speech": { type: "string" },
      out: { type: "string" },
      compare: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean" },
    },
  })
  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }
  const merged = { ...DEFAULTS, ...values }
  if (!["v5", "v6", "legacy"].includes(merged.model)) {
    throw new Error(`--model must be v5, v6 or legacy, got ${merged.model}`)
  }
  return {
    text: merged.text,
    gapMs: Number(merged.gap),
    voice: merged.voice,
    gain: Number(merged.gain),
    noise: Number(merged.noise),
    seed: Number(merged.seed),
    model: merged.model,
    positiveSpeechThreshold: Number(merged.positive),
    negativeSpeechThreshold: Number(merged.negative),
    redemptionMs: Number(merged.redemption),
    preSpeechPadMs: Number(merged["pre-speech-pad"]),
    minSpeechMs: Number(merged["min-speech"]),
    outDir: path.resolve(ROOT, merged.out),
    compare: merged.compare ? path.resolve(ROOT, merged.compare) : null,
    json: Boolean(merged.json),
  }
}

const HELP = `
Usage: npm run sim -- [options]

Audio
  --text <string>       phrase to speak; repeat the flag for multiple phrases
  --gap <ms>            silence between and around phrases (default 2000)
  --voice <name>        piper voice (default en_US-lessac-medium)
  --gain <float>        amplitude scale, 1 = untouched (default 1)
  --noise <float>       noise floor amplitude (default 0)
  --seed <int>          seed for the noise (default 0)

VAD
  --model v5|v6|legacy  (default v5)
  --positive <float>    positiveSpeechThreshold (default 0.3)
  --negative <float>    negativeSpeechThreshold (default 0.25)
  --redemption <ms>     redemptionMs (default 1400)
  --pre-speech-pad <ms> preSpeechPadMs (default 800)
  --min-speech <ms>     minSpeechMs (default 400)

Output
  --out <dir>           output directory (default sim-out)
  --compare <run.json>  overlay an earlier run on the chart and summary
  --json                print the summary as JSON
`.trim()

// --- audio generation ---------------------------------------------------

/** piper installs as a script with a shebang; reuse whatever python it uses. */
async function piperPython() {
  const { stdout } = await execFile("which", ["piper"])
  const script = stdout.trim()
  const contents = await fs.readFile(script, "utf8")
  const match = contents.split("\n")[0].match(/^#!\s*(\S+)/)
  if (!match) throw new Error(`could not read shebang from ${script}`)
  return match[1]
}

async function ensureVoice(voice) {
  const voiceDir = path.join(CACHE, "voices")
  const model = path.join(voiceDir, `${voice}.onnx`)
  if (await exists(model)) return voiceDir

  console.error(`downloading piper voice ${voice}...`)
  await fs.mkdir(voiceDir, { recursive: true })
  const python = await piperPython()
  await execFile(python, [
    "-m",
    "piper.download_voices",
    voice,
    "--download-dir",
    voiceDir,
  ])
  return voiceDir
}

/**
 * Synthesize one phrase as 16 kHz mono float32. Cached by text and voice.
 *
 * --noise-scale/--noise-w-scale are pinned to 0 because piper's default
 * sampling is random: the same text gives different audio on every run, which
 * would make before/after comparisons meaningless.
 */
async function synthesize(text, voice, voiceDir) {
  const key = createHash("sha256")
    .update(JSON.stringify([voice, text, "nc0"]))
    .digest("hex")
    .slice(0, 16)
  const cached = path.join(CACHE, "phrases", `${key}.f32`)
  if (await exists(cached)) return readF32(cached)

  await fs.mkdir(path.dirname(cached), { recursive: true })
  const wav = `${cached}.wav`
  await new Promise((resolve, reject) => {
    const piper = spawn(
      "piper",
      [
        "-m",
        voice,
        "--data-dir",
        voiceDir,
        "--noise-scale",
        "0",
        "--noise-w-scale",
        "0",
        "-f",
        wav,
      ],
      { stdio: ["pipe", "ignore", "inherit"] }
    )
    piper.on("error", reject)
    piper.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`piper exited ${code}`))
    )
    piper.stdin.end(text)
  })

  await execFile("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    wav,
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-f",
    "f32le",
    cached,
  ])
  await fs.unlink(wav)
  return readF32(cached)
}

/** Lay phrases out with silence around them and record where the speech is. */
function stitch(phrases, gapMs) {
  const gap = Math.round((gapMs / 1000) * SAMPLE_RATE)
  const total =
    gap + phrases.reduce((sum, phrase) => sum + phrase.length + gap, 0)
  const audio = new Float32Array(total)
  const regions = []
  let at = gap
  for (const phrase of phrases) {
    audio.set(phrase, at)
    regions.push({ start: at, end: at + phrase.length })
    at += phrase.length + gap
  }
  return { audio, regions }
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function degrade(audio, gain, noise, seed) {
  if (gain === 1 && noise === 0) return audio
  const rand = mulberry32(seed)
  const out = new Float32Array(audio.length)
  for (let i = 0; i < audio.length; i++) {
    out[i] = audio[i] * gain + (rand() * 2 - 1) * noise
  }
  return out
}

// --- running ------------------------------------------------------------

async function bundleBrowserCode(outDir) {
  await esbuild.build({
    entryPoints: [path.join(SIM_DIR, "browser.ts")],
    outfile: path.join(outDir, "browser.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    logLevel: "warning",
  })
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".f32": "application/octet-stream",
}

/** Serve the repo so the page can reach the model, the wasm and the audio. */
function serveRepo() {
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0])
    const file = path.join(ROOT, rel)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end()
      return
    }
    try {
      const body = await fs.readFile(file)
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, port: server.address().port })
    )
  })
}

async function runInBrowser(params, outDir) {
  const { server, port } = await serveRepo()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error(`[page] ${msg.text()}`)
    })
    const rel = path.relative(ROOT, outDir)
    await page.goto(`http://127.0.0.1:${port}/${rel}/index.html`)
    return await page.evaluate((p) => window.runSim(p), params)
  } finally {
    await browser.close()
    server.close()
  }
}

/**
 * Pair the chart with the audio as an mp4.
 *
 * GitHub will not take a bare .wav as an issue or PR attachment, and the point
 * of a sim run is that someone can hear what the VAD heard. An mp4 of the chart
 * with the audio muxed against it plays inline.
 */
async function renderMp4(outDir) {
  const svg = path.join(outDir, "chart.svg")
  const png = path.join(outDir, "chart.png")
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 320 },
    })
    await page.goto(`file://${svg}`)
    await page.screenshot({ path: png })
  } finally {
    await browser.close()
  }
  await execFile("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-loop",
    "1",
    "-i",
    png,
    "-i",
    path.join(outDir, "audio.wav"),
    "-c:v",
    "libx264",
    "-tune",
    "stillimage",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    path.join(outDir, "sim.mp4"),
  ])
}

// --- scoring ------------------------------------------------------------

/**
 * Compare probabilities against the regions we know contain speech, and
 * segments against those regions only coarsely.
 *
 * Segment boundaries are deliberately not scored. FrameProcessor prepends
 * preSpeechPadMs and holds on for at least redemptionMs after the last speech
 * frame, so a perfectly detected utterance still comes out more than two
 * seconds longer than the speech itself.
 */
function summarize(result, regions, positiveSpeechThreshold) {
  const { probs, frameSamples } = result
  const toSeconds = (samples) => samples / SAMPLE_RATE

  let speechTotal = 0
  let speechOver = 0
  let silenceTotal = 0
  let silenceOver = 0
  for (let frame = 0; frame < probs.length; frame++) {
    const middle = frame * frameSamples + frameSamples / 2
    const isSpeech = regions.some((r) => middle >= r.start && middle < r.end)
    const over = probs[frame] >= positiveSpeechThreshold
    if (isSpeech) {
      speechTotal++
      if (over) speechOver++
    } else {
      silenceTotal++
      if (over) silenceOver++
    }
  }

  const segments = result.events
    .filter((e) => e.msg === "SPEECH_END")
    .map((e) => ({
      start: toSeconds(e.startFrame * frameSamples),
      end: toSeconds((e.endFrame + 1) * frameSamples),
    }))

  const utterances = regions.map((r, index) => {
    const start = toSeconds(r.start)
    const end = toSeconds(r.end)
    return {
      index: index + 1,
      start,
      end,
      detected: segments.some((s) => s.start < end && s.end > start),
    }
  })

  return {
    frames: probs.length,
    frameSamples,
    msPerFrame: result.msPerFrame,
    meanProb: probs.reduce((a, b) => a + b, 0) / probs.length,
    speechOver,
    speechTotal,
    silenceOver,
    silenceTotal,
    segments,
    misfires: result.events.filter((e) => e.msg === "VAD_MISFIRE").length,
    utterances,
  }
}

function formatSummary(summary, args, durationSeconds) {
  const pct = (n, d) => (d === 0 ? "n/a" : `${Math.round((n / d) * 100)}%`)
  const lines = [
    `text     ${args.text.map((t) => JSON.stringify(t)).join(", ")}`,
    `audio    ${durationSeconds.toFixed(2)}s   gap ${args.gapMs}ms   gain ${
      args.gain
    }   noise ${args.noise}   seed ${args.seed}`,
    `model    ${args.model}   pos ${args.positiveSpeechThreshold}  neg ${args.negativeSpeechThreshold}  redemption ${args.redemptionMs}ms  pad ${args.preSpeechPadMs}ms  minSpeech ${args.minSpeechMs}ms`,
    ``,
    `frames   ${summary.frames} (${summary.frameSamples} samples, ${
      summary.msPerFrame
    }ms)   mean prob ${summary.meanProb.toFixed(3)}`,
    ``,
    `speech frames over ${args.positiveSpeechThreshold}    ${
      summary.speechOver
    } / ${summary.speechTotal}   (${pct(
      summary.speechOver,
      summary.speechTotal
    )})`,
    `silence frames over ${args.positiveSpeechThreshold}   ${
      summary.silenceOver
    } / ${summary.silenceTotal}   (${pct(
      summary.silenceOver,
      summary.silenceTotal
    )})`,
    ``,
  ]
  for (const u of summary.utterances) {
    lines.push(
      `utterance ${u.index}   ${u.start.toFixed(2)}-${u.end.toFixed(2)}   ${
        u.detected ? "detected" : "NOT DETECTED"
      }`
    )
  }
  lines.push(``)
  lines.push(
    `segments ${summary.segments.length}   misfires ${summary.misfires}`
  )
  for (const s of summary.segments) {
    lines.push(`  ${s.start.toFixed(2)}-${s.end.toFixed(2)}`)
  }
  return lines.join("\n")
}

// --- chart --------------------------------------------------------------

function chartSvg(summary, probs, regions, args, durationSeconds, compare) {
  const W = 1000
  const H = 320
  const pad = { top: 20, right: 20, bottom: 30, left: 45 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const x = (seconds) => pad.left + (seconds / durationSeconds) * plotW
  const y = (prob) => pad.top + (1 - prob) * plotH

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="monospace" font-size="11">`,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
  ]

  for (const r of regions) {
    const x0 = x(r.start / SAMPLE_RATE)
    const x1 = x(r.end / SAMPLE_RATE)
    parts.push(
      `<rect x="${x0.toFixed(1)}" y="${pad.top}" width="${(x1 - x0).toFixed(
        1
      )}" height="${plotH}" fill="#cfe8cf"/>`
    )
  }
  for (const s of summary.segments) {
    const x0 = x(s.start)
    const x1 = x(s.end)
    parts.push(
      `<rect x="${x0.toFixed(1)}" y="${pad.top}" width="${(x1 - x0).toFixed(
        1
      )}" height="${plotH}" fill="#3b6ea5" fill-opacity="0.18"/>`,
      `<rect x="${x0.toFixed(1)}" y="${pad.top}" width="${(x1 - x0).toFixed(
        1
      )}" height="${plotH}" fill="none" stroke="#3b6ea5" stroke-dasharray="3 2"/>`
    )
  }

  for (const [prob, color, label] of [
    [args.positiveSpeechThreshold, "#c0392b", "positive"],
    [args.negativeSpeechThreshold, "#e08e0b", "negative"],
  ]) {
    parts.push(
      `<line x1="${pad.left}" y1="${y(prob).toFixed(1)}" x2="${
        W - pad.right
      }" y2="${y(prob).toFixed(1)}" stroke="${color}" stroke-dasharray="4 3"/>`,
      `<text x="${W - pad.right - 2}" y="${(y(prob) - 3).toFixed(
        1
      )}" fill="${color}" text-anchor="end">${label} ${prob}</text>`
    )
  }

  const polyline = (values, frameSamples, stroke, dash) => {
    const step = frameSamples / SAMPLE_RATE
    const points = values
      .map((p, i) => `${x((i + 0.5) * step).toFixed(1)},${y(p).toFixed(1)}`)
      .join(" ")
    return `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="1"${
      dash ? ` stroke-dasharray="${dash}"` : ""
    }/>`
  }

  if (compare) {
    parts.push(
      polyline(compare.probs, compare.summary.frameSamples, "#999999", "3 2")
    )
  }
  parts.push(polyline(probs, summary.frameSamples, "#111111"))

  if (compare) {
    parts.push(
      `<text x="${pad.left + 6}" y="${
        pad.top + 12
      }" fill="#111111">this run</text>`,
      `<text x="${pad.left + 6}" y="${pad.top + 26}" fill="#999999">${
        compare.label
      }</text>`
    )
  }

  parts.push(
    `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${
      pad.top + plotH
    }" stroke="#666"/>`,
    `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${W - pad.right}" y2="${
      pad.top + plotH
    }" stroke="#666"/>`
  )
  for (const prob of [0, 0.5, 1]) {
    parts.push(
      `<text x="${pad.left - 6}" y="${(y(prob) + 4).toFixed(
        1
      )}" text-anchor="end" fill="#444">${prob.toFixed(1)}</text>`
    )
  }
  for (let s = 0; s <= durationSeconds; s += 1) {
    parts.push(
      `<text x="${x(s).toFixed(1)}" y="${
        H - 10
      }" text-anchor="middle" fill="#444">${s}</text>`
    )
  }
  parts.push(`</svg>`)
  return parts.join("\n")
}

// --- helpers ------------------------------------------------------------

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

async function readF32(file) {
  const buf = await fs.readFile(file)
  return new Float32Array(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  )
}

async function writeWav(audio, file) {
  const raw = `${file}.f32`
  await fs.writeFile(raw, Buffer.from(audio.buffer))
  await execFile("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-f",
    "f32le",
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-i",
    raw,
    file,
  ])
  await fs.unlink(raw)
}

const PAGE = `<!doctype html>
<meta charset="utf-8">
<title>sim</title>
<script src="browser.js"></script>
`

// --- main ---------------------------------------------------------------

async function main() {
  const args = parseCliArgs()
  await fs.mkdir(args.outDir, { recursive: true })

  const voiceDir = await ensureVoice(args.voice)
  const phrases = []
  for (const text of args.text) {
    phrases.push(await synthesize(text, args.voice, voiceDir))
  }

  const { audio: clean, regions } = stitch(phrases, args.gapMs)
  const audio = degrade(clean, args.gain, args.noise, args.seed)
  const durationSeconds = audio.length / SAMPLE_RATE

  await fs.writeFile(
    path.join(args.outDir, "input.f32"),
    Buffer.from(audio.buffer)
  )
  await writeWav(audio, path.join(args.outDir, "audio.wav"))
  await fs.writeFile(path.join(args.outDir, "index.html"), PAGE)
  await bundleBrowserCode(args.outDir)

  const rel = path.relative(ROOT, args.outDir)
  const result = await runInBrowser(
    {
      model: args.model,
      positiveSpeechThreshold: args.positiveSpeechThreshold,
      negativeSpeechThreshold: args.negativeSpeechThreshold,
      redemptionMs: args.redemptionMs,
      preSpeechPadMs: args.preSpeechPadMs,
      minSpeechMs: args.minSpeechMs,
      audioUrl: `/${rel}/input.f32`,
      modelUrl: `/silero_vad_${args.model}.onnx`,
      wasmBasePath: "/node_modules/onnxruntime-web/dist/",
    },
    args.outDir
  )

  const summary = summarize(result, regions, args.positiveSpeechThreshold)

  await fs.writeFile(
    path.join(args.outDir, "run.json"),
    `${JSON.stringify(
      {
        args: { ...args, outDir: rel },
        durationSeconds,
        regions,
        summary,
        probs: result.probs.map((p) => Number(p.toFixed(6))),
        events: result.events,
      },
      null,
      2
    )}\n`
  )
  let compare = null
  if (args.compare) {
    const earlier = JSON.parse(await fs.readFile(args.compare, "utf8"))
    compare = {
      label: path.relative(ROOT, args.compare),
      probs: earlier.probs,
      summary: earlier.summary,
    }
  }

  await fs.writeFile(
    path.join(args.outDir, "chart.svg"),
    chartSvg(summary, result.probs, regions, args, durationSeconds, compare)
  )
  await renderMp4(args.outDir)

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(formatSummary(summary, args, durationSeconds))
    if (compare) {
      const pct = (n, d) => (d === 0 ? "n/a" : `${Math.round((n / d) * 100)}%`)
      console.log(``)
      console.log(`vs ${compare.label}`)
      console.log(
        `  speech frames over ${args.positiveSpeechThreshold}    ${
          compare.summary.speechOver
        } / ${compare.summary.speechTotal} (${pct(
          compare.summary.speechOver,
          compare.summary.speechTotal
        )})  ->  ${summary.speechOver} / ${summary.speechTotal} (${pct(
          summary.speechOver,
          summary.speechTotal
        )})`
      )
      console.log(
        `  silence frames over ${args.positiveSpeechThreshold}   ${
          compare.summary.silenceOver
        } / ${compare.summary.silenceTotal} (${pct(
          compare.summary.silenceOver,
          compare.summary.silenceTotal
        )})  ->  ${summary.silenceOver} / ${summary.silenceTotal} (${pct(
          summary.silenceOver,
          summary.silenceTotal
        )})`
      )
      console.log(
        `  segments                ${compare.summary.segments.length}  ->  ${summary.segments.length}`
      )
    }
    console.log(``)
    console.log(`${rel}/sim.mp4     chart + audio, attachable to an issue`)
    console.log(`${rel}/chart.svg`)
    console.log(`${rel}/audio.wav`)
    console.log(`${rel}/run.json`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
