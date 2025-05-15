const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const app = express();
const port = 8080;

// Simple mock API instead of json-server
app.use("/api", (req, res) => {
  res.json({ message: "API is working", status: "ok" });
});

// Serve Angular static files
app.use(express.static("dist/somni-frontend"));

// For all other routes, serve the Angular app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/somni-frontend/index.html"));
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
