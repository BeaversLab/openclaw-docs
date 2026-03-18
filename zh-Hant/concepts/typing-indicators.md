---
summary: "當 OpenClaw 顯示輸入指示器以及如何調整它們"
read_when:
  - Changing typing indicator behavior or defaults
title: "輸入指示器"
---

# 輸入指示器

當執行處於活動狀態時，輸入指示器會發送至聊天頻道。使用
`agents.defaults.typingMode` 來控制**何時**開始輸入，並使用 `typingIntervalSeconds`
來控制**多久**重新整理一次。

## 預設值

當 `agents.defaults.typingMode` **未設定** 時，OpenClaw 會保持舊版行為：

- **直接聊天**：一旦模型迴圈開始，輸入會立即開始。
- **具有提及的群組聊天**：輸入會立即開始。
- **沒有提及的群組聊天**：僅當訊息文字開始串流時，輸入才會開始。
- **心跳執行**：輸入已停用。

## 模式

將 `agents.defaults.typingMode` 設定為以下其中之一：

- `never` — 永不顯示輸入指示器。
- `instant` — **一旦模型迴圈開始**即開始輸入，即使執行
  後來僅傳回靜默回覆權杖也一樣。
- `thinking` — 在**第一次推理差異**上開始輸入（執行需要
  `reasoningLevel: "stream"`）。
- `message` — 在**第一次非靜默文字差異**上開始輸入（忽略
  `NO_REPLY` 靜默權杖）。

「觸發多早」的順序：
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

- `message` 模式不會顯示僅為靜默的回覆的輸入狀態（例如用於
  隱藏輸出的 `NO_REPLY` 權杖）。
- `thinking` 僅在執行串流推理時才會觸發（`reasoningLevel: "stream"`）。
  如果模型未發出推理差異，輸入將不會開始。
- 無論模式為何，心跳從不顯示輸入狀態。
- `typingIntervalSeconds` 控制**重新整理頻率**，而非開始時間。
  預設為 6 秒。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
