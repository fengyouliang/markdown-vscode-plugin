# Changelog

本文件记录项目的重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 新增 GitHub Actions：`main` 分支 push 自动打包 `.vsix` 并上传为 Actions Artifact（无 PAT 也可用）。
- 新增 GitHub Actions：可选自动发布到 VS Code Marketplace（需要 PAT，默认关闭，通过变量开关启用）。
- 新增 `.vscodeignore`，控制打包内容，避免将知识库与源码目录打入 `.vsix`。

### Changed
- 发布版本号由 CI 自动递增（patch），并在 CI 中同步 `package.json`/`package-lock.json`（不回写提交）。
- 自动发布流程默认关闭，避免缺少 PAT 时每次 push 都失败；无 PAT 场景改为“CI 打包 + Marketplace 网页手动上传”。
- 扩展改为保持 VS Code 原生 Markdown 编辑器不变，仅自动打开内置 Markdown Preview（更贴近 VS Code 原生体验）。
- 默认 `mdAutoPreview.openLocation` 调整为 `side`（右侧双栏：左侧源码 + 右侧预览），避免单栏预览覆盖源码编辑区。

### Fixed
- 调整扩展 `displayName` 为 `Markdown Auto Preview (Native Editor)`，避免与实际能力不一致造成误导。
- 自动清理 VS Code 设置 `workbench.editorAssociations` 中旧版 `mdAutoPreview.markdownSplit` 关联，避免 `.md` 仍以旧 Split 自定义编辑器打开。

### Removed
- 移除 Markdown 自定义编辑器（Custom Editor）默认接管 `*.md` 的能力，以及相关配置项 `mdAutoPreview.customEditor.*`。
- 移除不再使用的依赖：`markdown-it` 与 `@types/markdown-it`。

## [0.2.0] - 2026-01-21

### Added
- 新增 Markdown 自定义编辑器（Custom Editor）：Explorer 点击 `.md` 默认进入同页 Split 预览（支持 Editor / Split / Preview 三态切换）。
- 新增自定义编辑器配置项：`mdAutoPreview.customEditor.defaultView` / `livePreview` / `debounceMs`。

## [0.1.2] - 2026-01-21

### Added
- 新增命令 `Markdown Auto Preview: Toggle View (Preview Only / Split)`，用于快速在单栏预览（same）与双栏预览（side）间切换。

### Fixed
- 优化事件抑制逻辑，减少“连续点击/频繁切换时偶发回到源码视图”的体验问题。

## [0.1.1] - 2026-01-20

### Added
- 新增 `mdAutoPreview.openLocation`：支持单栏预览（same）与右侧双栏预览（side）。
- 声明支持受限工作区（Workspace Trust），避免在未信任工作区中被禁用。

### Changed
- 默认预览打开位置调整为单栏（same），更符合“点击即预览”的阅读习惯。
- `keepFocus` 行为限定为仅在 `openLocation=side` 时生效。
- 调试配置增加 `preLaunchTask`，F5 启动前自动编译，降低“命令不可见/扩展未加载”的概率。

## [0.1.0] - 2026-01-20

### Added
- 初版 VS Code 扩展：打开/切换 Markdown 文件时自动在右侧打开预览。
- 支持跟随（follow）与锁定（locked）两种预览模式。
- 支持 keepFocus、防抖、防循环触发、路径排除与 scheme 白名单等配置。
