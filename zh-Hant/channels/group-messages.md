---
summary: "處理 WhatsApp 群組訊息的行為與設定（mentionPatterns 在各介面間共享）"
read_when:
  - 變更群組訊息規則或提及設定
title: "群組訊息"
---

# 群組訊息（WhatsApp web 頻道）

目標：讓 Clawd 加入 WhatsApp 群組，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話分開。

注意：`agents.list[].groupChat.mentionPatterns` 現在也被 Telegram/Discord/Slack/iMessage 使用；本文檔專注於 WhatsApp 特定的行為。對於多代理設置，請為每個代理設定 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作為全域後備）。

## 目前的實作方式 (2025-12-03)

- 啟動模式：`mention`（預設）或 `always`。`mention` 需要一個呼叫（透過 `mentionedJids` 發出的真實 WhatsApp @提及、安全的 Regex 模式，或機器人的 E.164 號碼出現在文字中的任何位置）。`always` 會在每則訊息喚醒代理，但它應僅在能提供有意義的價值時回覆；否則它會回傳靜默權杖 `NO_REPLY`。預設值可在設定中設定（`channels.whatsapp.groups`），並透過 `/activation` 針對各群組進行覆寫。當設定 `channels.whatsapp.groups` 時，它也會充當群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組政策：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備：明確的 `channels.whatsapp.allowFrom`）。預設值為 `allowlist`（在您新增發送者之前為封鎖狀態）。
- 各群組會話：會話金鑰看起來像 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on` 或 `/think high` 之類的指令（作為獨立訊息發送）僅限於該群組；個人 DM 狀態不受影響。群組執行緒會跳過心跳檢測。
- 情境注入：未觸發執行的「僅待處理」群組訊息（預設為 50 則）會被加前綴於 `[Chat messages since your last reply - for context]` 之下，觸發的那一行則位於 `[Current message - respond to this]` 之下。會話中已有的訊息不會被重新注入。
- 發送者呈現：每個群組批次現在最後都會以 `[from: Sender Name (+E164)]` 結束，以便 Pi 知道誰在說話。
- 暫時性/閱後即焚：我們會在提取文字/提及之前將其解包，因此其中的 ping 仍然會觸發。
- 群組系統提示：在群組會話的第一輪（以及當 `/activation` 變更模式時），我們會在系統提示中注入一段簡短的文字，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果無法取得中繼資料，我們仍會告知代理這是一個群組聊天。

## 設定範例 (WhatsApp)

將 `groupChat` 區塊新增到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 移除了文字內容中的視覺 `@`，顯示名稱的提及仍然有效：

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
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此數位備援很少需要，但這是一個有用的安全網。

### 啟用指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自身的 E.164）可以變更此設定。在群組中傳送 `/status` 作為獨立訊息，以查看目前的啟用模式。

## 使用方法

1. 將您的 WhatsApp 帳戶（執行 OpenClaw 的那一個）新增至群組。
2. 說 `@openclaw …`（或包含該號碼）。除非設定了 `groupPolicy: "open"`，否則只有允許清單中的寄件者可以觸發它。
3. 代理提示將包含最近的群組內容以及結尾的 `[from: …]` 標記，使其能夠回應正確的人。
4. 會話層級的指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的會話；請將它們作為獨立訊息傳送以便註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中傳送 `@openclaw` ping，並確認有引用寄件者名稱的回覆。
  - 發送第二個 ping 並驗證歷史記錄區塊是否包含其中，並在下一輪被清除。
- 檢查閘道日誌（使用 `--verbose` 執行）以查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 有意跳過群組的心跳訊號，以避免產生干擾的廣播。
- 回聲抑制使用合併的批次字串；如果您在沒有提及的情況下發送兩次相同的文字，只有第一個會收到回應。
- 會話儲存條目將在會話儲存（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）中顯示為 `agent:<agentId>:whatsapp:group:<jid>`；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`（未被提及時預設為 `message`）。

import en from "/components/footer/en.mdx";

<en />
