# DW200 HTTP Client Test Project

This is a complete demonstration project for testing dxHTTPClient functionality on DW200_V20 devices, including client code and test server.

## Project Structure

```
dw200_test_httpclient/
├── client/                 # DW200 device client code
│   ├── app.dxproj         # Project configuration file
│   ├── dxmodules/         # DW200 module library
│   └── src/               # Source code
│       ├── main.js        # Main program entry
│       └── httpclient.js  # HTTP client test code
├── server/                 # Test server
│   ├── test_server.js     # Express.js test server
│   ├── package.json       # Node.js dependency configuration
│   ├── bigfile.txt        # Test large file
│   └── uploads/           # File upload directory
└── README.md              # Project documentation
```

## Features

### Client Features (DW200_V20)

- **Network Connection**: Automatic WiFi network connection
- **HTTP Client**: Support for complete HTTP methods
- **File Transfer**: Support for file upload and download
- **HTTPS Support**: Support for HTTPS requests
- **Progress Monitoring**: File transfer progress callbacks
- **Error Handling**: Comprehensive exception handling mechanism

### Server Features (Node.js)

- **RESTful API**: Support for GET, POST, PUT, PATCH, DELETE methods
- **File Processing**: Support for file upload and download
- **Status Code Testing**: Can return specified HTTP status codes
- **Delayed Response**: Support for delayed response testing
- **Header Echo**: Display client request headers

## Supported HTTP Methods

| Method | Endpoint        | Description                      |
| ------ | --------------- | -------------------------------- |
| GET    | `/get`          | Get query parameters and headers |
| POST   | `/post`         | Receive JSON or form data        |
| PUT    | `/put`          | Complete resource update         |
| PATCH  | `/patch`        | Partial resource update          |
| DELETE | `/delete/:id`   | Delete specified resource        |
| GET    | `/download`     | Download test file               |
| POST   | `/upload`       | Upload file                      |
| GET    | `/delay?t=ms`   | Delayed response test            |
| GET    | `/status/:code` | Return specified status code     |
| GET    | `/headers`      | Echo request headers             |

## Installation and Running

### Server Side

1. Enter the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Start the test server:

```bash
npm start
```

The server will run on `http://0.0.0.0:3000`.

### Client Side

1. Deploy the `client` directory to the DW200_V20 device
2. Modify the server address in `src/httpclient.js`:

```javascript
const urlroot = "http://your-server-ip:3000";
```

3. Run the client program

## Usage Examples

### Basic HTTP Requests

```javascript
// GET request
log.info(client.get(urlroot + "/get?name=quickjs&age=1"));

// POST request
log.info(
  client.post(urlroot + "/post", JSON.stringify({ foo: "bar", num: 42 }))
);

// PUT request
log.info(
  client.put(
    urlroot + "/put",
    JSON.stringify({ id: 123, name: "Updated User" })
  )
);
```

### File Transfer

```javascript
// Download file
log.info(client.download(urlroot + "/download", "/tmp/bigfile.txt"));

// Upload file
log.info(
  client.upload(
    urlroot + "/upload",
    "/app/code/dxmodules/libvbar-m-dxhttpclient.so"
  )
);
```

### HTTPS Requests

```javascript
client.setOpt("url", "https://reqres.in/api/users?page=2");
client.setOpt("verifyPeer", 0);
client.setOpt("verifyHost", 0);
log.info(client.request());
```

## Dependencies

### Client Modules (dxmodules/)

- `dxNetwork.js` - Network connection management
- `dxHttpClient.js` - HTTP client functionality
- `dxCommon.js` - Common functionality library
- `dxLogger.js` - Logging
- `dxEventBus.js` - Event bus
- `dxStd.js` - Standard library functions

### Server Dependencies

- `express` - Web framework
- `multer` - File upload middleware

## Configuration

### Network Configuration

Configure WiFi connection in `main.js`:

```javascript
dxnetwork.connectWifiWithDHCP("your-wifi-name", "your-wifi-password");
```

### Server Configuration

Modify the port number in `test_server.js`:

```javascript
const PORT = 3000; // Change to desired port
```

## Important Notes

1. **Network Configuration**: Ensure client and server are in the same network environment
2. **Firewall**: Ensure server port is not blocked by firewall
3. **File Permissions**: Ensure upload directory has appropriate read/write permissions

## Device Compatibility

This demo currently runs on DW200_V20 devices. To run on other devices, simply update the corresponding modules as needed.
