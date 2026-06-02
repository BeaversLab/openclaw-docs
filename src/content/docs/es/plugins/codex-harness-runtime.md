---
summary: "Límites de tiempo de ejecución, ganchos, herramientas, permisos y diagnósticos para el arnés de Codex"
title: "Tiempo de ejecución del arnés de Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

Esta página documenta el contrato de tiempo de ejecución para los turnos del arnés de Codex. Para la configuración y el enrutamiento, comience con [Codex harness](/es/plugins/codex-harness). Para los campos de configuración, consulte [Codex harness reference](/es/plugins/codex-harness-reference).

## Descripción general

El modo Codex no es OpenClaw con una llamada de modelo diferente por debajo. Codex posee más del bucle del modelo nativo, y OpenClaw adapta sus superficies de complementos, herramientas, sesiones y diagnósticos alrededor de ese límite.

OpenClaw aún posee el enrutamiento de canales, los archivos de sesión, la entrega de mensajes visibles, las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y un espejo de transcripción. Codex posee el hilo nativo canónico, el bucle de modelo nativo, la continuación de herramienta nativa y la compactación nativa.

El enrutamiento de avisos sigue el tiempo de ejecución seleccionado, no solo la cadena del proveedor. Un turno nativo de Codex recibe instrucciones de desarrollador del servidor de aplicaciones de Codex, mientras que una ruta de compatibilidad OpenClaw explícita mantiene el aviso del sistema normal de OpenClaw incluso cuando utiliza autenticación o transporte de OpenAI con sabor a Codex.

Codex nativo mantiene las instrucciones base/modelo propiedad de Codex y el comportamiento de documentos del proyecto según la configuración del hilo de Codex activo. OpenClaw inicia y reanuda hilos de Codex nativos con la personalidad integrada de Codex deshabilitada para que los archivos de personalidad del espacio de trabajo y la identidad del agente de OpenClaw sigan siendo autoritativos. Las ejecuciones ligeras de OpenClaw aún conservan su supresión existente de documentos del proyecto. Las instrucciones del desarrollador de OpenClaw cubren las preocupaciones de tiempo de ejecución de OpenClaw, como la entrega a través del canal de origen, herramientas dinámicas de OpenClaw, delegación de ACP, contexto del adaptador y los archivos de perfil del espacio de trabajo del agente activo. Los catálogos de habilidades de OpenClaw y los punteros `MEMORY.md` enrutados a herramientas se proyectan como instrucciones de colaboración para desarrolladores con alcance de turno para Codex nativo. El contenido `BOOTSTRAP.md` activo y la inyección de reserva `MEMORY.md` completa aún utilizan el contexto de referencia de entrada del turno.

## Enlaces de hilos y cambios de modelo

Cuando una sesión de OpenClaw se adjunta a un hilo de Codex existente, el siguiente turno envía el modelo de OpenAI seleccionado actualmente, la política de aprobación, el espacio aislado (sandbox) y el nivel de servicio al servidor de aplicaciones nuevamente. Cambiar de `openai/gpt-5.5` a `openai/gpt-5.2` mantiene el enlace del hilo pero solicita a Codex que continúe con el modelo recién seleccionado.

## Respuestas visibles y latidos

Cuando un turno de chat directo/desde la fuente se ejecuta a través del arnés de Codex, las respuestas visibles son, de forma predeterminada, la entrega final automática del asistente para las superficies internas de WebChat. Esto mantiene a Codex alineado con el contrato de solicitud del arnés Pi: los agentes responden normalmente y OpenClaw publica el texto final en la conversación de origen. Establezca `messages.visibleReplies: "message_tool"` cuando un chat directo/desde la fuente debe mantener intencionalmente el texto final del asistente como privado, a menos que el agente llame a `message(action="send")`.

Los turnos de latido de Codex también obtienen `heartbeat_respond` en el catálogo de herramientas de OpenClaz searchable por defecto, de modo que el agente puede registrar si la activación debe mantenerse silenciosa o notificar sin codificar ese flujo de control en el texto final.

La guía de iniciativa específica para los latidos se envía como una instrucción de desarrollador en modo de colaboración de Codex en el turno del latido mismo. Los turnos de chat ordinarios restauran el modo Codex predeterminado en lugar de llevar la filosofía de latidos en su mensaje de ejecución normal. Cuando existe un `HEARTBEAT.md` no vacío, las instrucciones en modo de colaboración del latido dirigen a Codex al archivo en lugar de incluir su contenido en línea.

## Límites de los ganchos

El arnés de Codex tiene tres capas de ganchos:

| Capa                                                       | Propietario                         | Propósito                                                                                                |
| ---------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ganchos de complemento de OpenClaw                         | OpenClaw                            | Compatibilidad de producto/complemento entre los arneses de OpenClaw y Codex.                            |
| Middleware de extensión del servidor de aplicaciones Codex | Complementos integrados de OpenClaw | Comportamiento del adaptador por turno alrededor de las herramientas dinámicas de OpenClaw.              |
| Ganchos nativos de Codex                                   | Codex                               | Ciclo de vida de bajo nivel de Codex y política de herramientas nativas desde la configuración de Codex. |

OpenClaw no utiliza archivos de configuración `hooks.json` de Codex globales o del proyecto para enrutar el comportamiento del complemento OpenClaw. Para el puente de herramienta nativa y permisos admitidos, OpenClaw inyecta configuración de Codex por hilo para `PreToolUse`, `PostToolUse`, `PermissionRequest` y `Stop`.

Cuando las aprobaciones del servidor de aplicaciones de Codex están habilitadas, es decir, `approvalPolicy` no es `"never"`, la configuración de enlace nativa inyectada por defecto omite `PermissionRequest` para que el revisor del servidor de aplicaciones de Codex y el puente de aprobación de OpenClaw manejen las escalaciones reales después de la revisión. Los operadores pueden agregar explícitamente `permission_request` a `nativeHookRelay.events` cuando necesitan el relé de compatibilidad.

Otros enlaces de Codex, como `SessionStart` y `UserPromptSubmit`, siguen siendo controles a nivel de Codex. No se exponen como enlaces de complemento de OpenClaw en el contrato v1.

Para las herramientas dinámicas de OpenClaw, OpenClaw ejecuta la herramienta después de que Codex solicita la llamada, por lo que OpenClaw activa el comportamiento de complemento y middleware que posee en el adaptador del arnés. Para las herramientas nativas de Codex, Codex posee el registro de herramienta canónico. OpenClaw puede reflejar eventos seleccionados, pero no puede reescribir el subproceso nativo de Codex a menos que Codex exponga esa operación a través de devoluciones de llamada del servidor de aplicaciones o ganchos nativos.

Los eventos `PreToolUse` del modo de informe del servidor de aplicaciones de Codex difieren las solicitudes de aprobación del complemento a la aprobación del servidor de aplicaciones correspondiente. Si un enlace `before_tool_call` de OpenClaw devuelve `requireApproval` mientras que la carga nativa establece el modo de aprobación de informe (`openclaw_approval_mode` es `"report"`), el relé de enlace nativo registra el requisito de aprobación del complemento y no devuelve ninguna decisión nativa. Cuando Codex envía la solicitud de aprobación del servidor de aplicaciones para el mismo uso de la herramienta, OpenClaw abre el mensaje de aprobación del complemento y asigna la decisión de vuelta a Codex. Los eventos `PermissionRequest` de Codex son una ruta de aprobación separada y aún pueden pasar por aprobaciones de OpenClaw cuando el tiempo de ejecución está configurado para ese puente.

Las notificaciones de elementos del servidor de aplicaciones de Codex también proporcionan observaciones asíncronas `after_tool_call` para las finalizaciones de herramientas nativas que aún no están cubiertas por el relé nativo `PostToolUse`. Estas observaciones son solo para telemetría y compatibilidad de complementos; no pueden bloquear, retrasar ni mutar la llamada a la herramienta nativa.

Las proyecciones del ciclo de vida de LLM y compactación provienen de las notificaciones del servidor de aplicaciones de Codex y el estado del adaptador de OpenClaw, no de los comandos de enlace de Codex nativo. Los eventos `before_compaction`, `after_compaction`, `llm_input` y `llm_output` de OpenClaw son observaciones a nivel de adaptador, no capturas byte por byte de las cargas internas de solicitud o compactación de Codex.

Las notificaciones del servidor de aplicaciones `hook/started` y `hook/completed` nativas de Codex se proyectan como eventos de agente `codex_app_server.hook` para la trayectoria y la depuración. No invocan los enlaces de complemento de OpenClaw.

## Contrato de soporte V1

Soportado en el tiempo de ejecución de Codex v1:

| Superficie                                           | Soporte                                                                                                                        | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucle de modelos de OpenAI a través de Codex         | Soportado                                                                                                                      | El servidor de aplicaciones de Codex posee el turno de OpenAI, la reanudación del hilo nativo y la continuación de la herramienta nativa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Enrutamiento y entrega de canales de OpenClaw        | Soportado                                                                                                                      | Telegram, Discord, Slack, WhatsApp, iMessage y otros canales permanecen fuera del tiempo de ejecución del modelo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Herramientas dinámicas de OpenClaw                   | Soportado                                                                                                                      | Codex le pide a OpenClaw que ejecute estas herramientas, por lo que OpenClaw se mantiene en la ruta de ejecución.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Complementos de contexto y solicitud                 | Soportado                                                                                                                      | OpenClaw proyecta el contexto/prompt específico de OpenClaw en el turno de Codex, dejando los prompts base, de modelo y de documentos del proyecto configurados propiedad de Codex en el carril nativo de Codex. OpenClaw deshabilita la personalización integrada de Codex para los subprocesos nativos, por lo que los archivos de personalización del espacio de trabajo del agente siguen siendo los más autorizados. Las instrucciones del desarrollador nativas de Codex aceptan solo la guía de comandos con alcance explícito a `codex_app_server`; las sugerencias globales de comandos heredadas permanecen para las superficies de prompt que no son de Codex. |
| Ciclo de vida del motor de contexto                  | Soportado                                                                                                                      | Ensamblaje, ingesta y ejecución de mantenimiento posterior al turno alrededor de los turnos de Codex. Los motores de contexto no reemplazan la compactación nativa de Codex.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Ganchos de herramientas dinámicas                    | Compatible                                                                                                                     | El middleware `before_tool_call`, `after_tool_call` y el de resultados de herramientas se ejecutan alrededor de las herramientas dinámicas propiedad de OpenClaw.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Ganchos de ciclo de vida                             | Compatible como observaciones del adaptador                                                                                    | Los eventos `llm_input`, `llm_output`, `agent_end`, `before_compaction` y `after_compaction` se activan con cargas útiles honestas del modo Codex.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Puerta de revisión de la respuesta final             | Admitido a través del relé de enlace nativo                                                                                    | El `Stop` de Codex se retransmite a `before_agent_finalize`; `revise` le pide a Codex un paso más del modelo antes de la finalización.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Bloqueo u observación de shell, parche y MCP nativos | Compatible a través de retransmisión de ganchos nativos                                                                        | Los eventos `PreToolUse` y `PostToolUse` de Codex se retransmiten para las superficies de herramientas nativas confirmadas, incluidas las cargas útiles de MCP en el servidor de aplicaciones de Codex `0.125.0` o más reciente. Se admite el bloqueo; la reescritura de argumentos no.                                                                                                                                                                                                                                                                                                                                                                                   |
| Política de permisos nativos                         | Compatible a través de aprobaciones del servidor de aplicaciones de Codex y retransmisión de ganchos nativos de compatibilidad | Las solicitudes de aprobación del servidor de aplicaciones de Codex se enrutan a través de OpenClaw después de la revisión de Codex. El relé de gancho nativo `PermissionRequest` es opcional para los modos de aprobación nativos porque Codex lo emite antes de la revisión del guardián.                                                                                                                                                                                                                                                                                                                                                                               |
| Captura de trayectoria del servidor de aplicaciones  | Compatible                                                                                                                     | OpenClaw registra la solicitud que envió al servidor de aplicaciones y las notificaciones del servidor de aplicaciones que recibe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

No compatible en el tiempo de ejecución de Codex v1:

| Superficie                                                                | Límite de V1                                                                                                                                                                                  | Ruta futura                                                                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mutación de argumentos de herramientas nativas                            | Los hooks de pre-herramienta nativos de Codex pueden bloquear, pero OpenClaw no reescribe los argumentos de herramientas nativas de Codex.                                                    | Requiere soporte de hook/esquema de Codex para la entrada de herramienta de reemplazo.                                 |
| Historial de transcripciones nativas de Codex editable                    | Codex posee el historial canónico de hilos nativos. OpenClaw posee un espejo y puede proyectar un contexto futuro, pero no debe mutar los internos no compatibles.                            | Añada APIs explícitas del servidor de aplicaciones de Codex si se necesita una cirugía de hilos nativa.                |
| `tool_result_persist` para los registros de herramientas nativas de Codex | Ese hook transforma las escrituras de transcripción propiedad de OpenClaw, no los registros de herramientas nativas de Codex.                                                                 | Podría reflejar los registros transformados, pero la reescritura canónica necesita el soporte de Codex.                |
| Metadatos de compactación nativa enriquecidos                             | OpenClaw puede solicitar una compactación nativa, pero no recibe una lista estable de elementos mantenidos/eliminados, un delta de tokens, un resumen de finalización o una carga de resumen. | Necesita eventos de compactación de Codex más enriquecidos.                                                            |
| Intervención de compactación                                              | OpenClaw no permite que los complementos o los motores de contexto veten, reescriban o reemplacen la compactación nativa de Codex.                                                            | Añada hooks de pre/post compactación de Codex si los complementos necesitan vetar o reescribir la compactación nativa. |
| Captura de solicitudes de API de modelo byte a byte                       | OpenClaw puede capturar las solicitudes y notificaciones del servidor de aplicaciones, pero el núcleo de Codex construye la solicitud final de la API de OpenAI internamente.                 | Necesita un evento de rastreo de solicitud de modelo de Codex o una API de depuración.                                 |

## Permisos nativos y elicitaciones MCP

Para `PermissionRequest`, OpenClaw solo devuelve decisiones de permitir o denegar explícitas
cuando la política lo decide. Un resultado de sin decisión no es una permisión. Codex lo trata como sin
decisión de gancho y recurre a su propia ruta de aprobación del guardián o del usuario.

Los modos de aprobación del servidor de aplicaciones de Codex omiten este gancho nativo de forma predeterminada. Este comportamiento
se aplica cuando `permission_request` se incluye explícitamente en
`nativeHookRelay.events` o un tiempo de ejecución de compatibilidad lo instala.

Cuando un operador elige `allow-always` para una solicitud de permiso nativo de Codex,
OpenClaw recuerda esa huella digital exacta de proveedor/sesión/herramienta/entrada/cwd durante una
ventana de sesión limitada. La decisión recordada es intencionalmente solo coincidencia exacta:
un comando, argumentos, carga útil de la herramienta o cwd cambiados crean una
aprobación nueva.

Las elicitaciones de aprobación de herramientas MCP de Codex se enrutan a través del flujo de
aprobación de complementos de OpenClaw cuando Codex marca `_meta.codex_approval_kind` como
`"mcp_tool_call"`. Los mensajes de aviso `request_user_input` de Codex se envían de vuelta al
chat de origen, y el siguiente mensaje de seguimiento en cola responde a esa solicitud de
servidor nativo en lugar de ser redirigido como contexto adicional. Otras solicitudes de
elicitación MCP fallan cerradas.

Para ver el flujo general de aprobación de complementos que lleva estos avisos, consulte
[Solicitudes de permiso de complementos](/es/plugins/plugin-permission-requests).

## Dirección de la cola

La dirección de la cola de ejecución activa se asigna al `turn/steer` del servidor de aplicaciones de Codex. Con el
`messages.queue.mode: "steer"` predeterminado, OpenClaw agrupa los mensajes de chat
en modo de dirección para la ventana de silencio configurada y los envía como una solicitud `turn/steer`
en orden de llegada.

Los turnos de revisión y compactación manual de Codex pueden rechazar la dirección del mismo turno. En ese
caso, OpenClaw espera a que finalice la ejecución activa antes de iniciar el mensaje.
Use `/queue followup` o `/queue collect` cuando los mensajes deben ponerse en cola de forma predeterminada
en lugar de ser dirigidos. Consulte [Cola de dirección](/es/concepts/queue-steering).

## Carga de comentarios de Codex

Cuando `/diagnostics [note]` se aprueba para una sesión usando el arnés nativo de Codex, OpenClaw también llama al `feedback/upload` del servidor de aplicaciones de Codex para los hilos de Codex relevantes. La carga pide al servidor de aplicaciones que incluya registros para cada hilo listado y subhilos de Codex generados cuando estén disponibles.

La carga pasa a través de la ruta normal de comentarios de Codex hacia los servidores de OpenAI. Si los comentarios de Codex están deshabilitados en ese servidor de aplicaciones, el comando devuelve el error del servidor de aplicaciones. La respuesta de diagnósticos completada enumera los canales, ids de sesión de OpenClaw, ids de hilo de Codex y comandos locales `codex resume <thread-id>` para los hilos que se enviaron.

Si deniega o ignora la aprobación, OpenClaw no imprime esos ids de Codex y no envía comentarios de Codex. La carga no reemplaza la exportación de diagnósticos local de Gateway. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el comportamiento de aprobación, privacidad, paquete local y chat de grupo.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex para el hilo adjunto actualmente sin el paquete completo de diagnósticos de Gateway.

## Compaction y espejo de transcripción

Cuando el modelo seleccionado usa el arnés de Codex, la compactación nativa de hilos pertenece al servidor de aplicaciones de Codex. OpenClaw no ejecuta compactación previa para turnos de Codex, no reemplaza la compactación de Codex con la compactación del motor de contexto y no recurre a OpenClaw o al resumen público de OpenAI cuando no se puede iniciar la compactación nativa de Codex. OpenClaw mantiene un espejo de transcripción para el historial del canal, búsqueda, `/new`, `/reset` y cambios futuros de modelo o arnés.

Las solicitudes explícitas de compactación, como `/compact` o una operación de compactación manual solicitada por un complemento, inician la compactación nativa de Codex con `thread/compact/start`. OpenClaw regresa después de iniciar esa operación nativa. No espera a que se complete, impone un tiempo de espera separado de OpenClaw, reinicia el servidor de aplicaciones compartido de Codex ni registra la operación como una compactación completada por OpenClaw.

Cuando un motor de contexto solicita la proyección de arranque de hilo de Codex, OpenClaw proyecta los nombres e IDs de llamadas de herramientas, las formas de entrada y el contenido de los resultados de herramientas redactados en el hilo fresco de Codex. No copia los valores de argumentos de llamadas de herramientas sin procesar en esa proyección.

El espejo incluye el mensaje del usuario, el texto final del asistente y los registros ligeros de razonamiento o plan de Codex cuando el servidor de aplicaciones los emite. Hoy, OpenClaw solo registra señales explícitas de inicio de compactación nativa cuando solicita la compactación. No expone un resumen de compactación legible por humanos ni una lista auditable de qué entradas mantuvo Codex después de la compactación.

Debido a que Codex posee el hilo nativo canónico, `tool_result_persist` actualmente no reescribe los registros de resultados de herramientas nativas de Codex. Solo se aplica cuando OpenClaw está escribiendo un resultado de herramienta de transcripción de sesión propiedad de OpenClaw.

## Medios y entrega

OpenClaw continúa siendo propietario de la entrega de medios y la selección del proveedor de medios. Imagen, video, música, PDF, TTS y la comprensión de medios utilizan configuraciones de proveedor/modelo coincidentes como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

El texto, las imágenes, el video, la música, el TTS, las aprobaciones y la salida de la herramienta de mensajería continúan a través de la ruta de entrega normal de OpenClaw. La generación de medios no requiere el runtime heredado. Cuando Codex emite un elemento de generación de imagen nativo con un `savedPath`, OpenClaw reenvía ese archivo exacto a través de la ruta normal de medios de respuesta incluso si el turno de Codex no tiene texto de asistente.

## Relacionado

- [Codex harness](/es/plugins/codex-harness)
- [Codex harness reference](/es/plugins/codex-harness-reference)
- [Native Codex plugins](/es/plugins/codex-native-plugins)
- [Plugin hooks](/es/plugins/hooks)
- [Agent harness plugins](/es/plugins/sdk-agent-harness)
- [Diagnostics export](/es/gateway/diagnostics)
- [Trajectory export](/es/tools/trajectory)
