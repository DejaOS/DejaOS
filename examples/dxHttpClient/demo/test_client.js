// This is the client code for the dxHttpClient module demo
// The corresponding server code is 'test_server.js'
import log from '../dxmodules/dxLogger.js'
import client from '../dxmodules/dxHttpClient.js'
import std from '../dxmodules/dxStd.js'
try {
    // Replace with your server address, the matching server code is 'test_server.js'
    const urlroot = "http://192.168.50.30:3000";

    // 1. GET demo
    log.info("\n=== GET ===");
    log.info(client.get(urlroot + "/get?name=quickjs&age=1"));
    // Output: {"code":0,"data":"{\"method\":\"GET\",\"query\":{\"name\":\"quickjs\",\"age\":\"1\"},\"headers\":{\"host\":\"192.168.50.30:3000\",\"accept\":\"*/*\"}}"}

    // 2. POST demo
    log.info("\n=== POST ===");
    log.info(client.post(urlroot + "/post", { foo: "bar", num: 42 }));
    // Output: {"code":0,"data":"{\"method\":\"POST\",\"body\":{\"foo\":\"bar\",\"num\":42},\"headers\":{\"host\":\"192.168.50.30:3000\",\"accept\":\"*/*\",\"content-type\":\"application/json\",\"content-length\":\"22\"}}"}

    // 3. Download file demo
    log.info("\n=== Download ===");
    log.info(client.download(urlroot + "/download", "/tmp/bigfile.txt"));
    log.info('download file length:', std.loadFile("/tmp/bigfile.txt").length);
    // Output: {"code":0} download file length: xxxx

    // 4. Upload file demo
    log.info("\n=== Upload ===");
    log.info(client.upload(urlroot + "/upload", "/app/code/dxmodules/libvbar-m-dxhttpclient.so"));

    // 5. Download file demo with progress
    log.info("\n=== Download ===");
    client.reset();
    client.setOpt("method", "GET");
    client.setOpt("url", urlroot + "/download");
    client.setOpt("onProgress", function (dTotal, dLoaded, uTotal, uLoaded) {
        log.info('progress:', dTotal, dLoaded, uTotal, uLoaded);
        // Output: progress: xxx yyy 0 0
    });
    log.info(client.__native__.downloadToFile("/tmp/bigfile.txt"));
    log.info('download file length:', std.loadFile("/tmp/bigfile.txt").length);
    // Output: {"code":0} download file length: xxxx

    // 6. HTTPS demo
    log.info("\n=== HTTPS ===");
    client.reset();
    client.setOpt("url", "https://reqres.in/api/users?page=2");
    client.setOpt("method", "GET");
    client.setOpt("verifyPeer", 0);
    client.setOpt("verifyHost", 0);
    client.setOpt("header", "x-api-key: reqres-free-v1");
    log.info(client.request());
    // Output: {"code":0,"data":"{\"page\":2,\"per_page\":6,\"total\":12,\"total_pages\":2......
} catch (e) {
    log.error(e);
}
log.info("=== END ===");
