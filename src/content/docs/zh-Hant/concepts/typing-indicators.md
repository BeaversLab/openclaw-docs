---
summary: "OpenClaw 顯示輸入指示器的時機及如何進行調整"
read_when:
  - Changing typing indicator behavior or defaults
title: "Typing indicators"
---

Typing indicators 會在執行運作時發送到聊天頻道。使用
`agents.defaults.typingMode` 來控制打字 **何時** 開始，並使用 `typingIntervalSeconds`
來控制它 **多久** 重新整理一次。

## 預設值

當 `agents.defaults.typingMode` **未設定** 時，OpenClaw 會保持舊有的行為：

- **直接聊天**：一旦模型迴圈開始，立即開始顯示打字中。
- **提及的群組聊天**：立即開始顯示打字中。
- **未提及的群組聊天**：僅在訊息文字開始串流時才開始顯示打字中。
- **Heartbeat 執行**：如果解析後的 heartbeat 目標是可顯示打字中的聊天且未停用打字狀態，則在 heartbeat 執行開始時顯示打字中。

## 模式

將 `agents.defaults.typingMode` 設定為以下之一：

- `never` — 永不顯示打字中。
- `instant` — **在模型迴圈開始時** 立即開始顯示打字中，即使執行
  稍後僅傳回靜默回覆 token。
- `thinking` — 在 **第一次推理增量** 時開始顯示打字中（執行需要
  `reasoningLevel: "stream"`）。
- `message` — 在 **第一次非靜默文字增量** 時開始顯示打字中（忽略
  `NO_REPLY` 靜默 token）。

「觸發時間早晚」的順序：
`never` → `message` → `thinking` → `instant`

## 設定

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

您可以針對每個會話覆寫模式或頻率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 備註

- 當整個
  載荷正是靜默 token（例如 `NO_REPLY` / `no_reply`，
  不區分大小寫）時，`message` 模式不會對純靜默回覆顯示打字中。
- `thinking` 僅在執行串流推理（`reasoningLevel: "stream"`）時才會觸發。
  如果模型未發出推理增量，將不會開始顯示打字中。
- Heartbeat 打字中狀態是解析後傳送目標的活躍訊號。它
  在 heartbeat 執行開始時啟動，而不是依循 `message` 或 `thinking`
  的串流時機。請設定 `typingMode: "never"` 來停用它。
- 當 `target: "none"`、當無法解析目標、當心跳的聊天傳送已停用，或當頻道不支援輸入時，Heartbeats 不會顯示輸入。
- `typingIntervalSeconds` 控制**重新整理頻率**，而非開始時間。
  預設為 6 秒。

## 相關

- [Presence](/zh-Hant/concepts/presence)
- [Streaming and chunking](/zh-Hant/concepts/streaming)
