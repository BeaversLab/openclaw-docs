---
summary: "WhatsApp 群組訊息處理的行為與配置（mentionPatterns 在各介面間共用）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 待在 WhatsApp 群組中，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話分開。

注意：`agents.list[].groupChat.mentionPatterns` 現亦用於 Telegram/Discord/Slack/iMessage；本文件著重於 WhatsApp 特定的行為。對於多代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域備援）。

## 已實作功能 (2025-12-03)

- 啟用模式：`mention`（預設）或 `always`。`mention` 需要呼叫（透過 `mentionedJids` 的真實 WhatsApp @ 提及、正則模式，或文字中任何位置的機器人 E.164 編號）。`always` 會在每則訊息時喚醒代理，但應僅在能提供有價值回應時回覆；否則會傳回靜默權杖 `NO_REPLY`。預設值可在配置中設定（`channels.whatsapp.groups`），並透過 `/activation` 針對各群組覆寫。當設定 `channels.whatsapp.groups` 時，它也會充當群組允許清單（包含 `"*"` 以允許所有）。
- 群組原則：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（備援：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您新增傳送者之前封鎖）。
- 各群組會話：會話金鑰格式如 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on` 或 `/think high` 之類的指令（作為獨立訊息傳送）的作用範圍僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳。
- 上下文注入：未觸發執行的「僅待處理」群組訊息（預設為 50 則）會加上 `[Chat messages since your last reply - for context]` 前綴，觸發該執行的訊息則置於 `[Current message - respond to this]` 之下。已在對話階段中的訊息不會重新注入。
- 發送者顯示：每個群組批次現在會以 `[from: Sender Name (+E164)]` 結束，讓 Pi 知道是誰在說話。
- 閱後即焚/單次檢視：我們會在提取文字或提及之前將其解開，因此其中的提及仍能觸發。
- 群組系統提示：在群組對話的第一輪（以及當 `/activation` 變更模式時），我們會在系統提示中注入簡短說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍會告知代理這是一個群組聊天。

## 設定範例 (WhatsApp)

將 `groupChat` 區塊加入 `~/.openclaw/openclaw.json`，這樣即使 WhatsApp 在文字內容中移除了視覺化的 `@`，顯示名稱的提及仍能運作：

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

- 這些正則表達式不區分大小寫；它們涵蓋了諸如 `@openclaw` 的顯示名稱提及，以及有或沒有 `+`/空格的原始號碼。
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此號碼備案很少需要，但它是個有用的安全網。

### 啟用指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自己的 E.164 號碼）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 使用方法

1. 將您的 WhatsApp 帳號（運行 OpenClaw 的那個）加入群組。
2. 輸入 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許名單上的發送者可以觸發它。
3. 代理提示將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人。
4. 會話層級指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的會話；請將它們作為獨立訊息發送以進行註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送 `@openclaw` ping，並確認回覆中提到了發送者名稱。
  - 發送第二次 ping 並驗證歷史記錄區塊是否已包含，並在下一輪被清除。
- 檢查閘道日誌（使用 `--verbose` 執行），查看 `inbound web message` 條目，其中顯示 `from: <groupJid>` 和 `[from: …]` 後綴。

## 已知注意事項

- 心跳訊號會故意跳過群組，以避免干擾性廣播。
- 回聲抑制使用合併的批次字串；如果您在沒有提及的情況下發送兩次相同的文字，只有第一次會收到回覆。
- 會話存儲條目將在會話存儲中顯示為 `agent:<agentId>:whatsapp:group:<jid>`（默認為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅意味著該群組尚未觸發運行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（默認情況下，未提及時為 `message`）。
