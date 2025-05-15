const express = require("express");
const path = require("path");
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
  const jsonServer = require("child_process").spawn(
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
  const angularServer = require("child_process").spawn(
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
    require("http-proxy-middleware").createProxyMiddleware({
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
    require("http-proxy-middleware").createProxyMiddleware({
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
  // PROD MODE - Serve the built Angular app
  console.log("Running in production mode...");

  // Setup simple API endpoints
  try {
    console.log("Setting up JSON Server...");
    const jsonDbPath = path.join(
      __dirname,
      "src",
      "assets",
      "database",
      "db.json"
    );

    if (fs.existsSync(jsonDbPath)) {
      // Setup a simple JSON server manually
      const db = JSON.parse(fs.readFileSync(jsonDbPath, "utf8"));

      // Handle each top-level property in the JSON as an endpoint
      Object.keys(db).forEach((resource) => {
        app.get(`/api/${resource}`, (req, res) => {
          res.json(db[resource]);
        });

        app.get(`/api/${resource}/:id`, (req, res) => {
          const id = parseInt(req.params.id) || req.params.id;
          const item = db[resource].find((item) => item.id === id);
          if (item) {
            res.json(item);
          } else {
            res.status(404).json({ error: "Not found" });
          }
        });
      });

      console.log("JSON Server routes set up");
    } else {
      console.warn(`JSON DB file not found at ${jsonDbPath}`);
    }
  } catch (error) {
    console.error("Error setting up JSON Server:", error.message);
  }

  // Setup simple status endpoint
  app.get("/api/status", (req, res) => {
    res.json({ message: "API is working in production mode", status: "ok" });
  });

  // Check if the Angular build exists
  const distPath = path.join(__dirname, "dist", "somni-frontend");
  // For Angular 17+, the actual files are in the browser subdirectory
  const browserPath = path.join(distPath, "browser");

  if (fs.existsSync(browserPath)) {
    console.log(`Serving Angular app from: ${browserPath}`);

    // Serve static files from the browser directory
    app.use(express.static(browserPath));

    // For Angular routing, serve index.html for paths that don't match static files
    app.use((req, res, next) => {
      // Skip API requests
      if (req.path.startsWith("/api")) {
        return next();
      }

      // Try to serve the file directly if it exists
      const filePath = path.join(browserPath, req.path);
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return next();
        }
      } catch (err) {
        // If there's an error checking the file, continue to serve index.html
      }

      // For all other routes, serve index.html to support Angular routing
      console.log(`Angular route: ${req.path} - serving index.html`);
      res.sendFile(path.join(browserPath, "index.html"));
    });
  } else {
    console.error(`Error: Angular build directory not found at ${browserPath}`);
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
