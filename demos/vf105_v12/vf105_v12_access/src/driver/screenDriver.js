import bus from '../../dxmodules/dxEventBus.js'
import { getCurrentLanguage } from '../common/utils/i18n.js'
import alsaDriver from './alsaDriver.js'

const screenDriver = {
    accessFail: function () {
        bus.fire('accessRes', false)
    },
    accessSuccess: function () {
        bus.fire('accessRes', true)
    },
    upgrade: function (data) {
        bus.fire('upgrade', data)
    },
    getCard: function (card) {
        alsaDriver.play(`/app/code/resource/${getCurrentLanguage()}/wav/read.wav`)
        bus.fire('getCard', card)
    },
    hideSn: function (data) {
        bus.fire('hideSn', data)
    },
    appMode: function (data) {
        bus.fire('appMode', data)
    },
    hideIp: function (data) {
        bus.fire('hideIp', data)
    },
    changeLanguage: function () {
        bus.fire('changeLanguage')
    }
}

export default screenDriver

