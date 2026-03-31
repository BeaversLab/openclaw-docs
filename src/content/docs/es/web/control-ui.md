---
summary: "Interfaz de control basada en navegador para la Gateway (chat, nodos, configuración)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interfaz de control"
---

# Interfaz de control (navegador)

La interfaz de control es una pequeña aplicación de una sola página (SPA) **Vite + Lit** servida por la Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: configure `gateway.controlUi.basePath` (p. ej., `/openclaw`)

Se comunica **directamente con el WebSocket de la Gateway** en el mismo puerto.

## Apertura rápida (local)

Si la Gateway se está ejecutando en el mismo ordenador, abra:

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Si la página no carga, inicie la Gateway primero: `openclaw gateway`.

La autenticación se proporciona durante el protocolo de enlace WebSocket a través de:

- `connect.params.auth.token`
- `connect.params.auth.password`
  El panel de configuración del panel de control mantiene un token para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada; las contraseñas no se persisten.
  El onboarding genera un token de puerta de enlace de manera predeterminada, así que péguelo aquí en la primera conexión.

## Emparejamiento de dispositivos (primera conexión)

Cuando se conecta a la interfaz de control desde un nuevo navegador o dispositivo, la Gateway
requiere una **aprobación de emparejamiento único**, incluso si está en el mismo Tailnet
con `gateway.auth.allowTailscale: true`. Esta es una medida de seguridad para evitar
el acceso no autorizado.

**Lo que verá:** "desconectado (1008): se requiere emparejamiento"

**Para aprobar el dispositivo:**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Si el navegador reintenta el emparejamiento con detalles de autenticación modificados (rol/ámbitos/clave pública), la solicitud pendiente anterior es reemplazada y se crea un nuevo `requestId`. Vuelva a ejecutar `openclaw devices list` antes de la aprobación.

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte
[Devices CLI](/en/cli/devices) para la rotación y revocación de tokens.

**Notas:**

- Las conexiones locales (`127.0.0.1`) se aprueban automáticamente.
- Las conexiones remotas (LAN, Tailnet, etc.) requieren una aprobación explícita.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o borrar los datos del navegador requerirá volver a emparejar.

## Soporte de idiomas

La interfaz de control puede localizarse automáticamente en la primera carga según la configuración regional de su navegador, y puede cambiarla más tarde desde el selector de idioma en la tarjeta Acceso.

- Configuraciones regionales compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`
- Las traducciones que no están en inglés se cargan de forma diferida en el navegador.
- La configuración regional seleccionada se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción faltantes vuelven al inglés.

## Lo que puede hacer (hoy)

- Chatear con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Transmitir llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente)
- Canales: WhatsApp/Telegram/Discord/Slack + canales de complementos (Mattermost, etc.) estado + inicio de sesión con QR + configuración por canal (`channels.status`, `web.login.*`, `config.patch`)
- Instancias: lista de presencia + actualizar (`system-presence`)
- Sesiones: lista + anulaciones por sesión de pensamiento/rápido/verboso/razonamiento (`sessions.list`, `sessions.patch`)
- Trabajos de Cron: lista/añadir/editar/ejecutar/habilitar/deshabilitar + historial de ejecuciones (`cron.*`)
- Habilidades: estado, habilitar/deshabilitar, instalar, actualizaciones de claves API (`skills.*`)
- Nodos: lista + capacidades (`node.list`)
- Aprobaciones de ejecución: editar listas de permitidos de puerta de enlace o nodo + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`)
- Config: ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Config: aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa
- Las escrituras de configuración incluyen un protección de hash base para evitar sobrescribir ediciones concurrentes
- Esquema de configuración + renderizado de formularios (`config.schema`, incluidos los esquemas de complementos y canales); El editor JSON sin formato sigue disponible
- Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`)
- Registros: seguimiento en vivo de los registros de archivos de la puerta de enlace con filtro/exportación (`logs.tail`)
- Actualización: ejecutar una actualización de paquete/git + reiniciar (`update.run`) con un informe de reinicio

Notas del panel de trabajos cron:

- Para trabajos aislados, la entrega predeterminada es anunciar un resumen. Puede cambiar a ninguno si desea ejecuciones solo internas.
- Los campos de canal/destino aparecen cuando se selecciona anunciar.
- El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
- Para trabajos de sesión principal, están disponibles los modos de entrega webhook y ninguno.
- Los controles de edición avanzada incluyen eliminar después de la ejecución, borrar la anulación del agente, opciones exactas/desfase de cron,
  anulaciones del modelo de agente/pensamiento y alternadores de entrega de mejor esfuerzo.
- La validación del formulario está en línea con errores a nivel de campo; los valores inválidos deshabilitan el botón de guardar hasta que se corrijan.
- Establezca `cron.webhookToken` para enviar un token de portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
- Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

## Comportamiento del chat

- `chat.send` es **sin bloqueo**: envía un acuse de recibo inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
- Volver a enviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta y `{ status: "ok" }` después de completarse.
- Las respuestas de `chat.history` tienen límites de tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar los mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
- `chat.inject` agrega una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones exclusivas de la interfaz (sin ejecución de agente, sin entrega al canal).
- Detener:
  - Haga clic en **Stop** (llama a `chat.abort`)
  - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda
  - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión
- Retención parcial de aborto:
  - Cuando se interrumpe una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario
  - El Gateway guarda el texto parcial del asistente interrumpido en el historial de transcripciones cuando existe salida almacenada en el búfer
  - Las entradas guardadas incluyen metadatos de interrupción para que los consumidores de transcripciones puedan distinguir los parciales interrumpidos de la salida de finalización normal

## Acceso a Tailnet (recomendado)

### Tailscale Serve integrado (preferido)

Mantenga el Gateway en el loopback y deje que Tailscale Sirve actúe como proxy con HTTPS:

```bash
openclaw gateway --tailscale serve
```

Abrir:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

De forma predeterminada, las solicitudes de Control UI/WebSocket Serve pueden autenticarse mediante encabezados de identidad de Tailscale
(`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw
verifica la identidad resolviendo la dirección `x-forwarded-for` con
`tailscale whois` y coincidiéndola con el encabezado, y solo acepta estos cuando la
solicitud llega al bucle local (loopback) con los encabezados `x-forwarded-*` de Tailscale. Establezca
`gateway.auth.allowTailscale: false` (o fuerce `gateway.auth.mode: "password"`)
si desea requerir un token/contraseña incluso para el tráfico de Serve.
La autenticación Serve sin token asume que el host de la puerta de enlace es confiable. Si código local
no confiable puede ejecutarse en ese host, requiera autenticación de token/contraseña.

### Vincular a tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Luego abra:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurada)

Pegue el token en la configuración de la interfaz de usuario (enviado como `connect.params.auth.token`).

## HTTP no seguro

Si abre el panel a través de HTTP sin cifrar (`http://<lan-ip>` o `http://<tailscale-ip>`),
el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada,
OpenClaw **bloquea** las conexiones de la interfaz de control sin identidad del dispositivo.

**Solución recomendada:** use HTTPS (Tailscale Serve) o abra la interfaz localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

**Comportamiento del interruptor de autenticación insegura:**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` es solo un interruptor de compatibilidad local:

- Permite que las sesiones de la Interfaz de control de continúen sin identidad de dispositivo en
  contextos HTTP no seguros.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (que no sea localhost).

**Solo para casos de emergencia:**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad del dispositivo de la Interfaz de Control y es una degradación grave de la seguridad. Revértelo rápidamente después del uso de emergencia.

Consulte [Tailscale](/en/gateway/tailscale) para obtener instrucciones sobre la configuración de HTTPS.

## Compilación de la interfaz de usuario

El Gateway sirve archivos estáticos desde `dist/control-ui`. Compílelos con:

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absoluta opcional (cuando desea URL de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo independiente):

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Luego apunte la interfaz de usuario a su URL de WS del Gateway (p. ej., `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + Gateway remoto

La interfaz de usuario de Control son archivos estáticos; el destino de WebSocket es configurable y puede ser
diferente del origen HTTP. Esto es útil cuando desea el servidor de desarrollo de Vite
localmente pero el Gateway se ejecuta en otro lugar.

1. Inicie el servidor de desarrollo de la interfaz de usuario: `pnpm ui:dev`
2. Abra una URL como:

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Autenticación opcional de una sola vez (si es necesario):

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notas:

- `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
- Siempre que sea posible, `token` debe pasarse a través del fragmento de la URL (`#token=...`). Los fragmentos no se envían al servidor, lo que evita fugas en el registro de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
- `password` se mantiene solo en memoria.
- Cuando se establece `gatewayUrl`, la interfaz de usuario no recurre a las credenciales de configuración o de entorno.
  Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
- Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
- Los despliegues de la Interfaz de Control que no sean de bucle local deben establecer `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
- No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales
  estrictamente controladas. Significa permitir cualquier origen de navegador, no "coincidir con el host que estoy
  usando".
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` activa
  el modo de reserva de origen del encabezado Host, pero es un modo de seguridad peligroso.

Ejemplo:

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

Detalles de la configuración de acceso remoto: [Acceso remoto](/en/gateway/remote).
