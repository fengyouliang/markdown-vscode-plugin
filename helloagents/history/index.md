# Change History Index

本文件记录已完成变更的索引，便于追溯与查询。

---

## Index

| Timestamp | Feature Name | Type | Status | Solution Package Path |
|-----------|--------------|------|--------|----------------------|
| 202601202226 | md_auto_preview | Feature | ✅Completed | [202601202226_md_auto_preview](2026-01/202601202226_md_auto_preview/) |
| 202601202255 | md_preview_single_column | Feature | ✅Completed | [202601202255_md_preview_single_column](2026-01/202601202255_md_preview_single_column/) |
| 202601210915 | fix_debug_command_missing | Fix | ✅Completed | [202601210915_fix_debug_command_missing](2026-01/202601210915_fix_debug_command_missing/) |
| 202601211144 | preview_stability_split_toggle | Fix | ✅Completed | [202601211144_preview_stability_split_toggle](2026-01/202601211144_preview_stability_split_toggle/) |
| 202601211231 | markdown_custom_editor_split | Feature | ✅Completed | [202601211231_markdown_custom_editor_split](2026-01/202601211231_markdown_custom_editor_split/) |
| 202601211506 | github_actions_marketplace_publish | Feature | ✅Completed | [202601211506_github_actions_marketplace_publish](2026-01/202601211506_github_actions_marketplace_publish/) |
| 202601211524 | ci_auto_version_from_tag | Fix | ✅Completed | [202601211524_ci_auto_version_from_tag](2026-01/202601211524_ci_auto_version_from_tag/) |
| 202601211538 | marketplace_auto_publish_main | Feature | ✅Completed | [202601211538_marketplace_auto_publish_main](2026-01/202601211538_marketplace_auto_publish_main/) |
| 202601211827 | ci_package_vsix_manual_marketplace | Feature | ✅Completed | [202601211827_ci_package_vsix_manual_marketplace](2026-01/202601211827_ci_package_vsix_manual_marketplace/) |
| 202601221646 | native_editor_auto_preview | Fix | ✅Completed | [202601221646_native_editor_auto_preview](2026-01/202601221646_native_editor_auto_preview/) |
| 202601221731 | fix_native_editor_migration | Fix | ✅Completed | [202601221731_fix_native_editor_migration](2026-01/202601221731_fix_native_editor_migration/) |

---

## Archive by Month

### 2026-01

- [202601202226_md_auto_preview](2026-01/202601202226_md_auto_preview/) - 打开/切换 Markdown 文件自动预览（右侧）
- [202601202255_md_preview_single_column](2026-01/202601202255_md_preview_single_column/) - 默认单栏预览（当前编辑组打开 Preview）
- [202601210915_fix_debug_command_missing](2026-01/202601210915_fix_debug_command_missing/) - 修复调试时命令不可见/扩展未加载
- [202601211144_preview_stability_split_toggle](2026-01/202601211144_preview_stability_split_toggle/) - 修复连续点击预览不稳定 + 增加单栏/双栏切换命令
- [202601211231_markdown_custom_editor_split](2026-01/202601211231_markdown_custom_editor_split/) - Markdown 自定义编辑器：同页 Split 预览（JetBrains 形态）
- [202601211506_github_actions_marketplace_publish](2026-01/202601211506_github_actions_marketplace_publish/) - GitHub Actions：Tag 驱动发布到 VS Code Marketplace
- [202601211524_ci_auto_version_from_tag](2026-01/202601211524_ci_auto_version_from_tag/) - 发布版本由 tag 决定，CI 自动同步 package.json/package-lock 版本号
- [202601211538_marketplace_auto_publish_main](2026-01/202601211538_marketplace_auto_publish_main/) - 主分支 push 自动发布到 VS Code Marketplace（版本自动递增）
- [202601211827_ci_package_vsix_manual_marketplace](2026-01/202601211827_ci_package_vsix_manual_marketplace/) - 主分支 push 自动打包 VSIX（Artifacts）+ Marketplace 手动上传（无 PAT）
- [202601221646_native_editor_auto_preview](2026-01/202601221646_native_editor_auto_preview/) - 保持 VS Code 原生编辑器 + 自动打开右侧预览
- [202601221731_fix_native_editor_migration](2026-01/202601221731_fix_native_editor_migration/) - 清理旧版 Custom Editor 关联，确保 `.md` 回到原生编辑器
