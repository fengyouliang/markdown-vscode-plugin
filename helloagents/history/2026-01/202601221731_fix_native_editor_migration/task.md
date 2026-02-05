# 任务清单（轻量迭代）：旧版自定义编辑器残留迁移（确保原生编辑器）

Directory: `helloagents/history/2026-01/202601221731_fix_native_editor_migration/`

---

## 1. 迁移逻辑：清理旧版 editorAssociations
- [√] 1.1 在扩展激活时检测 `workbench.editorAssociations` 中是否存在 `viewType=mdAutoPreview.markdownSplit`
- [√] 1.2 若存在，自动移除该关联（支持 Global/Workspace/WorkspaceFolder 作用域）
- [√] 1.3 若当前仍打开旧版 Custom Editor Tab，提示并提供一键“用 Text Editor 重新打开”

## 2. 文档与知识库同步（SSOT）
- [√] 2.1 更新 `README.md`：补充“仍显示旧版 Split 编辑器时的排障步骤”
- [√] 2.2 更新知识库模块说明与变更记录（`helloagents/wiki/modules/extension.md` / `helloagents/CHANGELOG.md`）

## 3. 构建与验证
- [√] 3.1 执行 `npm run compile`，确保 TypeScript 编译通过
- [?] 3.2 手动验证：存在旧关联时，打开 `.md` 仍可回到原生编辑器（必要时提示 reload）
  > Note: 手动验证需要在 VS Code Extension Development Host 中进行。
