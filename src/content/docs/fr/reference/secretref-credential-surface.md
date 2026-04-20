---
summary: "Surface d'identification SecretRef canonique prise en charge vs non prise en charge"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "Surface d'identification SecretRef"
---

# Surface d'identification SecretRef

Cette page définit la surface d'identification SecretRef canonique.

Intention de la portée :

- Dans la portée : strictement les identifiants fournis par l'utilisateur que OpenClaw ne crée ni ne fait pivoter.
- Hors de la portée : identifiants créés ou pivotant au moment de l'exécution, éléments d'actualisation OAuth et artefacts de type session.

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
- `agents.list[].memorySearch.remote.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.providers.*.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.exa.config.webSearch.apiKey`
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
- `channels.googlechat.serviceAccount` via sibling `serviceAccountRef` (compatibilité exception)
- `channels.googlechat.accounts.*.serviceAccount` via sibling `serviceAccountRef` (compatibilité exception)

### `auth-profiles.json` targets (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"` ; non pris en charge lorsque `auth.profiles.<id>.mode = "oauth"`)
- `profiles.*.tokenRef` (`type: "token"` ; non pris en charge lorsque `auth.profiles.<id>.mode = "oauth"`)

[//]: # "secretref-supported-list-end"

Remarques :

- Les cibles du plan de profil d'authentification nécessitent `agentId`.
- Les entrées de plan ciblent `profiles.*.key` / `profiles.*.token` et écrivent des références frères (`keyRef` / `tokenRef`).
- Les références de profil d'authentification sont incluses dans la résolution au moment de l'exécution et la couverture d'audit.
- Garde de stratégie OAuth : `auth.profiles.<id>.mode = "oauth"` ne peut pas être combiné avec des entrées SecretRef pour ce profil. Le démarrage/rechargement et la résolution du profil d'authentification échouent rapidement lorsque cette stratégie est violée.
- Pour les fournisseurs de modèles gérés par SecretRef, les entrées `agents/*/agent/models.json` générées conservent des marqueurs non secrets (pas les valeurs de secrets résolues) pour les surfaces `apiKey`/en-tête.
- La persistance des marqueurs est source-autoritaire : OpenClaw écrit les marqueurs à partir de l'instantané de la configuration source active (pré-résolution), et non à partir des valeurs de secrets résolues au moment de l'exécution.
- Pour la recherche Web :
  - En mode fournisseur explicite (`tools.web.search.provider` défini), seule la clé du fournisseur sélectionné est active.
  - En mode automatique (`tools.web.search.provider` non défini), seule la première clé de provider résolue par priorité est active.
  - En mode automatique, les références de provider non sélectionnées sont considérées comme inactives jusqu'à leur sélection.
  - Les chemins de provider hérités `tools.web.search.*` se résolvent toujours pendant la fenêtre de compatibilité, mais la surface SecretRef canonique est `plugins.entries.<plugin>.config.webSearch.*`.

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

Justification :

- Ces identifiants sont des classes émises, pivotées, porteuses de session ou durables OAuth qui ne correspondent pas à une résolution SecretRef externe en lecture seule.
