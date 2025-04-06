const fs = require("fs");
const net = require("net");
const zlib = require("zlib");

const STATUS = {
  OK: "HTTP/1.1 200 OK",
  NOT_FOUND: "HTTP/1.1 404 Not Found",
  CREATED: "HTTP/1.1 201 Created",
};

const server = net.createServer((socket) => {
  socket.on("data", (data) => handleRequest(socket, data));
  socket.on("close", () => socket.end());
});

server.listen(4221, "localhost");

function handleRequest(socket, data) {
  const [rawHeaders, body = ""] = data.toString().split("\r\n\r\n");
  const [method, path] = rawHeaders.split(" ")[0, 1];
  const headers = parseHeaders(rawHeaders);

  if (path === "/") return respond(socket, STATUS.OK);
  if (path.startsWith("/echo/")) return handleEcho(socket, path, headers);
  if (path === "/user-agent") return handleUserAgent(socket, headers);
  if (path.startsWith("/files")) return handleFile(socket, method, path, body);
  return respond(socket, STATUS.NOT_FOUND);
}

function handleEcho(socket, path, headers) {
  const message = path.substring(6);
  const isGzip = headers["accept-encoding"]?.includes("gzip");
  const encoded = isGzip ? zlib.gzipSync(message) : message;
  const response =
    `${STATUS.OK}\r\n` +
    (isGzip ? "Content-Encoding: gzip\r\n" : "") +
    `Content-Type: text/plain\r\n` +
    `Content-Length: ${encoded.length}\r\n\r\n`;

  socket.write(response);
  socket.write(encoded);
  socket.end();
}

function handleUserAgent(socket, headers) {
  const ua = headers["user-agent"] || "";
  const response =
    `${STATUS.OK}\r\n` +
    `Content-Type: text/plain\r\n` +
    `Content-Length: ${ua.length}\r\n\r\n` +
    ua;

  respond(socket, response);
}

function handleFile(socket, method, path, body) {
  const filename = path.split("/")[2];
  const dir = process.argv[3];
  const filePath = `${dir}/${filename}`;

  if (method === "GET") {
    if (!fs.existsSync(filePath)) return respond(socket, STATUS.NOT_FOUND);
    const content = fs.readFileSync(filePath);
    const response =
      `${STATUS.OK}\r\n` +
      `Content-Type: application/octet-stream\r\n` +
      `Content-Length: ${content.length}\r\n\r\n`;

    socket.write(response);
    socket.write(content);
    return socket.end();
  }

  if (method === "POST") {
    fs.writeFileSync(filePath, body);
    return respond(socket, STATUS.CREATED);
  }

  return respond(socket, STATUS.NOT_FOUND);
}

function respond(socket, message) {
  socket.write(message);
  socket.end();
}

function parseHeaders(headerStr) {
  const lines = headerStr.split("\r\n").slice(1);
  const headers = {};
  lines.forEach((line) => {
    const [key, value] = line.split(": ");
    if (key && value) headers[key.toLowerCase()] = value.trim();
  });
  return headers;
}
