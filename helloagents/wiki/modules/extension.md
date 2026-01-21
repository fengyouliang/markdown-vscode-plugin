# Module: extension

## Responsibility
- 注册 Markdown 自定义编辑器（CustomTextEditorProvider），提供同页 Split/Preview 体验
- 监听 VS Code 当前激活编辑器变化
- 判断是否为 Markdown，并应用配置（scheme 白名单、glob 排除、后缀限制）
- 调用 VS Code 内置 Markdown 预览命令，按需切回编辑焦点
- 提供命令（Enable/Disable/Toggle/手动打开预览）与状态栏开关
- 支持受限工作区（Workspace Trust）：在未信任工作区中仍可安全运行

## Specifications
### 自定义编辑器（同页 Split 预览）
- `viewType`: `mdAutoPreview.markdownSplit`
- `package.json` 中通过 `contributes.customEditors` 绑定到 `*.md`，并设置为 `priority: "default"`，确保 Explorer 点击 `.md` 默认进入自定义编辑器
- Provider 实现在 `src/customEditor/MarkdownSplitEditorProvider.ts`，在 `activate()` 中注册

#### 自定义编辑器视图与配置
- 视图三态：`Editor / Split / Preview`
- 默认视图：`mdAutoPreview.customEditor.defaultView`（默认 `split`）
- 实时预览：`mdAutoPreview.customEditor.livePreview`（默认 `true`）
- 输入防抖：`mdAutoPreview.customEditor.debounceMs`（默认 `150`）

#### Webview 安全策略
- 使用 CSP：`default-src 'none'`，仅允许 webview 自身的脚本/样式与本地资源图片
- Markdown 渲染默认禁用原始 HTML（避免 XSS）

### 自动预览触发条件
- `document.languageId === "markdown"`
- `document.uri.scheme` 在 `mdAutoPreview.allowedSchemes` 列表内
- 未命中 `mdAutoPreview.excludeGlobs`
- 若 `mdAutoPreview.onlyExtensions` 非空，则文件扩展名需在该列表内

### 预览打开位置
- `openLocation=same`：在当前编辑组打开预览（单栏）
  - `follow`：执行 `markdown.showPreview`
  - `locked`：执行 `markdown.showLockedPreview`
- `openLocation=side`：在右侧打开预览（双栏）
  - `follow`：执行 `markdown.showPreviewToSide`
  - `locked`：执行 `markdown.showLockedPreviewToSide`

### 焦点与防循环
- `keepFocus=true`：仅在 `openLocation=side` 时生效；预览打开后调用 `showTextDocument` 切回源码编辑器
- 使用防抖窗口与抑制标志避免重复触发与循环
