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

對於網路搜尋，`openclaw configure --section web` 讓您選擇提供者
並設定其憑證。如果您選擇 **Grok**，configure 也可以顯示
一個額外的後續步驟，以使用相同的 `XAI_API_KEY` 啟用 `x_search`
並選擇 `x_search` 模型。其他網路搜尋提供者不會顯示該步驟。

相關：

- Gateway 設定參考：[Configuration](/en/gateway/configuration)
- Config CLI：[Config](/en/cli/config)

備註：

- 選擇 Gateway 的執行位置總是會更新 `gateway.mode`。如果這就是您所需的全部，您可以不選擇其他區段而直接選擇「繼續」。
- 導向頻道的服務 (Slack/Discord/Matrix/Microsoft Teams) 會在設定期間提示輸入頻道/聊天室允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，token 驗證需要 token，且 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析出的明文 token 值保存到 supervisor 服務環境元數據中。
- 如果 token 驗證需要 token 且設定的 token SecretRef 未解析，configure 會以可操作的修復指導方針阻擋 daemon 安裝。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 會阻擋 daemon 安裝，直到明確設定模式。

## 範例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
```
