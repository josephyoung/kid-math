# 本地资源开发 CDN 构建重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构项目，开发时 `index.html` 使用本地保存的资源文件实现离线开发，构建时自动替换为 CDN 链接用于部署。

**Architecture:**

- `index.html` 开发版本默认引用本地的 `.js`/`.css` 文件，支持完全离线开发
- 新增 Node.js 构建脚本，在构建时将本地引用批量替换为 CDN URL
- 构建产物输出到 `dist/kid-math.html` 保持与原项目一致的输出

**Tech Stack:**

- 原项目: 静态 HTML + Vue 3 (CDN 方式引入)
- 构建脚本: 原生 Node.js (无需额外依赖)
- 替换策略: 基于字符串替换，简单可靠

---

## 文件变更

| 文件               | 操作 | 说明                                                   |
| ------------------ | ---- | ------------------------------------------------------ |
| `index.html`       | 修改 | 将 CDN 引用改为本地文件引用                            |
| `scripts/build.js` | 新建 | 构建脚本，读取 index.html 并替换为 CDN 链接输出到 dist |
| `package.json`     | 修改 | 更新 build 命令，从直接 `cp` 改为运行构建脚本          |

---

## 任务分解

### Task 1: 修改 index.html 使用本地资源引用

**Files:**

- Modify: `index.html:8-28`

- [ ] **Step 1: 删除所有 CDN 引用，改用本地引用**

替换 `index.html` `<head>` 部分:

删除当前 15-28 行的 CDN 链接，将 8-14 行的注释去掉，改为:

```html
<script src="dayjs.min.js"></script>
<script src="duration.js"></script>
<script src="vue.global.prod.js"></script>
<script src="echarts.min.js"></script>
<script src="arco-vue.min.js"></script>
<script src="arco-vue-icon.min.js"></script>
<link rel="stylesheet" href="arco.css" />
<link rel="stylesheet" href="animate.min.css" />
```

- [ ] **Step 2: 验证修改后格式正确**

检查标签闭合和引号正确

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: index.html use local resource references for development"
```

### Task 2: 创建构建脚本 scripts/build.js

**Files:**

- Create: `scripts/build.js`

- [ ] **Step 1: 创建 scripts 目录**

```bash
mkdir -p scripts
```

- [ ] **Step 2: 编写构建脚本**

脚本内容:

```javascript
const fs = require("fs");
const path = require("path");

// 本地文件到 CDN 的映射
const replacementMap = {
  "dayjs.min.js": "https://unpkg.com/dayjs/dayjs.min.js",
  "duration.js": "https://unpkg.com/dayjs/plugin/duration.js",
  "vue.global.prod.js": "https://unpkg.com/vue@3/dist/vue.global.prod.js",
  "echarts.min.js": "https://unpkg.com/echarts@5.4.0/dist/echarts.min.js",
  "arco-vue.min.js":
    "https://unpkg.com/@arco-design/web-vue@latest/dist/arco-vue.min.js",
  "arco-vue-icon.min.js":
    "https://unpkg.com/@arco-design/web-vue@latest/dist/arco-vue-icon.min.js",
  "arco.css": "https://unpkg.com/@arco-design/web-vue@latest/dist/arco.css",
  "animate.min.css":
    "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
};

// 读取源文件
const sourcePath = path.join(__dirname, "..", "index.html");
const content = fs.readFileSync(sourcePath, "utf-8");

// 替换所有本地引用为 CDN
let result = content;
Object.entries(replacementMap).forEach(([local, cdn]) => {
  result = result.replace(new RegExp(`src="${local}"`, "g"), `src="${cdn}"`);
  result = result.replace(new RegExp(`href="${local}"`, "g"), `href="${cdn}"`);
});

// 确保 dist 目录存在
const distDir = path.join(__dirname, "..", "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 写入构建产物
const outputPath = path.join(distDir, "kid-math.html");
fs.writeFileSync(outputPath, result);

console.log("Build completed successfully!");
console.log(`Output: ${outputPath}`);
```

- [ ] **Step 3: 验证脚本语法正确**

```bash
node scripts/build.js
```

Expected: 输出 "Build completed successfully!" 并在 `dist/kid-math.html` 生成正确内容

- [ ] **Step 4: Commit**

```bash
git add scripts/build.js
git commit -m "feat: add build script that replaces local references with CDN URLs"
```

### Task 3: 更新 package.json build 命令

**Files:**

- Modify: `package.json:3-5`

- [ ] **Step 1: 修改 build 脚本**

将:

```json
  "scripts": {
    "dev": "live-server --port=8080",
    "build": "cp index.html dist/kid-math.html"
  }
```

改为:

```json
  "scripts": {
    "dev": "live-server --port=8080",
    "build": "node scripts/build.js"
  }
```

- [ ] **Step 2: 测试运行构建命令**

```bash
npm run build
```

Expected: 输出构建成功，`dist/kid-math.html` 中所有引用都是 CDN 链接

- [ ] **Step 3: 验证产物正确**

检查 `dist/kid-math.html` 中所有资源链接都已正确替换为 CDN

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: update build command to use replacement script"
```

### Task 4: 更新 CLAUDE.md 文档

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 Commands 部分**

在 Architecture 或 Commands 中说明新的开发/构建流程

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect new build process"
```

---

## 验收标准

1. ✅ 开发: `npm run dev` 启动后使用本地资源，完全离线可用
2. ✅ 构建: `npm run build` 成功执行，输出 `dist/kid-math.html`
3. ✅ 产物: `dist/kid-math.html` 中所有资源引用都替换为 CDN 链接
4. ✅ 功能正常: 开发版和构建版功能都能正常运行
