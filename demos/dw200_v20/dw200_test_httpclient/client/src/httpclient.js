import log from '../dxmodules/dxLogger.js'
import client from '../dxmodules/dxHttpClient.js'
import std from '../dxmodules/dxStd.js'
try {
    // Replace with your server address, the matching server code is '../server/test_server.js'
    const urlroot = "http://192.168.50.36:3000";
    // 1. GET demo
    log.info("\n=== GET ===");
    log.info(client.get(urlroot + "/get?name=quickjs&age=1"));
    // Output: {"code":0,"status":200,"data":"{\"method\":\"GET\",\"query\":{\"name\":\"quickjs\",\"age\":\"1\"},\"headers\":{\"host\":\"192.168.50.233:3000\",\"accept\":\"*/*\"}}"}

    // 2. POST demo
    log.info("\n=== POST ===");
    log.info(client.post(urlroot + "/post", JSON.stringify({ foo: "bar", num: 42 })));
    // Output: {"code":0,"status":200,"data":"{\"method\":\"POST\",\"body\":{\"foo\":\"bar\",\"num\":42},\"headers\":{\"host\":\"192.168.50.233:3000\",\"accept\":\"*/*\",\"content-type\":\"application/json\",\"content-length\":\"22\"}}"}

    // 3. Download file demo
    log.info("\n=== Download ===");
    let opts = {}
    opts.verifyPeer = 0;
    opts.verifyHost = 0;
    log.info(client.download(urlroot + "/download", "/tmp/bigfile.txt", null, opts));
    log.info('download file length:', std.loadFile("/tmp/bigfile.txt").length);
    // Output: {"code":0,"status":200} download file length: 2290

    // 4. Upload file demo
    log.info("\n=== Upload ===");
    log.info(client.upload(urlroot + "/upload", "/app/code/dxmodules/libvbar-m-dxhttpclient.so"));
    // Output: {"code":0,"status":200}

    // 5. Download file demo with progress
    log.info("\n=== Download ===");
    client.reset();
    client.setOpt("method", "GET");
    client.setOpt("url", urlroot + "/download");
    client.setOpt("onProgress", function (dTotal, dLoaded, uTotal, uLoaded) {
        log.info('progress:', dTotal, dLoaded, uTotal, uLoaded);
        // Output: progress: xxx yyy 0 0
    });
    log.info(client.getNative().downloadToFile("/tmp/bigfile.txt"));
    log.info('download file length:', std.loadFile("/tmp/bigfile.txt").length);
    // Output: {"code":0,"status":200} download file length: xxxx

    // 6. HTTPS demo
    log.info("\n=== HTTPS ===");
    client.reset();
    client.setOpt("url", "https://reqres.in/api/users?page=2");
    client.setOpt("method", "GET");
    client.setOpt("verifyPeer", 0);
    client.setOpt("verifyHost", 0);
    client.setOpt("headers", ["x-api-key: reqres-free-v1"]);
    log.info(client.request());
    // Output: {"code":0,"status":200,"data":"{\"page\":2,\"per_page\":6,\"total\":12...

    // 7. PUT demo
    log.info("\n=== PUT ===");
    log.info(client.put(urlroot + "/put", JSON.stringify({ id: 123, name: "Updated User", email: "updated@example.com" })));
    // Output: {"code":0,"status":200,"data":"{\"method\":\"PUT\",\"body\":{\"id\":123,\"name\":\"Updated User\",\"email\":\"updated@example.com\"},\"headers\":{\"host\":\"192.168.50.233:3000\",\"accept\":\"*/*\",\"content-type\":\"application/json\",\"content-length\":\"62\"},\"message\":\"Resource updated completely\"}"}

    // 8. PATCH demo
    log.info("\n=== PATCH ===");
    log.info(client.patch(urlroot + "/patch", JSON.stringify({ email: "patched@example.com", status: "active" })));
    // Output: {"code":0,"status":200,"data":"{\"method\":\"PATCH\",\"body\":{\"email\":\"patched@example.com\",\"status\":\"active\"},\"headers\":{\"host\":\"192.168.50.233:3000\",\"accept\":\"*/*\",\"content-type\":\"application/json\",\"content-length\":\"49\"},\"message\":\"Resource updated partially\"}"}

    // 9. DELETE demo (without body)
    log.info("\n=== DELETE ===");
    log.info(client.delete(urlroot + "/delete/123"));
    // Output: {"code":0,"status":414,"data":"{\"method\":\"DELETE\",\"error\":\"User 123 not found\",\"path\":\"/delete/123\",\"headers\":{\"host\":\"192.168.50.233:3000\",\"accept\":\"*/*\"}}","message":"Client Error: HTTP 404"}


} catch (e) {
    log.error(e);
}
log.info("=== END ===");
