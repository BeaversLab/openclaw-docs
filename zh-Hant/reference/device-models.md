---
summary: "OpenClaw 如何在 macOS 應用程式中供應 Apple 裝置型號識別碼以顯示友善名稱。"
read_when:
  - Updating device model identifier mappings or NOTICE/license files
  - Changing how Instances UI displays device names
title: "裝置型號資料庫"
---

# 裝置型號資料庫（友善名稱）

macOS 伴隨應用程式透過將 Apple 型號識別碼（例如 `iPad16,6`、`Mac16,6`）對應到人類可讀的名稱，在 **Instances** UI 中顯示友善的 Apple 裝置型號名稱。

該對應關係以 JSON 格式供應於：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 資料來源

我們目前從 MIT 授權的儲存庫供應該對應關係：

- `kyle-seongwoo-jun/apple-device-identifiers`

為了保持建構的確定性，JSON 檔案被固定在特定的上游提交（記錄在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新資料庫

1. 選擇您想要固定的上游提交（一個用於 iOS，一個用於 macOS）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交雜湊值。
3. 重新下載固定在這些提交的 JSON 檔案：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 確保 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍然與上游相符（如果上游授權變更則替換它）。
5. 驗證 macOS 應用程式可以乾淨地建構（沒有警告）：

```bash
swift build --package-path apps/macos
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
