// MQTT Configuration
const mqttConfig = {
    // MQTT broker connection settings
    mqttAddr: "tcp://123.57.175.193:61613",
    clientId: "AABBCCDDEEFF",
    username: "admin",
    password: "password",
    prefix: "base_upgrade/v1",
    
    // MQTT connection options
    connectionOptions: {
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000
    },
    
    // MQTT topics to subscribe
    topics: [
        "base_upgrade/v1/event/offline",
        "base_upgrade/v1/event/heart",
        "base_upgrade/v1/cmd/upgrade_reply"
    ],
    
    // Topic patterns
    topicPatterns: {
        heartbeat: "base_upgrade/v1/event/heart",
        offline: "base_upgrade/v1/event/offline",
        upgradeReply: "base_upgrade/v1/cmd/upgrade_reply",
        upgradeCommand: "base_upgrade/v1/cmd/{uuid}/upgrade"
    }
};

module.exports = mqttConfig;
