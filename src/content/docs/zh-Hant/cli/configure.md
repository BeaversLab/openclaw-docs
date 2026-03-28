---
summary: "`openclaw configure` （互動式設定提示）的 CLI 參考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

用於設定憑證、裝置和代理程式預設值的互動式提示。

注意：**模型**部分現在包含針對 `agents.defaults.models` 允許清單的多重選取功能（顯示在 `/model` 和模型選擇器中的內容）。

提示：不帶子指令的 `openclaw config` 會開啟相同的精靈。使用 `openclaw config get|set|unset` 進行非互動式編輯。

相關：

- 閘道組態參考資料：[組態](/zh-Hant/gateway/configuration)
- Config CLI：[Config](/zh-Hant/cli/config)

備註：

- 選擇 Gateway 的執行位置總是會更新 `gateway.mode`。如果您只需此操作，可以不選擇其他區段而直接選擇「Continue」（繼續）。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定期間提示輸入頻道/聊天室允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行守護程序安裝步驟，且 token 驗證需要 token，而 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析後的純文字 token 值保存到監督器服務環境元資料中。
- 如果 token 驗證需要 token，但設定的 token SecretRef 未解析，configure 會阻擋守護程序安裝，並提供可採取的修復指導。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則 configure 會封鎖 daemon 安裝，直到明確設定模式為止。

## 範例

```exec
openclaw configure
openclaw configure --section model --section channels
```
