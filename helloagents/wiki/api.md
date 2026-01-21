# API Manual

## Overview
本项目不提供 HTTP/API 服务，主要通过以下方式与用户交互：
- VS Code 命令（Command Palette / 快捷键）
- VS Code Settings（配置项 `mdAutoPreview.*`）

---

## Command List

### mdAutoPreview.enable
启用自动预览。

### mdAutoPreview.disable
禁用自动预览。

### mdAutoPreview.toggle
切换启用/禁用（也用于状态栏点击）。

### mdAutoPreview.openPreviewFollow
手动按“跟随模式”打开右侧预览。

### mdAutoPreview.openPreviewLocked
手动按“锁定模式”打开右侧预览。

### mdAutoPreview.toggleOpenLocation
在“单栏预览（same）”与“右侧双栏预览（side）”之间切换，并尝试对当前/最近的 Markdown 文件立即生效。
