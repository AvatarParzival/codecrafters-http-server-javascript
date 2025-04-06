const net = require('net');
const fs = require('fs');
const path = require('path');
console.log('Logs from your program will appear here!');
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const arguments = process.argv.slice(2);
    const dirPath = arguments[1];
    const [requestHeader, requestBody] = data.toString().split('\r\n\r\n');
    const [requestLine, host, userAgent, accept] = requestHeader.split('\r\n');
    const [method, targetPath, httpVersion] = requestLine.split(' ');
    const crlf = '\r\n';
    const statusLineOk = 'HTTP/1.1 200 OK' + crlf;
    if (targetPath === '/') {
      socket.write(statusLineOk + crlf);
    } else if (targetPath.startsWith('/echo/')) {
      const contentBody = targetPath.substring(6);
      const headers = requestHeader.split('\r\n');
      const acceptsGzip = headers.find(header => header.toLowerCase().includes('gzip'));
      let response = 'HTTP/1.1 200 OK' + crlf;
      if (acceptsGzip) response += 'Content-Encoding: gzip' + crlf;
      response += 'Content-Type: text/plain' + crlf;
      response += `Content-Length: ${contentBody.length}` + crlf;
      response += crlf + contentBody;
      socket.write(response);
    } else if (targetPath === '/user-agent') {
      const contentBody = userAgent.split(': ')[1];
      socket.write(statusLineOk);
      socket.write('Content-Type: text/plain' + crlf);
      socket.write(`Content-Length: ${contentBody.length}` + crlf);
      socket.write(crlf);
      socket.write(contentBody);
    } else if (targetPath.startsWith('/files/')) {
      const filename = targetPath.split('/')[2];
      const filepath = path.join(dirPath, filename);
      if (method === 'GET') {
        if (!fs.existsSync(filepath)) {
          socket.write('HTTP/1.1 404 Not Found' + crlf + crlf);
        } else {
          const data = fs.readFileSync(filepath, 'utf-8');
          socket.write('HTTP/1.1 200 OK' + crlf);
          socket.write('Content-Type: application/octet-stream' + crlf);
          socket.write(`Content-Length: ${data.length}` + crlf);
          socket.write(crlf);
          socket.write(data);
        }
      } else if (method === 'POST') {
        fs.writeFileSync(filepath, requestBody);
        socket.write('HTTP/1.1 201 Created' + crlf + crlf);
      }
    } else {
      socket.write('HTTP/1.1 404 Not Found' + crlf + crlf);
    }
    socket.end();
  });
});

server.listen(4221, 'localhost');