const http = require('http');
const { parse } = require('url');
const fs = require('fs').promises;
const path = require('path');

let targetDirectory = process.cwd();

// Parse command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--directory' && process.argv[index + 1]) {
    targetDirectory = path.resolve(process.argv[index + 1]);
  }
});

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const parsedUrl = parse(url, true);
  const pathname = parsedUrl.pathname;

  // Handle POST /files/{filename}
  if (method === 'POST' && pathname.startsWith('/files/')) {
    const filename = pathname.slice('/files/'.length);
    
    // Security check
    if (filename.includes('..') || filename.includes('/')) {
      res.writeHead(400);
      res.end('Invalid filename');
      return;
    }

    // Check headers
    const contentType = req.headers['content-type'];
    const contentLength = req.headers['content-length'];

    if (contentType !== 'application/octet-stream') {
      res.writeHead(400);
      res.end('Invalid Content-Type');
      return;
    }

    if (!contentLength) {
      res.writeHead(411);
      res.end('Content-Length Required');
      return;
    }

    try {
      // Read request body
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      await new Promise((resolve) => req.on('end', resolve));
      const body = Buffer.concat(chunks);

      // Write file
      const filePath = path.join(targetDirectory, filename);
      await fs.writeFile(filePath, body);

      res.writeHead(201);
      res.end('Created');
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(4221, () => {
  console.log(`Server running at http://localhost:4221`);
  console.log(`Saving files to: ${targetDirectory}`);
});