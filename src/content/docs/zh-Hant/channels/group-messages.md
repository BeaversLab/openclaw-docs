---
summary: "處理 WhatsApp 群組訊息的行為與設定（mentionPatterns 在各介面間共用）"
read_when:
  - Changing group message rules or mentions
title: "Group messages"
---

目標：讓 Clawd 停駐在 WhatsApp 群組中，只在被呼叫時喚醒，並將該執行緒與個人 DM 會話分開。

<Note>`agents.list[].groupChat.mentionPatterns` 也被 Telegram、Discord、Slack 和 iMessage 使用。本文檔專注於 WhatsApp 特定的行為。對於多代理設置，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`，或使用 `messages.groupChat.mentionPatterns` 作為全域後備選項。</Note>

## 目前的實作 (2025-12-03)

- 啟動模式：`mention` (預設) 或 `always`。`mention` 需要一個 ping (透過 `mentionedJids` 的真實 WhatsApp @提及、安全的 regex 模式，或文字中任何位置的 bot E.164 號碼)。`always` 會在每則訊息時喚醒代理，但它應僅在能增加有意義的價值時回覆；否則它會回傳完全相同的靜默令牌 `NO_REPLY` / `no_reply`。預設值可以在設定 (`channels.whatsapp.groups`) 中設定，並透過 `/activation` 針對每個群組覆寫。當設定 `channels.whatsapp.groups` 時，它也會作為群組允許清單 (包含 `"*"` 以允許所有)。
- 群組原則：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息 (`open|disabled|allowlist`)。`allowlist` 使用 `channels.whatsapp.groupAllowFrom` (後備選項：明確的 `channels.whatsapp.allowFrom`)。預設為 `allowlist` (封鎖直到您加入傳送者)。
- 每群組會話：會話金鑰看起來像 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on`、`/trace on` 或 `/think high` 等指令 (作為獨立訊息傳送) 的範圍僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳。
- 上下文注入：*未*觸發執行的 **僅待處理** 群組訊息 (預設 50 則) 會以 `[Chat messages since your last reply - for context]` 為前綴，觸發行則在 `[Current message - respond to this]` 之下。會話中已有的訊息不會重新注入。
- 傳送者顯示：每個群組批次現在以 `[from: Sender Name (+E164)]` 結束，以便 Pi 知道是誰在說話。
- 閱後即焚/單次檢視：我們會在提取文字/提及之前將其解包，因此其中的提示仍會觸發。
- 群組系統提示：在群組會話的第一輪（以及每當 `/activation` 變更模式時），我們會在系統提示中注入一段簡短的說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元資料，我們仍會告訴代理這是群組聊天。

## 設定範例 (WhatsApp)

新增一個 `groupChat` 區塊到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 移除了文字內文中的視覺 `@`，顯示名稱的提及仍然有效：

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

- 這些正規表示式不區分大小寫，並使用與其他設定正規表示式介面相同的安全正規表示式防護機制；無效的模式和不安全的巢狀重複將被忽略。
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 傳送標準提及，因此很少需要編號備援，但這是一個有用的安全網。

### 啟用指令（�限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者編號（來自 `channels.whatsapp.allowFrom`，或未設定時機器人自己的 E.164 編號）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 如何使用

1. 將您的 WhatsApp 帳號（執行 OpenClaw 的那一個）新增到群組中。
2. 說 `@openclaw …`（或包含該號碼）。除非您設定 `groupPolicy: "open"`，否則只有允許清單上的傳送者可以觸發它。
3. 代理提示將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人。
4. 會話級別的指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的會話；將它們作為獨立訊息傳送以便註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送 `@openclaw` ping 並確認回覆中提及了發送者名稱。
  - 發送第二個 ping 並驗證歷史記錄區塊是否包含在內，並在下一輪清除。
- 檢查 gateway 日誌（使用 `--verbose` 執行）以查看 `inbound web message` 條目，其中顯示了 `from: <groupJid>` 和 `[from: …]` 後綴。

## 已知注意事項

- 群組刻意略過心跳訊號，以避免造成干擾的廣播。
- 回聲抑制使用合併的批次字串；如果您在未提及的情況下發送兩次相同的文字，只有第一次會收到回應。
- Session store 條目會在 session store（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）中顯示為 `agent:<agentId>:whatsapp:group:<jid>`；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未提及時預設為 `message`）。

## 相關

- [群組](/zh-Hant/channels/groups)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [廣播群組](/zh-Hant/channels/broadcast-groups)
