# Task List: Mermaid 图表渲染支持

Directory: `helloagents/plan/202602051748_mermaid_support/`

---

## 1. Dependencies
- [√] 1.1 增加 `mermaid` 运行时依赖（更新 `package.json` / `package-lock.json`）

## 2. Rendering (Extension Host)
- [√] 2.1 在 `markdownRenderer.ts` 中支持 ` ```mermaid `：输出 Mermaid 占位节点，并保留 `data-md-line` 锚点

## 3. Webview
- [√] 3.1 Webview HTML 模板加载本地 Mermaid 脚本（非 CDN），并在 `init/update` 后执行渲染
- [√] 3.2 Mermaid 渲染完成后刷新锚点 offsets，避免滚动同步偏移

## 4. Docs & Knowledge Base
- [√] 4.1 更新 `README.md`：说明 Mermaid 支持与限制
- [√] 4.2 更新知识库 `helloagents/wiki/modules/customEditor.md` 与 `helloagents/CHANGELOG.md`

## 5. Verification
- [√] 5.1 `npm run compile` 通过
