import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public class FileServer {
    private static Path targetDirectory;

    public static void main(String[] args) throws IOException {
        // Parse command line arguments
        parseArguments(args);

        // Create HTTP server
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 4221), 0);
        
        // Set up context handler for files endpoint
        server.createContext("/files/", new FileHandler());
        
        // Start the server
        server.start();
        System.out.println("Server started on port 4221");
    }

    private static void parseArguments(String[] args) {
        for (int i = 0; i < args.length; i++) {
            if (args[i].equals("--directory") && i + 1 < args.length) {
                targetDirectory = Paths.get(args[i + 1]).toAbsolutePath();
                System.out.println("Using directory: " + targetDirectory);
                return;
            }
        }
        System.err.println("Missing required --directory argument");
        System.exit(1);
    }

    static class FileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                // Only handle POST requests
                if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    sendResponse(exchange, 405, "Method Not Allowed");
                    return;
                }

                // Get filename from URL
                String path = exchange.getRequestURI().getPath();
                String filename = path.substring("/files/".length());

                // Validate filename
                if (filename.contains("..")) {
                    sendResponse(exchange, 400, "Invalid filename");
                    return;
                }

                // Validate headers
                String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
                String contentLength = exchange.getRequestHeaders().getFirst("Content-Length");

                if (!"application/octet-stream".equalsIgnoreCase(contentType)) {
                    sendResponse(exchange, 400, "Invalid Content-Type");
                    return;
                }

                if (contentLength == null) {
                    sendResponse(exchange, 411, "Content-Length Required");
                    return;
                }

                // Read request body
                byte[] body = exchange.getRequestBody().readAllBytes();

                // Write file to disk
                Path filePath = targetDirectory.resolve(filename);
                Files.write(filePath, body, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

                sendResponse(exchange, 201, "Created");
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "Internal Server Error");
            }
        }

        private void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
            exchange.sendResponseHeaders(statusCode, message.length());
            OutputStream os = exchange.getResponseBody();
            os.write(message.getBytes());
            os.close();
        }
    }
}