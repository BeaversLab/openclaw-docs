---
summary: "Soporte de Signal a través de signal-cli (demonio nativo o contenedor bbernhard), rutas de configuración y modelo de número"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

Estado: integración de CLI externa. Gateway se comunica con `signal-cli` a través de HTTP — ya sea demonio nativo (JSON-RPC + SSE) o contenedor bbernhard/signal-cli-rest-api (REST + WebSocket).

## Requisitos previos

- OpenClaw instalado en su servidor (el flujo de Linux a continuación se probó en Ubuntu 24).
- Una de:
  - `signal-cli` disponible en el host (modo nativo), **o**
  - contenedor Docker `bbernhard/signal-cli-rest-api` (modo contenedor).
- Un número de teléfono que pueda recibir un SMS de verificación (para la ruta de registro por SMS).
- Acceso al navegador para el captcha de Signal (`signalcaptchas.org`) durante el registro.

## Configuración rápida (principiante)

1. Use un **número de Signal separado** para el bot (recomendado).
2. Instale `signal-cli` (se requiere Java si usa la compilación JVM).
3. Elija una ruta de configuración:
   - **Ruta A (enlace QR):** `signal-cli link -n "OpenClaw"` y escanee con Signal.
   - **Ruta B (registro por SMS):** registre un número dedicado con captcha + verificación por SMS.
4. Configure OpenClaw y reinicie el gateway.
5. Envíe el primer MD y apruebe el emparejamiento (`openclaw pairing approve signal <CODE>`).

Configuración mínima:

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

Referencia de campos:

| Campo        | Descripción                                                         |
| ------------ | ------------------------------------------------------------------- |
| `account`    | Número de teléfono del bot en formato E.164 (`+15551234567`)        |
| `cliPath`    | Ruta a `signal-cli` (`signal-cli` si está en `PATH`)                |
| `configPath` | directorio de configuración de signal-cli pasado como `--config`    |
| `dmPolicy`   | política de acceso a DM (`pairing` recomendado)                     |
| `allowFrom`  | Números de teléfono o valores `uuid:<id>` permitidos para enviar DM |

## Qué es

- Canal de Signal a través de `signal-cli` (no libsignal integrado).
- Enrutamiento determinista: las respuestas siempre vuelven a Signal.
- Los DMs comparten la sesión principal del agente; los grupos están aislados (`agent:<agentId>:signal:group:<groupId>`).

## Escrituras de configuración

De forma predeterminada, se permite a Signal escribir actualizaciones de configuración activadas por `/config set|unset` (requiere `commands.config: true`).

Desactivar con:

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## El modelo de número (importante)

- La puerta de enlace se conecta a un **dispositivo Signal** (la cuenta `signal-cli`).
- Si ejecuta el bot en **su cuenta personal de Signal**, ignorará sus propios mensajes (protección contra bucles).
- Para "Le envío un mensaje al bot y responde", use un **número de bot separado**.

## Ruta de configuración A: vincular cuenta de Signal existente (QR)

1. Instale `signal-cli` (construcción JVM o nativa).
2. Vincular una cuenta de bot:
   - `signal-cli link -n "OpenClaw"` y luego escanee el QR en Signal.
3. Configure Signal e inicie la puerta de enlace.

Ejemplo:

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

Soporte multicuenta: use `channels.signal.accounts` con configuración por cuenta y `name` opcional. Consulte [`gateway/configuration`](/es/gateway/config-channels#multi-account-all-channels) para el patrón compartido.

## Ruta de configuración B: registrar número de bot dedicado (SMS, Linux)

Use esto cuando desee un número de bot dedicado en lugar de vincular una cuenta de aplicación de Signal existente.

1. Obtenga un número que pueda recibir SMS (o verificación por voz para líneas fijas).
   - Use un número de bot dedicado para evitar conflictos de cuenta/sesión.
2. Instale `signal-cli` en el host de la puerta de enlace:

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

Si usa la compilación JVM (`signal-cli-${VERSION}.tar.gz`), instale JRE 25+ primero.
Mantenga `signal-cli` actualizado; los desarrolladores originales señalan que las versiones antiguas pueden romperse a medida que cambian las API del servidor de Signal.

3. Registre y verifique el número:

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

Si se requiere captcha:

1. Abra `https://signalcaptchas.org/registration/generate.html`.
2. Complete el captcha, copie el destino del enlace `signalcaptcha://...` de "Abrir Signal".
3. Ejecuta desde la misma IP externa que la sesión del navegador cuando sea posible.
4. Ejecuta el registro de nuevo inmediatamente (los tokens de captcha caducan rápido):

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. Configura OpenClaw, reinicia el gateway, verifica el canal:

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. Empareja tu remitente de MD:
   - Envía cualquier mensaje al número del bot.
   - Aprueba el código en el servidor: `openclaw pairing approve signal <PAIRING_CODE>`.
   - Guarda el número del bot como un contacto en tu teléfono para evitar "Contacto desconocido".

<Warning>Registrar una cuenta de número de teléfono con `signal-cli` puede desautenticar la sesión principal de la aplicación Signal para ese número. Preferiblemente usa un número de bot dedicado, o usa el modo de enlace QR si necesitas mantener la configuración de tu aplicación de teléfono existente.</Warning>

Referencias de origen:

- `signal-cli` README: `https://github.com/AsamK/signal-cli`
- Flujo de Captcha: `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- Flujo de enlace: `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## Modo de demonio externo (httpUrl)

Si quieres gestionar `signal-cli` tú mismo (arranques en frío lentos de JVM, init de contenedor o CPUs compartidas), ejecuta el demonio por separado y apunta OpenClaw a él:

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false,
    },
  },
}
```

Esto omite la generación automática y la espera de inicio dentro de OpenClaw. Para inicios lentos al generarse automáticamente, establece `channels.signal.startupTimeoutMs`.

## Modo contenedor (bbernhard/signal-cli-rest-api)

En lugar de ejecutar `signal-cli` de forma nativa, puede usar el contenedor Docker [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). Esto envuelve `signal-cli` detrás de una API REST y una interfaz WebSocket.

Requisitos:

- El contenedor **debe** ejecutarse con `MODE=json-rpc` para recibir mensajes en tiempo real.
- Registra o vincula tu cuenta de Signal dentro del contenedor antes de conectar OpenClaw.

Servicio `docker-compose.yml` de ejemplo:

```yaml
signal-cli:
  image: bbernhard/signal-cli-rest-api:latest
  environment:
    MODE: json-rpc
  ports:
    - "8080:8080"
  volumes:
    - signal-cli-data:/home/.local/share/signal-cli
```

Configuración de OpenClaw:

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      httpUrl: "http://signal-cli:8080",
      autoStart: false,
      apiMode: "container", // or "auto" to detect automatically
    },
  },
}
```

El campo `apiMode` controla qué protocolo usa OpenClaw:

| Valor         | Comportamiento                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `"auto"`      | (Predeterminado) Sondea ambos transportes; el streaming valida la recepción del WebSocket del contenedor |
| `"native"`    | Fuerza signal-cli nativo (JSON-RPC en `/api/v1/rpc`, SSE en `/api/v1/events`)                            |
| `"container"` | Fuerza el contenedor bbernhard (REST en `/v2/send`, WebSocket en `/v1/receive/{account}`)                |

Cuando `apiMode` es `"auto"`, OpenClaw almacena en caché el modo detectado durante 30 segundos para evitar sondeos repetidos. La recepción del contenedor solo se selecciona para streaming después de que `/v1/receive/{account}` actualice a WebSocket, lo cual requiere `MODE=json-rpc`.

El modo contenedor soporta las mismas operaciones del canal Signal que el modo nativo donde el contenedor expone las APIs correspondientes: envíos, recepciones, archivos adjuntos, indicadores de escritura, confirmaciones de lectura/visto, reacciones, grupos y texto con estilo. OpenClaw traduce sus llamadas RPC nativas de Signal en las cargas REST del contenedor, incluyendo `group.{base64(internal_id)}` de IDs de grupo y `text_mode: "styled"` para texto formateado.

Notas operativas:

- Use `autoStart: false` con el modo contenedor. OpenClaw no debe iniciar un demonio nativo cuando se selecciona `apiMode: "container"`.
- Use `MODE=json-rpc` para recibir. `MODE=normal` puede hacer que `/v1/about` parezca saludable, pero `/v1/receive/{account}` no actualiza a WebSocket, por lo que OpenClaw no seleccionará el streaming de recepción del contenedor en el modo `auto`.
- Establezca `apiMode: "container"` cuando sepa que `httpUrl` apunta a la API REST de bbernhard. Establezca `apiMode: "native"` cuando sepa que apunta al JSON-RPC/SSE nativo de `signal-cli`. Use `"auto"` cuando el despliegue pueda variar.
- Las descargas de adjuntos del contenedor respetan los mismos límites de bytes de medios que el modo nativo. Las respuestas sobredimensionadas se rechazan antes de ser totalmente almacenadas en el búfer cuando el servidor envía `Content-Length`, y mientras se transmite en streaming de otro modo.

## Control de acceso (MDs + grupos)

MDs:

- Predeterminado: `channels.signal.dmPolicy = "pairing"`.
- Los remitentes desconocidos reciben un código de vinculación; los mensajes se ignoran hasta que sean aprobados (los códigos caducan después de 1 hora).
- Aprobar vía:
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- El emparejamiento (pairing) es el intercambio de tokens predeterminado para los MD de Signal. Detalles: [Emparejamiento](/es/channels/pairing)
- Los remitentes solo con UUID (de `sourceUuid`) se almacenan como `uuid:<id>` en `channels.signal.allowFrom`.

Grupos:

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` controla qué grupos o remitentes pueden activar respuestas de grupo cuando se establece `allowlist`; las entradas pueden ser IDs de grupos de Signal (sin procesar, `group:<id>` o `signal:group:<id>`), números de teléfono de los remitentes, valores `uuid:<id>` o `*`.
- `channels.signal.groups["<group-id>" | "*"]` puede anular el comportamiento del grupo con `requireMention`, `tools` y `toolsBySender`.
- Use `channels.signal.accounts.<id>.groups` para anulaciones por cuenta en configuraciones multicuenta.
- Permitir un grupo de Signal a través de `groupAllowFrom` no desactiva por sí solo el filtrado de menciones. Una entrada `channels.signal.groups["<group-id>"]` configurada específicamente procesa cada mensaje de grupo a menos que se establezca `requireMention=true`.
- Nota de tiempo de ejecución: si `channels.signal` falta por completo, el tiempo de ejecución recurre a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está establecido).

## Cómo funciona (comportamiento)

- Modo nativo: `signal-cli` se ejecuta como demonio; la puerta de enlace lee eventos a través de SSE.
- Modo contenedor: la puerta de enlace envía a través de la API REST y recibe a través de WebSocket.
- Los mensajes entrantes se normalizan en el sobre del canal compartido.
- Las respuestas siempre se enrutan de vuelta al mismo número o grupo.

## Medios + límites

- El texto saliente se divide en partes de `channels.signal.textChunkLimit` (predeterminado 4000).
- División opcional por nuevas líneas: establezca `channels.signal.chunkMode="newline"` para dividir en líneas en blanco (límites de párrafo) antes de la división por longitud.
- Se admiten archivos adjuntos (base64 obtenidos de `signal-cli`).
- Los archivos adjuntos de notas de voz usan el nombre de archivo `signal-cli` como alternativa MIME cuando falta `contentType`, por lo que la transcripción de audio aún puede clasificar las notas de voz AAC.
- Límite predeterminado de medios: `channels.signal.mediaMaxMb` (predeterminado 8).
- Use `channels.signal.ignoreAttachments` para omitir la descarga de medios.
- El contexto del historial del grupo usa `channels.signal.historyLimit` (o `channels.signal.accounts.*.historyLimit`), recurriendo a `messages.groupChat.historyLimit`. Establezca `0` para deshabilitar (por defecto 50).

## Indicadores de escritura + confirmaciones de lectura

- **Indicadores de escritura**: OpenClaw envía señales de escritura a través de `signal-cli sendTyping` y las actualiza mientras se ejecuta una respuesta.
- **Confirmaciones de lectura**: cuando `channels.signal.sendReadReceipts` es verdadero, OpenClaw reenvía las confirmaciones de lectura para los MD permitidos.
- Signal-cli no expone confirmaciones de lectura para grupos.

## Reacciones (herramienta de mensaje)

- Use `message action=react` con `channel=signal`.
- Objetivos: E.164 o UUID del remitente (use `uuid:<id>` de la salida del emparejamiento; también funciona el UUID simple).
- `messageId` es la marca de tiempo de Signal para el mensaje al que está reaccionando.
- Las reacciones de grupo requieren `targetAuthor` o `targetAuthorUuid`.

Ejemplos:

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

Configuración:

- `channels.signal.actions.reactions`: habilitar/deshabilitar acciones de reacción (por defecto verdadero).
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`.
  - `off`/`ack` deshabilita las reacciones del agente (la herramienta de mensaje `react` dará error).
  - `minimal`/`extensive` habilita las reacciones del agente y establece el nivel de orientación.
- Invalidaciones por cuenta: `channels.signal.accounts.<id>.actions.reactions`, `channels.signal.accounts.<id>.reactionLevel`.

## Reacciones de aprobación

Las solicitudes de aprobación de ejecución y complementos de Signal usan los bloques de enrutamiento de nivel superior `approvals.exec` y
`approvals.plugin`. Signal no tiene un
bloque `channels.signal.execApprovals`.

- `👍` aprueba una vez.
- `👎` deniega.
- Use `/approve <id> allow-always` cuando una solicitud ofrezca aprobación persistente.

La resolución de reacciones de aprobación requiere aprobadores de Signal explícitos de
`channels.signal.allowFrom`, `channels.signal.defaultTo`, o los campos de nivel de cuenta correspondientes.
Las solicitudes de aprobación de ejecución directa en el mismo chat aún pueden suprimir el respaldo local `/approve` duplicado
sin aprobadores explícitos; las aprobaciones de grupo sin aprobadores mantienen visible el respaldo local.

## Destinos de entrega (CLI/cron)

- MD: `signal:+15551234567` (o E.164 simple).
- MD UUID: `uuid:<id>` (o UUID simple).
- Grupos: `signal:group:<groupId>`.
- Nombres de usuario: `username:<name>` (si su cuenta de Signal lo admite).

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
openclaw pairing list signal
```

Fallos comunes:

- Demonio accesible pero sin respuestas: verifique la configuración de la cuenta/demonio (`httpUrl`, `account`) y el modo de recepción.
- MD ignorados: el remitente está pendiente de aprobación de emparejamiento.
- Mensajes de grupo ignorados: el bloqueo de remitente/mención del grupo impide la entrega.
- Errores de validación de configuración después de ediciones: ejecute `openclaw doctor --fix`.
- Signal no aparece en el diagnóstico: confirme `channels.signal.enabled: true`.

Verificaciones adicionales:

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

Para el flujo de triaje: [/channels/troubleshooting](/es/channels/troubleshooting).

## Notas de seguridad

- `signal-cli` almacena las claves de la cuenta localmente (típicamente en `~/.local/share/signal-cli/data/`).
- Haz una copia de seguridad del estado de la cuenta de Signal antes de migrar o reconstruir el servidor.
- Mantén `channels.signal.dmPolicy: "pairing"` a menos que explícitamente desees un acceso a DM más amplio.
- La verificación por SMS solo es necesaria para los flujos de registro o recuperación, pero perder el control del número/cuenta puede complicar el nuevo registro.

## Referencia de configuración (Signal)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.signal.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.signal.apiMode`: `auto | native | container` (predeterminado: auto). Consulta [Container mode](#container-mode-bbernhardsignal-cli-rest-api).
- `channels.signal.account`: E.164 para la cuenta del bot.
- `channels.signal.cliPath`: ruta a `signal-cli`.
- `channels.signal.configPath`: directorio `signal-cli --config` opcional.
- `channels.signal.httpUrl`: URL completa del demonio (anula host/puerto).
- `channels.signal.httpHost`, `channels.signal.httpPort`: enlace del demonio (predeterminado 127.0.0.1:8080).
- `channels.signal.autoStart`: iniciar automáticamente el demonio (predeterminado verdadero si `httpUrl` no está establecido).
- `channels.signal.startupTimeoutMs`: tiempo de espera de inicio en ms (máximo 120000).
- `channels.signal.receiveMode`: `on-start | manual`.
- `channels.signal.ignoreAttachments`: omitir la descarga de archivos adjuntos.
- `channels.signal.ignoreStories`: ignorar historias del demonio.
- `channels.signal.sendReadReceipts`: reenviar confirmaciones de lectura.
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: pairing).
- `channels.signal.allowFrom`: lista blanca de DM (E.164 o `uuid:<id>`). `open` requiere `"*"`. Signal no tiene nombres de usuario; usa ids de teléfono/UUID.
- `channels.signal.groupPolicy`: `open | allowlist | disabled` (predeterminado: allowlist).
- `channels.signal.groupAllowFrom`: lista de permitidos de grupos; acepta IDs de grupos de Signal (crudos, `group:<id>` o `signal:group:<id>`), números E.164 del remitente o valores `uuid:<id>`.
- `channels.signal.groups`: anulaciones por grupo claveadas por ID de grupo de Signal (o `"*"`). Campos admitidos: `requireMention`, `tools`, `toolsBySender`.
- `channels.signal.accounts.<id>.groups`: versión por cuenta de `channels.signal.groups` para configuraciones de múltiples cuentas.
- `channels.signal.historyLimit`: máximo de mensajes de grupo a incluir como contexto (0 lo desactiva).
- `channels.signal.dmHistoryLimit`: límite de historial de MD en turnos de usuario. Anulaciones por usuario: `channels.signal.dms["<phone_or_uuid>"].historyLimit`.
- `channels.signal.textChunkLimit`: tamaño del fragmento de salida (caracteres).
- `channels.signal.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.signal.mediaMaxMb`: límite de medios entrantes/salientes (MB).

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (Signal no admite menciones nativas).
- `messages.groupChat.mentionPatterns` (respaldo global).
- `messages.responsePrefix`.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y fortalecimiento
