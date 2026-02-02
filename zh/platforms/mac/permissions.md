---
title: "macOS Permissions"
summary: "macOS 权限持久化（TCC）与签名要求"
read_when:
  - 排查 macOS 权限提示缺失或卡住
  - 打包或签名 macOS 应用
  - 修改 bundle ID 或应用安装路径
---
# macOS 权限（TCC）

macOS 的权限授权较为脆弱。TCC 会将授权与应用的代码签名、bundle identifier 以及磁盘路径绑定。
其中任何一项变化都会让 macOS 视为新应用，可能丢失授权或隐藏提示。

## 稳定权限的要求
- 路径一致：从固定位置运行应用（OpenClaw 为 `dist/OpenClaw.app`）。
- Bundle identifier 一致：更改 bundle ID 会创建新的权限身份。
- 签名应用：未签名或 ad-hoc 签名不会持久化权限。
- 签名一致：使用真实的 Apple Development 或 Developer ID 证书，确保重建时签名稳定。

Ad-hoc 签名每次构建都会生成新的身份。macOS 会忘记之前的授权，提示可能完全不再出现，
直到清理过期条目。

## 提示消失时的恢复清单
1. 退出应用。
2. 在 System Settings -> Privacy & Security 中移除应用条目。
3. 从相同路径重新启动应用并重新授权。
4. 若提示仍不出现，使用 `tccutil` 重置 TCC 条目后再试。
5. 某些权限只有在完整重启 macOS 后才会再次出现。

重置示例（按需替换 bundle ID）：

```bash
sudo tccutil reset Accessibility bot.molt.mac
sudo tccutil reset ScreenCapture bot.molt.mac
sudo tccutil reset AppleEvents
```

如果你在测试权限，请始终使用真实证书签名。ad-hoc 构建仅适用于权限无关的快速本地运行。
