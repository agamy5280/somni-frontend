const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const app = express();
const port = 8080;

// Check if dist directory exists
const distPath = path.join(__dirname, "dist/somni-frontend");
if (!fs.existsSync(distPath)) {
  console.error("Error: Angular build directory not found at:", distPath);
  console.error(
    "Please ensure the application is built before starting the server"
  );
  process.exit(1);
}

// Start JSON Server as a separate process
console.log("Starting JSON Server...");
const jsonServer = spawn(
  "npx",
  [
    "json-server",
    "--watch",
    path.join("src", "assets", "database", "db.json"),
    "--host",
    "0.0.0.0",
    "--port",
    "3000",
  ],
  { shell: process.platform === "win32" }
);

jsonServer.stdout.on("data", (data) => {
  console.log(`JSON Server: ${data}`);
});

jsonServer.stderr.on("data", (data) => {
  console.error(`JSON Server Error: ${data}`);
});

// Add error handling for JSON Server
jsonServer.on("error", (err) => {
  console.error("JSON Server process error:", err);
});

jsonServer.on("exit", (code, signal) => {
  console.log(
    `JSON Server process exited with code ${code} and signal ${signal}`
  );
  // Optionally restart the JSON server if it fails
  if (code !== 0 && !signal) {
    console.log("Attempting to restart JSON Server...");
    // Restart logic here if needed
  }
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

// Serve static files from the Angular build directory
app.use(express.static(distPath));

// For all other routes, serve the Angular application
app.all("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Start server
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Production server running on http://0.0.0.0:${port}`);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down servers...");
  jsonServer.kill();
  server.close();
  process.exit();
});

process.on("SIGTERM", () => {
  console.log("Shutting down servers...");
  jsonServer.kill();
  server.close();
  process.exit();
});
