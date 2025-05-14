// debug.js
console.log("Starting debug script");

// Log environment information
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DEV_MODE:", process.env.DEV_MODE);
console.log("NPM_RUN:", process.env.NPM_RUN);
console.log("PATH:", process.env.PATH);

// Log working directory
console.log("Current directory:", process.cwd());

// Check for shell script
const fs = require("fs");
try {
  const fileExists = fs.existsSync("./start-both.sh");
  console.log("start-both.sh exists:", fileExists);

  if (fileExists) {
    const fileContent = fs.readFileSync("./start-both.sh", "utf8");
    console.log("start-both.sh content:");
    console.log(fileContent);

    // Check if executable
    try {
      const stats = fs.statSync("./start-both.sh");
      console.log(
        "start-both.sh is executable:",
        !!(stats.mode & fs.constants.X_OK)
      );
    } catch (err) {
      console.error("Error checking file permissions:", err);
    }
  }
} catch (err) {
  console.error("Error checking for start-both.sh:", err);
}

// Keep the script running
console.log("Debug script completed. Process will stay alive for 5 minutes.");
setTimeout(() => {
  console.log("Debug timeout complete.");
}, 300000); // 5 minutes
