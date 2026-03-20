---
summary: "OpenClaw 如何在 macOS 應用程式中供應 Apple 裝置型號識別碼以顯示易讀名稱。"
read_when:
  - 更新裝置型號識別碼映射或 NOTICE/授權檔案
  - 變更 Instances UI 顯示裝置名稱的方式
title: "裝置型號資料庫"
---

# 裝置型號資料庫（易讀名稱）

macOS 伴隨應用程式透過將 Apple 型號識別碼（例如 `iPad16,6`、`Mac16,6`）映射為易讀名稱，在 **Instances** UI 中顯示易讀的 Apple 裝置型號名稱。

該映射以 JSON 格式供應於：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 資料來源

我們目前從 MIT 授權的儲存庫供應該映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

為保持建置的確定性，JSON 檔案被固定到特定的上游提交（記錄在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新資料庫

1. 選擇您想要固定的上游提交（一個用於 iOS，一個用於 macOS）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交雜湊值。
3. 重新下載固定到這些提交的 JSON 檔案：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 確保 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍然與上游相符（如果上游授權變更則替換它）。
5. 驗證 macOS 應用程式乾淨地建置（無警告）：

```bash
swift build --package-path apps/macos
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
