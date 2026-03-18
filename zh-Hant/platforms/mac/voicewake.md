---
summary: "Voice wake and push-to-talk modes plus routing details in the mac app"
read_when:
  - Working on voice wake or PTT pathways
title: "Voice Wake"
---

# Voice Wake & Push-to-Talk

## Modes

- **Wake-word mode** (default): always-on Speech recognizer waits for trigger tokens (`swabbleTriggerWords`). On match it starts capture, shows the overlay with partial text, and auto-sends after silence.
- **Push-to-talk (Right Option hold)**: hold the right Option key to capture immediately—no trigger needed. The overlay appears while held; releasing finalizes and forwards after a short delay so you can tweak text.

## Runtime behavior (wake-word)

- Speech recognizer lives in `VoiceWakeRuntime`.
- Trigger only fires when there’s a **meaningful pause** between the wake word and the next word (~0.55s gap). The overlay/chime can start on the pause even before the command begins.
- Silence windows: 2.0s when speech is flowing, 5.0s if only the trigger was heard.
- Hard stop: 120s to prevent runaway sessions.
- Debounce between sessions: 350ms.
- Overlay is driven via `VoiceWakeOverlayController` with committed/volatile coloring.
- After send, recognizer restarts cleanly to listen for the next trigger.

## Lifecycle invariants

- If Voice Wake is enabled and permissions are granted, the wake-word recognizer should be listening (except during an explicit push-to-talk capture).
- Overlay visibility (including manual dismiss via the X button) must never prevent the recognizer from resuming.

## Sticky overlay failure mode (previous)

Previously, if the overlay got stuck visible and you manually closed it, Voice Wake could appear “dead” because the runtime’s restart attempt could be blocked by overlay visibility and no subsequent restart was scheduled.

Hardening:

- Wake runtime restart is no longer blocked by overlay visibility.
- Overlay dismiss completion triggers a `VoiceWakeRuntime.refresh(...)` via `VoiceSessionCoordinator`, so manual X-dismiss always resumes listening.

## Push-to-talk specifics

- Hotkey detection uses a global `.flagsChanged` monitor for **right Option** (`keyCode 61` + `.option`). We only observe events (no swallowing).
- 捕獲管線位於 `VoicePushToTalk`：立即啟動語音識別，將部分結果串流至覆蓋層，並在放開時呼叫 `VoiceWakeForwarder`。
- 當按下對講鍵啟動時，我們會暫停喚醒詞執行階段以避免音訊輸入衝突；它會在放開後自動重新啟動。
- 權限：需要麥克風 + 語音；查看事件需要輔助功能/輸入監控的批准。
- 外接鍵盤：部分可能不會如預期般公開右側 Option 鍵——如果使用者回報未觸發，請提供備用捷徑。

## 使用者設定

- **Voice Wake** 切換開關：啟用喚醒詞執行階段。
- **Hold Cmd+Fn to talk**：啟用按住對講監控器。在 macOS < 26 上停用。
- 語言與麥克風選擇器、即時音量表、觸發詞表格、測試器（僅限本機；不會轉發）。
- 麥克風選擇器會在裝置中斷連線時保留最後的選擇，顯示已中斷連線的提示，並暫時回退至系統預設值直到其恢復。
- **Sounds**：在偵測到觸發和發送時播放提示音；預設為 macOS “Glass” 系統音效。您可以為每個事件選擇任何 `NSSound` 可載入的檔案（例如 MP3/WAV/AIFF），或選擇 **No Sound**。

## 轉發行為

- 啟用 Voice Wake 時，轉錄內容會轉發至作用中的閘道/代理（與 mac app 其餘部分使用的本機與遠端模式相同）。
- 回覆會傳送至 **最後使用的主要提供者**（WhatsApp/Telegram/Discord/WebChat）。如果傳送失敗，錯誤會被記錄下來，且該次執行仍可透過 WebChat/工作階段記錄檔查看。

## 轉發負載

- `VoiceWakeForwarder.prefixedTranscript(_:)` 會在發送前前置機器提示。此機制在喚醒詞與按住對講路徑之間共享。

## 快速驗證

- 開啟按住對講，按住 Cmd+Fn，說話，放開：覆蓋層應顯示部分結果然後發送。
- 按住時，選單列圖示應保持放大（使用 `triggerVoiceEars(ttl:nil)`）；放開後會恢復。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
