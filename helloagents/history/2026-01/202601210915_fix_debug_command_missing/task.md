# Task List: 修复调试时命令无法搜索（确保扩展被正确加载）

> **Mode:** Lightweight iteration

Directory: `helloagents/plan/202601210915_fix_debug_command_missing/`

---

## 1. Debug & Activation
- [√] 1.1 为调试启动增加 preLaunchTask：F5 前自动执行 `npm run compile`，避免 dist 缺失导致扩展未加载
- [√] 1.2 增加 `onStartupFinished` 激活事件，确保扩展在启动后可见（状态栏/命令可用）
- [√] 1.3 声明支持受限工作区（Workspace Trust），避免在未信任工作区中被禁用导致命令不可见

## 2. Testing
- [√] 2.1 运行 `npm run compile` 确保编译通过
- [?] 2.2 手动验证（Extension Development Host）：命令面板可搜索 `Markdown Auto Preview: Toggle`；状态栏显示 `MD Auto Preview: On/Off`
  > Note: 需要你在 Extension Development Host 中验证（本次自动化仅完成编译与配置修复）。
