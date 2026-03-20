---
summary: "使用 /btw 提出的臨時側面問題"
read_when:
  - 您想詢問一個關於目前會議的快速側面問題
  - 您正在實作或對各個客戶端上的 BTW 行為進行除錯
title: "BTW 側面問題"
---

# BTW 側面問題

`/btw` 讓您能夠針對 **目前會議** 提出快速的側面問題，而
不會將該問題轉變為正常的對話歷史記錄。

它是依照 Claude Code 的 `/btw` 行為建模，但已調整以適應 OpenClaw 的
閘道和多通道架構。

## 它的作用

當您傳送：

```text
/btw what changed?
```

OpenClaw：

1. 為目前會議上下文建立快照，
2. 執行單獨的 **無工具** 模型呼叫，
3. 僅回答側面問題，
4. 保持主要執行不受干擾，
5. **不會** 將 BTW 問題或答案寫入會議歷史記錄，
6. 將答案作為 **即時側面結果** 發出，而非一般的助理訊息。

重要的思維模型是：

- 相同的會議上下文
- 單獨的一次性側面查詢
- 無工具呼叫
- 未來無上下文污染
- 無逐字稿持久性

## 它不做的事

`/btw` **不會**：

- 建立新的持久會議，
- 繼續未完成的主要任務，
- 執行工具或代理工具迴圈，
- 將 BTW 問題/答案資料寫入逐字稿歷史記錄，
- 出現在 `chat.history` 中，
- 在重新載入後仍然存在。

它刻意設計為 **暫時性** 的。

## 上下文運作方式

BTW 僅將目前會議作為 **背景上下文**。

如果主要執行目前正在進行中，OpenClaw 會對目前訊息
狀態建立快照，並將進行中的主要提示作為背景上下文包含在內，同時
明確告知模型：

- 僅回答側面問題，
- 請勿恢復或完成未完成的主要任務，
- 請勿發出工具呼叫或虛擬工具呼叫。

這使得 BTW 與主要執行保持隔離，同時仍然讓其了解
會議的內容。

## 交付模型

BTW **不會** 作為正常的助理逐字稿訊息交付。

在閘道通訊協定層級：

- 正常的助理聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

此區隔是刻意的。如果 BTW 重复使用正常的 `chat` 事件路徑，
客戶端會將其視為一般的對話歷史記錄。

由於 BTW 使用單獨的即時事件，且不會從 `chat.history` 重播，因此在重新載入後會消失。

## 介面行為

### TUI

在 TUI 中，BTW 是以內嵌方式在目前的 session 檢視中呈現，但它是暫時性的：

- 外觀上與一般的助手回覆有明顯區別
- 可使用 `Enter` 或 `Esc` 關閉
- 重新載入時不會重播

### 外部頻道

在 Telegram、WhatsApp 和 Discord 等頻道上，BTW 會以標記清楚的一次性回覆形式傳送，因為這些介面沒有本機暫時性疊加層的概念。

該答案仍被視為側邊結果，而非一般的 session 歷程記錄。

### 控制 UI / 網頁

Gateway 會正確地將 BTW 作為 `chat.side_result` 發出，且 BTW 不包含在 `chat.history` 中，因此對於網頁而言，持續性合約已經是正確的。

目前的控制 UI 仍需要專屬的 `chat.side_result` 消費者，才能在瀏覽器中即時呈現 BTW。在該用戶端支援完成之前，BTW 是一個具備完整 TUI 和外部頻道行為的 Gateway 層級功能，但尚未成為完整的瀏覽器體驗。

## 何時使用 BTW

當您想要時使用 `/btw`：

- 關於目前工作的快速釐清，
- 在長時間執行仍在進行時的事實性側邊答案，
- 不應成為未來 session 上下文一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不使用 BTW

當您希望答案成為 session 未來工作內容的一部分時，請勿使用 `/btw`。

在這種情況下，請在主 session 中正常提問，而不是使用 BTW。

## 相關

- [斜線指令](/zh-Hant/tools/slash-commands)
- [思考層級](/zh-Hant/tools/thinking)
- [Session](/zh-Hant/concepts/session)

import en from "/components/footer/en.mdx";

<en />
