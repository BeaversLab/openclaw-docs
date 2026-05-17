---
summary: "OpenClaw 顯示輸入指示器的時機及如何進行調整"
read_when:
  - Changing typing indicator behavior or defaults
title: "Typing indicators"
---

正在輸入指示器會在執行期間發送到聊天頻道。使用
`agents.defaults.typingMode` 來控制開始輸入的**時機**，並使用 `typingIntervalSeconds`
來控制其**更新頻率**。

## 預設值

當 `agents.defaults.typingMode` **未設定**時，OpenClaw 將保留舊版行為：

- **直接聊天**：一旦模型迴圈開始，立即開始顯示打字中。
- **提及的群組聊天**：立即開始顯示打字中。
- **未提及的群組聊天**：僅在訊息文字開始串流時才開始顯示打字中。
- **Heartbeat 執行**：如果解析後的 heartbeat 目標是可顯示打字中的聊天且未停用打字狀態，則在 heartbeat 執行開始時顯示打字中。

## 模式

將 `agents.defaults.typingMode` 設定為下列其中之一：

- `never` - 永不顯示正在輸入指示器。
- `instant` - **在模型迴圈開始時立即**開始輸入，即使執行
  稍後僅返回靜默回覆權杖。
- `thinking` - 在**第一個推理增量**時開始輸入（執行需要
  `reasoningLevel: "stream"`）。
- `message` - 在**第一個非靜默文字增量**時開始輸入（忽略
  `NO_REPLY` 靜默權杖）。

"觸發早晚"的順序：
`never` → `message` → `thinking` → `instant`

## 設定

設定代理層級的預設值：

```json5
{
  agents: {
    defaults: {
      typingMode: "thinking",
      typingIntervalSeconds: 6,
    },
  },
}
```

針對每個階段覆寫模式或頻率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 備註

- `message` 模式不會在整個內容完全為靜默 Token 時顯示輸入中狀態（例如 `NO_REPLY` / `no_reply`，不區分大小寫）。
- `thinking` 僅在執行串流推論時觸發 (`reasoningLevel: "stream"`)。如果模型未發出推論增量，輸入中狀態將不會開始。
- 心跳輸入是已解析傳遞目標的活躍訊號。它在心跳執行開始時啟動，而不是遵循 `message` 或 `thinking` 串流時序。設定 `typingMode: "never"` 可將其停用。
- 當 `target: "none"` 時，當無法解析目標時，當針對心跳停用聊天傳遞時，或當通道不支援輸入中狀態時，心跳不會顯示輸入中狀態。
- `typingIntervalSeconds` 控制的是 **更新頻率**，而非開始時間。預設為 6 秒。

## 相關

<CardGroup cols={2}>
  <Card title="Presence" href="/zh-Hant/concepts/presence" icon="signal">
    Gateway 如何追蹤已連線的用戶端並在 macOS Instances 分頁中顯示它們。
  </Card>
  <Card title="Streaming and chunking" href="/zh-Hant/concepts/streaming" icon="bars-staggered">
    外傳串流行為、區塊邊界以及特定通道的傳遞。
  </Card>
</CardGroup>
