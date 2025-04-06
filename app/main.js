import { createServer } from 'node:net';
const createResponse = ({ status, headers, body }) => {
  return [
    `HTTP/1.1 ${status}`,
    ...Object.entries(headers ?? {}).map(([key, value]) => `${key}: ${value}`),
    '',
    body ?? '',
  ].join('\r\n');
};
const server = createServer((socket) => {
  socket.on('data', (data) => {
    let response = '';
    try {
      const [startLine, ..._headersAndBody] = data.toString().split('\r\n');
      const [_method, path, _version] = startLine.split(' ');
      if (path === '/') {
        response = createResponse({
          status: '200 OK',
        });
      } else if (path.startsWith('/echo')) {
        const randomString = path.split('echo/')[1];
        response = createResponse({
          status: '200 OK',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': randomString.length,
          },
          body: randomString,
        });
      } else {
        response = createResponse({
          status: '404 Not Found',
        });
      }
    } catch (error) {
      response = createResponse({
        status: '500 Internal Server Error',
      });
    }
    socket.write(response);
    socket.end();
  });
  socket.on('close', () => {
    socket.end();
    server.close();
  });
});
server.listen(4221, 'localhost', () => {
  console.log('Server started at http://localhost:4221');
});