---
summary: "`openclaw configure`（互動式設定提示）的 CLI 參考資料"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "設定"
---

# `openclaw configure`

用於對現有設定進行針對性變更的互動式提示：憑證、裝置、代理程式預設值、閘道、管道、外掛、技能和健康檢查。

使用 `openclaw onboard` 進行完整的引導式初次執行流程，使用 `openclaw setup` 僅針對基礎設定/工作區，並在您僅需要管道帳戶設定時使用 `openclaw channels add`。

<Note>
**Model** 區段包含一個用於 `agents.defaults.models` 允許清單（顯示在 `/model` 和模型選擇器中的內容）的多重選擇器。提供者範圍的設定選擇會將其選取的模型合併到現有的允許清單中，而不是取代設定中已有的無關提供者。

從 configure 重新執行提供者驗證會保留現有的 `agents.defaults.model.primary`，即使提供者的驗證步驟返回包含其自身建議的預設模型的設定補丁也是如此。這意味著新增或重新驗證 xAI、OpenRouter 或其他提供者應該會讓新模型可用，而不會取代您目前的預設主要模型。當您有意變更預設模型時，請使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。

</Note>

當 configure 從提供者驗證選擇啟動時，預設模型和允許清單選擇器會自動偏好該提供者。對於配對的提供者（例如 Volcengine 和 BytePlus），相同的偏好也會符合其編碼計劃變體（`volcengine-plan/*`、`byteplus-plan/*`）。如果偏好的提供者篩選器會產生空白清單，configure 將回退到未篩選的目錄，而不是顯示空白的選擇器。

<Tip>不帶子命令的 `openclaw config` 會開啟相同的精靈。請使用 `openclaw config get|set|unset` 進行非互動式編輯。</Tip>

對於網路搜尋，`openclaw configure --section web` 可讓您選擇提供者
並設定其憑證。某些提供者也會顯示提供者特定的
後續提示：

- **Grok** 可以使用相同的 `XAI_API_KEY` 提供可選的 `x_search` 設定，並
  讓您選擇 `x_search` 模型。
- **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` 與
  `api.moonshot.cn`）以及預設的 Kimi 網路搜尋模型。

相關：

- Gateway 組態參考：[組態](/zh-Hant/gateway/configuration)
- Config CLI：[Config](/zh-Hant/cli/config)

## 選項

- `--section <section>`：可重複區段過濾器

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

- 完整精靈與 Gateway 相關章節會詢問 Gateway 的執行位置並更新 `gateway.mode`。未包含 `gateway`、`daemon` 或 `health` 的章節篩選器會直接前往要求的設定。
- 在本機配置寫入後，如果選擇的設定路徑需要，configure 會安裝選定的可下載外掛程式。遠端 Gateway 配置不會安裝本機外掛程式套件。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定期間提示輸入頻道/房間允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，token 驗證需要 token，且 `gateway.auth.token` 是由 SecretRef 管理，configure 會驗證 SecretRef，但不會將解析後的明文 token 值持久化至 supervisor 服務環境中繼資料。
- 如果 token 驗證需要 token 且設定的 token SecretRef 未解析，configure 會阻擋 daemon 安裝，並提供可採取的修復指引。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 會封鎖 daemon 安裝，直到明確設定模式為止。

## 範例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [組態](/zh-Hant/gateway/configuration)
