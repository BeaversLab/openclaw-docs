---
summary: "OpenClaw 顯示輸入指示器的時機以及如何進行調整"
read_when:
  - 變更輸入指示器行為或預設值
title: "輸入指示器"
---

# 輸入指示器

當執行 (run) 處於活動狀態時，輸入指示器會傳送到聊天頻道。使用
`agents.defaults.typingMode` 控制 **何時** 開始輸入，並使用 `typingIntervalSeconds`
控制其更新頻率 **多久一次**。

## 預設值

當 `agents.defaults.typingMode` **未設定** 時，OpenClaw 會保留舊版行為：

- **直接聊天**：一旦模型迴圈開始，輸入會立即開始。
- **具有提及的群組聊天**：輸入會立即開始。
- **沒有提及的群組聊天**：僅當訊息文字開始串流時，輸入才會開始。
- **心跳執行**：輸入已停用。

## 模式

將 `agents.defaults.typingMode` 設定為以下其中之一：

- `never` — 永不顯示輸入指示器。
- `instant` — **在模型迴圈開始時立即** 開始輸入，即使執行
  後續僅傳回靜默回覆 token。
- `thinking` — 在 **第一次推理差異** 時開始輸入 (執行時需
  `reasoningLevel: "stream"`)。
- `message` — 在 **第一次非靜默文字差異** 時開始輸入 (忽略
  `NO_REPLY` 靜默 token)。

"觸發時間早晚" 的順序：
`never` → `message` → `thinking` → `instant`

## 組態

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

您可以針對每個工作階段覆寫模式或頻率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 備註

- `message` 模式不會為純靜默回覆顯示輸入 (例如用於隱藏輸出的 `NO_REPLY`
  token)。
- `thinking` 僅在執行串流推理時觸發 (`reasoningLevel: "stream"`)。
  如果模型未發出推理差異，輸入將不會開始。
- 無論模式為何，心跳從不顯示輸入狀態。
- `typingIntervalSeconds` 控制 **更新頻率**，而非開始時間。
  預設值為 6 秒。

import en from "/components/footer/en.mdx";

<en />
