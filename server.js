const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const port = 8080;

// Check if we're in production mode
const isProd = process.env.NODE_ENV === "production";
console.log(`Running in ${isProd ? "production" : "development"} mode`);

// Add body-parser middleware for JSON handling with higher limits for large requests
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Enable request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json") && req.body) {
      console.log(
        "Request body:",
        JSON.stringify(req.body, null, 2).substring(0, 500) + "..."
      );
    }
  }
  next();
});

// Add proxy for WatsonX backend - available in both prod and dev modes
app.use("/watsonx", async (req, res) => {
  try {
    const watsonxBackend =
      "http://somni-backend-somni.apps.68060d600b3f018ca424c0c6.eu1.techzone.ibm.com";

    // Log request details
    console.log(`Proxying WatsonX request: ${req.method} ${req.path}`);

    // Forward the request to the WatsonX backend
    const response = await axios({
      method: req.method,
      url: `${watsonxBackend}${req.path}`,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
        // Forward other necessary headers, but remove host to avoid conflicts
        ...Object.entries(req.headers)
          .filter(
            ([key]) => !["host", "connection"].includes(key.toLowerCase())
          )
          .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}),
      },
      responseType: "json",
    });

    // Send back the response
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error proxying WatsonX request:", error.message);

    // Forward error status and message if available
    if (error.response) {
      res.status(error.response.status).json({
        error: "Error from WatsonX backend",
        details: error.response.data,
      });
    } else {
      res.status(500).json({
        error: "Error connecting to WatsonX backend",
        message: error.message,
      });
    }
  }
});

// Proxy for map tiles - available in both prod and dev modes
app.get("/api/map-tiles/:z/:x/:y.png", async (req, res) => {
  try {
    const { z, x, y } = req.params;
    // Randomize the subdomain (a, b, c) to distribute load
    const subdomains = ["a", "b", "c"];
    const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];

    console.log(
      `Proxying map tile: ${z}/${x}/${y}.png from ${subdomain}.tile.openstreetmap.org`
    );

    // Get the tile from OpenStreetMap
    const response = await axios.get(
      `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
      { responseType: "arraybuffer" }
    );

    // Set appropriate headers
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    // Send the tile
    res.send(response.data);
  } catch (error) {
    console.error("Error proxying map tile:", error.message);
    res.status(500).send("Error loading map tile");
  }
});

// In-memory database for production mode
const inMemoryDB = {
  users: [],
  chats: {},
};

// Check if there's a local JSON file to initialize from
try {
  if (isProd && fs.existsSync(path.join(__dirname, "db-backup.json"))) {
    const dbBackup = JSON.parse(
      fs.readFileSync(path.join(__dirname, "db-backup.json"), "utf8")
    );
    if (dbBackup.users) inMemoryDB.users = dbBackup.users;
    if (dbBackup.chats) inMemoryDB.chats = dbBackup.chats;
    console.log("Loaded in-memory database from backup file");
  }
} catch (err) {
  console.error("Error loading database backup:", err);
}

// Save in-memory database periodically and on exit (in production)
if (isProd) {
  const saveDB = () => {
    try {
      fs.writeFileSync(
        path.join(__dirname, "db-backup.json"),
        JSON.stringify(inMemoryDB, null, 2)
      );
      console.log("Database backup saved");
    } catch (err) {
      console.error("Error saving database backup:", err);
    }
  };

  // Save every 5 minutes
  setInterval(saveDB, 5 * 60 * 1000);

  // Save on process exit
  process.on("SIGINT", () => {
    console.log("Saving database before exit...");
    saveDB();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Saving database before exit...");
    saveDB();
    process.exit(0);
  });
}

// JSON Server API simulation for production mode
if (isProd) {
  // GET /api/users - Get all users
  app.get("/api/users", (req, res) => {
    res.json(inMemoryDB.users);
  });

  // POST /api/users - Create a new user
  app.post("/api/users", (req, res) => {
    console.log("Creating new user:", req.body);
    const newUser = req.body;
    inMemoryDB.users.push(newUser);
    res.status(201).json(newUser);
    console.log(`Created new user: ${newUser.email}`);
  });

  // GET /api/chats - Get all chats
  app.get("/api/chats", (req, res) => {
    res.json(inMemoryDB.chats);
  });

  // PUT /api/chats - Update all chats
  app.put("/api/chats", (req, res) => {
    console.log("Updating chats database with PUT request");
    inMemoryDB.chats = req.body;
    res.json(inMemoryDB.chats);
    console.log("Updated chats database");
  });

  // PATCH /api/chats - Patch chats
  app.patch("/api/chats", (req, res) => {
    console.log("Patching chats database:", req.body);
    Object.assign(inMemoryDB.chats, req.body);
    res.json(inMemoryDB.chats);
    console.log("Patched chats database");
  });

  // Set Content Security Policy with more permissive settings for Angular
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "*.openstreetmap.org",
            "*.tile.openstreetmap.org",
          ],
          connectSrc: [
            "'self'",
            "*.openstreetmap.org",
            "*.tile.openstreetmap.org",
            // Allow connection to backend API
            "somni-backend-somni.apps.68060d600b3f018ca424c0c6.eu1.techzone.ibm.com",
          ],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"],
        },
      },
      // Disable other helmet features that might interfere with Angular
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    })
  );

  // Setup simple API status endpoint
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
      // Skip API and WatsonX requests
      if (req.path.startsWith("/api") || req.path.startsWith("/watsonx")) {
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
} else {
  // DEVELOPMENT MODE - Direct API handlers instead of proxy
  console.log("Setting up development environment with direct API handlers...");

  // Create and ensure the db.json file exists
  const dbPath = path.join(__dirname, "src", "assets", "database", "db.json");
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Read or create initial database
  let dbData = { users: [], chats: {} };

  if (fs.existsSync(dbPath)) {
    try {
      const fileContent = fs.readFileSync(dbPath, "utf8");
      dbData = JSON.parse(fileContent);
      console.log(`Loaded database from: ${dbPath}`);
    } catch (err) {
      console.error(`Error reading database file: ${err.message}`);
      console.log("Using empty database");
    }
  } else {
    console.log(`Creating initial database file: ${dbPath}`);
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");
  }

  // Function to save the database
  const saveDatabase = () => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");
      console.log("Database saved");
    } catch (err) {
      console.error(`Error saving database: ${err.message}`);
    }
  };

  // Direct API handlers for development

  // GET /api/users - Get all users
  app.get("/api/users", (req, res) => {
    console.log("Direct API: GET /api/users");
    res.json(dbData.users);
  });

  // POST /api/users - Create a new user
  app.post("/api/users", (req, res) => {
    console.log("Direct API: Creating new user:", req.body);
    const newUser = req.body;
    dbData.users.push(newUser);
    saveDatabase();
    res.status(201).json(newUser);
  });

  // GET /api/chats - Get all chats
  app.get("/api/chats", (req, res) => {
    console.log("Direct API: GET /api/chats");
    res.json(dbData.chats);
  });

  // PUT /api/chats - Update all chats
  app.put("/api/chats", (req, res) => {
    console.log("Direct API: Updating chats database with PUT request");
    dbData.chats = req.body;
    saveDatabase();
    res.json(dbData.chats);
  });

  // PATCH /api/chats - Patch chats
  app.patch("/api/chats", (req, res) => {
    console.log("Direct API: Patching chats database");
    Object.assign(dbData.chats, req.body);
    saveDatabase();
    res.json(dbData.chats);
  });

  // Start Angular development server
  const isWindows = process.platform === "win32";
  const ngCommand = isWindows
    ? path.join("node_modules", ".bin", "ng.cmd")
    : path.join("node_modules", ".bin", "ng");

  console.log("Starting Angular development server...");
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

  // Proxy all other requests to Angular
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:4200",
      changeOrigin: true,
      ws: true,
    })
  );

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("Shutting down servers...");
    saveDatabase();
    angularServer.kill();
    process.exit();
  });

  process.on("SIGTERM", () => {
    console.log("Shutting down servers...");
    saveDatabase();
    angularServer.kill();
    process.exit();
  });
}

// Start the main server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
