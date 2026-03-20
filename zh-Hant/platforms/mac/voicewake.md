---
summary: "mac app 中的語音喚醒及按壓對講模式與路由詳情"
read_when:
  - 正在處理語音喚醒或 PTT 路徑
title: "語音喚醒 (macOS)"
---

# Voice Wake & Push-to-Talk

## Modes

- **喚醒詞模式** (預設)：常駐的語音辨識器會等待觸發欖杖 (`swabbleTriggerWords`)。符合時開始錄音，顯示部分文字的覆蓋層，並在靜音後自動傳送。
- **Push-to-talk (Right Option hold)**: hold the right Option key to capture immediately—no trigger needed. The overlay appears while held; releasing finalizes and forwards after a short delay so you can tweak text.

## Runtime behavior (wake-word)

- 語音辨識器存在於 `VoiceWakeRuntime` 中。
- Trigger only fires when there’s a **meaningful pause** between the wake word and the next word (~0.55s gap). The overlay/chime can start on the pause even before the command begins.
- Silence windows: 2.0s when speech is flowing, 5.0s if only the trigger was heard.
- Hard stop: 120s to prevent runaway sessions.
- Debounce between sessions: 350ms.
- 覆蓋層是由 `VoiceWakeOverlayController` 驅動，並帶有已提交/易變的配色。
- After send, recognizer restarts cleanly to listen for the next trigger.

## Lifecycle invariants

- If Voice Wake is enabled and permissions are granted, the wake-word recognizer should be listening (except during an explicit push-to-talk capture).
- Overlay visibility (including manual dismiss via the X button) must never prevent the recognizer from resuming.

## Sticky overlay failure mode (previous)

Previously, if the overlay got stuck visible and you manually closed it, Voice Wake could appear “dead” because the runtime’s restart attempt could be blocked by overlay visibility and no subsequent restart was scheduled.

Hardening:

- Wake runtime restart is no longer blocked by overlay visibility.
- 覆蓋層關閉完成會透過 `VoiceSessionCoordinator` 觸發 `VoiceWakeRuntime.refresh(...)`，因此手動 X 關閉總是會恢復聆聽。

## Push-to-talk specifics

- 熱鍵偵測使用全域 `.flagsChanged` 監視器來偵測 **右 Option** (`keyCode 61` + `.option`)。我們只觀察事件 (不攔截)。
- 擷取管線存在於 `VoicePushToTalk` 中：立即啟動語音，將部分結果串流至覆蓋層，並在釋放時呼叫 `VoiceWakeForwarder`。
- 當按下對講鍵啟動時，我們會暫停喚醒詞執行階段以避免音訊輸入衝突；它會在放開後自動重新啟動。
- 權限：需要麥克風 + 語音；查看事件需要輔助功能/輸入監控的批准。
- 外接鍵盤：部分可能不會如預期般公開右側 Option 鍵——如果使用者回報未觸發，請提供備用捷徑。

## 使用者設定

- **Voice Wake** 切換開關：啟用喚醒詞執行階段。
- **Hold Cmd+Fn to talk**：啟用按住對講監控器。在 macOS < 26 上停用。
- 語言與麥克風選擇器、即時音量表、觸發詞表格、測試器（僅限本機；不會轉發）。
- 麥克風選擇器會在裝置中斷連線時保留最後的選擇，顯示已中斷連線的提示，並暫時回退至系統預設值直到其恢復。
- **音效**：偵測到觸發與傳送時會發出提示音；預設為 macOS 的「Glass」系統音效。您可以為每個事件選擇任何 `NSSound` 可載入的檔案 (例如 MP3/WAV/AIFF) 或選擇 **無音效**。

## 轉發行為

- 啟用 Voice Wake 時，轉錄內容會轉發至作用中的閘道/代理（與 mac app 其餘部分使用的本機與遠端模式相同）。
- 回覆會傳送至 **最後使用的主要提供者**（WhatsApp/Telegram/Discord/WebChat）。如果傳送失敗，錯誤會被記錄下來，且該次執行仍可透過 WebChat/工作階段記錄檔查看。

## 轉發負載

- `VoiceWakeForwarder.prefixedTranscript(_:)` 會在傳送前預先加上機器提示。此功能在喚醒詞與按壓對講路徑之間共用。

## 快速驗證

- 開啟按住對講，按住 Cmd+Fn，說話，放開：覆蓋層應顯示部分結果然後發送。
- 按住時，選單列耳朵應保持放大 (使用 `triggerVoiceEars(ttl:nil)`)；釋放後會縮回。

import en from "/components/footer/en.mdx";

<en />
