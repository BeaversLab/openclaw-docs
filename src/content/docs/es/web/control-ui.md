---
summary: "Interfaz de control basada en navegador para el Gateway (chat, nodos, configuración)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interfaz de control"
sidebarTitle: "Interfaz de control"
---

La interfaz de control es una pequeña aplicación de una sola página (SPA) **Vite + Lit** servida por la Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: establezca `gateway.controlUi.basePath` (p. ej., `/openclaw`)

Se comunica **directamente con el WebSocket de la Gateway** en el mismo puerto.

## Apertura rápida (local)

Si la Gateway se está ejecutando en el mismo ordenador, abra:

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Si la página no carga, inicie el Gateway primero: `openclaw gateway`.

La autenticación se proporciona durante el protocolo de enlace WebSocket a través de:

- `connect.params.auth.token`
- `connect.params.auth.password`
- Encabezados de identidad de Tailscale Serve cuando `gateway.auth.allowTailscale: true`
- encabezados de identidad de proxy de confianza cuando `gateway.auth.mode: "trusted-proxy"`

El panel de configuración del dashboard guarda un token para la sesión actual de la pestaña del navegador y la URL del gateway seleccionada; las contraseñas no se guardan. La incorporación generalmente genera un token de gateway para la autenticación de secreto compartido en la primera conexión, pero la autenticación por contraseña también funciona cuando `gateway.auth.mode` es `"password"`.

## Emparejamiento de dispositivos (primera conexión)

Cuando se conecta a la Interfaz de usuario de control desde un navegador o dispositivo nuevo, el Gateway generalmente requiere una **aprobación de emparejamiento única**. Esta es una medida de seguridad para evitar el acceso no autorizado.

**Lo que verá:** "desconectado (1008): se requiere emparejamiento"

<Steps>
  <Step title="Listar solicitudes pendientes">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="Aprobar por ID de solicitud">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

Si el navegador reintenta el emparejamiento con detalles de autenticación modificados (rol/alcances/clave pública), la solicitud pendiente anterior se reemplaza y se crea un nuevo `requestId`. Vuelva a ejecutar `openclaw devices list` antes de la aprobación.

Si el navegador ya está emparejado y lo cambia de acceso de lectura a acceso de escritura/administrador, esto se trata como una actualización de aprobación, no como una reconexión silenciosa. OpenClaw mantiene la aprobación antigua activa, bloquea la reconexión más amplia y le pide que apruebe explícitamente el nuevo conjunto de alcances.

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte [Devices CLI](/es/cli/devices) para la rotación y revocación de tokens.

<Note>
- Las conexiones directas del navegador de bucle local (`127.0.0.1` / `localhost`) se aprueban automáticamente.
- Tailscale Serve puede omitir el viaje de ida y vuelta para el emparejamiento de las sesiones del operador de la Interfaz de Control cuando `gateway.auth.allowTailscale: true`, la identidad de Tailscale se verifica y el navegador presenta su identidad de dispositivo.
- Los enlaces directos de Tailnet, las conexiones de navegador de LAN y los perfiles de navegador sin identidad de dispositivo aún requieren aprobación explícita.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o borrar los datos del navegador requerirá volver a emparejar.

</Note>

## Identidad personal (local del navegador)

La interfaz de usuario de control admite una identidad personal por navegador (nombre para mostrar y avatar) adjunta a los mensajes salientes para su atribución en sesiones compartidas. Reside en el almacenamiento del navegador, está limitada al perfil del navegador actual y no se sincroniza con otros dispositivos ni se persiste en el servidor más allá de los metadatos normales de autoría de la transcripción en los mensajes que realmente envía. Borrar los datos del sitio o cambiar de navegador la restablece a vacío.

El mismo patrón local del navegador se aplica a la anulación del avatar del asistente. Los avatares del asistente cargados superponen la identidad resuelta por la puerta de enlace solo en el navegador local y nunca hacen un viaje de ida y vuelta a través de `config.patch`. El campo de configuración compartido `ui.assistant.avatar` todavía está disponible para clientes que no son de la interfaz de usuario que escriben el campo directamente (como puertas de enlace programadas o paneles personalizados).

## Endpoint de configuración de tiempo de ejecución

La Interfaz de Control obtiene su configuración de tiempo de ejecución desde `/__openclaw/control-ui-config.json`. Ese endpoint está protegido por la misma autenticación de la puerta de enlace que el resto de la superficie HTTP: los navegadores no autenticados no pueden obtenerlo, y una obtención exitosa requiere un token/contraseña de puerta de enlace ya válido, una identidad de Tailscale Serve o una identidad de proxy de confianza.

## Soporte de idioma

La interfaz de usuario de control puede localizarse en la primera carga según la configuración regional de su navegador. Para anularla más tarde, abra **Overview -> Gateway Access -> Language**. El selector de configuración regional se encuentra en la tarjeta Gateway Access, no en Appearance.

- Configuraciones regionales compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- Las traducciones no inglesas se cargan de forma diferida en el navegador.
- El idioma seleccionado se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción faltantes vuelven al inglés.

Las traducciones de la documentación se generan para el mismo conjunto de configuraciones regionales en idiomas distintos al inglés, pero el selector de idioma integrado del sitio de documentación de Mintlify se limita a los códigos de configuración regional que Mintlify acepta. La documentación en tailandés (`th`) y persa (`fa`) todavía se genera en el repositorio de publicación; es posible que no aparezca en ese selector hasta que Mintlify admita esos códigos.

## Temas de apariencia

El panel de Apariencia mantiene los temas integrados Claw, Knot y Dash, además de una ranura de importación de tweakcn local del navegador. Para importar un tema, abra el [editor de tweakcn](https://tweakcn.com/editor/theme), elija o cree un tema, haga clic en **Share** (Compartir) y pegue el enlace del tema copiado en Apariencia. El importador también acepta URLs del registro `https://tweakcn.com/r/themes/<id>`, URL del editor como `https://tweakcn.com/editor/theme?theme=amethyst-haze`, rutas relativas `/themes/<id>`, ID de temas sin formato y nombres de temas predeterminados como `amethyst-haze`.

Los temas importados se almacenan solo en el perfil del navegador actual. No se escriben en la configuración de la puerta de enlace y no se sincronizan entre dispositivos. Reemplazar el tema importado actualiza la ranura local; borrarlo cambia el tema activo de nuevo a Claw si se había seleccionado el tema importado.

## Lo que puede hacer (hoy)

<AccordionGroup>
  <Accordion title="Chat y Talk">
    - Chatea con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Las actualizaciones del historial de chat solicitan una ventana reciente limitada con límites de texto por mensaje para que las sesiones grandes no fuercen al navegador a renderizar una carga útil de transcripción completa antes de que el chat sea utilizable.
    - Habla a través de sesiones en tiempo real del navegador. OpenAI usa WebRTC directo, Google Live usa un token de navegador de un solo uso limitado a través de WebSocket y los complementos de voz en tiempo real solo de backend usan el transporte de relé de Gateway. Las sesiones de proveedor propiedad del cliente comienzan con `talk.client.create`; las sesiones de relé de Gateway comienzan con `talk.session.create`. El relé mantiene las credenciales del proveedor en el Gateway mientras el navegador transmite PCM del micrófono a través de `talk.session.appendAudio` y reenvía las llamadas a herramientas del proveedor `openclaw_agent_consult` a través de `talk.client.toolCall` para la política de Gateway y el modelo OpenClaw más grande configurado.
    - Transmite llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente).

  </Accordion>
  <Accordion title="Canales, instancias, sesiones, sueños">
    - Canales: estado de los canales integrados más los complementos agrupados/externos, inicio de sesión con QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`).
    - Las actualizaciones de sondas de canal mantienen la instantánea anterior visible mientras finalizan las comprobaciones lentas del proveedor, y las instantáneas parciales se etiquetan cuando una sonda o auditoría excede su presupuesto de UI.
    - Instancias: lista de presencia + actualización (`system-presence`).
    - Sesiones: muestra las sesiones del agente configurado por defecto, recurre a claves de sesión de agente no configuradas obsoletas y aplica anulaciones por sesión de modelo/pensamiento/rápido/verbose/traza/razonamiento (`sessions.list`, `sessions.patch`).
    - Sueños: estado de soñar, interruptor activar/desactivar y lector del Diario de Sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).

  </Accordion>
  <Accordion title="Cron, habilidades, nodos, aprobaciones de ejecución">
    - Tareas programadas (Cron jobs): listar/añadir/editar/ejecutar/activar/desactivar + historial de ejecuciones (`cron.*`).
    - Habilidades (Skills): estado, activar/desactivar, instalación, actualizaciones de clave API (`skills.*`).
    - Nodos: lista + límites/capacidades (`node.list`).
    - Aprobaciones de ejecución (Exec approvals): editar listas de permitidos del gateway o de nodos + solicitar política para `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Configuración">
    - Ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`).
    - Aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa.
    - Las escrituras incluyen un guardado de hash base para evitar sobrescribir ediciones simultáneas.
    - Las escrituras (`config.set`/`config.apply`/`config.patch`) realizan una verificación previa de la resolución activa de SecretRef para las referencias en el payload de configuración enviado; las referencias activas enviadas sin resolver se rechazan antes de la escritura.
    - Renderizado de esquema + formulario (`config.schema` / `config.schema.lookup`, incluyendo campo `title` / `description`, sugerencias de UI coincidentes, resúmenes de hijos inmediatos, metadatos de documentación en nodos de objeto/wildcard/array/composición anidados, más esquemas de complemento + canal cuando estén disponibles); El editor JSON sin procesar (Raw) solo está disponible cuando la instantánea tiene un viaje de ida y vuelta seguro en modo raw.
    - Si una instantánea no puede realizar un viaje de ida y vuelta seguro del texto sin procesar, la UI de Control fuerza el modo Formulario y deshabilita el modo Raw para esa instantánea.
    - El editor JSON sin procesar "Restablecer a guardado" preserva la forma original en crudo (formato, comentarios, diseño `$include`) en lugar de volver a renderizar una instantánea aplanada, por lo que las ediciones externas sobreviven a un restablecimiento cuando la instantánea puede realizar un viaje de ida y vuelta seguro.
    - Los valores de objetos SecretRef estructurados se renderizan como solo lectura en las entradas de texto del formulario para evitar una corrupción accidental de objeto a cadena.

  </Accordion>
  <Accordion title="Depuración, registros, actualización">
    - Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`).
    - El registro de eventos incluye los tiempos de actualización/RPC de la interfaz de control, los tiempos de renderizado lentos del chat/configuración y las entradas de capacidad de respuesta del navegador para marcos de animación largos o tareas largas cuando el navegador expone esos tipos de entradas de PerformanceObserver.
    - Registros: seguimiento en vivo de los registros de archivos de la pasarela con filtro/exportación (`logs.tail`).
    - Actualización: ejecutar una actualización de paquete/git + reinicio (`update.run`) con un informe de reinicio y luego sondear `update.status` después de reconectar para verificar la versión en ejecución de la pasarela.

  </Accordion>
  <Accordion title="Notas del panel de tareas programadas">
    - Para tareas aisladas, la entrega por defecto es anunciar un resumen. Puedes cambiar a "ninguno" si deseas ejecuciones solo internas.
    - Los campos de canal/destino aparecen cuando se selecciona anunciar.
    - El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
    - Para las tareas de la sesión principal, están disponibles los modos de entrega webhook y ninguno.
    - Los controles de edición avanzados incluyen eliminar después de la ejecución, borrar la anulación del agente, opciones exactas/desfasadas de cron, anulaciones del modelo/pensamiento del agente y alternativas de entrega de mejor esfuerzo.
    - La validación del formulario es en línea con errores a nivel de campo; los valores inválidos deshabilitan el botón guardar hasta que se corrijan.
    - Establezca `cron.webhookToken` para enviar un token de portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
    - Respaldo obsoleto: las tareas heredadas almacenadas con `notify: true` todavía pueden usar `cron.webhook` hasta que se migren.

  </Accordion>
</AccordionGroup>

## Comportamiento del chat

<AccordionGroup>
  <Accordion title="Semántica de envío e historial">
    - `chat.send` es **no bloqueante**: reconoce inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
    - Las cargas del chat aceptan imágenes y archivos que no sean de video. Las imágenes mantienen la ruta nativa de la imagen; otros archivos se almacenan como medios administrados y se muestran en el historial como enlaces de adjuntos.
    - Reenviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta, y `{ status: "ok" }` después de completarse.
    - Las respuestas de `chat.history` tienen límite de tamaño para la seguridad de la interfaz de usuario. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
    - Las imágenes generadas por el asistente se conservan como referencias de medios administrados y se devuelven a través de URL de medios de Gateway autenticadas, por lo que las recargas no dependen de que las cargas de imágenes base64 sin procesar permanezcan en la respuesta del historial del chat.
    - Al renderizar `chat.history`, la interfaz de usuario de Control elimina las etiquetas de directivas en línea solo de visualización del texto visible del asistente (por ejemplo, `[[reply_to_*]]` y `[[audio_as_voice]]`), las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y los tokens de control de modelo ASCII/anchura completa filtrados, y omite las entradas del asistente cuyo texto visible completo sea solo el token silencioso exacto `NO_REPLY` / `no_reply` o el token de reconocimiento de latido `HEARTBEAT_OK`.
    - Durante un envío activo y la actualización final del historial, la vista de chat mantiene visibles los mensajes optimistas locales del usuario/asistente si `chat.history` devuelve brevemente una instantánea anterior; la transcripción canónica reemplaza esos mensajes locales una vez que el historial de Gateway se actualiza.
    - Los eventos en vivo `chat` son el estado de entrega, mientras que `chat.history` se reconstruye a partir de la transcripción duradera de la sesión. Después de los eventos finales de herramientas, la interfaz de usuario de Control recarga el historial y fusiona solo una pequeña cola optimista; el límite de la transcripción está documentado en [WebChat](/es/web/webchat).
    - `chat.inject` agrega una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz de usuario (sin ejecución de agente, sin entrega de canal).
    - El encabezado del chat muestra el filtro de agente antes del selector de sesión, y el selector de sesión tiene el alcance del agente seleccionado. Cambiar de agente muestra solo las sesiones vinculadas a ese agente y vuelve a la sesión principal de ese agente cuando aún no tiene sesiones de panel guardadas.
    - En anchos de escritorio, los controles de chat permanecen en una fila compacta y se colapsan al desplazarse hacia abajo por la transcripción; al desplazarse hacia arriba, volver arriba o llegar al final, se restauran los controles.
    - Los mensajes consecutivos duplicados de solo texto se representan como una burbuja con una insignia de recuento. Los mensajes que contienen imágenes, archivos adjuntos, salida de herramientas o vistas previas de canvas no se colapsan.
    - Los selectores de modelo y de pensamiento del encabezado del chat aplican parches a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
    - Si envía un mensaje mientras un cambio de selector de modelo para la misma sesión aún se está guardando, el compositor espera ese parche de sesión antes de llamar a `chat.send` para que el envío use el modelo seleccionado.
    - Escribir `/new` en la interfaz de usuario de Control crea y cambia a la misma sesión de panel nueva que Nuevo chat, excepto cuando `session.dmScope: "main"` está configurado y el padre actual es la sesión principal del agente; en ese caso, restablece la sesión principal en su lugar. Escribir `/reset` mantiene el restablecimiento explícito en su lugar de Gateway para la sesión actual.
    - El selector de modelo de chat solicita la vista de modelo configurada de Gateway. Si `agents.defaults.models` está presente, esa lista de permitidos impulsa el selector, incluidas las entradas `provider/*` que mantienen los catálogos con ámbito de proveedor dinámicos. De lo contrario, el selector muestra entradas explícitas `models.providers.*.models` más proveedores con autenticación utilizable. El catálogo completo permanece disponible a través de la RPC de depuración `models.list` con `view: "all"`.
    - Cuando los informes de uso de sesión de Gateway recientes incluyen tokens de contexto actuales, el área del compositor del chat muestra un indicador compacto de uso de contexto. Cambia al estilo de advertencia bajo alta presión de contexto y, en los niveles de compactación recomendados, muestra un botón compacto que ejecuta la ruta normal de compactación de sesión. Las instantáneas de tokens obsoletas se ocultan hasta que Gateway informe del uso nuevamente.

  </Accordion>
  <Accordion title="Modo Talk (tiempo real del navegador)">
    El modo Talk utiliza un proveedor de voz en tiempo real registrado. Configure OpenAI con `talk.realtime.provider: "openai"` más `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY` o un perfil OAuth de `openai-codex`; configure Google con `talk.realtime.provider: "google"` más `talk.realtime.providers.google.apiKey`. El navegador nunca recibe una clave de API estándar del proveedor. OpenAI recibe un secreto efímero de cliente Realtime para WebRTC. Google Live recibe un token de autenticación de API Live restringido de un solo uso para una sesión WebSocket del navegador, con instrucciones y declaraciones de herramientas bloqueadas en el token por el Gateway. Los proveedores que solo exponen un puente en tiempo real de backend se ejecutan a través del transporte de retransmisión del Gateway, por lo que las credenciales y los sockets del proveedor permanecen en el lado del servidor mientras el audio del navegador se mueve a través de RPC autenticadas del Gateway. El mensaje de la sesión Realtime lo ensambla el Gateway; `talk.client.create` no acepta anulaciones de instrucciones proporcionadas por el autor de la llamada.

    El editor de Chat incluye un botón de opciones de Talk junto al botón de inicio/parada de Talk. Las opciones se aplican a la siguiente sesión de Talk y pueden anular el proveedor, transporte, modelo, voz, esfuerzo de razonamiento, umbral VAD, duración del silencio y relleno de prefijo. Cuando una opción está en blanco, el Gateway utiliza los valores predeterminados configurados, si están disponibles, o el valor predeterminado del proveedor. Seleccionar la retransmisión del Gateway fuerza la ruta de retransmisión del backend; seleccionar WebRTC mantiene la sesión propiedad del cliente y falla en lugar de volver a la retransmisión silenciosamente si el proveedor no puede crear una sesión del navegador.

    En el editor de Chat, el control de Talk es el botón de ondas junto al botón de dictado por micrófono. Cuando Talk se inicia, la fila de estado del editor muestra `Connecting Talk...`, luego `Talk live` mientras el audio está conectado, o `Asking OpenClaw...` mientras una llamada a herramienta en tiempo real consulta el modelo más grande configurado a través de `talk.client.toolCall`.

    Prueba en vivo del mantenedor: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifica el puente WebSocket del backend de OpenAI, el intercambio SDP WebRTC del navegador de OpenAI, la configuración WebSocket del navegador con token restringido de Google Live y el adaptador del navegador de retransmisión del Gateway con medios de micrófono falsos. El comando imprime solo el estado del proveedor y no registra secretos.

  </Accordion>
  <Accordion title="Detener y abortar">
    - Haga clic en **Stop** (llama a `chat.abort`).
    - Mientras una ejecución está activa, las preguntas de seguimiento normales se ponen en cola. Haga clic en **Steer** en un mensaje en cola para inyectar ese seguimiento en el turno de ejecución actual.
    - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda.
    - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión.

  </Accordion>
  <Accordion title="Retención parcial al abortar">
    - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario.
    - Gateway persiste el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida en el búfer.
    - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de la transcripción puedan distinguir los parciales de aborto de la salida de finalización normal.

  </Accordion>
</AccordionGroup>

## Instalación de PWA y web push

La interfaz de usuario de Control incluye un `manifest.webmanifest` y un service worker, por lo que los navegadores modernos pueden instalarla como una PWA independiente. Web Push permite que Gateway active la PWA instalada con notificaciones, incluso cuando la pestaña o la ventana del navegador no están abiertas.

| Superficie                                                        | Lo que hace                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                                  | Manifiesto de PWA. Los navegadores ofrecen "Install app" una vez que es accesible.    |
| `ui/public/sw.js`                                                 | Service worker que maneja eventos `push` y clics en notificaciones.                   |
| `push/vapid-keys.json` (bajo el directorio de estado de OpenClaw) | Par de claves VAPID autogenerado utilizado para firmar las cargas útiles de Web Push. |
| `push/web-push-subscriptions.json`                                | Endpoints de suscripción del navegador persistidos.                                   |

Anule el par de claves VAPID mediante variables de entorno en el proceso de Gateway cuando desee fijar las claves (para implementaciones con múltiples hosts, rotación de secretos o pruebas):

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (predeterminado en `mailto:openclaw@localhost`)

La interfaz de usuario de Control utiliza estos métodos de Gateway con ámbito para registrar y probar las suscripciones del navegador:

- `push.web.vapidPublicKey` — obtiene la clave pública VAPID activa.
- `push.web.subscribe` — registra un `endpoint` más `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — elimina un punto final registrado.
- `push.web.test` — envía una notificación de prueba a la suscripción del autor de la llamada.

<Note>Web Push es independiente de la ruta de relé APNS de iOS (consulte [Configuration](/es/gateway/configuration) para push con respaldo de relé) y del método `push.test` existente, que tiene como objetivo el emparejamiento móvil nativo.</Note>

## Incrustaciones alojadas

Los mensajes del asistente pueden representar contenido web alojado en línea con el shortcode `[embed ...]`. La política de espacio aislado del iframe se controla mediante `gateway.controlUi.embedSandbox`:

<Tabs>
  <Tab title="strict">Deshabilita la ejecución de scripts dentro de los embeds alojados.</Tab>
  <Tab title="scripts (predeterminado)">Permite embeds interactivos manteniendo el aislamiento de origen; este es el valor predeterminado y suele ser suficiente para juegos/widgets de navegador autocontenidos.</Tab>
  <Tab title="trusted">Añade `allow-same-origin` además de `allow-scripts` para documentos del mismo sitio que intencionalmente necesitan privilegios más fuertes.</Tab>
</Tabs>

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

<Warning>Use `trusted` solo cuando el documento incrustado realmente necesite un comportamiento del mismo origen. Para la mayoría de los juegos y lienzos interactivos generados por agentes, `scripts` es la opción más segura.</Warning>

Las URL de integración externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si intencionalmente desea que `[embed url="https://..."]` cargue páginas de terceros, configure `gateway.controlUi.allowExternalEmbedUrls: true`.

## Ancho del mensaje de chat

Los mensajes de chat agrupados utilizan un ancho máximo predeterminado legible. Las implementaciones en monitores anchos pueden anularlo sin parchear el CSS incluido configurando `gateway.controlUi.chatMessageMaxWidth`:

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

El valor se valida antes de llegar al navegador. Los valores admitidos incluyen longitudes y porcentajes simples como `960px` o `82%`, además de expresiones de ancho restringidas `min(...)`, `max(...)`, `clamp(...)`, `calc(...)` y `fit-content(...)`.

## Acceso a Tailnet (recomendado)

<Tabs>
  <Tab title="Tailscale Serve integrado (recomendado)">
    Mantén el Gateway en bucle local (loopback) y deja que Tailscale Sirve actúe como proxy con HTTPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Abre:

    - `https://<magicdns>/` (o tu `gateway.controlUi.basePath` configurado)

    De forma predeterminada, las solicitudes de Control UI/WebSocket Serve pueden autenticarse mediante encabezados de identidad de Tailscale (`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw verifica la identidad resolviendo la dirección `x-forwarded-for` con `tailscale whois` y coincidiéndola con el encabezado, y solo acepta estas cuando la solicitud llega al bucle local con los encabezados `x-forwarded-*` de Tailscale. Para las sesiones del operador de Control UI con identidad de dispositivo del navegador, esta ruta de Serve verificada también omite el viaje de ida y vuelta del emparejamiento de dispositivos (device-pairing); los navegadores sin dispositivo y las conexiones de rol de nodo (node-role) aún siguen las verificaciones normales de dispositivos. Establece `gateway.auth.allowTailscale: false` si deseas requerir credenciales explícitas de secreto compartido incluso para el tráfico de Serve. Luego usa `gateway.auth.mode: "token"` o `"password"`.

    Para esa ruta de identidad de Serve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente y ámbito de autenticación se serializan antes de las escrituras de limitación de tasa. Por lo tanto, los reintentos incorrectos simultáneos desde el mismo navegador pueden mostrar `retry later` en la segunda solicitud en lugar de dos discrepancias simples compitiendo en paralelo.

    <Warning>
    La autenticación de Serve sin token asume que el host de la pasarela es confiable. Si código local no confiable puede ejecutarse en ese host, requiera autenticación por token/contraseña.
    </Warning>

  </Tab>
  <Tab title="Bind to tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Luego abra:

    - `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

    Pegue el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como `connect.params.auth.token` o `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP inseguro

Si abre el panel a través de HTTP plano (`http://<lan-ip>` o `http://<tailscale-ip>`), el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada, OpenClaw **bloquea** las conexiones a la interfaz de usuario de control sin identidad del dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP inseguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación de operador exitosa en la interfaz de usuario de control a través de `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de emergencia

**Solución recomendada:** usar HTTPS (Tailscale Serve) o abrir la interfaz localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

<AccordionGroup>
  <Accordion title="Insecure-auth toggle behavior">
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

    - Permite que las sesiones de la interfaz de usuario de control de localhost continúen sin identidad del dispositivo en contextos HTTP no seguros.
    - No omite las verificaciones de emparejamiento.
    - No relaja los requisitos de identidad del dispositivo remota (no localhost).

  </Accordion>
  <Accordion title="Break-glass only">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` deshabilita las verificaciones de identidad del dispositivo de la interfaz de usuario de control y es una degradación severa de la seguridad. Revértalo rápidamente después del uso de emergencia.
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy note">
    - La autenticación exitosa de proxy confiable puede admitir sesiones de la interfaz de usuario de control de **operador** sin identidad del dispositivo.
    - Esto **no** se extiende a las sesiones de la interfaz de usuario de control de rol de nodo.
    - Los proxies inversos de bucle invertido del mismo host todavía no satisfacen la autenticación de proxy confiable; consulte [Trusted proxy auth](/es/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Política de seguridad de contenido

La interfaz de usuario de Control (Control UI) se envía con una política `img-src` estricta: solo se permiten activos del **mismo origen**, URL `data:` y URL `blob:` generadas localmente. Las URL `http(s)` remotas y las URL de imagen relativas al protocolo son rechazadas por el navegador y no emiten solicitudes de red.

Lo que esto significa en la práctica:

- Los avatares y las imágenes servidas bajo rutas relativas (por ejemplo, `/avatars/<id>`) siguen renderizándose, incluidas las rutas de avatar autenticadas que la interfaz de usuario obtiene y convierte en URL `blob:` locales.
- Las URL `data:image/...` en línea siguen renderizándose (útil para cargas útiles dentro del protocolo).
- Las URL `blob:` locales creadas por la interfaz de usuario de Control siguen renderizándose.
- Las URL de avatar remoto emitidas por los metadatos del canal se eliminan en los auxiliares de avatar de la interfaz de usuario de Control y se reemplazan con el logotipo/insignia integrado, por lo que un canal comprometido o malicioso no puede forzar recuperaciones de imágenes remotas arbitrarias desde el navegador de un operador.

No necesita cambiar nada para obtener este comportamiento; siempre está activado y no es configurable.

## Autenticación de la ruta de avatar

Cuando se configura la autenticación de la puerta de enlace, el punto final de avatar de la interfaz de usuario de Control requiere el mismo token de puerta de enlace que el resto de la API:

- `GET /avatar/<agentId>` devuelve la imagen del avatar solo a los llamantes autenticados. `GET /avatar/<agentId>?meta=1` devuelve los metadatos del avatar bajo la misma regla.
- Las solicitudes no autenticadas a cualquiera de las dos rutas se rechazan (coincidiendo con la ruta hermana assistant-media). Esto evita que la ruta de avatar filtre la identidad del agente en hosts que están protegidos por otros medios.
- La propia interfaz de usuario de Control reenvía el token de puerta de enlace como un encabezado de portador (bearer) al obtener avatares y utiliza URL de blob autenticadas para que la imagen aún se represente en los paneles de control.

Si deshabilita la autenticación de la puerta de enlace (no recomendado en hosts compartidos), la ruta de avatar también se convierte en no autenticada, en consonancia con el resto de la puerta de enlace.

## Autenticación de la ruta de medios del asistente

Cuando se configura la autenticación de la puerta de enlace, las vistas previas de medios locales del asistente utilizan una ruta de dos pasos:

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` requiere la autenticación normal del operador de la interfaz de usuario de Control. El navegador envía el token de puerta de enlace como un encabezado de portador (bearer) al verificar la disponibilidad.
- Las respuestas de metadatos exitosas incluyen un `mediaTicket` de corta duración limitado a esa ruta de origen exacta.
- Las URL de imágenes, audio, video y documentos renderizados por el navegador usan `mediaTicket=<ticket>` en lugar del token o contraseña activa de la puerta de enlace. El ticket caduca rápidamente y no puede autorizar una fuente diferente.

Esto mantiene el renderizado normal de medios compatible con los elementos de medios nativos del navegador sin poner credenciales reutilizables de la puerta de enlace en las URL de medios visibles.

## Construcción de la interfaz de usuario

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

Luego apunte la interfaz de usuario a su URL de Gateway WS (por ejemplo, `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La interfaz de usuario de Control son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando desea tener el servidor de desarrollo de Vite localmente pero la puerta de enlace se ejecuta en otro lugar.

<Steps>
  <Step title="Inicie el servidor de desarrollo de la interfaz de usuario">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Abrir con gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    Autenticación opcional de una sola vez (si es necesario):

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notas">
    - `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
    - Si pasas un endpoint completo `ws://` o `wss://` a través de `gatewayUrl`, codifica en URL el valor `gatewayUrl` para que el navegador analice correctamente la cadena de consulta.
    - `token` debe pasarse a través del fragmento de URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita la filtración de registros de solicitud y referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como reserva, y se eliminan inmediatamente después del arranque.
    - `password` se mantiene solo en memoria.
    - Cuando `gatewayUrl` está configurado, la interfaz de usuario no recurre a credenciales de configuración o de entorno. Proporciona `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
    - Usa `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
    - Las implementaciones de Control UI que no sean de loopback deben establecer `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
    - El inicio del Gateway puede sembrar orígenes locales como `http://localhost:<port>` y `http://127.0.0.1:<port>` desde el enlace y puerto de tiempo de ejecución efectivo, pero los orígenes del navegador remoto todavía necesitan entradas explícitas.
    - No uses `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales estrechamente controladas. Significa permitir cualquier origen de navegador, no "coincidir con el host que estoy usando".
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de reserva de origen del encabezado Host, pero es un modo de seguridad peligroso.

  </Accordion>
</AccordionGroup>

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

## Relacionado

- [Dashboard](/es/web/dashboard) — panel de control de la puerta de enlace
- [Health Checks](/es/gateway/health) — supervisión de la salud de la puerta de enlace
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
