const fs = require("fs");
const path = require("path");

// Directory containing the HTML files - UPDATED FOR YOUR PROJECT
const sourceDir = "public/assets/mule_analysis_output";
// Directory where modified files will be saved (same as source in this case)
const destDir = "public/assets/mule_analysis_output";
// Directory where vendor scripts will be saved
const vendorDir = "public/assets/vendor";

// Create vendor directory if it doesn't exist
if (!fs.existsSync(vendorDir)) {
  fs.mkdirSync(vendorDir, { recursive: true });
}

// Create font-awesome directory structure if needed
const fontAwesomeDir = path.join(vendorDir, "font-awesome", "css");
if (!fs.existsSync(fontAwesomeDir)) {
  fs.mkdirSync(fontAwesomeDir, { recursive: true });
}

// Download the required libraries if they don't exist
const plotlyPath = path.join(vendorDir, "plotly.min.js");
if (!fs.existsSync(plotlyPath)) {
  console.log("Downloading Plotly...");
  // Use curl or wget to download, or you can manually download and copy the file
  const { execSync } = require("child_process");
  execSync(`curl -L https://cdn.plot.ly/plotly-2.28.0.min.js -o ${plotlyPath}`);
}

const fontAwesomePath = path.join(fontAwesomeDir, "all.min.css");
if (!fs.existsSync(fontAwesomePath)) {
  console.log("Downloading Font Awesome...");
  const { execSync } = require("child_process");
  execSync(
    `curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css -o ${fontAwesomePath}`
  );
}

// Process all HTML files in the source directory
fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.error("Error reading source directory:", err);
    return;
  }

  files
    .filter((file) => path.extname(file).toLowerCase() === ".html")
    .forEach((file) => {
      const filePath = path.join(sourceDir, file);

      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error(`Error reading file ${file}:`, err);
          return;
        }

        // Replace external Plotly script references with local versions
        let modifiedHtml = data.replace(
          /<script[^>]*src=["']https?:\/\/cdn\.plot\.ly\/plotly[^"']*\.min\.js["'][^>]*><\/script>/g,
          '<script src="/assets/vendor/plotly.min.js"></script>'
        );

        // Replace any other external script references that might be causing issues
        modifiedHtml = modifiedHtml.replace(
          /<script[^>]*src=["']https?:\/\/cdnjs\.cloudflare\.com[^"']*["'][^>]*><\/script>/g,
          (match) => {
            // Extract the specific library being imported
            const fontAwesomeMatch = match.match(/font-awesome/i);
            if (fontAwesomeMatch) {
              return '<link rel="stylesheet" href="/assets/vendor/font-awesome/css/all.min.css">';
            }

            // Handle other common libraries
            const jqueryMatch = match.match(/jquery/i);
            if (jqueryMatch) {
              return '<script src="/assets/vendor/jquery.min.js"></script>';
            }

            // If we can't identify the library, return an empty string or a comment
            return "<!-- External script removed for security -->";
          }
        );

        // Add a Plotly backup fallback at the beginning of the body
        const bodyStartPos = modifiedHtml.indexOf("<body");
        if (bodyStartPos !== -1) {
          const bodyTagEndPos = modifiedHtml.indexOf(">", bodyStartPos);
          if (bodyTagEndPos !== -1) {
            const beforeBody = modifiedHtml.substring(0, bodyTagEndPos + 1);
            const afterBody = modifiedHtml.substring(bodyTagEndPos + 1);

            modifiedHtml =
              beforeBody +
              `
            <script>
              // Create Plotly fallback if the script didn't load
              window.Plotly = window.Plotly || {
                newPlot: function() { console.warn('Plotly not loaded properly - visualization may not display correctly'); },
                react: function() { console.warn('Plotly not loaded properly - visualization may not display correctly'); },
                relayout: function() { console.warn('Plotly not loaded properly - visualization may not display correctly'); }
              };
            </script>
          ` +
              afterBody;
          }
        }

        // Write the modified content to the destination file
        const destPath = path.join(destDir, file);
        fs.writeFile(destPath, modifiedHtml, "utf8", (err) => {
          if (err) {
            console.error(`Error writing to file ${file}:`, err);
            return;
          }
          console.log(`Successfully processed ${file}`);
        });
      });
    });
});
