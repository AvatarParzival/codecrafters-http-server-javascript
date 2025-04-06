const net = require("net");
const fs = require("fs");
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
const args = {};
process.argv.forEach((arg, index) => {
  if (arg.startsWith("--")) {
    args[arg.replace(/^--/, "")] = process.argv[index + 1];
  }
});
1;
const FILES_DIR = args["directory"];
// Uncomment this to pass the first stage
const server = net.createServer({ keepAlive: true }, (socket) => {
  socket.on("data", (data) => {
    let path = data.toString().split(" ")[1];
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else if (path.includes("/echo/")) {
      let randomString = path.split("echo/")[1];
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " +
          randomString.length +
          "\r\n\r\n" +
          randomString
      );
    } else if (path.includes("user-agent")) {
      let userAgent = data.toString().split("\r\n")[2].split(" ")[1];
      console.log(userAgent);
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " +
          userAgent.length +
          "\r\n\r\n" +
          userAgent
      );
    } else if (
      path.startsWith("/files/") &&
      data.toString().split(" ")[0] === "POST"
    ) {
      let fileName = path.split("/")[2];
      const filePath = FILES_DIR + fileName;
      const file = data.toString("utf-8").split("\r\n\r\n")[1];
      fs.writeFileSync(filePath, file);
      socket.write("HTTP/1.1 201 CREATED\r\n\r\n");
    } else if (path.includes("/files/")) {
      let fileName = path.split("/")[2];
      console.log("FILENAME: " + fileName);
      const filePath = FILES_DIR + fileName;
      if (fs.existsSync(filePath)) {
        const file = fs.readFileSync(filePath, "utf-8");
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${file.length}\r\n\r\n${file}`
        );
      } else {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        1;
      }
    } else {
      socket.write("HTTP/1.1 404 NOT FOUND\r\n\r\n");
    }
    socket.end();
  });
  socket.on("close", () => {
    socket.end();
    server.close();
  });
});
server.listen(4221, "localhost");