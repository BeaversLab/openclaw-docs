---
summary: "圖片與媒體處理規則，適用於發送、閘道與代理回覆"
read_when:
  - Modifying media pipeline or attachments
title: "圖片與媒體支援"
---

# 圖片與媒體支援 (2025-12-05)

WhatsApp 頻道透過 **Baileys Web** 執行。此文件記錄了目前針對發送、閘道與代理回覆的媒體處理規則。

## 目標

- 透過 `openclaw message send --media` 發送附帶選用性標題的媒體。
- 允許來自網頁收件匣的自動回覆包含文字與媒體。
- 保持各類型限制合理且可預測。

## CLI 表面

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 為選用；僅發送媒體時標題可留空。
  - `--dry-run` 列印解析後的內容；`--json` 發出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 頻道行為

- 輸入：本地檔案路徑 **或** HTTP(S) URL。
- 流程：載入至 Buffer，偵測媒體類型，並建立正確的載荷：
  - **圖片：** 調整大小並重新壓縮為 JPEG（最大邊長 2048px），目標 `agents.defaults.mediaMaxMb`（預設 5 MB），上限 6 MB。
  - **音訊/語音/影片：** 直通最大 16 MB；音訊會以語音訊息發送（`ptt: true`）。
  - **文件：** 其他任何內容，最大 100 MB，並在可用時保留檔名。
- WhatsApp GIF 風格播放：發送帶有 `gifPlayback: true` 的 MP4（CLI：`--gif-playback`），讓行動用戶端內聯循環播放。
- MIME 偵測優先使用魔術字節，然後是標頭，最後是副檔名。
- 標題來自 `--message` 或 `reply.text`；允許空標題。
- 日誌記錄：非詳細模式顯示 `↩️`/`✅`；詳細模式包含大小和來源路徑/URL。

## 自動回覆管道

- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 當存在媒體時，Web 發送者使用與 `openclaw message send` 相同的管道解析本地路徑或 URL。
- 如果提供了多個媒體項目，將會依序發送。

## 傳入媒體轉換至指令 (Pi)

- 當傳入 Web 訊息包含媒體時，OpenClaw 會下載至暫存檔案並公開樣板變數：
  - `{{MediaUrl}}` 傳入媒體的偽 URL。
  - `{{MediaPath}}` 執行指令前寫入的本地暫存路徑。
- 當啟用每個會話 Docker 沙箱時，傳入的媒體會複製到沙箱工作空間中，且 `MediaPath`/`MediaUrl` 會被重寫為類似 `media/inbound/<filename>` 的相對路徑。
- 媒體理解（如果透過 `tools.media.*` 或共用的 `tools.media.models` 進行配置）會在樣板化之前運行，並可以將 `[Image]`、`[Audio]` 和 `[Video]` 區塊插入 `Body` 中。
  - 音訊會設定 `{{Transcript}}` 並使用文字稿進行指令解析，因此斜線指令仍然有效。
  - 影片和圖像描述會保留任何標題文字以進行指令解析。
- 預設情況下，僅處理第一個符合的圖像/音訊/影片附件；請設定 `tools.media.<cap>.attachments` 以處理多個附件。

## 限制與錯誤

**外傳傳送上限（WhatsApp Web 傳送）**

- 圖片：重新壓縮後約 6 MB 上限。
- 音訊/語音/影片：16 MB 上限；文件：100 MB 上限。
- 過大或無法讀取的媒體 → 記錄檔中會出現清晰的錯誤訊息，並跳過回覆。

**媒體理解上限（轉錄/描述）**

- 圖片預設：10 MB (`tools.media.image.maxBytes`)。
- 音訊預設：20 MB (`tools.media.audio.maxBytes`)。
- 影片預設：50 MB (`tools.media.video.maxBytes`)。
- 過大的媒體會跳過理解步驟，但仍會使用原始內容進行回覆。

## 測試注意事項

- 涵蓋圖片/音訊/文件案例的傳送 + 回覆流程。
- 驗證圖片的重新壓縮（大小限制）和音訊的語音備忘錄標記。
- 確保多媒體回覆會展開為依序傳送。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
