---
summary: "針對發送、閘道與代理回覆的圖片與媒體處理規則"
read_when:
  - Modifying media pipeline or attachments
title: "圖片與媒體支援"
---

# 圖片與媒體支援 (2025-12-05)

WhatsApp 頻道透過 **Baileys Web** 執行。此文件記錄了目前針對發送、閘道與代理回覆的媒體處理規則。

## 目標

- 透過 `openclaw message send --media` 發送媒體與選用標題。
- 允許來自網頁收件匣的自動回覆包含媒體與文字。
- 讓各類型的限制保持合理且可預測。

## CLI 介面

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 選用；若僅發送媒體，標題可為空白。
  - `--dry-run` 會印出解析後的 payload；`--json` 則會發出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 頻道行為

- 輸入：本機檔案路徑 **或** HTTP(S) URL。
- 流程：載入至 Buffer、偵測媒體類型，並建立正確的 payload：
  - **圖片：** 調整大小並重新壓縮為 JPEG (最大邊長 2048px)，目標大小為 `channels.whatsapp.mediaMaxMb` (預設：50 MB)。
  - **音訊/語音/影片：** 直接傳遞，最大 16 MB；音訊會以語音訊息形式發送 (`ptt: true`)。
  - **文件：** 其他任何類型，最大 100 MB，並在可用時保留檔名。
- WhatsApp 風格的 GIF 播放：傳送帶有 `gifPlayback: true` (CLI：`--gif-playback`) 的 MP4，讓行動客戶端能以內嵌方式迴圈播放。
- MIME 偵測優先使用 magic bytes，其次為標頭，最後為副檔名。
- 標題來自 `--message` 或 `reply.text`；允許空白標題。
- 日誌：非詳細模式顯示 `↩️`/`✅`；詳細模式則包含大小與來源路徑/URL。

## 自動回覆管線

- `getReplyFromConfig` 會回傳 `{ text?, mediaUrl?, mediaUrls? }`。
- 當存在媒體時，網頁發送器會使用與 `openclaw message send` 相同的管線來解析本機路徑或 URL。
- 若提供多個媒體項目，將會依序發送。

## 傳入媒體至指令 (Pi)

- 當傳入的網頁訊息包含媒體時，OpenClaw 會將其下載至暫存檔並公開範本變數：
  - `{{MediaUrl}}` 傳入媒體的偽 URL。
  - `{{MediaPath}}` 在執行命令之前寫入的本機臨時路徑。
- 當啟用每個會話的 Docker 沙箱時，傳入媒體會被複製到沙箱工作區，並且 `MediaPath`/`MediaUrl` 會被重寫為類似 `media/inbound/<filename>` 的相對路徑。
- 媒體理解（如果透過 `tools.media.*` 或共用的 `tools.media.models` 配置）會在模板化之前執行，並且可以將 `[Image]`、`[Audio]` 和 `[Video]` 區塊插入 `Body` 中。
  - 音訊設定 `{{Transcript}}` 並使用轉錄文字進行指令解析，因此斜線指令仍然有效。
  - 影片和圖片描述會保留任何標題文字用於指令解析。
- 預設情況下，僅處理第一個符合的圖片/音訊/影片附件；設定 `tools.media.<cap>.attachments` 以處理多個附件。

## 限制與錯誤

**傳送限制 (WhatsApp Web 傳送)**

- 圖片：重新壓縮後最大 `channels.whatsapp.mediaMaxMb` (預設值：50 MB)。
- 音訊/語音/影片：16 MB 限制；文件：100 MB 限制。
- 過大或無法讀取的媒體 → 記錄檔中會有清楚的錯誤訊息，並且會略過回覆。

**媒體理解限制 (轉錄/描述)**

- 圖片預設值：10 MB (`tools.media.image.maxBytes`)。
- 音訊預設值：20 MB (`tools.media.audio.maxBytes`)。
- 影片預設值：50 MB (`tools.media.video.maxBytes`)。
- 過大的媒體會略過理解，但回覆仍會隨原始內容繼續執行。

## 測試注意事項

- 涵蓋圖片/音訊/文件案例的傳送 + 回覆流程。
- 驗證圖片的重新壓縮 (大小限制) 和音訊的語音備忘錄標誌。
- 確保多媒體回覆會展開為連續傳送。
