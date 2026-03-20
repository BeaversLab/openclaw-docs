---
summary: "Interfaz de control basada en navegador para el Gateway (chat, nodos, configuración)"
read_when:
  - Quieres operar el Gateway desde un navegador
  - Quieres acceso a Tailnet sin túneles SSH
title: "Interfaz de control"
---

# Interfaz de control (navegador)

La Interfaz de control es una pequeña aplicación de una página **Vite + Lit** servida por el Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: establezca `gateway.controlUi.basePath` (por ejemplo, `/openclaw`)

Se comunica **directamente con el WebSocket del Gateway** en el mismo puerto.

## Apertura rápida (local)

Si el Gateway se está ejecutando en el mismo ordenador, abra:

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Si la página no carga, inicie el Gateway primero: `openclaw gateway`.

La autenticación se suministra durante el protocolo de enlace WebSocket mediante:

- `connect.params.auth.token`
- `connect.params.auth.password`
  El panel de configuración del panel mantiene un token para la sesión de la pestaña del navegador actual y la URL de la puerta de enlace seleccionada; las contraseñas no se conservan.
  La incorporación genera un token de puerta de enlace de forma predeterminada, así que péguelo aquí en la primera conexión.

## Emparejamiento de dispositivos (primera conexión)

Cuando te conectas a la Interfaz de control desde un navegador o dispositivo nuevo, el Gateway
requiere una **aprobación de emparejamiento único** — incluso si estás en el mismo Tailnet
con `gateway.auth.allowTailscale: true`. Esta es una medida de seguridad para evitar
el acceso no autorizado.

**Lo que verás:** "desconectado (1008): emparejamiento requerido"

**Para aprobar el dispositivo:**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que
lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte
[CLI de dispositivos](/es/cli/devices) para la rotación y revocación de tokens.

**Notas:**

- Las conexiones locales (`127.0.0.1`) se aprueban automáticamente.
- Las conexiones remotas (LAN, Tailnet, etc.) requieren aprobación explícita.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o
  borrar los datos del navegador requerirá un nuevo emparejamiento.

## Soporte de idiomas

La Interfaz de control puede localizarse automáticamente en la primera carga según la configuración regional de su navegador, y puede cambiarla más tarde desde el selector de idioma en la tarjeta Acceso.

- Configuraciones regionales compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`
- Las traducciones que no están en inglés se cargan de forma diferida en el navegador.
- La configuración regional seleccionada se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción faltantes vuelven al inglés.

## Lo que puede hacer (actualmente)

- Chatear con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Transmisión de llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente)
- Canales: WhatsApp/Telegram/Discord/Slack + canales de complementos (Mattermost, etc.) estado + inicio de sesión QR + configuración por canal (`channels.status`, `web.login.*`, `config.patch`)
- Instancias: lista de presencia + actualizar (`system-presence`)
- Sesiones: lista + anulaciones de pensamiento/rápido/verbose/razonamiento por sesión (`sessions.list`, `sessions.patch`)
- Trabajos de Cron: lista/agregar/editar/ejecutar/habilitar/deshabilitar + historial de ejecuciones (`cron.*`)
- Habilidades: estado, habilitar/deshabilitar, instalar, actualizaciones de claves API (`skills.*`)
- Nodos: lista + caps (`node.list`)
- Aprobaciones de ejecución: editar listas de permitidos de gateway o nodo + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`)
- Configuración: ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuración: aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa
- Las escrituras de configuración incluyen una protección de hash base para evitar sobrescribir ediciones simultáneas
- Esquema de configuración + renderizado de formulario (`config.schema`, incluidos los esquemas de complementos y canales); El editor JSON sin formato sigue disponible
- Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`)
- Registros: seguimiento en vivo de los registros de archivos del gateway con filtro/exportación (`logs.tail`)
- Actualización: ejecutar una actualización de paquete/git + reiniciar (`update.run`) con un informe de reinicio

Notas del panel de trabajos de Cron:

- Para trabajos aislados, la entrega por defecto es anunciar el resumen. Puedes cambiar a ninguno si quieres ejecuciones solo internas.
- Los campos de canal/destino aparecen cuando se selecciona anunciar.
- El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
- Para trabajos de sesión principal, están disponibles los modos de entrega webhook y ninguno.
- Los controles de edición avanzados incluyen eliminar después de la ejecución, limpiar la invalidación del agente, opciones de cron exactas/escalonadas, invalidaciones de modelo/pensamiento del agente y alternadores de entrega de mejor esfuerzo.
- La validación del formulario es en línea con errores a nivel de campo; los valores inválidos deshabilitan el botón de guardar hasta que se corrijan.
- Establecer `cron.webhookToken` para enviar un token portador dedicado, si se omite, el webhook se envía sin un encabezado de autenticación.
- Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

## Comportamiento del chat

- `chat.send` es **sin bloqueo**: reconoce inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
- Reenviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta, y `{ status: "ok" }` después de completar.
- Las respuestas `chat.history` están limitadas en tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
- `chat.inject` agrega una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz (sin ejecución del agente, sin entrega al canal).
- Detener:
  - Haz clic en **Stop** (llama a `chat.abort`)
  - Escribe `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda
  - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión
- Retención parcial al abortar:
  - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario
  - Gateway guarda el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida en el búfer
  - Las entradas guardadas incluyen metadatos de aborto para que los consumidores de la transcripción puedan distinguir los parciales abortados de la salida de finalización normal

## Acceso a Tailnet (recomendado)

### Tailscale Serve integrado (preferido)

Mantén el Gateway en loopback y deja que Tailscale Sirve actúe como proxy con HTTPS:

```bash
openclaw gateway --tailscale serve
```

Abrir:

- `https://<magicdns>/` (o tu `gateway.controlUi.basePath` configurado)

Por defecto, las solicitudes de Control UI/WebSocket Sirve pueden autenticarse a través de los encabezados de identidad de Tailscale
(`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw
verifica la identidad resolviendo la dirección `x-forwarded-for` con
`tailscale whois` y coincidiéndola con el encabezado, y solo acepta estas cuando la
solicitud llega al loopback con los encabezados `x-forwarded-*` de Tailscale. Establece
`gateway.auth.allowTailscale: false` (o fuerza `gateway.auth.mode: "password"`)
si deseas requerir un token/contraseña incluso para el tráfico de Serve.
La autenticación Serve sin token asume que el host de la puerta de enlace es confiable. Si código local
no confiable puede ejecutarse en ese host, exige autenticación por token/contraseña.

### Vincular a tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Luego abrir:

- `http://<tailscale-ip>:18789/` (o tu `gateway.controlUi.basePath` configurado)

Pega el token en la configuración de la interfaz (se envía como `connect.params.auth.token`).

## HTTP inseguro

Si abres el panel a través de HTTP simple (`http://<lan-ip>` o `http://<tailscale-ip>`),
el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. Por defecto,
OpenClaw **bloquea** las conexiones de Control UI sin identidad del dispositivo.

**Solución recomendada:** usa HTTPS (Tailscale Serve) o abre la interfaz localmente:

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

- Permite que las sesiones de la interfaz de usuario de Control de localhost continúen sin identidad de dispositivo en contextos HTTP no seguros.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (que no sea localhost).

**Solo para emergencias:**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` desactiva las comprobaciones de identidad del dispositivo de la interfaz de usuario de Control y es una degradación grave de la seguridad. Reviértalo rápidamente después del uso de emergencia.

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Compilación de la interfaz de usuario

El Gateway sirve archivos estáticos desde `dist/control-ui`. Compílelos con:

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absoluta opcional (cuando desea URLs de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo independiente):

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Luego, apunte la interfaz de usuario a su URL del Gateway WS (por ejemplo, `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + Gateway remoto

La interfaz de usuario de Control son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando desea el servidor de desarrollo de Vite localmente pero el Gateway se ejecuta en otro lugar.

1. Inicie el servidor de desarrollo de la interfaz de usuario: `pnpm ui:dev`
2. Abra una URL como:

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Autenticación opcional de un solo uso (si es necesario):

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notas:

- `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
- `token` debe pasarse a través del fragmento de URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita fugas en el registro de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
- `password` se mantiene solo en la memoria.
- Cuando se establece `gatewayUrl`, la interfaz de usuario no recurre a credenciales de configuración o de entorno. Proporcione `token` (o `password`) explícitamente. Faltar credenciales explícitas es un error.
- Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
- Los despliegues de la interfaz de usuario de Control que no sean de loopback deben establecer `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
- No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales estrictamente controladas. Significa permitir cualquier origen del navegador, no "coincidir con el host que esté usando".
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de respaldo de origen basado en el encabezado Host, pero es un modo de seguridad peligroso.

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

Detalles de la configuración de acceso remoto: [Remote access](/es/gateway/remote).

import en from "/components/footer/en.mdx";

<en />
