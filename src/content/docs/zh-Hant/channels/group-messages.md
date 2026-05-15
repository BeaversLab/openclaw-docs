---
summary: "WhatsApp 群組訊息處理 — 啟用、允許清單、會話與上下文注入"
read_when:
  - Configuring WhatsApp groups specifically
  - Changing WhatsApp activation modes (`mention` vs `always`)
  - Tuning WhatsApp group session keys or pending-message context
title: "WhatsApp 群組訊息"
sidebarTitle: "WhatsApp 群組"
---

關於跨頻道群組模型（Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo），請參閱 [群組](/zh-Hant/channels/groups)。本頁面涵蓋在該模型之上的 WhatsApp 特定行為：啟用、群組允許清單、各群組會話金鑰以及待處理訊息上下文注入。

目標：讓 OpenClaw 駐守在 WhatsApp 群組中，僅在被呼叫時喚醒，並將該執行緒與個人 DM 會話分開。

<Note>`agents.list[].groupChat.mentionPatterns` 也被 Telegram、Discord、Slack 和 iMessage 使用。對於多重代理程式設定，請為每個代理程式進行設定，或使用 `messages.groupChat.mentionPatterns` 作為全域後備選項。</Note>

## 行為

- 啟用模式：`mention`（預設）或 `always`。`mention` 需要呼叫（透過 `mentionedJids` 進行真實的 WhatsApp @提及、安全的 Regex 模式，或是文字中任何出現機器人 E.164 號碼的地方）。`always` 會在每則訊息時喚醒代理程式，但它應僅在能提供有意義價值時回覆；否則它會回傳精確的無聲權杖 `NO_REPLY` / `no_reply`。預設值可在設定中設定（`channels.whatsapp.groups`）並透過 `/activation` 針對各群組進行覆寫。當設定 `channels.whatsapp.groups` 時，它也會作為群組允許清單（包含 `"*"` 以允許所有群組）。
- 群組原則：`channels.whatsapp.groupPolicy` 控制是否接受群組訊息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（後備選項：明確的 `channels.whatsapp.allowFrom`）。預設為 `allowlist`（在您新增發送者之前封鎖）。
- 每個群組的會話：會話金鑰看起來像 `agent:<agentId>:whatsapp:group:<jid>`，因此諸如 `/verbose on`、`/trace on` 或 `/think high` 之類的指令（作為獨立訊息發送）的範圍僅限於該群組；個人 DM 狀態保持不變。群組執行緒會跳過心跳檢測。
- 上下文注入：*未*觸發執行的 **僅待處理** 群組訊息（預設為 50 條）會加前綴於 `[Chat messages since your last reply - for context]` 之下，觸發行則位於 `[Current message - respond to this]` 之下。會話中已有的訊息不會被重新注入。
- 發送者顯示：現在每個群組批次都以 `[from: Sender Name (+E164)]` 結尾，以便 Pi 知道是誰在說話。
- 閱後即焚/單次檢視：我們會在提取文字/提及之前將其解包，因此其中的 ping 仍會觸發。
- 群組系統提示詞：在群組會話的第一輪（以及每當 `/activation` 變更模式時），我們會在系統提示詞中插入一段簡短的介紹，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.`。如果無法取得元資料，我們仍會告知代理這是一個群組聊天。

## 配置範例 (WhatsApp)

將 `groupChat` 區塊新增到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 移除了文字主體中的視覺化 `@`，顯示名稱的 ping 仍能正常運作：

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

- 這些正則表達式不區分大小寫，並使用與其他配置正則表達式介面相同的安全正則防護機制；無效的模式和不安全的巢狀重複將被忽略。
- 當有人點擊聯絡人時，WhatsApp 仍會透過 `mentionedJids` 發送標準提及，因此很少需要號碼後備方案，但這是一個有用的安全網。

### 啟動指令（僅限擁有者）

使用群組聊天指令：

- `/activation mention`
- `/activation always`

只有擁有者號碼（來自 `channels.whatsapp.allowFrom`，若未設定則為機器人自己的 E.164 號碼）可以變更此設定。在群組中將 `/status` 作為獨立訊息發送，以查看當前的啟動模式。

## 如何使用

1. 將您的 WhatsApp 帳號（運行 OpenClaw 的那個）加入到群組中。
2. 說 `@openclaw …`（或包含該號碼）。除非您設定了 `groupPolicy: "open"`，否則只有允許清單中的發送者才能觸發它。
3. 代理提示將包含最近的群組上下文以及結尾的 `[from: …]` 標記，以便它能回應正確的人。
4. 會話級指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）僅適用於該群組的會話；將它們作為獨立訊息發送以便註冊。您的個人 DM 會話保持獨立。

## 測試 / 驗證

- 手動冒煙測試：
  - 在群組中發送一個 `@openclaw` ping，並確認有引用發送者名稱的回覆。
  - 發送第二個 ping 並驗證歷史區塊已被包含，然後在下一輪中被清除。
- 檢查閘道日誌（使用 `--verbose` 執行），查看顯示 `from: <groupJid>` 和 `[from: …]` 後綴的 `inbound web message` 條目。

## 已知注意事項

- 為了避免干擾性的廣播，群組會刻意跳過心跳訊號。
- 回聲抑制使用合併的批次字串；如果您在不提及的情況下發送兩次相同的文字，只有第一次會收到回應。
- 會話存儲條目在會話存儲中將顯示為 `agent:<agentId>:whatsapp:group:<jid>`（預設為 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少條目僅表示該群組尚未觸發執行。
- 群組中的輸入指示器遵循 `agents.defaults.typingMode`。當可見回覆使用預設的僅訊息工具模式時，預設情況下輸入會立即開始，以便群組成員可以看到代理正在運作，即使沒有發布自動的最終回覆。顯式的輸入模式配置仍然優先。

## 相關

- [群組](/zh-Hant/channels/groups)
- [通道路由](/zh-Hant/channels/channel-routing)
- [廣播群組](/zh-Hant/channels/broadcast-groups)
