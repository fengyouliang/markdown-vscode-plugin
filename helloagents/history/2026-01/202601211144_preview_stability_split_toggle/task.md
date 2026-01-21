# Task List: 修复预览稳定性 + 增加单栏/双栏快速切换

> **Mode:** Lightweight iteration

Directory: `helloagents/plan/202601211144_preview_stability_split_toggle/`

---

## 1. Preview Experience
- [√] 1.1 优化循环抑制逻辑（替换时间防抖为“忽略下一次特定事件”的方式），避免连续点击时偶发不展示预览
- [√] 1.2 新增命令 `mdAutoPreview.toggleOpenLocation`，可在 preview-only（same）与 split（side）之间切换并对当前 Markdown 生效
- [√] 1.3 更新文档与知识库（README/CHANGELOG/wiki/api），补充切换命令说明

## 2. Testing
- [√] 2.1 运行 `npm run compile` 确保编译通过
- [?] 2.2 手动验证（Extension Development Host）：
  - 2.2.1 连续点击同一个 `.md` 文件，始终保持预览可见
  - 2.2.2 `Toggle View (Preview Only / Split)` 能在 same/side 间切换
  > Note: 需要你在 Extension Development Host 中完成交互验证（本次自动化仅完成编译验证）。
