---
summary: "提升的執行模式和 /elevated 指令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
title: "提升模式"
---

# 提升模式 (/elevated 指令)

## 運作方式

- `/elevated on` 在閘道主機上執行並保留執行核准（與 `/elevated ask` 相同）。
- `/elevated full` 在閘道主機上執行 **並** 自動核准執行（跳過執行核准）。
- `/elevated ask` 在閘道主機上執行，但保留執行核准（與 `/elevated on` 相同）。
- `on`/`ask` **不會**強制使用 `exec.security=full`；設定的安全性/ask 政策仍然適用。
- 僅在代理程式處於 **沙盒** 狀態時變更行為（否則執行原本就在主機上執行）。
- 指令形式：`/elevated on|off|ask|full`、`/elev on|off|ask|full`。
- 僅接受 `on|off|ask|full`；其他任何內容會傳回提示且不會變更狀態。

## 控制項目（以及不控制項目）

- **可用性閘道**：`tools.elevated` 是全域基準。`agents.list[].tools.elevated` 可以針對各個代理程式進一步限制提升模式（兩者都必須允許）。
- **每個階段作業狀態**：`/elevated on|off|ask|full` 設定目前階段作業金鑰的提升等級。
- **內嵌指令**：訊息內的 `/elevated on|ask|full` 僅適用於該訊息。
- **群組**：在群組聊天中，僅在提及代理程式時才會接受提升指令。繞過提及要求的純指令訊息會被視為已提及。
- **主機執行**：提升模式會將 `exec` 強制執行於閘道主機上；`full` 也會設定 `security=full`。
- **核准**：`full` 會跳過執行核准；當允許清單/ask 規則要求時，`on`/`ask` 會遵守這些規則。
- **非沙盒代理程式**：對位置沒有作用；僅影響閘道控制、記錄和狀態。
- **工具政策仍然適用**：如果 `exec` 被工具政策拒絕，則無法使用提升模式。
- **與 `/exec` 分開**：`/exec` 調整授權傳送者的每個會話預設值，並不需要提升權限。

## 解析順序

1. 訊息上的內聯指令（僅適用於該訊息）。
2. 會話覆寫（透過傳送僅包含指令的訊息來設定）。
3. 全域預設值（設定中的 `agents.defaults.elevatedDefault`）。

## 設定會話預設值

- 傳送一條**僅**包含指令的訊息（允許空白字元），例如 `/elevated full`。
- 發送確認回覆（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 如果提升權限存取已停用或傳送者不在已核准的允許清單上，該指令會回覆一個可執行的錯誤訊息，並且不會改變會話狀態。
- 傳送 `/elevated`（或 `/elevated:`）且不加參數，以檢視目前的提升權限等級。

## 可用性 + 允許清單

- 功能閘門：`tools.elevated.enabled`（即使程式碼支援，預設值也可透過設定關閉）。
- 傳送者允許清單：`tools.elevated.allowFrom` 搭配各供應商的允許清單（例如 `discord`、`whatsapp`）。
- 無前綴的允許清單條目僅符合傳送者範圍的身分識別值（`SenderId`、`SenderE164`、`From`）；收件者路由欄位絕不用於提升權限授權。
- 可變更的傳送者中繼資料需要明確的前綴：
  - `name:<value>` 符合 `SenderName`
  - `username:<value>` 符合 `SenderUsername`
  - `tag:<value>` 符合 `SenderTag`
  - `id:<value>`、`from:<value>`、`e164:<value>` 可用於明確的身分識別鎖定
- 各代理程式閘門：`agents.list[].tools.elevated.enabled`（選用；只能進一步限制）。
- 各代理程式允許清單：`agents.list[].tools.elevated.allowFrom`（選用；設定後，傳送者必須同時符合**兩個**全域 + 各代理程式允許清單）。
- Discord 後備：如果省略了 `tools.elevated.allowFrom.discord`，則使用 `channels.discord.allowFrom` 列表作為後備（舊版：`channels.discord.dm.allowFrom`）。設定 `tools.elevated.allowFrom.discord`（即使為 `[]`）以進行覆蓋。各代理的允許列表**不會**使用此後備機制。
- 所有閘門都必須通過；否則提升模式將被視為不可用。

## 記錄 + 狀態

- 提升執行呼叫會在 info 層級進行記錄。
- Session 狀態包含提升模式（例如 `elevated=ask`、`elevated=full`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
