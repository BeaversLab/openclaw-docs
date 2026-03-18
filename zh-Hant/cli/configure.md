---
summary: "`openclaw configure`（互動式設定提示）的 CLI 參考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

設定認證、裝置和代理程式預設值的互動式提示。

注意：**Model** 區段現在包含 `agents.defaults.models` 允許清單（顯示在 `/model` 和模型選擇器中的內容）的多選功能。

提示：不帶子指令執行 `openclaw config` 會開啟相同的精靈。請使用 `openclaw config get|set|unset` 進行非互動式編輯。

相關連結：

- Gateway 配置參考：[Configuration](/zh-Hant/gateway/configuration)
- Config CLI：[Config](/zh-Hant/cli/config)

備註：

- 選擇 Gateway 的執行位置總是會更新 `gateway.mode`。如果這就是您所需的全部，您可以選擇「Continue」而不填寫其他部分。
- 導向頻道的服務（Slack/Discord/Matrix/Microsoft Teams）會在設定過程中提示輸入頻道/房間允許清單。您可以輸入名稱或 ID；精靈會盡可能將名稱解析為 ID。
- 如果您執行 daemon 安裝步驟，且 token auth 需要一個 token，而 `gateway.auth.token` 是由 SecretRef 管理的，configure 會驗證 SecretRef，但不會將解析後的純文字 token 值持久化到 supervisor 服務環境元數據中。
- 如果 token auth 需要一個 token，但配置的 token SecretRef 未解析，configure 會封鎖 daemon 安裝，並提供可操作的修復指導。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，configure 會封鎖 daemon 安裝，直到明確設定模式。

## 範例

```bash
openclaw configure
openclaw configure --section model --section channels
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
