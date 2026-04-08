---
summary: "Canonical supported vs unsupported SecretRef credential surface"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "SecretRef Credential Surface"
---

# SecretRef credential surface

This page defines the canonical SecretRef credential surface.

Scope intent:

- In scope: strictly user-supplied credentials that OpenClaw does not mint or rotate.
- Out of scope: runtime-minted or rotating credentials, OAuth refresh material, and session-like artifacts.

## Supported credentials

### `openclaw.json` targets (`secrets configure` + `secrets apply` + `secrets audit`)

[//]: # "secretref-supported-list-start"

- `models.providers.*.apiKey`
- `models.providers.*.headers.*`
- `models.providers.*.request.auth.token`
- `models.providers.*.request.auth.value`
- `models.providers.*.request.headers.*`
- `models.providers.*.request.proxy.tls.ca`
- `models.providers.*.request.proxy.tls.cert`
- `models.providers.*.request.proxy.tls.key`
- `models.providers.*.request.proxy.tls.passphrase`
- `models.providers.*.request.tls.ca`
- `models.providers.*.request.tls.cert`
- `models.providers.*.request.tls.key`
- `models.providers.*.request.tls.passphrase`
- `skills.entries.*.apiKey`
- `agents.defaults.memorySearch.remote.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.providers.*.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `plugins.entries.firecrawl.config.webFetch.apiKey`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.minimax.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `tools.web.search.apiKey`
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
- `channels.discord.voice.tts.providers.*.apiKey`
- `channels.discord.accounts.*.token`
- `channels.discord.accounts.*.pluralkit.token`
- `channels.discord.accounts.*.voice.tts.providers.*.apiKey`
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
- `channels.matrix.accessToken`
- `channels.matrix.password`
- `channels.matrix.accounts.*.accessToken`
- `channels.matrix.accounts.*.password`
- `channels.nextcloud-talk.botSecret`
- `channels.nextcloud-talk.apiPassword`
- `channels.nextcloud-talk.accounts.*.botSecret`
- `channels.nextcloud-talk.accounts.*.apiPassword`
- `channels.zalo.botToken`
- `channels.zalo.webhookSecret`
- `channels.zalo.accounts.*.botToken`
- `channels.zalo.accounts.*.webhookSecret`
- `channels.googlechat.serviceAccount` 透過同級 `serviceAccountRef` (相容性例外)
- `channels.googlechat.accounts.*.serviceAccount` 透過同級 `serviceAccountRef` (相容性例外)

### `auth-profiles.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`; 當 `auth.profiles.<id>.mode = "oauth"` 時不支援)
- `profiles.*.tokenRef` (`type: "token"`; 當 `auth.profiles.<id>.mode = "oauth"` 時不支援)

[//]: # "secretref-supported-list-end"

註記：

- Auth-profile 計畫目標需要 `agentId`。
- 計畫項目目標為 `profiles.*.key` / `profiles.*.token` 並寫入同級參照 (`keyRef` / `tokenRef`)。
- Auth-profile 參照包含在執行階段解析和稽核覆蓋範圍內。
- OAuth 原則守衛：`auth.profiles.<id>.mode = "oauth"` 不能與該設定檔的 SecretRef 輸入結合。當此原則被違反時，啟動/重新載入和 auth-profile 解析會快速失敗。
- 對於 SecretRef 管理的模型提供者，產生的 `agents/*/agent/models.json` 項目會為 `apiKey`/標頭表面保留非機密標記 (而非已解析的機密值)。
- 標記持久性是來源權威的：OpenClaw 從作用中來源設定快照 (解析前) 寫入標記，而非從已解析的執行階段機密值寫入。
- 對於網路搜尋：
  - 在明確提供者模式 (設定 `tools.web.search.provider`) 下，只有選取的提供者金鑰是作用中的。
  - 在自動模式（未設定 `tools.web.search.provider`）下，只有按優先順序解析的第一個提供者金鑰是啟用的。
  - 在自動模式下，未選取的提供者參照在被選取之前會被視為非啟用狀態。
  - 舊版的 `tools.web.search.*` 提供者路徑在相容性視窗期間仍會解析，但標準的 SecretRef 介面是 `plugins.entries.<plugin>.config.webSearch.*`。

## 不支援的憑證

範圍外的憑證包括：

[//]: # "secretref-unsupported-list-start"

- `commands.ownerDisplaySecret`
- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `channels.discord.threadBindings.webhookToken`
- `channels.discord.accounts.*.threadBindings.webhookToken`
- `channels.whatsapp.creds.json`
- `channels.whatsapp.accounts.*.creds.json`

[//]: # "secretref-unsupported-list-end"

基本原理：

- 這些憑證屬於建立、輪替、承載工作階段或 OAuth 耐用類別，不適合唯讀的外部 SecretRef 解析。
