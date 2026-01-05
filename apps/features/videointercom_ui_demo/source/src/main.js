/**
 * Main application entry point
 * Initializes the driver, screen, and camera capturer
 * Sets up the main application loop
 */

import screen from './screen.js'
import dxstd from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
// Initialize camera capturer
bus.newWorker('camera', '/app/code/src/faceworker.js')

// Initialize screen and UI components
screen.init()

