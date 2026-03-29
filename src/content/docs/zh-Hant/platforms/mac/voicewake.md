---
summary: "mac app 中的語音喚醒和按住講話模式以及路由詳情"
read_when:
  - Working on voice wake or PTT pathways
title: "語音喚醒 (macOS)"
---

# 語音喚醒與按住講話

## 模式

- **喚醒詞模式** (預設)：常駐的語音辨識器等待觸發權杖 (`swabbleTriggerWords`)。匹配時開始錄製，顯示包含部分文字的覆蓋層，並在靜音後自動發送。
- **按住講話 (長按右 Option 鍵)**：按住右 Option 鍵立即錄製 — 不需要觸發詞。按住時顯示覆蓋層；放開後會短暫延遲以微調文字，然後完成並轉發。

## 執行時期行為 (喚醒詞)

- 語音辨識器存在於 `VoiceWakeRuntime` 中。
- 觸發僅在喚醒詞和下一個詞之間有**有意義的暫停**時觸發 (~0.55s 間隔)。覆蓋層/提示音可以在暫停時開始，甚至命令開始之前。
- 靜音視窗：語音進行時為 2.0s，若僅聽到觸發詞則為 5.0s。
- 強制停止：120s 以防止失控的會話。
- 會話之間的防彈跳：350ms。
- 覆蓋層透過 `VoiceWakeOverlayController` 驅動，並帶有已提交/揮發性著色。
- 發送後，辨識器會乾淨地重新啟動以聆聽下一個觸發詞。

## 生命週期不變性

- 如果啟用了語音喚醒並授予了權限，喚醒詞辨識器應該正在聆聽 (除了在明確的按住講話錄製期間)。
- 覆蓋層的可見性 (包括透過 X 按鈕手動關閉) 絕不能阻止辨識器恢復。

## 黏性覆蓋層失敗模式 (先前)

先前，如果覆蓋層卡住顯示而您手動關閉它，語音喚醒可能會顯示「死機」，因為執行時的重新啟動嘗試可能被覆蓋層可見性阻止，且未安排後續重新啟動。

強化：

- 喚醒執行時重新啟動不再被覆蓋層可見性阻止。
- 覆蓋層關閉完成會透過 `VoiceSessionCoordinator` 觸發 `VoiceWakeRuntime.refresh(...)`，因此手動 X 關閉總是會恢復聆聽。

## 按住講話細節

- 快速鍵偵測使用全域 `.flagsChanged` 監視器來監控 **右 Option** (`keyCode 61` + `.option`)。我們僅觀察事件 (不吞噬)。
- Capture pipeline lives in `VoicePushToTalk`: starts Speech immediately, streams partials to the overlay, and calls `VoiceWakeForwarder` on release.
- When push-to-talk starts we pause the wake-word runtime to avoid dueling audio taps; it restarts automatically after release.
- Permissions: requires Microphone + Speech; seeing events needs Accessibility/Input Monitoring approval.
- External keyboards: some may not expose right Option as expected—offer a fallback shortcut if users report misses.

## User-facing settings

- **Voice Wake** toggle: enables wake-word runtime.
- **Hold Cmd+Fn to talk**: enables the push-to-talk monitor. Disabled on macOS < 26.
- Language & mic pickers, live level meter, trigger-word table, tester (local-only; does not forward).
- Mic picker preserves the last selection if a device disconnects, shows a disconnected hint, and temporarily falls back to the system default until it returns.
- **Sounds**: chimes on trigger detect and on send; defaults to the macOS “Glass” system sound. You can pick any `NSSound`-loadable file (e.g. MP3/WAV/AIFF) for each event or choose **No Sound**.

## Forwarding behavior

- When Voice Wake is enabled, transcripts are forwarded to the active gateway/agent (the same local vs remote mode used by the rest of the mac app).
- Replies are delivered to the **last-used main provider** (WhatsApp/Telegram/Discord/WebChat). If delivery fails, the error is logged and the run is still visible via WebChat/session logs.

## Forwarding payload

- `VoiceWakeForwarder.prefixedTranscript(_:)` prepends the machine hint before sending. Shared between wake-word and push-to-talk paths.

## Quick verification

- Toggle push-to-talk on, hold Cmd+Fn, speak, release: overlay should show partials then send.
- While holding, menu-bar ears should stay enlarged (uses `triggerVoiceEars(ttl:nil)`); they drop after release.
