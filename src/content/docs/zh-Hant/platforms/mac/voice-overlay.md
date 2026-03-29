---
summary: "當喚醒詞與按住講話重疊時的語音覆蓋層生命週期"
read_when:
  - Adjusting voice overlay behavior
title: "Voice Overlay"
---

# Voice Overlay 生命週期 (macOS)

目標受眾：macOS 應用程式貢獻者。目標：在喚醒詞與按住講話重疊時，保持語音覆蓋層的行為可預測。

## 目前的預期行為

- 如果覆蓋層已因喚醒詞顯示，且使用者按下熱鍵，熱鍵工作階段將*沿用*現有文字，而非重置它。按住熱鍵時，覆蓋層會保持顯示。當使用者放開熱鍵時：如果有修剪後的文字則發送，否則關閉覆蓋層。
- 僅使用喚醒詞仍會在靜音時自動發送；按住講話則在放開時立即發送。

## 已實作 (2025年12月9日)

- 覆蓋層工作階段現在會為每次擷取（喚醒詞或按住講話）攜帶一個權杖。當權杖不匹配時，會捨棄部分/最終/發送/關閉/音量更新，以避免過時的回呼。
- 按住講話會將任何可見的覆蓋層文字作為前綴（因此在喚醒覆蓋層顯示時按下熱鍵，會保留文字並附加新的語音）。在回退至目前文字之前，它會等待最多 1.5 秒以取得最終轉錄結果。
- 提示音/覆蓋層日誌會在 `info` 發出，分類為 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime`（工作階段開始、部分、最終、發送、關閉、提示音原因）。

## 後續步驟

1. **VoiceSessionCoordinator (actor)**
   - 一次僅擁有一個 `VoiceSession`。
   - API (基於權杖)：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 捨棄攜帶過時權杖的回呼（防止舊的辨識器重新開啟覆蓋層）。
2. **VoiceSession (model)**
   - 欄位：`token`、`source` (wakeWord|pushToTalk)、已認可/變動文字、提示音旗標、計時器 (自動發送、閒置)、`overlayMode` (display|editing|sending)、冷卻截止時間。
3. **覆蓋層綁定**
   - `VoiceSessionPublisher` (`ObservableObject`) 將作用中的工作階段鏡像到 SwiftUI。
   - `VoiceWakeOverlayView` 僅透過發佈器渲染；它從不直接變更全域單例。
   - Overlay 使用者動作（`sendNow`、`dismiss`、`edit`）會使用 session token 回呼協調器。
4. **統一傳送路徑**
   - 在 `endCapture` 上：如果修剪後的文字為空 → 解除；否則 `performSend(session:)`（播放傳送提示音一次、轉發、解除）。
   - Push-to-talk：無延遲；wake-word：自動傳送的可選延遲。
   - 在 push-to-talk 結束後，對 wake runtime 套用短暫的冷卻時間，以免 wake-word 立即重新觸發。
5. **日誌記錄**
   - 協調器在子系統 `ai.openclaw`、類別 `voicewake.overlay` 和 `voicewake.chime` 中發出 `.info` 日誌。
   - 關鍵事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 除錯檢查清單

- 在重現卡住的 overlay 時串流日誌：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 驗證只有一個啟用的 session token；過期的回呼應被協調器捨棄。
- 確保 push-to-talk 釋放時總是使用啟用的 token 呼叫 `endCapture`；如果文字為空，預期 `dismiss` 不會有提示音或傳送動作。

## 遷移步驟（建議）

1. 新增 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重構 `VoiceWakeRuntime` 以建立/更新/結束 sessions，而非直接存取 `VoiceWakeOverlayController`。
3. 重構 `VoicePushToTalk` 以採用現有的 sessions 並在釋放時呼叫 `endCapture`；套用 runtime 冷卻。
4. 將 `VoiceWakeOverlayController` 連接到發佈器；移除來自 runtime/PTT 的直接呼叫。
5. 新增 session 採用、冷卻和空文字解除的整合測試。
