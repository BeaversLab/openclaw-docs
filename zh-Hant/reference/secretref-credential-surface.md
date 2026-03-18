---
summary: "Canonical supported vs unsupported SecretRef credential surface"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "SecretRef Credential Surface"
---

# SecretRef credential surface

此頁面定義了標準的 SecretRef 憑證範圍。

範圍意圖：

- 範圍內：嚴格指使用者提供的憑證，而非由 OpenClaw 建立或輪替的憑證。
- 範圍外：執行時期建立或輪替的憑證、OAuth 更新材料以及類似工作階段的構件。

## 支援的憑證

### `openclaw.json` targets (`secrets configure` + `secrets apply` + `secrets audit`)

[//]: # "secretref-supported-list-start"

- `models.providers.*.apiKey`
- `models.providers.*.headers.*`
- `skills.entries.*.apiKey`
- `agents.defaults.memorySearch.remote.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.elevenlabs.apiKey`
- `messages.tts.openai.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `tools.web.search.apiKey`
- `tools.web.search.gemini.apiKey`
- `tools.web.search.grok.apiKey`
- `tools.web.search.kimi.apiKey`
- `tools.web.search.perplexity.apiKey`
- `gateway.auth.password`
- `gateway.auth.token`
- `gateway.remote.token`
- `gateway.remote.password`
- `cron.webhookToken`
- `channels.telegram.botToken`
- `channels.telegram.webhookSecret`
- `channels.telegram.accounts.*.botToken`
- `channels.telegram.accounts.*.webhookSecret`
- `channels.slack.botToken`
- `channels.slack.appToken`
- `channels.slack.userToken`
- `channels.slack.signingSecret`
- `channels.slack.accounts.*.botToken`
- `channels.slack.accounts.*.appToken`
- `channels.slack.accounts.*.userToken`
- `channels.slack.accounts.*.signingSecret`
- `channels.discord.token`
- `channels.discord.pluralkit.token`
- `channels.discord.voice.tts.elevenlabs.apiKey`
- `channels.discord.voice.tts.openai.apiKey`
- `channels.discord.accounts.*.token`
- `channels.discord.accounts.*.pluralkit.token`
- `channels.discord.accounts.*.voice.tts.elevenlabs.apiKey`
- `channels.discord.accounts.*.voice.tts.openai.apiKey`
- `channels.irc.password`
- `channels.irc.nickserv.password`
- `channels.irc.accounts.*.password`
- `channels.irc.accounts.*.nickserv.password`
- `channels.bluebubbles.password`
- `channels.bluebubbles.accounts.*.password`
- `channels.feishu.appSecret`
- `channels.feishu.encryptKey`
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.encryptKey`
- `channels.feishu.accounts.*.verificationToken`
- `channels.msteams.appPassword`
- `channels.mattermost.botToken`
- `channels.mattermost.accounts.*.botToken`
- `channels.matrix.password`
- `channels.matrix.accounts.*.password`
- `channels.nextcloud-talk.botSecret`
- `channels.nextcloud-talk.apiPassword`
- `channels.nextcloud-talk.accounts.*.botSecret`
- `channels.nextcloud-talk.accounts.*.apiPassword`
- `channels.zalo.botToken`
- `channels.zalo.webhookSecret`
- `channels.zalo.accounts.*.botToken`
- `channels.zalo.accounts.*.webhookSecret`
- 透過同級 `serviceAccountRef` 存取 `channels.googlechat.serviceAccount`（相容性例外）
- 透過同級 `serviceAccountRef` 存取 `channels.googlechat.accounts.*.serviceAccount`（相容性例外）

### `auth-profiles.json` 目標（`secrets configure` + `secrets apply` + `secrets audit`）

- `profiles.*.keyRef`（`type: "api_key"`）
- `profiles.*.tokenRef`（`type: "token"`）

[//]: # "secretref-supported-list-end"

備註：

- Auth-profile 計畫目標需要 `agentId`。
- 計畫項目以 `profiles.*.key` / `profiles.*.token` 為目標並寫入同級參照（`keyRef` / `tokenRef`）。
- Auth-profile 參照包含在運行時解析和稽核覆蓋範圍內。
- 對於 SecretRef 管理的模型提供者，生成的 `agents/*/agent/models.json` 項目會為 `apiKey`/標頭表面保存非秘密標記（而非解析後的秘密值）。
- 標記持久性以來源為準：OpenClaw 從來源設定的使用中快照（解析前）寫入標記，而非從解析後的運行時秘密值寫入。
- 對於網路搜尋：
  - 在明確提供者模式（設定 `tools.web.search.provider`）下，僅選定的提供者金鑰處於啟用狀態。
  - 在自動模式（未設定 `tools.web.search.provider`）下，僅依優先順序解析的第一個提供者金鑰處於啟用狀態。
  - 在自動模式下，未選取的提供者參照在被選取之前會被視為非啟用狀態。

## 不支援的憑證

超出範圍的憑證包括：

[//]: # "secretref-unsupported-list-start"

- `commands.ownerDisplaySecret`
- `channels.matrix.accessToken`
- `channels.matrix.accounts.*.accessToken`
- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `discord.threadBindings.*.webhookToken`
- `whatsapp.creds.json`

[//]: # "secretref-unsupported-list-end"

基本原理：

- 這些憑證屬於動態建立、輪替、承載會話或 OAuth 持久性類別，不適用於唯讀的外部 SecretRef 解析。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
