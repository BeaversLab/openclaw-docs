---
summary: "macOS 應用程式如何回報 gateway/Baileys 健康狀態"
read_when:
  - Debugging mac app health indicators
title: "健康檢查"
---

# macOS 上的健康檢查

如何從選單列應用程式查看連結的頻道是否健康。

## 選單列

- 狀態指示點現已反映 Baileys 的健康狀況：
  - 綠色：已連結 + socket 最近已開啟。
  - 橘色：連線中/重試中。
  - 紅色：已登出或偵測失敗。
- 第二行顯示「linked · auth 12m」或顯示失敗原因。
- 「執行健康檢查」選單項目會觸發按需偵測。

## 設定

- 一般分頁會新增一個健康狀態卡片，顯示：連結的驗證時間、session-store 路徑/數量、上次檢查時間、上次錯誤/狀態碼，以及執行健康檢查/顯示記錄檔的按鈕。
- 使用快照快取，讓 UI 能即時載入，並在離線時優雅地降級。
- 「頻道」分頁會顯示頻道狀態，以及 WhatsApp/Telegram 的控制項（登入 QR、登出、偵測、上次斷線/錯誤）。

## 偵測運作方式

- 應用程式每約 60 秒及按需透過 `ShellExecutor` 執行 `openclaw health --json`。偵測會載入憑證並回報狀態，而不會發送訊息。
- 分別快取上次良好的快照與上次錯誤，以避免閃爍；並顯示各自的時間戳記。

## 若有疑慮

- 您仍可使用 [Gateway health](/zh-Hant/gateway/health) 中的 CLI 流程 (`openclaw status`、`openclaw status --deep`、`openclaw health --json`)，並追蹤 `/tmp/openclaw/openclaw-*.log` 以尋找 `web-heartbeat` / `web-reconnect`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
