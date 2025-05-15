const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const { spawn } = require("child_process");
const app = express();
const port = 8080;

// Start JSON Server
console.log("Starting JSON Server...");
const jsonServer = spawn(
  "npx",
  [
    "json-server",
    "--watch",
    "src/assets/database/db.json",
    "--port",
    "3000",
    "--host",
    "0.0.0.0",
  ],
  { shell: true }
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

// Serve Angular static files
app.use(express.static("dist/somni-frontend"));

// For all other routes, serve the Angular app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/somni-frontend/index.html"));
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Production server running on http://0.0.0.0:${port}`);
});

// Handle termination
process.on("SIGINT", () => {
  jsonServer.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  jsonServer.kill();
  process.exit();
});
