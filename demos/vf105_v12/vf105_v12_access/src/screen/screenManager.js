import dxMap from '../../dxmodules/dxMap.js'
import std from '../../dxmodules/dxStd.js'

class ScreenManager {
  constructor(callbacks = {}) {
    this.timers = {
      screenSaver: null,
      screenOff: null
    };

    // Default configuration
    this.config = {
      screenSaverDelay: 0, // Screensaver delay (ms)
      screenOffDelay: 0    // Screen off delay (ms)
    };

    // Callbacks
    this.callbacks = {
      onScreenSaverStart: callbacks.onScreenSaverStart || (() => { }),
      onScreenSaverEnd: callbacks.onScreenSaverEnd || (() => { }),
      onScreenOff: callbacks.onScreenOff || (() => { }),
      onScreenOn: callbacks.onScreenOn || (() => { })
    };

    this.resetTimers = this.resetTimers.bind(this);
  }

  // Configure timings
  configure({ screenSaverDelay = 0, screenOffDelay = 0 }) {
    this.config.screenSaverDelay = screenSaverDelay;
    this.config.screenOffDelay = screenOffDelay;
    this.resetTimers();
  }

  // Reset timers
  resetTimers() {
    // Clear existing timers
    if (this.timers.screenSaver) {
      std.clearTimeout(this.timers.screenSaver);
    }
    if (this.timers.screenOff) {
      std.clearTimeout(this.timers.screenOff);
    }

    // Exit current states
    this.exitScreenStates();

    // Set new timers
    if (this.config.screenOffDelay > 0) {
      this.timers.screenOff = std.setTimeout(() => {
        this.enterScreenOff();
      }, this.config.screenOffDelay);
    }

    // Only set screensaver timer if it precedes screen-off timer or screen-off is disabled
    if (this.config.screenSaverDelay > 0 &&
      (this.config.screenSaverDelay < this.config.screenOffDelay || this.config.screenOffDelay == 0)) {
      this.timers.screenSaver = std.setTimeout(() => {
        this.enterScreenSaver();
      }, this.config.screenSaverDelay);
    }
  }

  // Enter screensaver state
  enterScreenSaver() {
    const mapUI = dxMap.get("UI")
    if (!mapUI.get("isScreenOff")) {
      mapUI.put("isScreenSaver", true)
      this.callbacks.onScreenSaverStart();
    }
  }

  // Enter screen-off state
  enterScreenOff() {
    const mapUI = dxMap.get("UI")
    mapUI.put("isScreenOff", true)
    mapUI.put("isScreenSaver", false)
    this.callbacks.onScreenOff();
  }

  // Exit all screen states
  exitScreenStates() {
    const mapUI = dxMap.get("UI")
    const previousState = { isScreenOff: mapUI.get("isScreenOff"), isScreenSaver: mapUI.get("isScreenSaver") };
    mapUI.put("isScreenOff", false)
    mapUI.put("isScreenSaver", false)
    // Trigger callbacks if state changed
    if (previousState.isScreenSaver) {
      this.callbacks.onScreenSaverEnd();
    }
    if (previousState.isScreenOff) {
      this.callbacks.onScreenOn();
    }
  }

  // Get current state
  getState() {
    const mapUI = dxMap.get("UI")
    return { isScreenOff: mapUI.get("isScreenOff"), isScreenSaver: mapUI.get("isScreenSaver") };
  }

  // Cleanup timers
  destroy() {
    if (this.timers.screenSaver) {
      std.clearTimeout(this.timers.screenSaver);
    }
    if (this.timers.screenOff) {
      std.clearTimeout(this.timers.screenOff);
    }
  }
}

export default ScreenManager

