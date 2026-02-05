# Task List: md_anchor_scroll_sync

Directory: `helloagents/plan/202602051737_md_anchor_scroll_sync/`

---

## 1. customEditor（Scroll Sync）
- [√] 1.1 渲染侧为标题/段落/列表项/代码块注入 `data-md-line` 锚点（用于更精准的滚动同步）
- [√] 1.2 Webview Split 模式滚动同步升级为“锚点区间插值 + 双向同步 + 顶部/底部兜底”
- [√] 1.3 图片加载/窗口 resize 后重新计算锚点 offset，降低预览布局变化带来的漂移

## 2. Security Check
- [√] 2.1 确认未放开原始 HTML 渲染、未弱化 CSP；滚动同步仅依赖 `data-md-line`，不引入外部脚本

## 3. Documentation Update
- [√] 3.1 更新 `helloagents/wiki/modules/customEditor.md`：补充 Split Scroll Sync 规范与锚点来源
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录 Unreleased 变更

## 4. Testing
- [√] 4.1 运行 `npm run compile`（`tsc -p .`）通过
- [ ] 4.2 手动验收：F5 启动 Extension Host，Split 下双向滚动对齐（含长文/列表/代码块/图片）
