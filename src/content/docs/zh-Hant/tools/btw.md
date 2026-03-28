---
summary: "使用 /btw 進行臨時提問"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 提問"
---

# BTW 提問

`/btw` 讓您詢問關於 **當前會話** 的快速側面問題，而不會將該問題轉變為正常的對話歷史。

它仿照 Claude Code 的 `/btw` 行為建模，但已適配至 OpenClaw 的 Gateway 和多通道架構。

## 功能

當您發送：

```text
/btw what changed?
```

OpenClaw：

1. 建立目前會話內容的快照，
2. 執行單獨的 **無工具** 模型呼叫，
3. 僅回答側面問題，
4. 不干擾主要運行，
5. **不** 會將 BTW 問題或答案寫入會話歷史，
6. 將答案作為 **即時側面結果** 發出，而不是正常的助手訊息。

重要的心智模型是：

- 相同的會話內容
- 獨立的一次性側面查詢
- 無工具呼叫
- 無未來內容汙染
- 無對話記錄持久化

## 不做的事項

`/btw` **不** 會：

- 建立新的持久化會話，
- 繼續未完成的主要任務，
- 執行工具或代理工具循環，
- 將 BTW 問題/答案數據寫入對話歷史，
- 出現在 `chat.history` 中，
- 在重新載入後保留。

它是故意設計為 **暫時性** 的。

## 內容運作方式

BTW 僅將目前會話作為 **背景內容**。

如果主要運行目前處於活動狀態，OpenClaw 會對當前訊息狀態建立快照，並將進行中的主要提示作為背景內容包含在內，同時明確告知模型：

- 僅回答側面問題，
- 不要恢復或完成未完成的主要任務，
- 不要發出工具呼叫或偽工具呼叫。

這使得 BTW 與主要運行保持隔離，同時仍然讓它了解會話的內容。

## 交付模式

BTW **不** 會作為正常的助手對話訊息交付。

在 Gateway 協議層級：

- 正常的助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

這種分離是有意為之的。如果 BTW 重用正常的 `chat` 事件路徑，客戶端會將其視為正常的對話歷史。

由於 BTW 使用單獨的即時事件並且不從 `chat.history` 重播，它會在重新載入後消失。

## 表層行為

### TUI

在 TUI 中，BTW 會即時內嵌呈現於目前的會話視圖中，但它保持暫態性質：

- 與一般助理回覆視覺上區別明顯
- 可透過 `Enter` 或 `Esc` 關閉
- 重新載入時不會重播

### 外部通道

在 Telegram、WhatsApp 和 Discord 等通道上，BTW 會被傳送為一個清楚標示的一次性回覆，因為這些介面沒有本機暫態覆蓋層的概念。

該答案仍被視為側邊結果，而非一般的會話紀錄。

### 控制 UI / Web

Gateway 正確地將 BTW 發出為 `chat.side_result`，並且 BTW 未包含在 `chat.history` 中，因此持久化合約對於 Web 而言已經是正確的。

目前的控制 UI 仍需要一個專用的 `chat.side_result` 消費者，以便在瀏覽器中即時呈現 BTW。在該客戶端支援落地之前，BTW 是一個閘道層級的功能，具備完整的 TUI 和外部通道行為，但尚未具備完整的瀏覽器使用者體驗。

## 何時使用 BTW

當您想要以下內容時，使用 `/btw`：

- 關於目前工作的快速釐清，
- 在長時間執行仍在進行時的具實側邊答案，
- 一個不應成為未來會語境內容一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不使用 BTW

當您希望答案成為會話未來工作語境的一部分時，請勿使用 `/btw`。

在這種情況下，請在主會話中正常提問，而不是使用 BTW。

## 相關連結

- [斜線指令](/zh-Hant/tools/slash-commands)
- [思考層級](/zh-Hant/tools/thinking)
- [會話](/zh-Hant/concepts/session)
