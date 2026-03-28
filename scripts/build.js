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

try {
  // 读取源文件
  const sourcePath = path.join(__dirname, "..", "index.html");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const content = fs.readFileSync(sourcePath, "utf-8");

  // 替换所有本地引用为 CDN
  let result = content;
  Object.entries(replacementMap).forEach(([local, cdn]) => {
    result = result.replace(new RegExp(`src="${local}"`, "g"), `src="${cdn}"`);
    result = result.replace(
      new RegExp(`href="${local}"`, "g"),
      `href="${cdn}"`,
    );
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
} catch (error) {
  console.error("Build failed:");
  console.error(error.message);
  process.exit(1);
}
