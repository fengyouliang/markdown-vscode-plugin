# Task List: 首次打开 Markdown 首屏加速（Fast init + 预渲染）

Directory: `helloagents/history/2026-02/202602061613_md_first_open_fast_init/`

---

## 1. Extension Host（渲染链路）
- [√] 1.1 `ready` 时优先使用缓存 HTML 初始化，避免重复渲染
- [√] 1.2 Cache miss 时先快速回填文本/占位预览，再后台补发真实 `update`，降低首屏空白
- [√] 1.3 文档变更触发的 `update` 合并/节流 + 不可见面板跳过刷新，减少无效渲染

## 2. Webview（首屏体验 & 资源加载）
- [√] 2.1 Webview 初始 HTML 增加“加载中…”占位（init 前可见）
- [√] 2.2 Mermaid 脚本按需懒加载（仅检测到 Mermaid 占位节点时加载并渲染）

## 3. Docs & Verification
- [√] 3.1 同步知识库说明（性能/懒加载策略）
- [√] 3.2 `npm run compile` 通过
