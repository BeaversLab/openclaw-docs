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

Una vez aprobado, el dispositivo se recuerda y no requerirá reaprobación a menos que lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte [Devices CLI](/es/cli/devices) para la rotación y revocación de tokens.

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

El panel Apariencia mantiene los temas integrados Claw, Knot y Dash, además de una ranura de importación tweakcn local en el navegador. Para importar un tema, abra el [editor tweakcn](https://tweakcn.com/editor/theme), elija o cree un tema, haga clic en **Share** y pegue el enlace del tema copiado en Apariencia. El importador también acepta URLs de registro `https://tweakcn.com/r/themes/<id>`, URLs de editor como `https://tweakcn.com/editor/theme?theme=amethyst-haze`, rutas relativas `/themes/<id>`, ID de temas en bruto y nombres de temas predeterminados como `amethyst-haze`.

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
    - MCP tiene una página de configuración dedicada para servidores configurados, habilitación, resúmenes OAuth/filtro/paralelos, comandos comunes de operador y el editor de configuración con ámbito `mcp`.
    - Aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa.
    - Las escrituras incluyen una protección de hash base para evitar sobrescribir ediciones simultáneas.
    - Las escrituras (`config.set`/`config.apply`/`config.patch`) realizan una verificación previa de la resolución activa de SecretRef para las referencias en la carga útil de configuración enviada; las referencias activas enviadas sin resolver se rechazan antes de la escritura.
    - Los guardados del formulario descartan los marcadores de posición redactados obsoletos que no se pueden restaurar desde la configuración guardada, conservando los valores redactados que todavía se asignan a secretos guardados.
    - Representación de esquema + formulario (`config.schema` / `config.schema.lookup`, incluyendo campo `title` / `description`, sugerencias de IU coincidentes, resúmenes de hijos inmediatos, metadatos de documentos en nodos de objeto/comodín/matriz/composición anidados, más esquemas de complemento + canal cuando esté disponible); el editor JSON sin procesar solo está disponible cuando la instantánea tiene un viaje de ida y vuelta seguro sin procesar.
    - Si una instantánea no puede realizar un viaje de ida y vuelta seguro del texto sin procesar, la interfaz de usuario de control fuerza el modo Formulario y deshabilita el modo Sin procesar para esa instantánea.
    - "Restablecer a lo guardado" del editor JSON sin procesar conserva la forma original sin procesar (formato, comentarios, diseño `$include`) en lugar de volver a representar una instantánea aplanada, por lo que las ediciones externas sobreviven a un restablecimiento cuando la instantánea puede realizar un viaje de ida y vuelta seguro.
    - Los valores de objeto SecretRef estructurados se representan como de solo lectura en las entradas de texto del formulario para evitar la corrupción accidental de objeto a cadena.

  </Accordion>
  <Accordion title="Depuración, registros, actualización">
    - Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`).
    - El registro de eventos incluye los tiempos de actualización/RPC de la interfaz de control, los tiempos de renderizado lentos del chat/configuración y las entradas de capacidad de respuesta del navegador para marcos de animación largos o tareas largas cuando el navegador expone esos tipos de entrada de PerformanceObserver.
    - Registros: seguimiento en vivo de los registros de archivos de la puerta de enlace con filtro/exportación (`logs.tail`).
    - Actualización: ejecutar una actualización de paquete/git + reiniciar (`update.run`) con un informe de reinicio, y luego sondear `update.status` después de reconectar para verificar la versión de la puerta de enlace en ejecución.

  </Accordion>
  <Accordion title="Notas del panel de trabajos Cron">
    - Para trabajos aislados, la entrega predeterminada es anunciar resumen. Puedes cambiar a ninguno si deseas ejecuciones solo internas.
    - Los campos de canal/destino aparecen cuando se selecciona anunciar.
    - El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida.
    - Para trabajos de sesión principal, están disponibles los modos de entrega webhook y ninguno.
    - Los controles de edición avanzados incluyen eliminar después de ejecutar, limpiar la anulación del agente, opciones exactas/dispersas de cron, anulaciones de modelo/pensamiento del agente y interruptores de entrega de mejor esfuerzo.
    - La validación del formulario es en línea con errores a nivel de campo; los valores no válidos deshabilitan el botón de guardar hasta que se corrijan.
    - Establezca `cron.webhookToken` para enviar un token portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación.
    - Respaldo obsoleto: ejecute `openclaw doctor --fix` para migrar los trabajos heredados almacenados con `notify: true` de `cron.webhook` a webhook por trabajo explícito o entrega de finalización.

  </Accordion>
</AccordionGroup>

## Página MCP

La página dedicada de MCP es una vista de operador para los servidores MCP gestionados por OpenClaw bajo `mcp.servers`. No inicia los transportes MCP por sí misma; úsela para inspeccionar y editar la configuración guardada, y luego use `openclaw mcp doctor --probe` cuando necesite una prueba en vivo del servidor.

Flujo de trabajo típico:

1. Abra **MCP** desde la barra lateral.
2. Revise las tarjetas de resumen para ver el total de servidores, los habilitados, OAuth y los filtrados.
3. Revise cada fila de servidor para ver el transporte, el estado de habilitación, la autenticación, los filtros, los tiempos de espera y los consejos de comandos.
4. Alterne la habilitación cuando un servidor deba permanecer configurado pero salir del descubrimiento en tiempo de ejecución.
5. Edite la sección de configuración `mcp` con ámbito para las definiciones del servidor, los encabezados, las rutas TLS/mTLS, los metadatos de OAuth, los filtros de herramientas y los metadatos de proyección de Codex.
6. Use **Guardar** para una escritura de configuración, o **Guardar y publicar** cuando la Gateway en ejecución deba aplicar la configuración cambiada.
7. Ejecute `openclaw mcp status --verbose`, `openclaw mcp doctor --probe` o `openclaw mcp reload` desde una terminal cuando el proceso editado necesite diagnósticos estáticos, prueba en vivo o eliminación del tiempo de ejecución en caché.

La página redacta los valores tipo URL que contienen credenciales antes de renderizar y entrecomilla los nombres de los servidores en los fragmentos de código para que los comandos copiados sigan funcionando con espacios o metacaracteres de shell. La referencia completa de la CLI y la configuración se encuentra en [MCP](/es/cli/mcp).

## Pestaña Actividad

La pestaña Actividad es un observador efímero local del navegador para la actividad de herramientas en vivo. Se deriva del mismo flujo de eventos de `session.tool` de Gateway / herramientas que impulsa las tarjetas de herramientas de Chat; no añade otra familia de eventos de Gateway, punto final, almacén de actividades duradero, fuente de métricas o flujo de observador externo.

Las entradas de actividad mantienen solo resúmenes saneados y vistas previas de salida redactadas y truncadas. Los valores de los argumentos de las herramientas no se almacenan en el estado de Actividad; la interfaz de usuario muestra que los argumentos están ocultos y registra solo el conteo de campos de argumentos. La lista en memoria sigue la pestaña actual del navegador, sobrevive a la navegación dentro de la Interfaz de Control y se restablece al recargar la página, cambiar de sesión o al hacer clic en **Borrar**.

## Comportamiento del Chat

<AccordionGroup>
  <Accordion title="Enviar y semántica del historial">
    - `chat.send` es **sin bloqueo**: reconoce inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
    - Las cargas del chat aceptan imágenes más archivos que no sean de video. Las imágenes mantienen la ruta nativa de la imagen; otros archivos se almacenan como medios gestionados y se muestran en el historial como enlaces de adjuntos.
    - Reenviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta y `{ status: "ok" }` después de completarse.
    - Las respuestas de `chat.history` tienen límites de tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
    - Cuando un mensaje visible del asistente se truncó en `chat.history`, el lector lateral puede obtener la entrada completa de la transcripción normalizada para visualización bajo demanda a través de `chat.message.get` mediante `sessionKey`, `agentId` activa cuando es necesario, y la transcripción `messageId`. Si Gateway aún no puede devolver más, el lector muestra un estado explícito de no disponibilidad en lugar de repetir silenciosamente la vista previa truncada.
    - Las imágenes generadas por el asistente se persisten como referencias de medios gestionados y se devuelven a través de URL de medios de Gateway autenticadas, por lo que las recargas no dependen de que las cargas de imágenes base64 sin procesar permanezcan en la respuesta del historial del chat.
    - Al renderizar `chat.history`, el Control UI elimina las etiquetas de directivas en línea solo de visualización del texto visible del asistente (por ejemplo, `[[reply_to_*]]` y `[[audio_as_voice]]`), cargas XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y tokens de control del modelo ASCII/ancho completo filtrados, y omite entradas del asistente cuyo texto visible completo sea solo el token silencioso exacto `NO_REPLY` / `no_reply` o el token de reconocimiento de latido `HEARTBEAT_OK`.
    - Durante un envío activo y la actualización final del historial, la vista del chat mantiene visibles los mensajes optimistas locales de usuario/assistente si `chat.history` devuelve brevemente una instantánea anterior; la transcripción canónica reemplaza esos mensajes locales una vez que el historial de Gateway se actualiza.
    - Los eventos en vivo `chat` son el estado de entrega, mientras que `chat.history` se reconstruye desde la transcripción duradera de la sesión. Después de los eventos finales de herramientas, el Control UI recarga el historial y fusiona solo una pequeña cola optimista; el límite de la transcripción está documentado en [WebChat](/es/web/webchat).
    - `chat.inject` agrega una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz (sin ejecución del agente, sin entrega al canal).
    - El encabezado del chat muestra el filtro de agente antes del selector de sesión, y el selector de sesión está limitado por el agente seleccionado. Cambiar de agente muestra solo las sesiones vinculadas a ese agente y vuelve a la sesión principal de ese agente cuando aún no tiene sesiones de panel guardadas.
    - En anchos de escritorio, los controles del chat permanecen en una fila compacta y se colapsan al desplazarse hacia abajo por la transcripción; al desplazarse hacia arriba, volver al principio o llegar al final, se restauran los controles.
    - Los mensajes de texto duplicados consecutivos se representan como una sola burbuja con una insignia de recuento. Los mensajes que llevan imágenes, adjuntos, salida de herramientas o vistas previas de lienzo se dejan sin colapsar.
    - Los selectores de modelo y pensamiento del encabezado del chat aplican parches a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
    - Si envía un mensaje mientras un cambio en el selector de modelo para la misma sesión aún se está guardando, el compositor espera ese parche de la sesión antes de llamar a `chat.send` para que el envío use el modelo seleccionado.
    - Escribir `/new` en el Control UI crea y cambia a la misma sesión de panel nuevo que Nuevo chat, excepto cuando `session.dmScope: "main"` está configurado y el padre actual es la sesión principal del agente; en ese caso, restablece la sesión principal en su lugar. Escribir `/reset` mantiene el restablecimiento explícito en su lugar de Gateway para la sesión actual.
    - El selector de modelo de chat solicita la vista de modelo configurada de Gateway. Si `agents.defaults.models` está presente, esa lista de permitidos impulsa el selector, incluyendo entradas `provider/*` que mantienen los catálogos con ámbito de proveedor dinámicos. De lo contrario, el selector muestra entradas explícitas `models.providers.*.models` más proveedores con autenticación utilizable. El catálogo completo permanece disponible a través de la depuración RPC `models.list` con `view: "all"`.
    - Cuando los informes de uso de sesión frescos de Gateway incluyen tokens de contexto actuales, el área del compositor del chat muestra un indicador compacto de uso de contexto. Cambia al estilo de advertencia bajo alta presión de contexto y, en los niveles de compactación recomendados, muestra un botón compacto que ejecuta la ruta de compactación normal de la sesión. Las instantáneas de tokens obsoletas se ocultan hasta que Gateway informe el uso fresco nuevamente.

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    El modo Talk utiliza un proveedor de voz en tiempo real registrado. Configure OpenAI con `talk.realtime.provider: "openai"` más `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY` o un perfil de OAuth `openai`; configure Google con `talk.realtime.provider: "google"` más `talk.realtime.providers.google.apiKey`. Para los modelos en tiempo real de GPT alojados, OpenClaw prefiere el perfil de OAuth `openai` antes que `OPENAI_API_KEY`; una `apiKey` explícita de tiempo real de OpenAI sigue siendo la sustitución avanzada. El navegador nunca recibe una clave de API estándar del proveedor. OpenAI recibe un secreto de cliente efímero de Realtime para WebRTC. Google Live recibe un token de autenticación de API Live restringido de un solo uso para una sesión WebSocket del navegador, con instrucciones y declaraciones de herramientas bloqueadas en el token por el Gateway. Los proveedores que solo exponen un puente de tiempo real de backend se ejecutan a través del transporte de retransmisión del Gateway, por lo que las credenciales y los sockets del proveedor permanecen del lado del servidor mientras el audio del navegador se mueve a través de las RPC autenticadas del Gateway. El mensaje de la sesión Realtime es ensamblado por el Gateway; `talk.client.create` no acepta anulaciones de instrucciones proporcionadas por el llamador.

    El editor de Chat incluye un botón de opciones de Talk junto al botón de inicio/parada de Talk. Las opciones se aplican a la siguiente sesión de Talk y pueden anular el proveedor, el transporte, el modelo, la voz, el esfuerzo de razonamiento, el umbral de VAD, la duración del silencio y el relleno de prefijo. Cuando una opción está en blanco, el Gateway utiliza los valores predeterminados configurados si están disponibles o el valor predeterminado del proveedor. Seleccionar la retransmisión del Gateway fuerza la ruta de retransmisión del backend; seleccionar WebRTC mantiene la sesión propiedad del cliente y falla en lugar de volver silenciosamente a la retransmisión si el proveedor no puede crear una sesión del navegador.

    En el editor de Chat, el control de Talk es el botón de ondas junto al botón de dictado del micrófono. Cuando Talk se inicia, la fila de estado del editor muestra `Connecting Talk...`, luego `Talk live` mientras el audio está conectado, o `Asking OpenClaw...` mientras una llamada a herramienta en tiempo real consulta el modelo más grande configurado a través de `talk.client.toolCall`.

    Prueba en vivo del mantenedor: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifica el puente WebSocket del backend de OpenAI, el intercambio SDP WebRTC del navegador de OpenAI, la configuración WebSocket del navegador con token restringido de Google Live y el adaptador del navegador de retransmisión del Gateway con medios de micrófono falsos. El comando imprime solo el estado del proveedor y no registra secretos.

  </Accordion>
  <Accordion title="Detener y abortar">
    - Haz clic en **Stop** (llama a `chat.abort`).
    - Mientras una ejecución está activa, las respuestas de seguimiento normales se ponen en cola. Haz clic en **Steer** en un mensaje en cola para inyectar ese seguimiento en el turno en ejecución.
    - Escribe `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda.
    - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas para esa sesión.

  </Accordion>
  <Accordion title="Retención parcial de abortos">
    - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario.
    - Gateway conserva el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida almacenada en el búfer.
    - Las entradas conservadas incluyen metadatos de aborto para que los consumidores de la transcripción puedan diferenciar los parciales abortados de la salida de finalización normal.

  </Accordion>
</AccordionGroup>

## Instalación de PWA y notificaciones web

La interfaz de usuario de Control incluye un `manifest.webmanifest` y un service worker, por lo que los navegadores modernos pueden instalarlo como una PWA independiente. Web Push permite que Gateway active la PWA instalada con notificaciones incluso cuando la pestaña o la ventana del navegador no está abierta.

Si la página muestra **Protocol mismatch** (discordancia de protocolo) justo después de una actualización de OpenClaw, primero vuelve a abrir el panel con `openclaw dashboard` y actualiza forzosamente la página. Si aún falla, borra los datos del sitio para el origen del panel o prueba en una ventana privada del navegador; una pestaña antigua o la caché del service worker del navegador puede mantener ejecutándose un paquete de la interfaz de usuario de Control preactualizado contra el Gateway más reciente.

| Superficie                                                        | Lo que hace                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                                  | Manifiesto de PWA. Los navegadores ofrecen "Install app" una vez que es accesible.                |
| `ui/public/sw.js`                                                 | Service worker que maneja eventos `push` y clics en notificaciones.                               |
| `push/vapid-keys.json` (bajo el directorio de estado de OpenClaw) | Par de claves VAPID generado automáticamente utilizado para firmar las cargas útiles de Web Push. |
| `push/web-push-subscriptions.json`                                | Puntos finales de suscripción del navegador persistidos.                                          |

Anule el par de claves VAPID a través de variables de entorno en el proceso de Gateway cuando desee fijar las claves (para implementaciones de múltiples hosts, rotación de secretos o pruebas):

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (por defecto es `https://openclaw.ai`)

El Control UI utiliza estos métodos del Gateway con alcance limitado para registrar y probar las suscripciones del navegador:

- `push.web.vapidPublicKey` — obtiene la clave pública VAPID activa.
- `push.web.subscribe` — registra un `endpoint` más `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — elimina un endpoint registrado.
- `push.web.test` — envía una notificación de prueba a la suscripción del autor de la llamada.

<Note>Web Push es independiente de la ruta de retransmisión iOS APNS (consulte [Configuration](/es/gateway/configuration) para push respaldado por retransmisión) y del método `push.test` existente, que tienen como objetivo el emparejamiento móvil nativo.</Note>

## Incrustaciones alojadas

Los mensajes del asistente pueden representar contenido web alojado en línea con el shortcode `[embed ...]`. La política de sandbox del iframe está controlada por `gateway.controlUi.embedSandbox`:

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

<Warning>Use `trusted` solo cuando el documento incrustado realmente necesite un comportamiento del mismo origen. Para la mayoría de los juegos y lienzos interactivos generados por agentes, `scripts` es la opción más segura.</Warning>

Las URL de inserción externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si intencionalmente quieres que `[embed url="https://..."]` cargue páginas de terceros, establece `gateway.controlUi.allowExternalEmbedUrls: true`.

## Ancho del mensaje de chat

Los mensajes de chat agrupados utilizan un ancho máximo predeterminado legible. Las implementaciones en monitores anchos pueden anularlo sin modificar el CSS incluido estableciendo `gateway.controlUi.chatMessageMaxWidth`:

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
  <Tab title="Tailscale Serve integrado (preferido)">
    Mantenga el Gateway en loopback y deje que Tailscale Sirve actúe como proxy con HTTPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Abra:

    - `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

    De forma predeterminada, las solicitudes de Control UI/WebSocket Serve pueden autenticarse mediante encabezados de identidad de Tailscale (`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw verifica la identidad resolviendo la dirección `x-forwarded-for` con `tailscale whois` y coincidiéndola con el encabezado, y solo acepta estas cuando la solicitud llega al loopback con los encabezados `x-forwarded-*` de Tailscale. Para las sesiones del operador de Control UI con identidad de dispositivo del navegador, esta ruta verificada de Serve también omite el viaje de ida y vuelta del emparejamiento de dispositivos; los navegadores sin dispositivo y las conexiones de rol de nodo todavía siguen las verificaciones normales de dispositivos. Establezca `gateway.auth.allowTailscale: false` si desea requerir credenciales explícitas de secreto compartido incluso para el tráfico de Serve. Luego use `gateway.auth.mode: "token"` o `"password"`.

    Para esa ruta de identidad de Serve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente y ámbito de autenticación se serializan antes de las escrituras de límite de tasa. Los reintentos incorrectos simultáneos del mismo navegador, por lo tanto, pueden mostrar `retry later` en la segunda solicitud en lugar de dos discordancias simples compitiendo en paralelo.

    <Warning>
    La autenticación Serve sin token asume que el host de la pasarela es confiable. Si código local no confiable puede ejecutarse en ese host, requiera autenticación de token/contraseña.
    </Warning>

  </Tab>
  <Tab title="Vincular a tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Luego abra:

    - `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

    Pegue el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como `connect.params.auth.token` o `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP no seguro

Si abre el panel de control a través de HTTP simple (`http://<lan-ip>` o `http://<tailscale-ip>`), el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada, OpenClaw **bloquea** las conexiones de la interfaz de usuario de control (Control UI) sin identidad del dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP inseguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación exitosa de operador en la interfaz de usuario de control a través de `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de emergencia (break-glass)

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

    - Permite que las sesiones de la interfaz de usuario de control en continúen sin identidad del dispositivo en contextos HTTP no seguros.
    - No omite las comprobaciones de emparejamiento.
    - No relaja los requisitos de identidad del dispositivo remota (no localhost).

  </Accordion>
  <Accordion title="Solo emergencia (break-glass)">
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
    `dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad del dispositivo de la interfaz de usuario de control y es una degradación grave de la seguridad. Reviértalo rápidamente después del uso de emergencia.
    </Warning>

  </Accordion>
  <Accordion title="Nota sobre proxy de confianza">
    - La autenticación exitosa de proxy de confianza puede admitir sesiones de la interfaz de usuario de control de **operador** sin identidad del dispositivo.
    - Esto **no** se extiende a las sesiones de la interfaz de usuario de control de rol de nodo.
    - Los proxies inversos de bucle invertido del mismo host aún no satisfacen la autenticación de proxy de confianza; consulte [Trusted proxy auth](/es/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Política de seguridad de contenido

La Control UI incluye una política `img-src` estricta: solo se permiten recursos del **mismo origen**, URLs `data:` y URLs `blob:` generadas localmente. Las URLs `http(s)` remotas y las URLs de imágenes relativas al protocolo son rechazadas por el navegador y no realizan solicitudes de red.

Lo que esto significa en la práctica:

- Los avatares e imágenes servidos bajo rutas relativas (por ejemplo, `/avatars/<id>`) aún se representan, incluidas las rutas de avatar autenticadas que la interfaz de usuario obtiene y convierte en URLs `blob:` locales.
- Las URLs `data:image/...` en línea aún se representan (útil para cargas útiles dentro del protocolo).
- Las URLs `blob:` locales creadas por la Control UI aún se representan.
- Las URLs de avatar remoto emitidas por los metadatos del canal se eliminan en los asistentes de avatar de la Control UI y se reemplazan con el logotipo/insignia integrado, por lo que un canal comprometido o malicioso no puede forzar recuperaciones de imágenes remotas arbitrarias desde un navegador del operador.

No necesita cambiar nada para obtener este comportamiento: siempre está activo y no es configurable.

## Autenticación de ruta de avatar

Cuando se configura la autenticación de la puerta de enlace (gateway auth), el punto final de avatar de la Control UI requiere el mismo token de puerta de enlace que el resto de la API:

- `GET /avatar/<agentId>` devuelve la imagen del avatar solo a las personas que llaman autenticadas. `GET /avatar/<agentId>?meta=1` devuelve los metadatos del avatar bajo la misma regla.
- Las solicitudes no autenticadas a cualquiera de las dos rutas se rechazan (coincidiendo con la ruta hermana assistant-media). Esto evita que la ruta de avatar filtre la identidad del agente en hosts que están protegidos por otros medios.
- La propia Control UI reenvía el token de puerta de enlace como un encabezado de tipo bearer al obtener avatares y utiliza URLs de blob autenticadas para que la imagen aún se represente en los paneles de control.

Si deshabilita la autenticación de la puerta de enlace (no recomendado en hosts compartidos), la ruta de avatar también se convierte en no autenticada, en consonancia con el resto de la puerta de enlace.

## Autenticación de ruta de medios del asistente

Cuando se configura la autenticación de la puerta de enlace, las vistas previas de medios locales del asistente utilizan una ruta de dos pasos:

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` requiere la autenticación normal del operador de la Control UI. El navegador envía el token de puerta de enlace como un encabezado de tipo bearer al verificar la disponibilidad.
- Las respuestas de metadatos exitosas incluyen un `mediaTicket` de corta duración limitado a esa ruta de origen exacta.
- Las URL de imagen, audio, video y documentos renderizados por el navegador usan `mediaTicket=<ticket>` en lugar del token de puerta de enlace activo o la contraseña. El ticket caduca rápidamente y no puede autorizar una fuente diferente.

Esto mantiene el renderizado de medios normal compatible con los elementos de medios nativos del navegador sin poner credenciales reutilizables de la puerta de enlace en URL de medios visibles.

## Compilar la interfaz de usuario

La puerta de enlace sirve archivos estáticos desde `dist/control-ui`. Compílalos con:

```bash
pnpm ui:build
```

Base absoluta opcional (cuando quieres URL de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para desarrollo local (servidor de desarrollo separado):

```bash
pnpm ui:dev
```

Luego apunta la interfaz de usuario a tu URL de WS de la puerta de enlace (por ejemplo, `ws://127.0.0.1:18789`).

## Página de Control UI en blanco

Si el navegador carga un panel en blanco y DevTools no muestra ningún error útil, una extensión o un script de contenido temprano puede haber impedido que la aplicación del módulo JavaScript se evaluara. La página estática incluye un panel de recuperación HTML simple que aparece cuando `<openclaw-app>` no está registrado después del inicio.

Usa la acción **Try again** del panel después de cambiar el entorno del navegador, o recarga manualmente después de estas comprobaciones:

- Desactiva las extensiones que se inyectan en todas las páginas, especialmente las extensiones con scripts de contenido `<all_urls>`.
- Prueba una ventana privada, un perfil de navegador limpio u otro navegador.
- Mantén la puerta de enlace en ejecución y verifica la misma URL del panel después del cambio del navegador.

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La interfaz de usuario de Control son archivos estáticos; el objetivo de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando deseas el servidor de desarrollo de Vite localmente pero la puerta de enlace se ejecuta en otro lugar.

<Steps>
  <Step title="Inicia el servidor de desarrollo de la UI">
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
    - Si pasa un endpoint completo `ws://` o `wss://` a través de `gatewayUrl`, codifique en URL el valor `gatewayUrl` para que el navegador analice la cadena de consulta correctamente.
    - `token` debe pasarse a través del fragmento de URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita fugas en los registros de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` aún se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
    - `password` se mantiene solo en memoria.
    - Cuando se establece `gatewayUrl`, la interfaz de usuario no recurre a las credenciales de configuración o del entorno. Proporcione `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
    - Use `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
    - Las implementaciones públicas de Control UI que no sean de loopback deben establecer `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Las cargas privadas del mismo origen LAN/Tailnet desde loopback, RFC1918/link-local, `.local`, `.ts.net` o hosts Tailscale CGNAT se aceptan sin habilitar la alternativa de encabezado Host.
    - El inicio del Gateway puede propagar orígenes locales como `http://localhost:<port>` y `http://127.0.0.1:<port>` desde el enlace y puerto de tiempo de ejecución efectivo, pero los orígenes del navegador remoto aún necesitan entradas explícitas.
    - No use `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales estrictamente controladas. Significa permitir cualquier origen de navegador, no "coincidir con el host que esté usando".
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de alternativa de origen de encabezado Host, pero es un modo de seguridad peligroso.

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

- [Dashboard](/es/web/dashboard) — panel de puerta de enlace
- [Health Checks](/es/gateway/health) — monitoreo de salud de la puerta de enlace
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
