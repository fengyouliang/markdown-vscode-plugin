# Technical Design: Markdown 单击自动预览（VS Code Extension）

## Technical Solution
### Core Technologies
- VS Code Extension API（`vscode`）
- VS Code 内置 Markdown 预览命令（`markdown.showPreviewToSide` / `markdown.showLockedPreviewToSide`）
- `minimatch`（用于 `excludeGlobs` 路径匹配）

### Implementation Key Points
- 监听 `vscode.window.onDidChangeActiveTextEditor`，当激活编辑器为 Markdown 时触发。
- 读取 `mdAutoPreview.*` 配置，应用以下过滤：
  - `languageId === "markdown"`
  - `allowedSchemes` 白名单
  - `excludeGlobs` 排除匹配
  - `onlyExtensions`（可选补充限制）
- 为避免循环触发：
  - `suppressAutoOpen`：在自动打开预览过程中抑制二次触发
  - `debounce`：对同一 URI 的短时间重复触发去重（抑制“打开预览→切回焦点”）
- `keepFocus=true` 时，在打开预览后调用 `showTextDocument` 切回源码编辑器。

## Architecture Decision ADR

### ADR-001: 复用 VS Code 内置 Markdown 预览命令
**Context:** 需求是“自动预览体验”，而非自研渲染或主题能力。
**Decision:** 调用内置命令打开预览（跟随/锁定两种）。
**Rationale:** 成本低、兼容性好、复用 VS Code 的实时渲染与生态能力。
**Alternatives:** 自研 webview 渲染 → 拒绝原因：成本高、维护复杂、与生态重复。
**Impact:** 预览效果与能力受 VS Code 内置实现影响，但能满足首版目标。

### ADR-002: 以编辑器激活变化作为触发源
**Context:** “单击打开/切换文件”在 VS Code 层面体现为 active editor 变化。
**Decision:** 使用 `onDidChangeActiveTextEditor` 触发自动打开预览。
**Rationale:** 覆盖打开、切换、启动后已有 editor 等场景，实现简单且可靠。
**Alternatives:** 监听文件打开事件 → 拒绝原因：无法覆盖所有切换场景；仍需结合 active editor。
**Impact:** 需要防抖与抑制标志避免循环触发。

## Security and Performance
- **Security:** 不读取/上传用户内容；不存储敏感信息；仅调用 VS Code 内置命令。
- **Performance:** 事件处理轻量；通过 debounce 与过滤减少无意义执行；路径匹配仅对当前文件进行。

## Testing and Deployment
- **Testing:** `npm run compile`；在 Extension Host 手动验证各配置项与核心场景。
- **Deployment:** 本地打包/发布可后续引入 `vsce`（不在首版强制范围）。

