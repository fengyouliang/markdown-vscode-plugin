# Task List: Markdown 默认单栏预览（当前编辑组打开 Preview）

> **Mode:** Lightweight iteration

Directory: `helloagents/plan/202601202255_md_preview_single_column/`

---

## 1. Extension Core
- [√] 1.1 新增配置项 `mdAutoPreview.openLocation`（same/side），并将默认值调整为 same（单栏预览）
- [√] 1.2 调整自动预览命令：same → `markdown.showPreview` / `markdown.showLockedPreview`，side → `markdown.showPreviewToSide` / `markdown.showLockedPreviewToSide`
- [√] 1.3 约束 keepFocus 行为：仅在 side（双栏）模式下生效，same 模式强制以预览为主
- [√] 1.4 更新文档：README.md、readme.md（PRD）与知识库（wiki/data.md、wiki/modules/extension.md）

## 2. Testing
- [√] 2.1 运行 `npm run compile` 确保编译通过
- [?] 2.2 手动验证（Extension Host）：Explorer 点击 `.md` → 当前编辑组直接显示 Preview；切换 `.md` 能更新预览；设置 `openLocation=side` 可恢复双栏
  > Note: 需要在 VS Code Extension Host 中进行人工交互验证（本次自动化仅完成编译验证）。
