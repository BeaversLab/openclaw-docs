---
summary: "Interfaz de control basada en navegador para el Gateway (chat, actividad, nodos, configuración)"
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

Una vez aprobado, el dispositivo se recuerda y no requerirá una nueva aprobación a menos que lo revoques con `openclaw devices revoke --device <id> --role <role>`. Consulte [CLI de dispositivos](/es/cli/devices) para la rotación y revocación de tokens.

Los agentes de Paperclip que se conectan a través del adaptador `openclaw_gateway` utilizan el mismo flujo de aprobación de primera ejecución. Después del intento de conexión inicial, ejecuta `openclaw devices approve --latest` para obtener una vista previa de la solicitud pendiente y, a continuación, vuelve a ejecutar el comando `openclaw devices approve <requestId>` impreso para aprobarla. Pasa valores explícitos de `--url` y `--token` para una puerta de enlace remota. Para mantener las aprobaciones estables tras los reinicios, configura un `adapterConfig.devicePrivateKeyPem` persistente en Paperclip en lugar de permitirle que genere una nueva identidad de dispositivo efímera en cada ejecución.

<Note>
- Las conexiones directas del navegador de bucle local (`127.0.0.1` / `localhost`) se aprueban automáticamente.
- Tailscale Serve puede omitir el viaje de ida y vuelta del emparejamiento para las sesiones del operador de Control UI cuando `gateway.auth.allowTailscale: true`, la identidad de Tailscale se verifica y el navegador presenta su identidad de dispositivo.
- Los enlaces directos de Tailnet, las conexiones del navegador LAN y los perfiles de navegador sin identidad de dispositivo todavía requieren una aprobación explícita.
- Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o borrar los datos del navegador requerirá volver a emparejar.

</Note>

## Identidad personal (local del navegador)

El Control UI admite una identidad personal por navegador (nombre para mostrar y avatar) adjunta a los mensajes salientes para su atribución en sesiones compartidas. Reside en el almacenamiento del navegador, está limitada al perfil de navegador actual y no se sincroniza con otros dispositivos ni se persiste en el lado del servidor más allá de los metadatos normales de autoría de la transcripción en los mensajes que realmente envías. Borrar los datos del sitio o cambiar de navegador lo restablece a vacío.

El mismo patrón local del navegador se aplica a la anulación del avatar del asistente. Los avatares del asistente cargados superponen la identidad resuelta por la puerta de enlace solo en el navegador local y nunca hacen un viaje de ida y vuelta a través de `config.patch`. El campo de configuración compartido `ui.assistant.avatar` todavía está disponible para clientes que no son de interfaz de usuario que escriben el campo directamente (como puertas de enlace programadas o paneles personalizados).

## Endpoint de configuración en tiempo de ejecución

La interfaz de usuario de control obtiene su configuración en tiempo de ejecución desde `/__openclaw/control-ui-config.json`. Ese endpoint está protegido por la misma autenticación de la puerta de enlace que el resto de la superficie HTTP: los navegadores no autenticados no pueden obtenerlo, y una obtención exitosa requiere un token/contraseña de puerta de enlace ya válido, una identidad de Tailscale Serve o una identidad de proxy de confianza.

## Soporte de idiomas

La interfaz de usuario de control puede localizarse en la primera carga según la configuración regional de su navegador. Para anularla más tarde, abra **Overview -> Gateway Access -> Language**. El selector de configuración regional se encuentra en la tarjeta Gateway Access, no en Appearance.

- Configuraciones regionales compatibles: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- Las traducciones que no están en inglés se cargan de forma diferida en el navegador.
- La configuración regional seleccionada se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción que faltan vuelven al inglés.

Las traducciones de la documentación se generan para el mismo conjunto de configuraciones regionales que no están en inglés, pero el selector de idioma integrado del sitio de documentación de Mintlify se limita a los códigos de configuración regional que Mintlify acepta. La documentación en tailandés (`th`) y persa (`fa`) todavía se genera en el repositorio de publicación; es posible que no aparezcan en ese selector hasta que Mintlify admita esos códigos.

## Temas de apariencia

El panel Apariencia mantiene los temas integrados Claw, Knot y Dash, además de una ranura de importación tweakcn local en el navegador. Para importar un tema, abra el [editor tweakcn](https://tweakcn.com/editor/theme), elija o cree un tema, haga clic en **Share** (Compartir) y pegue el enlace del tema copiado en Apariencia. El importador también acepta URL de registro `https://tweakcn.com/r/themes/<id>`, URL del editor como `https://tweakcn.com/editor/theme?theme=amethyst-haze`, rutas relativas `/themes/<id>`, IDs de temas sin procesar y nombres de temas predeterminados como `amethyst-haze`.

Apariencia también incluye una configuración de Tamaño de texto local en el navegador. La configuración se almacena con el resto de preferencias de la interfaz de usuario de Control, se aplica al texto del chat, al texto del compositor, a las tarjetas de herramientas y a las barras laterales del chat, y mantiene las entradas de texto con al menos 16 px para que Safari móvil no haga zoom automático al enfocar.

Los temas importados se almacenan solo en el perfil del navegador actual. No se escriben en la configuración de la puerta de enlace y no se sincronizan entre dispositivos. Reemplazar el tema importado actualiza la única ranura local; borrarlo cambia el tema activo de vuelta a Claw si se había seleccionado el tema importado.

## Lo que puede hacer (hoy)

<AccordionGroup>
  <Accordion title="Chat y Talk">
    - Chatea con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Las actualizaciones del historial de chat solicitan una ventana reciente limitada con límites de texto por mensaje para que las sesiones grandes no fuercen al navegador a renderizar una carga completa de la transcripción antes de que el chat sea utilizable.
    - Habla a través de sesiones en tiempo real del navegador. OpenAI usa WebRTC directo, Google Live usa un token de navegador de un solo uso limitado a través de WebSocket, y los complementos de voz en tiempo real solo de backend usan el transporte de retransmisión de Gateway. Las sesiones de proveedor propiedad del cliente comienzan con `talk.client.create`; las sesiones de retransmisión de Gateway comienzan con `talk.session.create`. La retransmisión mantiene las credenciales del proveedor en el Gateway mientras el navegador transmite PCM del micrófono a través de `talk.session.appendAudio`, reenvía `openclaw_agent_consult` las llamadas a herramientas del proveedor a través de `talk.client.toolCall` para la política de Gateway y el modelo OpenClaw más grande configurado, y enruta la dirección de voz de ejecución activa a través de `talk.client.steer` o `talk.session.steer`.
    - Transmite llamadas a herramientas + tarjetas de salida de herramientas en vivo en el Chat (eventos de agente).
    - Pestaña de actividad con resúmenes locales del navegador y con prioridad de redacción de la actividad de herramientas en vivo desde la entrega `session.tool` / eventos de herramientas existentes.

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels: estado de los canales integrados y de complementos agrupados/externos, inicio de sesión con QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`).
    - Las actualizaciones de las sondas de canales mantienen visible la instantánea anterior mientras finalizan las comprobaciones lentas del proveedor, y las instantáneas parciales se etiquetan cuando una sonda o auditoría excede su presupuesto de interfaz.
    - Instances: lista de presencia + actualización (`system-presence`).
    - Sessions: lista de sesiones de agente configuradas por defecto, respaldo a partir de claves de sesión de agente no configuradas obsoletas y aplicación de anulaciones por sesión de modelo/pensamiento/rapidez/verbose/traza/razonamiento (`sessions.list`, `sessions.patch`).
    - Dreams: estado de soñar, interruptor de activar/desactivar y lector del Diario de Sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron jobs: listar/añadir/editar/ejecutar/activar/desactivar + historial de ejecuciones (`cron.*`).
    - Skills: estado, activar/desactivar, instalar, actualizaciones de claves API (`skills.*`).
    - Nodes: lista + capacidades (`node.list`).
    - Exec approvals: editar listas de permitidos de puerta de enlace o nodos + política de solicitud para `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Config">
    - Ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`).
    - Aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa.
    - Las escrituras incluyen una protección de hash base para evitar sobrescribir ediciones simultáneas.
    - Las escrituras (`config.set`/`config.apply`/`config.patch`) preflight resuelven los SecretRef activos para las referencias en la carga útil de configuración enviada; las referencias activas enviadas sin resolver se rechazan antes de la escritura.
    - Los guardados de formulario descartan los marcadores de posición redactados obsoletos que no se pueden restaurar desde la configuración guardada, al tiempo que preservan los valores redactados que aún se asignan a secretos guardados.
    - Representación de esquema + formulario (`config.schema` / `config.schema.lookup`, incluyendo el campo `title` / `description`, sugerencias de IU coincidentes, resúmenes de hijos inmediatos, metadatos de documentos en nodos de objeto/comodín/matriz/composición anidados, además de esquemas de complemento y canal cuando estén disponibles); el editor JSON sin procesar solo está disponible cuando la instantánea tiene un viaje de ida y vuelta sin procesar seguro.
    - Si una instantánea no puede hacer un viaje de ida y vuelta de texto sin procesar de manera segura, la IU de Control fuerza el modo Formulario y deshabilita el modo Sin procesar para esa instantánea.
    - El editor JSON sin procesar "Restablecer a lo guardado" preserva la forma creada originalmente (formato, comentarios, diseño `$include`) en lugar de volver a representar una instantánea aplanada, por lo que las ediciones externas sobreviven a un restablecimiento cuando la instantánea puede hacer un viaje de ida y vuelta seguro.
    - Los valores de objetos SecretRef estructurados se representan como de solo lectura en las entradas de texto del formulario para evitar la corrupción accidental de objeto a cadena.

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`).
    - El registro de eventos incluye tiempos de actualización/RPC de la Control UI, tiempos de renderizado lentos de chat/configuración y entradas de capacidad de respuesta del navegador para cuadros de animación largos o tareas largas cuando el navegador expone esos tipos de entrada de PerformanceObserver.
    - Logs: seguimiento en vivo de los registros de archivos del gateway con filtro/exportación (`logs.tail`).
    - Update: ejecuta una actualización de paquete/git + reinicio (`update.run`) con un informe de reinicio, y luego consulta `update.status` después de reconectar para verificar la versión del gateway en ejecución.

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - Para trabajos aislados, la entrega por defecto es anunciar resumen. Puedes cambiar a ninguno si deseas ejecuciones solo internas.
    - Los campos de canal/destino aparecen cuando se selecciona anunciar.
    - El modo Webhook utiliza `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
    - Para trabajos de sesión principal, están disponibles los modos de entrega webhook y ninguno.
    - Los controles de edición avanzados incluyen eliminar después de la ejecución, borrar la invalidación del agente, opciones exactas/dispersas de cron, invalidaciones de modelo/pensamiento del agente y alternadores de entrega de mejor esfuerzo.
    - La validación del formulario es en línea con errores a nivel de campo; los valores no válidos deshabilitan el botón de guardar hasta que se corrijan.
    - Establezca `cron.webhookToken` para enviar un token portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
    - Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.

  </Accordion>
</AccordionGroup>

## Pestaña Actividad

La pestaña Actividad es un observador efímero local del navegador para la actividad de herramientas en vivo. Se deriva del mismo flujo de eventos de herramienta / `session.tool` del Gateway que impulsa las tarjetas de herramientas de Chat; no añade otra familia de eventos del Gateway, punto final, almacén de actividad duradero, fuente de métricas o flujo de observador externo.

Las entradas de actividad solo conservan resúmenes saneados y vistas previas de salida redactadas y truncadas. Los valores de los argumentos de las herramientas no se almacenan en el estado de Actividad; la interfaz de usuario muestra que los argumentos están ocultos y registra solo el recuento de campos de argumentos. La lista en memoria sigue la pestaña actual del navegador, sobrevive a la navegación dentro de la Interfaz de Control y se restablece al recargar la página, cambiar de sesión o al hacer clic en **Clear**.

## Comportamiento del chat

<AccordionGroup>
  <Accordion title="Envío y semántica del historial">
    - `chat.send` es **sin bloqueo**: reconoce inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
    - Las cargas del chat aceptan imágenes y archivos que no sean de video. Las imágenes conservan la ruta nativa de la imagen; otros archivos se almacenan como medios gestionados y se muestran en el historial como enlaces de adjuntos.
    - Volver a enviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta y `{ status: "ok" }` después de completarse.
    - Las respuestas `chat.history` tienen un límite de tamaño por seguridad de la interfaz de usuario. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
    - Las imágenes generadas por el asistente se persisten como referencias de medios gestionados y se sirven nuevamente a través de URL de medios de Gateway autenticadas, por lo que las recargas no dependen de que las cargas de imágenes base64 sin procesar permanezcan en la respuesta del historial del chat.
    - Al representar `chat.history`, la interfaz de usuario de Control elimina las etiquetas de directivas en línea solo de visualización del texto visible del asistente (por ejemplo, `[[reply_to_*]]` y `[[audio_as_voice]]`), las cargas XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y los tokens de control del modelo ASCII/ancho completos filtrados, y omite las entradas del asistente cuyo texto visible completo es solo el token silencioso exacto `NO_REPLY` / `no_reply` o el token de reconocimiento de latido `HEARTBEAT_OK`.
    - Durante un envío activo y la actualización final del historial, la vista de chat mantiene visibles los mensajes optimistas locales del usuario/asistente si `chat.history` devuelve brevemente una instantánea antigua; la transcripción canónica reemplaza esos mensajes locales una vez que el historial de Gateway se actualiza.
    - Los eventos `chat` en vivo son el estado de entrega, mientras que `chat.history` se reconstruye a partir de la transcripción duradera de la sesión. Después de los eventos de finalización de herramientas, la interfaz de usuario de Control recarga el historial y fusiona solo una pequeña cola optimista; el límite de la transcripción está documentado en [WebChat](/es/web/webchat).
    - `chat.inject` agrega una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz de usuario (sin ejecución del agente, sin entrega al canal).
    - El encabezado del chat muestra el filtro de agente antes del selector de sesión, y el selector de sesión tiene el alcance del agente seleccionado. Cambiar de agente muestra solo las sesiones vinculadas a ese agente y vuelve a la sesión principal de ese agente cuando aún no tiene sesiones de panel guardadas.
    - En anchos de escritorio, los controles de chat permanecen en una fila compacta y se contraen al desplazarse hacia abajo por la transcripción; al desplazarse hacia arriba, volver al principio o llegar al final, se restauran los controles.
    - Los mensajes duplicados consecutivos de solo texto se representan como una sola burbuja con una insignia de recuento. Los mensajes que contienen imágenes, adjuntos, salida de herramientas o vistas previas de lienzo se dejan sin contraer.
    - Los selectores de modelo y pensamiento del encabezado del chat aplican un parche a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
    - Si envía un mensaje mientras un cambio de selector de modelo para la misma sesión todavía se está guardando, el compositor espera ese parche de sesión antes de llamar a `chat.send` para que el envío use el modelo seleccionado.
    - Escribir `/new` en la interfaz de usuario de Control crea y cambia a la misma sesión de panel nueva que Nuevo chat, excepto cuando `session.dmScope: "main"` está configurado y el padre actual es la sesión principal del agente; en ese caso, restablece la sesión principal en su lugar. Escribir `/reset` mantiene el restablecimiento explícito en su lugar de Gateway para la sesión actual.
    - El selector de modelo de chat solicita la vista de modelo configurada de Gateway. Si `agents.defaults.models` está presente, esa lista de permitidos impulsa el selector, incluidas las entradas `provider/*` que mantienen los catálogos con alcance de proveedor dinámicos. De lo contrario, el selector muestra entradas `models.providers.*.models` explícitas más proveedores con autenticación utilizable. El catálogo completo permanece disponible a través de la depuración `models.list` RPC con `view: "all"`.
    - Cuando los informes de uso de la sesión de Gateway recientes incluyen tokens de contexto actuales, el área del compositor de chat muestra un indicador compacto de uso del contexto. Cambia al estilo de advertencia bajo alta presión de contexto y, en los niveles de compactación recomendados, muestra un botón compacto que ejecuta la ruta de compactación de sesión normal. Las instantáneas de tokens obsoletas se ocultan hasta que Gateway informe un uso nuevo nuevamente.

  </Accordion>
  <Accordion title="Modo de conversación (tiempo real del navegador)">
    El modo de conversación utiliza un proveedor de voz en tiempo real registrado. Configure OpenAI con `talk.realtime.provider: "openai"` más `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY` o un perfil de OAuth `openai-codex`; configure Google con `talk.realtime.provider: "google"` más `talk.realtime.providers.google.apiKey`. Para modelos en tiempo real de GPT alojados, OpenClaw prefiere el perfil de OAuth `openai-codex` antes que `OPENAI_API_KEY`; una `apiKey` explícita de tiempo real de OpenAI sigue siendo la opción avanzada de anulación. El navegador nunca recibe una clave de API de proveedor estándar. OpenAI recibe un secreto de cliente de Realtime efímero para WebRTC. Google Live recibe un token de autenticación de API Live restringido de un solo uso para una sesión WebSocket del navegador, con instrucciones y declaraciones de herramientas bloqueadas en el token por el Gateway. Los proveedores que solo exponen un puente de tiempo real de backend se ejecutan a través del transporte de retransmisión del Gateway, por lo que las credenciales y los sockets del proveedor permanecen en el lado del servidor mientras el audio del navegador se mueve a través de RPC autenticadas del Gateway. El mensaje de la sesión de Realtime lo ensambla el Gateway; `talk.client.create` no acepta anulaciones de instrucciones proporcionadas por quien llama.

    El compositor de Chat incluye un botón de opciones de conversación junto al botón de inicio/parada de conversación. Las opciones se aplican a la siguiente sesión de conversación y pueden anular el proveedor, el transporte, el modelo, la voz, el esfuerzo de razonamiento, el umbral VAD, la duración del silencio y el relleno de prefijo. Cuando una opción está en blanco, el Gateway utiliza los valores predeterminados configurados si están disponibles o el valor predeterminado del proveedor. Seleccionar la retransmisión del Gateway fuerza la ruta de retransmisión del backend; seleccionar WebRTC mantiene la sesión propiedad del cliente y falla en lugar de volver silenciosamente a la retransmisión si el proveedor no puede crear una sesión del navegador.

    En el compositor de Chat, el control de conversación es el botón de olas junto al botón de dictado por micrófono. Cuando comienza la conversación, la fila de estado del compositor muestra `Connecting Talk...`, luego `Talk live` mientras el audio está conectado, o `Asking OpenClaw...` mientras una llamada a herramienta en tiempo real está consultando el modelo más grande configurado a través de `talk.client.toolCall`.

    Prueba en vivo del mantenedor: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifica el puente WebSocket del backend de OpenAI, el intercambio SDP WebRTC del navegador de OpenAI, la configuración WebSocket del navegador con token restringido de Google Live y el adaptador del navegador de retransmisión del Gateway con medios de micrófono falsos. El comando solo imprime el estado del proveedor y no registra secretos.

  </Accordion>
  <Accordion title="Detener y abortar">
    - Haga clic en **Stop** (llama a `chat.abort`).
    - Mientras una ejecución está activa, las preguntas de seguimiento normales se ponen en cola. Haga clic en **Steer** en un mensaje en cola para inyectar ese seguimiento en el turno en ejecución.
    - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda.
    - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas para esa sesión.

  </Accordion>
  <Accordion title="Retención parcial de aborto">
    - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario.
    - Gateway persiste el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida almacenada en el búfer.
    - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de transcripciones puedan distinguir los parciales de aborto de la salida de finalización normal.

  </Accordion>
</AccordionGroup>

## Instalación de PWA y Web Push

La Control UI incluye un `manifest.webmanifest` y un service worker, por lo que los navegadores modernos pueden instalarlo como una PWA independiente. Web Push permite que Gateway active la PWA instalada con notificaciones incluso cuando la pestaña o la ventana del navegador no están abiertas.

Si la página muestra **Protocol mismatch** justo después de una actualización de OpenClaw, primero vuelva a abrir el panel con `openclaw dashboard` y actualice forzosamente la página. Si aún falla, borre los datos del sitio para el origen del panel o pruebe en una ventana privada del navegador; una pestaña antigua o la caché del service worker del navegador puede mantener ejecutándose un paquete de Control UI anterior a la actualización contra el Gateway más nuevo.

| Superficie                                                        | Lo que hace                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                                  | Manifiesto de PWA. Los navegadores ofrecen "Install app" una vez que es accesible.    |
| `ui/public/sw.js`                                                 | Service worker que maneja eventos `push` y clics en notificaciones.                   |
| `push/vapid-keys.json` (bajo el directorio de estado de OpenClaw) | Par de claves VAPID autogenerado utilizado para firmar las cargas útiles de Web Push. |
| `push/web-push-subscriptions.json`                                | Puntos finales de suscripción del navegador persistidos.                              |

Invalida el par de claves VAPID a través de variables de entorno en el proceso de Gateway cuando desees fijar las claves (para implementaciones de múltiples hosts, rotación de secretos o pruebas):

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (el valor predeterminado es `https://openclaw.ai`)

El Control UI utiliza estos métodos de Gateway con alcance restringido para registrar y probar las suscripciones del navegador:

- `push.web.vapidPublicKey` — obtiene la clave pública VAPID activa.
- `push.web.subscribe` — registra un `endpoint` más `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — elimina un endpoint registrado.
- `push.web.test` — envía una notificación de prueba a la suscripción del llamador.

<Note>Web Push es independiente de la ruta de relé APNS de iOS (consulte [Configuration](/es/gateway/configuration) para push respaldado por relé) y del método `push.test` existente, que tienen como objetivo el emparejamiento móvil nativo.</Note>

## Incrustaciones alojadas

Los mensajes del Asistente pueden renderizar contenido web alojado en línea con el shortcode `[embed ...]`. La política de espacio aislado del iframe está controlada por `gateway.controlUi.embedSandbox`:

<Tabs>
  <Tab title="strict">Deshabilita la ejecución de scripts dentro de las incrustaciones alojadas.</Tab>
  <Tab title="scripts (default)">Permite incrustaciones interactivas manteniendo el aislamiento de origen; este es el valor predeterminado y generalmente es suficiente para juegos/widgets de navegador autónomos.</Tab>
  <Tab title="trusted">Agrega `allow-same-origin` además de `allow-scripts` para documentos del mismo sitio que intencionalmente necesitan privilegios más fuertes.</Tab>
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

<Warning>Use `trusted` solo cuando el documento incrustado realmente necesite comportamiento del mismo origen. Para la mayoría de los juegos y lienzos interactivos generados por agentes, `scripts` es la opción más segura.</Warning>

Las URL de integración externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si desea intencionalmente que `[embed url="https://..."]` cargue páginas de terceros, establezca `gateway.controlUi.allowExternalEmbedUrls: true`.

## Ancho del mensaje de chat

Los mensajes de chat agrupados utilizan un ancho máximo predeterminado legible. Las implementaciones en monitores anchos pueden anularlo sin modificar el CSS empaquetado estableciendo `gateway.controlUi.chatMessageMaxWidth`:

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

El valor se valida antes de llegar al navegador. Los valores admitidos incluyen longitudes y porcentajes simples como `960px` o `82%`, además de expresiones de ancho `min(...)`, `max(...)`, `clamp(...)`, `calc(...)` y `fit-content(...)` restringidas.

## Acceso a Tailnet (recomendado)

<Tabs>
  <Tab title="Tailscale Serve integrado (preferido)">
    Mantén el Gateway en loopback y deja que Tailscale Sirve actúe como proxy con HTTPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Abre:

    - `https://<magicdns>/` (o tu `gateway.controlUi.basePath` configurado)

    De forma predeterminada, las solicitudes de Control UI/WebSocket Sirve pueden autenticarse a través de los encabezados de identidad de Tailscale (`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw verifica la identidad resolviendo la dirección `x-forwarded-for` con `tailscale whois` y coincidiéndola con el encabezado, y solo las acepta cuando la solicitud llega al loopback con los encabezados `x-forwarded-*` de Tailscale. Para las sesiones del operador de Control UI con identidad de dispositivo del navegador, esta ruta Sirve verificada también omite el recorrido de emparejamiento de dispositivos; los navegadores sin dispositivo y las conexiones de rol de nodo siguen los controles de dispositivo normales. Establece `gateway.auth.allowTailscale: false` si deseas requerir credenciales explícitas de secreto compartido incluso para el tráfico de Serve. Luego usa `gateway.auth.mode: "token"` o `"password"`.

    Para esa ruta de identidad asíncrona de Serve, los intentos de autenticación fallidos para la misma dirección IP de cliente y alcance de autenticación se serializan antes de las escrituras de limitación de velocidad. Por lo tanto, los reintentos incorrectos simultáneos del mismo navegador pueden mostrar `retry later` en la segunda solicitud en lugar de dos discordancias simples compitiendo en paralelo.

    <Warning>
    La autenticación de Serve sin token asume que el host de la puerta de enlace es confiable. Si código local no confiable puede ejecutarse en ese host, requiere autenticación de token/contraseña.
    </Warning>

  </Tab>
  <Tab title="Vincular a tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Luego abre:

    - `http://<tailscale-ip>:18789/` (o tu `gateway.controlUi.basePath` configurado)

    Pega el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como `connect.params.auth.token` o `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP no seguro

Si abre el panel de control a través de HTTP sin cifrar (`http://<lan-ip>` o `http://<tailscale-ip>`), el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada, OpenClaw **bloquea** las conexiones de la interfaz de usuario de control (Control UI) sin identidad del dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP inseguro solo en localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación exitosa del operador de la interfaz de usuario de control a través de `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de emergencia

**Solución recomendada:** use HTTPS (Tailscale Serve) o abra la interfaz de usuario localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

<AccordionGroup>
  <Accordion title="Comportamiento del interruptor de autenticación insegura">
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

    - Permite que las sesiones de la interfaz de usuario de control en localhost continúen sin identidad del dispositivo en contextos HTTP no seguros.
    - No omite las comprobaciones de emparejamiento.
    - No relaja los requisitos de identidad del dispositivo remota (no localhost).

  </Accordion>
  <Accordion title="Solo de emergencia">
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
    `dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad del dispositivo de la interfaz de usuario de control y es una degradación grave de la seguridad. Reviértalo rápidamente después de su uso en emergencias.
    </Warning>

  </Accordion>
  <Accordion title="Nota sobre proxy de confianza">
    - La autenticación exitosa de proxy de confianza puede admitir sesiones de la interfaz de usuario de control **del operador** sin identidad del dispositivo.
    - Esto **no** se extiende a las sesiones de la interfaz de usuario de control con rol de nodo.
    - Los proxies inversos de bucle invertido en el mismo host aún no satisfacen la autenticación de proxy de confianza; consulte [Trusted proxy auth](/es/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Política de seguridad de contenido

El Control UI incluye una política `img-src` estricta: solo se permiten recursos del **mismo origen**, URLs `data:` y URLs `blob:` generadas localmente. Las `http(s)` remotas y las URLs de imagen relativas al protocolo son rechazadas por el navegador y no realizan solicitudes de red.

Lo que esto significa en la práctica:

- Los avatares e imágenes servidos bajo rutas relativas (por ejemplo `/avatars/<id>`) aún se renderizan, incluyendo las rutas de avatar autenticadas que la interfaz de usuario obtiene y convierte en URLs `blob:` locales.
- Las URLs `data:image/...` en línea aún se renderizan (útil para cargas útiles dentro del protocolo).
- Las URLs `blob:` locales creadas por el Control UI aún se renderizan.
- Las URLs de avatar remotas emitidas por los metadatos del canal se eliminan en los asistentes de avatar del Control UI y se reemplazan con el logotipo/distintivo incorporado, por lo que un canal comprometido o malicioso no puede forzar obtenciones de imágenes remotas arbitrarias desde el navegador de un operador.

No necesita cambiar nada para obtener este comportamiento: siempre está activo y no es configurable.

## Autenticación de ruta de avatar

Cuando la autenticación de la puerta de enlace está configurada, el punto final de avatar del Control UI requiere el mismo token de puerta de enlace que el resto de la API:

- `GET /avatar/<agentId>` devuelve la imagen del avatar solo a los autores de la llamada autenticados. `GET /avatar/<agentId>?meta=1` devuelve los metadatos del avatar bajo la misma regla.
- Las solicitudes no autenticadas a cualquiera de las dos rutas se rechazan (coincidiendo con la ruta hermana assistant-media). Esto evita que la ruta de avatar filtre la identidad del agente en hosts que de otro modo estarían protegidos.
- El propio Control UI reenvía el token de puerta de enlace como un encabezado de tipo bearer al obtener avatares y utiliza URLs de blob autenticadas para que la imagen aún se represente en los paneles de control.

Si deshabilita la autenticación de la puerta de enlace (no recomendado en hosts compartidos), la ruta de avatar también se vuelve no autenticada, en consonancia con el resto de la puerta de enlace.

## Autenticación de ruta de medios del asistente

Cuando la autenticación de la puerta de enlace está configurada, las vistas previas de medios locales del asistente utilizan una ruta de dos pasos:

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` requiere la autenticación normal del operador del Control UI. El navegador envía el token de puerta de enlace como un encabezado de tipo bearer al verificar la disponibilidad.
- Las respuestas de metadatos exitosas incluyen un `mediaTicket` de corta duración limitado a esa ruta de origen exacta.
- Las URL de imagen, audio, video y documentos renderizados por el navegador usan un `mediaTicket=<ticket>` en lugar del token o contraseña activa de la puerta de enlace. El ticket caduca rápidamente y no puede autorizar una fuente diferente.

Esto mantiene la renderización de medios normal compatible con los elementos de medios nativos del navegador sin poner credenciales reutilizables de la puerta de enlace en las URL de medios visibles.

## Compilación de la interfaz de usuario

La puerta de enlace sirve archivos estáticos desde `dist/control-ui`. Compílelos con:

```bash
pnpm ui:build
```

Base absoluta opcional (cuando desea URL de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo separado):

```bash
pnpm ui:dev
```

Luego apunte la interfaz de usuario a su URL WS de la puerta de enlace (por ejemplo, `ws://127.0.0.1:18789`).

## Página en blanco de la interfaz de control

Si el navegador carga un panel en blanco y DevTools no muestra ningún error útil, una extensión o un script de contenido temprano puede haber impedido que se evaluara la aplicación del módulo JavaScript. La página estática incluye un panel de recuperación HTML simple que aparece cuando `<openclaw-app>` no está registrado después del inicio.

Use la acción **Intentar de nuevo** del panel después de cambiar el entorno del navegador, o recargue manualmente después de estas comprobaciones:

- Desactive las extensiones que se inyectan en todas las páginas, especialmente las extensiones con scripts de contenido `<all_urls>`.
- Pruebe una ventana privada, un perfil de navegador limpio u otro navegador.
- Mantenga la puerta de enlace en ejecución y verifique la misma URL del panel después del cambio del navegador.

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La interfaz de control son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando desea el servidor de desarrollo de Vite localmente pero la puerta de enlace se ejecuta en otro lugar.

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

    Autenticación única opcional (si es necesario):

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notas">
    - `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
    - Si pasa un endpoint completo `ws://` o `wss://` a través de `gatewayUrl`, codifique el valor `gatewayUrl` en URL para que el navegador analice correctamente la cadena de consulta.
    - `token` debe pasarse a través del fragmento de URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita fugas en los registros de solicitudes y en el Referer. Los parámetros de consulta `?token=` heredados todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
    - `password` se mantiene solo en memoria.
    - Cuando `gatewayUrl` está configurado, la interfaz de usuario no recurre a las credenciales de configuración o del entorno. Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
    - Use `wss://` cuando el Gateway esté detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics (clickjacking).
    - Las implementaciones públicas de Control UI que no sean de loopback deben configurar `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Las cargas privadas del mismo origen en LAN/Tailnet desde loopback, RFC1918/link-local, `.local`, `.ts.net`, o hosts Tailscale CGNAT se aceptan sin habilitar la alternativa de encabezado Host.
    - El inicio del Gateway puede propagar orígenes locales como `http://localhost:<port>` y `http://127.0.0.1:<port>` desde el enlace y puerto efectivo en tiempo de ejecución, pero los orígenes del navegador remoto aún necesitan entradas explícitas.
    - No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales estrictamente controladas. Significa permitir cualquier origen de navegador, no "coincidir con el host que estoy usando".
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo alternativo de origen del encabezado Host, pero es un modo de seguridad peligroso.

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

Detalles de configuración de acceso remoto: [Acceso remoto](/es/gateway/remote).

## Relacionado

- [Panel de control](/es/web/dashboard) — panel de control de la puerta de enlace
- [Comprobaciones de estado](/es/gateway/health) — monitorización del estado de la puerta de enlace
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
