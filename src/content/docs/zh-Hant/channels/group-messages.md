---
summary: "處理 WhatsApp 群組訊息的行為與設定（mentionPatterns 在各介面間共用）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 留在 WhatsApp 群組中，僅在收到呼叫時喚醒，並將該執行緒與個人 DM 工作階段分開。

注意：`agents.list[].groupChat.mentionPatterns` 現在也由 Telegram/Discord/Slack/iMessage 使用；本文檔專注於 WhatsApp 特定的行為。對於多重代理程式設定，請為每個代理程式設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域備選）。

## 目前的實作（2025-12-03）

- 啟動模式：`mention`（預設）或 `always`。`mention` 需要收到呼叫（透過 `mentionedJids` 的 WhatsApp 真實 @提及、安全的正則表達式模式，或文字中任何位置的機器人 E.164 號碼）。`always` 會在每則訊息喚醒代理人，但它應僅在能提供有意義的價值時回覆；否則它會回傳確切的靜默權杖 `NO_REPLY` / `no_reply`。預設值可在設定（`channels.whatsapp.groups`）中設定，並透過 `/activation` 針對各群組覆蓋。當設定 `channels.whatsapp.groups` 時，它也充當群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組政策：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您新增傳送者之前封鎖）。
- 各群組會話：會話金鑰格式為 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on`、`/trace on` 或 `/think high` 等指令（作為獨立訊息發送）的作用範圍僅限於該群組；個人 DM 狀態不受影響。群組執行緒會跳過心跳檢測。
- 上下文注入：**僅待處理** 的群組訊息（預設為 50 條）且*未*觸發執行者，會被添加前綴於 `[Chat messages since your last reply - for context]` 之下，而觸發行則位於 `[Current message - respond to this]` 之下。已存在於會話中的訊息不會被重新注入。
- 發送者顯示：每個群組批次現在都以 `[from: Sender Name (+E164)]` 結尾，以便 Pi 知道是誰在說話。
- 短暫/閱後即焚：我們會在提取文字/提及之前解開這些訊息，因此其中的 ping 仍然可以觸發。
- 群組系統提示詞：在群組會話的第一輪（以及每當 `/activation` 變更模式時），我們會向系統提示詞中注入一段簡短說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍會告知代理這是一個群組聊天。

## 設定範例 (WhatsApp)

將 `groupChat` 區塊加入 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 在訊息正文中移除了視覺上的 `@`，顯示名稱的提及仍然有效：

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

註記：

- 正則表達式不區分大小寫，並且與其他設定正則表達式介面使用相同的安全正則表達式防護；無效的模式和不安全的嵌套重複會被忽略。
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此很少需要使用號碼備案，但這是一個有用的安全網。

### 啟動指令 (�限擁有者)

使用群組聊天指令：

- `/activation mention`
- `/activation always`

僅擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人本身的 E.164 編號）可以變更此設定。在群組中發送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 如何使用

1. 將您的 WhatsApp 帳戶（運行 OpenClaw 的那個）新增到群組。
2. 說出 `@openclaw …`（或包含該號碼）。除非您設定了 `groupPolicy: "open"`，否則僅允許清單內的發送者觸發它。
3. 代理提示詞將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人員。
4. 工作階層級指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的工作階層；請將它們作為獨立訊息發送以便註冊。您的個人 DM 工作階層保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送 `@openclaw` ping，並確認提及傳送者名稱的回覆。
  - 發送第二次 ping 並驗證歷史記錄區塊是否包含在內，然後在下一輪中清除。
- 檢查閘道日誌（使用 `--verbose` 執行）以查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 為了避免喧鬧的廣播，群組會故意跳過心跳。
- 回聲抑制使用組合的批次字串；如果您在不提及的情況下發送兩次相同的文字，只有第一次會收到回應。
- 工作階層儲存條目將在工作階層儲存中顯示為 `agent:<agentId>:whatsapp:group:<jid>`（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未被提及時預設為 `message`）。
