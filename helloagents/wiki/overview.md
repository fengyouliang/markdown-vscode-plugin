# Markdown Auto Preview（VS Code Extension）

> 项目级核心信息。模块细节见 `modules/`。

---

## 1. Project Overview

### Goals and Background
在 VS Code 中阅读/编辑 Markdown 时，提供更贴近 JetBrains 的“点击即预览”体验：Explorer 点击 `.md` 默认进入 **同页 Split 预览（源码 + 预览）**，并保留对 VS Code 内置 Preview 的兼容自动打开能力，减少手动点击“打开预览”的重复操作。

### Scope
- **In scope:**
  - Markdown 自定义编辑器（Custom Editor）：同页 `Editor / Split / Preview` 三态切换
  - 打开或切换到 Markdown 文件时自动打开预览（默认单栏，可选右侧双栏）
  - 跟随/锁定两种预览模式
  - 通过配置控制启用状态、焦点保持、排除路径、允许 scheme
- **Out of scope:**
  - 与 VS Code 内置 Markdown Preview 100% 功能对齐（主题/插件生态/TOC/高级渲染等）
  - 数学公式/语法增强等高级渲染能力（依赖 VS Code 或其他扩展）

### Stakeholders
- **Owner:** 本仓库维护者/使用者

---

## 2. Module Index

| Module Name | Responsibility | Status | Documentation |
|-------------|----------------|--------|---------------|
| extension | 注册 Markdown 自定义编辑器并兼容自动打开 VS Code 内置预览 | In Development | [modules/extension.md](modules/extension.md) |

---

## 3. Quick Links
- [Technical Conventions](../project.md)
- [Architecture Design](arch.md)
- [API Manual](api.md)
- [Data Models](data.md)
- [Change History](../history/index.md)
