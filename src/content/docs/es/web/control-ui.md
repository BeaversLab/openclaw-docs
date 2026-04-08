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
- encabezados de identidad de Tailscale Serve cuando `gateway.auth.allowTailscale: true`
- encabezados de identidad de proxy confiable cuando `gateway.auth.mode: "trusted-proxy"`

El panel de configuración del panel de control mantiene un token para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada; las contraseñas no se conservan. La incorporación generalmente genera un token de puerta de enlace para la autenticación de secreto compartido en la primera conexión, pero la autenticación por contraseña también funciona cuando `gateway.auth.mode` es `"password"`.

## Emparejamiento de dispositivos (primera conexión)

Cuando se conecta a la Interfaz de Control desde un navegador o dispositivo nuevo, la Puerta de Enlace requiere una **aprobación de emparejamiento única**, incluso si está en la misma Tailnet con `gateway.auth.allowTailscale: true`. Esta es una medida de seguridad para evitar el acceso no autorizado.

**Lo que verá:** "desconectado (1008): se requiere emparejamiento"

**Para aprobar el dispositivo:**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Si el navegador reintenta el emparejamiento con detalles de autenticación modificados (rol/ámbitos/clave pública), la solicitud pendiente anterior se reemplaza y se crea un nuevo `requestId`. Vuelva a ejecutar `openclaw devices list` antes de la aprobación.

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte [CLI de dispositivos](/en/cli/devices) para la rotación y revocación de tokens.

**Notas:**

- Las conexiones directas del navegador de bucle local (`127.0.0.1` / `localhost`) se aprueban automáticamente.
- Las conexiones del navegador de Tailnet y LAN aún requieren una aprobación explícita, incluso cuando se originan desde la misma máquina.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o borrar los datos del navegador requerirá un nuevo emparejamiento.

## Soporte de idiomas

La Interfaz de Control puede localizarse en la primera carga según la configuración regional de su navegador. Para anularla más tarde, abra **Descripción general -> Acceso a la puerta de enlace -> Idioma**. El selector de configuración regional se encuentra en la tarjeta Acceso a la puerta de enlace, no en Apariencia.

- Idiomas compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- Las traducciones no inglesas se cargan de manera diferida en el navegador.
- El idioma seleccionado se guarda en el almacenamiento del navegador y se reutiliza en futuras visitas.
- Las claves de traducción faltantes vuelven al inglés.

## Lo que puede hacer (actualmente)

- Chatear con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Transmitir llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente)
- Canales: estado de canales integrados más complementos/acoplados externos, inicio de sesión con QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`)
- Instancias: lista de presencia + actualizar (`system-presence`)
- Sesiones: lista + anulaciones por sesión de modelo/pensamiento/rápido/razonamiento detallado (`sessions.list`, `sessions.patch`)
- Sueños: estado de soñar, interruptor activar/desactivar y lector del Diario de Sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Trabajos cron: lista/agregar/editar/ejecutar/activar/desactivar + historial de ejecuciones (`cron.*`)
- Habilidades: estado, activar/desactivar, instalar, actualizaciones de clave API (`skills.*`)
- Nodos: lista + límites (`node.list`)
- Aprobaciones de ejecución: editar listas de permitidos de puerta de enlace o nodo + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`)
- Configuración: ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuración: aplicar + reiniciar con validación (`config.apply`) y activar la última sesión activa
- Las escrituras de configuración incluyen un guardián de hash base para evitar sobrescribir ediciones concurrentes
- Las escrituras de configuración (`config.set`/`config.apply`/`config.patch`) también realizan una verificación previa de la resolución de SecretRef activos para las referencias en el payload de configuración enviado; las referencias activas enviadas sin resolver se rechazan antes de la escritura
- Esquema de configuración + representación de formularios (`config.schema` / `config.schema.lookup`,
  incluyendo campo `title` / `description`, sugerencias de IU coincidentes, resúmenes de hijos inmediatos,
  metadatos de documentación en nodos de objeto/comodín/matriz/composición anidados,
  además de esquemas de complemento y canal cuando están disponibles); el editor JSON sin procesar
  está disponible solo cuando la instantánea tiene un viaje de ida y vuelta sin procesar seguro
- Si una instantánea no puede realizar un viaje de ida y vuelta seguro de texto sin procesar, la IU de Control fuerza el modo Formulario y deshabilita el modo Sin procesar para esa instantánea
- Los valores de objeto SecretRef estructurados se representan como de solo lectura en las entradas de texto del formulario para evitar una corrupción accidental de objeto a cadena
- Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`)
- Registros: seguimiento en vivo de los registros de archivos del gateway con filtro/exportación (`logs.tail`)
- Actualización: ejecutar una actualización de paquete/git + reinicio (`update.run`) con un informe de reinicio

Notas del panel de trabajos de Cron:

- Para trabajos aislados, la entrega predeterminada es anunciar el resumen. Puede cambiar a ninguno si desea ejecuciones solo internas.
- Los campos de canal/destino aparecen cuando se selecciona anunciar.
- El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
- Para trabajos de sesión principal, están disponibles los modos de entrega webhook y ninguno.
- Los controles de edición avanzados incluyen eliminar después de ejecutar, borrar la anulación del agente, opciones exactas/dispersas de cron,
  anulaciones de modelo/pensamiento del agente e interruptores de entrega de mejor esfuerzo.
- La validación del formulario es en línea con errores a nivel de campo; los valores no válidos deshabilitan el botón guardar hasta que se corrijan.
- Establezca `cron.webhookToken` para enviar un token de portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
- Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

## Comportamiento del chat

- `chat.send` es **no bloqueante**: envía un reconocimiento inmediato con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
- Volver a enviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta, y `{ status: "ok" }` después de completarse.
- Las respuestas de `chat.history` están limitadas en tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
- `chat.history` también elimina etiquetas de directivas en línea de solo visualización del texto visible del asistente (por ejemplo, `[[reply_to_*]]` y `[[audio_as_voice]]`), cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y tokens de control de modelo ASCII/ancho completo filtrados, y omite entradas del asistente cuyo texto visible completo sea solo el token silencioso exacto `NO_REPLY` / `no_reply`.
- `chat.inject` añade una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz (sin ejecución del agente, sin entrega al canal).
- Los selectores de modelo y de pensamiento del encabezado del chat aplican parches a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
- Detener:
  - Haga clic en **Stop** (llama a `chat.abort`)
  - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda
  - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión
- Retención parcial de aborto:
  - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz
  - Gateway persiste el texto parcial abortado del asistente en el historial de transcripciones cuando existe salida en búfer
  - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de transcripciones puedan distinguir los parciales abortados de la salida de finalización normal

## Acceso a Tailnet (recomendado)

### Tailscale Serve integrado (preferido)

Mantenga el Gateway en loopback y deje que Tailscale Sirve lo sirva como proxy con HTTPS:

```bash
openclaw gateway --tailscale serve
```

Abrir:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

De forma predeterminada, las solicitudes de Control UI/WebSocket Serve pueden autenticarse mediante los encabezados de identidad de Tailscale
(`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw
verifica la identidad resolviendo la dirección `x-forwarded-for` con
`tailscale whois` y coincidiéndola con el encabezado, y solo acepta estas cuando la
solicitud golpea loopback con los encabezados `x-forwarded-*` de Tailscale. Establezca
`gateway.auth.allowTailscale: false` si desea requerir credenciales explícitas de secreto compartido
también para el tráfico de Serve. Luego use `gateway.auth.mode: "token"` o
`"password"`.
Para esa ruta de identidad de Serve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente
y ámbito de autenticación se serializan antes de las escrituras de límite de tasa. Los reintentos incorrectos concurrentes
del mismo navegador, por lo tanto, pueden mostrar `retry later` en la segunda solicitud
en lugar de dos desajustes simples compitiendo en paralelo.
La autenticación Serve sin token asume que el host de la puerta de enlace es confiable. Si código local no confiable
puede ejecutarse en ese host, requiera autenticación por token/contraseña.

### Vincular a tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Luego abrir:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

Pegue el secreto compartido correspondiente en la configuración de la interfaz de usuario (enviado como
`connect.params.auth.token` o `connect.params.auth.password`).

## HTTP inseguro

Si abre el panel a través de HTTP simple (`http://<lan-ip>` o `http://<tailscale-ip>`),
el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada,
OpenClaw **bloquea** las conexiones de Control UI sin identidad de dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP inseguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación exitosa del operador en la interfaz de control a través de `gateway.auth.mode: "trusted-proxy"`
- romper-el-cristal `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**Solución recomendada:** usar HTTPS (Tailscale Serve) o abrir la interfaz localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

**Comportamiento del interruptor de autenticación no segura:**

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

- Permite que las sesiones de la interfaz de control en localhost continúen sin identidad de dispositivo en
  contextos HTTP no seguros.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (no localhost).

**Solo para romper-el-cristal:**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad de dispositivo de la interfaz de control y es una
degradación grave de la seguridad. Reviértalo rápidamente después del uso de emergencia.

Nota de proxy confiable:

- una autenticación exitosa de proxy confiable puede admitir sesiones de la interfaz de control del **operador** sin
  identidad de dispositivo
- esto **no** se extiende a las sesiones de la interfaz de control con rol de nodo
- los proxies inversos de bucle invertido del mismo host aún no satisfacen la autenticación de proxy confiable; consulte
  [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)

Consulte [Tailscale](/en/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Construcción de la interfaz

La puerta de enlace sirve archivos estáticos desde `dist/control-ui`. Constrúyalos con:

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absoluta opcional (cuando desea URL de recursos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo independiente):

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Luego apunte la interfaz a su URL WS de la puerta de enlace (p. ej., `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La interfaz de control son archivos estáticos; el destino de WebSocket es configurable y puede ser
diferente del origen HTTP. Esto es útil cuando desea el servidor de desarrollo de Vite
localmente pero la puerta de enlace se ejecuta en otro lugar.

1. Inicie el servidor de desarrollo de la interfaz: `pnpm ui:dev`
2. Abra una URL como:

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Autenticación única opcional (si es necesario):

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notas:

- `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
- Siempre que sea posible, `token` debe pasarse a través del fragmento de la URL (`#token=...`). Los fragmentos no se envían al servidor, lo que evita fugas en el registro de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
- `password` se mantiene solo en la memoria.
- Cuando se establece `gatewayUrl`, la interfaz de usuario no recurre a las credenciales de configuración o de entorno.
  Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
- Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` solo se acepta en una ventana de nivel superior (no integrada) para evitar el secuestro de clics (clickjacking).
- Las implementaciones de Control UI que no son de loopback deben establecer `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
- No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales
  estrechamente controladas. Significa permitir cualquier origen del navegador, no “coincidir con el host que esté
  usando”.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita
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

Detalles de configuración de acceso remoto: [Acceso remoto](/en/gateway/remote).

## Relacionado

- [Dashboard](/en/web/dashboard) — panel del gateway
- [WebChat](/en/web/webchat) — interfaz de chat basada en navegador
- [TUI](/en/web/tui) — interfaz de usuario de terminal
- [Health Checks](/en/gateway/health) — monitoreo de salud del gateway
