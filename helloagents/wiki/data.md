# Data Models

本项目无业务数据模型。与功能相关的持久化状态主要存放于 VS Code 的工作区状态（`workspaceState`）。

## Workspace State（按工作区持久化）
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mdAutoPreview.workspace.viewMode | "editor" \| "split" \| "preview" | "split" | 记住该工作区上次选择的视图模式 |
