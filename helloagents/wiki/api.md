# API Manual

## Overview
本项目不提供 HTTP/API 服务，主要通过以下方式与用户交互：
- VS Code Custom Editor（Webview UI 按钮：Editor / Split / Preview）
- VS Code 内置命令 `Reopen With...`（用于回退到 Text Editor 或选择其他编辑器）

---

## Command List
本扩展当前不额外贡献自定义命令（不在 Command Palette 中注册扩展命令）。

相关交互依赖以下内置命令：
- `workbench.action.reopenWithEditor`：显示 “Reopen With...” 选择器
