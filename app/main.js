const fs = require("fs");
const net = require("net");
const zlib = require("zlib");

const HTTP_OK = "HTTP/1.1 200 OK\r\n\r\n";
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found\r\n\r\n";
const HTTP_CREATED = "HTTP/1.1 201 Created\r\n\r\n";

const server = net.createServer((socket) => {
  socket.on("data", (data) => handleRequest(socket, data));
  socket.on("close", () => socket.end());
});

server.listen(4221, "localhost");

function handleRequest(socket, data) {
  const { method, path } = parseRequestLine(data);

  if (path === "/") {
    return respond(socket, HTTP_OK);
  }

  if (path.startsWith("/echo")) {
    return handleEcho(socket, path, data);
  }

  if (path.startsWith("/user-agent")) {
    const { userAgent } = parseHeaders(data);
    const body = userAgent || "";
    return respond(socket, buildResponse(200, "text/plain", body));
  }

  if (path.startsWith("/files")) {
    const fileName = path.split("/")[2];
    const filePath = `${process.argv[3]}/${fileName}`;

    if (method === "GET") {
      if (!fs.existsSync(filePath)) return respond(socket, HTTP_NOT_FOUND);
      const fileData = fs.readFileSync(filePath);
      return respond(socket, buildResponse(200, "application/octet-stream", fileData));
    }

    if (method === "POST") {
      const body = getRequestBody(data);
      fs.writeFileSync(filePath, body);
      return respond(socket, HTTP_CREATED);
    }
  }

  respond(socket, HTTP_NOT_FOUND);
}

function handleEcho(socket, path, data) {
  const body = path.split("/")[2] || "";
  const acceptsGzip = parseAcceptedEncodings(data).includes("gzip");

  if (acceptsGzip) {
    const compressed = zlib.gzipSync(body);
    const headers = [
      "HTTP/1.1 200 OK",
      "Content-Type: text/plain",
      "Content-Encoding: gzip",
      `Content-Length: ${compressed.length}`,
      "\r\n",
    ].join("\r\n");

    socket.write(headers);
    socket.write(compressed);
    return socket.end();
  }

  respond(socket, buildResponse(200, "text/plain", body));
}

function parseRequestLine(data) {
  const [method, path, version] = data.toString().split("\r\n")[0].split(" ");
  return { method, path, version };
}

function parseHeaders(data) {
  const lines = data.toString().split("\r\n");
  const userAgentLine = lines.find((line) => line.startsWith("User-Agent:"));
  return { userAgent: userAgentLine?.split(": ")[1]?.trim() || "" };
}

function parseAcceptedEncodings(data) {
  const lines = data.toString().split("\r\n");
  const encodingLine = lines.find((line) => line.startsWith("Accept-Encoding:"));
  return encodingLine ? encodingLine.split(": ")[1].split(",").map(e => e.trim()) : [];
}

function getRequestBody(data) {
  return data.toString().split("\r\n\r\n")[1] || "";
}

function buildResponse(status, contentType, body) {
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return [
    `HTTP/1.1 ${status} ${statusText(status)}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${bodyBuffer.length}`,
    "\r\n",
    bodyBuffer,
  ].join("\r\n");
}

function respond(socket, message) {
  socket.write(message);
  socket.end();
}

function statusText(code) {
  switch (code) {
    case 200: return "OK";
    case 201: return "Created";
    case 404: return "Not Found";
    default: return "";
  }
}
