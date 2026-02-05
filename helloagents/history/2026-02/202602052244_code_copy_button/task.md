# Task List: Code Block Copy Button（右上角）

Directory: `helloagents/plan/202602052244_code_copy_button/`

---

## 1. Webview UI
- [√] 1.1 为预览区代码块（`<pre><code>`）注入 Copy 按钮（右上角）
- [√] 1.2 点击 Copy 后提供短暂的 “Copied” 反馈（不打断编辑/阅读）

## 2. Message Protocol
- [√] 2.1 扩展协议新增 `copyCode` 消息，并更新类型校验

## 3. Extension Host
- [√] 3.1 处理 `copyCode`：使用 `vscode.env.clipboard.writeText` 写入剪贴板，并用状态栏提示结果

## 4. Docs & Knowledge Base
- [√] 4.1 更新知识库 `helloagents/wiki/modules/customEditor.md`：补充 Copy 按钮与协议说明
- [√] 4.2 更新 `helloagents/CHANGELOG.md`：记录新增能力

## 5. Verification
- [√] 5.1 `npm run compile` 通过
