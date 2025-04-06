const fs = require("fs");
const net = require("net");
console.log("Logs from your program will appear here!");
const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
  });
  socket.on("data", (data) => {
    const req = data.toString();
    console.log(req);
    const path = req.split(" ")[1];
    if (path === "/") socket.write("HTTP/1.1 200 OK\r\n\r\n");
    else if (path.startsWith("/files/")) {
      const directory = process.argv[3];
      const filename = path.split("/files/")[1];
      if (fs.existsSync(`${directory}/${filename}`)) {
        const content = fs.readFileSync(`${directory}/${filename}`).toString();
        const res = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}\r\n`;
        socket.write(res);
      } else {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      }
    } else if (path === "/user-agent") {
      req.split("\r\n").forEach((line) => {
        if (line.includes("User-Agent")) {
          const res = line.split(" ")[1];
          socket.write(
            `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${res.length}\r\n\r\n${res}\r\n`
          );
        }
      });
    } else if (path.startsWith("/echo/")) {
      const res = path.split("/echo/")[1];
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${res.length}\r\n\r\n${res}\r\n\r`
      );
    } else socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
  });
});
server.listen(4221, "localhost");