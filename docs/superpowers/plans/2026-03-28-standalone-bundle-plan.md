# 全资源独立构建功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `npm run build:standalone` 构建命令，输出所有资源内联的单文件HTML，支持完全离线运行，并对HTML/CSS/JS进行压缩和应用代码混淆。

**Architecture:** 遵循现有项目简单架构，新增独立构建脚本 `scripts/build-standalone.js`，复用现有文件名匹配模式。从 `node_modules` 读取依赖文件，逐个压缩后内联到HTML，最终输出到 `dist/standalone/kid-math.html`。只对应用代码进行混淆，第三方库只压缩不混淆，平衡体积和稳定性。

**Tech Stack:** Node.js, html-minifier-terser (HTML压缩), terser (JS压缩混淆), clean-css (CSS压缩)

---

## 文件修改总览

| 文件                          | 操作 | 说明                                                   |
| ----------------------------- | ---- | ------------------------------------------------------ |
| `package.json`                | 修改 | 新增 `build:standalone` 脚本，新增三个 devDependencies |
| `scripts/build-standalone.js` | 新建 | 独立构建脚本，实现完整流程                             |
| `CLAUDE.md`                   | 修改 | 更新文档，新增构建命令说明                             |

---

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add three new devDependencies to package.json**

```json
"devDependencies": {
  "live-server": "^1.2.2",
  "html-minifier-terser": "^7.2.0",
  "terser": "^5.36.0",
  "clean-css": "^5.3.3"
}
```

- [ ] **Step 2: Add build:standalone script**

```json
"scripts": {
  "dev": "live-server --port=8080",
  "build": "node scripts/build.js",
  "build:standalone": "node scripts/build-standalone.js"
}
```

- [ ] **Step 3: Commit changes**

```bash
git add package.json
git commit -m "chore: add dev dependencies for standalone build"
```

---

### Task 2: Create Standalone Build Script

**Files:**

- Create: `scripts/build-standalone.js`

- [ ] **Step 1: Require modules and define configuration**

```javascript
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
```

- [ ] **Step 2: Add pre-build validation function**

```javascript
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
```

- [ ] **Step 3: Main build function - read and process resources**

```javascript
try {
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
        `<script>${minifiedJs}</script>`
      );
    } else if (filename.endsWith(".css")) {
      // CSS - compress
      const result = new CleanCSS().minify(resourceContent);
      const minifiedCss = result.styles;
      // Replace link with inline style
      content = content.replace(
        new RegExp(`<link[^>]*href="[^"]*${filename}"[^>]*>`),
        `<style>${minifiedCss}</style>`
      );
    }
  }
```

- [ ] **Step 4: Process inline application JavaScript (compress + obfuscate)**

```javascript
// Now process the inline application script (the last script tag)
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
```

- [ ] **Step 5: Compress final HTML and write output**

```javascript
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
  console.log("This file contains all resources inlined and can run fully offline.");
} catch (error) {
  console.error("Standalone build failed:");
  console.error(error.message);
  process.exit(1);
}
```

- [ ] **Step 6: Commit**

```bash
git add scripts/build-standalone.js
git commit -m "feat: add standalone build script with inlining and compression"
```

---

### Task 3: Update Project Documentation

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Add build:standalone command to Commands section**

Find the Commands section in `CLAUDE.md` and add:

````
**独立全资源构建**:

```bash
npm run build:standalone
````

输出到 `dist/standalone/kid-math.html`，所有资源已内联，可完全离线运行。

````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with build:standalone command"
````

---

### Task 4: Test the Build

**Files:**

- Test: run build command manually

- [ ] **Step 1: Install new npm dependencies**

```bash
npm install
```

- [ ] **Step 2: Run standalone build**

```bash
npm run build:standalone
```

Expected output:

```
Standalone build completed successfully!
Output: .../dist/standalone/kid-math.html
This file contains all resources inlined and can run fully offline.
```

- [ ] **Step 3: Verify output file exists**

Check that `dist/standalone/kid-math.html` is created and has reasonable size (~500KB-800KB).

- [ ] **Step 4: Open the output file in browser and verify functionality**

- Verify page loads correctly with no console errors
- Verify question generation works
- Verify answer submission works
- Verify history is saved to localStorage

- [ ] **Step 5: Verify existing CDN build still works**

```bash
npm run build
```

Confirm it still outputs `dist/kid-math.html` with CDN links correctly.

---
