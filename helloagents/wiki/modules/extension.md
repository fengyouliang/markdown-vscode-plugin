# Module: extension

## Responsibility
- 将 `.md` 默认以 Custom Editor 打开（通过 `contributes.customEditors` 声明 + 注册 Provider）
- 注册并管理 `CustomTextEditorProvider`（viewType：`mdAutoPreview.markdownEditor`）
- 提供工作区级状态持久化能力（记住上次视图模式）
- 与 VS Code 内置能力对齐：保留 “Reopen With...” 回退路径
- 支持受限工作区（Workspace Trust）：不执行外部命令、不上传内容，可安全运行

## Specifications
### 默认打开方式
- 通过 `contributes.customEditors` 将 `*.md` / `*.markdown` 的默认编辑器设置为：
  - `viewType: mdAutoPreview.markdownEditor`
  - `priority: default`

### 视图模式记忆（按工作区）
- 使用 `ExtensionContext.workspaceState` 存储 `viewMode`（`editor` / `split` / `preview`）
- Webview 初始化时读取并应用该模式

### 回退路径
- UI 提供触发 VS Code `Reopen With...` 的入口
- 文档说明如何通过 `workbench.editorAssociations` 永久回退到 `Text Editor`
