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

## Identidad personal (local del navegador)

La interfaz de usuario de Control (Control UI) admite una identidad personal por navegador: un nombre para mostrar y
un avatar que se adjuntan a los mensajes salientes para su atribución en sesiones
compartidas. Esta identidad reside en el almacenamiento del navegador, está limitada al perfil de navegador
actual y no abandona el host de la puerta de enlace (gateway) a menos que usted explícitamente
la envíe con una solicitud.

- La identidad es **solo local del navegador**. No se sincroniza con otros dispositivos y no
  forma parte del archivo de configuración de la puerta de enlace.
- Borrar los datos del sitio o cambiar de navegador restablece la identidad a vacía; la
  interfaz de usuario de Control (Control UI) no intenta reconstruir una a partir del estado del servidor.
- Nada sobre la identidad personal se persiste en el lado del servidor más allá de los
  metadatos normales de autoría de la transcripción en los mensajes que realmente envía.

## Endpoint de configuración de tiempo de ejecución

La interfaz de usuario de Control (Control UI) obtiene su configuración de tiempo de ejecución desde
`/__openclaw/control-ui-config.json`. Ese endpoint está protegido por la misma
autenticación de la puerta de enlace (gateway) que el resto de la superficie HTTP: los navegadores no autenticados no pueden
obtenerlo, y una obtención exitosa requiere un token/contraseña de puerta de enlace (gateway) ya válido,
identidad de Tailscale Serve, o una identidad de proxy de confianza. Esto
evita que las marcas de características de la interfaz de usuario de Control y los metadatos del endpoint se filtren a
escáneres no autenticados en hosts compartidos.

## Soporte de idiomas

La interfaz de usuario de Control (Control UI) puede localizarse en la primera carga según la configuración regional de su navegador.
Para anularla más tarde, abra **Overview -> Gateway Access -> Language**. El
selector de configuración regional se encuentra en la tarjeta Gateway Access, no en Appearance.

- Configuraciones regionales admitidas: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- Las traducciones no inglesas se cargan de forma diferida en el navegador.
- La configuración regional seleccionada se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción faltantes vuelven al inglés.

## Lo que puede hacer (hoy)

- Chatear con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Transmisión de llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente)
- Canales: estado de canales integrados más complementos incluidos/externos, inicio de sesión con código QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`)
- Instancias: lista de presencia + actualización (`system-presence`)
- Sesiones: lista + anulaciones por sesión de modelo/pensamiento/rápido/verboso/traza/razonamiento (`sessions.list`, `sessions.patch`)
- Sueños: estado de ensoñación, alternador habilitar/deshabilitar y lector del Diario de Sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Trabajos Cron: listar/agregar/editar/ejecutar/habilitar/deshabilitar + historial de ejecución (`cron.*`)
- Habilidades: estado, habilitar/deshabilitar, instalar, actualizaciones de claves API (`skills.*`)
- Nodos: lista + capacidades (`node.list`)
- Aprobaciones de ejecución: editar listas de permitidos de puerta de enlace o nodo + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`)
- Configuración: ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuración: aplicar + reiniciar con validación (`config.apply`) y activar la última sesión activa
- Las escrituras de configuración incluyen una protección de hash base para evitar sobrescribir ediciones simultáneas
- Las escrituras de configuración (`config.set`/`config.apply`/`config.patch`) también realizan una verificación previa de la resolución activa de SecretRef para las referencias en la carga útil de configuración enviada; las referencias activas enviadas no resueltas se rechazan antes de la escritura
- Esquema de configuración + representación de formularios (`config.schema` / `config.schema.lookup`,
  incluyendo el campo `title` / `description`, sugerencias de interfaz coincidentes, resúmenes de hijos inmediatos,
  metadatos de documentación en nodos de objeto/comodín/matriz/composición anidados,
  más esquemas de complementos y canales cuando estén disponibles); El editor JSON sin procesar está
  disponible solo cuando la instantánea tiene un viaje de ida y vuelta seguro sin procesar
- Si una instantánea no puede realizar de manera segura un viaje de ida y vuelta de texto sin procesar, la interfaz de usuario de Control fuerza el modo Formulario y deshabilita el modo Raw para esa instantánea
- El editor JSON sin procesar "Restablecer a guardado" preserva la forma creada originalmente (formato, comentarios, diseño `$include`) en lugar de volver a renderizar una instantánea aplanada, por lo que las ediciones externas sobreviven a un restablecimiento cuando la instantánea puede realizar un viaje de ida y vuelta seguro
- Los valores de objetos SecretRef estructurados se representan como de solo lectura en las entradas de texto del formulario para evitar la corrupción accidental de objeto a cadena
- Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`)
- Registros: seguimiento en vivo de los registros de archivos de la puerta de enlace con filtro/exportación (`logs.tail`)
- Actualización: ejecutar una actualización de paquete/git + reinicio (`update.run`) con un informe de reinicio

Notas del panel de trabajos programados:

- Para trabajos aislados, el envío predeterminado es anunciar resumen. Puede cambiar a ninguno si desea ejecuciones solo internas.
- Los campos de canal/destino aparecen cuando se selecciona anunciar.
- El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
- Para trabajos de sesión principal, están disponibles los modos de envío webhook y ninguno.
- Los controles de edición avanzada incluyen eliminar después de ejecutar, borrar la invalidación del agente, opciones exactas/dispersas de cron,
  invalidaciones de modelo/pensamiento del agente e interruptores de entrega de mejor esfuerzo.
- La validación del formulario es en línea con errores a nivel de campo; los valores no válidas deshabilitan el botón de guardar hasta que se corrijan.
- Establezca `cron.webhookToken` para enviar un token de portador dedicado, si se omite, el webhook se envía sin un encabezado de autenticación.
- Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

## Comportamiento del chat

- `chat.send` es **no bloqueante**: reconoce inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite mediante eventos `chat`.
- Reenviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta, y `{ status: "ok" }` después de completarse.
- Las respuestas `chat.history` están limitadas en tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
- `chat.history` también elimina las etiquetas de directivas en línea solo de visualización del texto visible del asistente (por ejemplo `[[reply_to_*]]` y `[[audio_as_voice]]`), las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y los tokens de control del modelo ASCII/anchura completa filtrados, y omite las entradas del asistente cuyo texto visible completo sea solo el token silencioso exacto `NO_REPLY` / `no_reply`.
- `chat.inject` añade una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz (sin ejecución del agente, sin entrega al canal).
- Los selectores de modelo y pensamiento del encabezado del chat parchean la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
- Detener:
  - Haga clic en **Detener** (llama a `chat.abort`)
  - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda
  - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión
- Retención parcial al abortar:
  - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz
  - El Gateway persiste el texto parcial abortado del asistente en el historial de transcripciones cuando existe salida almacenada en búfer
  - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de transcripciones puedan distinguir los parciales abortados de la salida de finalización normal

## Incrustaciones alojadas

Los mensajes del asistente pueden renderizar contenido web alojado en línea con el código corto `[embed ...]`.
La política de espacio aislado (sandbox) del iframe está controlada por
`gateway.controlUi.embedSandbox`:

- `strict`: desactiva la ejecución de scripts dentro de las incrustaciones alojadas
- `scripts`: permite incrustaciones interactivas manteniendo el aislamiento de origen; este es
  el valor predeterminado y suele ser suficiente para juegos/widgets de navegador autónomos
- `trusted`: añade `allow-same-origin` sobre `allow-scripts` para documentos
  del mismo sitio que intencionalmente necesitan privilegios más sólidos

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

Use `trusted` solo cuando el documento incrustado realmente necesite un comportamiento del mismo origen.
Para la mayoría de los juegos y lienzos interactivos generados por agentes, `scripts` es
la opción más segura.

Las URL de incrustación externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si
intencionalmente desea que `[embed url="https://..."]` cargue páginas de terceros, establezca
`gateway.controlUi.allowExternalEmbedUrls: true`.

## Acceso a Tailnet (recomendado)

### Tailscale Serve integrado (preferido)

Mantenga el Gateway en loopback y deje que Tailscale Serve actúe como proxy con HTTPS:

```bash
openclaw gateway --tailscale serve
```

Abrir:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

De forma predeterminada, las solicitudes de Control UI/WebSocket Serve pueden autenticarse mediante encabezados de identidad de Tailscale
(`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw
verifica la identidad resolviendo la dirección `x-forwarded-for` con
`tailscale whois` y comparándola con el encabezado, y solo las acepta cuando la
solicitud llega al loopback con los encabezados `x-forwarded-*` de Tailscale. Establezca
`gateway.auth.allowTailscale: false` si desea requerir credenciales explícitas de secreto compartido
incluso para el tráfico de Serve. Luego use `gateway.auth.mode: "token"` o
`"password"`.
Para esa ruta de identidad de Serve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente
y ámbito de autenticación se serializan antes de las escrituras de límite de velocidad. Los reintentos incorrectos simultáneos
desde el mismo navegador pueden, por lo tanto, mostrar `retry later` en la segunda solicitud
en lugar de dos discordancias simples compitiendo en paralelo.
La autenticación de Serve sin token asume que el host de la puerta de enlace es confiable. Si código local
no confiable puede ejecutarse en ese host, requiera autenticación por token/contraseña.

### Vincular a tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Luego abra:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

Pegue el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como
`connect.params.auth.token` o `connect.params.auth.password`).

## HTTP no seguro

Si abre el panel a través de HTTP plano (`http://<lan-ip>` o `http://<tailscale-ip>`),
el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. Por defecto,
OpenClaw **bloquea** las conexiones de la Interfaz de Control sin identidad de dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP no seguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación exitosa del operador en la Interfaz de Control a través de `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de emergencia

**Solución recomendada:** use HTTPS (Tailscale Serve) o abra la interfaz de usuario localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

**Comportamiento del alternador de autenticación insegura:**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` es solo un alternador de compatibilidad local:

- Permite que las sesiones de la Interfaz de Control de localhost continúen sin identidad de dispositivo en
  contextos HTTP no seguros.
- No omite las comprobaciones de emparejamiento.
- No relaja los requisitos de identidad de dispositivo remota (no localhost).

**Solo para ruptura de cristal:**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` desactiva las comprobaciones de identidad de dispositivo de la Interfaz de Control y es una
degradación de seguridad grave. Reviértalo rápidamente después del uso de emergencia.

Nota sobre proxy de confianza:

- la autenticación exitosa de proxy de confianza puede admitir sesiones de la Interfaz de Control de **operador** sin
  identidad de dispositivo
- esto **no** se extiende a las sesiones de la Interfaz de Control de rol de nodo
- los proxies inversos de bucle invertido del mismo host todavía no satisfacen la autenticación de proxy de confianza; ver
  [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Política de seguridad de contenido

La interfaz de usuario de Control incluye una política `img-src` estricta: solo se permiten recursos del **mismo origen** y URL `data:`. El navegador rechaza los `http(s)` remotos y las URL de imágenes relativas al protocolo, y no realiza solicitudes de red.

Lo que esto significa en la práctica:

- Los avatares y las imágenes servidas bajo rutas relativas (por ejemplo, `/avatars/<id>`) siguen renderizándose.
- Las URL `data:image/...` en línea siguen renderizándose (útil para cargas útiles dentro del protocolo).
- Las URL de avatares remotos emitidos por los metadatos del canal se eliminan en los asistentes de avatar de la interfaz de usuario de Control y se reemplazan con el logotipo/distintivo integrado, por lo que un canal comprometido o malicioso no puede forzar la recuperación de imágenes remotas arbitrarias desde el navegador de un operador.

No necesita cambiar nada para obtener este comportamiento: está siempre activo y no es configurable.

## Autenticación de la ruta de avatar

Cuando la autenticación de la puerta de enlace (gateway) está configurada, el endpoint de avatar de la Interfaz de Control requiere el mismo token de puerta de enlace que el resto de la API:

- `GET /avatar/<agentId>` devuelve la imagen del avatar solo a las llamadas autenticadas. `GET /avatar/<agentId>?meta=1` devuelve los metadatos del avatar bajo la misma regla.
- Las solicitudes no autenticadas a cualquiera de las dos rutas se rechazan (coincidiendo con la ruta hermana assistant-media). Esto evita que la ruta de avatar filtre la identidad del agente en hosts que, por lo demás, están protegidos.
- La propia Interfaz de Control reenvía el token de puerta de enlace como un encabezado de tipo bearer al obtener avatares y utiliza URLs de blob autenticadas para que la imagen siga renderizándose en los paneles de control.

Si desactiva la autenticación de la puerta de enlace (no recomendado en hosts compartidos), la ruta de avatar también deja de ser autenticada, en consonancia con el resto de la puerta de enlace.

## Construcción de la Interfaz de Usuario

El Gateway sirve archivos estáticos desde `dist/control-ui`. Compílalos con:

```bash
pnpm ui:build
```

Base absoluta opcional (cuando quieres URLs de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo separado):

```bash
pnpm ui:dev
```

Luego apunta la interfaz de usuario a tu URL de WebSocket del Gateway (por ejemplo, `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + Gateway remoto

La interfaz de usuario de control son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando quieres el servidor de desarrollo de Vite localmente pero el Gateway se ejecuta en otro lugar.

1. Inicia el servidor de desarrollo de la interfaz de usuario: `pnpm ui:dev`
2. Abre una URL como:

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Autenticación opcional de una sola vez (si es necesario):

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notas:

- `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
- Siempre que sea posible, `token` debe pasarse a través del fragmento de URL (`#token=...`). Los fragmentos no se envían al servidor, lo que evita fugas en los registros de solicitudes y en el Referer. Los parámetros de consulta heredados de `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
- `password` se mantiene solo en la memoria.
- Cuando se establece `gatewayUrl`, la interfaz de usuario no recurre a las credenciales de configuración o de entorno.
  Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
- Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics (clickjacking).
- Los despliegues de la Interfaz de Control (Control UI) que no sean de bucle local (loopback) deben establecer `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
- No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas
  locales estrictamente controladas. Significa permitir cualquier origen de navegador, no "coincidir con cualquier host que yo esté
  usando".
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

Detalles de configuración de acceso remoto: [Remote access](/es/gateway/remote).

## Relacionado

- [Dashboard](/es/web/dashboard) — panel de control del gateway
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [Health Checks](/es/gateway/health) — monitor de salud del gateway
