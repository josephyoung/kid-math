const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const CleanCSS = require("clean-css");
const htmlMinifier = require("html-minifier-terser");

// Map: filename -> node_modules relative path
const resourceMap = {
  "dayjs.min.js": "node_modules/dayjs/dayjs.min.js",
  "duration.js": "node_modules/dayjs/plugin/duration.js",
  "vue.global.prod.js": "node_modules/vue/dist/vue.global.prod.js",
  "echarts.min.js": "node_modules/echarts/dist/echarts.min.js",
  "arco-vue.min.js": "node_modules/@arco-design/web-vue/dist/arco-vue.min.js",
  "arco-vue-icon.min.js":
    "node_modules/@arco-design/web-vue/dist/arco-vue-icon.min.js",
  "arco.css": "node_modules/@arco-design/web-vue/dist/arco.css",
  "animate.min.css": "node_modules/animate.css/animate.min.css",
};

// Pre-build validation: check all files exist
function validateResources() {
  const missing = [];
  for (const [filename, relPath] of Object.entries(resourceMap)) {
    const absPath = path.join(__dirname, "..", relPath);
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
    }
  }
  if (missing.length > 0) {
    console.error("Error: The following dependency files are missing:");
    missing.forEach((file) => console.error(`  - ${file}`));
    console.error("");
    console.error(
      "Please run 'npm install' to install all dependencies and try again.",
    );
    process.exit(1);
  }
}

async function build() {
  // Pre-build validation
  validateResources();

  // Read source HTML
  const sourcePath = path.join(__dirname, "..", "index.html");
  let content = fs.readFileSync(sourcePath, "utf-8");

  // Process each external resource
  for (const [filename, relPath] of Object.entries(resourceMap)) {
    const absPath = path.join(__dirname, "..", relPath);
    const resourceContent = fs.readFileSync(absPath, "utf-8");

    if (filename.endsWith(".js")) {
      // JavaScript - compress (library code, don't obfuscate)
      const result = await minify(resourceContent, {
        compress: true,
        mangle: false, // Library code: no obfuscation
      });
      const minifiedJs = result.code;
      // Replace external script with inline script
      // The regex matches any path before filename (node_modules/xxx/filename)
      content = content.replace(
        new RegExp(`<script\\s+src="[^"]*${filename}"[^>]*></script>`),
        `<script>${minifiedJs}</script>`,
      );
    } else if (filename.endsWith(".css")) {
      // CSS - compress
      const result = new CleanCSS().minify(resourceContent);
      const minifiedCss = result.styles;
      // Replace link with inline style
      content = content.replace(
        new RegExp(`<link[^>]*href="[^"]*${filename}"[^>]*>`),
        `<style>${minifiedCss}</style>`,
      );
    }
  }

  // Now process the inline application JavaScript (the last script tag)
  // Use regex to capture the content of the last <script> tag
  const scriptMatches = content.match(/<script>([\s\S]*?)<\/script>/g);
  if (scriptMatches && scriptMatches.length > 0) {
    // The last script tag contains the application code
    const lastScript = scriptMatches[scriptMatches.length - 1];
    const codeMatch = lastScript.match(/<script>([\s\S]*?)<\/script>/);
    if (codeMatch) {
      const appCode = codeMatch[1];
      // Compress AND obfuscate the application code
      const result = await minify(appCode, {
        compress: true,
        mangle: true, // Application code: obfuscate variable names
      });
      if (result.code) {
        const minifiedAppCode = result.code;
        content = content.replace(
          /<script>[\s\S]*?<\/script>$/,
          `<script>${minifiedAppCode}</script>`,
        );
      }
    }
  }

  // Minify the final HTML
  const minifiedHtml = await htmlMinifier.minify(content, {
    removeComments: true,
    collapseWhitespace: true,
    minifyJS: false, // Already processed
    minifyCSS: false, // Already processed
  });

  // Ensure output directory exists
  const outputDir = path.join(__dirname, "..", "dist", "standalone");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  const outputPath = path.join(outputDir, "kid-math.html");
  fs.writeFileSync(outputPath, minifiedHtml);

  console.log("Standalone build completed successfully!");
  console.log(`Output: ${outputPath}`);
  console.log(
    "This file contains all resources inlined and can run fully offline.",
  );
}

try {
  build();
} catch (error) {
  console.error("Standalone build failed:");
  console.error(error.message);
  process.exit(1);
}
