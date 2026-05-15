---
summary: "Superficie canónica admitida frente a no admitida para las credenciales SecretRef"
read_when:
  - Verifying SecretRef credential coverage
  - Auditing whether a credential is eligible for `secrets configure` or `secrets apply`
  - Verifying why a credential is outside the supported surface
title: "Superficie de credenciales SecretRef"
---

Esta página define la superficie canónica de credenciales SecretRef.

Intención del alcance:

- Dentro del alcance: credenciales estrictamente proporcionadas por el usuario que OpenClaw no crea ni rota.
- Fuera del alcance: credenciales creadas en tiempo de ejecución o rotativas, material de actualización de OAuth y artefactos similares a sesiones.

## Credenciales admitidas

### objetivos `openclaw.json` (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `channels.googlechat.serviceAccount` mediante el `serviceAccountRef` hermano (excepción de compatibilidad)
- `channels.googlechat.accounts.*.serviceAccount` mediante el `serviceAccountRef` hermano (excepción de compatibilidad)

### Destinos `auth-profiles.json` (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`; no compatible cuando `auth.profiles.<id>.mode = "oauth"`)
- `profiles.*.tokenRef` (`type: "token"`; no compatible cuando `auth.profiles.<id>.mode = "oauth"`)

[//]: # "secretref-supported-list-end"

Notas:

- Los destinos del plan de perfil de autenticación requieren `agentId`.
- Las entradas del plan tienen como objetivo `profiles.*.key` / `profiles.*.token` y escriben referencias hermanas (`keyRef` / `tokenRef`).
- Las referencias de perfil de autenticación se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.
- En `openclaw.json`, los SecretRefs deben usar objetos estructurados como `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`. Las cadenas de marcadores `secretref-env:<ENV_VAR>` heredadas se rechazan en las rutas de credenciales de SecretRef; ejecute `openclaw doctor --fix` para migrar los marcadores válidos.
- Protección de política de OAuth: `auth.profiles.<id>.mode = "oauth"` no se puede combinar con entradas de SecretRef para ese perfil. El inicio/recarga y la resolución del perfil de autenticación fallan rápidamente cuando se viola esta política.
- Para los proveedores de modelos administrados por SecretRef, las entradas `agents/*/agent/models.json` generadas persisten marcadores no secretos (no valores de secretos resueltos) para las superficies `apiKey`/encabezado.
- La persistencia de marcadores está autorizada por la fuente: OpenClaw escribe marcadores a partir de la instantánea de configuración de fuente activa (pre-resolución), no a partir de los valores de secretos resueltos en tiempo de ejecución.
- Para la búsqueda web:
  - En el modo de proveedor explícito (`tools.web.search.provider` establecido), solo la clave de proveedor seleccionada está activa.
  - En el modo automático (`tools.web.search.provider` sin establecer), solo la primera clave de proveedor que se resuelve por precedencia está activa.
  - En el modo automático, las referencias de proveedor no seleccionadas se tratan como inactivas hasta que se seleccionan.
  - Las rutas de proveedor `tools.web.search.*` heredadas aún se resuelven durante la ventana de compatibilidad, pero la superficie SecretRef canónica es `plugins.entries.<plugin>.config.webSearch.*`.

## Credenciales no compatibles

Las credenciales fuera del alcance incluyen:

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

Fundamento:

- Estas credenciales son clases generadas, rotadas, con sesión u OAuth duraderas que no se ajustan a la resolución externa de solo lectura de SecretRef.

## Relacionado

- [Gestión de secretos](/es/gateway/secrets)
- [Semántica de credenciales de autenticación](/es/auth-credential-semantics)
