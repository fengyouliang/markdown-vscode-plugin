# Module: customEditor

## Responsibility
- 实现 `CustomTextEditorProvider`：将 Markdown 文档以 Webview 方式打开
- 提供 `Editor / Split / Preview` 三态 UI（同一标签页内切换）
- 支持轻量编辑与保存：
  - Webview 输入 → 扩展侧 `WorkspaceEdit` 回写到 `TextDocument`
  - 支持外部变更同步（扩展侧监听 `onDidChangeTextDocument` 推送更新）
- 预览渲染：扩展侧使用 `markdown-it` 渲染 HTML，并通过消息推送到 Webview 展示
- 安全：严格 CSP；仅处理白名单消息；预览默认禁用原始 HTML

## Specifications

### ViewType
- `mdAutoPreview.markdownEditor`

### View Modes
三态视图模式：
- `editor`：仅编辑区
- `split`：编辑 + 预览
- `preview`：仅预览区

### Webview Message Protocol
Webview → Extension：
- `ready`：Webview 完成加载，请求初始化数据
- `edit`：编辑内容变更（节流后发送全量文本）
- `setViewMode`：用户切换视图模式
- `reopenWith`：触发 VS Code `Reopen With...`
- `openExternal`：请求打开外部链接（仅允许 http/https）

Extension → Webview：
- `init`：初始化（文本、HTML、文档 version、当前 viewMode）
- `update`：更新（文本、HTML、文档 version）
- `setViewMode`：同步 viewMode（按工作区记忆时用于广播）
- `error`：错误提示（首版仅日志/不强打断）

### Security and CSP
- `default-src 'none'`
- `script-src` 仅允许 nonce
- `style-src` 允许 inline（轻量 UI）
- `img-src` 允许 `https:` / `data:` 与 `webview.cspSource`

### Preview Rendering
- 渲染引擎：`markdown-it`
- 安全默认：`html: false`
- 本地相对路径图片（首版）：仅在 `file` scheme 下解析为 `webview.asWebviewUri`
