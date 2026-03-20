---
summary: "提升的執行模式和 /elevated 指令"
read_when:
  - 調整提升模式的預設值、允許清單或斜線指令行為
title: "提升模式"
---

# 提升模式 (/elevated 指令)

## 運作方式

- `/elevated on` 在閘道主機上執行並保留 exec 核准（與 `/elevated ask` 相同）。
- `/elevated full` 在閘道主機上執行 **並** 自動核准 exec（跳過 exec 核准）。
- `/elevated ask` 在閘道主機上執行但保留 exec 核准（與 `/elevated on` 相同）。
- `on`/`ask` **不會** 強制執行 `exec.security=full`；設定的安全性/詢問策略仍然適用。
- 僅在代理程式處於 **沙盒** 狀態時變更行為（否則執行原本就在主機上執行）。
- 指令形式：`/elevated on|off|ask|full`、`/elev on|off|ask|full`。
- 僅接受 `on|off|ask|full`；其他任何內容都會傳回提示並且不會改變狀態。

## 它控制什麼（以及不控制什麼）

- **可用性閘門**：`tools.elevated` 是全域基準。`agents.list[].tools.elevated` 可以進一步限制各個代理的提升模式（兩者都必須允許）。
- **每個工作階段的狀態**：`/elevated on|off|ask|full` 設定目前工作階段金鑰的提升等級。
- **內聯指令**：訊息內的 `/elevated on|ask|full` 僅適用於該訊息。
- **群組**：在群組聊天中，僅在提及代理程式時才會接受提升指令。繞過提及要求的純指令訊息會被視為已提及。
- **主機執行**：提升模式會將 `exec` 強制套用到閘道主機上；`full` 也會設定 `security=full`。
- **核准**：`full` 會跳過 exec 核准；`on`/`ask` 則在允許清單/詢問規則要求時遵守核准。
- **非沙盒代理程式**：對位置沒有作用；僅影響閘道控制、記錄和狀態。
- **工具策略仍然適用**：如果 `exec` 被工具策略拒絕，則無法使用提升模式。
- **與 `/exec` 分開**：`/exec` 會針對已授權的寄件者調整每個工作階段的預設值，且不需要提升模式。

## 解析順序

1. 訊息上的內聯指令（僅適用於該訊息）。
2. 會話覆寫（透過傳送僅包含指令的訊息來設定）。
3. 全域預設值（設定中的 `agents.defaults.elevatedDefault`）。

## 設定會話預設值

- 傳送一條 **僅** 包含該指令的訊息（允許空白字元），例如 `/elevated full`。
- 會傳送確認回覆（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 如果提升權限存取已停用或傳送者不在已核准的允許清單上，該指令會回覆一個可執行的錯誤訊息，並且不會改變會話狀態。
- 傳送 `/elevated`（或 `/elevated:`）且不帶參數，以查看目前的提升層級。

## 可用性 + 允許清單

- 功能門控：`tools.elevated.enabled`（即使程式碼支援，預設也可透過設定關閉）。
- 發送者允許清單：`tools.elevated.allowFrom` 搭配各供應商的允許清單（例如 `discord`、`whatsapp`）。
- 無前綴的允許清單項目僅比對發送者範圍的身分識別值（`SenderId`、`SenderE164`、`From`）；收件者路由欄位絕不用於提升授權。
- 可變更的傳送者中繼資料需要明確的前綴：
  - `name:<value>` 比對 `SenderName`
  - `username:<value>` 比對 `SenderUsername`
  - `tag:<value>` 比對 `SenderTag`
  - `id:<value>`、`from:<value>`、`e164:<value>` 可用於明確的身分識別指定
- 各代理程式門控：`agents.list[].tools.elevated.enabled`（選用；僅能進一步限制）。
- 各代理程式允許清單：`agents.list[].tools.elevated.allowFrom`（選用；設定時，發送者必須同時符合全域與各代理程式允許清單）。
- Discord 備援：如果省略 `tools.elevated.allowFrom.discord`，則會使用 `channels.discord.allowFrom` 清單作為備援（舊版：`channels.discord.dm.allowFrom`）。設定 `tools.elevated.allowFrom.discord`（即使是 `[]`）即可覆寫。各代理程式允許清單**不會**使用備援。
- 所有閘門都必須通過；否則提升模式將被視為不可用。

## 記錄 + 狀態

- 提升執行呼叫會在 info 層級進行記錄。
- Session 狀態包含提升模式（例如 `elevated=ask`、`elevated=full`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
