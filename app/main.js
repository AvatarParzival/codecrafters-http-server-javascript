const fs = require("fs"); // fileSystem to handle file operations
const net = require("net");
const zlib = require('zlib'); // library to compress gzip data
const HTTP_OK = "HTTP/1.1 200 OK\r\n\r\n";
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found\r\n\r\n";
const HTTP_CREATED = "HTTP/1.1 201 Created\r\n\r\n";
const server = net.createServer((socket) => {
    //writeHTTP_OK(socket);
    socket.on("close", () => {
     socket.end();
     //server.close();
   });
    socket.on("data", (data) => {
       handleData(socket, data);
    });
 });
server.listen(4221, "localhost");
function handleData(socket, data) {
    const requestLineItems = parseRequestLine(socket, data);
    const currentPath = requestLineItems['path'];
    const currentMethod = requestLineItems['method'];
    if(currentPath === '/'){
        writeSocketMessage(socket, HTTP_OK);
    }
    else if(currentPath.startsWith('/echo')){
        const bodyContent = currentPath.split('/')[2];
        const content_length = bodyContent.length.toString();
        let response = '';
        const encodingMethods = getEncodingMethods(socket, data);
        if(encodingMethods.length > 0){
            const bodyEncoded = zlib.gzipSync(bodyContent);
            const bodyEncodedLength = bodyEncoded.length;
            response = `HTTP/1.1 200 OK\r\nContent-Encoding: ${encodingMethods}\r\nContent-Type: text/plain\r\nContent-Length: ${bodyEncodedLength}\r\n\r\n`;
            socket.write(response);
            socket.write(bodyEncoded);
            socket.end();
        }
        else{
            response = HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content_length}\r\n\r\n${bodyContent};
            writeSocketMessage(socket, response);
        }
    }
    else if(currentPath.startsWith('/user-agent')){
        //console.log(headerContent);
        const headerContent = parseHeaders(socket, data);
        const userAgent = headerContent['userAgent'];
        const userAgent_length = userAgent.length.toString();
        const response = HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent_length}\r\n\r\n${userAgent};
        writeSocketMessage(socket,response);
    }
    else if(currentPath.startsWith('/files') && currentMethod === 'GET'){
        const fileName = currentPath.split('/')[2];
        const fileDirectory = process.argv[3];
        const file = ${fileDirectory}/${fileName};
        if(fs.existsSync(file)){
            const content = fs.readFileSync(file).toString();
            const length = content.length;
            const response = HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${length}\r\n\r\n${content}\r\n;
            writeSocketMessage(socket, response);
        }else {
            writeSocketMessage(socket, HTTP_NOT_FOUND);
        }
    }
    else if(currentPath.startsWith('/files') && currentMethod === 'POST'){
        const fileName = currentPath.split('/')[2];
        const fileDirectory = process.argv[3];
        const file = ${fileDirectory}/${fileName};
        const content = getRequestBody(socket, data);
        fs.writeFileSync(file, content);
        writeSocketMessage(socket, HTTP_CREATED);
    }
    else{
        writeSocketMessage(socket, HTTP_NOT_FOUND);
    }
}
function parseRequestLine(socket, data){
    const request = data.toString();
    const lines = request.split('\r\n');
    const method = lines[0].split(" ")[0];
    const path = lines[0].split(" ")[1];
    const version = lines[0].split(" ")[2];
    return {'method': method, 'path': path, 'version': version};
}
function parseHeaders(socket, data){
    const request = data.toString();
    const lines = request.split('\r\n');
    //console.log(lines);
    const host = lines[1].split(" ")[1];
    const userAgent = (lines[2].split(" ")[1]).trim();
    //console.log(userAgent);
    return {'host': host, 'userAgent': userAgent};
}
function getEncodingMethods(socket, data){
    const request = data.toString();
    const lines = request.split('\r\n');
    const lineOfEncode = lines.find((line) => line.startsWith("Accept-Encoding"));
    let encodingsPart = '';
    if(lineOfEncode !== undefined)
        encodingsPart = (lineOfEncode.split(": ")[1]).trim();
    else
        return [];
    const encodingMethods = encodingsPart.split(", ");
    return encodingMethods.filter((encodeMethod) => encodeMethod === 'gzip');
}
function getRequestBody(socket, data){
    const request = data.toString();
    const lines = request.split('\r\n');
    const body = lines[lines.length - 1];
    return body;
}
function writeSocketMessage (socket, message){
    socket.write(message);
    socket.end();
}