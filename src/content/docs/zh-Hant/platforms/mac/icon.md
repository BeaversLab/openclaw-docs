---
summary: "OpenClaw 在 macOS 上的選單列圖示狀態與動畫"
read_when:
  - Changing menu bar icon behavior
title: "選單列圖示"
---

# 選單列圖示狀態

作者：steipete · 更新：2025-12-06 · 範圍：macOS app (`apps/macos`)

- **閒置：** 正常的圖示動畫（閃爍、偶爾搖晃）。
- **暫停：** 狀態項目使用 `appearsDisabled`；無動態。
- **語音觸發（大耳朵）：** 當聽到喚醒詞時，語音喚醒偵測器會呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在捕捉語音時保持 `earBoostActive=true`。耳朵會放大（1.9 倍），為了可讀性變成圓形耳洞，然後在 1 秒靜音後透過 `stopVoiceEars()` 恢復。僅由應用程式內的語音管線觸發。
- **Working (agent running):** `AppState.isWorking=true` 驱動“尾/腿疾走”微動作：當工作進行時，腿部擺動更快並且有輕微偏移。目前圍繞 WebChat agent 運行切換；當您連接其他長任務時，請添加相同的切換。

連接點

- Voice wake：觸發時 runtime/tester 呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在靜音 1 秒後呼叫 `stopVoiceEars()` 以符合捕獲視窗。
- Agent activity：在工作跨度周圍設定 `AppStateStore.shared.setWorking(true/false)`（已在 WebChat agent 呼叫中完成）。保持跨度簡短，並在 `defer` 區塊中重置，以避免動畫卡住。

形狀與尺寸

- 基本圖示繪製於 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 中。
- 耳部縮放預設為 `1.0`；語音增強設定 `earScale=1.9` 並切換 `earHoles=true`，而不會改變整體邊框（將 18×18 pt 樣板圖像渲染到 36×36 px Retina 背景儲存區中）。
- Scurry 使用腿部擺動至 ~1.0，並伴隨輕微的水平抖動；這是疊加在任何現有閒置擺動之上的。

行為註記

- 沒有用於耳朵/工作狀態的外部 CLI/broker 切換開關；將其保持在應用程式自身訊號內部，以避免意外翻動。
- 保持 TTL 短暫（&lt;10s），以便如果作業掛起，圖示能快速恢復至基線。
