const path = require("path");
const http = require("http");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const { app } = require("./src/app");

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "127.0.0.1";
const KEEP_ALIVE_TIMEOUT_MS = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65000);
const HEADERS_TIMEOUT_MS = Number(process.env.HEADERS_TIMEOUT_MS || 66000);
const MAX_PORT_RETRIES = Number(process.env.MAX_PORT_RETRIES || 10);
const ENABLE_PORT_FALLBACK = process.env.ENABLE_PORT_FALLBACK
  ? process.env.ENABLE_PORT_FALLBACK === "true"
  : true;

const server = http.createServer(app);
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;

let hasRetriedOnLocalhost = false;
let retries = 0;
let currentPort = PORT;
let currentHost = HOST;

function startServer() {
  server.listen(currentPort, currentHost);
}

server.on("error", (error) => {
  if (error && error.code === "EACCES" && currentHost === "0.0.0.0" && !hasRetriedOnLocalhost) {
    hasRetriedOnLocalhost = true;
    currentHost = "127.0.0.1";
    console.warn(
      `Permission denied for 0.0.0.0:${currentPort}. Retrying on 127.0.0.1:${currentPort}...`,
    );
    startServer();
    return;
  }

  if (
    error
    && ENABLE_PORT_FALLBACK
    && (error.code === "EACCES" || error.code === "EADDRINUSE")
    && retries < MAX_PORT_RETRIES
  ) {
    retries += 1;
    currentPort += 1;
    console.warn(
      `Port ${currentPort - 1} unavailable (${error.code}). Retrying on ${currentHost}:${currentPort}...`,
    );
    startServer();
    return;
  }

  if (error && error.code === "EACCES") {
    console.error(
      `Port ${currentPort} cannot be bound on host ${currentHost}. Try a different PORT in .env (for example PORT=5001).`,
    );
  } else if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${currentPort} is already in use. Try a different PORT in .env.`);
  } else {
    console.error("Server failed to start:", error);
  }

  process.exit(1);
});

server.on("listening", () => {
  console.log(`Server running on http://${currentHost}:${currentPort}`);
});

startServer();

function shutdown(signal) {
  console.log(`${signal} received. Closing server gracefully...`);

  if (!server.listening) {
    process.exit(0);
    return;
  }

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