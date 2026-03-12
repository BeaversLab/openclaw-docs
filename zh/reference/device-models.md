---
summary: "OpenClaw 如何在 macOS 应用中打包 Apple 设备型号标识符以实现友好名称显示。"
read_when:
  - Updating device model identifier mappings or NOTICE/license files
  - Changing how Instances UI displays device names
title: "设备型号数据库"
---

# 设备型号数据库（友好名称）

macOS 伴侣应用通过将 Apple 型号标识符（例如 `iPad16,6`、`Mac16,6`）映射为可读名称，在 **实例** UI 中显示友好的 Apple 设备型号名称。

该映射作为 JSON 打包在以下位置：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 数据来源

我们目前从 MIT 许可的仓库打包该映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

为了保持构建的确定性，JSON 文件被固定到特定的上游提交（记录在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新数据库

1. 选择您要固定到的上游提交（一个用于 iOS，一个用于 macOS）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交哈希值。
3. 重新下载 JSON 文件，并固定到这些提交：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确保 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍与上游匹配（如果上游许可发生更改，请替换它）。
5. 验证 macOS 应用是否能干净地构建（无警告）：

```bash
swift build --package-path apps/macos
```
