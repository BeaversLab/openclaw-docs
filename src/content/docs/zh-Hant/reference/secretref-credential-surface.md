---
summary: "Canonical supported vs unsupported SecretRef credential surface"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "SecretRef 憑證範圍"
---

本頁面定義了標準的 SecretRef 憑證範圍。

範圍意圖：

- 範圍內：嚴格由使用者提供的憑證，且 OpenClaw 不會產生或輪換這些憑證。
- 範圍外：執行時期產生或輪換的憑證、OAuth 更新材料，以及類似階段的資料。

## 支援的憑證

### `openclaw.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `agents.list[].tts.providers.*.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.providers.*.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `plugins.entries.acpx.config.mcpServers.*.env.*`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.exa.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.minimax.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `plugins.entries.voice-call.config.tts.providers.*.apiKey`
- `plugins.entries.voice-call.config.twilio.authToken`
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
- 透過同層級 `serviceAccountRef` 的 `channels.googlechat.serviceAccount` (相容性例外)
- 透過同層級 `serviceAccountRef` 的 `channels.googlechat.accounts.*.serviceAccount` (相容性例外)

### `auth-profiles.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`；當 `auth.profiles.<id>.mode = "oauth"` 時不支援)
- `profiles.*.tokenRef` (`type: "token"`；當 `auth.profiles.<id>.mode = "oauth"` 時不支援)

[//]: # "secretref-supported-list-end"

備註：

- Auth-profile 計劃目標需要 `agentId`。
- 計劃項目以 `profiles.*.key` / `profiles.*.token` 為目標並寫入同層級引用 (`keyRef` / `tokenRef`)。
- Auth-profile 引用包含在執行時期解析和稽核覆蓋範圍中。
- 在 `openclaw.json` 中，SecretRef 必須使用結構化物件，例如 `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`。舊版 `secretref-env:<ENV_VAR>` 標記字串會在 SecretRef 憑證路徑上被拒絕；請執行 `openclaw doctor --fix` 來遷移有效的標記。
- OAuth 策略防護：`auth.profiles.<id>.mode = "oauth"` 不能與該設定檔的 SecretRef 輸入結合。當違反此策略時，啟動/重新載入和驗證設定檔解析會快速失敗。
- 對於 SecretRef 管理的模型提供者，生成的 `agents/*/agent/models.json` 項目會為 `apiKey`/標頭層保存非秘密標記（而非已解析的秘密值）。
- 標記持久化以來源為準：OpenClaw 從作用中的來源配置快照（解析前）寫入標記，而非從已解析的執行時秘密值寫入。
- 對於網路搜尋：
  - 在明確提供者模式（已設定 `tools.web.search.provider`）中，僅選取的提供者金鑰有效。
  - 在自動模式（未設定 `tools.web.search.provider`）中，僅優先順序解析的第一個提供者金鑰有效。
  - 在自動模式中，未選取的提供者參照在被選取之前會被視為無效。
  - 舊版 `tools.web.search.*` 提供者路徑在相容性視窗期間仍然可以解析，但標準的 SecretRef 層為 `plugins.entries.<plugin>.config.webSearch.*`。

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

- 這些憑證屬於被鑄造、輪替、承載會話或 OAuth 持久的類別，不適合唯讀的外部 SecretRef 解析。

## 相關

- [Secrets management](/zh-Hant/gateway/secrets)
- [Auth credential semantics](/zh-Hant/auth-credential-semantics)
