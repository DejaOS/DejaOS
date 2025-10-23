import dxOs from '../../dxmodules/dxOs.js'

/**
 * Sets device mode.
 * @param {'test'|'prod'|'dev'} mode - Valid values: 'test', 'prod', 'dev'.
 */
const osDriver = {
    setMode: function (mode) {
        dxOs.setMode(mode)
    }
}

export default osDriver

