---
name: single-html-standalone-inline-build
description: |
  Add a full standalone inline build target to an existing single-file static HTML project.
  Use when: (1) you already have a CDN build workflow, (2) need an additional fully offline
  build with all resources inlined, (3) want HTML/CSS compression and JavaScript obfuscation
  for minimal output size.
author: Claude Code
version: 1.0.0
date: 2026-03-28
---

# Single-File HTML Full Standalone Inline Build

## Problem

You have an existing single-file static HTML project with a development → CDN build workflow:

- Development uses local `node_modules` for offline coding
- CDN build replaces local paths with CDN URLs for small deployment size
- You need to add an additional build target that outputs **one single HTML file with all resources inlined**
- The inlined version must be fully usable offline, with compression and obfuscation for minimal size
- You cannot break the existing CDN build workflow

## Context / Trigger Conditions

- Single-file HTML application (all application code in one `.html` file)
- Already uses `node_modules` for development dependencies
- Already has a CDN build that replaces local references with CDN links
- Need to add a second build output for fully offline distribution (e.g., sharing to others who can't use CDN)
- Requirements: all resources inlined, compression, application code obfuscation, minimal size

## Solution

### 1. Add Dependencies and Script to `package.json`

Add three new dev dependencies for compression:

```json
"devDependencies": {
  "html-minifier-terser": "^7.2.0",
  "terser": "^5.36.0",
  "clean-css": "^5.3.3"
}
```

Add the new build script:

```json
"scripts": {
  "dev": "live-server --port=8080",
  "build": "node scripts/build.js",
  "build:standalone": "node scripts/build-standalone.js"
}
```

### 2. Create Standalone Build Script `scripts/build-standalone.js`

Follow this structure:

```javascript
const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const CleanCSS = require("clean-css");
const htmlMinifier = require("html-minifier-terser");

// Map: filename -> node_modules relative path
const resourceMap = {
  "dayjs.min.js": "node_modules/dayjs/dayjs.min.js",
  // ... add all your dependencies here
};

// Step 1: Pre-build validation - check all files exist
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
  validateResources();

  // Read source HTML
  const sourcePath = path.join(__dirname, "..", "index.html");
  let content = fs.readFileSync(sourcePath, "utf-8");

  // Step 2: Process each external resource
  for (const [filename, relPath] of Object.entries(resourceMap)) {
    const absPath = path.join(__dirname, "..", relPath);
    const resourceContent = fs.readFileSync(absPath, "utf-8");

    if (filename.endsWith(".js")) {
      // Library JS: compress but DO NOT obfuscate (mangle: false)
      // Libraries already compressed, obfuscation gives minimal size benefit but adds risk
      const result = await minify(resourceContent, {
        compress: true,
        mangle: false,
      });
      const minifiedJs = result.code;
      // Replace external script with inline script
      content = content.replace(
        new RegExp(`<script\\s+src="[^"]*${filename}"[^>]*></script>`),
        `<script>${minifiedJs}</script>`,
      );
    } else if (filename.endsWith(".css")) {
      // CSS: compress
      const result = new CleanCSS().minify(resourceContent);
      const minifiedCss = result.styles;
      // Replace link with inline style
      content = content.replace(
        new RegExp(`<link[^>]*href="[^"]*${filename}"[^>]*>`),
        `<style>${minifiedCss}</style>`,
      );
    }
  }

  // Step 3: Process inline application JavaScript (last script tag)
  // Only this gets obfuscated (mangle: true)
  const scriptMatches = content.match(/<script>([\s\S]*?)<\/script>/g);
  if (scriptMatches && scriptMatches.length > 0) {
    const lastScript = scriptMatches[scriptMatches.length - 1];
    const codeMatch = lastScript.match(/<script>([\s\S]*?)<\/script>/);
    if (codeMatch) {
      const appCode = codeMatch[1];
      const result = await minify(appCode, {
        compress: true,
        mangle: true, // Application code: obfuscate for smaller size
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

  // Step 4: Final HTML compression
  // Disable JS/CSS minification because already processed
  const minifiedHtml = await htmlMinifier.minify(content, {
    removeComments: true,
    collapseWhitespace: true,
    minifyJS: false,
    minifyCSS: false,
  });

  // Step 5: Ensure output directory exists
  const outputDir = path.join(__dirname, "..", "dist", "standalone");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  const outputPath = path.join(outputDir, "index.html");
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
```

### 3. Key Best Practices (Non-obvious)

1. **Selective Obfuscation**:
   - ❌ **Don't obfuscate third-party libraries**: They are already distributed in compressed form, obfuscation gives ~1-2% size reduction but can break the library if it relies on specific variable names
   - ✅ **Only obfuscate your application code**: This gives meaningful size reduction and doesn't risk breaking anything

2. **Correct Compression Order**:
   - 1. Compress each JS/CSS resource individually
   - 2. Inline the compressed resources into HTML
   - 3. Compress the final HTML, **disable** JS/CSS compression in HTML minifier (already done)
   - This avoids double-processing issues and potential escaping/parsing problems

3. **Pre-build Validation**:
   - Check that all `node_modules` files exist before starting build
   - If any are missing, give clear error message telling user to run `npm install`
   - This is much more user-friendly than a cryptic "file not found" stack trace

4. **Keep Existing Workflow**:
   - Add as a separate build target, don't modify the existing CDN build
   - Output to a separate directory (`dist/standalone/`) to avoid overwriting
   - This gives users both options: small CDN deployment and full offline distribution

### 4. Update Documentation

Add to your project's README/CLAUDE.md:

````
**独立全资源构建**:

```bash
npm run build:standalone
````

输出到 `dist/standalone/index.html`，所有资源已内联，可完全离线运行。

```

## Verification

After implementation:

1. **Install dependencies**: `npm install` completes without errors
2. **Run build**: `npm run build:standalone` completes successfully with success message
3. **Output exists**: `dist/standalone/index.html` is created
4. **Open in browser**: Disconnect network, open the file - everything works correctly
5. **Existing build still works**: `npm run build` still outputs the CDN version correctly
6. **Size is smaller**: Output is smaller than the sum of source HTML plus all raw dependencies

## Example

This skill was extracted from the `kid-math` project (arithmetic practice app for kids):

- **Before**: Only CDN build output `dist/kid-math.html` (17KB) requiring network
- **After**:
  - CDN build unchanged at `dist/kid-math.html` (17KB)
  - New standalone build outputs `dist/standalone/kid-math.html` (2.9MB) fully offline
  - 2.9MB includes all of Vue, Arco Design Vue, ECharts, dayjs, animate.css inlined

All functionality works correctly in both builds.

## Notes

- Output size depends on your dependencies - if you include a large UI library like Arco Design, expect output around 2-3MB, which is still acceptable for offline distribution
- If you want a debug build without obfuscation, you can add a second script `build:standalone-debug` with `mangle: false` for application code
- This pattern intentionally keeps things simple - uses vanilla Node.js with three small compression libraries, no complex webpack configuration needed

## References

- [html-minifier-terser Documentation](https://github.com/terser/html-minifier-terser)
- [terser Documentation](https://github.com/terser/terser)
- [clean-css Documentation](https://github.com/clean-css/clean-css)
- Extracted from the [kid-math](https://github.com/josephlei/kid-math) project where this pattern was first used
```
