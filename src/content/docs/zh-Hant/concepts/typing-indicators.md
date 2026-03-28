---
summary: "When OpenClaw shows typing indicators and how to tune them"
read_when:
  - Changing typing indicator behavior or defaults
title: "Typing Indicators"
---

# 輸入指示器

輸入指示器會在執行作業期間發送至聊天頻道。使用
`agents.defaults.typingMode` 來控制輸入**何時**開始，並使用 `typingIntervalSeconds`
來控制它**多久**重新整理一次。

## 預設值

當 `agents.defaults.typingMode` **未設定** 時，OpenClaw 會保留舊版行為：

- **直接聊天**：一旦模型迴圈開始，輸入會立即開始。
- **有提及的群組聊天**：輸入會立即開始。
- **沒有提及的群組聊天**：只有當訊息文字開始串流時，輸入才會開始。
- **心跳執行**：輸入已停用。

## 模式

將 `agents.defaults.typingMode` 設定為下列其中之一：

- `never` — 永不顯示輸入指示器。
- `instant` — 在模型循環開始時立即開始輸入，即使執行
  後續僅返回靜默回覆令牌。
- `thinking` — 在第一次推理增量（reasoning delta）時開始輸入（執行需要
  `reasoningLevel: "stream"`）。
- `message` — 在第一次非靜默文字增量時開始輸入（忽略
  `NO_REPLY` 靜默令牌）。

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

您可以覆寫每個階段（session）的模式或頻率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 備註

- `message` 模式不會顯示僅含靜默內容的回覆之輸入（例如用於抑制輸出的 `NO_REPLY`
  令牌）。
- `thinking` 只有在執行串流推理 (`reasoningLevel: "stream"`) 時才會觸發。
  如果模型沒有發出推理增量，輸入狀態將不會開始。
- 無論模式為何，心跳從不顯示輸入狀態。
- `typingIntervalSeconds` 控制的是 **重新整理頻率**，而不是開始時間。
  預設值為 6 秒。
