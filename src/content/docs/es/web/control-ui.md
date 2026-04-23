---
summary: "Interfaz de control basada en navegador para el Gateway (chat, nodos, configuración)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interfaz de control"
---

# Interfaz de control (navegador)

La interfaz de control es una pequeña aplicación de una sola página (SPA) **Vite + Lit** servida por la Gateway:

- por defecto: `http://<host>:18789/`
- prefijo opcional: establecer `gateway.controlUi.basePath` (p. ej. `/openclaw`)

Se comunica **directamente con el WebSocket de la Gateway** en el mismo puerto.

## Apertura rápida (local)

Si la Gateway se está ejecutando en el mismo ordenador, abra:

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Si la página no carga, inicie el Gateway primero: `openclaw gateway`.

La autenticación se proporciona durante el protocolo de enlace WebSocket a través de:

- `connect.params.auth.token`
- `connect.params.auth.password`
- cabeceras de identidad de Tailscale Serve cuando `gateway.auth.allowTailscale: true`
- cabeceras de identidad de proxy de confianza cuando `gateway.auth.mode: "trusted-proxy"`

El panel de configuración del panel de control mantiene un token para la sesión actual de la pestaña del navegador
y la URL de gateway seleccionada; las contraseñas no se persisten. La incorporación generalmente
genera un token de gateway para autenticación de secreto compartido en la primera conexión, pero la autenticación
por contraseña también funciona cuando `gateway.auth.mode` es `"password"`.

## Emparejamiento de dispositivos (primera conexión)

Cuando se conecta a la Interfaz de control desde un navegador o dispositivo nuevo, el Gateway
requiere una **aprobación de emparejamiento de una sola vez**; incluso si está en el mismo Tailnet
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

Si el navegador reintenta el emparejamiento con detalles de autenticación modificados (rol/ámbitos/clave
pública), la solicitud pendiente anterior es reemplazada y se crea una nueva `requestId`.
Vuelva a ejecutar `openclaw devices list` antes de la aprobación.

Si el navegador ya está emparejado y lo cambia de acceso de lectura a
acceso de escritura/administrador, esto se trata como una actualización de aprobación, no como una
reconexión silenciosa. OpenClaw mantiene la aprobación anterior activa, bloquea la reconexión más amplia
y le pide que apruebe explícitamente el nuevo conjunto de alcances.

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que
lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte
[Devices CLI](/es/cli/devices) para la rotación y revocación de tokens.

**Notas:**

- Las conexiones directas del navegador de bucle local (`127.0.0.1` / `localhost`) se
  aprueban automáticamente.
- Las conexiones del navegador desde Tailnet y LAN aún requieren aprobación explícita, incluso cuando
  se originan desde la misma máquina.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o
  borrar los datos del navegador requerirá volver a emparejar.

## Compatibilidad con idiomas

La interfaz de usuario de Control puede localizarse automáticamente en la primera carga según la configuración regional de su navegador.
Para cambiarla más tarde, abra **Overview -> Gateway Access -> Language**. El
selector de configuración regional se encuentra en la tarjeta Gateway Access, no en Appearance.

- Configuraciones regionales compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- Las traducciones que no están en inglés se cargan de forma diferida en el navegador.
- La configuración regional seleccionada se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción que faltan vuelven al inglés.

## Lo que puede hacer (actualmente)

- Chatear con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Transmitir llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente)
- Canales: estado de los canales integrados más complementos/externos, inicio de sesión con QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`)
- Instancias: lista de presencia + actualización (`system-presence`)
- Sesiones: lista + invalidaciones por sesión de modelo/pensamiento/rápido/verboso/traza/razonamiento (`sessions.list`, `sessions.patch`)
- Sueños (Dreams): estado de soñando, interruptor activar/desactivar y lector del diario de sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Trabajos Cron: lista/añadir/editar/ejecutar/activar/desactivar + historial de ejecuciones (`cron.*`)
- Habilidades (Skills): estado, activar/desactivar, instalar, actualizaciones de clave de API (`skills.*`)
- Nodos: lista + caps (`node.list`)
- Aprobaciones de ejecución: editar listas de permitidos del gateway o de nodos + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`)
- Configuración: ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuración: aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa
- Las escrituras de configuración incluyen un guardián de hash base para evitar sobrescribir ediciones concurrentes
- Las escrituras de configuración (`config.set`/`config.apply`/`config.patch`) también realizan una verificación previa de la resolución de SecretRef activa para las referencias en el payload de configuración enviado; las referencias enviadas activas sin resolver se rechazan antes de la escritura
- Esquema de configuración + renderizado de formularios (`config.schema` / `config.schema.lookup`,
  incluyendo campo `title` / `description`, pistas de interfaz coincidentes, resúmenes de hijos inmediatos,
  metadatos de documentos en nodos de objeto/comodín/matriz/composición anidados,
  además de esquemas de complemento y canal cuando estén disponibles); El editor JSON sin procesar está
  disponible solo cuando la instantánea tiene un recorrido de ida y vuelta seguro
- Si una instantánea no puede recorrer de forma segura el texto sin procesar, la interfaz de control fuerza el modo Formulario y deshabilita el modo Raw para esa instantánea
- Los valores de objetos SecretRef estructurados se muestran como de solo lectura en las entradas de texto del formulario para evitar la corrupción accidental de objeto a cadena
- Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`)
- Registros: seguimiento en vivo de los registros de archivos de la pasarela con filtro/exportación (`logs.tail`)
- Actualizar: ejecutar una actualización de paquete/git + reiniciar (`update.run`) con un informe de reinicio

Notas del panel de tareas programadas (Cron):

- Para tareas aisladas, la entrega por defecto es el resumen del anuncio. Puedes cambiar a ninguno si deseas ejecuciones solo internas.
- Los campos de canal/destino aparecen cuando se selecciona anunciar.
- El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
- Para las tareas de la sesión principal, están disponibles los modos de entrega webhook y ninguno.
- Los controles de edición avanzados incluyen eliminar después de ejecutar, borrar la invalidación del agente, opciones exactas/escalonadas de cron, invalidaciones de modelo/pensamiento del agente, e interruptores de entrega de mejor esfuerzo.
- La validación del formulario es en línea con errores a nivel de campo; los valores no válidos deshabilitan el botón de guardar hasta que se corrijan.
- Establezca `cron.webhookToken` para enviar un token de portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
- Alternativa obsoleta: las tareas heredadas almacenadas con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

## Comportamiento del chat

- `chat.send` es **no bloqueante**: envía una confirmación inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
- Volver a enviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se está ejecutando, y `{ status: "ok" }` después de completarse.
- Las respuestas de `chat.history` están limitadas en tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, la pasarela puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes demasiado grandes con un marcador de posición (`[chat.history omitted: message too large]`).
- `chat.history` también elimina las etiquetas de directivas en línea de solo visualización del texto visible del asistente (por ejemplo `[[reply_to_*]]` y `[[audio_as_voice]]`), las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y los tokens de control de modelo ASCII/corto ancho filtrados, y omite las entradas del asistente cuyo texto visible completo sea solo el token silencioso exacto `NO_REPLY` / `no_reply`.
- `chat.inject` añade una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz de usuario (sin ejecución de agente, sin entrega a canales).
- Los selectores de modelo y de pensamiento del encabezado del chat aplican un parche a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
- Detener:
  - Haga clic en **Stop** (llama a `chat.abort`)
  - Escriba `/stop` (o frases de interrupción independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda
  - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión
- Retención parcial al abortar:
  - Cuando se aborta una ejecución, el texto parcial del asistente aún se puede mostrar en la interfaz de usuario
  - El Gateway persiste el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida en el búfer
  - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de transcripciones puedan distinguir los parciales abortados de la salida de finalización normal

## Incrustaciones alojadas

Los mensajes del asistente pueden renderizar contenido web alojado en línea con el código corto `[embed ...]`.
La política de espacio aislado (sandbox) del iframe está controlada por
`gateway.controlUi.embedSandbox`:

- `strict`: deshabilita la ejecución de scripts dentro de las incrustaciones alojadas
- `scripts`: permite inserciones interactivas manteniendo el aislamiento de origen; esta es
  la configuración predeterminada y suele ser suficiente para juegos/widgets de navegador independientes
- `trusted`: añade `allow-same-origin` encima de `allow-scripts` para documentos
  del mismo sitio que intencionalmente necesitan privilegios más fuertes

Ejemplo:

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

Use `trusted` solo cuando el documento incrustado genuinamente necesite un comportamiento del mismo origen.
Para la mayoría de los juegos generados por agentes y lienzos interactivos, `scripts` es
la opción más segura.

Las URL de inserción externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si
intencionalmente quiere que `[embed url="https://..."]` cargue páginas de terceros, configure
`gateway.controlUi.allowExternalEmbedUrls: true`.

## Acceso a Tailnet (recomendado)

### Tailscale Serve integrado (preferido)

Mantenga el Gateway en loopback y deje que Tailscale Sirve actúe como proxy con HTTPS:

```bash
openclaw gateway --tailscale serve
```

Abrir:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

De forma predeterminada, las solicitudes de Control UI/WebSocket Sirve pueden autenticarse mediante encabezados de identidad de Tailscale
(`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw
verifica la identidad resolviendo la dirección `x-forwarded-for` con
`tailscale whois` y coincidiéndola con el encabezado, y solo acepta estos cuando la
solicitud llega a loopback con los encabezados `x-forwarded-*` de Tailscale. Establezca
`gateway.auth.allowTailscale: false` si desea requerir credenciales explícitas de secreto compartido
también para el tráfico de Serve. Luego use `gateway.auth.mode: "token"` o
`"password"`.
Para esa ruta de identidad de Serve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente
y alcance de autenticación se serializan antes de las escrituras de limitación de tasa. Los reintentos incorrectos simultáneos
del mismo navegador por lo tanto pueden mostrar `retry later` en la segunda solicitud
en lugar de dos discordancias simples compitiendo en paralelo.
La autenticación de Serve sin token asume que el host de la puerta de enlace es confiable. Si código local
no confiable puede ejecutarse en ese host, requiera autenticación por token/contraseña.

### Vincular a tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Luego abrir:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

Pegue el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como
`connect.params.auth.token` o `connect.params.auth.password`).

## HTTP no seguro

Si abre el panel a través de HTTP plano (`http://<lan-ip>` o `http://<tailscale-ip>`),
el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada,
OpenClaw **bloquea** las conexiones de la interfaz de usuario de control sin identidad del dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP no seguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación de operador exitosa en la interfaz de usuario de control a través de `gateway.auth.mode: "trusted-proxy"`
- romper-cristal `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**Solución recomendada:** use HTTPS (Tailscale Serve) o abra la interfaz de usuario localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de puerta de enlace)

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

- Permite que las sesiones de la interfaz de usuario de control de localhost continúen sin identidad del dispositivo en
  contextos HTTP no seguros.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad del dispositivo remoto (que no sea localhost).

**Solo romper-cristal:**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad del dispositivo de la interfaz de usuario de control y es una
degradación severa de la seguridad. Reviértalo rápidamente después del uso de emergencia.

Nota de proxy de confianza:

- la autenticación exitosa de proxy de confianza puede admitir sesiones de la interfaz de usuario de control de **operador** sin
  identidad del dispositivo
- esto **no** se extiende a las sesiones de la interfaz de usuario de control con rol de nodo
- los proxies inversos de bucle invertido del mismo host aún no satisfacen la autenticación de proxy de confianza; consulte
  [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Compilación de la interfaz de usuario

La puerta de enlace sirve archivos estáticos desde `dist/control-ui`. Constrúyalos con:

```bash
pnpm ui:build
```

Base absoluta opcional (cuando desea URL de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo independiente):

```bash
pnpm ui:dev
```

Luego apunte la interfaz de usuario a su URL de puerta de enlace WS (por ejemplo, `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La Interfaz de Control son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando deseas el servidor de desarrollo de Vite localmente pero el Gateway se ejecuta en otro lugar.

1. Inicie el servidor de desarrollo de la IU: `pnpm ui:dev`
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
- Se debe pasar `token` a través del fragmento de URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita fugas en los registros de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
- `password` se mantiene solo en memoria.
- Cuando se establece `gatewayUrl`, la IU no vuelve a las credenciales de configuración o de entorno.
  Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
- Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
- Los despliegues de la Interfaz de Control que no sean de bucle local deben establecer `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
- No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales
  estrictamente controladas. Significa permitir cualquier origen de navegador, no “coincidir con cualquier host que yo esté
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

Detalles de configuración de acceso remoto: [Acceso remoto](/es/gateway/remote).

## Relacionado

- [Dashboard](/es/web/dashboard) — panel de control del gateway
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [Health Checks](/es/gateway/health) — monitorización de salud del gateway
