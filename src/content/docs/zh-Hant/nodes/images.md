---
summary: "針對發送、閘道與代理回覆的圖片與媒體處理規則"
read_when:
  - Modifying media pipeline or attachments
title: "圖片與媒體支援"
---

WhatsApp 頻道透過 **Baileys Web** 運作。此文件記錄了目前針對發送、閘道以及代理回覆的媒體處理規則。

## 目標

- 透過 `openclaw message send --media` 發送媒體並附上可選的標題文字。
- 允許來自 Web 收件匣的自動回覆包含媒體與文字。
- 保持各類型的限制合理且可預測。

## CLI 介面

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 為選用；對於僅發送媒體的情況，標題可以為空。
  - `--dry-run` 會列印解析後的 payload；`--json` 則發出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 頻道行為

- 輸入：本機檔案路徑 **或** HTTP(S) URL。
- 流程：載入至 Buffer、偵測媒體種類，並建立正確的 payload：
  - **圖片：**調整大小並重新壓縮為 JPEG (最大邊長 2048px)，目標大小為 `channels.whatsapp.mediaMaxMb` (預設：50 MB)。
  - **音訊/語音/影片：**直接傳遞最大 16 MB；音訊會以語音訊息 (`ptt: true`) 形式發送。
  - **文件：**任何其他類型，最大 100 MB，並在可用時保留檔案名稱。
- WhatsApp GIF 風格播放：傳送帶有 `gifPlayback: true` (CLI：`--gif-playback`) 的 MP4，以便行動用戶端能內嵌迴圈播放。
- MIME 偵測優先使用 magic bytes，其次是標頭，最後是副檔名。
- 標題來自 `--message` 或 `reply.text`；允許空標題。
- 日誌記錄：非詳細模式顯示 `↩️`/`✅`；詳細模式則包含大小與來源路徑/URL。

## 自動回覆流程

- `getReplyFromConfig` 會回傳 `{ text?, mediaUrl?, mediaUrls? }`。
- 當存在媒體時，Web 發送器會使用與 `openclaw message send` 相同的流程來解析本機路徑或 URL。
- 若提供多個媒體項目，將會依序發送。

## 傳入媒體到指令

- 當傳入的 Web 訊息包含媒體時，OpenClaw 會將其下載至暫存檔，並公開範本變數：
  - `{{MediaUrl}}` 用於傳入媒體的偽 URL。
  - `{{MediaPath}}` 執行指令前寫入的本機暫存路徑。
- 當啟用每個會話 Docker 沙箱時，傳入的媒體會被複製到沙箱工作區，並且 `MediaPath`/`MediaUrl` 會被重寫為相對路徑，例如 `media/inbound/<filename>`。
- 媒體理解（如果透過 `tools.media.*` 或共享的 `tools.media.models` 進行配置）會在樣板處理之前運行，並且可以將 `[Image]`、`[Audio]` 和 `[Video]` 區塊插入 `Body` 中。
  - 音訊會設定 `{{Transcript}}` 並使用轉錄文字進行指令解析，因此斜線指令仍然有效。
  - 影片和圖片描述會保留任何標題文字用於指令解析。
  - 如果使用中的主要圖片模型本身已經支援視覺能力，OpenClaw 會跳過 `[Image]` 摘要區塊，改為將原始圖片傳遞給模型。
- 預設情況下，只有第一個符合的圖片/音訊/影片附件會被處理；設定 `tools.media.<cap>.attachments` 以處理多個附件。

## 限制與錯誤

**傳送限制（WhatsApp Web 傳送）**

- 圖片：重新壓縮後最大 `channels.whatsapp.mediaMaxMb`（預設：50 MB）。
- 音訊/語音/影片：上限 16 MB；文件：上限 100 MB。
- 過大或無法讀取的媒體 → 記錄檔中會顯示清楚的錯誤，並且該回覆會被跳過。

**媒體理解限制（轉錄/描述）**

- 圖片預設值：10 MB（`tools.media.image.maxBytes`）。
- 音訊預設值：20 MB（`tools.media.audio.maxBytes`）。
- 影片預設值：50 MB（`tools.media.video.maxBytes`）。
- 過大的媒體會跳過理解步驟，但回覆仍會使用原始內容繼續執行。

## 測試注意事項

- 涵蓋圖片/音訊/文件案例的傳送 + 回覆流程。
- 驗證圖片的重新壓縮（大小限制）和音訊的語音備忘錄旗標。
- 確保多媒體回覆會分散為依序傳送。

## 相關

- [相機擷取](/zh-Hant/nodes/camera)
- [媒體理解](/zh-Hant/nodes/media-understanding)
- [音訊和語音備忘錄](/zh-Hant/nodes/audio)
