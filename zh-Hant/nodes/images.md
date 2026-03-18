---
summary: "用於發送、閘道和代理回覆的圖像與媒體處理規則"
read_when:
  - Modifying media pipeline or attachments
title: "圖像與媒體支援"
---

# 圖像與媒體支援 — 2025-12-05

WhatsApp 頻道透過 **Baileys Web** 運行。此文件記錄了目前發送、閘道和代理回覆的媒體處理規則。

## 目標

- 透過 `openclaw message send --media` 發送媒體並附帶可選標題。
- 允許來自網頁收件匣的自動回覆包含媒體與文字。
- 保持各類型限制的合理與可預測性。

## CLI 介面

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 為選填；僅發送媒體時標題可留空。
  - `--dry-run` 會印出解析後的 payload；`--json` 會發出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 頻道行為

- 輸入：本地檔案路徑 **或** HTTP(S) URL。
- 流程：載入至 Buffer、偵測媒體種類，並建立正確的 payload：
  - **圖像：** 調整大小並重新壓縮為 JPEG (最大邊長 2048px)，目標 `agents.defaults.mediaMaxMb` (預設 5 MB)，上限 6 MB。
  - **音訊/語音/影片：** 直通最大 16 MB；音訊會作為語音訊息傳送 (`ptt: true`)。
  - **文件：** 其他任何類型，最大 100 MB，並在可用時保留檔名。
- WhatsApp GIF 風格播放：傳送帶有 `gifPlayback: true` 的 MP4 (CLI: `--gif-playback`)，以便行動裝置用戶端內嵌迴圈播放。
- MIME 偵測優先使用魔術位元組，其次為標頭，最後為副檔名。
- 標題來自 `--message` 或 `reply.text`；允許空白標題。
- 日誌：非詳細模式顯示 `↩️`/`✅`；詳細模式包含大小與來源路徑/URL。

## 自動回覆管道

- `getReplyFromConfig` 回傳 `{ text?, mediaUrl?, mediaUrls? }`。
- 當存在媒體時，網頁發送者會使用與 `openclaw message send` 相同的管道來解析本地路徑或 URL。
- 若提供多個媒體項目，將依序發送。

## 傳入媒體至指令 (Pi)

- 當傳入的網頁訊息包含媒體時，OpenClaw 會下載至暫存檔並公開模板變數：
  - `{{MediaUrl}}` 用於傳入媒體的偽 URL。
  - `{{MediaPath}}` 執行命令前寫入的本機暫存路徑。
- 啟用每個工作階段的 Docker 沙箱後，傳入的媒體會複製到沙箱工作區，並且 `MediaPath`/`MediaUrl` 會被重寫為類似 `media/inbound/<filename>` 的相對路徑。
- 媒體理解（如果透過 `tools.media.*` 或共用的 `tools.media.models` 設定）會在範本處理之前執行，並且可以將 `[Image]`、`[Audio]` 和 `[Video]` 區塊插入 `Body` 中。
  - 音訊會設定 `{{Transcript}}` 並使用轉錄文字進行指令解析，因此斜線指令仍然有效。
  - 影片和圖片描述會保留任何標題文字以進行指令解析。
- 預設只會處理第一個符合的圖片/音訊/影片附件；請設定 `tools.media.<cap>.attachments` 以處理多個附件。

## 限制與錯誤

**傳出傳送上限 (WhatsApp Web 傳送)**

- 圖片：重新壓縮後約 6 MB 上限。
- 音訊/語音/影片：16 MB 上限；文件：100 MB 上限。
- 過大或無法讀取的媒體 → 記錄檔中會有明確錯誤，並且會略過回覆。

**媒體理解上限 (轉錄/描述)**

- 圖片預設值：10 MB (`tools.media.image.maxBytes`)。
- 音訊預設值：20 MB (`tools.media.audio.maxBytes`)。
- 影片預設值：50 MB (`tools.media.video.maxBytes`)。
- 過大的媒體會略過理解，但回覆仍會使用原始內容繼續進行。

## 測試注意事項

- 涵蓋圖片/音訊/文件案例的傳送 + 回覆流程。
- 驗證圖片的重新壓縮 (大小限制) 和音訊的語音訊息旗標。
- 確保多媒體回覆會依序分發為連續傳送。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
