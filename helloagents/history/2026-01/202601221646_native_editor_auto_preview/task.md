# 任务清单（轻量迭代）：保持 VS Code 原生编辑器 + 自动打开预览

Directory: `helloagents/history/2026-01/202601221646_native_editor_auto_preview/`

---

## 1. 行为变更：不再用自定义编辑器接管 `.md`
- [√] 1.1 移除 `package.json` 中对 `*.md` 的 `contributes.customEditors` 默认绑定，确保打开 Markdown 仍是 VS Code 原生 Text Editor
- [√] 1.2 移除 `activationEvents` 中的 `onCustomEditor:*`，避免无效激活路径
- [√] 1.3 移除 `src/customEditor/*` 与注册逻辑（`src/extension.ts`），避免死代码与维护负担

## 2. 默认体验：原生编辑 + 右侧预览
- [√] 2.1 将默认 `mdAutoPreview.openLocation` 调整为 `side`，确保“编辑区=原生、预览=右侧”
- [√] 2.2 校准命令/描述文案，避免继续出现“Split/自定义编辑器”误导

## 3. 文档与知识库同步（SSOT）
- [√] 3.1 更新 `README.md`：删除自定义编辑器说明，明确“仅自动打开 VS Code 内置预览”
- [√] 3.2 更新 `helloagents/wiki/overview.md` 与 `helloagents/wiki/modules/extension.md`：同步模块职责与范围
- [√] 3.3 更新 `helloagents/CHANGELOG.md`：记录该变更（含 breaking 说明）

## 4. 构建与验证
- [√] 4.1 执行 `npm run compile`，确保 TypeScript 编译通过
- [√] 4.2 清理 `dist/customEditor/*` 旧产物，避免打包携带无用文件
- [?] 4.3 手动验证：打开任意 `.md` → 仍为原生编辑器；预览按配置自动在右侧打开并可保持焦点
  > Note: 手动验证需要在 VS Code Extension Development Host 中进行，本任务仅保证编译通过与行为逻辑更新。
