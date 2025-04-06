const net = require("net");
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const HTTP_METHODS = ["GET", "POST"];
function parseSocketData(data) {
  const parsedData = {};
  const request = data.toString();
  const lines = request.split("\r\n");
  lines.forEach((line) => {
    const splitedLine = line.split(" ");
    const type = splitedLine.shift().replace(/\:/gmi,'');
    if (type) {
      if (HTTP_METHODS.includes(type)) {
        parsedData["method"] = [type, ...splitedLine];
      }else {
        parsedData[type] = [...splitedLine];
      }
    }
  })
  return parsedData;
}
// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = parseSocketData(data);
    const [httpMethod, path, httpVersion] = request.method;
    if (httpMethod === "GET") {
      if (path === "/" || path === "/index.html") {
        socket.write(`${httpVersion} 200 OK\r\n\r\n`);
      } else if (path.startsWith("/echo")) {
        const content = path.split("/")[2].replace("/", "");
        console.log({content});
        socket.write(`${httpVersion} 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}
        `);
      } else if (path.startsWith("/user-agent")) {
        const userAgent = request["User-Agent"][0];
        socket.write(
          `${httpVersion} 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`
        );
      } else {
        socket.write(`${httpVersion} 404 Not Found\r\n\r\n`);
      }
    } else {
      socket.write(`${httpVersion} 404 Not Found\r\n\r\n`);
    }
    socket.end();
  });
  socket.on("close", () => {
    socket.end();
  });
});
server.listen(4221, "localhost");