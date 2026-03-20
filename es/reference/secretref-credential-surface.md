---
summary: "Superficie de credenciales SecretRef admitida frente a no admitida"
read_when:
  - Verificación de la cobertura de credenciales SecretRef
  - Auditoría de si una credencial es elegible para `secrets configure` o `secrets apply`
  - Verificación de por qué una credencial está fuera de la superficie admitida
title: "Superficie de credenciales SecretRef"
---

# Superficie de credenciales SecretRef

Esta página define la superficie canónica de credenciales SecretRef.

Intención del alcance:

- Dentro del alcance: estrictamente credenciales proporcionadas por el usuario que OpenClaw no genera ni rota.
- Fuera del alcance: credenciales generadas en tiempo de ejecución o rotativas, material de actualización de OAuth y artefactos tipo sesión.

## Credenciales admitidas

### Objetivos de `openclaw.json` (`secrets configure` + `secrets apply` + `secrets audit`)

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
- `channels.googlechat.serviceAccount` mediante `serviceAccountRef` del mismo nivel (excepción de compatibilidad)
- `channels.googlechat.accounts.*.serviceAccount` mediante `serviceAccountRef` del mismo nivel (excepción de compatibilidad)

### objetivos `auth-profiles.json` (`secrets configure` + `secrets apply` + `secrets audit`)

- `profiles.*.keyRef` (`type: "api_key"`)
- `profiles.*.tokenRef` (`type: "token"`)

[//]: # "secretref-supported-list-end"

Notas:

- Los objetivos del plan de perfil de autenticación requieren `agentId`.
- Las entradas del plan tienen como objetivo `profiles.*.key` / `profiles.*.token` y escriben referencias del mismo nivel (`keyRef` / `tokenRef`).
- Las referencias del perfil de autenticación se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.
- Para los proveedores de modelos administrados por SecretRef, las entradas `agents/*/agent/models.json` generadas conservan marcadores no secretos (no valores secretos resueltos) para las superficies `apiKey`/encabezado.
- La persistencia de los marcadores tiene autoridad de origen: OpenClaw escribe los marcadores a partir de la instantánea de la configuración de origen activa (antes de la resolución), no a partir de los valores secretos resueltos en tiempo de ejecución.
- Para búsqueda web:
  - En el modo de proveedor explícito (`tools.web.search.provider` establecido), solo la clave de proveedor seleccionada está activa.
  - En el modo automático (`tools.web.search.provider` sin establecer), solo la primera clave de proveedor que se resuelve por precedencia está activa.
  - En el modo automático, las referencias de proveedor no seleccionadas se tratan como inactivas hasta que se seleccionan.
  - Las rutas de proveedor `tools.web.search.*` heredadas aún se resuelven durante la ventana de compatibilidad, pero la superficie SecretRef canónica es `plugins.entries.<plugin>.config.webSearch.*`.

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

Justificación:

- Estas credenciales son clases creadas, rotadas, con sesión u OAuth duraderas que no se ajustan a la resolución SecretRef externa de solo lectura.

import es from "/components/footer/es.mdx";

<es />
