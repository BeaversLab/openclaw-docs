---
summary: "WhatsApp 群組訊息處理的行為與設定（mentionPatterns 在各介面間共享）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 待在 WhatsApp 群組中，僅在被呼叫時喚醒，並將該執行緒與個人 DM（訊息）工作階段分開。

注意：`agents.list[].groupChat.mentionPatterns` 現在也被 Telegram/Discord/Slack/iMessage 使用；本文著重於 WhatsApp 特定的行為。對於多代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域備援）。

## 目前實作方式 (2025-12-03)

- 啟動模式：`mention`（預設）或 `always`。`mention` 需要收到呼叫（透過 `mentionedJids` 的真實 WhatsApp @ 提及、安全的 Regex 模式，或文字中任何機器人的 E.164 號碼）。`always` 會在每則訊息喚醒代理，但應僅在能提供有意義的價值時回覆；否則它會返回靜默權杖 `NO_REPLY`。預設值可以在設定中設定（`channels.whatsapp.groups`）並透過 `/activation` 針對每個群組覆寫。當設定 `channels.whatsapp.groups` 時，它也會充當群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組政策：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息 (`open|disabled|allowlist`)。`allowlist` 使用 `channels.whatsapp.groupAllowFrom` (後備：明確的 `channels.whatsapp.allowFrom`)。預設為 `allowlist` (在您加入發送者之前封鎖)。
- 各群組工作階段：工作階段金鑰格式類似 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on` 或 `/think high` (作為獨立訊息發送) 之類的指令僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳檢測。
- 上下文注入：*未*觸發執行的 **僅待處理** 群組訊息 (預設 50 則) 會加上 `[Chat messages since your last reply - for context]` 前綴，觸發行則置於 `[Current message - respond to this]` 之下。已在工作階段中的訊息不會重新注入。
- 發送者顯示：每個群組批次現在都以 `[from: Sender Name (+E164)]` 結尾，以便 Pi 知道是誰在說話。
- ephemeral/view-once（閱後即焚）：我們在提取文字/提及之前會將其解開，因此其中的 ping 仍然會觸發。
- 群組系統提示：在群組會話的第一輪（以及每當 `/activation` 更改模式時），我們會在系統提示中注入一段簡短的說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元資料，我們仍然會告訴代理這是群組聊天。

## 設定範例 (WhatsApp)

在 `~/.openclaw/openclaw.json` 中新增一個 `groupChat` 區塊，以便即使 WhatsApp 移除了文字內容中的視覺化 `@`，顯示名稱的 ping 仍然有效：

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

- 這些正則表達式不區分大小寫，並且與其他設定正則表達式介面使用相同的安全正則防護措施；無效的模式和不安全的巢狀重複會被忽略。
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此很少需要號碼備援，但這是一個有用的安全網。

### 啟用指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人本身的 E.164）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 如何使用

1. 將您的 WhatsApp 帳號（即執行 OpenClaw 的那個）加入到群組中。
2. 說 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有名單內的發送者才能觸發它。
3. Agent 提示詞將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人員。
4. 工作階層級指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的工作階層；請將其作為獨立訊息傳送以進行註冊。您的個人 DM 工作階層保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送 `@openclaw` ping，並確認回覆中提及了發送者名稱。
  - 發送第二個 ping 並驗證歷史區塊是否已包含，並在下一輪中被清除。
- 檢查閘道日誌（使用 `--verbose` 執行），查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 群組會刻意跳過心跳，以避免干擾廣播。
- 回顯抑制使用合併的批次字串；如果您在沒有提及的情況下發送兩次相同的文字，只有第一次會收到回應。
- Session store 條目將以 `agent:<agentId>:whatsapp:group:<jid>` 的形式出現在 session store 中（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未提及時預設為 `message`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
