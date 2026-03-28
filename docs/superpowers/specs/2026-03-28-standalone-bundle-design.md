# 全资源独立构建功能设计

## 概述

新增一个独立的构建目标 `npm run build:standalone`，输出将所有依赖内联到单个HTML文件，支持完全离线本地运行，并对HTML/CSS/JS进行压缩和代码混淆，使构建产物体积尽可能小。

**背景**：现有构建流程输出CDN版本，需要网络才能运行；新增独立构建版本用于分享给他人完全离线使用。

## 需求

### 必须满足

- [x] 新增独立构建命令，不影响现有的 `npm run build`（CDN版本）
- [x] 所有JS/CSS资源内联到单个HTML文件
- [x] 输出产物可以完全离线运行，不依赖任何外部CDN或网络
- [x] 对HTML、CSS、JS进行压缩
- [x] JS代码变量名混淆，减小体积
- [x] 输出到 `dist/standalone/kid-math.html`

### 不改变原有行为

- [x] `npm run dev` 开发流程保持不变，仍使用 `node_modules` 本地开发
- [x] `npm run build` 仍然输出CDN版本到 `dist/kid-math.html`

## 架构设计

### 整体流程

```
1. 预构建验证：检查所有依赖文件在 node_modules 中都存在
   - 如果文件缺失，提示用户运行 `npm install` 后重试
2. 读取 index.html (开发版本，引用 node_modules)
3. 解析 HTML 中所有 <script src="node_modules/..."> 和 <link href="node_modules/...">
4. 从 node_modules 读取对应文件的内容
5. 对提取出的资源分别压缩：
   - JS库：压缩但不混淆（库代码本身已经压缩，混淆收益小且有风险）
   - 应用JS代码：压缩+变量名混淆
   - CSS：压缩
6. 将压缩后的资源内联替换到HTML中（删除src/href，内容放标签内）
7. 最后对整个HTML文档进行压缩（禁用JS/CSS重复压缩）
8. 确保输出目录 dist/standalone/ 存在
9. 写入最终结果到 dist/standalone/kid-math.html
```

### 依赖工具

新增三个开发依赖：

| 包                     | 作用                            |
| ---------------------- | ------------------------------- |
| `html-minifier-terser` | 压缩HTML，去除空白字符、注释等  |
| `terser`               | 压缩JavaScript，进行变量名混淆  |
| `clean-css`            | 压缩CSS，去除空白、合并选择器等 |

都是成熟的轻量级工具，满足需求。

### 文件修改

| 文件                          | 修改类型 | 说明                                                  |
| ----------------------------- | -------- | ----------------------------------------------------- |
| `package.json`                | 修改     | 新增 `build:standalone` 脚本，新增三个devDependencies |
| `scripts/build-standalone.js` | 新建     | 独立构建脚本，实现上述流程                            |
| `CLAUDE.md`                   | 修改     | 更新项目文档，新增构建命令说明                        |
| `.gitignore`                  | 检查     | `dist/` 已忽略，不需要改                              |

### 关键实现细节

1. **资源路径映射**：
   - 遵循现有 `build.js` 的模式：维护一个映射表，key 是文件名，value 是 `node_modules` 中的完整相对路径
   - 使用正则匹配 `src="..."` 中的文件名，兼容任意路径前缀，与现有构建逻辑保持一致
   - 构建前验证所有文件存在，任何文件不存在时报错并提示运行 `npm install`

2. **内联替换策略**：
   - 对于 `<script src="...">`：删除 `src` 属性，将压缩后的文件内容放到标签内部
   - 对于 `<link rel="stylesheet">`：删除 `href` 属性，改成 `<style>` 标签放入压缩后的内容

3. **压缩顺序**（避免重复处理和转义问题）：
   1. 先逐个读取并压缩各个资源
   2. 将压缩后的资源内联替换到HTML中
   3. 最后用 `html-minifier-terser` 压缩整个HTML文档，**禁用**它的JS/CSS压缩（已经处理过了）

4. **混淆范围**：
   - **仅对应用代码（自定义JS）进行混淆**：库代码已经是发布版本，本身已压缩，混淆收益极小，可能引入问题
   - 对所有内联的应用代码进行压缩和变量名混淆，达到最小体积

5. **错误处理**：
   - 预检查阶段验证所有依赖文件存在
   - 任何文件缺失时，输出清晰错误信息，提示用户运行 `npm install` 安装依赖
   - 捕获所有异常，输出有用的错误信息

6. **版本一致性保证**：
   - 从 `node_modules` 读取的依赖版本与 `package.json` 中锁定的版本一致
   - 保证开发测试使用的版本和独立构建输出的版本完全相同

## 输出产物示例

最终 `dist/standalone/kid-math.html` 结构：

```html
<!DOCTYPE html>
<html lang="zh-cn">
  <head>
    <meta charset="UTF-8" />
    ...
    <!-- 所有元数据 -->
    <title>算术练习</title>
    <script>
      /* 压缩混淆后的 dayjs 代码 */
    </script>
    <script>
      /* 压缩混淆后的 Vue 代码 */
    </script>
    <script>
      /* 压缩混淆后的 ECharts 代码 */
    </script>
    <script>
      /* 压缩混淆后的 Arco Vue 代码 */
    </script>
    <style>
      /* 压缩后的 Arco CSS */
    </style>
    <style>
      /* 压缩后的 Animate.css */
    </style>
    <style>
      /* 压缩后的自定义样式 */
    </style>
  </head>
  <body>
    <div id="app">...</div>
    <script>
      /* 压缩混淆后的应用代码 */
    </script>
  </body>
</html>
```

## 验证标准

构建完成后需要验证：

1. **构建成功**：脚本执行无错误，正常输出文件
2. **完全离线**：断开网络后，打开 `dist/standalone/kid-math.html` 能正常运行
3. **功能正常**：能出题、答题、统计、存储，所有功能正常工作
4. **体积更小**：输出体积比开发版本 `index.html` + 所有依赖小

## 风险与考虑

- **Arco Design Vue** 体积较大（约~300KB gzip前），内联后整个HTML会变大，预计最终产物在 600KB - 800KB 左右，仍然在可接受范围内
- **仅应用代码混淆**：库代码不混淆，平衡体积和稳定性，库代码本身已经压缩，混淆收益很小
- **混淆后的应用代码不可读**，这符合需求（追求最小体积）
- 如果后续需要调试独立构建版本，可以新增一个不混淆的开发模式，但目前不需求暂不做
