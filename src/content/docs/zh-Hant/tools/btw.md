---
summary: "使用 /btw 進行臨時提問"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 側邊提問"
---

# BTW 側邊提問

`/btw` 讓您在不將問題轉化為正常對話歷史記錄的情況下，針對 **當前會話** 提出快速的側邊提問。

它是模仿 Claude Code 的 `/btw` 行為建模的，但已針對 OpenClaw 的閘道和多通道架構進行了調整。

## 功能作用

當您發送：

```text
/btw what changed?
```

OpenClaw：

1. 擷取當前會話上下文的快照，
2. 執行單獨的 **無工具** 模型調用，
3. 僅回答側邊問題，
4. 保持主運行不變，
5. **不** 將 BTW 問題或答案寫入會話歷史記錄，
6. 將答案作為 **即時側邊結果** 而非正常助理訊息發出。

重要的心智模型是：

- 相同的會話上下文
- 單獨的一次性側邊查詢
- 無工具調用
- 無未來上下文污染
- 無文字記錄持久化

## 不做的事項

`/btw` **不** 會：

- 建立新的持久會話，
- 繼續未完成的主任務，
- 執行工具或代理工具循環，
- 將 BTW 問題/答案數據寫入文字記錄歷史，
- 出現在 `chat.history` 中，
- 在重新載入後繼續存在。

它被設計為 **臨時性** 的。

## 上下文運作方式

BTW 僅將當前會話作為 **背景上下文** 使用。

如果主運行當前處於活動狀態，OpenClaw 會擷取當前訊息狀態，並將進行中的主要提示詞作為背景上下文包含在內，同時明確告訴模型：

- 僅回答側邊問題，
- 不要恢復或完成未完成的主任務，
- 不要發出工具調用或虛擬工具調用。

這既保持了 BTW 與主運行的隔離，同時又讓它能夠了解會話的內容。

## 傳遞模型

BTW **不** 會作為正常的助理文字記錄訊息傳遞。

在閘道協議層級：

- 正常的助理聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

這種區分是有意為之的。如果 BTW 重複使用正常的 `chat` 事件路徑，客戶端會將其視為正常的對話歷史記錄。

由於 BTW 使用獨立的即時事件，並且不會從 `chat.history` 重放，因此它在重新載入後會消失。

## 表層行為

### TUI

在 TUI 中，BTW 會在目前的工作階段檢視中以內嵌方式呈現，但它仍然是暫時性的：

- 與一般的助手回覆有明顯的視覺區別
- 可以使用 `Enter` 或 `Esc` 關閉
- 重新載入時不會重放

### 外部頻道

在 Telegram、WhatsApp 和 Discord 等頻道上，BTW 會被傳送為一個明確標示的一次性回覆，因為這些介面並沒有本機暫時性覆蓋的概念。

該答案仍被視為側邊結果，而非一般的工作階段歷史記錄。

### 控制 UI / 網頁

Gateway 正確地將 BTW 作為 `chat.side_result` 發送，並且 BTW 未包含在 `chat.history` 中，因此對網頁而言，持久性合約已經是正確的。

目前的控制 UI 仍然需要一個專用的 `chat.side_result` 消費者，以便在瀏覽器中即時呈現 BTW。在該用戶端支援落地之前，BTW 是一個具有完整 TUI 和外部頻道行為的 Gateway 層級功能，但還不是完整的瀏覽器 UX。

## 何時使用 BTW

當您想要以下內容時，請使用 `/btw`：

- 關於目前工作的快速釐清，
- 在長時間執行仍在進行時，獲得事實性的側邊答案，
- 不應成為未來工作階段內容一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不應使用 BTW

當您希望答案成為工作階段未來工作內容的一部分時，請勿使用 `/btw`。

在這種情況下，請在主要工作階段中正常提問，而不是使用 BTW。

## 相關

- [Slash commands](/en/tools/slash-commands)
- [Thinking Levels](/en/tools/thinking)
- [Session](/en/concepts/session)
