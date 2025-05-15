const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const app = express();
const port = 8080;

// Check if we're in production mode
const isProd = process.env.NODE_ENV === "production";
console.log(`Running in ${isProd ? "production" : "development"} mode`);

if (!isProd) {
  // DEV MODE - Start JSON Server and Angular dev server
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

  // Proxy all other requests to Angular
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:4200",
      ws: true,
      changeOrigin: true,
    })
  );

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
} else {
  // PROD MODE - Serve the built Angular app with a simple API mock
  console.log("Running in production mode...");

  // Simple mock API for demo purposes
  app.get("/api/status", (req, res) => {
    res.json({ message: "API is working in production mode", status: "ok" });
  });

  // Check if the Angular build exists
  const distPath = path.join(__dirname, "dist", "somni-frontend");
  if (fs.existsSync(distPath)) {
    console.log(`Serving Angular app from: ${distPath}`);

    // Serve static files
    app.use(express.static(distPath));

    // Serve index.html for all other routes (SPA)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.error(`Error: Angular build not found at ${distPath}`);
    app.use((req, res) => {
      res
        .status(404)
        .send("Application files not found. Build may have failed.");
    });
  }
}

// Start the main server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
