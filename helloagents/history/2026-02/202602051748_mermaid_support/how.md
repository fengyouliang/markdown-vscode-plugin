# Technical Design: Mermaid 图表渲染支持

## Technical Solution

### Core Technologies
- Markdown 渲染：`markdown-it`（Extension Host 侧生成 HTML）
- Mermaid 渲染：`mermaid`（Webview 侧本地脚本，非 CDN）
- 安全策略：Webview CSP（禁止远程脚本）+ Mermaid `securityLevel: 'strict'`

### Implementation Key Points
1. **Fence 接入点：**在 `markdown-it` 的 `renderer.rules.fence` 中识别 `info === 'mermaid'`，输出 `<pre class="mermaid" data-mermaid="...">` 作为占位节点。
2. **源码传递：**使用 base64 编码将 Mermaid 源码放入 `data-mermaid` 属性，避免 HTML 注入与转义歧义；Webview 渲染前将其解码写回 `textContent`。
3. **本地脚本加载：**Webview HTML 模板中通过 `webview.asWebviewUri(extensionUri/...)` 引用 `node_modules/mermaid/dist/mermaid.min.js`，保持离线可用。
4. **渲染时机：**每次收到 `init/update` 并写入 `previewEl.innerHTML` 后，执行 `renderMermaid()`；渲染完成后标记锚点 offset dirty 并重新计算。
5. **主题：**根据 Webview `body` 的 `vscode-dark/vscode-high-contrast` 等 class 选择 Mermaid theme（light/dark）。

## Architecture Decision ADR

### ADR-005: Mermaid render in Webview with local script
**Context:** Mermaid 是浏览器侧渲染库；Extension Host 侧渲染为 SVG 需要引入 headless/DOM 依赖，复杂度与体积更高。  
**Decision:** 在 Webview 侧加载本地 Mermaid 脚本并渲染占位节点，Extension Host 仅负责产出占位 HTML。  
**Rationale:** 实现路径最短；不引入远程资源；与现有“扩展侧渲染 Markdown → Webview 展示”的架构兼容。  
**Alternatives:**
- Extension Host 侧渲染 SVG（拒绝原因：需要额外 runtime/依赖，复杂度与体积明显增加）
- 使用外部 CDN（拒绝原因：不符合 CSP/离线与信任工作区安全策略）  
**Impact:** Webview 渲染为异步 DOM 更新，需要在渲染后刷新滚动同步锚点。

## Security and Performance
- **Security:**
  - Mermaid 脚本仅来自扩展包内本地资源（`webview.asWebviewUri`），不加载远程资源。
  - Mermaid 初始化使用 `securityLevel: 'strict'`。
  - 仍保持 `markdown-it` 禁用原始 HTML（`html: false`）。
- **Performance:**
  - 仅在预览区域存在 `.mermaid` 节点时执行渲染。
  - 渲染后仅触发锚点 offset 重算（已有 RAF 节流机制）。

## Testing and Verification
- 打开包含 ` ```mermaid ` 的 Markdown，确认 Preview/Split 中显示图形。
- 编辑 Mermaid 源码，确认预览重渲染且滚动同步仍可用。
- 断网环境下验证（不依赖 CDN）。
