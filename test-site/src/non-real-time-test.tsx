import { NonRealTimeVAD, utils } from "@ricky0123/vad-web"
import React, { useRef, useState } from "react"

interface AudioSegment {
  audio: Float32Array
  start: number
  end: number
}

const NonRealTimeTest: React.FC = () => {
  const [segments, setSegments] = useState<AudioSegment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMs, setShowMs] = useState(true)
  const [segmentNumber, setSegmentNumber] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleUnit = () => {
    setShowMs(!showMs)
  }

  const formatTime = (ms: number) => {
    return showMs ? Math.round(ms).toString() : (ms / 1000).toFixed(3)
  }

  const handleFileUpload = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fileInputRef.current?.files?.[0]) {
      return
    }

    setIsProcessing(true)
    setSegments([])
    setSegmentNumber(0)

    try {
      // Configure VAD based on environment
      const vadConfig =
        process.env["NODE_ENV"] === "development"
          ? {
              // Use local assets in development
              modelURL: "./silero_vad_legacy.onnx",
              modelFetcher: (path: string) =>
                fetch(path).then((r) => r.arrayBuffer()),
            }
          : {
              // Use default CDN assets in production
            }

      const myvad = await NonRealTimeVAD.new(vadConfig)
      const audioFile = fileInputRef.current.files[0]
      const { audio, sampleRate } = await utils.audioFileToArray(audioFile)

      const newSegments: AudioSegment[] = []
      let count = 0

      for await (const { audio: segmentAudio, start, end } of myvad.run(
        audio,
        sampleRate
      )) {
        count++
        newSegments.push({ audio: segmentAudio, start, end })
        setSegments([...newSegments])
        setSegmentNumber(count)
      }
    } catch (error) {
      console.error("Error processing audio:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const createAudioUrl = (segmentAudio: Float32Array) => {
    const wavBuffer = utils.encodeWAV(segmentAudio)
    const base64 = utils.arrayBufferToBase64(wavBuffer)
    return `data:audio/wav;base64,${base64}`
  }

  return (
    <div className="mt-5 px-5 mx-auto prose">
      <h1>Non real time</h1>
      <p>
        Upload an audio file to detect speech segments. The results will show
        the start and end times of each detected segment.
      </p>

      <form
        onSubmit={(ev) => {
          void handleFileUpload(ev)
        }}
        className="mb-4"
      >
        <input
          ref={fileInputRef}
          className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2 mr-2"
          type="file"
          name="file"
          accept="audio/*"
          disabled={isProcessing}
        />
        <input
          className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2"
          type="submit"
          value={isProcessing ? "Processing..." : "Process"}
          disabled={isProcessing}
        />
      </form>

      {segments.length > 0 && (
        <div className="mt-4 ml-0 max-w-2xl">
          <div className="mb-2 flex justify-between items-center">
            <div className="font-medium text-lg">
              Found {segmentNumber} speech segment
              {segmentNumber === 1 ? "" : "s"}
            </div>
            <button
              onClick={toggleUnit}
              className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-1 text-sm"
            >
              Switch to {showMs ? "Seconds" : "Milliseconds"}
            </button>
          </div>

          <table className="w-full mt-2 border-collapse">
            <thead className="bg-violet-100">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Start ({showMs ? "ms" : "s"})</th>
                <th className="p-2 text-left">End ({showMs ? "ms" : "s"})</th>
                <th className="p-2 text-left">
                  Duration ({showMs ? "ms" : "s"})
                </th>
                <th className="p-2 text-left">Audio</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="p-2 font-medium">{index + 1}.</td>
                  <td className="p-2">{formatTime(segment.start)}</td>
                  <td className="p-2">{formatTime(segment.end)}</td>
                  <td className="p-2">
                    {formatTime(segment.end - segment.start)}
                  </td>
                  <td className="p-2">
                    <audio controls className="h-8" style={{ width: "150px" }}>
                      <source
                        src={createAudioUrl(segment.audio)}
                        type="audio/wav"
                      />
                    </audio>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="text-gray-600">Processing audio file...</div>
        </div>
      )}
    </div>
  )
}

export default NonRealTimeTest
