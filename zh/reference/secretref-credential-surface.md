---
summary: "规范的支持与不支持 SecretRef 身份验证表面"
read_when:
  - "Verifying SecretRef credential coverage"
  - "Auditing whether a credential is eligible for `secrets configure` or `secrets apply`"
  - "Verifying why a credential is outside the supported surface"
title: "SecretRef 身份验证表面"
---

# SecretRef 身份验证表面

本页面定义了规范的 SecretRef 身份验证表面。

范围意图：

- 范围内：严格由用户提供的、OpenClaw 不创建或轮换的身份验证。
- 范围外：运行时创建或轮换的身份验证、OAuth 刷新材料和类似会话的工件。

## 支持的身份验证

### `openclaw.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

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
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
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
- `channels.googlechat.serviceAccount` 通过兄弟 `serviceAccountRef`（兼容性例外）
- `channels.googlechat.accounts.*.serviceAccount` 通过兄弟 `serviceAccountRef`（兼容性例外）

### `auth-profiles.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

- `profiles.*.keyRef`（`type: "api_key"`）
- `profiles.*.tokenRef`（`type: "token"`）

[//]: # "secretref-supported-list-end"

注意事项：

- 身份验证文件计划目标需要 `agentId`。
- 计划条目目标 `profiles.*.key` / `profiles.*.token` 并写入兄弟引用（`keyRef` / `tokenRef`）。
- 身份验证文件引用包含在运行时解析和审计覆盖中。
- 对于 SecretRef 管理的模型提供商，生成的 `agents/*/agent/models.json` 条目为 `apiKey`/header 表面持久化非秘密标记（不是解析的秘密值）。
- 对于网络搜索：
  - 在显式提供商模式（设置了 `tools.web.search.provider`）下，仅选定的提供商密钥处于活动状态。
  - 在自动模式（未设置 `tools.web.search.provider`）下，仅按优先级解析的第一个提供商密钥处于活动状态。
  - 在自动模式下，非选定的提供商引用被视为非活动状态，直到被选中。

## 不支持的身份验证

范围外的身份验证包括：

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

- 这些身份验证是已创建、已轮换、承载会话或 OAuth 持久类，不适合只读外部 SecretRef 解析。
