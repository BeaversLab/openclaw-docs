---
summary: "OpenClaw 如何在 macOS 应用中为 Apple 设备型号标识符提供友好名称。"
read_when:
  - 更新设备型号标识符映射或 NOTICE/license 文件
  - 更改 Instances UI 显示设备名称的方式

title: "设备型号数据库"
---

# 设备型号数据库（友好名称）

macOS 伴侣应用通过将 Apple 型号标识符（例如 `iPad16,6`、`Mac16,6`）映射到人类可读的名称，在 **Instances** UI 中显示友好的 Apple 设备型号名称。

该映射作为 JSON 供应商化位于：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 数据源

我们目前从 MIT 许可的仓库供应商化该映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

为了保持构建的确定性，JSON 文件被固定到特定的上游提交（记录在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新数据库

1. 选择要固定的上游提交（iOS 一个，macOS 一个）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交哈希值。
3. 重新下载固定到这些提交的 JSON 文件：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确保 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍与上游匹配（如果上游许可发生更改，则替换它）。
5. 验证 macOS 应用是否构建干净（无警告）：

```bash
swift build --package-path apps/macos
```

import zh from "/components/footer/zh.mdx";

<zh />
