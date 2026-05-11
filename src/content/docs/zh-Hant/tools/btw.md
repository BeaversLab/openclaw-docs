---
summary: "使用 /btw 進行臨時提問"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 側向問題"
---

`/btw` 讓您詢問有關 **當前會話** 的快速側向問題，而不會將該問題變成一般對話歷史記錄。

它模仿 Claude Code 的 `/btw` 行為，但已調整以適用 OpenClaw 的 Gateway 和多通道架構。

## 運作方式

當您發送：

```text
/btw what changed?
```

OpenClaw：

1. 擷取目前會話上下文的快照，
2. 執行獨立的 **無工具** 模型呼叫，
3. 僅回答側向問題，
4. 不干擾主要執行，
5. **不會** 將 BTW 問題或答案寫入會話歷史記錄，
6. 將答案作為 **即時側向結果** 發出，而不是一般的助理訊息。

重要的心智模型是：

- 相同的會話上下文
- 獨立的一次性側向查詢
- 無工具呼叫
- 無未來上下文污染
- 無文字記錄持久性

## 不做的事情

`/btw` **不會**：

- 建立新的持久會話，
- 繼續未完成的主要任務，
- 執行工具或代理工具迴圈，
- 將 BTW 問題/答案資料寫入文字記錄歷史，
- 出現在 `chat.history` 中，
- 在重新載入後保留。

它是有意設計為 **暫時性** 的。

## 上下文運作方式

BTW 僅將目前會話作為 **背景上下文**。

如果主要執行目前處於活動狀態，OpenClaw 會擷取目前的訊息狀態，並將進行中的主要提示作為背景上下文包含在內，同時明確告知模型：

- 僅回答側向問題，
- 不要恢復或完成未完成的主要任務，
- 不要發出工具呼叫或虛擬工具呼叫。

這使 BTW 與主要執行保持隔離，同時仍讓其了解會話的內容。

## 交付模型

BTW **不會** 作為一般的助理文字記錄訊息傳送。

在 Gateway 協定層級：

- 一般助理聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

這種區分是有意的。如果 BTW 重複使用一般的 `chat` 事件路徑，用戶端會將其視為一般的對話歷史記錄。

由於 BTW 使用獨立的即時事件，且不會從 `chat.history` 重播，因此在重新載入後會消失。

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

Gateway 會正確地將 BTW 發送為 `chat.side_result`，並且 BTW 不包含在 `chat.history` 中，因此持久化契約已經符合網頁端要求。

當前的控制 UI 仍然需要一個專用的 `chat.side_result` 消費者，以便在瀏覽器中即時呈現 BTW。在該客戶端支援到位之前，BTW 是一個具有完整 TUI 和外部頻道行為的 Gateway 級別功能，但尚未具備完整的瀏覽器體驗。

## 何時使用 BTW

當您需要時，使用 `/btw`：

- 對當前工作進行快速釐清，
- 在長時間運行仍在進行時獲得事實性的側邊答案，
- 一個不應成為未來會話上下文一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不使用 BTW

當您希望答案成為會話未來工作上下文的一部分時，請勿使用 `/btw`。

在這種情況下，請在主會話中正常提問，而不是使用 BTW。

## 相關

- [Slash 指令](/zh-Hant/tools/slash-commands)
- [思考層級](/zh-Hant/tools/thinking)
- [會話](/zh-Hant/concepts/session)
