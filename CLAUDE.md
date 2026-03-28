# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

这是一个小学一年级算术练习应用，包含 100 以内加减法、个位数乘法和表内除法练习。

## Commands

**开发服务器**:

```bash
npm run dev
```

启动 live-server，默认端口 8080。

**构建**:

```bash
npm run build
```

运行脚本将本地资源引用替换为 CDN 链接，并将处理后的 `index.html` 输出到 `dist/kid-math.html` 用于部署。

## Architecture

**单文件应用**: 所有代码都在 `index.html` 中，包含 HTML 模板、样式和 Vue 3 应用逻辑。

**资源引用策略**:

- 开发阶段：使用本地资源引用，支持完全离线开发
- 构建阶段：自动将本地引用替换为 CDN 链接

**主要依赖** (本地资源位于 `lib/` 目录，CDN 资源优先使用 jsdelivr):

- Vue 3
- Arco Design Vue (UI 组件库)
- Day.js (时间处理)
- ECharts (统计图表)
- Animate.css (动画效果)

**核心功能**:

1. 随机生成算术题目（加法、减法、乘法、除法）
2. 答题判断和反馈
3. 历史记录存储 (localStorage key: `kid-math-histories`)
4. 语音朗读反馈
5. 答题统计和用时计算
6. 统计图表展示练习历史

**关键常量**:

- `MAX = 100`: 加减法最大数值
- `OPERATORS = ['+', '-', '*', '/']`: 支持的运算符
