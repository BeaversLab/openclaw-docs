---
summary: "Soporte de Signal a través de signal-cli (JSON-RPC + SSE), rutas de configuración y modelo de número"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

# Signal (signal-cli)

Estado: integración de CLI externa. Gateway se comunica con `signal-cli` a través de HTTP JSON-RPC + SSE.

## Requisitos previos

- OpenClaw instalado en su servidor (el flujo de Linux a continuación se probó en Ubuntu 24).
- `signal-cli` disponible en el host donde se ejecuta el gateway.
- Un número de teléfono que pueda recibir un SMS de verificación (para la ruta de registro por SMS).
- Acceso al navegador para el captcha de Signal (`signalcaptchas.org`) durante el registro.

## Configuración rápida (principiante)

1. Use un **número de Signal separado** para el bot (recomendado).
2. Instale `signal-cli` (se requiere Java si usa la compilación JVM).
3. Elija una ruta de configuración:
   - **Ruta A (enlace QR):** `signal-cli link -n "OpenClaw"` y escanee con Signal.
   - **Ruta B (registro SMS):** registre un número dedicado con captcha + verificación SMS.
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

| Campo       | Descripción                                                         |
| ----------- | ------------------------------------------------------------------- |
| `account`   | Número de teléfono del bot en formato E.164 (`+15551234567`)        |
| `cliPath`   | Ruta a `signal-cli` (`signal-cli` si está en `PATH`)                |
| `dmPolicy`  | Política de acceso a MD (`pairing` recomendado)                     |
| `allowFrom` | Números de teléfono o valores `uuid:<id>` permitidos para enviar MD |

## Qué es

- Canal de Signal a través de `signal-cli` (no libsignal integrado).
- Enrutamiento determinista: las respuestas siempre vuelven a Signal.
- Los MD comparten la sesión principal del agente; los grupos están aislados (`agent:<agentId>:signal:group:<groupId>`).

## Escrituras de configuración

De forma predeterminada, se permite a Signal escribir actualizaciones de configuración activadas por `/config set|unset` (requiere `commands.config: true`).

Desactivar con:

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## El modelo de número (importante)

- El gateway se conecta a un **dispositivo Signal** (la cuenta `signal-cli`).
- Si ejecutas el bot en **tu cuenta personal de Signal**, este ignorará tus propios mensajes (protección de bucle).
- Para "Le escribo al bot y él responde", usa un **número de bot separado**.

## Ruta de configuración A: vincular cuenta de Signal existente (QR)

1. Instala `signal-cli` (construcción JVM o nativa).
2. Vincula una cuenta de bot:
   - `signal-cli link -n "OpenClaw"` y luego escanea el código QR en Signal.
3. Configura Signal e inicia la puerta de enlace.

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

Soporte multi-cuenta: use `channels.signal.accounts` con configuración por cuenta y opcional `name`. Consulte [`gateway/configuration`](/en/gateway/configuration-reference#multi-account-all-channels) para el patrón compartido.

## Ruta de configuración B: registrar número de bot dedicado (SMS, Linux)

Usa esto cuando quieras un número de bot dedicado en lugar de vincular una cuenta de la aplicación Signal existente.

1. Obtén un número que pueda recibir SMS (o verificación por voz para líneas fijas).
   - Usa un número de bot dedicado para evitar conflictos de cuenta/sesión.
2. Instala `signal-cli` en el host de la puerta de enlace:

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

Si usas la compilación JVM (`signal-cli-${VERSION}.tar.gz`), instala JRE 25+ primero.
Mantén `signal-cli` actualizado; los desarrolladores señalan que las versiones antiguas pueden romperse a medida que cambian las API del servidor de Signal.

3. Registra y verifica el número:

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

Si se requiere captcha:

1. Abre `https://signalcaptchas.org/registration/generate.html`.
2. Completa el captcha, copia el destino del enlace `signalcaptcha://...` desde "Abrir Signal".
3. Ejecuta desde la misma IP externa que la sesión del navegador cuando sea posible.
4. Ejecuta el registro nuevamente de inmediato (los tokens de captcha caducan rápido):

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. Configura OpenClaw, reinicia la puerta de enlace, verifica el canal:

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. Vincula tu remitente de DM:
   - Envía cualquier mensaje al número del bot.
   - Aprueba el código en el servidor: `openclaw pairing approve signal <PAIRING_CODE>`.
   - Guarda el número del bot como un contacto en tu teléfono para evitar "Contacto desconocido".

Importante: registrar una cuenta de número de teléfono con `signal-cli` puede desautenticar la sesión principal de la aplicación Signal para ese número. Prefiere un número de bot dedicado, o usa el modo de vinculación QR si necesitas mantener la configuración de tu aplicación de teléfono existente.

Referencias upstream:

- README de `signal-cli`: `https://github.com/AsamK/signal-cli`
- Flujo de captcha: `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- Flujo de vinculación: `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## Modo de demonio externo (httpUrl)

Si desea administrar `signal-cli` por su cuenta (inicios en frío lentos de JVM, inicialización de contenedor o CPUs compartidas), ejecute el demonio por separado y dirija OpenClaw hacia él:

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

Esto omite la generación automática y la espera de inicio dentro de OpenClaw. Para inicios lentos al generar automáticamente, establezca `channels.signal.startupTimeoutMs`.

## Control de acceso (MDs + grupos)

MDs:

- Predeterminado: `channels.signal.dmPolicy = "pairing"`.
- Los remitentes desconocidos reciben un código de vinculación; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar a través de:
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- La vinculación es el intercambio de tokens predeterminado para los MDs de Signal. Detalles: [Vinculación](/en/channels/pairing)
- Los remitentes solo con UUID (de `sourceUuid`) se almacenan como `uuid:<id>` en `channels.signal.allowFrom`.

Grupos:

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` controla quién puede activar en grupos cuando se establece `allowlist`.
- `channels.signal.groups["<group-id>" | "*"]` puede anular el comportamiento del grupo con `requireMention`, `tools` y `toolsBySender`.
- Use `channels.signal.accounts.<id>.groups` para anulaciones por cuenta en configuraciones multicuenta.
- Nota de ejecución: si `channels.signal` falta completamente, la ejecución recurre a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está establecido).

## Cómo funciona (comportamiento)

- `signal-cli` se ejecuta como un demonio; la puerta de enlace lee los eventos a través de SSE.
- Los mensajes entrantes se normalizan en el sobre compartido del canal.
- Las respuestas siempre se enrutan de vuelta al mismo número o grupo.

## Medios + límites

- El texto saliente se divide en fragmentos de `channels.signal.textChunkLimit` (predeterminado 4000).
- Fragmentación opcional de nuevas líneas: establezca `channels.signal.chunkMode="newline"` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- Adjuntos admitidos (base64 recuperados de `signal-cli`).
- Límite predeterminado de medios: `channels.signal.mediaMaxMb` (predeterminado 8).
- Use `channels.signal.ignoreAttachments` para omitir la descarga de medios.
- El contexto del historial del grupo utiliza `channels.signal.historyLimit` (o `channels.signal.accounts.*.historyLimit`), recurriendo a `messages.groupChat.historyLimit`. Establezca `0` en 0 para desactivar (por defecto 50).

## Indicador de escritura + confirmaciones de lectura

- **Indicadores de escritura**: OpenClaw envía señales de escritura a través de `signal-cli sendTyping` y las actualiza mientras se ejecuta una respuesta.
- **Confirmaciones de lectura**: cuando `channels.signal.sendReadReceipts` es verdadero, OpenClaw reenvía las confirmaciones de lectura para los MD permitidos.
- Signal-cli no expone confirmaciones de lectura para grupos.

## Reacciones (herramienta de mensaje)

- Use `message action=react` con `channel=signal`.
- Objetivos: E.164 del remitente o UUID (use `uuid:<id>` de la salida de vinculación; también funciona el UUID simple).
- `messageId` es la marca de tiempo de Signal para el mensaje al que está reaccionando.
- Las reacciones grupales requieren `targetAuthor` o `targetAuthorUuid`.

Ejemplos:

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

Configuración:

- `channels.signal.actions.reactions`: activar/desactivar acciones de reacción (por defecto verdadero).
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`.
  - `off`/`ack` desactiva las reacciones del agente (la herramienta de mensaje `react` dará error).
  - `minimal`/`extensive` activa las reacciones del agente y establece el nivel de orientación.
- Invalidaciones por cuenta: `channels.signal.accounts.<id>.actions.reactions`, `channels.signal.accounts.<id>.reactionLevel`.

## Objetivos de entrega (CLI/cron)

- MDs: `signal:+15551234567` (o E.164 simple).
- MDs UUID: `uuid:<id>` (o UUID simple).
- Grupos: `signal:group:<groupId>`.
- Nombres de usuario: `username:<name>` (si es compatible con su cuenta de Signal).

## Solución de problemas

Ejecute primero esta secuencia:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Luego confirme el estado de vinculación de MD si es necesario:

```bash
openclaw pairing list signal
```

Fallos comunes:

- Demonio accesible pero sin respuestas: verifique la configuración de la cuenta/demonio (`httpUrl`, `account`) y el modo de recepción.
- MDs ignorados: el remitente está pendiente de aprobación de vinculación.
- Mensajes grupales ignorados: el filtrado de remitente/mención del grupo bloquea la entrega.
- Errores de validación de configuración después de ediciones: ejecute `openclaw doctor --fix`.
- Signal no aparece en los diagnósticos: confirma `channels.signal.enabled: true`.

Verificaciones adicionales:

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

Para el flujo de triaje: [/channels/troubleshooting](/en/channels/troubleshooting).

## Notas de seguridad

- `signal-cli` almacena las claves de la cuenta localmente (típicamente `~/.local/share/signal-cli/data/`).
- Haz una copia de seguridad del estado de la cuenta de Signal antes de migrar o reconstruir el servidor.
- Mantén `channels.signal.dmPolicy: "pairing"` a menos que explícitamente desees un acceso a MD más amplio.
- La verificación por SMS solo se necesita para los flujos de registro o recuperación, pero perder el control del número/cuenta puede complicar el re-registro.

## Referencia de configuración (Signal)

Configuración completa: [Configuration](/en/gateway/configuration)

Opciones del proveedor:

- `channels.signal.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.signal.account`: E.164 para la cuenta del bot.
- `channels.signal.cliPath`: ruta a `signal-cli`.
- `channels.signal.httpUrl`: URL completa del demonio (anula host/puerto).
- `channels.signal.httpHost`, `channels.signal.httpPort`: enlace del demonio (por defecto 127.0.0.1:8080).
- `channels.signal.autoStart`: iniciar automáticamente el demonio (por defecto true si `httpUrl` no está establecido).
- `channels.signal.startupTimeoutMs`: tiempo de espera de inicio en ms (máximo 120000).
- `channels.signal.receiveMode`: `on-start | manual`.
- `channels.signal.ignoreAttachments`: omitir la descarga de adjuntos.
- `channels.signal.ignoreStories`: ignorar historias del demonio.
- `channels.signal.sendReadReceipts`: reenviar confirmaciones de lectura.
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled` (por defecto: emparejamiento).
- `channels.signal.allowFrom`: lista blanca de MD (E.164 o `uuid:<id>`). `open` requiere `"*"`. Signal no tiene nombres de usuario; usa ids de teléfono/UUID.
- `channels.signal.groupPolicy`: `open | allowlist | disabled` (por defecto: lista blanca).
- `channels.signal.groupAllowFrom`: lista blanca de remitentes de grupos.
- `channels.signal.groups`: anulaciones por grupo indexadas por el ID de grupo de Signal (o `"*"`). Campos admitidos: `requireMention`, `tools`, `toolsBySender`.
- `channels.signal.accounts.<id>.groups`: versión por cuenta de `channels.signal.groups` para configuraciones multicuenta.
- `channels.signal.historyLimit`: máximo de mensajes de grupo a incluir como contexto (0 lo desactiva).
- `channels.signal.dmHistoryLimit`: límite de historial de MD en turnos de usuario. Anulaciones por usuario: `channels.signal.dms["<phone_or_uuid>"].historyLimit`.
- `channels.signal.textChunkLimit`: tamaño de fragmento de salida (caracteres).
- `channels.signal.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la división por longitud.
- `channels.signal.mediaMaxMb`: límite de medios de entrada/salida (MB).

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (Signal no admite menciones nativas).
- `messages.groupChat.mentionPatterns` (alternativa global).
- `messages.responsePrefix`.
