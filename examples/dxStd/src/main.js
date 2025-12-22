// Example usage of the dxStd standard library.
import dxstd from "../../src/dxStd/dxStd.js"

// Get current working directory (tuple of [path, errCode]).
const [cwd, cwdErr] = dxstd.getcwd()
if (cwdErr) {
  dxstd.err.puts(`getcwd failed with code ${cwdErr}\n`)
  dxstd.exit(1)
}

// Compose a demo file path inside the current directory.
const demoFile = `${cwd}/dxstd-example.txt`

// Write and read a text file.
dxstd.saveFile(demoFile, "Hello from dxStd!\nThis file was written by the example.\n")
const fileContent = dxstd.loadFile(demoFile)
dxstd.out.puts(`File written to: ${demoFile}\n`)
dxstd.out.puts("Loaded content:\n")
dxstd.out.puts(fileContent)

// Show platform info and a random string helper.
dxstd.out.puts(`Platform: ${dxstd.platform()}\n`)
dxstd.out.puts(`Random ID: ${dxstd.genRandomStr(8)}\n`)

// Demonstrate setInterval/clearInterval.
let tickCount = 0
const intervalId = dxstd.setInterval(() => {
  tickCount += 1
  dxstd.out.puts(`Tick ${tickCount}\n`)

  // Stop after 3 ticks and clean up the demo file.
  if (tickCount >= 3) {
    dxstd.clearInterval(intervalId)
    dxstd.remove(demoFile)
    dxstd.out.puts("Done. File cleaned up.\n")
    dxstd.exit(0)
  }
}, 500)

