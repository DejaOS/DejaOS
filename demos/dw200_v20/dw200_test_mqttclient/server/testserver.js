const aedes = require('aedes')();
const net = require('net');

// MQTT server configuration
const serverConfig = {
    port: 1883,
    host: '0.0.0.0'
};

// Create TCP server and attach aedes
const server = net.createServer(aedes.handle);

// Client connection event
aedes.on('client', (client) => {
    console.log('Client connected:', client.id);
});

// Client disconnection event
aedes.on('clientDisconnect', (client) => {
    console.log('Client disconnected:', client.id);
});

// Client subscription event
aedes.on('subscribe', (subscriptions, client) => {
    if (client) {
        console.log('Client subscribed to topic:', subscriptions[0].topic);
    }
});

// Client publish message event
aedes.on('publish', (packet, client) => {
    if (client) {
        const topic = packet.topic;
        const message = packet.payload.toString();

        console.log(`Message received - Topic: ${topic}, Content: ${message}`);

        // If testmqttclient/test3 command is received, immediately reply to testmqttclient/test2
        if (topic === 'testmqttclient/test3') {
            const replyData = {
                timestamp: new Date().toISOString(),
                message: 'This is a reply from the server',
                data: Math.random().toString(36).substring(7)
            };

            aedes.publish({
                topic: 'testmqttclient/test2',
                payload: JSON.stringify(replyData)
            });
            console.log('Replied to testmqttclient/test2:', replyData);
        }
    }
});

// Client authentication event (if needed)
aedes.authenticate = (client, username, password, callback) => {
    console.log('Client authentication:', username);
    // Allow all connections, you can add authentication logic as needed
    callback(null, true);
};

// Client error event
aedes.on('clientError', (client, error) => {
    console.error('Client error:', error);
});

// Start server
server.listen(serverConfig.port, serverConfig.host, () => {
    console.log(`MQTT server started, listening on port ${serverConfig.port}`);
    console.log(`Server address: mqtt://${serverConfig.host}:${serverConfig.port}`);
});

// Send periodic test messages to testmqttclient/test1
setInterval(() => {
    const testData = {
        timestamp: new Date().toISOString(),
        message: 'Periodic test message',
        counter: Math.floor(Math.random() * 1000),
        data: Math.random().toString(36).substring(7)
    };

    // Send message to all connected clients
    Object.values(aedes.clients).forEach((client) => {
        if (client.connected) {
            aedes.publish({
                topic: 'testmqttclient/test1',
                payload: JSON.stringify(testData)
            });
        }
    });

    console.log('Sent periodic test message to testmqttclient/test1:', testData);
}, 15000); // Send every 15 seconds

// Error handling
server.on('error', (error) => {
    console.error('MQTT server error:', error);
});

aedes.on('error', (error) => {
    console.error('Aedes error:', error);
});

console.log('MQTT test server starting...');