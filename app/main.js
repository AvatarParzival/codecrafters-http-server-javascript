const fs = require("fs");
const net = require("net");
const zlib = require("zlib");

const CRLF = "\r\n";
const HTTP_OK = `HTTP/1.1 200 OK${CRLF}`;
const HTTP_NOT_FOUND = `HTTP/1.1 404 Not Found${CRLF}${CRLF}`;
const HTTP_CREATED = `HTTP/1.1 201 Created${CRLF}${CRLF}`;
const PORT = 4221;
const HOST = "localhost";

const server = net.createServer((socket) => {
  socket.on("data", (data) => handleRequest(socket, data));
  socket.on("close", () => socket.end());
});

server.listen(PORT, HOST);

function handleRequest(socket, data) {
  const request = data.toString();
  const [headerPart, body = ""] = request.split(`${CRLF}${CRLF}`);
  const [requestLine, ...headers] = headerPart.split(CRLF);
  const [method, path] = requestLine.split(" ");
  const userAgent = headers.find(h => h.startsWith("User-Agent:"))?.split(": ")[1] || "";
  const acceptEncoding = headers.find(h => h.startsWith("Accept-Encoding:"))?.split(": ")[1] || "";
  const isGzip = acceptEncoding.includes("gzip");

  if (path === "/") {
    return respond(socket, HTTP_OK);
  }

  if (path.startsWith("/echo/")) {
    const message = path.slice(6);
    if (isGzip) {
      const compressed = zlib.gzipSync(message);
      const responseHeaders = [
        HTTP_OK.trim(),
        `Content-Encoding: gzip`,
        `Content-Type: text/plain`,
        `Content-Length: ${compressed.length}`,
        "",
        ""
      ].join(CRLF);
      socket.write(responseHeaders);
      socket.write(compressed);
    } else {
      const response = [
        HTTP_OK.trim(),
        `Content-Type: text/plain`,
        `Content-Length: ${message.length}`,
        "",
        message
      ].join(CRLF);
      respond(socket, response);
    }
    return;
  }

  if (path === "/user-agent") {
    const response = [
      HTTP_OK.trim(),
      `Content-Type: text/plain`,
      `Content-Length: ${userAgent.length}`,
      "",
      userAgent
    ].join(CRLF);
    return respond(socket, response);
  }

  if (path.startsWith("/files")) {
    const fileName = path.split("/")[2];
    const filePath = `${process.argv[3]}/${fileName}`;

    if (method === "GET") {
      if (!fs.existsSync(filePath)) return respond(socket, HTTP_NOT_FOUND);
      const content = fs.readFileSync(filePath);
      const response = [
        HTTP_OK.trim(),
        `Content-Type: application/octet-stream`,
        `Content-Length: ${content.length}`,
        "",
        ""
      ].join(CRLF);
      socket.write(response);
      socket.write(content);
      return socket.end();
    }

    if (method === "POST") {
      fs.writeFileSync(filePath, body);
      return respond(socket, HTTP_CREATED);
    }
  }

  respond(socket, HTTP_NOT_FOUND);
}

function respond(socket, message) {
  socket.write(message);
  socket.end();
}
