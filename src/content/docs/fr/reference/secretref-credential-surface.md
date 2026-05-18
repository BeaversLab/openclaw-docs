---
summary: "Surface d'identification SecretRef canonique prise en charge vs non prise en charge"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "Surface des identifiants SecretRef"
---

Cette page définit la surface canonique des identifiants SecretRef.

Intention de la portée :

- Dans la portée : strictement les identifiants fournis par l'utilisateur que OpenClaw ne génère ni ne fait pivoter.
- Hors de la portée : les identifiants générés ou pivotés lors de l'exécution, les éléments d'actualisation OAuth et les artefacts de type session.

## Identifiants pris en charge

### Cibles `openclaw.json` (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `channels.googlechat.serviceAccount` via sibling `serviceAccountRef` (compatibility exception)
- `channels.googlechat.accounts.*.serviceAccount` via sibling `serviceAccountRef` (compatibility exception)

### `auth-profiles.json` targets (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`; non pris en charge lorsque `auth.profiles.<id>.mode = "oauth"`)
- `profiles.*.tokenRef` (`type: "token"`; non pris en charge lorsque `auth.profiles.<id>.mode = "oauth"`)

[//]: # "secretref-supported-list-end"

Notes :

- Les cibles du plan de profil d'authentification nécessitent `agentId`.
- Les entrées du plan ciblent `profiles.*.key` / `profiles.*.token` et écrivent des références sœurs (`keyRef` / `tokenRef`).
- Les références de profil d'authentification sont incluses dans la résolution à l'exécution et la couverture d'audit.
- Dans `openclaw.json`, les SecretRefs doivent utiliser des objets structurés tels que `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`. Les chaînes de marqueurs `secretref-env:<ENV_VAR>` héritées sont rejetées sur les chemins d'identification SecretRef ; exécutez `openclaw doctor --fix` pour migrer les marqueurs valides.
- Garantie de stratégie OAuth : `auth.profiles.<id>.mode = "oauth"` ne peut pas être combiné avec des entrées SecretRef pour ce profil. Le démarrage/rechargement et la résolution du profil d'authentification échouent rapidement lorsque cette stratégie est violée.
- Pour les fournisseurs de modèles gérés par SecretRef, les entrées `agents/*/agent/models.json` générées conservent des marqueurs non secrets (et non les valeurs de secrets résolues) pour les surfaces `apiKey`/en-tête.
- La persistance des marqueurs est basée sur la source : OpenClaw écrit les marqueurs à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs de secrets résolus à l'exécution.
- Pour la recherche Web :
  - En mode fournisseur explicite (`tools.web.search.provider` défini), seule la clé du fournisseur sélectionné est active.
  - En mode automatique (`tools.web.search.provider` non défini), seule la première clé de fournisseur qui se résout par priorité est active.
  - En mode automatique, les références de fournisseurs non sélectionnés sont traitées comme inactives jusqu'à leur sélection.
  - Les chemins de fournisseur `tools.web.search.*` hérités se résolvent toujours pendant la fenêtre de compatibilité, mais la surface SecretRef canonique est `plugins.entries.<plugin>.config.webSearch.*`.

## Identifiants non pris en charge

Les identifiants hors portée incluent :

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

Rationale :

- Ces identifiants sont créés, renouvelés, porteurs de session ou des classes durables OAuth qui ne correspondent pas à la résolution externe en lecture seule de SecretRef.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Sémantique des identifiants d'authentification](/fr/auth-credential-semantics)
