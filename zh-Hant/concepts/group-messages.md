---
summary: "WhatsApp 群組訊息處理的行為與設定（mentionPatterns 在各介面間共享）"
read_when:
  - 變更群組訊息規則或提及功能
title: "Group Messages"
---

# 群組訊息（WhatsApp 網頁版頻道）

目標：讓 Clawd 待在 WhatsApp 群組中，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話區分開來。

注意：`agents.list[].groupChat.mentionPatterns` 現已由 Telegram/Discord/Slack/iMessage 使用；本文著重於 WhatsApp 特定的行為。對於多代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域備選）。

## 已實作功能（2025-12-03）

- 啟用模式：`mention`（預設）或 `always`。`mention` 需要呼叫（透過 `mentionedJids` 的真實 WhatsApp @-提及、正則表達式模式，或文字中任何位置的機器人 E.164）。`always` 會在每則訊息喚醒代理，但它應僅在能提供有意義價值時回覆；否則會傳回靜默權杖 `NO_REPLY`。預設值可在設定中設定（`channels.whatsapp.groups`），並透過 `/activation` 針對各群組進行覆寫。當設定 `channels.whatsapp.groups` 時，它也會作為群組許可清單（包含 `"*"` 以允許所有）。
- 群組原則：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（備選：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您加入發送者之前封鎖）。
- 各群組會話：會話金鑰格式如 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on` 或 `/think high`（作為獨立訊息傳送）等指令的範圍僅限於該群組；個人 DM 狀態不受影響。群組執行緒會略過心跳。
- 情境注入：_未_ 觸發執行的 **僅待處理** 群組訊息（預設 50 則）會以 `[Chat messages since your last reply - for context]` 為前綴，觸發行則位於 `[Current message - respond to this]` 之下。已存在於會話中的訊息不會重新注入。
- 發送者顯示：每個群組批次現在都以 `[from: Sender Name (+E164)]` 結尾，以便 Pi 知道是誰在說話。
- 暫時性/僅限一次檢視：我們會在提取文字/提及之前先解開這些訊息，因此其中的呼叫仍然可以觸發。
- 群組系統提示：在群組會話的第一輪（以及當 `/activation` 變更模式時），我們會在系統提示中插入一段簡短的說明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍會告知代理這是一個群組聊天。

## 組態範例 (WhatsApp)

在 `~/.openclaw/openclaw.json` 中新增一個 `groupChat` 區塊，這樣即使 WhatsApp 移除了文字內容中的視覺 `@`，顯示名稱的呼叫仍可正常運作：

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

- 這些正則表達式不區分大小寫；它們涵蓋了像 `@openclaw` 這樣的顯示名稱呼叫，以及帶或不帶 `+`/空格的原始號碼。
- 當某人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此很少需要號碼備援，但這是一個有用的安全網。

### 啟用指令 (�限擁有者)

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自己的 E.164 號碼）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 使用方法

1. 將您的 WhatsApp 帳號（執行 OpenClaw 的那個）加入到群組中。
2. 說 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許清單上的發送者可以觸發它。
3. 代理提示將包含最近的群組上下文以及尾隨的 `[from: …]` 標記，以便它能回應正確的人。
4. 會話級別的指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的會話；將它們作為獨立訊息傳送以進行註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中傳送一個 `@openclaw` 呼叫，並確認回應中提及了發送者名稱。
  - 發送第二個 ping，並驗證歷史記錄區塊已被包含，並在下一輪中清除。
- 檢查閘道日誌（使用 `--verbose` 執行），查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 心跳訊號會刻意跳過群組，以避免造成干擾的廣播。
- 回聲抑制使用合併的批次字串；如果您在不提及的情況下發送相同的文字兩次，只有第一個會收到回應。
- 會話儲存條目將以 `agent:<agentId>:whatsapp:group:<jid>` 的形式出現在會話儲存中（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未提及時預設為 `message`）。

import en from "/components/footer/en.mdx";

<en />
