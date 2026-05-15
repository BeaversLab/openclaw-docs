---
summary: "Límites de tiempo de ejecución, ganchos, herramientas, permisos y diagnósticos para el arnés de Codex"
title: "Tiempo de ejecución del arnés de Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

Esta página documenta el contrato de tiempo de ejecución para los turnos del arnés de Codex. Para la configuración y el enrutamiento, comience con [Codex harness](/es/plugins/codex-harness). Para ver los campos de configuración, consulte [Codex harness reference](/es/plugins/codex-harness-reference).

## Descripción general

El modo Codex no es PI con una llamada de modelo diferente debajo. Codex posee más del bucle del modelo nativo y OpenClaw adapta sus superficies de complemento, herramienta, sesión y diagnóstico alrededor de ese límite.

OpenClaw aún posee el enrutamiento de canales, archivos de sesión, entrega de mensajes visibles,
herramientas dinámicas de OpenClaw, aprobaciones, entrega de medios y un espejo de transcripción.
Codex posee el hilo nativo canónico, el bucle de modelo nativo, la continuación de
herramienta nativa y la compactación nativa.

## Enlaces de hilo y cambios de modelo

Cuando una sesión de OpenClaw se adjunta a un hilo Codex existente, el siguiente turno
envía el modelo de OpenAI seleccionado actualmente, la política de aprobación, el sandbox y el nivel de servicio
al servidor de aplicaciones nuevamente. Cambiar de `openai/gpt-5.5` a
`openai/gpt-5.2` mantiene el enlace del hilo pero pide a Codex que continúe con el
modelo recién seleccionado.

## Respuestas visibles y latidos

Cuando un turno de chat de origen se ejecuta a través del Codex harness, las respuestas visibles se configuran por defecto en la herramienta `message` de OpenClaw si el despliegue no ha configurado explícitamente `messages.visibleReplies`. El agente aún puede finalizar su turno de Codex de forma privada; solo publica en el canal cuando llama a `message(action="send")`. Configure `messages.visibleReplies: "automatic"` para mantener las respuestas finales del chat directo en la ruta de entrega automática heredada.

Los turnos de latido de Codex también obtienen `heartbeat_respond` en el catálogo de herramientas de OpenClaw buscable por defecto, por lo que el agente puede registrar si la activación debe permanecer en silencio o notificar sin codificar ese flujo de control en el texto final.

La orientación de iniciativa específica del latido se envía como una instrucción del desarrollador en modo de colaboración de Codex en el propio turno de latido. Los turnos de chat ordinarios restauran el modo Codex predeterminado en lugar de llevar la filosofía del latido en su mensaje de ejecución normal.

## Límites de los enganches (hooks)

El arnés de Codex tiene tres capas de ganchos:

| Capa                                                          | Propietario                         | Propósito                                                                                                |
| ------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ganchos de complemento de OpenClaw                            | OpenClaw                            | Compatibilidad de producto/complemento entre PI y arneses de Codex.                                      |
| Middleware de extensión del servidor de aplicaciones de Codex | Complementos integrados de OpenClaw | Comportamiento del adaptador por turno alrededor de las herramientas dinámicas de OpenClaw.              |
| Ganchos nativos de Codex                                      | Codex                               | Ciclo de vida de bajo nivel de Codex y política de herramientas nativas desde la configuración de Codex. |

OpenClaw no utiliza archivos de configuración de Codex `hooks.json` de proyecto o globales para enrutar
el comportamiento del complemento de OpenClaw. Para el puente de herramientas nativas y permisos admitido,
OpenClaw inyecta configuración de Codex por hilo para `PreToolUse`, `PostToolUse`,
`PermissionRequest` y `Stop`.

Cuando las aprobaciones del servidor de aplicaciones de Codex están habilitadas, es decir, `approvalPolicy` no es
`"never"`, la configuración de gancho nativo inyectada por defecto omite `PermissionRequest` para que
el revisor del servidor de aplicaciones de Codex y el puente de aprobaciones de OpenClaw manejen las
escalaciones reales después de la revisión. Los operadores pueden agregar explícitamente `permission_request` a
`nativeHookRelay.events` cuando necesitan el relé de compatibilidad.

Otros ganchos de Codex como `SessionStart` y `UserPromptSubmit` permanecen
como controles a nivel de Codex. No están expuestos como ganchos de complemento de OpenClaw en el contrato
v1.

Para las herramientas dinámicas de OpenClaw, OpenClaw ejecuta la herramienta después de que Codex solicita la
llamada, por lo que OpenClaw activa el comportamiento de complemento y middleware que posee en el
adaptador del arnés. Para las herramientas nativas de Codex, Codex posee el registro canónico de la herramienta.
OpenClaw puede reflejar eventos seleccionados, pero no puede reescribir el hilo nativo de
Codex a menos que Codex exponga esa operación a través de devoluciones de llamada del servidor de aplicaciones o ganchos nativos.

Las proyecciones de compactación y ciclo de vida de LLM provienen de las notificaciones del servidor de aplicaciones
de Codex y el estado del adaptador de OpenClaw, no de comandos de gancho nativos de Codex.
Los eventos `before_compaction`, `after_compaction`, `llm_input` y
`llm_output` de OpenClaw son observaciones a nivel de adaptador, no capturas byte a byte
de las solicitudes internas de Codex o cargas útiles de compactación.

Las notificaciones nativas de `hook/started` y del servidor de aplicaciones `hook/completed` de Codex se proyectan como eventos del agente `codex_app_server.hook` para la trayectoria y la depuración. No invocan los hooks de los complementos de OpenClaw.

## Contrato de soporte V1

Compatible con el tiempo de ejecución de Codex v1:

| Superficie                                          | Soporte                                                                                                             | Por qué                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucle de modelos de OpenAI a través de Codex        | Compatible                                                                                                          | El servidor de aplicaciones de Codex posee el turno de OpenAI, la reanudación del subproceso nativo y la continuación de la herramienta nativa.                                                                                                                                             |
| Enrutamiento y entrega de canales de OpenClaw       | Compatible                                                                                                          | Telegram, Discord, Slack, WhatsApp, iMessage y otros canales permanecen fuera del tiempo de ejecución del modelo.                                                                                                                                                                           |
| Herramientas dinámicas de OpenClaw                  | Compatible                                                                                                          | Codex pide a OpenClaw que ejecute estas herramientas, por lo que OpenClaw permanece en la ruta de ejecución.                                                                                                                                                                                |
| Complementos de contexto y avisos (prompt)          | Compatible                                                                                                          | OpenClaw crea superposiciones de avisos y proyecta el contexto en el turno de Codex antes de iniciar o reanudar el subproceso.                                                                                                                                                              |
| Ciclo de vida del motor de contexto                 | Compatible                                                                                                          | El ensamblaje, la ingestión, el mantenimiento posterior al turno y la coordinación de compactación del motor de contexto se ejecutan para los turnos de Codex.                                                                                                                              |
| Hooks de herramientas dinámicas                     | Compatible                                                                                                          | `before_tool_call`, `after_tool_call` y el middleware de resultados de herramientas se ejecutan alrededor de las herramientas dinámicas propiedad de OpenClaw.                                                                                                                              |
| Hooks de ciclo de vida                              | Compatible como observaciones del adaptador                                                                         | `llm_input`, `llm_output`, `agent_end`, `before_compaction` y `after_compaction` se activan con cargas útiles honestas del modo Codex.                                                                                                                                                      |
| Puerta de revisión de respuesta final               | Compatible a través del relevo de hook nativo                                                                       | El `Stop` de Codex se retransmite a `before_agent_finalize`; `revise` pide a Codex un pase de modelo más antes de la finalización.                                                                                                                                                          |
| Bloqueo u observación de shell nativo, parche y MCP | Compatible a través del relevo de hook nativo                                                                       | El `PreToolUse` y el `PostToolUse` de Codex se retransmiten para las superficies de herramientas nativas confirmadas, incluidas las cargas útiles de MCP en el servidor de aplicaciones de Codex `0.125.0` o más reciente. El bloqueo es compatible; la reescritura de argumentos no lo es. |
| Política de permisos nativos                        | Compatible a través de aprobaciones del servidor de aplicaciones de Codex y relevo de hook nativo de compatibilidad | Las solicitudes de aprobación del servidor de aplicaciones de Codex se enrutan a través de OpenClaw después de la revisión de Codex. El relé de enlace nativo `PermissionRequest` es opcional para los modos de aprobación nativos porque Codex lo emite antes de la revisión del guardián. |
| Captura de trayectoria del servidor de aplicaciones | Compatible                                                                                                          | OpenClaw registra la solicitud que envió al servidor de aplicaciones y las notificaciones del servidor de aplicaciones que recibe.                                                                                                                                                          |

No compatible en el tiempo de ejecución de Codex v1:

| Superficie                                                            | Límite V1                                                                                                                                                                             | Ruta futura                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Mutación de argumentos de herramientas nativas                        | Los enlaces pre-tool nativos de Codex pueden bloquear, pero OpenClaw no reescribe los argumentos de herramientas nativas de Codex.                                                    | Requiere soporte de enlace/esquema de Codex para la entrada de herramienta de reemplazo.                                   |
| Historial de transcripciones nativas de Codex editables               | Codex posee el historial canónico del subproceso nativo. OpenClaw posee una réplica y puede proyectar contexto futuro, pero no debe mutar elementos internos no compatibles.          | Agregue APIs explícitas del servidor de aplicaciones de Codex si se necesita cirugía del subproceso nativo.                |
| `tool_result_persist` para registros de herramientas nativas de Codex | Ese enlace transforma las escrituras de transcripciones propiedad de OpenClaw, no los registros de herramientas nativas de Codex.                                                     | Podría reflejar registros transformados, pero la reescritura canónica necesita soporte de Codex.                           |
| Metadatos de compactación nativa enriquecidos                         | OpenClaw observa el inicio y la finalización de la compactación, pero no recibe una lista estable de elementos mantenidos/eliminados, un delta de tokens o una carga útil de resumen. | Necesita eventos de compactación de Codex más enriquecidos.                                                                |
| Intervención de compactación                                          | Los enlaces de compactación actuales de OpenClaw son de nivel de notificación en el modo Codex.                                                                                       | Agregue enlaces de pre/post compactación de Codex si los complementos necesitan vetar o reescribir la compactación nativa. |
| Captura de solicitudes de API de modelo byte por byte                 | OpenClaw puede capturar solicitudes y notificaciones del servidor de aplicaciones, pero el núcleo de Codex construye la solicitud final de la API de OpenAI internamente.             | Necesita un evento de rastreo de solicitud de modelo de Codex o una API de depuración.                                     |

## Permisos nativos y elicitaciones MCP

Para `PermissionRequest`, OpenClaw solo devuelve decisiones explícitas de permitir o denegar
cuando la política lo decide. Un resultado sin decisión no es un permiso. Codex lo trata como sin
decisión de enlace y pasa a su propia ruta de aprobación de guardián o usuario.

Los modos de aprobación del servidor de aplicaciones de Codex omiten este enlace nativo de forma predeterminada. Este comportamiento
se aplica cuando `permission_request` se incluye explícitamente en
`nativeHookRelay.events` o un tiempo de ejecución de compatibilidad lo instala.

Cuando un operador elige `allow-always` para una solicitud de permiso nativa de Codex, OpenClaw recuerda esa huella digital exacta de proveedor/sesión/herramienta/entrada/cwd para una ventana de sesión limitada. La decisión recordada es intencionalmente solo de coincidencia exacta: un comando modificado, argumentos, carga útil de la herramienta o cwd crea una aprobación nueva.

Las solicitudes de aprobación de herramientas MCP de Codex se enrutan a través del flujo de aprobación de complementos de OpenClaw cuando Codex marca `_meta.codex_approval_kind` como `"mcp_tool_call"`. Los prompts `request_user_input` de Codex se devuelven al chat de origen, y el siguiente mensaje de seguimiento en cola responde a esa solicitud del servidor nativo en lugar de ser redirigido como contexto adicional. Otras solicitudes de elicitación de MCP fallan de forma cerrada.

## Dirección de la cola

La dirección de la cola de ejecución activa se asigna al `turn/steer` del servidor de aplicaciones de Codex. Con el `messages.queue.mode: "steer"` predeterminado, OpenClaw agrupa los mensajes de chat en cola para la ventana de silencio configurada y los envía como una solicitud `turn/steer` en orden de llegada. El modo `queue` heredado envía solicitudes `turn/steer` separadas.

Las revisiones de Codex y las turnos de compactación manual pueden rechazar la dirección en el mismo turno. En ese caso, OpenClaw utiliza la cola de seguimiento cuando el modo seleccionado permite la alternativa. Consulte [Cola de dirección](/es/concepts/queue-steering).

## Carga de comentarios de Codex

Cuando se aprueba `/diagnostics [note]` para una sesión que utiliza el arnés nativo de Codex, OpenClaw también llama al `feedback/upload` del servidor de aplicaciones de Codex para los hilos de Codex relevantes. La carga solicita al servidor de aplicaciones que incluya registros para cada hilo listado y subhilos de Codex generados cuando estén disponibles.

La carga se realiza a través de la ruta normal de comentarios de Codex hacia los servidores de OpenAI. Si los comentarios de Codex están deshabilitados en ese servidor de aplicaciones, el comando devuelve el error del servidor de aplicaciones. La respuesta de diagnóstico completada lista los canales, los ids de sesión de OpenClaw, los ids de hilo de Codex y los comandos locales `codex resume <thread-id>` para los hilos que se enviaron.

Si deniega o ignora la aprobación, OpenClaw no imprime esos identificadores de Codex y
no envía comentarios de Codex. La carga no reemplaza la exportación local de
diagnósticos de Gateway. Consulte [Exportación de diagnósticos](/es/gateway/diagnostics) para obtener información sobre la
aprobación, privacidad, paquete local y el comportamiento en chats grupales.

Use `/codex diagnostics [note]` solo cuando específicamente desee la carga de
comentarios de Codex para el hilo adjunto actualmente sin el paquete completo de
diagnósticos de Gateway.

## Compactación y espejo de transcripción

Cuando el modelo seleccionado utiliza el arnés de Codex, la compactación nativa de
hilos se delega al servidor de aplicaciones de Codex. OpenClaw mantiene un espejo de
transcripción para el historial del canal, búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés.

El espejo incluye el mensaje del usuario, el texto final del asistente y registros ligeros de razonamiento o planificación de Codex cuando el servidor de la aplicación los emite. Hoy, OpenClaw solo registra señales nativas de inicio y finalización de compactación. Todavía no expone un resumen de compactación legible por humanos ni una lista auditable de las entradas que Codex conservó después de la compactación.

Debido a que Codex posee el hilo nativo canónico, `tool_result_persist` actualmente no reescribe los registros de resultados de herramientas nativos de Codex. Solo se aplica cuando OpenClaw está escribiendo un resultado de herramienta de transcripción de sesión propiedad de OpenClaw.

## Medios y entrega

OpenClaw continúa siendo propietario de la entrega de medios y la selección del proveedor de medios. La imagen, el video, la música, el PDF, el TTS y la comprensión de medios utilizan configuraciones de proveedor/modelo coincidentes como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

Texto, imágenes, video, música, TTS, aprobaciones y la salida de la herramienta de mensajería continúan a través de la ruta de entrega normal de OpenClaw. La generación de medios no requiere PI.

## Relacionado

- [Codex harness](/es/plugins/codex-harness)
- [Referencia de Codex harness](/es/plugins/codex-harness-reference)
- [Complementos nativos de Codex](/es/plugins/codex-native-plugins)
- [Ganchos de complementos](/es/plugins/hooks)
- [Complementos de Agent harness](/es/plugins/sdk-agent-harness)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Exportación de trayectoria](/es/tools/trajectory)
