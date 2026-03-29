---
summary: "`openclaw configure`（互動式設定提示）的 CLI 參考資料"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

用於設定認證、裝置和代理預設值的互動式提示。

注意：**Model** 區段現在包含針對 `agents.defaults.models` 允許清單（顯示於 `/model` 和模型選擇器中的內容）的多重選取功能。

提示：不帶子指令執行 `openclaw config` 會開啟相同的精靈。請使用 `openclaw config get|set|unset` 進行非互動式編輯。

相關連結：

- Gateway 組態參考資料：[組態](/en/gateway/configuration)
- Config CLI：[Config](/en/cli/config)

備註：

- 選擇 Gateway 的執行位置時，總是會更新 `gateway.mode`。如果您只需要這項操作，可以在不選取其他區段的情況下選擇「Continue」（繼續）。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定過程中提示輸入頻道/房間的允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，Token 認證需要一個 Token，且 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析出的明文 Token 值持久化到 supervisor 服務環境元資料中。
- 如果 Token 認證需要 Token 且設定的 Token SecretRef 未解析，configure 會阻擋 daemon 安裝並提供可行的修復指引。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 會阻擋 daemon 安裝，直到明確設定模式。

## 範例

```bash
openclaw configure
openclaw configure --section model --section channels
```
