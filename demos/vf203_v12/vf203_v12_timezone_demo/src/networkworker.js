import net from '../dxmodules/dxNetwork.js'
import std from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'

// Hardcoded WiFi configuration (for demo use)
const WIFI_SSID = 'vguangYPT'  // Please modify to your actual WiFi SSID
const WIFI_PASSWORD = 'vguangypt_o0'  // Please modify to your actual WiFi password

function connectWiFi() {
    try {
        logger.info('Initializing network module...');
        // Initialize network module
        net.init();

        // Set network status change callback
        net.setCallbacks({
            onStatusChange: (net_type, net_status) => {
                logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
                if (net.isConnected()) {
                    const netParam = net.getNetParam();
                    logger.info(`WiFi connected! IP: ${netParam ? netParam.ip : 'unknown'}`);
                } else {
                    logger.info('WiFi disconnected');
                }
            }
        });

        // Connect WiFi (using DHCP)
        logger.info(`Connecting to WiFi: ${WIFI_SSID}`);
        const result = net.connectWifiWithDHCP(WIFI_SSID, WIFI_PASSWORD);

        if (result < 0) {
            logger.error(`Failed to connect WiFi, result: ${result}`);
            // Retry after 3 seconds if connection fails
            std.setTimeout(() => {
                connectWiFi();
            }, 3000);
        } else {
            logger.info('WiFi connection initiated');
        }
    } catch (error) {
        logger.error('Error connecting WiFi:', error);
        // Retry after 3 seconds on error
        std.setTimeout(() => {
            connectWiFi();
        }, 3000);
    }
}

// Start network connection
connectWiFi();

// Network loop processing
std.setInterval(() => {
    try {
        if (net.getNative()) {
            net.loop(); // Execute network loop processing
        }
    } catch (error) {
        logger.error('Network loop error:', error);
    }
}, 50);

