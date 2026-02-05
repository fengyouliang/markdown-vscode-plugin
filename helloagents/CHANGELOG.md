# Changelog

本文件记录项目的重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 预览支持 Mermaid 图表：` ```mermaid ` 围栏代码块在 Preview/Split 中渲染为 SVG（本地脚本渲染，不依赖 CDN）。
- 预览代码块支持一键复制：在普通代码块右上角显示 `Copy` 按钮，点击复制到剪贴板并给出轻量反馈。

### Changed
- Split 模式滚动同步升级为基于段落/标题锚点（`data-md-line`）的映射，减少长文档中的漂移与跳动。

## [1.0.0] - 2026-02-05

### Added
- 新增 Markdown Custom Editor：`.md` 默认进入同一标签页内的 `Editor / Split / Preview` 三态界面。
- 新增工作区级视图记忆：按工作区记住上次选择的视图模式（跨重启生效）。
- 新增 `markdown-it` 本地渲染预览（默认禁用原始 HTML），并支持 file scheme 下相对路径图片的基础解析。
- 新增 GitHub Actions：`main` 分支 push 自动打包 `.vsix` 并上传为 Actions Artifact（无 PAT 也可用）。
- 新增 GitHub Actions：可选自动发布到 VS Code Marketplace（需要 PAT，默认关闭，通过变量开关启用）。
- 新增 `.vscodeignore`，控制打包内容，避免将知识库与源码目录打入 `.vsix`。

### Changed
- 扩展从“原生 Text Editor + 自动打开内置 Preview”切换为“Custom Editor 三态”（破坏性变更）。
- `displayName/description` 更新为与三态 Custom Editor 一致的定位说明。
- 发布版本号由 CI 自动递增（patch），并在 CI 中同步 `package.json`/`package-lock.json`（不回写提交）。

### Removed
- 移除旧版自动预览逻辑与相关命令/配置（`mdAutoPreview.enabled/openLocation/mode/...` 等）。

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
