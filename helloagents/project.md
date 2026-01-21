# Project Technical Conventions

## Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **VS Code API:** `vscode` Extension API
- **Markdown Render:** `markdown-it`（用于 Custom Editor 的预览渲染）

## Development Conventions
- **Build:** `tsc` 编译到 `dist/`，入口为 `dist/extension.js`
- **Main Entry:** `src/extension.ts`
- **Custom Editor:** `mdAutoPreview.markdownSplit`（Provider：`src/customEditor/MarkdownSplitEditorProvider.ts`）
- **Configuration Prefix:** `mdAutoPreview.*`

## Errors and Logging
- 默认不写入日志文件。
- 当内置 Markdown 预览命令执行失败时，仅在 `notifyOnError=true` 时提示一次（避免打扰/刷屏）。

## Testing and Process
- **Smoke Test:** `npm run compile` 确保 TypeScript 编译通过。
- **Manual Test:** 在 Extension Host 中打开 `.md` 文件验证自定义编辑器（Editor/Split/Preview）与旧版自动预览（Legacy）行为。
- **Debug Tip:** `Run Extension (F5)` 已配置 `preLaunchTask`，会在启动前自动编译，避免因 `dist/` 缺失导致扩展未加载。
