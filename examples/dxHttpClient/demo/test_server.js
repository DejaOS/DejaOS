// This is an HTTP server implemented with Node.js for the dxHttpClient module demo
// The corresponding client code is in test_client.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GET request
app.get('/get', (req, res) => {
  res.json({
    method: 'GET',
    query: req.query,
    headers: req.headers,
  });
});

// POST request (JSON or form data)
app.post('/post', (req, res) => {
  res.json({
    method: 'POST',
    body: req.body,
    headers: req.headers,
  });
});

// Download large file (simulation)
app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'bigfile.txt');
  // Generate file if it doesn't exist
  if (!fs.existsSync(filePath)) {
    const fd = fs.openSync(filePath, 'w');
    for (let i = 0; i < 100; i++) {
      fs.writeSync(fd, `Line ${i}: Hello World!\n`);
    }
    fs.closeSync(fd);
  }

  res.download(filePath);
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({
    message: 'File received',
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
  });
});

// Delayed response
app.get('/delay', (req, res) => {
  const t = parseInt(req.query.t || '10000');
  setTimeout(() => {
    res.json({ message: `Delayed ${t}ms` });
  }, t);
});

// Return specified status code
app.get('/status/:code', (req, res) => {
  const code = parseInt(req.params.code);
  res.status(code).send(`Status ${code}`);
});

// Echo request headers
app.get('/headers', (req, res) => {
  res.json({ headers: req.headers });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
