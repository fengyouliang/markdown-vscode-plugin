# Data Models

本项目无持久化数据模型，核心“数据”来自 VS Code 配置项。

## Configuration Schema（mdAutoPreview.*）
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mdAutoPreview.enabled | boolean | true | 是否启用自动预览 |
| mdAutoPreview.openLocation | string | same | same=单栏预览（当前编辑组）/ side=双栏预览（右侧） |
| mdAutoPreview.mode | string | follow | follow=跟随 / locked=锁定 |
| mdAutoPreview.keepFocus | boolean | true | 打开预览后是否保持焦点在源码编辑器（仅 openLocation=side 时生效） |
| mdAutoPreview.reopenPolicy | string | always | always 或 respectClosedInSession |
| mdAutoPreview.allowedSchemes | string[] | file/untitled/vscode-remote | 允许触发的 scheme |
| mdAutoPreview.excludeGlobs | string[] | node_modules/.git | 排除路径 globs |
| mdAutoPreview.onlyExtensions | string[] | [] | 仅对指定后缀生效（可选） |
| mdAutoPreview.showStatusBar | boolean | true | 是否显示状态栏 |
| mdAutoPreview.notifyOnError | boolean | true | 预览命令失败是否提示一次 |
