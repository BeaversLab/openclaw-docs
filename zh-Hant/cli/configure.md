---
summary: "CLI reference for `openclaw configure` (interactive configuration prompts)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

設定認證、裝置和代理程式預設值的互動式提示。

Note: The **Model** section now includes a multi-select for the
`agents.defaults.models` allowlist (what shows up in `/model` and the model picker).

Tip: `openclaw config` without a subcommand opens the same wizard. Use
`openclaw config get|set|unset` for non-interactive edits.

相關連結：

- Gateway configuration reference: [Configuration](/zh-Hant/gateway/configuration)
- Config CLI: [Config](/zh-Hant/cli/config)

備註：

- Choosing where the Gateway runs always updates `gateway.mode`. You can select "Continue" without other sections if that is all you need.
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定過程中提示輸入頻道/房間允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行守護程式安裝步驟，權杖驗證需要權杖，且 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析後的明文權杖值持久化到監督服務環境元數據中。
- 如果 token auth 需要一個 token，但配置的 token SecretRef 未解析，configure 會封鎖 daemon 安裝，並提供可操作的修復指導。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 將會封鎖守護程式安裝，直到明確設定模式。

## 範例

```bash
openclaw configure
openclaw configure --section model --section channels
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
