---
summary: "SecretRef 憑證介面的標準支援與不支援"
read_when:
  - 驗證 SecretRef 憑證覆蓋範圍
  - 稽核憑證是否符合 `secrets configure` 或 `secrets apply` 的資格
  - 驗證憑證為何超出支援介面
title: "SecretRef 憑證介面"
---

# SecretRef 憑證介面

此頁面定義了標準的 SecretRef 憑證介面。

範圍意圖：

- 範圍內：嚴格指使用者提供的憑證，且 OpenClaw 不會產生或輪替這些憑證。
- 範圍外：執行時期產生或輪替的憑證、OAuth 更新材料，以及類似階段性作業的工件。

## 支援的憑證

### `openclaw.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
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
- `channels.googlechat.serviceAccount` 透過同層級 `serviceAccountRef` (相容性例外)
- `channels.googlechat.accounts.*.serviceAccount` 透過同層級 `serviceAccountRef` (相容性例外)

### `auth-profiles.json` 目標 (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`)
- `profiles.*.tokenRef` (`type: "token"`)

[//]: # "secretref-supported-list-end"

備註：

- Auth-profile 計劃目標需要 `agentId`。
- 計劃條目目標為 `profiles.*.key` / `profiles.*.token` 並寫入同層級參照 (`keyRef` / `tokenRef`)。
- Auth-profile 參照包含在執行時期解析與稽核覆蓋範圍內。
- 對於 SecretRef 管理的模型提供者，生成的 `agents/*/agent/models.json` 條目會針對 `apiKey`/header 介面保留非機密標記 (而非解析後的機密值)。
- 標記保留是以來源為準則：OpenClaw 是根據使用中的來源配置快照 (解析前) 寫入標記，而非來自解析後的執行時期機密值。
- 針對網頁搜尋：
  - 在明確提供者模式（設定 `tools.web.search.provider`）下，只有選定的提供者金鑰是啟用的。
  - 在自動模式（未設定 `tools.web.search.provider`）下，只有依優先順序解析的第一個提供者金鑰是啟用的。
  - 在自動模式下，未選取的提供者參照在被選取之前會被視為非啟用狀態。
  - 舊版 `tools.web.search.*` 提供者路徑在相容性視窗內仍然會解析，但標準 SecretRef 介面是 `plugins.entries.<plugin>.config.webSearch.*`。

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

- 這些憑證屬於動態產生、輪替、承載會話或 OAuth 耐用類別，不適用於唯讀的外部 SecretRef 解析。

import en from "/components/footer/en.mdx";

<en />
