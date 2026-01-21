# Markdown Auto Preview

在 VS Code 中查看 Markdown 的两种形态：

1) **自定义编辑器（推荐 / JetBrains 风格）**：Explorer 点击 `.md` 后，默认在**同一页面**内显示 `Editor / Split / Preview`，其中 Split 是“左侧源码 + 右侧预览”。

2) **内置 Preview 自动打开（兼容模式）**：继续使用 VS Code 内置 Markdown Preview，通过本扩展在打开/切换 Markdown 文件时自动执行预览命令（支持单栏或右侧）。

## 功能
### 自定义编辑器（Custom Editor）
- Explorer 单击打开 `.md`：默认进入自定义编辑器（同页 Split/Preview）
- 支持三态切换：`Editor / Split / Preview`
- 支持编辑内容后预览实时刷新（可配置防抖/开关）

### 内置 Preview 自动打开（Legacy）
- 打开或切换到 Markdown 文件时自动预览（默认：单栏预览）
- 可选双栏：`openLocation=side` 时为“左侧源码 + 右侧预览”
- 双栏模式下默认不打断编辑：预览打开后焦点回到源码编辑器（`keepFocus=true`）
- 支持“跟随 / 锁定”两种预览模式
- 提供启用/禁用/切换命令 + 状态栏开关
- 支持 scheme 白名单、glob 排除、后缀名限制

## 配置（Settings）
在 VS Code 设置中搜索 `mdAutoPreview`：

### 自定义编辑器
- `mdAutoPreview.customEditor.defaultView`：`split | preview | editor`（默认 `split`）
- `mdAutoPreview.customEditor.livePreview`：是否实时刷新预览（默认 `true`）
- `mdAutoPreview.customEditor.debounceMs`：输入更新防抖毫秒数（默认 `150`）

> 说明：自定义编辑器是默认打开方式；如需回到普通文本编辑器，可在编辑器右上角或 Tab 上使用 “Reopen With...” 选择 `Text Editor`。

### 内置 Preview 自动打开（Legacy）
- `mdAutoPreview.enabled`：是否启用（默认 `true`）
- `mdAutoPreview.openLocation`：`same | side`（默认 `same`）
  - `same`：单栏预览（在当前编辑组打开 Preview）
  - `side`：双栏预览（在右侧打开 Preview）
- `mdAutoPreview.mode`：`follow | locked`（默认 `follow`）
- `mdAutoPreview.keepFocus`：是否保持编辑焦点（默认 `true`，仅 `openLocation=side` 时生效）
- `mdAutoPreview.reopenPolicy`：`always | respectClosedInSession`
  - `respectClosedInSession`：同一文件本次会话只会自动打开一次（适合“我关掉就别再弹”）
- `mdAutoPreview.allowedSchemes`：允许的 URI scheme（默认 `file/untitled/vscode-remote`）
- `mdAutoPreview.excludeGlobs`：排除路径 glob（默认排除 `node_modules/.git`）
- `mdAutoPreview.onlyExtensions`：仅对特定后缀生效（默认不限制）
- `mdAutoPreview.showStatusBar`：是否显示状态栏开关
- `mdAutoPreview.notifyOnError`：预览命令失败是否提示一次

## 命令（Commands）
- `Markdown Auto Preview: Enable`
- `Markdown Auto Preview: Disable`
- `Markdown Auto Preview: Toggle`
- `Markdown Auto Preview: Open Preview to Side (Follow)`
- `Markdown Auto Preview: Open Preview to Side (Locked)`
- `Markdown Auto Preview: Toggle View (Preview Only / Split)`

## 开发与调试
1. `npm install`
2. `npm run compile`
3. 按 `F5` 运行 “Run Extension” 启动 Extension Host
4. 在 Extension Host 中用 Explorer 打开任意 `.md`，应默认进入自定义编辑器并可切换 `Editor/Split/Preview`
