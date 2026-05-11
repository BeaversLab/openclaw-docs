---
summary: "`openclaw configure`（互動式設定提示）的 CLI 參考資料"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "設定"
---

# `openclaw configure`

用於設定認證、裝置和代理預設值的互動式提示。

<Note>
**模型**部分包含 `agents.defaults.models` 允許清單的多選功能（顯示於 `/model` 和模型選擇器中）。提供者範圍的設定選擇會將其選定的模型合併到現有的允許清單中，而不是取代設定中已存在的無關提供者。從 configure 重新執行提供者驗證會保留現有的 `agents.defaults.model.primary`。當您故意想要變更預設模型時，請使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。
</Note>

當 configure 從提供者驗證選擇啟動時，預設模型和允許清單選擇器會自動偏好該提供者。對於配對的提供者（如 Volcengine 和 BytePlus），相同的偏好也會符合其程式碼方案變體（`volcengine-plan/*`、`byteplus-plan/*`）。如果偏好的提供者篩選會產生空清單，configure 會改用未篩選的目錄，而不是顯示空白選擇器。

<Tip>`openclaw config` 不加子指令會開啟相同的精靈。使用 `openclaw config get|set|unset` 進行非互動式編輯。</Tip>

對於網路搜尋，`openclaw configure --section web` 讓您選擇提供者並設定其憑證。某些提供者也會顯示提供者特定的後續提示：

- **Grok** 可以提供選用的 `x_search` 設定，並使用相同的 `XAI_API_KEY`，讓您選擇 `x_search` 模型。
- **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` 或
  `api.moonshot.cn`）以及預設的 Kimi 網路搜尋模型。

相關：

- Gateway 設定參考：[設定](/zh-Hant/gateway/configuration)
- 設定 CLI：[Config](/zh-Hant/cli/config)

## 選項

- `--section <section>`：可重複區段篩選

可用區段：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

備註：

- 選擇 Gateway 的執行位置總是會更新 `gateway.mode`。如果這就是您所需的全部，您可以選取「Continue」而不需要其他區段。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定期間提示輸入頻道/房間允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，token auth 需要 token，且 `gateway.auth.token` 是由 SecretRef 管理，configure 會驗證 SecretRef，但不會將解析後的明文 token 值保存到 supervisor 服務環境元數據中。
- 如果 token 身份驗證需要 token，且設定的 token SecretRef 未解析，configure 會阻擋 daemon 安裝並提供可操作的修復指引。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 會阻擋 daemon 安裝，直到明確設定模式為止。

## 範例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [組態](/zh-Hant/gateway/configuration)
