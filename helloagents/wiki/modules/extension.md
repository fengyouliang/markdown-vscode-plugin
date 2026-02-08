# Module: extension

## Responsibility
- 将 `.md` 默认以 Custom Editor 打开（通过 `contributes.customEditors` 声明 + 注册 Provider）
- 注册并管理 `CustomTextEditorProvider`（viewType：`mdAutoPreview.markdownEditor`）
- 提供工作区级状态持久化能力（记住上次视图模式）
- 与 VS Code 内置能力对齐：保留 “Reopen With...” 回退路径
- 支持受限工作区（Workspace Trust）：不执行外部命令、不上传内容，可安全运行

## Specifications
### 默认打开方式
- 通过 `contributes.customEditors` 提供自定义编辑器入口（`priority: option`）
- 扩展激活后会在“普通文本编辑器打开 Markdown”时自动重开为 Custom Editor（保持“默认打开”的体验）
- 例外：当当前 Tab 为 Diff（如 Source Control 变更对比）时，不自动重开，保留 VS Code 内置文本 Diff/编辑体验

### 视图模式记忆（按工作区）
- 使用 `ExtensionContext.workspaceState` 存储 `viewMode`（`editor` / `split` / `preview`）
- Webview 初始化时读取并应用该模式

### 回退路径
- UI 提供触发 VS Code `Reopen With...` 的入口
- 文档说明如何通过 `workbench.editorAssociations` 永久回退到 `Text Editor`

### 本地打包 VSIX
- 首次或依赖变更先执行：`npm ci`
- 生成 VSIX：`npm run vsix`（输出 `md-auto-preview-<version>.vsix`）
- VS Code 安装：命令面板执行 `Extensions: Install from VSIX...`
