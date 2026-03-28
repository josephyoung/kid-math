---
name: static-html-local-dev-cdn-build
description: |
  Workflow for single-file static HTML projects: development uses local resource files for offline work, build automatically replaces with CDN links for deployment. Use when: (1) creating simple static HTML/Vue projects without build tools, (2) want offline development experience, (3) deployment needs CDN links to keep deployment size small. Includes best practice for locking versions to guarantee consistency between local and CDN. Supports two variants: (1) root-level file copies, (2) npm-managed dependencies in node_modules.
author: Claude Code
version: 1.2.0
date: 2026-03-28
---

# Static HTML Local Development + CDN Build Workflow

## Problem

You have a single-file static HTML project (like a simple Vue app without a build step). You want:

- **Development**: Work offline with local resource files cached on disk
- **Deployment**: Deploy a version that uses CDN links to keep the deployed file size small and leverage CDN caching
- Avoid manually commenting/uncommenting links when switching between dev and deployment

## Context / Trigger Conditions

- Single-file HTML application (all code in one HTML file)
- Uses external libraries loaded via CDN in production
- All library files already downloaded to project root for offline development
- No complex build system like Webpack/Vite needed
- Want the simplicity of static HTML with the convenience of automatic CDN replacement

## Solution

### 1. Project Structure

```
project/
├── index.html              # Development version - uses local resources
├── package.json            # Contains build script
├── scripts/
│   └── build.js            # Build script replaces local with CDN
├── dist/
│   └── kid-math.html       # Build output - uses CDN links (ready for deployment)
├── *.js                    # Local copies of libraries (dayjs, vue, etc.)
└── *.css                   # Local copies of library CSS
```

### 2. Development Setup (`index.html`)

In the HTML `<head>`, use direct local file references:

```html
<!-- Development: local resources -->
<script src="dayjs.min.js"></script>
<script src="duration.js"></script>
<script src="vue.global.prod.js"></script>
<script src="echarts.min.js"></script>
<script src="arco-vue.min.js"></script>
<script src="arco-vue-icon.min.js"></script>
<link rel="stylesheet" href="arco.css" />
<link rel="stylesheet" href="animate.min.css" />
```

### 3. Create Build Script (`scripts/build.js`)

Use a simple Node.js script to replace local references with CDN URLs:

```javascript
const fs = require("fs");
const path = require("path");

// Map: local filename → CDN URL (all versions locked for consistency)
const replacementMap = {
  "dayjs.min.js": "https://unpkg.com/dayjs@1.11.20/dayjs.min.js",
  "duration.js": "https://unpkg.com/dayjs@1.11.20/plugin/duration.js",
  "vue.global.prod.js": "https://unpkg.com/vue@3.5.31/dist/vue.global.prod.js",
  "echarts.min.js": "https://unpkg.com/echarts@5.4.0/dist/echarts.min.js",
  "arco-vue.min.js":
    "https://unpkg.com/@arco-design/web-vue@2.57.0/dist/arco-vue.min.js",
  "arco-vue-icon.min.js":
    "https://unpkg.com/@arco-design/web-vue@2.57.0/dist/arco-vue-icon.min.js",
  "arco.css": "https://unpkg.com/@arco-design/web-vue@2.57.0/dist/arco.css",
  "animate.min.css":
    "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
};

try {
  // Read source HTML (development version)
  const sourcePath = path.join(__dirname, "..", "index.html");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const content = fs.readFileSync(sourcePath, "utf-8");

  // Replace all local references with CDN
  // Allow any path before filename works for both root and node_modules layouts
  let result = content;
  Object.entries(replacementMap).forEach(([local, cdn]) => {
    result = result.replace(
      new RegExp(`src="[^"]*${local}"`, "g"),
      `src="${cdn}"`,
    );
    result = result.replace(
      new RegExp(`href="[^"]*${local}"`, "g"),
      `href="${cdn}"`,
    );
  });

  // Ensure dist directory exists
  const distDir = path.join(__dirname, "..", "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write output
  const outputPath = path.join(distDir, "kid-math.html");
  fs.writeFileSync(outputPath, result);

  console.log("Build completed successfully!");
  console.log(`Output: ${outputPath}`);
} catch (error) {
  console.error("Build failed:");
  console.error(error.message);
  process.exit(1);
}
```

### 4. Update `package.json`

```json
{
  "scripts": {
    "dev": "live-server --port=8080",
    "build": "node scripts/build.js"
  },
  "devDependencies": {
    "live-server": "^1.2.2"
  }
}
```

### 5. Update Documentation (`CLAUDE.md`)

Document the workflow in project README/CLAUDE.md:

```markdown
## Workflow

**Development**:

- `index.html` uses local resource references
- All library files are checked into the repo
- `npm run dev` works fully offline

**Build for Deployment**:

- `npm run build` runs the replacement script
- Outputs `dist/kid-math.html` with all CDN links
- Deploy the `dist/` directory
```

## Verification

1. **Development check**: Open `index.html` directly or run `npm run dev` while offline - should load correctly with all resources from local files
2. **Build check**: Run `npm run build` - should complete successfully with "Build completed successfully!"
3. **Output check**: Open `dist/kid-math.html` and inspect source - all resource references should be CDN URLs, no local `src="*.js"` or `href="*.css"` remain

## Example (this project)

- Input: `index.html` with 8 local resource references
- Output: `dist/kid-math.html` with all 8 references replaced with corresponding CDN URLs
- No manual edits needed after initial setup - just run `npm run build` before deployment

## Best Practice: Lock Exact Versions

To guarantee that the CDN version always matches the local file version you've tested, **always lock to an exact semantic version** (`MAJOR.MINOR.PATCH`):

❌ **Bad - can drift apart**:

```javascript
"arco-vue.min.js": "https://unpkg.com/@arco-design/web-vue@latest/dist/arco-vue.min.js",
"vue.global.prod.js": "https://unpkg.com/vue@3/dist/vue.global.prod.js",
"dayjs.min.js": "https://unpkg.com/dayjs/dayjs.min.js",
```

✅ **Good - guaranteed consistent**:

```javascript
"arco-vue.min.js": "https://unpkg.com/@arco-design/web-vue@2.57.0/dist/arco-vue.min.js",
"vue.global.prod.js": "https://unpkg.com/vue@3.5.31/dist/vue.global.prod.js",
"dayjs.min.js": "https://unpkg.com/dayjs@1.11.20/dayjs.min.js",
```

When you update the local copy of a library, remember to also update the version number in the CDN URL. This ensures:

- Local development and deployed production always use the same version
- No unexpected upgrades break your application
- Reproducible builds

How to get the current version:

```bash
# Check latest version from npm
npm view <package> version
```

## Variant: npm-Managed Dependencies

If you prefer to keep your project root clean and manage dependencies via npm instead of checking library files into git, use this variant:

### Project Structure (npm variant)

```
project/
├── index.html              # Development version - references node_modules
├── package.json            # Contains build script + dependencies
├── scripts/
│   └── build.js            # Build script replaces local with CDN
├── dist/
│   └── output.html         # Build output - uses CDN links (ready for deployment)
└── node_modules/           # Dependencies installed via npm (gitignored)
```

### Setup (npm variant)

1. **Install dependencies via npm** with exact versions:

```bash
npm install --save-exact vue@3.5.31 dayjs@1.11.20 echarts@5.4.0 ...
```

2. **Reference from node_modules** in `index.html`:

```html
<!-- Development: from node_modules -->
<script src="node_modules/vue/dist/vue.global.prod.js"></script>
<script src="node_modules/dayjs/dayjs.min.js"></script>
<link rel="stylesheet" href="node_modules/animate.css/animate.min.css" />
```

3. **Build script** - the same regex `src="[^"]*${local}"` works for both layouts because it matches any path before the filename. No changes needed to the replacement map.

### Benefits of npm variant:

- ✅ Project root stays clean, no large library files checked into git
- ✅ Dependencies are explicitly listed in `package.json`
- ✅ Easy to upgrade versions with `npm update`
- ✅ Still fully offline after `npm install`
- ✅ Same build output - CDN links for deployment

### Tradeoffs:

- Requires running `npm install` after cloning
- `node_modules` is still large (but gitignored)

## Notes

- This pattern is intentionally simple - uses vanilla Node.js with no extra dependencies
- Add/remove entries from `replacementMap` as needed for your specific libraries
- The regex replacement handles both `src` for scripts and `href` for stylesheets
- Error handling included for missing source files
- Keep the output `dist/` directory checked into git if you deploy directly from there; add `dist/` to `.gitignore` if your CI builds it

## References

- This pattern was extracted from the `kid-math` project (github.com/josephlei/kid-math)
- Inspired by the need for simple offline development without complex build tools
