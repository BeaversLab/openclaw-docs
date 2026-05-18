---
summary: "Análisis en profundidad: almacén de sesiones + transcripciones, ciclo de vida e internos de (auto)compactación"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
  - You want to implement memory flushes or silent system turns
title: "Análisis en profundidad de la gestión de sesiones"
---

OpenClaw gestiona las sesiones de extremo a extremo en estas áreas:

- **Enrutamiento de sesiones** (cómo se asignan los mensajes entrantes a un `sessionKey`)
- **Almacenamiento de sesiones** (`sessions.json`) y lo que rastrea
- **Persistencia de la transcripción** (`*.jsonl`) y su estructura
- **Higiene de la transcripción** (correcciones específicas del proveedor antes de las ejecuciones)
- **Límites de contexto** (ventana de contexto frente a tokens rastreados)
- **Compactación** (manual y automática) y dónde enganchar el trabajo de precompactación
- **Mantenimiento silencioso** (escrituras en memoria que no deben producir salida visible para el usuario)

Si desea primero una visión general de alto nivel, comience con:

- [Gestión de sesiones](/es/concepts/session)
- [Compactación](/es/concepts/compaction)
- [Descripción general de la memoria](/es/concepts/memory)
- [Búsqueda en memoria](/es/concepts/memory-search)
- [Poda de sesiones](/es/concepts/session-pruning)
- [Higiene de la transcripción](/es/reference/transcript-hygiene)

---

## Fuente de verdad: el Gateway

OpenClaw está diseñado en torno a un único **proceso Gateway** que posee el estado de la sesión.

- Las interfaces de usuario (aplicación macOS, interfaz de control web, TUI) deben consultar al Gateway para obtener listas de sesiones y recuentos de tokens.
- En modo remoto, los archivos de sesión se encuentran en el host remoto; "verificar sus archivos locales de Mac" no reflejará lo que el Gateway está utilizando.

---

## Dos capas de persistencia

OpenClaw persiste las sesiones en dos capas:

1. **Almacenamiento de sesiones (`sessions.json`)**
   - Mapa de clave/valor: `sessionKey -> SessionEntry`
   - Pequeño, mutable, seguro para editar (o eliminar entradas)
   - Rastrea los metadatos de la sesión (id de sesión actual, última actividad, interruptores, contadores de tokens, etc.)

2. **Transcripción (`<sessionId>.jsonl`)**
   - Transcripción de solo anexado con estructura de árbol (las entradas tienen `id` + `parentId`)
   - Almacena la conversación real + llamadas a herramientas + resúmenes de compactación
   - Se utiliza para reconstruir el contexto del modelo para turnos futuros
   - Los puntos de control de depuración grandes de precompactación se omiten una vez que la transcripción activa excede el límite de tamaño del punto de control, evitando una segunda copia gigante de `.checkpoint.*.jsonl`.

Los lectores del historial del Gateway deben evitar materializar la transcripción completa a menos que la superficie necesite explícitamente acceso histórico arbitrario. El historial de la primera página, el historial de chat incrustado, la recuperación de reinicio y las verificaciones de tokens/uso utilizan lecturas de cola limitadas. Los escaneos completos de la transcripción pasan por el índice de transcripción asíncrono, que se almacena en caché mediante la ruta del archivo más `mtimeMs`/`size` y se comparte entre lectores simultáneos.

---

## Ubicaciones en disco

Por agente, en el host del Gateway:

- Almacén: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripciones: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sesiones de temas de Telegram: `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw resuelve estos mediante `src/config/sessions.ts`.

---

## Mantenimiento del almacén y controles de disco

La persistencia de sesiones tiene controles de mantenimiento automático (`session.maintenance`) para `sessions.json`, artefactos de transcripción y sidecars de trayectoria:

- `mode`: `warn` (predeterminado) o `enforce`
- `pruneAfter`: límite de edad de entradas obsoletas (predeterminado `30d`)
- `maxEntries`: limitar las entradas en `sessions.json` (predeterminado `500`)
- `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>` (predeterminado: igual que `pruneAfter`; `false` desactiva la limpieza)
- `maxDiskBytes`: presupuesto opcional del directorio de sesiones
- `highWaterBytes`: objetivo opcional después de la limpieza (predeterminado `80%` de `maxDiskBytes`)

Las escrituras normales del Gateway fluyen a través de un escritor de sesiones por tienda que serializa las mutaciones en proceso sin tomar un bloqueo de archivo en tiempo de ejecución. Los asistentes de parches de la ruta rápida toman prestada la caché mutable validada mientras mantienen ese espacio de escritor, por lo que los archivos grandes `sessions.json` no se clonan o releen para cada actualización de metadatos. El código en tiempo de ejecución debe preferir `updateSessionStore(...)` o `updateSessionStoreEntry(...)`; los guardados directos de toda la tienda son herramientas de compatibilidad y mantenimiento sin conexión. Cuando un Gateway es accesible, `openclaw sessions cleanup` y `openclaw agents delete` que no son de ejecución en seco (dry-run) delegan las mutaciones de la tienda al Gateway para que la limpieza se una a la misma cola de escritores; `--store <path>` es la ruta explícita de reparación sin conexión para el mantenimiento directo de archivos. La limpieza `maxEntries` todavía se procesa por lotes para límites de tamaño de producción, por lo que una tienda puede exceder brevemente el límite configurado antes de que la siguiente limpieza de nivel alto lo reescriba hacia abajo. Las lecturas de la tienda de sesiones no podan ni limitan las entradas durante el inicio del Gateway; use escrituras o `openclaw sessions cleanup --enforce` para la limpieza. `openclaw sessions cleanup --enforce` todavía aplica el límite configurado inmediatamente y poda artefactos antiguos no referenciados de transcripción, punto de control y trayectoria incluso cuando no se configura ningún presupuesto de disco.

El mantenimiento mantiene punteros de conversación externos duraderos, como sesiones de grupo y sesiones de chat con ámbito de hilo, pero las entradas sintéticas de tiempo de ejecución para cron, ganchos, latido, ACP y subagentes aún se pueden eliminar cuando exceden la edad, el recuento o el presupuesto de disco configurados.

OpenClaw ya no crea copias de seguridad automáticas de rotación `sessions.json.bak.*` durante las escrituras del Gateway. La clave heredada `session.maintenance.rotateBytes` se ignora y `openclaw doctor --fix` la elimina de las configuraciones antiguas.

Las mutaciones de la transcripción utilizan un bloqueo de escritura de sesión en el archivo de transcripción. La adquisición del bloqueo espera hasta `session.writeLock.acquireTimeoutMs` antes de mostrar un error de sesión ocupada; el valor predeterminado es `60000` ms. Aumente esto solo cuando el trabajo legítimo de preparación, limpieza, compactación o duplicación de transcripción compite por más tiempo en máquinas lentas. `session.writeLock.staleMs` controla cuándo se puede recuperar un bloqueo existente como obsoleto; el valor predeterminado es `1800000` ms. `session.writeLock.maxHoldMs` controla el umbral de liberación del perro guardián dentro del proceso; el valor predeterminado es `300000` ms. Las anulaciones de emergencia de variables de entorno son `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`, `OPENCLAW_SESSION_WRITE_LOCK_STALE_MS` y `OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`.

Orden de aplicación para la limpieza del presupuesto de disco (`mode: "enforce"`):

1. Eliminar primero los artefactos más antiguos archivados, de transcripciones huérfanas o de trayectorias huérfanas.
2. Si todavía se está por encima del objetivo, desalojar las entradas de sesión más antiguas y sus archivos de transcripción/trayectoria.
3. Continuar hasta que el uso esté en o por debajo de `highWaterBytes`.

En `mode: "warn"`, OpenClaw informa posibles desalojos, pero no muta el almacén/archivos.

Ejecutar mantenimiento bajo demanda:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sesiones de cron y registros de ejecución

Las ejecuciones de cron aisladas también crean entradas/transcripciones de sesión, y tienen controles de retención dedicados:

- `cron.sessionRetention` (predeterminado `24h`) poda las sesiones antiguas aisladas de ejecución de cron del almacén de sesiones (`false` deshabilita).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` poden archivos `~/.openclaw/cron/runs/<jobId>.jsonl` (predeterminados: `2_000_000` bytes y `2000` líneas).

Cuando cron fuerza la creación de una nueva sesión de ejecución aislada, sanea la entrada de sesión `cron:<jobId>` anterior antes de escribir la nueva fila. Mantiene preferencias seguras como la configuración de pensamiento/rápido/verboso, etiquetas y anulaciones explícitas de modelo/autenticación seleccionadas por el usuario. Elimina el contexto de conversación ambiente como el enrutamiento de canal/grupo, la política de envío o cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP, de modo que una ejecución aislada nueva no pueda heredar la entrega obsoleta o la autoridad de tiempo de ejecución de una ejecución anterior.

---

## Claves de sesión (`sessionKey`)

Una `sessionKey` identifica _en qué cubo de conversación_ te encuentras (enrutamiento + aislamiento).

Patrones comunes:

- Chat principal/directo (por agente): `agent:<agentId>:<mainKey>` (predeterminado `main`)
- Grupo: `agent:<agentId>:<channel>:group:<id>`
- Sala/canal (Discord/Slack): `agent:<agentId>:<channel>:channel:<id>` o `...:room:<id>`
- Cron: `cron:<job.id>`
- Webhook: `hook:<uuid>` (a menos que se anule)

Las reglas canónicas están documentadas en [/concepts/session](/es/concepts/session).

---

## Ids de sesión (`sessionId`)

Cada `sessionKey` apunta a un `sessionId` actual (el archivo de transcripción que continúa la conversación).

Reglas generales:

- **Restablecer** (`/new`, `/reset`) crea un nuevo `sessionId` para ese `sessionKey`.
- **Restablecimiento diario** (predeterminado a las 4:00 AM hora local en el host de la puerta de enlace) crea un nuevo `sessionId` en el siguiente mensaje después del límite de restablecimiento.
- **Expiración por inactividad** (`session.reset.idleMinutes` o el heredado `session.idleMinutes`) crea un nuevo `sessionId` cuando llega un mensaje después de la ventana de inactividad. Cuando se configuran diario + inactividad, gana el que expire primero.
- **Eventos del sistema** (latido, activaciones de cron, notificaciones de ejecución, mantenimiento de la puerta de enlace) pueden mutar la fila de sesión pero no extienden la vigencia del restablecimiento diario/inactivo. La transición por restablecimiento descarta las notificaciones de eventos del sistema en cola para la sesión anterior de que se construya el nuevo prompt.
- **Política de bifurcación principal** utiliza la rama activa de PI al crear un hilo o una bifurcación de subagente. Si esa rama es demasiado grande, OpenClaw inicia el secundario con contexto aislado en lugar de fallar o heredar un historial inutilizable. La política de tamaño es automática; la configuración heredada `session.parentForkMaxTokens` es eliminada por `openclaw doctor --fix`.

Detalle de implementación: la decisión ocurre en `initSessionState()` en `src/auto-reply/reply/session.ts`.

---

## Esquema del almacén de sesión (`sessions.json`)

El tipo de valor del almacén es `SessionEntry` en `src/config/sessions.ts`.

Campos clave (no exhaustivo):

- `sessionId`: id de transcripción actual (el nombre de archivo se deriva de esto a menos que `sessionFile` esté configurado)
- `sessionStartedAt`: marca de tiempo de inicio para el `sessionId` actual; restablecimiento diario
  la frescura usa esto. Las filas heredadas pueden derivarlo del encabezado de la sesión JSONL.
- `lastInteractionAt`: marca de tiempo de la última interacción real de usuario/canal; restablecimiento por inactividad
  la frescura usa esto para que los eventos de latido, cron y ejecución no mantengan las sesiones
  vivas. Las filas heredadas sin este campo recurren a la hora de inicio de sesión recuperada
  para la frescura por inactividad.
- `updatedAt`: marca de tiempo de la última mutación de fila de almacenamiento, utilizada para listado, poda y
  contabilidad. No es la autoridad para la frescura de restablecimiento diario/inactivo.
- `sessionFile`: anulación opcional de la ruta explícita de la transcripción
- `chatType`: `direct | group | room` (ayuda a las interfaces de usuario y a la política de envío)
- `provider`, `subject`, `room`, `space`, `displayName`: metadatos para el etiquetado de grupo/canal
- Interruptores:
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (anulación por sesión)
- Selección de modelo:
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Contadores de tokens (mejor esfuerzo / dependiente del proveedor):
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: con qué frecuencia se completó la auto-compacción para esta clave de sesión
- `memoryFlushAt`: marca de tiempo de la última descarga de memoria previa a la compactación
- `memoryFlushCompactionCount`: recuento de compactaciones cuando se ejecutó la última descarga

Es seguro editar el almacén, pero la Gateway es la autoridad: puede reescribir o rehidratar las entradas a medida que se ejecutan las sesiones.

---

## Estructura de la transcripción (`*.jsonl`)

Las transcripciones son gestionadas por `@earendil-works/pi-coding-agent`'s `SessionManager`.

El archivo es JSONL:

- Primera línea: encabezado de sesión (`type: "session"`, incluye `id`, `cwd`, `timestamp`, `parentSession` opcional)
- Luego: entradas de sesión con `id` + `parentId` (árbol)

Tipos de entradas notables:

- `message`: mensajes de usuario/asistente/toolResult
- `custom_message`: mensajes inyectados por extensiones que _sí_ entran en el contexto del modelo (pueden ocultarse en la interfaz de usuario)
- `custom`: estado de la extensión que _no_ entra en el contexto del modelo
- `compaction`: resumen de compactación persistente con `firstKeptEntryId` y `tokensBefore`
- `branch_summary`: resumen persistente al navegar por una rama del árbol

OpenClaw intencionalmente **no** "corrige" las transcripciones; el Gateway usa `SessionManager` para leerlas/escribirlas.

---

## Ventanas de contexto frente a tokens rastreados

Importan dos conceptos diferentes:

1. **Ventana de contexto del modelo**: límite estricto por modelo (tokens visibles para el modelo)
2. **Contadores del almacén de sesiones**: estadísticas acumuladas escritas en `sessions.json` (usadas para /status y tableros)

Si estás ajustando los límites:

- La ventana de contexto proviene del catálogo de modelos (y se puede anular mediante configuración).
- `contextTokens` en el almacén es un valor estimado/informativo en tiempo de ejecución; no lo trate como una garantía estricta.

Para más información, consulte [/token-use](/es/reference/token-use).

---

## Compactación: qué es

La compactación resume la conversación anterior en una entrada persistente `compaction` en la transcripción y mantiene los mensajes recientes intactos.

Después de la compactación, los turnos futuros ven:

- El resumen de compactación
- Mensajes después de `firstKeptEntryId`

La compactación es **persistente** (a diferencia de la poda de sesiones). Consulte [/concepts/session-pruning](/es/concepts/session-pruning).

## Límites de los fragmentos de compactación y emparejamiento de herramientas

Cuando OpenClaw divide una transcripción larga en fragmentos de compactación, mantiene las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes.

- Si la división por porción de tokens cae entre una llamada a herramienta y su resultado, OpenClaw
  desplaza el límite hacia el mensaje de llamada a herramienta del asistente en lugar de separar
  el par.
- Si un bloque de resultado de herramienta al final pudiera hacer que el fragmento supere el objetivo,
  OpenClaw preserva ese bloque de herramienta pendiente y mantiene la cola no resumida
  intacta.
- Los bloques de llamadas a herramientas abortadas/erróneas no mantienen una división pendiente abierta.

---

## Cuándo ocurre la auto-compactación (tiempo de ejecución de Pi)

En el agente Pi integrado, la auto-compactación se activa en dos casos:

1. **Recuperación de desbordamiento**: el modelo devuelve un error de desbordamiento de contexto
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, y variantes similares del proveedor) → compactar → reintentar.
2. **Mantenimiento del umbral**: después de un turno exitoso, cuando:

`contextTokens > contextWindow - reserveTokens`

Donde:

- `contextWindow` es la ventana de contexto del modelo
- `reserveTokens` es el margen reservado para los prompts + la siguiente salida del modelo

Estas son las semánticas del tiempo de ejecución de Pi (OpenClaw consume los eventos, pero Pi decide cuándo compactar).

OpenClaw también puede activar una compactación local previa al vuelo antes de abrir la siguiente
ejecución cuando `agents.defaults.compaction.maxActiveTranscriptBytes` está establecido y el
archivo de transcripción activo alcanza ese tamaño. Esta es una protección de tamaño de archivo para el
costo de reapertura local, no para archivo sin procesar: OpenClaw todavía ejecuta la compactación semántica normal,
y requiere `truncateAfterCompaction` para que el resumen compactado pueda convertirse en
una nueva transcripción sucesora.

Para ejecuciones de Pi integradas, `agents.defaults.compaction.midTurnPrecheck.enabled: true`
añade una protección opcional de bucle de herramientas. Después de que se anexa un resultado de herramienta y antes de la
siguiente llamada al modelo, OpenClaw estima la presión del mensaje utilizando la misma lógica de
presupuesto previa al vuelo utilizada al inicio del turno. Si el contexto ya no cabe, la protección no
compacta dentro del enlace `transformContext` de Pi. Genera una señal estructurada
de preverificación a mitad de turno, detiene el envío del mensaje actual y permite que el
bucle de ejecución externo utilice la ruta de recuperación existente: truncar resultados de herramientas excesivamente grandes
cuando eso sea suficiente, o activar el modo de compactación configurado y reintentar. La
opción está desactivada por defecto y funciona con ambos modos de compactación `default` y `safeguard`
incluida la compactación de seguridad respaldada por el proveedor.
Esto es independiente de `maxActiveTranscriptBytes`: la protección de tamaño en bytes se ejecuta
antes de que se abra un turno, mientras que la preverificación a mitad de turno se ejecuta más tarde en el bucle de herramientas de Pi integrado
después de que se han anexado nuevos resultados de herramientas.

---

## Configuración de compactación (`reserveTokens`, `keepRecentTokens`)

La configuración de compactación de Pi reside en la configuración de Pi:

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw también impone un suelo de seguridad para las ejecuciones integradas:

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw lo incrementa.
- El suelo predeterminado es `20000` tokens.
- Establezca `agents.defaults.compaction.reserveTokensFloor: 0` para desactivar el suelo.
- Si ya es más alto, OpenClaw lo deja como está.
- La `/compact` manual respeta un `agents.defaults.compaction.keepRecentTokens`
  explícito y mantiene el punto de corte de la cola reciente de Pi. Sin un presupuesto de mantenimiento explícito,
  la compactación manual sigue siendo un punto de control fijo y el contexto reconstruido comienza desde
  el nuevo resumen.
- Establezca `agents.defaults.compaction.midTurnPrecheck.enabled: true` para ejecutar la
  preverificación opcional del bucle de herramientas después de nuevos resultados de herramientas y antes de la siguiente llamada
  al modelo. Esto es solo un disparador; la generación del resumen todavía utiliza la ruta de
  compactación configurada. Es independiente de `maxActiveTranscriptBytes`, que es una
  protección de tamaño en bytes de la transcripción activa al inicio del turno.
- Establezca `agents.defaults.compaction.maxActiveTranscriptBytes` en un valor de bytes o
  una cadena como `"20mb"` para ejecutar la compactación local antes de un turno cuando la transcripción
  activa se vuelva grande. Esta protección está activa solo cuando
  `truncateAfterCompaction` también está habilitado. Déjelo sin establecer o establezca `0` para
  desactivarlo.
- Cuando `agents.defaults.compaction.truncateAfterCompaction` está habilitado,
  OpenClaw rota la transcripción activa a un sucesor JSONL compactado después de
  la compactación. La transcripción completa antigua permanece archivada y vinculada desde el
  punto de control de compactación en lugar de ser reescrita en su lugar.

Por qué: dejar suficiente espacio para el "mantenimiento" de varios turnos (como las escrituras de memoria) antes de que la compactación se vuelva inevitable.

Implementación: `ensurePiCompactionReserveTokens()` en `src/agents/pi-settings.ts`
(llamado desde `src/agents/pi-embedded-runner.ts`).

---

## Proveedores de compactación conectables

Los complementos pueden registrar un proveedor de compactación a través de `registerCompactionProvider()` en la API de complementos. Cuando `agents.defaults.compaction.provider` se establece en un id de proveedor registrado, la extensión de protección delega el resumen a ese proveedor en lugar de a la canalización `summarizeInStages` integrada.

- `provider`: id de un complemento proveedor de compactación registrado. Déjelo sin establecer para el resumen de LLM predeterminado.
- Establecer un `provider` fuerza `mode: "safeguard"`.
- Los proveedores reciben las mismas instrucciones de compactación y la política de preservación de identificadores que la ruta integrada.
- El mecanismo de seguridad sigue preservando el contexto de sufijo de turno reciente y turno dividido después de la salida del proveedor.
- El mecanismo de seguridad de resumen integrado redestila los resúmenes anteriores con nuevos mensajes
  en lugar de preservar el resumen anterior completo palabra por palabra.
- El modo de protección habilita las auditorías de calidad de resumen de forma predeterminada; establezca
  `qualityGuard.enabled: false` para omitir el comportamiento de reintento en caso de salida con formato incorrecto.
- Si el proveedor falla o devuelve un resultado vacío, OpenClaw recurre automáticamente al resumen de LLM integrado.
- Las señales de anulación/tiempo de espera se vuelven a lanzar (no se tragan) para respetar la cancelación de quien llama.

Fuente: `src/plugins/compaction-provider.ts`, `src/agents/pi-hooks/compaction-safeguard.ts`.

---

## Superficies visibles para el usuario

Puede observar la compactación y el estado de la sesión a través de:

- `/status` (en cualquier sesión de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Registros de la puerta de enlace (`pnpm gateway:watch` o `openclaw logs --follow`): `embedded run auto-compaction start` + `complete`
- Modo detallado: `🧹 Auto-compaction complete` + recuento de compactación

---

## Mantenimiento silencioso (`NO_REPLY`)

OpenClaw admite turnos "silenciosos" para tareas en segundo plano donde el usuario no debe ver el resultado intermedio.

Convención:

- El asistente inicia su resultado con el token silencioso exacto `NO_REPLY` /
  `no_reply` para indicar "no entregar una respuesta al usuario".
- OpenClaw elimina/suprime esto en la capa de entrega.
- La supresión exacta de tokens silenciosos no distingue entre mayúsculas y minúsculas, por lo que `NO_REPLY` y
  `no_reply` cuentan ambos cuando toda la carga útil es solo el token silencioso.
- Esto es solo para turnos de fondo verdaderos/sin entrega; no es un atajo para
  solicitudes de usuario accionables ordinarias.

A partir de `2026.1.10`, OpenClaw también suprime el **streaming de borrador/escribiendo** cuando un
parcial comienza con `NO_REPLY`, para que las operaciones silenciosas no filtren una salida parcial a mitad de turno.

---

## "Vaciamiento de memoria" pre-compactación (implementado)

Objetivo: antes de que ocurra la auto-compacción, ejecutar un turno agente silencioso que escriba un estado duradero en el disco (por ejemplo, `memory/YYYY-MM-DD.md` en el espacio de trabajo del agente) para que la compactación no pueda borrar el contexto crítico.

OpenClaw utiliza el enfoque de **vaciamiento previo al umbral**:

1. Monitorear el uso del contexto de la sesión.
2. Cuando cruza un "umbral suave" (por debajo del umbral de compactación de Pi), ejecuta una directiva silenciosa de "escribir memoria ahora" al agente.
3. Use el token silencioso exacto `NO_REPLY` / `no_reply` para que el usuario no vea
   nada.

Configuración (`agents.defaults.compaction.memoryFlush`):

- `enabled` (predeterminado: `true`)
- `model` (anulación opcional exacta de proveedor/modelo para el turno de descarga, por ejemplo `ollama/qwen3:8b`)
- `softThresholdTokens` (predeterminado: `4000`)
- `prompt` (mensaje de usuario para el turno de descarga)
- `systemPrompt` (prompt del sistema adicional añadido para el turno de descarga)

Notas:

- El prompt del sistema predeterminado incluye una sugerencia `NO_REPLY` para suprimir
  la entrega.
- Cuando se establece `model`, el turno de descarga usa ese modelo sin heredar la cadena de reserva de la sesión activa, por lo que el mantenimiento solo local no vuelve silenciosamente a un modelo de conversación de pago.
- La descarga se ejecuta una vez por ciclo de compactación (rastreado en `sessions.json`).
- El flush se ejecuta solo para sesiones Pi integradas (los backends CLI lo omiten).
- La descarga se omite cuando el espacio de trabajo de la sesión es de solo lectura (`workspaceAccess: "ro"` o `"none"`).
- Consulte [Memory](/es/concepts/memory) para ver el diseño de archivos del espacio de trabajo y los patrones de escritura.

Pi también expone un enlace `session_before_compact` en la API de extensiones, pero la lógica de descarga de OpenClaw reside hoy en el lado de Gateway.

---

## Lista de verificación de solución de problemas

- ¿Clave de sesión incorrecta? Comience con [/concepts/session](/es/concepts/session) y confirme el `sessionKey` en `/status`.
- ¿Incoherencia entre el almacén y la transcripción? Confirme el host de Gateway y la ruta del almacén desde `openclaw status`.
- ¿Spam de compactación? Comprueba:
  - ventana de contexto del modelo (demasiado pequeña)
  - configuración de compactación (`reserveTokens` demasiado alta para la ventana del modelo puede causar una compactación anterior)
  - hinchazón de resultados de herramientas: habilita/ajusta la poda de la sesión
- ¿Filtrando turnos silenciosos? Confirme que la respuesta comienza con `NO_REPLY` (token exacto sin distinción de mayúsculas y minúsculas) y que está en una compilación que incluye la corrección de supresión de transmisión.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
- [Motor de contexto](/es/concepts/context-engine)
