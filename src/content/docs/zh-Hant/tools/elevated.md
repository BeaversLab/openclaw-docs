---
summary: "提升執行模式與 /elevated 指令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
title: "提升模式"
---

# 提升模式（/elevated 指令）

## 運作方式

- `/elevated on` 在閘道主機上運行並保留執行核准（與 `/elevated ask` 相同）。
- `/elevated full` 在閘道主機上運行**並**自動核准執行（跳過執行核准）。
- `/elevated ask` 在閘道主機上運行但保留執行核准（與 `/elevated on` 相同）。
- `on`/`ask` **不會**強制執行 `exec.security=full`；設定的安全性/詢問原則仍然適用。
- 僅在代理程式處於**沙盒化**狀態時改變行為（否則執行本來就在主機上執行）。
- 指令形式：`/elevated on|off|ask|full`、`/elev on|off|ask|full`。
- 僅接受 `on|off|ask|full`；任何其他輸入會傳回提示且不會變更狀態。

## 控制項目（以及不控制的項目）

- **可用性閘門**：`tools.elevated` 是全域基準。`agents.list[].tools.elevated` 可以進一步限制各代理程式的提升權限（兩者皆須允許）。
- **各工作階段狀態**：`/elevated on|off|ask|full` 設定目前工作階段金鑰的提升等級。
- **行內指令**：訊息內的 `/elevated on|ask|full` 僅適用於該則訊息。
- **群組**：在群組聊天中，僅在提及代理程式時才會接受提升指令。略過提及需求的僅指令訊息會被視為已提及。
- **主機執行**：提升模式會強制將 `exec` 執行於閘道主機上；`full` 也會設定 `security=full`。
- **核准**：`full` 會跳過執行核准；當允許清單/詢問規則要求時，`on`/`ask` 會遵守核准。
- **非沙盒化代理程式**：位置方面無操作；僅影響閘門、記錄和狀態。
- **工具原則仍然適用**：如果 `exec` 被工具原則拒絕，則無法使用提升模式。
- **與 `/exec` 分開**：`/exec` 調整已授權發送者的每個會話預設值，不需要 elevated 權限。

## 解析順序

1. 訊息中的內聯指令（僅適用於該訊息）。
2. 會話覆蓋（透過發送僅包含指令的訊息來設定）。
3. 全域預設值（配置中的 `agents.defaults.elevatedDefault`）。

## 設定會話預設值

- 發送一條**僅**包含指令的訊息（允許空白字元），例如 `/elevated full`。
- 發送確認回覆（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 如果 elevated 存取權已停用或發送者不在核准的允許清單上，該指令會回覆一個可操作的錯誤，並且不會改變會話狀態。
- 發送 `/elevated`（或 `/elevated:`）且不帶參數，以查看當前的 elevated 級別。

## 可用性 + 允許清單

- 功能開關：`tools.elevated.enabled`（即使程式碼支援，也可以透過配置將預設值設為關閉）。
- 發送者允許清單：`tools.elevated.allowFrom` 搭配各提供者的允許清單（例如 `discord`、`whatsapp`）。
- 無前綴的允許清單項目僅符合發送者範圍的身分識別值（`SenderId`、`SenderE164`、`From`）；收件者路由欄位絕不用於 elevated 授權。
- 可變的發送者元資料需要明確的前綴：
  - `name:<value>` 符合 `SenderName`
  - `username:<value>` 符合 `SenderUsername`
  - `tag:<value>` 符合 `SenderTag`
  - `id:<value>`、`from:<value>`、`e164:<value>` 可用於明確的身分識別定位
- 個別代理程式閘道：`agents.list[].tools.elevated.enabled`（選用；只能進一步限制）。
- 個別代理程式允許清單：`agents.list[].tools.elevated.allowFrom`（選用；設定時，發送者必須同時符合**全域與**個別代理程式允許清單）。
- Discord 後備：如果省略了 `tools.elevated.allowFrom.discord`，則使用 `channels.discord.allowFrom` 列表作為後備（舊版：`channels.discord.dm.allowFrom`）。設定 `tools.elevated.allowFrom.discord`（即使是 `[]`）以覆蓋。每個代理程式的允許清單**不**會使用後備。
- 所有閘道都必須通過；否則提升模式將被視為不可用。

## 日誌記錄 + 狀態

- 提升的 exec 呼叫會在資訊層級記錄。
- 會話狀態包含提升模式（例如 `elevated=ask`、`elevated=full`）。
