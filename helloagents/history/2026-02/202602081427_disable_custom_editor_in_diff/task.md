# task

Mode: lightweight iteration
Created: 2026-02-08 14:27

## Tasks
- [√] 调整 `contributes.customEditors`：`priority` 从 `default` 改为 `option`，避免 Diff 场景自动使用 Custom Editor
- [√] 增加激活事件：`onLanguage:markdown`，用于在普通打开 Markdown 时触发自动重开逻辑
- [√] 实现自动重开：普通 Markdown 文本编辑器 → `vscode.openWith` 重开为 Custom Editor；当当前 Tab 为 Diff（Source Control 对比）时跳过
- [√] 同步知识库与变更记录：更新 `helloagents/wiki/*` 与 `helloagents/CHANGELOG.md`
- [√] 编译验证：`npm run compile`

