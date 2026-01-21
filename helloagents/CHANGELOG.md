# Changelog

本文件记录项目的重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
