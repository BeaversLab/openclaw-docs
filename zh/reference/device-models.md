---
title: "设备型号数据库"
summary: "OpenClaw 如何为 macOS 应用的友好设备名引入 Apple 设备型号标识"
read_when:
  - 更新设备型号映射或 NOTICE/license 文件
  - 调整 Instances UI 显示设备名称的方式
---

# 设备型号数据库（友好名称）

macOS 伴侣应用通过将 Apple 设备型号标识（如 `iPad16,6`、`Mac16,6`）映射为可读名称，在 **Instances** UI 中显示友好设备名。

该映射以 JSON 形式内置在：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 数据来源

当前映射来自 MIT 许可仓库：

- `kyle-seongwoo-jun/apple-device-identifiers`

为保证构建可重复，JSON 文件固定到特定上游提交（记录在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`）。

## 更新数据库

1. 选择要固定的上游提交（iOS 一份，macOS 一份）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交哈希。
3. 重新下载 JSON 文件，并固定到这些提交：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json"   -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json"   -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确认 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍与上游一致（若上游许可证变更，请替换）。
5. 验证 macOS 应用可正常构建（无警告）：

```bash
swift build --package-path apps/macos
```
