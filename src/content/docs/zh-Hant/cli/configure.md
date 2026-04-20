---
summary: "`openclaw configure`（互動式設定提示）的 CLI 參考資料"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

用於設定認證、裝置和代理預設值的互動式提示。

注意：**Model** 區段現在包含針對 `agents.defaults.models` 允許清單（顯示於 `/model` 和模型選擇器中的內容）的多重選取功能。

當 configure 從供應商授權選項啟動時，預設模型和允許清單選擇器會自動偏好該供應商。對於 Volcengine/BytePlus 等配對供應商，相同的偏好設定也會符合其編碼方案變體（`volcengine-plan/*`、`byteplus-plan/*`）。如果偏好的供應商篩選會產生空白清單，configure 將會回退至未篩選的目錄，而不是顯示空白的選擇器。

提示：`openclaw config` 不帶子指令會開啟相同的精靈。使用 `openclaw config get|set|unset` 進行非互動式編輯。

對於網路搜尋，`openclaw configure --section web` 可讓您選擇供應商並設定其憑證。某些供應商還會顯示供應商特定的後續提示：

- **Grok** 可以使用相同的 `XAI_API_KEY` 提供選用的 `x_search` 設定，並讓您選擇 `x_search` 模型。
- **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` vs
  `api.moonshot.cn`）和預設的 Kimi 網路搜尋模型。

相關：

- Gateway 配置參考：[Configuration](/zh-Hant/gateway/configuration)
- Config CLI：[Config](/zh-Hant/cli/config)

## 選項

- `--section <section>`：可重複的區段篩選器

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

- 選擇 Gateway 的執行位置總是會更新 `gateway.mode`。如果這就是您所需要的，您可以選擇「繼續」而不選擇其他區段。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定期間提示輸入頻道/房間允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，Token 授權需要一個 token，並且 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析出的明文 token 值保存到 supervisor 服務環境中繼資料中。
- 如果 token 身份驗證需要 token，且設定的 token SecretRef 未解析，configure 會阻擋 daemon 安裝並提供可操作的修復指引。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 但未設定 `gateway.auth.mode`，configure 會阻擋 daemon 安裝，直到明確設定模式。

## 範例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```
