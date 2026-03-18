---
summary: "當喚醒詞與按壓對話重疊時的語音覆疊生命週期"
read_when:
  - Adjusting voice overlay behavior
title: "Voice Overlay"
---

# Voice Overlay 生命週期 (macOS)

對象：macOS 應用程式貢獻者。目標：當喚醒詞和按壓對話重疊時，保持語音覆疊的行為可預測。

## 目前的意圖

- 如果覆疊視窗已因喚醒詞而顯示，且使用者按下熱鍵，熱鍵工作階段將會「接納」現有文字，而不是重置它。只要按住熱鍵，覆疊視窗就會保持顯示。當使用者放開時：如果有修剪過的文字則發送，否則關閉。
- 僅使用喚醒詞仍會在靜音時自動發送；按壓對話則在放開時立即發送。

## 已實作 (2025年12月9日)

- 覆疊工作階段現在會為每次擷取（喚醒詞或按壓對話）攜帶一個權杖。當權杖不符時，部分/最終/發送/關閉/音量更新會被捨棄，以避免過時的回呼。
- 按壓對話會將任何可見的覆疊文字作為前綴採用（因此當喚醒覆疊顯示時按下熱鍵會保留文字並附加新的語音內容）。它會等待最終轉錄文字最長 1.5 秒，之後才會回退至目前的文字。
- 提示音/覆疊記錄會在 `info` 發出，分類為 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime` (工作階段開始、部分、最終、發送、關閉、提示音原因)。

## 下一步

1. **VoiceSessionCoordinator (actor)**
   - 一次僅擁有一個 `VoiceSession`。
   - API (基於權杖)：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 捨棄攜帶過時權杖的回呼（防止舊的辨識器重新開啟覆疊）。
2. **VoiceSession (model)**
   - 欄位：`token`、`source` (wakeWord|pushToTalk)、已認可/揮發性文字、提示音旗標、計時器 (自動發送、閒置)、`overlayMode` (display|editing|sending)、冷卻期限。
3. **覆疊綁定**
   - `VoiceSessionPublisher` (`ObservableObject`) 將活動工作階段映射到 SwiftUI。
   - `VoiceWakeOverlayView` 僅透過發佈者渲染；它從不直接變更全域單例。
   - Overlay 使用者操作 (`sendNow`、`dismiss`、`edit`) 會使用 session token 回呼到協調器。
4. **統一發送路徑**
   - 在 `endCapture` 上：如果去除空白後的文字為空 → 解除；否則 `performSend(session:)` (播放發送提示音一次、轉發、解除)。
   - 按住講話：無延遲；喚醒詞：自動發送的選用延遲。
   - 在按住講話結束後對喚醒執行時間套用短暫冷卻，以免喚醒詞立即重新觸發。
5. **日誌記錄**
   - 協調器在 subsystem `ai.openclaw` 中發出 `.info` 日誌，類別為 `voicewake.overlay` 和 `voicewake.chime`。
   - 關鍵事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 除錯檢查清單

- 在重現卡住的 overlay 時串流日誌：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 驗證只有一個作用中的 session token；過時的回呼應由協調器捨棄。
- 確保按住講話放開時總是使用作用中的 token 呼叫 `endCapture`；如果文字為空，預期會有 `dismiss` 而沒有提示音或發送。

## 遷移步驟 (建議)

1. 新增 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重構 `VoiceWakeRuntime` 以建立/更新/結束 sessions，而不是直接觸碰 `VoiceWakeOverlayController`。
3. 重構 `VoicePushToTalk` 以採用現有的 sessions 並在放開時呼叫 `endCapture`；套用執行時間冷卻。
4. 將 `VoiceWakeOverlayController` 連結至發佈者；移除來自 runtime/PTT 的直接呼叫。
5. 新增 session 採用、冷卻和空文字解除的整合測試。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
