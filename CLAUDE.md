# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个小学一年级算术练习应用，包含 100 以内加减法、个位数乘法和表内除法练习。

## Commands

**开发服务器**:
```bash
npm run dev
```
启动 live-server，默认端口 8080。

## Architecture

**单文件应用**: 所有代码都在 `index.html` 中，包含 HTML 模板、样式和 Vue 3 应用逻辑。

**主要依赖** (通过 CDN 加载):
- Vue 3
- Arco Design Vue (UI 组件库)
- Day.js (时间处理)
- Animate.css (动画效果)

**核心功能**:
1. 随机生成算术题目（加法、减法、乘法、除法）
2. 答题判断和反馈
3. 历史记录存储 (localStorage key: `kid-math-histories`)
4. 语音朗读反馈
5. 答题统计和用时计算

**关键常量**:
- `MAX = 100`: 加减法最大数值
- `OPERATORS = ['+', '-', '*', '/']`: 支持的运算符
