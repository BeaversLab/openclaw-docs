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
- `skills.entries.*.apiKey`
- `agents.defaults.memorySearch.remote.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.providers.*.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `tools.web.search.apiKey`
- `tools.web.x_search.apiKey`
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
- `channels.googlechat.serviceAccount` via sibling `serviceAccountRef` (相容性例外)
- `channels.googlechat.accounts.*.serviceAccount` via sibling `serviceAccountRef` (相容性例外)

### `auth-profiles.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`; 當 `auth.profiles.<id>.mode = "oauth"` 時不受支援)
- `profiles.*.tokenRef` (`type: "token"`; 當 `auth.profiles.<id>.mode = "oauth"` 時不受支援)

[//]: # "secretref-supported-list-end"

備註：

- Auth-profile plan targets 需要 `agentId`。
- Plan entries 以 `profiles.*.key` / `profiles.*.token` 為目標並寫入 sibling refs (`keyRef` / `tokenRef`)。
- Auth-profile refs 包含在 runtime 解析和 audit coverage 中。
- OAuth policy guard：`auth.profiles.<id>.mode = "oauth"` 不能與該 profile 的 SecretRef 輸入結合使用。當違反此 policy 時，Startup/reload 和 auth-profile 解析會快速失敗。
- 對於 SecretRef 管理的 model providers，生成的 `agents/*/agent/models.json` entries 為 `apiKey`/header surfaces 保留非機密標記（而非已解析的機密值）。
- Marker persistence 是 source-authoritative：OpenClaw 從來源配置快照（解析前）寫入標記，而不是從已解析的 runtime 機密值。
- 對於網路搜尋：
  - 在明確 provider 模式下（設定 `tools.web.search.provider`），只有選定的 provider key 是啟用的。
  - 在自動模式下（未設定 `tools.web.search.provider`），只有第一個按優先級解析的 provider key 是啟用的。
  - 在自動模式下，未選定的 provider refs 在被選定之前被視為非啟用狀態。
  - 舊版 `tools.web.search.*` provider paths 在相容視窗內仍然會解析，但標準的 SecretRef surface 是 `plugins.entries.<plugin>.config.webSearch.*`。

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

理由：

- 這些憑證是鑄造、輪換、承載會話或 OAuth 持久類別，不適合唯讀外部 SecretRef 解析。
