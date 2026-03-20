---
summary: "Estado de soporte de Matrix, capacidades y configuración"
read_when:
  - Trabajando en las funciones del canal Matrix
title: "Matrix"
---

# Matrix (complemento)

Matrix es un protocolo de mensajería abierto y descentralizado. OpenClaw se conecta como un **usuario** de Matrix
en cualquier servidor doméstico, por lo que necesitas una cuenta de Matrix para el bot. Una vez iniciada la sesión, puedes enviar un MD
al bot directamente o invitarlo a salas ("grupos" de Matrix). Beeper también es una opción de cliente válida,
pero requiere que E2EE esté habilitado.

Estado: soportado a través de un complemento (@vector-im/matrix-bot-sdk). Mensajes directos, salas, hilos, medios, reacciones,
encuestas (envío + inicio de encuesta como texto), ubicación y E2EE (con soporte criptográfico).

## Complemento requerido

Matrix se distribuye como complemento y no se incluye con la instalación principal.

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/matrix
```

Repositorio local (al ejecutar desde un repositorio git):

```bash
openclaw plugins install ./extensions/matrix
```

Si eliges Matrix durante la configuración y se detecta una extracción de git,
OpenClaw ofrecerá automáticamente la ruta de instalación local.

Detalles: [Complementos](/es/tools/plugin)

## Configuración

1. Instala el complemento Matrix:
   - Desde npm: `openclaw plugins install @openclaw/matrix`
   - Desde una extracción local: `openclaw plugins install ./extensions/matrix`
2. Crea una cuenta de Matrix en un servidor doméstico:
   - Explora las opciones de alojamiento en [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/)
   - O alojalo tú mismo.
3. Obtén un token de acceso para la cuenta del bot:
   - Usa la API de inicio de sesión de Matrix con `curl` en tu servidor doméstico:

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - Reemplaza `matrix.example.org` con la URL de tu servidor doméstico.
   - O establece `channels.matrix.userId` + `channels.matrix.password`: OpenClaw llama al mismo
     punto final de inicio de sesión, almacena el token de acceso en `~/.openclaw/credentials/matrix/credentials.json`,
     y lo reutiliza en el próximo inicio.

4. Configurar credenciales:
   - Entorno: `MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN` (o `MATRIX_USER_ID` + `MATRIX_PASSWORD`)
   - O configuración: `channels.matrix.*`
   - Si ambos están establecidos, la configuración tiene prioridad.
   - Con token de acceso: el ID de usuario se obtiene automáticamente a través de `/whoami`.
   - Cuando se establece, `channels.matrix.userId` debe ser el ID completo de Matrix (ejemplo: `@bot:example.org`).
5. Reinicia la puerta de enlace (o termina la configuración).
6. Inicia un MD con el bot o invítalo a una sala desde cualquier cliente de Matrix
   (Element, Beeper, etc.; consulta [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/)). Beeper requiere E2EE,
   así que establece `channels.matrix.encryption: true` y verifica el dispositivo.

Configuración mínima (token de acceso, ID de usuario obtenido automáticamente):

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" },
    },
  },
}
```

Configuración E2EE (cifrado de extremo a extremo habilitado):

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

## Cifrado (E2EE)

El cifrado de extremo a extremo está **soportado** a través del Rust crypto SDK.

Habilitar con `channels.matrix.encryption: true`:

- Si el módulo de cifrado se carga, las salas cifradas se descifran automáticamente.
- Los medios salientes se cifran al enviarlos a salas cifradas.
- En la primera conexión, OpenClaw solicita la verificación del dispositivo desde tus otras sesiones.
- Verifica el dispositivo en otro cliente de Matrix (Element, etc.) para habilitar el intercambio de claves.
- Si no se puede cargar el módulo criptográfico, E2EE se deshabilita y las salas cifradas no se descifrarán;
  OpenClaw registra una advertencia.
- Si ve errores de módulo criptográfico faltantes (por ejemplo, `@matrix-org/matrix-sdk-crypto-nodejs-*`),
  permita los scripts de compilación para `@matrix-org/matrix-sdk-crypto-nodejs` y ejecute
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` u obtenga el binario con
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js`.

El estado criptográfico se almacena por cuenta + token de acceso en
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
(base de datos SQLite). El estado de sincronización reside junto a él en `bot-storage.json`.
Si el token de acceso (dispositivo) cambia, se crea un nuevo almacén y el bot debe ser
verificado nuevamente para las salas cifradas.

**Verificación de dispositivo:**
Cuando E2EE está habilitado, el bot solicitará la verificación de sus otras sesiones al iniciarse.
Abra Element (u otro cliente) y apruebe la solicitud de verificación para establecer la confianza.
Una vez verificado, el bot puede descifrar mensajes en salas cifradas.

## Multicuenta

Soporte multicuenta: use `channels.matrix.accounts` con credenciales por cuenta y `name` opcional. Consulte [`gateway/configuration`](/es/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para el patrón compartido.

Cada cuenta se ejecuta como un usuario de Matrix separado en cualquier servidor doméstico. La configuración por cuenta
hereda de la configuración `channels.matrix` de nivel superior y puede anular cualquier opción
(política de MD, grupos, cifrado, etc.).

```json5
{
  channels: {
    matrix: {
      enabled: true,
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          name: "Main assistant",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_***",
          encryption: true,
        },
        alerts: {
          name: "Alerts bot",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_***",
          dm: { policy: "allowlist", allowFrom: ["@admin:example.org"] },
        },
      },
    },
  },
}
```

Notas:

- El inicio de la cuenta se serializa para evitar condiciones de carrera con importaciones de módulos concurrentes.
- Las variables de entorno (`MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN`, etc.) solo se aplican a la cuenta **predeterminada**.
- La configuración base del canal (política de MD, política de grupos, filtrado de menciones, etc.) se aplica a todas las cuentas a menos que se anule por cuenta.
- Use `bindings[].match.accountId` para enrutar cada cuenta a un agente diferente.
- El estado de cifrado se almacena por cuenta + token de acceso (almacenes de claves separados por cuenta).

## Modelo de enrutamiento

- Las respuestas siempre vuelven a Matrix.
- Los MDs comparten la sesión principal del agente; las salas se asignan a sesiones grupales.

## Control de acceso (MDs)

- Predeterminado: `channels.matrix.dm.policy = "pairing"`. Los remitentes desconocidos obtienen un código de emparejamiento.
- Aprobar vía:
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- MD públicos: `channels.matrix.dm.policy="open"` además de `channels.matrix.dm.allowFrom=["*"]`.
- `channels.matrix.dm.allowFrom` acepta ID de usuario completos de Matrix (ejemplo: `@user:server`). El asistente resuelve los nombres para mostrar a ID de usuario cuando la búsqueda en el directorio encuentra una sola coincidencia exacta.
- No use nombres para mostrar o partes locales simples (ejemplo: `"Alice"` o `"alice"`). Son ambiguos y se ignoran para la coincidencia de listas permitidas. Use ID completos `@user:server`.

## Salas (grupos)

- Predeterminado: `channels.matrix.groupPolicy = "allowlist"` (restringido por mención). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté configurado.
- Nota de ejecución: si `channels.matrix` falta por completo, la ejecución vuelve a `groupPolicy="allowlist"` para las comprobaciones de sala (incluso si `channels.defaults.groupPolicy` está configurado).
- Permitir salas con `channels.matrix.groups` (ID de sala o alias; los nombres se resuelven a ID cuando la búsqueda de directorio encuentra una sola coincidencia exacta):

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
      groupAllowFrom: ["@owner:example.org"],
    },
  },
}
```

- `requireMention: false` habilita la respuesta automática en esa sala.
- `groups."*"` puede establecer valores predeterminados para el filtrado de menciones en todas las salas.
- `groupAllowFrom` restringe qué remitentes pueden activar el bot en las salas (ID de usuario completo de Matrix).
- Las listas de permitidos `users` por sala pueden restringir aún más los remitentes dentro de una sala específica (use ID de usuario completo de Matrix).
- El asistente de configuración solicita listas de permitidos de salas (ID, alias o nombres de sala) y solo resuelve los nombres en una coincidencia exacta y única.
- Al iniciar, OpenClaw resuelve los nombres de sala/usuario en las listas de permitidos a IDs y registra el mapeo; las entradas no resueltas se ignoran para la coincidencia de la lista de permitidos.
- Las invitaciones se aceptan automáticamente de forma predeterminada; controle esto con `channels.matrix.autoJoin` y `channels.matrix.autoJoinAllowlist`.
- Para no permitir **ninguna sala**, establezca `channels.matrix.groupPolicy: "disabled"` (o mantenga una lista de permitidos vacía).
- Clave heredada: `channels.matrix.rooms` (misma forma que `groups`).

## Hilos

- Se admite el hilado de respuestas.
- `channels.matrix.threadReplies` controla si las respuestas se mantienen en los hilos:
  - `off`, `inbound` (predeterminado), `always`
- `channels.matrix.replyToMode` controla los metadatos de respuesta cuando no se responde en un hilo:
  - `off` (predeterminado), `first`, `all`

## Capacidades

| Característica         | Estado                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Mensajes directos | ✅ Compatible                                                                          |
| Salas           | ✅ Compatible                                                                          |
| Hilos         | ✅ Compatible                                                                          |
| Medios           | ✅ Compatible                                                                          |
| E2EE            | ✅ Compatible (se requiere módulo de cifrado)                                                 |
| Reacciones       | ✅ Compatible (enviar/leer mediante herramientas)                                                    |
| Encuestas           | ✅ Envío compatible; los inicios de encuestas entrantes se convierten a texto (se ignoran las respuestas/finales) |
| Ubicación        | ✅ Compatible (URI geo; altitud ignorada)                                              |
| Comandos nativos | ✅ Compatible                                                                          |

## Solución de problemas

Ejecute primero esta escala:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Luego confirme el estado de emparejamiento de MD si es necesario:

```bash
openclaw pairing list matrix
```

Fallos comunes:

- Sesión iniciada pero se ignoran los mensajes de la sala: sala bloqueada por `groupPolicy` o lista de permitidos de salas.
- MD ignorados: remitente pendiente de aprobación cuando `channels.matrix.dm.policy="pairing"`.
- Fallo en salas cifradas: falta de soporte de cifrado o discordancia en la configuración de cifrado.

Para el flujo de triaje: [/channels/troubleshooting](/es/channels/troubleshooting).

## Referencia de configuración (Matrix)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.matrix.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.matrix.homeserver`: URL del servidor principal (homeserver).
- `channels.matrix.userId`: ID de usuario de Matrix (opcional con token de acceso).
- `channels.matrix.accessToken`: token de acceso.
- `channels.matrix.password`: contraseña para iniciar sesión (token almacenado).
- `channels.matrix.deviceName`: nombre para mostrar del dispositivo.
- `channels.matrix.encryption`: habilitar E2EE (predeterminado: falso).
- `channels.matrix.initialSyncLimit`: límite de sincronización inicial.
- `channels.matrix.threadReplies`: `off | inbound | always` (predeterminado: inbound).
- `channels.matrix.textChunkLimit`: tamaño del fragmento de texto saliente (caracteres).
- `channels.matrix.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.matrix.dm.policy`: `pairing | allowlist | open | disabled` (predeterminado: pairing).
- `channels.matrix.dm.allowFrom`: lista blanca de MD (ID de usuario completo de Matrix). `open` requiere `"*"`. El asistente resuelve los nombres a los ID cuando es posible.
- `channels.matrix.groupPolicy`: `allowlist | open | disabled` (predeterminado: allowlist).
- `channels.matrix.groupAllowFrom`: remitentes en lista blanca para mensajes de grupo (ID de usuario completo de Matrix).
- `channels.matrix.allowlistOnly`: forzar reglas de lista blanca para MD + salas.
- `channels.matrix.groups`: mapa de lista blanca de grupo + configuración por sala.
- `channels.matrix.rooms`: configuración/lista blanca de grupo heredada.
- `channels.matrix.replyToMode`: modo de respuesta para hilos/etiquetas.
- `channels.matrix.mediaMaxMb`: límite de medios entrantes/salientes (MB).
- `channels.matrix.autoJoin`: manejo de invitaciones (`always | allowlist | off`, predeterminado: always).
- `channels.matrix.autoJoinAllowlist`: ID/alias de sala permitidos para unirse automáticamente.
- `channels.matrix.accounts`: configuración multicuenta clasificada por ID de cuenta (cada cuenta hereda la configuración de nivel superior).
- `channels.matrix.actions`: filtrado de herramientas por acción (reacciones/mensajes/pines/memberInfo/channelInfo).

import en from "/components/footer/en.mdx";

<en />
