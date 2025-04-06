const net = require('net');
const fs = require('fs');
// You can use print statements as follows for debugging, they'll be visible when running tests.
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
  const contentBody = targetPath.substring(6); // safely get the echoed text
  const headers = requestHeader.split('\r\n');
  const acceptsGzip = headers.find(header => header.toLowerCase().includes('gzip'));

  let response = 'HTTP/1.1 200 OK' + crlf;

  if (acceptsGzip) {
    response += 'Content-Encoding: gzip' + crlf;
  }

  response += 'Content-Type: text/plain' + crlf;
  response += `Content-Length: ${contentBody.length}` + crlf;
  response += crlf;
  response += contentBody;

  socket.write(response);
}

    } else if (targetPath === '/user-agent') {
      const contentBody = userAgent.split(': ')[1];
      socket.write(statusLineOk);
      socket.write('Content-Type: text/plain' + crlf);
      socket.write(`Content-Length: ${contentBody.length}` + crlf);
      socket.write(crlf);
      socket.write(contentBody);
    } else if (targetPath.includes('/files')) {
      const filename = targetPath.split('/')[2];
      const filepath = dirPath + filename;
      console.log('filepath');
      console.log(filepath);
      if (method === 'GET') {
        if (!fs.existsSync(filepath)) {
          socket.write('HTTP/1.1 404 Not Found' + crlf + crlf);
          socket.end();
        } else {
          const data = fs.readFileSync(filepath, { encoding: 'UTF-8' });
          try {
            socket.write('HTTP/1.1 200 OK' + crlf);
            socket.write(`Content-Length: ${data.length}` + crlf);
            socket.write('Content-Type: application/octet-stream' + crlf);
            socket.write(crlf);
            socket.write(data);
          } catch (error) {
            console.log('a series of unfortunate get events');
            console.log(error);
          }
        }
      }
      if (method === 'POST') {
        try {
          fs.writeFileSync(filepath, requestBody, { flag: 'a' });
          socket.write('HTTP/1.1 201 Created' + crlf);
          socket.write(crlf);
        } catch (error) {
          console.log('a series of unfortunate post events');
          console.log(error);
        }
      }
    } else {
      socket.write('HTTP/1.1 404 Not Found' + crlf + crlf);
    }
    socket.end();
  });
  // socket.on('close', () => {
    // socket.end();
    // server.close();
 // });
});
server.listen(4221, 'localhost');