---
summary: "Límites de tiempo de ejecución, ganchos, herramientas, permisos y diagnósticos para el arnés de Codex"
title: "Tiempo de ejecución del arnés de Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

Esta página documenta el contrato de tiempo de ejecución para los turnos del arnés de Codex. Para la configuración y el enrutamiento, comience con [Codex harness](/es/plugins/codex-harness). Para los campos de configuración, consulte [Codex harness reference](/es/plugins/codex-harness-reference).

## Descripción general

El modo Codex no es PI con una llamada de modelo diferente debajo. Codex posee más del bucle del modelo nativo y OpenClaw adapta sus superficies de complemento, herramienta, sesión y diagnóstico alrededor de ese límite.

OpenClaw aún posee el enrutamiento de canales, los archivos de sesión, la entrega de mensajes visibles, las herramientas dinámicas de OpenClaw, las aprobaciones, la entrega de medios y un espejo de transcripciones. Codex posee el subproceso nativo canónico, el bucle de modelo nativo, la continuación de herramientas nativas y la compactación nativa, a menos que el motor de contexto de OpenClaw activo declare que posee la compactación.

El enrutamiento de avisos sigue el tiempo de ejecución seleccionado, no solo la cadena del proveedor. Un turno nativo de Codex recibe las instrucciones de desarrollador del servidor de aplicaciones de Codex, mientras que una ruta de compatibilidad PI explícita mantiene el aviso del sistema normal de OpenClaw/PI incluso cuando utiliza la autenticación o el transporte de OpenAI con sabor a Codex.

Codex nativo mantiene las instrucciones base/modelo/personalidad propiedad de Codex y el comportamiento de documentos del proyecto según la configuración del hilo de Codex activo. Las ejecuciones ligeras de OpenClaw aún preservan su supresión existente de documentos del proyecto. Las instrucciones de desarrollador de OpenClaw cubren las preocupaciones del tiempo de ejecución de OpenClaw, como la entrega del canal de origen, las herramientas dinámicas de OpenClaw, la delegación de ACP, el contexto del adaptador y los archivos de perfil del espacio de trabajo del agente activo. Los catálogos de habilidades de OpenClaw más `MEMORY.md` y el contenido `BOOTSTRAP.md` activo se proyectan como contexto de referencia de entrada del turno para Codex nativo.

## Enlaces de hilos y cambios de modelo

Cuando una sesión de OpenClaw se adjunta a un hilo de Codex existente, el siguiente turno envía el modelo de OpenAI seleccionado actualmente, la política de aprobación, el espacio aislado y el nivel de servicio al servidor de aplicaciones nuevamente. Cambiar de `openai/gpt-5.5` a `openai/gpt-5.2` mantiene el enlace del hilo pero pide a Codex que continúe con el modelo recién seleccionado.

## Respuestas visibles y latidos

Cuando un turno de chat directo/fuente se ejecuta a través del arnés de Codex, las respuestas visibles son, por defecto, la herramienta de mensaje: el texto final del asistente permanece privado a menos que el agente llame a `message(action="send")`. Esto se ajusta bien a los modelos GPT porque pueden decidir si la salida del canal de origen es útil. Establezca `messages.visibleReplies: "automatic"` para restaurar el modo antiguo donde el texto final del asistente se publica automáticamente.

Los turnos de latido de Codex también obtienen `heartbeat_respond` en el catálogo de herramientas de OpenClaw buscable de forma predeterminada, por lo que el agente puede registrar si el despertar debe permanecer en silencio o notificar sin codificar ese flujo de control en el texto final.

La guía de iniciativa específica del latido se envía como una instrucción de desarrollador en modo de colaboración de Codex en el propio turno de latido. Los turnos de chat ordinarios restauran el modo Codex predeterminado en lugar de llevar la filosofía del latido en su indicador de tiempo de ejecución normal. Cuando existe un `HEARTBEAT.md` no vacío, las instrucciones en modo de colaboración del latido dirigen a Codex al archivo en lugar de insertar su contenido.

## Límites de los ganchos

El arnés de Codex tiene tres capas de ganchos:

| Capa                                                       | Propietario                         | Propósito                                                                                                |
| ---------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ganchos de complemento de OpenClaw                         | OpenClaw                            | Compatibilidad de producto/complemento a través de PI y arneses de Codex.                                |
| Middleware de extensión del servidor de aplicaciones Codex | Complementos integrados de OpenClaw | Comportamiento del adaptador por turno alrededor de las herramientas dinámicas de OpenClaw.              |
| Ganchos nativos de Codex                                   | Codex                               | Ciclo de vida de bajo nivel de Codex y política de herramientas nativas desde la configuración de Codex. |

OpenClaw no utiliza archivos `hooks.json` de Codex globales o de proyectos para enrutar el comportamiento del complemento OpenClaw. Para el puente de herramienta nativa y permisos compatible, OpenClaw inyecta configuración de Codex por subproceso para `PreToolUse`, `PostToolUse`, `PermissionRequest` y `Stop`.

Cuando las aprobaciones del servidor de aplicaciones Codex están habilitadas, lo que significa que `approvalPolicy` no es `"never"`, la configuración de gancho nativo inyectada por defecto omite `PermissionRequest` para que el revisor del servidor de aplicaciones de Codex y el puente de aprobación de OpenClaw manejen las escalaciones reales después de la revisión. Los operadores pueden agregar explícitamente `permission_request` a `nativeHookRelay.events` cuando necesitan el relé de compatibilidad.

Otros ganchos de Codex, como `SessionStart` y `UserPromptSubmit`, siguen siendo controles a nivel de Codex. No se exponen como ganchos de complemento de OpenClaw en el contrato v1.

Para las herramientas dinámicas de OpenClaw, OpenClaw ejecuta la herramienta después de que Codex solicita la llamada, por lo que OpenClaw activa el comportamiento de complemento y middleware que posee en el adaptador del arnés. Para las herramientas nativas de Codex, Codex posee el registro de herramienta canónico. OpenClaw puede reflejar eventos seleccionados, pero no puede reescribir el subproceso nativo de Codex a menos que Codex exponga esa operación a través de devoluciones de llamada del servidor de aplicaciones o ganchos nativos.

Las notificaciones de elementos del servidor de aplicaciones de Codex también proporcionan observaciones `after_tool_call` asincrónicas para las finalizaciones de herramientas nativas que aún no están cubiertas por el relé nativo `PostToolUse`. Estas observaciones son solo para telemetría y compatibilidad de complementos; no pueden bloquear, retrasar ni mutar la llamada a la herramienta nativa.

Las proyecciones del ciclo de vida de LLM y la compactación provienen de las notificaciones del servidor de aplicaciones de Codex y del estado del adaptador OpenClaw, no de los comandos de enlace nativo de Codex. Los eventos `before_compaction`, `after_compaction`, `llm_input` y `llm_output` de OpenClaw son observaciones a nivel de adaptador, no capturas byte por byte de las cargas útiles de solicitud o compactación internas de Codex.

Las notificaciones del servidor de aplicaciones nativas `hook/started` y `hook/completed` de Codex se proyectan como eventos de agente `codex_app_server.hook` para la trayectoria y la depuración. No invocan enlaces de complementos de OpenClaw.

## Contrato de soporte V1

Compatible con el tiempo de ejecución de Codex v1:

| Superficie                                          | Soporte                                                                                                             | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bucle de modelos de OpenAI a través de Codex        | Compatible                                                                                                          | El servidor de aplicaciones de Codex posee el turno de OpenAI, la reanudación del hilo nativo y la continuación de la herramienta nativa.                                                                                                                                                                                                                                                                                                                                            |
| Enrutamiento y entrega de canales de OpenClaw       | Compatible                                                                                                          | Telegram, Discord, Slack, WhatsApp, iMessage y otros canales permanecen fuera del tiempo de ejecución del modelo.                                                                                                                                                                                                                                                                                                                                                                    |
| Herramientas dinámicas de OpenClaw                  | Compatible                                                                                                          | Codex le pide a OpenClaw que ejecute estas herramientas, por lo que OpenClaw se mantiene en la ruta de ejecución.                                                                                                                                                                                                                                                                                                                                                                    |
| Complementos de indicaciones y contexto             | Compatible                                                                                                          | OpenClaw proyecta indicaciones/contexto específicos de OpenClaw en el turno de Codex, dejando las indicaciones base, de modelo, de personalidad y de documentos de proyecto configuradas propiedad de Codex en el carril nativo de Codex. Las instrucciones del desarrollador nativas de Codex aceptan solo la guía de comandos explícitamente delimitada a `codex_app_server`; las sugerencias de comandos globales heredadas permanecen para superficies de indicaciones no Codex. |
| Ciclo de vida del motor de contexto                 | Compatible                                                                                                          | El ensamblaje, la ingesta, el mantenimiento posterior al turno y la coordinación de compactación del motor de contexto se ejecutan para los turnos de Codex.                                                                                                                                                                                                                                                                                                                         |
| Enlaces de herramientas dinámicas                   | Compatible                                                                                                          | El middleware `before_tool_call`, `after_tool_call` y el resultado de herramientas se ejecutan alrededor de las herramientas dinámicas propiedad de OpenClaw.                                                                                                                                                                                                                                                                                                                        |
| Enlaces del ciclo de vida                           | Compatible como observaciones del adaptador                                                                         | `llm_input`, `llm_output`, `agent_end`, `before_compaction` y `after_compaction` se disparan con payloads honestos del modo Codex.                                                                                                                                                                                                                                                                                                                                                   |
| Puerta de revisión de la respuesta final            | Soportado a través del relevo de enlaces nativos                                                                    | El `Stop` de Codex se transmite a `before_agent_finalize`; `revise` solicita a Codex un pase de modelo más antes de la finalización.                                                                                                                                                                                                                                                                                                                                                 |
| Shell nativo, parche y bloqueo u observación de MCP | Soportado a través del relevo de enlaces nativos                                                                    | Los `PreToolUse` y `PostToolUse` de Codex se transmiten para superficies de herramientas nativas confirmadas, incluyendo payloads de MCP en el servidor de aplicaciones Codex `0.125.0` o más reciente. El bloqueo es compatible; la reescritura de argumentos no lo es.                                                                                                                                                                                                             |
| Política de permisos nativos                        | Soportado a través de aprobaciones del servidor de aplicaciones Codex y relevo de enlaces nativos de compatibilidad | Las solicitudes de aprobación del servidor de aplicaciones Codex se enrutan a través de OpenClaw después de la revisión de Codex. El relevo de enlace nativo `PermissionRequest` es opcional para los modos de aprobación nativos porque Codex lo emite antes de la revisión del guardián.                                                                                                                                                                                           |
| Captura de trayectoria del servidor de aplicaciones | Soportado                                                                                                           | OpenClaw registra la solicitud que envió al servidor de aplicaciones y las notificaciones del servidor de aplicaciones que recibe.                                                                                                                                                                                                                                                                                                                                                   |

No compatible con el tiempo de ejecución de Codex v1:

| Superficie                                                            | Límite V1                                                                                                                                                                         | Ruta futura                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Mutación de argumentos de herramientas nativas                        | Los enlaces pre-herramienta nativos de Codex pueden bloquear, pero OpenClaw no reescribe los argumentos de herramientas nativas de Codex.                                         | Requiere soporte de enlace/esquema de Codex para la entrada de herramienta de reemplazo.                                   |
| Historial de transcripciones nativas de Codex editable                | Codex posee el historial canónico de hilos nativos. OpenClaw posee un espejo y puede proyectar contexto futuro, pero no debe mutar elementos internos no compatibles.             | Agregue APIs explícitas del servidor de aplicaciones Codex si se necesita cirugía de hilos nativos.                        |
| `tool_result_persist` para registros de herramientas nativas de Codex | Ese enlace transforma las escrituras de transcripciones propiedad de OpenClaw, no los registros de herramientas nativas de Codex.                                                 | Podría reflejar registros transformados, pero la reescritura canónica necesita soporte de Codex.                           |
| Metadatos de compactación nativa enriquecidos                         | OpenClaw observa el inicio y la finalización de la compactación, pero no recibe una lista estable de elementos mantenidos/eliminados, un delta de tokens o un payload de resumen. | Necesita eventos de compactación de Codex más enriquecidos.                                                                |
| Intervención de compactación                                          | Los ganchos de compactación actuales de OpenClaw son de nivel de notificación en modo Codex.                                                                                      | Agregue ganchos de pre/post compactación de Codex si los complementos necesitan vetar o reescribir la compactación nativa. |
| Captura de solicitudes de API de modelo byte por byte                 | OpenClaw puede capturar solicitudes y notificaciones del servidor de aplicaciones, pero el núcleo de Codex construye la solicitud final de la API de OpenAI internamente.         | Necesita un evento de seguimiento de solicitud de modelo de Codex o una API de depuración.                                 |

## Permisos nativos y elicitaciones MCP

Para `PermissionRequest`, OpenClaw solo devuelve decisiones explícitas de permitir o denegar
cuando la política lo decide. Un resultado sin decisión no es un permiso. Codex lo trata como sin
decisión del gancho y pasa a su propio camino de guardián o aprobación del usuario.

Los modos de aprobación del servidor de aplicaciones de Codex omiten este gancho nativo de manera predeterminada. Este comportamiento
se aplica cuando `permission_request` se incluye explícitamente en
`nativeHookRelay.events` o un tiempo de ejecución de compatibilidad lo instala.

Cuando un operador elige `allow-always` para una solicitud de permiso nativo de Codex,
OpenClaw recuerda esa huella digital exacta de proveedor/sesión/herramienta/entrada/cwd para una
ventana de sesión limitada. La decisión recordada es intencionalmente solo de coincidencia exacta:
un comando cambiado, argumentos, carga útil de la herramienta o cwd crea una
aprobación nueva.

Las elicitaciones de aprobación de herramientas MCP de Codex se enrutan a través del flujo de
aprobación de complementos de OpenClaw cuando Codex marca `_meta.codex_approval_kind` como
`"mcp_tool_call"`. Los mensajes `request_user_input` de Codex se envían de vuelta al
chat de origen, y el siguiente mensaje de seguimiento en cola responde a esa solicitud de
servidor nativo en lugar de ser dirigido como contexto adicional. Otras solicitudes de elicitación
MCP fallan cerradas.

## Dirección de la cola

La dirección de la cola en ejecución activa se asigna a `turn/steer` del servidor de aplicaciones de Codex. Con el
`messages.queue.mode: "steer"` predeterminado, OpenClaw agrupa los mensajes de chat en modo de dirección
para la ventana silenciosa configurada y los envía como una solicitud `turn/steer`
en orden de llegada.

Las turnos de revisión y compactación manual de Codex pueden rechazar la dirección del mismo turno. En ese caso, OpenClaw espera a que finalice la ejecución activa antes de iniciar el prompt. Use `/queue followup` o `/queue collect` cuando los mensajes deben ponerse en cola por defecto en lugar de dirigir. Consulte [Cola de dirección](/es/concepts/queue-steering).

## Carga de comentarios de Codex

Cuando se `/diagnostics [note]` para una sesión que utiliza el arnés nativo de Codex, OpenClaw también llama al servidor de aplicaciones de Codex `feedback/upload` para los hilos de Codex relevantes. La carga solicita al servidor de aplicaciones que incluya registros para cada hilo listado y subhilos de Codex generados cuando estén disponibles.

La carga se realiza a través de la ruta de comentarios normal de Codex hacia los servidores de OpenAI. Si los comentarios de Codex están deshabilitados en ese servidor de aplicaciones, el comando devuelve el error del servidor de aplicaciones. La respuesta de diagnósticos completada enumera los canales, los identificadores de sesión de OpenClaw, los identificadores de hilo de Codex y los comandos locales `codex resume <thread-id>` para los hilos que se enviaron.

Si deniega o ignora la aprobación, OpenClaw no imprime esos identificadores de Codex y no envía comentarios de Codex. La carga no reemplaza la exportación de diagnósticos local de Gateway. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para conocer el comportamiento de aprobación, privacidad, paquete local y chat de grupo.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de comentarios de Codex para el hilo adjunto actualmente sin el paquete completo de diagnósticos de Gateway.

## Compactación y espejo de transcripción

Cuando el modelo seleccionado utiliza el arnés de Codex, la compactación nativa de hilos se delega al servidor de aplicaciones de Codex a menos que un motor de contexto activo declare `ownsCompaction: true`. Los motores de contexto propietarios compactan primero y hacen que OpenClaw abandone el hilo del backend antiguo de Codex para que el siguiente turno pueda rehidratar un hilo nuevo desde el contexto gestionado por el motor. OpenClaw mantiene un espejo de transcripción para el historial del canal, búsqueda, `/new`, `/reset`, y cambios futuros de modelo o arnés.

Cuando un motor de contexto solicita la proyección de inicio de hilo de Codex, OpenClaw proyecta los nombres e identificadores de llamadas de herramientas, las formas de entrada y el contenido redactado de los resultados de las herramientas en el hilo nuevo de Codex. No copia los valores de los argumentos de la llamada de la herramienta sin procesar en esa proyección.

El espejo incluye el aviso del usuario, el texto final del asistente y registros de razonamiento o planificación ligeros de Codex cuando el servidor de la aplicación los emite. Hoy, OpenClaw solo registra señales nativas de inicio y finalización de compactación. Todavía no expone un resumen de compactación legible por humanos ni una lista auditable de qué entradas conservó Codex después de la compactación.

Debido a que Codex posee el hilo nativo canónico, `tool_result_persist` actualmente no reescribe los registros de resultados de herramientas nativas de Codex. Solo se aplica cuando OpenClaw está escribiendo un resultado de herramienta de transcripción de sesión propiedad de OpenClaw.

## Medios y entrega

OpenClaw sigue siendo el propietario de la entrega de medios y la selección del proveedor de medios. Imágenes, video, música, PDF, TTS y comprensión de medios utilizan configuraciones de proveedor/modelo coincidentes como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

El texto, las imágenes, el video, la música, TTS, las aprobaciones y la salida de herramientas de mensajería continúan a través de la ruta de entrega normal de OpenClaw. La generación de medios no requiere PI. Cuando Codex emite un elemento nativo de generación de imágenes con un `savedPath`, OpenClaw reenvía ese archivo exacto a través de la ruta normal de medios de respuesta incluso si el turno de Codex no tiene texto de asistente.

## Relacionado

- [Codex harness](/es/plugins/codex-harness)
- [Codex harness reference](/es/plugins/codex-harness-reference)
- [Native Codex plugins](/es/plugins/codex-native-plugins)
- [Plugin hooks](/es/plugins/hooks)
- [Agent harness plugins](/es/plugins/sdk-agent-harness)
- [Diagnostics export](/es/gateway/diagnostics)
- [Trajectory export](/es/tools/trajectory)
