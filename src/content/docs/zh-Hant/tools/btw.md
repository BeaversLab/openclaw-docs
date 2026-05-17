---
summary: "使用 /btw 進行臨時提問"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 側向問題"
---

`/btw` 讓您詢問關於 **目前工作階段** 的快速附帶問題，而不會將該問題納入一般對話記錄中。`/side` 是一個別名。

它是仿照 Claude Code 的 `/btw` 行為建模的，但已調整以適應 OpenClaw 的 Gateway 和多通道架構。

## 運作方式

當您發送：

```text
/btw what changed?
```

OpenClaw：

1. 擷取目前會話上下文的快照，
2. 執行獨立的暫時性側邊查詢，
3. 僅回答側向問題，
4. 不干擾主要執行，
5. **不會** 將 BTW 問題或答案寫入會話歷史記錄，
6. 將答案作為 **即時側向結果** 發出，而不是一般的助理訊息。

重要的心智模型是：

- 相同的會話上下文
- 獨立的一次性側向查詢
- 當會話使用原生套接時，使用相同的原生套接傳輸
- 無未來上下文污染
- 無文字記錄持久性

對於 Codex 套接會話，BTW 透過將活躍的 app-server 執行緒分支為暫時性側邊執行緒，從而保持在 Codex 內部運作。這既保持了 Codex OAuth 和原生執行级行為的完整性，同時仍將側邊回答與父腳本隔離開來。就像 Codex `/side` 一樣，側邊執行緒保留了目前的 Codex 權限和原生工具介面，並配有防護機制，告知模型不要將繼承的父執行緒工作視為有效指令。非 Codex 執行時則保留較舊的直接一次性路徑。

## 不做的事項

`/btw` **不會**：

- 建立新的持久會話，
- 繼續未完成的主任務，
- 將 BTW 問題/答案資料寫入文字記錄歷史，
- 出現在 `chat.history` 中，
- 在重新載入後保留。

它是有意設計為 **暫時性** 的。

## 上下文運作方式

BTW 僅將目前會話作為 **背景上下文**。

如果主要執行目前處於活動狀態，OpenClaw 會擷取目前的訊息狀態，並將進行中的主要提示作為背景上下文包含在內，同時明確告知模型：

- 僅回答側向問題，
- 不要恢復或完成未完成的主要任務，
- 不會引導父對話。

這使 BTW 與主要執行保持隔離，同時仍讓其了解會話的內容。

## 交付模型

BTW **不會** 作為一般的助理文字記錄訊息傳送。

在 Gateway 協定層級：

- 正常的助理聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

這種分隔是有意為之的。如果 BTW 重用了正常的 `chat` 事件路徑，客戶端會將其視為常規的對話歷史記錄。

由於 BTW 使用單獨的即時事件，且不會從 `chat.history` 重新播放，因此它會在重新載入後消失。

## 表層行為

### TUI

在 TUI 中，BTW 會內聯呈現在當前會話視圖中，但它是暫時性的：

- 與正常的助理回覆有顯著區別
- 可透過 `Enter` 或 `Esc` 關閉
- 重新載入時不會重播

### 外部頻道

在 Telegram、WhatsApp 和 Discord 等頻道上，BTW 會作為標記清晰的一次性回覆發送，因為這些介面沒有本機暫時性疊加層的概念。

該答案仍被視為側邊結果，而非正常的會話記錄。

### 控制 UI / 網頁

Gateway 正確地將 BTW 發送為 `chat.side_result`，且 BTW 未包含在 `chat.history` 中，因此對於網頁而言，持久化合約已經正確。

目前的 Control UI 仍需要專屬的 `chat.side_result` 消費者，才能在瀏覽器中即時呈現 BTW。在該客戶端支援落地之前，BTW 是一個 Gateway 層級的功能，具有完整的 TUI 和外部通道行為，但還不是完整的瀏覽器 UX。

## 何時使用 BTW

當您想要以下內容時，請使用 `/btw`：

- 對當前工作進行快速釐清，
- 在長時間運行仍在進行時獲得事實性的側邊答案，
- 一個不應成為未來會話上下文一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不使用 BTW

當您希望答案成為會話未來工作脈絡的一部分時，請勿使用 `/btw`。

在這種情況下，請在主會話中正常提問，而不是使用 BTW。

## 相關

<CardGroup cols={2}>
  <Card title="Slash 指令" href="/zh-Hant/tools/slash-commands" icon="terminal">
    原生指令目錄和聊天指令。
  </Card>
  <Card title="思考層級" href="/zh-Hant/tools/thinking" icon="brain">
    附帶問題模型呼叫的推理投入層級。
  </Card>
  <Card title="Session" href="/zh-Hant/concepts/session" icon="comments">
    Session keys, history, and persistence semantics.
  </Card>
  <Card title="Steer command" href="/zh-Hant/tools/steer" icon="arrow-right">
    Inject a steering message into the active run without ending it.
  </Card>
</CardGroup>
