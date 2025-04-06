
const fs = require("fs");
const net = require("net");
const zlib = require("zlib");
const HTTP_OK = "HTTP/1.1 200 OK\r\n\r\n";
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found\r\n\r\n";
const HTTP_CREATED = "HTTP/1.1 201 Created\r\n\r\n";
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    handleData(socket, data);
  });
  socket.on("close", () => {
    socket.end();
  });
});
server.listen(4221, "localhost");
function handleData(socket, data) {
  const requestLineItems = parseRequestLine(data);
  const currentPath = requestLineItems.path;
  const currentMethod = requestLineItems.method;
  if (currentPath === "/") {
    writeSocketMessage(socket, HTTP_OK);
  } else if (currentPath.startsWith("/echo")) {
    const bodyContent = currentPath.split("/")[2];
    const contentLength = bodyContent.length.toString();
    const encodingMethods = getEncodingMethods(data);
    if (encodingMethods.includes("gzip")) {
      const bodyEncoded = zlib.gzipSync(bodyContent);
      const bodyEncodedLength = bodyEncoded.length;
      const response = `HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Type: text/plain\r\nContent-Length: ${bodyEncodedLength}\r\n\r\n`;
      socket.write(response);
      socket.write(bodyEncoded);
      socket.end();
    } else {
      const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${bodyContent}`;
      writeSocketMessage(socket, response);
    }
  } else if (currentPath.startsWith("/user-agent")) {
    const headerContent = parseHeaders(data);
    const userAgent = headerContent.userAgent;
    const userAgentLength = userAgent.length.toString();
    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgentLength}\r\n\r\n${userAgent}`;
    writeSocketMessage(socket, response);
  } else if (currentPath.startsWith("/files") && currentMethod === "GET") {
    const fileName = currentPath.split("/")[2];
    const fileDirectory = process.argv[3];
    const file = `${fileDirectory}/${fileName}`;
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file);
      const length = content.length;
      const response = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${length}\r\n\r\n`;
      socket.write(response);
      socket.write(content);
      socket.end();
    } else {
      writeSocketMessage(socket, HTTP_NOT_FOUND);
    }
  } else if (currentPath.startsWith("/files") && currentMethod === "POST") {
    const fileName = currentPath.split("/")[2];
    const fileDirectory = process.argv[3];
    const file = `${fileDirectory}/${fileName}`;
    const content = getRequestBody(data);
    fs.writeFileSync(file, content);
    writeSocketMessage(socket, HTTP_CREATED);
  } else {
    writeSocketMessage(socket, HTTP_NOT_FOUND);
  }
}
function parseRequestLine(data) {
  const request = data.toString();
  const lines = request.split("\r\n");
  const [method, path, version] = lines[0].split(" ");
  return { method, path, version };
}
function parseHeaders(data) {
  const request = data.toString();
  const lines = request.split("\r\n");
  const userAgentLine = lines.find((line) => line.startsWith("User-Agent:"));
  const userAgent = userAgentLine ? userAgentLine.split(": ")[1] : "";
  return { userAgent };
}
function getEncodingMethods(data) {
  const request = data.toString();
  const lines = request.split("\r\n");
  const encodingLine = lines.find((line) => line.startsWith("Accept-Encoding:"));
  if (!encodingLine) return [];
  const encodings = encodingLine.split(": ")[1];
  return encodings.split(",").map((e) => e.trim());
}
function getRequestBody(data) {
  const request = data.toString();
  return request.split("\r\n\r\n")[1] || "";
}
function writeSocketMessage(socket, message) {
  socket.write(message);
  socket.end();
