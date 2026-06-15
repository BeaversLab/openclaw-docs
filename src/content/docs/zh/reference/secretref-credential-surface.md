---
summary: "受支持的与不受支持的 SecretRef 凭据规范定义"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "SecretRef 凭证范围"
---

此页面定义了规范的 SecretRef 凭证范围。

范围意图：

- 范围内：完全由用户提供的凭证，即 OpenClaw 不创建或轮换的凭证。
- 范围外：运行时创建或轮换的凭证、OAuth 刷新材料以及类似会话的工件。

## 支持的凭证

### `openclaw.json` 目标 (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `plugins.entries.voice-call.config.realtime.providers.*.apiKey`
- `plugins.entries.voice-call.config.streaming.providers.*.apiKey`
- `plugins.entries.voice-call.config.tts.providers.*.apiKey`
- `plugins.entries.voice-call.config.twilio.authToken`
- `tools.web.search.*.apiKey`
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
- `channels.sms.authToken`
- `channels.sms.accounts.*.authToken`
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
- `channels.feishu.appSecret`
- `channels.feishu.encryptKey`
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.encryptKey`
- `channels.feishu.accounts.*.verificationToken`
- `channels.qqbot.clientSecret`
- `channels.qqbot.accounts.*.clientSecret`
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
- 通过同级 `serviceAccountRef` 实现的 `channels.googlechat.serviceAccount`（兼容性例外）
- 通过同级 `serviceAccountRef` 实现的 `channels.googlechat.accounts.*.serviceAccount`（兼容性例外）

### `auth-profiles.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

- `profiles.*.keyRef`（`type: "api_key"`；当 `auth.profiles.<id>.mode = "oauth"` 时不支持）
- `profiles.*.tokenRef`（`type: "token"`；当 `auth.profiles.<id>.mode = "oauth"` 时不支持）

[//]: # "secretref-supported-list-end"

注：

- Auth-profile 计划目标需要 `agentId`。
- 计划条目目标是 `profiles.*.key` / `profiles.*.token` 并写入同级引用（`keyRef` / `tokenRef`）。
- Auth-profile 引用包含在运行时解析和审计覆盖范围内。
- 在 `openclaw.json` 中，SecretRefs 必须使用结构化对象，例如 `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`。SecretRef 凭据路径上会拒绝传统的 `secretref-env:<ENV_VAR>` 标记字符串；运行 `openclaw doctor --fix` 以迁移有效的标记。
- OAuth 策略守卫：OAuth`auth.profiles.<id>.mode = "oauth"` 不能与该配置文件的 SecretRef 输入结合使用。当违反此策略时，启动/重新加载和认证配置文件解析会快速失败。
- 对于由 SecretRef 管理的模型提供商，生成的 `agents/*/agent/models.json` 条目会为 `apiKey`/header 表面持久化非机密标记（而非已解析的机密值）。
- 标记持久化是以源为权威的：OpenClaw 从活动源配置快照（解析前）写入标记，而不是从已解析的运行时机密值写入。
- 对于网络搜索：
  - 在显式提供商模式（已设置 `tools.web.search.provider`）下，只有选定的提供商密钥是活动的。
  - 在自动模式（未设置 `tools.web.search.provider`）下，只有按优先级解析的第一个提供商密钥是活动的。
  - 在自动模式下，未选定的提供商引用在被选定之前被视为非活动的。
  - 在兼容性窗口期间，传统的 `tools.web.search.*` 提供商路径仍然会解析，但规范的 SecretRef 表面是 `plugins.entries.<plugin>.config.webSearch.*`。

## 不支持的凭据

范围之外的凭据包括：

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

- 这些凭据属于由系统生成、轮换、携带会话或 OAuth 持久类的凭据，不适合只读的外部 SecretRef 解析。

## 相关

- [机密管理](/zh/gateway/secrets)
- [认证凭据语义](/zh/auth-credential-semantics)
