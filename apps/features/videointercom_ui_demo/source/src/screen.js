/**
 * Screen management module
 * Handles UI initialization and main screen loading
 * Manages all view components and UI refresh loop
 */

import dxStd from '../dxmodules/dxStd.js'
import dxUi from '../dxmodules/dxUi.js'
import mainView from './view/mainView.js'
import callView from './view/callView.js'
import pinView from './view/pinView.js'
import connectionView from './view/connectionView.js'
import dxDriver from '../dxmodules/dxDriver.js'

const screen = {}

/**
 * Initialize screen and UI components
 * Sets up all views and starts the UI refresh loop
 */
screen.init = function () {
    // Initialize UI framework with default orientation
    dxUi.init({ orientation: 0 }, {});

    // Initialize all view components
    mainView.init()
    callView.init()
    pinView.init()
    connectionView.init()

    // Load main view as the default screen
    dxUi.loadMain(mainView.screenMain)

    // Set up UI refresh loop - runs every 5ms
    dxStd.setInterval(() => {
        dxUi.handler()
    }, 5)
}

export default screen