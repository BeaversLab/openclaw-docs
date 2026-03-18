---
summary: "WhatsApp 群組訊息處理的行為與設定（mentionPattern 在各介面間共用）"
read_when:
  - Changing group message rules or mentions
title: "群組訊息"
---

# 群組訊息（WhatsApp 網頁版頻道）

目標：讓 Clawd 待在 WhatsApp 群組中，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話區分開來。

注意：`agents.list[].groupChat.mentionPatterns` 目前也被 Telegram/Discord/Slack/iMessage 使用；本文檔專注於 WhatsApp 特定的行為。對於多重代理設定，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域後備）。

## 已實作功能（2025-12-03）

- 啟動模式：`mention`（預設）或 `always`。`mention` 需要收到呼叫（透過 `mentionedJids` 的真實 WhatsApp @提及、正規表達式模式，或文字中任何位置的機器人 E.164號碼）。`always` 會在每則訊息時喚醒代理，但它應僅在能提供有意義的價值時回覆；否則它會傳回靜默權杖 `NO_REPLY`。預設值可在設定中設定（`channels.whatsapp.groups`）並透過 `/activation` 針對各群組覆寫。當設定 `channels.whatsapp.groups` 時，它也會充當群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組政策：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您新增傳送者之前封鎖）。
- 各群組會話：會話金鑰看起來像 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on` 或 `/think high` 之類的指令（作為獨立訊息傳送）僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳檢測。
- 上下文注入：**僅限待處理**（預設 50）且*未*觸發執行的群組訊息會加上 `[Chat messages since your last reply - for context]` 前綴，而觸發的那一行則放在 `[Current message - respond to this]` 之下。已經在對話階段中的訊息不會重新注入。
- 發送者顯示：每個群組批次現在都以 `[from: Sender Name (+E164)]` 結尾，以便 Pi 知道是誰在說話。
- 暫時性/僅限一次檢視：我們會在提取文字/提及之前先解開這些訊息，因此其中的呼叫仍然可以觸發。
- 群組系統提示詞：在群組對話的第一輪（以及當 `/activation` 變更模式時），我們會在系統提示詞中插入一段簡短的描述，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得元數據，我們仍會告知代理程式這是一個群組聊天。

## 組態範例 (WhatsApp)

將 `groupChat` 區塊新增到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 在文字內容中移除了視覺上的 `@`，顯示名稱的呼叫依然有效：

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

- 這些正則表達式不區分大小寫；它們涵蓋了像 `@openclaw` 這樣的顯示名稱呼叫，以及帶有或不帶 `+`/空格的原始號碼。
- 當有人點擊聯絡人時，WhatsApp 仍然會透過 `mentionedJids` 發送標準提及，因此號碼備援方案很少需要，但這是一個有用的安全網。

### 啟用指令 (�限擁有者)

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自身的 E.164 號碼）可以變更此設定。在群組中傳送 `/status` 作為單獨訊息，以查看目前的啟用模式。

## 使用方法

1. 將您的 WhatsApp 帳號（執行 OpenClaw 的那個）加入到群組中。
2. 說 `@openclaw …`（或包含號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許清單中的發送者可以觸發它。
3. 代理程式提示詞將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人。
4. 會話層級指令 (`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`) 僅適用於該群組的會話；請將它們作為獨立訊息發送以便註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送 `@openclaw` ping，並確認回覆中引用了發送者名稱。
  - 發送第二個 ping，並驗證歷史記錄區塊已被包含，並在下一輪中清除。
- 檢查閘道日誌 (使用 `--verbose` 執行) 以查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 心跳訊號會刻意跳過群組，以避免造成干擾的廣播。
- 回聲抑制使用合併的批次字串；如果您在不提及的情況下發送相同的文字兩次，只有第一個會收到回應。
- 會話存儲條目將在會話存儲中顯示為 `agent:<agentId>:whatsapp:group:<jid>` (預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`)；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode` (未提及時預設為 `message`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
