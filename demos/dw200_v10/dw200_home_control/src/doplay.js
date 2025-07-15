import dxAlsaplay from "../dxmodules/dxAlsaplay.js";

const id = 'alsaplay1'

dxAlsaplay.init(id)

let ret = dxAlsaplay.setVolume(4, id)
const audioPath = "/app/code/resource/media/"
// Play audio feedback based on scene type
export function playAudio(index) {
  switch (index) {
    case 1:
      dxAlsaplay.play(audioPath + "1722570475293.wav", id) // Sleep mode activated
      break;
    case 2:
      dxAlsaplay.play(audioPath + "1722575853508.wav", id) // Curtains opened
      break;
    case 3:
      dxAlsaplay.play(audioPath + "1722575932378.wav", id) // Curtains closed
      break;
    case 4:
      dxAlsaplay.play(audioPath + "1722576470245.wav", id) // Gaming mode activated
      break;
    case 5:
      dxAlsaplay.play(audioPath + "1722576084201.wav", id) // Welcome home
      break;
  }
}