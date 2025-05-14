const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const { spawn } = require("child_process");
const app = express();
const port = 8080;

// Determine the correct command to run based on OS
const isWindows = process.platform === "win32";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const ngCommand = isWindows
  ? path.join("node_modules", ".bin", "ng.cmd")
  : path.join("node_modules", ".bin", "ng");

// Start JSON Server as a separate process
console.log("Starting JSON Server...");
const jsonServer = spawn(
  npxCommand,
  [
    "json-server",
    "--watch",
    path.join("src", "assets", "database", "db.json"),
    "--host",
    "0.0.0.0",
    "--port",
    "3000",
  ],
  { shell: isWindows }
);

jsonServer.stdout.on("data", (data) => {
  console.log(`JSON Server: ${data}`);
});

jsonServer.stderr.on("data", (data) => {
  console.error(`JSON Server Error: ${data}`);
});

// Proxy API requests to JSON Server
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    pathRewrite: {
      "^/api": "",
    },
  })
);

// Start Angular dev server
console.log("Starting Angular dev server...");
const angularServer = spawn(
  ngCommand,
  ["serve", "--host", "0.0.0.0", "--port", "4200", "--disable-host-check"],
  { shell: isWindows }
);

angularServer.stdout.on("data", (data) => {
  console.log(`Angular: ${data}`);
});

angularServer.stderr.on("data", (data) => {
  console.error(`Angular Error: ${data}`);
});

// Proxy all other requests to Angular
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:4200",
    ws: true,
    changeOrigin: true,
  })
);

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Main server running on http://0.0.0.0:${port}`);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down servers...");
  jsonServer.kill();
  angularServer.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  console.log("Shutting down servers...");
  jsonServer.kill();
  angularServer.kill();
  process.exit();
});
