---
summary: "當喚醒詞與按鍵交談重疊時的語音覆蓋生命週期"
read_when:
  - Adjusting voice overlay behavior
title: "語音覆蓋"
---

# 語音覆蓋生命週期

對象：macOS 應用程式貢獻者。目標：當喚醒詞與按鍵交談同時發生時，保持語音覆蓋的可預測性。

## 目前的設計意圖

- 如果覆蓋層已因喚醒詞顯示，且使用者按下熱鍵，熱鍵階段會*沿用*現有文字而非重設它。當熱鍵按住時，覆蓋層會保持顯示。當使用者放開時：如果有去頭去尾後的文字則發送，否則關閉。
- 單獨使用喚醒詞仍會在靜默時自動發送；按鍵交談則在放開時立即發送。

## 已實作 (2025 年 12 月 9 日)

- Overlay sessions 現在會為每次擷取（喚醒詞或按壓對講）攜帶一個 token。當 token 不符合時，部分/最終/傳送/關閉/層級更新會被捨棄，以避免過期的回呼。
- 按壓對講會採用任何可見的 overlay 文字作為前綴（因此在喚醒 overlay 顯示時按下熱鍵會保留文字並附加新的語音）。它會等待最多 1.5 秒以取得最終轉錄文字，之後才會回退至目前的文字。
- Chime/overlay logging 是在 `info` 發出的，類別為 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime`（session 啟動、部分、最終、傳送、關閉、chime 原因）。

## Next steps

1. **VoiceSessionCoordinator (actor)**
   - 一次只擁有一個 `VoiceSession`。
   - API（基於 Token）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丟棄帶有過時 Token 的回呼（防止舊的識別器重新開啟覆蓋層）。
2. **VoiceSession（模型）**
   - 欄位：`token`、`source`（wakeWord|pushToTalk）、已認可/可變文字、提示音旗標、計時器（自動傳送、閒置）、`overlayMode`（display|editing|sending）、冷卻期限。
3. **覆蓋層綁定**
   - `VoiceSessionPublisher`（`ObservableObject`）將作用中的會話映射到 SwiftUI。
   - `VoiceWakeOverlayView` 僅透過發布器呈現；它從不直接變更全域單例。
   - Overlay 使用者操作（`sendNow`、`dismiss`、`edit`）會使用 session token 回呼到 coordinator。
4. **統一傳送路徑**
   - 在 `endCapture` 上：如果修剪後的文字為空 → 關閉；否則 `performSend(session:)`（播放傳送提示音一次，轉發，關閉）。
   - 按壓對講：無延遲；喚醒詞：自動傳送的選用延遲。
   - 在按壓對講完成後，對喚醒執行階段套用短暫的冷卻時間，以免喚醒詞立即再次觸發。
5. **日誌記錄**
   - Coordinator 在子系統 `ai.openclaw`、類別 `voicewake.overlay` 和 `voicewake.chime` 中發出 `.info` 日誌。
   - 關鍵事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 除錯檢查清單

- 重現持續顯示的疊加層時，即時串流日誌：

  ```exec
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 驗證只有一個作用中的 session token；過期的 callback 應該由協調器捨棄。
- 確保放開按住即時通話時總是使用作用中的 token 呼叫 `endCapture`；如果文字為空，預期會有 `dismiss` 且不會有提示音或發送。

## 移駐步驟（建議）

1. 加入 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重構 `VoiceWakeRuntime` 以建立/更新/結束工作階段，而不是直接操作 `VoiceWakeOverlayController`。
3. 重構 `VoicePushToTalk` 以採用現有的工作階段並在釋放時呼叫 `endCapture`；套用執行時冷卻。
4. 將 `VoiceWakeOverlayController` 連接至發布者；移除來自執行時/PTT 的直接呼叫。
5. 針對工作階段採用、冷卻和空白文字關閉新增整合測試。
