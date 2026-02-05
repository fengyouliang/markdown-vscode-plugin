# Module: customEditor

## Responsibility
- 实现 `CustomTextEditorProvider`：将 Markdown 文档以 Webview 方式打开
- 提供 `Editor / Split / Preview` 三态 UI（同一标签页内切换）
- Split 模式滚动联动：基于渲染锚点（段落/标题等块级元素）进行更精准的同步
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
- `copyCode`：复制代码块内容到剪贴板（Webview 传递文本，扩展侧写入剪贴板）
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
- Code Block Copy（代码块复制）：
  - Webview：对普通代码块（`<pre><code>`，排除 Mermaid 占位节点）在右上角注入 `Copy` 按钮
  - 交互：点击按钮后通过 `copyCode` 消息将代码文本发送到扩展侧写入剪贴板，并在按钮上短暂显示 `Copied` 反馈
- Mermaid 图表（` ```mermaid `）：
  - Extension Host：将 mermaid fence 渲染为占位节点（`<pre class="mermaid" data-mermaid="...">`），并保留 `data-md-line` 作为滚动同步锚点
  - Webview：加载扩展包内本地 Mermaid 脚本并在 `init/update` 后执行渲染，渲染完成后刷新锚点 offsets
  - 安全：Mermaid 以 `securityLevel: "strict"` 初始化（不依赖 CDN）

### Split Scroll Sync
- 同步目标：Split 下“编辑区 ↔ 预览区”双向同步滚动
- 锚点来源：扩展侧渲染阶段为常见块级元素注入 `data-md-line`（1-based 行号）
  - 标题（heading）
  - 段落（paragraph）
  - 列表项（tight list 时用于兜底）
  - 代码块（fence，对应 `<pre>`）
- 同步策略：按锚点区间做线性插值，尽量避免“比例同步”在长文/图片导致的漂移问题
