---
summary: "OpenClaw 在 macOS 上的選單列圖示狀態與動畫"
read_when:
  - 變更選單列圖示行為
title: "選單列圖示"
---

# 選單列圖示狀態

作者：steipete · 更新於：2025-12-06 · 範圍：macOS app (`apps/macos`)

- **閒置：** 正常圖示動畫（閃爍、偶爾擺動）。
- **已暫停：** 狀態項目使用 `appearsDisabled`；無動作。
- **語音觸發（大耳朵）：** 當聽到喚醒詞時，語音喚醒偵測器會呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在捕捉語音時維持 `earBoostActive=true`。耳朵會放大（1.9 倍），為了可讀性會出現圓形耳孔，然後在 1 秒的靜音後透過 `stopVoiceEars()` 回落。僅由應用程式內的語音管線觸發。
- **工作中（Agent 執行中）：** `AppState.isWorking=true` 驅動「尾巴/腿部疾跑」的微動作：工作進行中時腿部擺動較快且略為偏移。目前是圍繞 WebChat Agent 執行進行切換；當您連接其他長時間任務時，請加入相同的切換邏輯。

連接點

- 語音喚醒：runtime/tester 在觸發時呼叫 `AppState.triggerVoiceEars(ttl: nil)`，並在 1 秒靜音後呼叫 `stopVoiceEars()`，以符合捕捉視窗。
- Agent 活動：在工作範圍周圍設定 `AppStateStore.shared.setWorking(true/false)`（在 WebChat Agent 呼叫中已完成）。保持範圍短暫，並在 `defer` 區塊中重置，以避免動畫卡住。

形狀與尺寸

- 基本圖示繪製於 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`。
- 耳朵縮放預設為 `1.0`；語音增強設定 `earScale=1.9` 並切換 `earHoles=true`，且不改變整體框架（18×18 pt 的範本影像渲染至 36×36 px 的 Retina 背景儲存區）。
- 急跑使用高達 ~1.0 的腿部擺動並伴隨輕微的水平抖動；這會加到任何現有的閒置擺動上。

行為備註

- 耳朵/執行中沒有外部 CLI/broker 切換；保持其為應用程式自身信號的內部邏輯，以避免意外切換。
- 保持 TTL 短暫（&lt;10s），以便在工作當機時圖示能快速回到基準。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
