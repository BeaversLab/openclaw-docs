---
summary: "macOS 應用程式如何報告 Gateway/Baileys 健康狀態"
read_when:
  - Debugging mac app health indicators
title: "健康檢查"
---

# macOS 上的健康檢查

如何從選單列應用程式中查看連結的頻道是否健康。

## 選單列

- 狀態指示點現在會反映 Baileys 的健康狀態：
  - 綠色：已連結 + Socket 最近已開啟。
  - 橘色：正在連線/重試中。
  - 紅色：已登出或探測失敗。
- 次行文字會顯示「linked · auth 12m」或顯示失敗原因。
- 「執行健康檢查」選單項目會觸發隨需探測。

## 設定

- 一般標籤新增了一張健康資訊卡，顯示：連結的授權時間、session-store 路徑/數量、上次檢查時間、上次錯誤/狀態碼，以及「執行健康檢查」/「顯示記錄檔」按鈕。
- 使用快照快取，讓 UI 即時載入，並在離線時能優雅降級。
- **Channels 分頁**會顯示 WhatsApp/Telegram 的頻道狀態與控制選項（登入 QR、登出、探測、上次斷線/錯誤）。

## 探測運作方式

- 應用程式會透過 `ShellExecutor` 每約 60 秒以及按需執行 `openclaw health --json`。探測會載入憑證並回報狀態，而不會傳送訊息。
- 分別快取最後的完好快照與最後的錯誤以避免閃爍；並顯示各自的時間戳記。

## 若有疑問

- 您仍可使用 [Gateway health](/zh-Hant/gateway/health) 中的 CLI 流程 (`openclaw status`, `openclaw status --deep`, `openclaw health --json`)，並監看 `/tmp/openclaw/openclaw-*.log` 以檢視 `web-heartbeat` / `web-reconnect`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
