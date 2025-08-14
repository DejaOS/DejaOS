// This is an HTTP server implemented with Node.js for the dxHttpClient module demo
// This code runs on a computer for testing the dxHttpClient module, not on the device.
// The corresponding client code is ../client
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GET 请求
app.get('/get', (req, res) => {
  res.json({
    method: 'GET',
    query: req.query,
    headers: req.headers,
  });
});

// POST 请求（JSON 或表单）
app.post('/post', (req, res) => {
  res.json({
    method: 'POST',
    body: req.body,
    headers: req.headers,
  });
});

// PUT 请求
app.put('/put', (req, res) => {
  res.json({
    method: 'PUT',
    body: req.body,
    headers: req.headers,
    message: 'Resource updated completely'
  });
});

// PATCH 请求
app.patch('/patch', (req, res) => {
  res.json({
    method: 'PATCH',
    body: req.body,
    headers: req.headers,
    message: 'Resource updated partially'
  });
});

// DELETE 请求（带参数）
app.delete('/delete/:id', (req, res) => {
  if (req.params.id === '1') {
    res.json({
      method: 'DELETE',
      id: req.params.id,
      headers: req.headers,
      message: 'Resource deleted'
    });
  } else {
    res.status(414).json({
      method: 'DELETE',
      error: `User ${req.params.id} not found`,
      path: req.path,
      headers: req.headers
    });
  }
});

// DELETE 通用接口（无参数）
app.delete('/delete', (req, res) => {
  res.json({
    method: 'DELETE',
    headers: req.headers,
    message: 'Delete called'
  });
});

// 下载大文件（模拟）
app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'bigfile.txt');
  // 如果文件不存在就生成一个
  if (!fs.existsSync(filePath)) {
    const fd = fs.openSync(filePath, 'w');
    for (let i = 0; i < 100; i++) {
      fs.writeSync(fd, `Line ${i}: Hello World!\n`);
    }
    fs.closeSync(fd);
  }

  res.download(filePath);
});

// 上传文件
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({
    message: 'File received',
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
  });
});

// 延迟响应
app.get('/delay', (req, res) => {
  const t = parseInt(req.query.t || '10000');
  setTimeout(() => {
    res.json({ message: `Delayed ${t}ms` });
  }, t);
});

// 返回指定状态码
app.get('/status/:code', (req, res) => {
  const code = parseInt(req.params.code);
  res.status(code).send(`Status ${code}`);
});

// 回显请求头
app.get('/headers', (req, res) => {
  res.json({ headers: req.headers });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on http://0.0.0.0:${PORT}`);
});