/**
 * MQTT Client Module based on Eclipse Paho MQTT C library.
 * This module provides a singleton interface to an MQTT client.
 *
 * Features:
 * - Connect/disconnect to an MQTT broker.
 * - Publish messages and subscribe to topics.
 * - Supports MQTTS (MQTT over SSL/TLS).
 * - Handles connection loss and message delivery callbacks.
 *
 * Usage:
 * - Initialize once with `init()`.
 * - Use the methods to interact with the broker.
 *
 * Doc/Demo: https://github.com/DejaOS/DejaOS
 */
import { mqttclientClass } from './libvbar-m-dxmqttclient.so';
import log from './dxLogger.js'

let client = null;
const dxmqttclient = {};

function checkClientInitialized() {
    if (!client) {
        throw new Error('MQTT client is not initialized. Call init(serverURI, clientId) first.');
    }
}

/**
 * Validates QoS level
 * @param {number} qos QoS level to validate
 * @param {string} context Context for error message
 */
function validateQoS(qos, context = 'QoS') {
    if (typeof qos !== 'number' || !Number.isInteger(qos) || qos < 0 || qos > 2) {
        throw new Error(`${context} must be an integer between 0 and 2, got: ${qos}`);
    }
}

/**
 * Validates MQTT topic format
 * @param {string} topic Topic to validate
 * @param {string} context Context for error message
 */
function validateTopic(topic, context = 'Topic') {
    if (typeof topic !== 'string' || topic.length === 0) {
        throw new Error(`${context} must be a non-empty string`);
    }
    if (topic.length > 65535) {
        throw new Error(`${context} must be less than 65535 characters`);
    }
    // Check for invalid characters (null character)
    if (topic.includes('\0')) {
        throw new Error(`${context} cannot contain null characters`);
    }
}

/**
 * Validates server URI format
 * @param {string} serverURI Server URI to validate
 */
function validateServerURI(serverURI) {
    if (typeof serverURI !== 'string' || serverURI.length === 0) {
        throw new Error('Server URI must be a non-empty string');
    }
    const validProtocols = ['tcp://', 'ssl://', 'mqtt://', 'mqtts://'];
    if (!validProtocols.some(protocol => serverURI.startsWith(protocol))) {
        throw new Error(`Server URI must start with one of: ${validProtocols.join(', ')}`);
    }
}

/**
 * Validates client ID
 * @param {string} clientId Client ID to validate
 */
function validateClientId(clientId) {
    if (typeof clientId !== 'string') {
        throw new Error('Client ID must be a string');
    }
    if (clientId.length > 23) {
        // MQTT 3.1.1 spec limits to 23 chars, but many modern brokers accept longer IDs
        log.info('Client ID is longer than 23 characters, which is not recommended by the MQTT spec.');
    }
}

/**
 * Validates connection options
 * @param {object} options Connection options to validate
 */
function validateConnectOptions(options) {
    if (options && typeof options !== 'object') {
        throw new Error('Connection options must be an object');
    }

    if (options) {
        // Validate keepAlive
        if (options.keepAlive !== undefined) {
            if (typeof options.keepAlive !== 'number' || options.keepAlive < 0 || options.keepAlive > 65535) {
                throw new Error('keepAlive must be a number between 0 and 65535');
            }
        }

        // Validate cleanSession
        if (options.cleanSession !== undefined && typeof options.cleanSession !== 'boolean') {
            throw new Error('cleanSession must be a boolean');
        }

        // Validate username and password
        if (options.username !== undefined && typeof options.username !== 'string') {
            throw new Error('username must be a string');
        }
        if (options.password !== undefined && typeof options.password !== 'string') {
            throw new Error('password must be a string');
        }

        // Validate will options
        if (options.will !== undefined) {
            if (typeof options.will !== 'object') {
                throw new Error('will options must be an object');
            }
            if (!options.will.topic || typeof options.will.topic !== 'string') {
                throw new Error('will.topic must be a non-empty string');
            }
            validateTopic(options.will.topic, 'will.topic');

            if (options.will.payload !== undefined && typeof options.will.payload !== 'string') {
                throw new Error('will.payload must be a string');
            }
            if (options.will.qos !== undefined) {
                validateQoS(options.will.qos, 'will.qos');
            }
            if (options.will.retained !== undefined && typeof options.will.retained !== 'boolean') {
                throw new Error('will.retained must be a boolean');
            }
        }

        // Validate SSL options
        if (options.ssl !== undefined) {
            if (typeof options.ssl !== 'object') {
                throw new Error('SSL options must be an object');
            }
            const sslStringFields = ['caFile', 'certFile', 'keyFile', 'keyPassword'];
            sslStringFields.forEach(field => {
                if (options.ssl[field] !== undefined && typeof options.ssl[field] !== 'string') {
                    throw new Error(`ssl.${field} must be a string`);
                }
            });
            if (options.ssl.enableServerCertAuth !== undefined && typeof options.ssl.enableServerCertAuth !== 'boolean') {
                throw new Error('ssl.enableServerCertAuth must be a boolean');
            }
        }
    }
}

/**
 * Validates publish options
 * @param {object} options Publish options to validate
 */
function validatePublishOptions(options) {
    if (options && typeof options !== 'object') {
        throw new Error('Publish options must be an object');
    }

    if (options) {
        if (options.qos !== undefined) {
            validateQoS(options.qos, 'publish qos');
        }
        if (options.retained !== undefined && typeof options.retained !== 'boolean') {
            throw new Error('retained must be a boolean');
        }
    }
}

/**
 * Validates subscribe options
 * @param {object} options Subscribe options to validate
 */
function validateSubscribeOptions(options) {
    if (options && typeof options !== 'object') {
        throw new Error('Subscribe options must be an object');
    }

    if (options && options.qos !== undefined) {
        validateQoS(options.qos, 'subscribe qos');
    }
}

/**
 * Initializes the MQTT client. This must be called once before any other operations.
 * @param {string} serverURI The URI of the MQTT broker. Examples: "tcp://localhost:1883", "ssl://test.mosquitto.org:8883".
 * @param {string} clientId A unique identifier for this client.
 * @example
 * dxmqttclient.init('tcp://test.mosquitto.org:1883', 'my-device-123');
 */
dxmqttclient.init = function (serverURI, clientId) {
    if (client) {
        log.info('MQTT client already initialized.');
        return;
    }

    validateServerURI(serverURI);
    validateClientId(clientId);

    client = new mqttclientClass(serverURI, clientId);
};

/**
 * Connects the client to the MQTT broker.
 * @param {object} [options] Connection options.
 * @param {string} [options.username] The username for authentication.
 * @param {string} [options.password] The password for authentication.
 * @param {number} [options.keepAlive=60] The keep-alive interval in seconds.
 * @param {boolean} [options.cleanSession=true] Whether to establish a clean session.
 * @param {object} [options.will] The "will" message (last will and testament) to be sent if the client disconnects unexpectedly.
 * @param {string} options.will.topic The topic for the will message.
 * @param {string} options.will.payload The payload of the will message.
 * @param {number} [options.will.qos=0] The Quality of Service level for the will message.
 * @param {boolean} [options.will.retained=false] Whether the will message should be retained.
 * @param {object} [options.ssl] SSL/TLS options, required for 'ssl://' or 'mqtts://' URIs.
 * @param {string} [options.ssl.caFile] Path to the CA certificate file for server verification.
 * @param {string} [options.ssl.certFile] Path to the client's certificate file.
 * @param {string} [options.ssl.keyFile] Path to the client's private key file.
 * @param {string} [options.ssl.keyPassword] Password for the client's private key.
 * @returns {void}
 * @example
 * dxmqttclient.connect({
 *   username: 'user',
 *   password: 'password',
 *   will: {
 *     topic: 'client/status',
 *     payload: 'offline',
 *     qos: 1,
 *     retained: true
 *   }
 * });
 */
dxmqttclient.connect = function (options) {
    checkClientInitialized();
    validateConnectOptions(options);
    client.connect(options || {});
};

/**
 * Disconnects the client from the MQTT broker.
 * @param {number} [timeout=1000] Timeout in milliseconds to wait for disconnection to complete.
 * @returns {void}
 */
dxmqttclient.disconnect = function (timeout) {
    checkClientInitialized();
    if (timeout !== undefined) {
        if (typeof timeout !== 'number' || timeout < 0) {
            throw new Error('Disconnect timeout must be a non-negative number');
        }
    }
    client.disconnect(timeout || 1000);
};

/**
 * Publishes a message to a topic.
 * @param {string} topic The topic to publish the message to.
 * @param {string|ArrayBuffer} payload The message payload.
 * @param {object} [options] Publishing options.
 * @param {number} [options.qos=0] The Quality of Service (QoS) level (0, 1, or 2).
 * @param {boolean} [options.retained=false] Whether the message should be retained by the broker.
 * @returns {number} The delivery token for tracking message delivery (for QoS > 0).
 * @example
 * dxmqttclient.publish('device/status', 'online', { qos: 1 });
 */
dxmqttclient.publish = function (topic, payload, options) {
    checkClientInitialized();
    validateTopic(topic, 'Publish topic');

    if (payload === undefined || payload === null) {
        throw new Error('Payload cannot be undefined or null');
    }
    if (typeof payload !== 'string' && !(payload instanceof ArrayBuffer)) {
        throw new Error('Payload must be a string or ArrayBuffer');
    }

    validatePublishOptions(options);

    return client.publish(topic, payload, options || {});
};

/**
 * Subscribes to a topic.
 * @param {string} topic The topic filter to subscribe to.
 * @param {object} [options] Subscription options.
 * @param {number} [options.qos=0] The maximum QoS level at which to receive messages.
 * @returns {void}
 * @example
 * dxmqttclient.subscribe('commands/light', { qos: 1 });
 */
dxmqttclient.subscribe = function (topic, options) {
    checkClientInitialized();
    validateTopic(topic, 'Subscribe topic');
    validateSubscribeOptions(options);

    const qos = (options && options.qos) || 0;
    client.subscribe(topic, qos);
};

/**
 * Unsubscribes from a topic.
 * @param {string} topic The topic filter to unsubscribe from.
 * @returns {void}
 */
dxmqttclient.unsubscribe = function (topic) {
    checkClientInitialized();
    validateTopic(topic, 'Unsubscribe topic');
    client.unsubscribe(topic);
};

/**
 * Sets the callback handlers for MQTT events.
 * @param {object} callbacks An object containing the callback functions.
 * @param {function()} [callbacks.onConnectSuccess] Fired when the client successfully connects to the broker.
 * @param {function(string, string, number, boolean)} [callbacks.onMessage] Fired when a message is received.
 * @param {function(number)} [callbacks.onDelivery] Fired when a published message has been delivered (for QoS > 0).
 * @param {function(string)} [callbacks.onConnectionLost] Fired when the connection to the broker is lost.
 */
dxmqttclient.setCallbacks = function (callbacks) {
    checkClientInitialized();

    if (!callbacks || typeof callbacks !== 'object') {
        throw new Error('Callbacks must be an object');
    }

    const callbackNames = ['onConnectSuccess', 'onMessage', 'onDelivery', 'onConnectionLost'];
    callbackNames.forEach(name => {
        if (callbacks[name] !== undefined && typeof callbacks[name] !== 'function') {
            throw new Error(`${name} must be a function`);
        }
    });

    client.setCallbacks(callbacks);
};

/**
 * Processes events from the MQTT event queue.
 * This should be called periodically to handle message arrivals,
 * delivery confirmations, and connection loss events.
 * It's recommended to use this with `setInterval`.
 * @example
 * // In your application thread loop:
 * setInterval(() => {
 *   dxmqttclient.loop();
 * },50); // Process events every 50ms
 */
dxmqttclient.loop = function () {
    try {
        checkClientInitialized();
        client.loop();
    } catch (e) {
        log.error('Error in MQTT loop:', e);
    }
};

/**
 * Checks if the client is currently connected to the broker.
 * @returns {boolean} `true` if connected, `false` otherwise.
 */
dxmqttclient.isConnected = function () {
    checkClientInitialized();
    return client.isConnected();
};

/**
 * Deinitializes the client instance, allowing for re-initialization.
 */
dxmqttclient.deinit = function () {
    if (client) {
        // The C++ finalizer handles disconnection and resource cleanup.
        // Setting client to null allows the garbage collector to reclaim it.
        client = null;
    }
};

/**
 * Get the native client object.
 * @returns {Object|null} The native client object, or null if not initialized.
 */
dxmqttclient.getNative = function () {
    return client;
};

export default dxmqttclient;
