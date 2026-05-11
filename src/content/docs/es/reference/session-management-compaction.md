---
summary: "Análisis en profundidad: almacén de sesiones + transcripciones, ciclo de vida e internos de (auto)compactación"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
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
- [Visión general de la memoria](/es/concepts/memory)
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

---

## Ubicaciones en disco

Por agente, en el host del Gateway:

- Almacenamiento: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripciones: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sesiones de temas de Telegram: `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw resuelve estos a través de `src/config/sessions.ts`.

---

## Mantenimiento del almacén y controles de disco

La persistencia de sesión tiene controles de mantenimiento automático (`session.maintenance`) para `sessions.json` y artefactos de transcripción:

- `mode`: `warn` (predeterminado) o `enforce`
- `pruneAfter`: límite de edad de entradas obsoletas (predeterminado `30d`)
- `maxEntries`: limitar las entradas en `sessions.json` (predeterminado `500`)
- `rotateBytes`: rotar `sessions.json` cuando sea demasiado grande (predeterminado `10mb`)
- `resetArchiveRetention`: retención para archivos de transcripción `*.reset.<timestamp>` (predeterminado: igual que `pruneAfter`; `false` deshabilita la limpieza)
- `maxDiskBytes`: presupuesto opcional del directorio de sesiones
- `highWaterBytes`: objetivo opcional después de la limpieza (predeterminado `80%` de `maxDiskBytes`)

Las escrituras normales del Gateway por lotean la limpieza de `maxEntries` para límites de tamaño de producción, por lo que un almacén puede exceder brevemente el límite configurado antes de que la siguiente limpieza de nivel alto lo reescriba hacia abajo. `openclaw sessions cleanup --enforce` todavía aplica el límite configurado inmediatamente.

Orden de aplicación para la limpieza del presupuesto de disco (`mode: "enforce"`):

1. Eliminar primero los artefactos de transcripción archivados o huérfanos más antiguos.
2. Si todavía está por encima del objetivo, desalojar las entradas de sesión más antiguas y sus archivos de transcripción.
3. Continuar hasta que el uso esté en o por debajo de `highWaterBytes`.

En `mode: "warn"`, OpenClaw informa desalojos potenciales pero no muta el almacén/archivos.

Ejecutar mantenimiento a demanda:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sesiones de Cron y registros de ejecución

Las ejecuciones aisladas de cron también crean entradas de sesión/transcripciones, y tienen controles de retención dedicados:

- `cron.sessionRetention` (por defecto `24h`) poda las antiguas sesiones de ejecución de cron aisladas del almacén de sesiones (`false` desactiva).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan los archivos `~/.openclaw/cron/runs/<jobId>.jsonl` (por defecto: `2_000_000` bytes y `2000` líneas).

Cuando cron fuerza la creación de una nueva sesión de ejecución aislada, sanea la entrada de sesión `cron:<jobId>` anterior antes de escribir la nueva fila. Mantiene preferencias seguras como la configuración de thinking/fast/verbose, etiquetas y anulaciones explícitas de modelo/autenticación seleccionadas por el usuario. Descarta el contexto ambiental de la conversación, como el enrutamiento de canal/grupo, la política de envío o cola, la elevación, el origen y el enlace de tiempo de ejecución de ACP, para que una ejecución aislada nueva no pueda heredar una entrega obsoleta o la autoridad de tiempo de ejecución de una ejecución anterior.

---

## Claves de sesión (`sessionKey`)

Una `sessionKey` identifica _en qué depósito de conversación_ estás (enrutamiento + aislamiento).

Patrones comunes:

- Chat principal/directo (por agente): `agent:<agentId>:<mainKey>` (por defecto `main`)
- Grupo: `agent:<agentId>:<channel>:group:<id>`
- Sala/canal (Discord/Slack): `agent:<agentId>:<channel>:channel:<id>` o `...:room:<id>`
- Cron: `cron:<job.id>`
- Webhook: `hook:<uuid>` (a menos que se anule)

Las reglas canónicas están documentadas en [/concepts/session](/es/concepts/session).

---

## Ids de sesión (`sessionId`)

Cada `sessionKey` apunta a un `sessionId` actual (el archivo de transcripción que continúa la conversación).

Reglas generales:

- **Restablecer** (`/new`, `/reset`) crea un nuevo `sessionId` para esa `sessionKey`.
- **Restablecimiento diario** (por defecto a las 4:00 AM hora local en el host de la puerta de enlace) crea un nuevo `sessionId` en el siguiente mensaje después del límite de restablecimiento.
- **Expiración por inactividad** (`session.reset.idleMinutes` o el heredado `session.idleMinutes`) crea un nuevo `sessionId` cuando llega un mensaje después de la ventana de inactividad. Cuando están configurados tanto el diario como el de inactividad, gana el que expire primero.
- **Eventos del sistema** (latido, despertares de cron, notificaciones de ejecución, mantenimiento de la puerta de enlace) pueden mutar la fila de sesión pero no extienden la frescura del restablecimiento diario/inactivo. La transición del restablecimiento descarta las notificaciones de eventos del sistema en cola para la sesión anterior de que se construya el mensaje nuevo.
- **Guarda de bifurcación del hilo principal** (`session.parentForkMaxTokens`, por defecto `100000`) omite la bifurcación de la transcripción principal cuando la sesión principal ya es demasiado grande; el nuevo hilo comienza de cero. Establezca `0` para desactivar.

Detalle de implementación: la decisión ocurre en `initSessionState()` en `src/auto-reply/reply/session.ts`.

---

## Esquema del almacén de sesiones (`sessions.json`)

El tipo de valor del almacén es `SessionEntry` en `src/config/sessions.ts`.

Campos clave (no exhaustivo):

- `sessionId`: id de transcripción actual (el nombre de archivo se deriva de este a menos que se establezca `sessionFile`)
- `sessionStartedAt`: marca de tiempo de inicio para el `sessionId` actual; la frescura del restablecimiento diario
  usa esto. Las filas heredadas pueden derivarlo del encabezado de sesión JSONL.
- `lastInteractionAt`: marca de tiempo de la última interacción real de usuario/canal; la frescura del restablecimiento por inactividad
  usa esto para que los eventos de latido, cron y exec no mantengan las sesiones
  activas. Las filas heredadas sin este campo recurren a la hora de inicio de sesión recuperada
  para la frescura por inactividad.
- `updatedAt`: marca de tiempo de la última mutación de fila del almacén, utilizada para listar, podar y
  mantenimiento. No es la autoridad para la frescura del restablecimiento diario/inactivo.
- `sessionFile`: anulación opcional explícita de la ruta de transcripción
- `chatType`: `direct | group | room` (ayuda a las interfaces y a la política de envío)
- `provider`, `subject`, `room`, `space`, `displayName`: metadatos para el etiquetado de grupo/canal
- Interruptores:
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (anulación por sesión)
- Selección de modelo:
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Contadores de tokens (mejor esfuerzo / dependientes del proveedor):
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: frecuencia con la que se completó la autocompactación para esta clave de sesión
- `memoryFlushAt`: marca de tiempo para la última limpieza de memoria previa a la compactación
- `memoryFlushCompactionCount`: recuento de compactación cuando se ejecutó la última limpieza

El almacenamiento es seguro para editar, pero el Gateway es la autoridad: puede reescribir o rehidratar las entradas a medida que se ejecutan las sesiones.

---

## Estructura de la transcripción (`*.jsonl`)

Las transcripciones son gestionadas por el `SessionManager` de `@mariozechner/pi-coding-agent`.

El archivo es JSONL:

- Primera línea: encabezado de sesión (`type: "session"`, incluye `id`, `cwd`, `timestamp`, `parentSession` opcional)
- Luego: entradas de sesión con `id` + `parentId` (árbol)

Tipos de entrada notables:

- `message`: mensajes de usuario/asistente/toolResult
- `custom_message`: mensajes inyectados por la extensión que _sí_ entran en el contexto del modelo (pueden ocultarse de la interfaz de usuario)
- `custom`: estado de la extensión que _no_ entra en el contexto del modelo
- `compaction`: resumen de compactación persistente con `firstKeptEntryId` y `tokensBefore`
- `branch_summary`: resumen persistente al navegar por una rama del árbol

OpenClaw intencionalmente **no** "corrige" las transcripciones; el Gateway usa `SessionManager` para leerlas y escribirlas.

---

## Ventanas de contexto frente a tokens rastreados

Importan dos conceptos diferentes:

1. **Ventana de contexto del modelo**: límite duro por modelo (tokens visibles para el modelo)
2. **Contadores del almacén de sesiones**: estadísticas continuas escritas en `sessions.json` (utilizadas para /status y paneles)

Si estás ajustando los límites:

- La ventana de contexto proviene del catálogo de modelos (y se puede anular mediante configuración).
- `contextTokens` en el almacén es un valor estimado/informativo en tiempo de ejecución; no lo trates como una garantía estricta.

Para más información, consulta [/token-use](/es/reference/token-use).

---

## Compactación: qué es

La compactación resume la conversación antigua en una entrada persistente `compaction` en la transcripción y mantiene los mensajes recientes intactos.

Después de la compactación, los turnos futuros ven:

- El resumen de la compactación
- Mensajes después de `firstKeptEntryId`

La compactación es **persistente** (a diferencia de la poda de sesiones). Consulta [/concepts/session-pruning](/es/concepts/session-pruning).

## Límites de los fragmentos de compactación y emparejamiento de herramientas

Cuando OpenClaw divide una transcripción larga en fragmentos de compactación, mantiene
las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes.

- Si la división de la cuota de tokens cae entre una llamada a herramienta y su resultado, OpenClaw
  desplaza el límite hacia el mensaje de llamada a herramienta del asistente en lugar de separar
  el par.
- Si un bloque de resultado de herramienta final empujara el fragmento por encima del objetivo,
  OpenClaw preserva ese bloque de herramienta pendiente y mantiene la cola sin resumir
  intacta.
- Los bloques de llamadas a herramientas abortados/con errores no mantienen una división pendiente abierta.

---

## Cuándo ocurre la autocompactación (tiempo de ejecución de Pi)

En el agente Pi integrado, la autocompactación se activa en dos casos:

1. **Recuperación de desbordamiento**: el modelo devuelve un error de desbordamiento de contexto
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, y variantes similares propias del proveedor) → compactar → reintentar.
2. **Mantenimiento del umbral**: después de un turno exitoso, cuando:

`contextTokens > contextWindow - reserveTokens`

Donde:

- `contextWindow` es la ventana de contexto del modelo
- `reserveTokens` es el margen reservado para los prompts + la siguiente salida del modelo

Estas son las semánticas de tiempo de ejecución de Pi (OpenClaw consume los eventos, pero Pi decide cuándo compactar).

OpenClaw también puede activar una compactación local previa antes de abrir la siguiente
ejecución cuando se establece `agents.defaults.compaction.maxActiveTranscriptBytes` y el
archivo de transcripción activo alcanza ese tamaño. Esta es una protección de tamaño de archivo para el
costo de reapertura local, no para el archivo sin procesar: OpenClaw aún ejecuta la compactación semántica normal,
y requiere `truncateAfterCompaction` para que el resumen compactado pueda convertirse en
una nueva transcripción sucesora.

---

## Configuración de compactación (`reserveTokens`, `keepRecentTokens`)

La configuración de compactación de Pi se encuentra en la configuración de Pi:

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw también impone un límite de seguridad para las ejecuciones integradas:

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw lo aumenta.
- El límite predeterminado es `20000` tokens.
- Establezca `agents.defaults.compaction.reserveTokensFloor: 0` para desactivar el límite.
- Si ya es más alto, OpenClaw lo deja tal como está.
- La `/compact` manual respeta un `agents.defaults.compaction.keepRecentTokens`
  explícito y mantiene el punto de corte de la cola reciente de Pi. Sin un presupuesto de mantenimiento explícito,
  la compactación manual sigue siendo un punto de control fijo y el contexto reconstruido comienza desde
  el nuevo resumen.
- Establezca `agents.defaults.compaction.maxActiveTranscriptBytes` en un valor de bytes o
  una cadena como `"20mb"` para ejecutar la compactación local antes de un turno cuando la
  transcripción activa se vuelve grande. Esta protección solo está activa cuando
  también está habilitado `truncateAfterCompaction`. Déjelo sin establecer o establezca `0` para
  desactivarlo.
- Cuando `agents.defaults.compaction.truncateAfterCompaction` está habilitado,
  OpenClaw rota la transcripción activa a un JSONL sucesor compactado después
  de la compactación. La transcripción completa antigua permanece archivada y vinculada desde
  el punto de control de compactación en lugar de ser reescrita en su lugar.

Por qué: dejar suficiente margen para el "mantenimiento" de varios turnos (como las escrituras en memoria) antes de que la compactación se vuelva inevitable.

Implementación: `ensurePiCompactionReserveTokens()` en `src/agents/pi-settings.ts`
(llamado desde `src/agents/pi-embedded-runner.ts`).

---

## Proveedores de compactación conectables

Los complementos pueden registrar un proveedor de compactación a través de `registerCompactionProvider()` en la API de complementos. Cuando `agents.defaults.compaction.provider` se establece en un id de proveedor registrado, la extensión de protección delega la resumen a ese proveedor en lugar de utilizar la canalización integrada `summarizeInStages`.

- `provider`: id de un complemento proveedor de compactación registrado. Déjelo sin establecer para el resumen predeterminado de LLM.
- Establecer un `provider` fuerza `mode: "safeguard"`.
- Los proveedores reciben las mismas instrucciones de compactación y la política de preservación de identificadores que la ruta integrada.
- La protección aún conserva el contexto de los turnos recientes y el sufijo de turnos divididos después de la salida del proveedor.
- El resumen de protección integrado redestila los resúmenes anteriores con nuevos mensajes
  en lugar de conservar el resumen anterior completo palabra por palabra.
- El modo de protección habilita las auditorías de calidad del resumen de forma predeterminada; establezca
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
- Modo detallado: `🧹 Auto-compaction complete` + recuento de compactación

---

## Mantenimiento silencioso (`NO_REPLY`)

OpenClaw admite turnos "silenciosos" para tareas en segundo plano donde el usuario no debe ver la salida intermedia.

Convención:

- El asistente inicia su salida con el token silencioso exacto `NO_REPLY` /
  `no_reply` para indicar "no entregar una respuesta al usuario".
- OpenClaw elimina/suprime esto en la capa de entrega.
- La supresión exacta del token silencioso no distingue entre mayúsculas y minúsculas, por lo que `NO_REPLY` y
  `no_reply` ambos cuentan cuando la carga útil completa es solo el token silencioso.
- Esto es solo para turnos de verdadero fondo/sin entrega; no es un atajo para
  solicitudes de usuario accionables ordinarias.

A partir de `2026.1.10`, OpenClaw también suprime el **streaming de borrador/escribiendo** cuando un
parcial comienza con `NO_REPLY`, para que las operaciones silenciosas no filtren salida
parcial a mitad del turno.

---

## Vaciamiento de memoria "pre-compresión" (implementado)

Objetivo: antes de que ocurra la auto-compresión, ejecutar un turno agente silencioso que escriba el estado
duradero en disco (por ejemplo, `memory/YYYY-MM-DD.md` en el espacio de trabajo del agente) para que la compresión no pueda
borrar contexto crítico.

OpenClaw utiliza el enfoque de **vaciamiento previo al umbral**:

1. Monitorear el uso del contexto de la sesión.
2. Cuando cruza un "umbral suave" (por debajo del umbral de compresión de Pi), ejecutar una directiva
   silenciosa de "escribir memoria ahora" al agente.
3. Usar el token silencioso exacto `NO_REPLY` / `no_reply` para que el usuario no vea
   nada.

Configuración (`agents.defaults.compaction.memoryFlush`):

- `enabled` (predeterminado: `true`)
- `softThresholdTokens` (predeterminado: `4000`)
- `prompt` (mensaje de usuario para el turno de vaciamiento)
- `systemPrompt` (prompt del sistema adicional añadido para el turno de vaciamiento)

Notas:

- El prompt predeterminado/prompt del sistema incluyen una pista `NO_REPLY` para suprimir
  la entrega.
- El vaciamiento se ejecuta una vez por ciclo de compresión (rastreado en `sessions.json`).
- El vaciamiento se ejecuta solo para sesiones Pi integradas (los backends CLI lo omiten).
- El vaciamiento se omite cuando el espacio de trabajo de la sesión es de solo lectura (`workspaceAccess: "ro"` o `"none"`).
- Consulte [Memoria](/es/concepts/memory) para ver el diseño de archivos del espacio de trabajo y los patrones de escritura.

Pi también expone un hook `session_before_compact` en la API de extensiones, pero la lógica de
vaciamiento de OpenClaw vive hoy en el lado del Gateway.

---

## Lista de verificación de solución de problemas

- ¿Clave de sesión incorrecta? Comience con [/concepts/session](/es/concepts/session) y confirme el `sessionKey` en `/status`.
- ¿Discrepancia entre la tienda y la transcripción? Confirme el host del Gateway y la ruta de la tienda desde `openclaw status`.
- ¿Spam de compresión? Verifique:
  - ventana de contexto del modelo (demasiado pequeña)
  - configuración de compactación (`reserveTokens` demasiado alta para la ventana del modelo puede causar una compactación anterior)
  - inflación de resultados de herramientas: active/ajuste la poda de sesiones
- ¿Fugas de turnos silenciosos? Confirme que la respuesta comienza con `NO_REPLY` (token exacto sin distinción de mayúsculas y minúsculas) y que está en una compilación que incluye la corrección de supresión de transmisión.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
- [Motor de contexto](/es/concepts/context-engine)
