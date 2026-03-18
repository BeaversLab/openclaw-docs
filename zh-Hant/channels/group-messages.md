---
summary: "WhatsApp 群組訊息處理的行為與設定（mentionPatterns 在各介面間共用）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 加入 WhatsApp 群組，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話分開。

注意：`agents.list[].groupChat.mentionPatterns` 現已由 Telegram/Discord/Slack/iMessage 使用；本文檔專注於 WhatsApp 特定的行為。對於多代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域後備）。

## 已實作功能（2025-12-03）

- 啟用模式：`mention`（預設）或 `always`。`mention` 需要呼叫（透過 `mentionedJids` 的真實 WhatsApp @-提及、安全的 regex 模式，或文字中任何位置的 bot E.164 號碼）。`always` 會在每則訊息時喚醒代理，但它應僅在能提供有價值回應時回覆；否則它會傳回無聲權杖 `NO_REPLY`。預設值可在設定（`channels.whatsapp.groups`）中設定，並透過 `/activation` 針對各群組進行覆寫。當設定 `channels.whatsapp.groups` 時，它也會作為群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組原則：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您新增發送者之前封鎖）。
- 各群組會話：會話金鑰類似 `agent:<agentId>:whatsapp:group:<jid>`，因此像 `/verbose on` 或 `/think high` 這類指令（作為獨立訊息傳送）的範圍僅限於該群組；個人 DM 狀態不受影響。群組執行緒會跳過心跳。
- 上下文注入：*未*觸發執行的**僅待處理**群組訊息（預設為 50 則）會加上 `[Chat messages since your last reply - for context]` 前綴，觸發的那一行則放在 `[Current message - respond to this]` 下方。會話中已有的訊息不會重新注入。
- 發送者顯示：現在每個群組批次都會以 `[from: Sender Name (+E164)]` 結尾，讓 Pi 知道誰在說話。
- 暫時性/閱後即焚：我們會在提取文字/提及之前將其解包，因此其中的 ping 仍然會觸發。
- 群組系統提示詞：在群組會話的第一輪（以及每當 `/activation` 變更模式時），我們會向系統提示詞中注入一段簡短的說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍然會告知代理這是一個群組聊天。

## 設定範例 (WhatsApp)

將一個 `groupChat` 區塊新增到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 在文字內容中去除了視覺上的 `@`，顯示名稱的 ping 仍然有效：

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

備註：

- 這些正則表達式不區分大小寫，並且使用與其他設定正則表達式介面相同的安全正則防護措施；無效的模式和不安全的巢狀重複會被忽略。
- 當有人點擊聯絡人時，WhatsApp 仍然會透過 `mentionedJids` 發送標準提及，因此很少需要號碼備援，但它是一個有用的安全網。

### 啟用指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自身的 E.164 號碼）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 使用方法

1. 將您的 WhatsApp 帳戶（執行 OpenClaw 的那一個）新增至群組。
2. 說 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許名單上的發送者可以觸發它。
3. 代理提示詞將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人。
4. 工作階層級指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的工作階層；請將其作為獨立訊息發送以進行註冊。您的個人 DM 工作階層保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送一個 `@openclaw` ping，並確認回覆中引用了發送者名稱。
  - 發送第二個 ping 並驗證歷史記錄區塊是否包含其中，並在下一輪被清除。
- 檢查閘道日誌（使用 `--verbose` 執行），查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 有意跳過群組的心跳訊號，以避免產生干擾的廣播。
- 回聲抑制使用合併的批次字串；如果您在沒有提及的情況下發送兩次相同的文字，只有第一個會收到回應。
- 工作階層儲存條目將在工作階層儲存中顯示為 `agent:<agentId>:whatsapp:group:<jid>`（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未提及時預設為 `message`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
