---
summary: "WhatsApp 群組訊息處理的行為與設定（mentionPatterns 在各介面間共享）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 待在 WhatsApp 群組中，僅在被 ping 時喚醒，並將該執行緒與個人 DM 會話分開。

備註：`agents.list[].groupChat.mentionPatterns` 現在也用於 Telegram/Discord/Slack/iMessage；本文檔專注於 WhatsApp 特定的行為。對於多代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域後備）。

## 已實作的功能 (2025-12-03)

- 啟動模式：`mention`（預設）或 `always`。`mention` 需要被呼叫（透過 `mentionedJids` 的真實 WhatsApp @提及、正則表達式模式，或文字中任何地方的機器人 E.164 號碼）。`always` 會在每則訊息時喚醒代理，但它應僅在能提供有意義價值時回覆；否則會回傳靜默令牌 `NO_REPLY`。預設值可在設定中設定（`channels.whatsapp.groups`），並透過 `/activation` 針對各群組覆寫。當設定 `channels.whatsapp.groups` 時，它也會作為群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組政策：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備方案：明確的 `channels.whatsapp.allowFrom`）。預設值為 `allowlist`（在您加入發送者之前封鎖）。
- 每個群組的工作階段：工作階段金鑰看起來像 `agent:<agentId>:whatsapp:group:<jid>`，因此 `/verbose on` 或 `/think high` 之類的指令（作為獨立訊息傳送）的作用範圍僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳訊號。
- 上下文注入：**僅限待處理** 的群組訊息（預設 50 則）_未_ 觸發運行的，會在 `[Chat messages since your last reply - for context]` 下方加上前綴，觸發行則位於 `[Current message - respond to this]` 下方。工作階段中已有的訊息不會重新注入。
- 發送者浮現：每個群組批次現在都以 `[from: Sender Name (+E164)]` 結束，以便 Pi 知道誰在說話。
- 閃爍/閱後即焚：我們會在提取文字/提及之前將其解開，因此其中的 ping 仍會觸發。
- 群組系統提示：在群組會話的第一輪（以及每當 `/activation` 變更模式時），我們會向系統提示中注入一段簡短的描述，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍然會告訴代理程式這是群組聊天。

## 設定範例 (WhatsApp)

新增一個 `groupChat` 區塊到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 移除了文字主體中的視覺 `@`，顯示名稱的 ping 仍然有效：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

注意：

- 正則表達式不區分大小寫；它們涵蓋了像 `@openclaw` 這樣的顯示名稱 ping，以及帶或不帶 `+`/空格的原始號碼。
- 當有人點擊聯繫人時，WhatsApp 仍會透過 `mentionedJids` 發送規範提及，因此很少需要號碼備選方案，但這是一個有用的安全網。

### 啟用指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自己的 E.164 號碼）可以更改此設定。在群組中單獨發送 `/status` 以查看目前的啟用模式。

## 如何使用

1. 將您的 WhatsApp 帳號（正在執行 OpenClaw 的那個）加入到群組中。
2. 說 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許名單上的發送者可以觸發它。
3. Agent 提示將包含最近的群組上下文以及尾隨的 `[from: …]` 標記，以便它能回應正確的人。
4. 層級指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的對話階段；請將其作為獨立訊息發送以便註冊。您的個人 DM 對話階段保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送一個 `@openclaw` ping，並確認有引用發送者名稱的回覆。
  - 發送第二次 ping，並驗證歷史區塊包含在其中，並在下一輪中被清除。
- 檢查閘道日誌（使用 `--verbose` 運行），查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 心跳訊號會故意跳過群組，以避免產生干擾性的廣播。
- 回聲抑制使用合併的批次字串；如果您在沒有提及的情況下發送兩次相同的文字，只有第一次會收到回應。
- 會話存儲條目將會以 `agent:<agentId>:whatsapp:group:<jid>` 的形式出現在會話存儲中（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發運行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未提及時的預設值：`message`）。
