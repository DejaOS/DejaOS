import alsa from '../../dxmodules/dxAlsa.js'
import config from '../../dxmodules/dxConfig.js'

const alsaDriver = {
    init: function () {
        alsa.init()
        this.volume(config.get("base.volume"))
    },
    play: function (src) {
        alsa.play(src)
    },
    ttsPlay: function (text) {
        alsa.ttsPlay(text)
    },
    volume: function (volume) {
        if (volume === undefined || volume === null) {
            return alsa.getVolume()
        } else {
            function mapScore(input) {
                // Ensure input is between 1 and 100
                if (input < 1 || input > 100) {
                    throw new Error('Input value must be between 1 and 100');
                }
                if (input < 60 && input > 30) {
                    input = input * 1.2
                }
                if (input < 30 && input > 1) {
                    input = input * 2
                }
                return input
            }
            alsa.setVolume(mapScore(volume))
        }
    }
}

export default alsaDriver

