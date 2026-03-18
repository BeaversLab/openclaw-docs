---
summary: "使用 /btw 提出的臨時側面問題"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "BTW 側面問題"
---

# BTW 側面問題

`/btw` 讓您針對 **目前階段** 提出快速的側面問題，而不會
將該問題加入一般的對話紀錄。

其模型參考了 Claude Code 的 `/btw` 行為，但已適配至 OpenClaw 的
Gateway 與多通道架構。

## 功能

當您發送：

```text
/btw what changed?
```

OpenClaw：

1. 為目前的階段內容建立快照，
2. 執行獨立的 **無工具** 模型呼叫，
3. 僅回答側面問題，
4. 不干擾主要執行，
5. **不會** 將 BTW 問題或答案寫入階段紀錄，
6. 將答案作為 **即時側面結果** 發出，而非一般的助理訊息。

重要的心智模型是：

- 相同的階段內容
- 獨立的一次性側面查詢
- 無工具呼叫
- 無未來內容汙染
- 無逐字稿持久性

## 不做的事

`/btw` **不會**：

- 建立新的持久階段，
- 繼續未完成的主要任務，
- 執行工具或代理工具迴圈，
- 將 BTW 問題/答案資料寫入逐字稿紀錄，
- 出現在 `chat.history` 中，
- 在重新載入後保留。

它刻意設計為 **臨時性**。

## 內容運作方式

BTW 僅將目前的階段作為 **背景內容**。

若主要執行目前正在進行中，OpenClaw 會對目前的訊息
狀態建立快照，並將進行中的主要提示作為背景內容，同時
明確告知模型：

- 僅回答側面問題，
- 不要恢復或完成未完成的主要任務，
- 不要發出工具呼叫或虛擬工具呼叫。

這讓 BTW 與主要執行保持隔離，同時仍讓其知曉
階段的內容。

## 傳遞模型

BTW **不會** 作為一般的助理逐字稿訊息傳遞。

在 Gateway 協定層級上：

- 一般助理聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

此區隔是有意為之的。若 BTW 重複使用一般的 `chat` 事件路徑，
用戶端會將其視為一般對話紀錄。

因為 BTW 使用獨立的即時事件，且不會從 `chat.history` 重播，所以它在重新載入後會消失。

## 介面行為

### TUI

在 TUI 中，BTW 會在當前會話檢視中以內嵌方式呈現，但它保持暫時性：

- 與正常的助理回覆在視覺上明顯不同
- 可透過 `Enter` 或 `Esc` 關閉
- 重新載入時不會重播

### 外部管道

在 Telegram、WhatsApp 和 Discord 等管道上，BTW 會作為明確標記的一次性回覆傳送，因為這些介面沒有本機暫時性覆蓋的概念。

該回覆仍被視為側邊結果，而非正常的會話歷史。

### 控制 UI / 網頁

Gateway 會正確地將 BTW 發出為 `chat.side_result`，且 BTW 不包含在 `chat.history` 中，因此持久化合約對網頁而言已經是正確的。

目前的控制 UI 仍需要專用的 `chat.side_result` 消費者，才能在瀏覽器中即時呈現 BTW。在該客戶端支援落地之前，BTW 是一個具備完整 TUI 和外部管道行為的 Gateway 層級功能，但尚未具備完整的瀏覽器 UX。

## 何時使用 BTW

當您想要以下情況時，請使用 `/btw`：

- 對當前工作進行快速釐清，
- 在長時間執行仍在進行時取得事實性的側邊答案，
- 一個不應成為未來會語境一部分的暫時性答案。

範例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何時不使用 BTW

當您希望答案成為會話未來工作語境的一部分時，請不要使用 `/btw`。

在這種情況下，請在主會話中正常提問，而不是使用 BTW。

## 相關

- [Slash 指令](/zh-Hant/tools/slash-commands)
- [思考層級](/zh-Hant/tools/thinking)
- [會話](/zh-Hant/concepts/session)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
