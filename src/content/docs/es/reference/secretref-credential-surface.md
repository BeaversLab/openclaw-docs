---
summary: "Superficie canónica admitida frente a no admitida para las credenciales SecretRef"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "Superficie de credenciales SecretRef"
---

# Superficie de credenciales SecretRef

En esta página se define la superficie canónica de las credenciales SecretRef.

Intención del alcance:

- Dentro del alcance: estrictamente las credenciales proporcionadas por el usuario que OpenClaw no genera ni rota.
- Fuera del alcance: credenciales generadas en tiempo de ejecución o rotativas, material de actualización de OAuth y artefactos similares a sesiones.

## Credenciales compatibles

### Objetivos `openclaw.json` (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `plugins.entries.tavily.config.webSearch.apiKey`
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
- `channels.googlechat.serviceAccount` a través de `serviceAccountRef` secundario (excepción de compatibilidad)
- `channels.googlechat.accounts.*.serviceAccount` a través de `serviceAccountRef` secundario (excepción de compatibilidad)

### `auth-profiles.json` objetivos (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`)
- `profiles.*.tokenRef` (`type: "token"`)

[//]: # "secretref-supported-list-end"

Notas:

- Los objetivos del plan de perfil de autenticación requieren `agentId`.
- Las entradas del plan apuntan a `profiles.*.key` / `profiles.*.token` y escriben referencias secundarias (`keyRef` / `tokenRef`).
- Las referencias del perfil de autenticación se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.
- Para los proveedores de modelos administrados por SecretRef, las entradas `agents/*/agent/models.json` generadas mantienen marcadores no secretos (no valores secretos resueltos) para las superficies `apiKey`/encabezado.
- La persistencia de marcadores es con autoridad de origen: OpenClaw escribe marcadores a partir de la instantánea de configuración de origen activa (pre-resolución), no a partir de valores secretos de tiempo de ejecución resueltos.
- Para búsqueda web:
  - En el modo de proveedor explícito (`tools.web.search.provider` establecido), solo la clave de proveedor seleccionada está activa.
  - En el modo automático (`tools.web.search.provider` sin establecer), solo la primera clave de proveedor que se resuelve por precedencia está activa.
  - En el modo automático, las referencias de proveedor no seleccionadas se tratan como inactivas hasta que se seleccionan.
  - Las rutas de proveedor `tools.web.search.*` heredadas todavía se resuelven durante la ventana de compatibilidad, pero la superficie SecretRef canónica es `plugins.entries.<plugin>.config.webSearch.*`.

## Credenciales no compatibles

Las credenciales fuera de alcance incluyen:

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

Fundamento:

- Estas credenciales son clases creadas, rotadas, con sesión o durables de OAuth que no se ajustan a la resolución externa de solo lectura de SecretRef.
