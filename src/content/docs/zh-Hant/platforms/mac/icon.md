---
summary: "OpenClaw 在 macOS 上的選單列圖示狀態與動畫"
read_when:
  - Changing menu bar icon behavior
title: "選單列圖示"
---

# 選單列圖示狀態

作者：steipete · 更新：2025-12-06 · 範圍：macOS app (`apps/macos`)

- **閒置：** 正常的圖示動畫（閃爍、偶爾晃動）。
- **暫停：** 狀態項目使用 `appearsDisabled`；無動作。
- **語音觸發（大耳朵）：** 當聽到喚醒詞時，語音喚醒檢測器會呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在擷取語音時保持 `earBoostActive=true`。耳朵會放大（1.9 倍），圓形的耳孔會變得清晰易讀，然後在靜音 1 秒後透過 `stopVoiceEars()` 回復。僅由應用程式內的語音管線觸發。
- **運作中（代理程式執行）：** `AppState.isWorking=true` 驅動「尾巴/腿部急跑」的微動作：在工作進行中時，腿部晃動速度加快並有輕微偏移。目前是圍繞 WebChat 代理程式執行進行切換；當您連接其他長時間任務時，請加入相同的切換邏輯。

連接點

- 語音喚醒：在觸發時 runtime/tester 呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在靜音 1 秒後呼叫 `stopVoiceEars()` 以符合擷取時間窗。
- 代理程式活動：在工作週圍設定 `AppStateStore.shared.setWorking(true/false)`（WebChat 代理程式呼叫中已完成）。保持週期短暫並在 `defer` 區塊中重置，以避免動畫卡住。

形狀與尺寸

- 基礎圖示繪製於 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 中。
- 耳朵縮放預設為 `1.0`；語音增強設定 `earScale=1.9` 並切換 `earHoles=true`，而不改變整體框架（18×18 pt 模板圖像渲染至 36×36 px Retina 後備存儲）。
- 急跑使用高達 ~1.0 的腿部晃動並伴有輕微的水平抖動；這會疊加到任何現有的閒置晃動上。

行為註記

- 沒有用於耳朵/運作中的外部 CLI/broker 切換；將其保留在應用程式自身的訊號內，以避免意外跳變。
- 保持 TTL 短暫（&lt;10 秒），以便如果工作掛起，圖示能快速回到基線。
