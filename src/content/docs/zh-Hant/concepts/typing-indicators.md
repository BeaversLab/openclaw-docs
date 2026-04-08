---
summary: "OpenClaw 顯示輸入指示器的時機及如何進行調整"
read_when:
  - Changing typing indicator behavior or defaults
title: "輸入指示器"
---

# 輸入指示器

輸入指示器會在執行運作期間發送至聊天頻道。請使用
`agents.defaults.typingMode` 來控制輸入**何時**開始，並使用 `typingIntervalSeconds`
來控制**多久**重新整理一次。

## 預設值

當 `agents.defaults.typingMode` **未設定**時，OpenClaw 將保持舊有行為：

- **直接聊天**：一旦模型迴圈開始，輸入指示器會立即啟動。
- **包含提及的群組聊天**：輸入指示器會立即啟動。
- **不包含提及的群組聊天**：僅當訊息文字開始串流時，輸入指示器才會啟動。
- **Heartbeat 執行**：輸入指示器已停用。

## 模式

將 `agents.defaults.typingMode` 設定為以下其中之一：

- `never` — 永遠不顯示輸入指示器。
- `instant` — **在模型迴圈開始時立即**開始輸入，即使執行
  後來僅返回靜默回覆 token。
- `thinking` — 在**第一個推理增量**時開始輸入（需該次執行
  使用 `reasoningLevel: "stream"`）。
- `message` — 在**第一個非靜默文字增量**時開始輸入（忽略
  `NO_REPLY` 靜默 token）。

「觸發多早」的順序：
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

您可以針對每個階段覆寫模式或頻率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 備註

- `message` 模式不會在整個 payload 完全為靜默 token 時，顯示純靜默回覆的輸入中狀態（例如 `NO_REPLY` / `no_reply`，匹配時不區分大小寫）。
- 僅當 run 串流推論 (`reasoningLevel: "stream"`) 時，`thinking` 才會觸發。如果模型未發出推論增量，輸入中狀態將不會開始。
- 無論模式為何，Heartbeats 永遠不會顯示輸入指示器。
- `typingIntervalSeconds` 控制**更新頻率**，而非開始時間。預設為 6 秒。
