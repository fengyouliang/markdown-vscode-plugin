# Module: extension

## Responsibility
- 保持 VS Code 原生 Markdown 编辑器不变（不接管 `.md` 的默认编辑器）
- 监听 VS Code 当前激活文本编辑器变化
- 判断是否为 Markdown，并应用配置（scheme 白名单、glob 排除、后缀限制）
- 调用 VS Code 内置 Markdown 预览命令（单栏/右侧；跟随/锁定），按需切回编辑焦点
- 提供命令（Enable/Disable/Toggle/手动打开预览/切换单栏-双栏）与状态栏开关
- 支持受限工作区（Workspace Trust）：在未信任工作区中仍可安全运行

## Specifications
### 自动预览触发条件
- `document.languageId === "markdown"`
- `document.uri.scheme` 在 `mdAutoPreview.allowedSchemes` 列表内
- 未命中 `mdAutoPreview.excludeGlobs`
- 若 `mdAutoPreview.onlyExtensions` 非空，则文件扩展名需在该列表内
- 在 Diff/对比编辑器（例如 Source Control 的变更对比）中不自动打开预览，避免产生额外分栏干扰查看

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

### 迁移（从旧版 Custom Editor 升级）
历史版本曾提供自定义编辑器 `mdAutoPreview.markdownSplit`，并可能在 VS Code 的 `workbench.editorAssociations` 中留下打开关联。
当前版本会在激活时自动清理该残留关联，并在检测到仍以旧 Custom Editor 打开时提示用户用 `Text Editor` 重新打开（必要时需 `Reload Window` 使关联完全生效）。
