const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MQTT configuration
const mqttConfig = {
    mqttAddr: "tcp://101.200.139.97:51883",
    clientId: "AABBCCDDEEFF",
    username: "admin",
    password: "password",
    prefix: "base_upgrade/v1"
};

// MQTT topics to subscribe
const topics = [
    "base_upgrade/v1/event/offline",
    "base_upgrade/v1/event/heart",
    "base_upgrade/v1/cmd/upgrade_reply"
];

// Store device status in memory
const deviceStatus = new Map();

// Store upgrade file MD5 hash
let upgradeMD5 = null;

// Function to calculate MD5 hash of upgrade file
function calculateUpgradeMD5() {
    const upgradePath = path.join(__dirname, 'upgrade.dpk');

    try {
        if (fs.existsSync(upgradePath)) {
            const fileBuffer = fs.readFileSync(upgradePath);
            const hashSum = crypto.createHash('md5');
            hashSum.update(fileBuffer);
            upgradeMD5 = hashSum.digest('hex');
            console.log(`Upgrade file MD5 calculated: ${upgradeMD5}`);
        } else {
            console.warn('upgrade.dpk file not found, MD5 calculation skipped');
            upgradeMD5 = null;
        }
    } catch (error) {
        console.error('Error calculating upgrade file MD5:', error);
        upgradeMD5 = null;
    }
}

// Function to generate random serial number
function generateRandomSerial() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Calculate upgrade file MD5 on startup
calculateUpgradeMD5();

// Serve static files from current directory
app.use(express.static(__dirname));

// Route to serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to download upgrade.dpk file
app.get('/ota/upgrade.dpk', (req, res) => {
    const filePath = path.join(__dirname, 'upgrade.dpk');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error('upgrade.dpk file not found');
        return res.status(404).json({
            error: 'Upgrade file not found',
            message: 'upgrade.dpk file does not exist in the server directory'
        });
    }

    console.log(`Serving upgrade.dpk file download request from ${req.ip}`);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="upgrade.dpk"');

    // Send file for download
    res.download(filePath, 'upgrade.dpk', (err) => {
        if (err) {
            console.error('Error downloading upgrade.dpk:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Download failed',
                    message: 'Failed to download upgrade.dpk file'
                });
            }
        } else {
            console.log('upgrade.dpk file downloaded successfully');
        }
    });
});

// Initialize MQTT client
const mqttClient = mqtt.connect(mqttConfig.mqttAddr, {
    clientId: mqttConfig.clientId,
    username: mqttConfig.username,
    password: mqttConfig.password,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
});

// MQTT connection event handlers
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker successfully');

    // Subscribe to all required topics
    topics.forEach(topic => {
        mqttClient.subscribe(topic, (err) => {
            if (err) {
                console.error(`Failed to subscribe to topic ${topic}:`, err);
            } else {
                console.log(`Successfully subscribed to topic: ${topic}`);
            }
        });
    });
});

mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
});

mqttClient.on('disconnect', () => {
    console.log('Disconnected from MQTT broker');
});

// Handle incoming MQTT messages
mqttClient.on('message', (topic, message) => {
    try {
        // Parse the incoming message
        const messageStr = message.toString();
        const messageData = JSON.parse(messageStr);

        console.log(`Received message on topic ${topic}:`, messageData);

        // Validate message format
        if (!messageData.uuid || !messageData.timestamp) {
            console.warn('Invalid message format: missing uuid or timestamp');
            return;
        }

        // Handle different message types based on topic
        switch (topic) {
            case 'base_upgrade/v1/event/heart':
                handleHeartbeatMessage(messageData);
                break;

            case 'base_upgrade/v1/event/offline':
                handleOfflineMessage(messageData);
                break;

            case 'base_upgrade/v1/cmd/upgrade_reply':
                handleUpgradeReplyMessage(messageData);
                break;

            default:
                console.log(`Unhandled topic: ${topic}`);
        }

    } catch (error) {
        console.error('Error processing MQTT message:', error);
    }
});

// Handle heartbeat messages from devices
function handleHeartbeatMessage(messageData) {
    const { uuid, serialNo, timestamp } = messageData;

    // Update device status
    deviceStatus.set(uuid, {
        uuid: uuid,
        serialNo: serialNo || 'Unknown',
        status: 'online',
        lastHeartbeat: parseInt(timestamp),
        lastSeen: new Date().toISOString()
    });

    // Broadcast device update to all connected web clients
    io.emit('deviceUpdate', {
        uuid: uuid,
        serialNo: serialNo || 'Unknown',
        status: 'online',
        lastHeartbeat: parseInt(timestamp),
        lastSeen: new Date().toISOString()
    });

    console.log(`Device ${uuid} heartbeat received`);
}

// Handle offline messages from devices
function handleOfflineMessage(messageData) {
    const { uuid, serialNo, timestamp } = messageData;

    // Update device status to offline
    if (deviceStatus.has(uuid)) {
        const device = deviceStatus.get(uuid);
        device.status = 'offline';
        device.lastSeen = new Date().toISOString();

        // Broadcast device offline status to all connected web clients
        io.emit('deviceUpdate', {
            uuid: uuid,
            serialNo: device.serialNo,
            status: 'offline',
            lastHeartbeat: device.lastHeartbeat,
            lastSeen: device.lastSeen
        });
    }

    console.log(`Device ${uuid} went offline`);
}

// Handle upgrade reply messages
function handleUpgradeReplyMessage(messageData) {
    const { uuid, serialNo, data, timestamp } = messageData;

    // Broadcast upgrade reply to web clients
    io.emit('upgradeReply', {
        uuid: uuid,
        serialNo: serialNo || 'Unknown',
        data: data || {},
        timestamp: parseInt(timestamp),
        receivedAt: new Date().toISOString()
    });

    console.log(`Upgrade reply received from device ${uuid}`);
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Web client connected:', socket.id);

    // Send current device status to newly connected client
    const currentDevices = Array.from(deviceStatus.values());
    socket.emit('initialDeviceList', currentDevices);

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('Web client disconnected:', socket.id);
    });

    // Handle device list request from client
    socket.on('requestDeviceList', () => {
        const currentDevices = Array.from(deviceStatus.values());
        socket.emit('deviceList', currentDevices);
    });

    // Handle upgrade request from client
    socket.on('sendUpgradeCommand', (data) => {
        const { uuid, serverIp } = data;

        if (!uuid) {
            console.error('Upgrade command failed: missing device UUID');
            socket.emit('upgradeCommandResult', {
                success: false,
                message: 'Device UUID is required'
            });
            return;
        }

        if (!serverIp) {
            console.error('Upgrade command failed: missing server IP');
            socket.emit('upgradeCommandResult', {
                success: false,
                message: 'Server IP address is required'
            });
            return;
        }

        if (!upgradeMD5) {
            console.error('Upgrade command failed: upgrade file MD5 not available');
            socket.emit('upgradeCommandResult', {
                success: false,
                message: 'Upgrade file not ready or MD5 calculation failed'
            });
            return;
        }

        // Construct upgrade command message
        const upgradeMessage = {
            serialNo: generateRandomSerial(),
            url: `http://${serverIp}:3000/ota/upgrade.dpk`,
            md5: upgradeMD5,
            timestamp: Math.floor(Date.now() / 1000).toString()
        };

        // Construct MQTT topic for specific device
        const upgradeTopic = `base_upgrade/v1/cmd/${uuid}/upgrade`;

        // Publish upgrade command to MQTT
        mqttClient.publish(upgradeTopic, JSON.stringify(upgradeMessage), (err) => {
            if (err) {
                console.error(`Failed to send upgrade command to device ${uuid}:`, err);
                socket.emit('upgradeCommandResult', {
                    success: false,
                    message: 'Failed to send upgrade command via MQTT'
                });
            } else {
                console.log(`Upgrade command sent to device ${uuid} via topic: ${upgradeTopic}`);
                console.log('Upgrade message:', upgradeMessage);
                socket.emit('upgradeCommandResult', {
                    success: true,
                    message: `Upgrade command sent successfully to device ${uuid}`,
                    topic: upgradeTopic,
                    data: upgradeMessage
                });
            }
        });
    });

    // Handle batch upgrade request from client
    socket.on('sendBatchUpgradeCommand', (data) => {
        const { uuids, serverIp } = data;

        if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
            console.error('Batch upgrade command failed: missing or invalid device UUIDs');
            socket.emit('batchUpgradeCommandResult', {
                success: false,
                message: 'Device UUIDs are required and must be an array'
            });
            return;
        }

        if (!serverIp) {
            console.error('Batch upgrade command failed: missing server IP');
            socket.emit('batchUpgradeCommandResult', {
                success: false,
                message: 'Server IP address is required'
            });
            return;
        }

        if (!upgradeMD5) {
            console.error('Batch upgrade command failed: upgrade file MD5 not available');
            socket.emit('batchUpgradeCommandResult', {
                success: false,
                message: 'Upgrade file not ready or MD5 calculation failed'
            });
            return;
        }

        console.log(`Starting batch upgrade for ${uuids.length} devices:`, uuids);

        const results = [];
        let completedCount = 0;
        let successCount = 0;
        let failureCount = 0;

        // Process each device
        uuids.forEach((uuid, index) => {
            // Construct upgrade command message
            const upgradeMessage = {
                serialNo: generateRandomSerial(),
                url: `http://${serverIp}:3000/ota/upgrade.dpk`,
                md5: upgradeMD5,
                timestamp: Math.floor(Date.now() / 1000).toString()
            };

            // Construct MQTT topic for specific device
            const upgradeTopic = `base_upgrade/v1/cmd/${uuid}/upgrade`;

            // Publish upgrade command to MQTT
            mqttClient.publish(upgradeTopic, JSON.stringify(upgradeMessage), (err) => {
                completedCount++;
                
                if (err) {
                    console.error(`Failed to send upgrade command to device ${uuid}:`, err);
                    failureCount++;
                    results.push({
                        uuid: uuid,
                        success: false,
                        error: err.message,
                        topic: upgradeTopic
                    });
                } else {
                    console.log(`Upgrade command sent to device ${uuid} via topic: ${upgradeTopic}`);
                    successCount++;
                    results.push({
                        uuid: uuid,
                        success: true,
                        topic: upgradeTopic,
                        data: upgradeMessage
                    });
                }

                // Check if all devices have been processed
                if (completedCount === uuids.length) {
                    console.log(`Batch upgrade completed. Success: ${successCount}, Failed: ${failureCount}`);
                    
                    socket.emit('batchUpgradeCommandResult', {
                        success: failureCount === 0,
                        message: `Batch upgrade completed. Success: ${successCount}, Failed: ${failureCount}`,
                        totalDevices: uuids.length,
                        successCount: successCount,
                        failureCount: failureCount,
                        results: results
                    });
                }
            });
        });
    });
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('MQTT topics subscribed:', topics);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    mqttClient.end();
    server.close();
    process.exit(0);
}); 