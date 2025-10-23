import configDriver from './configDriver.js'
import screenDriver from './screenDriver.js'
import sqliteDriver from './sqliteDriver.js'
import pwmDriver from './pwmDriver.js'
import alsaDriver from './alsaDriver.js'
import capturerDriver from './capturerDriver.js'
import nfcDriver from './nfcDriver.js'
import faceDriver from './faceDriver.js'
import netDriver from './netDriver.js'
import ntpDriver from './ntpDriver.js'
import syncDriver from './syncDriver.js'
import mqttDriver from './mqttDriver.js'
import gpioDriver from './gpioDriver.js'
import { uart485Driver, uartCodeDriver } from './uartDriver.js'
import eidDriver from './eidDriver.js'
import gpiokeyDriver from './gpiokeyDriver.js'
import watchdogDriver from './watchdogDriver.js'
import autoRestartDriver from './autoRestartDriver.js'
import osDriver from './osDriver.js'

const driver = {
    config: configDriver,
    screen: screenDriver,
    sqlite: sqliteDriver,
    pwm: pwmDriver,
    alsa: alsaDriver,
    capturer: capturerDriver,
    nfc: nfcDriver,
    face: faceDriver,
    net: netDriver,
    ntp: ntpDriver,
    sync: syncDriver,
    mqtt: mqttDriver,
    gpio: gpioDriver,
    uart485: uart485Driver,
    uartCode: uartCodeDriver,
    eid: eidDriver,
    gpiokey: gpiokeyDriver,
    watchdog: watchdogDriver,
    autoRestart: autoRestartDriver,
    dxOs: osDriver
}

export default driver

