const path = require("path");
const http = require("http");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const { app } = require("./src/app");

const PORT = Number(process.env.PORT || 5000);
const KEEP_ALIVE_TIMEOUT_MS = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65000);
const HEADERS_TIMEOUT_MS = Number(process.env.HEADERS_TIMEOUT_MS || 66000);

const server = http.createServer(app);
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server gracefully...`);
  server.close((error) => {
    if (error) {
      console.error("Error while closing server:", error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});