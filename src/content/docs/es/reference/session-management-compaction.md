---
summary: "Análisis en profundidad: almacén de sesiones + transcripciones, ciclo de vida e internos de (auto)compactación"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Gestión de Sesiones en Profundidad"
---

# Gestión de Sesiones y Compactación (Análisis en Profundidad)

Este documento explica cómo OpenClaw gestiona las sesiones de extremo a extremo:

- **Enrutamiento de sesiones** (cómo los mensajes entrantes se asignan a una `sessionKey`)
- **Almacén de sesiones** (`sessions.json`) y lo que rastrea
- **Persistencia de transcripciones** (`*.jsonl`) y su estructura
- **Higiene de transcripciones** (arreglos específicos del proveedor antes de las ejecuciones)
- **Límites de contexto** (ventana de contexto frente a tokens rastreados)
- **Compactación** (manual + auto-compactación) y dónde enganchar el trabajo de pre-compactación
- **Mantenimiento silencioso** (por ejemplo, escrituras en memoria que no deben generar salida visible para el usuario)

Si primero desea una descripción general de alto nivel, comience con:

- [/concepts/session](/es/concepts/session)
- [/concepts/compaction](/es/concepts/compaction)
- [/concepts/session-pruning](/es/concepts/session-pruning)
- [/reference/transcript-hygiene](/es/reference/transcript-hygiene)

---

## Fuente de verdad: el Gateway

OpenClaw está diseñado en torno a un único **proceso Gateway** que posee el estado de la sesión.

- Las interfaces de usuario (aplicación macOS, interfaz de control web, TUI) deben consultar al Gateway para obtener listas de sesiones y recuentos de tokens.
- En modo remoto, los archivos de sesión se encuentran en el host remoto; "verificar sus archivos locales de Mac" no reflejará lo que el Gateway está utilizando.

---

## Dos capas de persistencia

OpenClaw persiste las sesiones en dos capas:

1. **Almacén de sesiones (`sessions.json`)**
   - Mapa clave/valor: `sessionKey -> SessionEntry`
   - Pequeño, mutable, seguro para editar (o eliminar entradas)
   - Rastrea los metadatos de la sesión (id de sesión actual, última actividad, interruptores, contadores de tokens, etc.)

2. **Transcripción (`<sessionId>.jsonl`)**
   - Transcripción de solo anexado con estructura de árbol (las entradas tienen `id` + `parentId`)
   - Almacena la conversación real + llamadas a herramientas + resúmenes de compactación
   - Se utiliza para reconstruir el contexto del modelo para turnos futuros

---

## Ubicaciones en disco

Por agente, en el host del Gateway:

- Almacén: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripciones: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sesiones de temas de Telegram: `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw resuelve estos a través de `src/config/sessions.ts`.

---

## Mantenimiento del almacenamiento y controles de disco

La persistencia de la sesión tiene controles de mantenimiento automático (`session.maintenance`) para `sessions.json` y artefactos de transcripción:

- `mode`: `warn` (predeterminado) o `enforce`
- `pruneAfter`: límite de antigüedad de entradas obsoletas (predeterminado `30d`)
- `maxEntries`: límite de entradas en `sessions.json` (predeterminado `500`)
- `rotateBytes`: rotar `sessions.json` cuando sea demasiado grande (predeterminado `10mb`)
- `resetArchiveRetention`: retención para archivos de transcripción `*.reset.<timestamp>` (predeterminado: igual que `pruneAfter`; `false` deshabilita la limpieza)
- `maxDiskBytes`: presupuesto opcional del directorio de sesiones
- `highWaterBytes`: objetivo opcional después de la limpieza (predeterminado `80%` de `maxDiskBytes`)

Orden de aplicación para la limpieza del presupuesto de disco (`mode: "enforce"`):

1. Elimine primero los artefactos de transcripción archivados o huérfanos más antiguos.
2. Si todavía está por encima del objetivo, desaloje las entradas de sesión más antiguas y sus archivos de transcripción.
3. Continúe hasta que el uso esté en o por debajo de `highWaterBytes`.

En `mode: "warn"`, OpenClaw informa posibles desalojos pero no modifica el almacenamiento/archivos.

Ejecutar mantenimiento bajo demanda:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sesiones de Cron y registros de ejecución

Las ejecuciones de Cron aisladas también crean entradas de sesión/transcripciones, y tienen controles de retención dedicados:

- `cron.sessionRetention` (predeterminado `24h`) elimina las sesiones de ejecución de Cron aisladas antiguas del almacén de sesiones (`false` deshabilita).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` eliminan archivos `~/.openclaw/cron/runs/<jobId>.jsonl` (predeterminados: `2_000_000` bytes y `2000` líneas).

---

## Claves de sesión (`sessionKey`)

Un `sessionKey` identifica _en qué cubo de conversación_ estás (enrutamiento + aislamiento).

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

- **Restablecer** (`/new`, `/reset`) crea un nuevo `sessionId` para ese `sessionKey`.
- **Restablecimiento diario** (por defecto a las 4:00 AM hora local en el host de la puerta de enlace) crea un nuevo `sessionId` en el siguiente mensaje después del límite de restablecimiento.
- **Expiración por inactividad** (`session.reset.idleMinutes` o heredado `session.idleMinutes`) crea un nuevo `sessionId` cuando llega un mensaje después de la ventana de inactividad. Cuando se configuran tanto diario como inactividad, gana el que expire primero.
- **Protección de bifurcación del hilo principal** (`session.parentForkMaxTokens`, por defecto `100000`) omite la bifurcación de la transcripción principal cuando la sesión principal ya es demasiado grande; el nuevo hilo comienza desde cero. Establezca `0` para desactivar.

Detalle de implementación: la decisión ocurre en `initSessionState()` en `src/auto-reply/reply/session.ts`.

---

## Esquema del almacén de sesiones (`sessions.json`)

El tipo de valor del almacén es `SessionEntry` en `src/config/sessions.ts`.

Campos clave (no exhaustivo):

- `sessionId`: id de transcripción actual (el nombre del archivo se deriva de esto a menos que se establezca `sessionFile`)
- `updatedAt`: marca de tiempo de la última actividad
- `sessionFile`: anulación opcional explícita de la ruta de la transcripción
- `chatType`: `direct | group | room` (ayuda a las interfaces de usuario y a la política de envío)
- `provider`, `subject`, `room`, `space`, `displayName`: metadatos para el etiquetado de grupo/canal
- Interruptores:
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (anulación por sesión)
- Selección de modelo:
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Contadores de tokens (mejor esfuerzo / dependientes del proveedor):
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: frecuencia con la que se completó la autocompactación para esta clave de sesión
- `memoryFlushAt`: marca de tiempo de la última vaciada de memoria previa a la compactación
- `memoryFlushCompactionCount`: recuento de compactación cuando se ejecutó el último vaciado

El almacenamiento es seguro para editar, pero la Gateway es la autoridad: puede reescribir o rehidratar las entradas a medida que se ejecutan las sesiones.

---

## Estructura de la transcripción (`*.jsonl`)

Las transcripciones son administradas por `@mariozechner/pi-coding-agent`'s `SessionManager`.

El archivo es JSONL:

- Primera línea: encabezado de sesión (`type: "session"`, incluye `id`, `cwd`, `timestamp`, opcional `parentSession`)
- Luego: entradas de sesión con `id` + `parentId` (árbol)

Tipos de entradas notables:

- `message`: mensajes de usuario/asistente/toolResult
- `custom_message`: mensajes inyectados por la extensión que _sí_ entran en el contexto del modelo (pueden ocultarse de la interfaz de usuario)
- `custom`: estado de la extensión que _no_ entra en el contexto del modelo
- `compaction`: resumen de compactación persistente con `firstKeptEntryId` y `tokensBefore`
- `branch_summary`: resumen persistente al navegar por una rama del árbol

OpenClaw intencionalmente **no** “corrige” las transcripciones; el Gateway usa `SessionManager` para leerlas/escribirlas.

---

## Ventanas de contexto vs tokens rastreados

Importan dos conceptos diferentes:

1. **Ventana de contexto del modelo**: límite máximo por modelo (tokens visibles para el modelo)
2. **Contadores del almacén de sesión**: estadísticas acumuladas escritas en `sessions.json` (usadas para /status y tableros)

Si estás ajustando los límites:

- La ventana de contexto proviene del catálogo de modelos (y se puede anular vía configuración).
- `contextTokens` en el almacén es un valor estimado/en tiempo de ejecución; no lo trates como una garantía estricta.

Para más información, consulta [/token-use](/es/reference/token-use).

---

## Compactación: qué es

La compactación resume la conversación anterior en una entrada `compaction` persistida en la transcripción y mantiene los mensajes recientes intactos.

Después de la compactación, los turnos futuros ven:

- El resumen de compactación
- Mensajes después de `firstKeptEntryId`

La compactación es **persistente** (a diferencia de la poda de sesiones). Consulta [/concepts/session-pruning](/es/concepts/session-pruning).

---

## Cuándo ocurre la auto-compactación (runtime Pi)

En el agente Pi integrado, la auto-compactación se activa en dos casos:

1. **Recuperación por desbordamiento**: el modelo devuelve un error de desbordamiento de contexto → compactar → reintentar.
2. **Mantenimiento de umbrales**: después de un turno exitoso, cuando:

`contextTokens > contextWindow - reserveTokens`

Donde:

- `contextWindow` es la ventana de contexto del modelo
- `reserveTokens` es el margen reservado para indicaciones + la siguiente salida del modelo

Estas son las semánticas del runtime Pi (OpenClaw consume los eventos, pero Pi decide cuándo compactar).

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

OpenClaw también impone un límite de seguridad mínimo para ejecuciones integradas:

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw lo aumenta.
- El límite mínimo predeterminado es `20000` tokens.
- Establece `agents.defaults.compaction.reserveTokensFloor: 0` para desactivar el límite mínimo.
- Si ya es más alto, OpenClaw lo deja como está.

Por qué: dejar suficiente margen para el “mantenimiento” de varios turnos (como escrituras en memoria) antes de que la compactación sea inevitable.

Implementación: `ensurePiCompactionReserveTokens()` en `src/agents/pi-settings.ts`
(llamado desde `src/agents/pi-embedded-runner.ts`).

---

## Superficies visibles por el usuario

Puede observar la compactación y el estado de la sesión a través de:

- `/status` (en cualquier sesión de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Modo detallado: `🧹 Auto-compaction complete` + recuento de compactación

---

## Mantenimiento silencioso (`NO_REPLY`)

OpenClaw admite turnos "silenciosos" para tareas en segundo plano donde el usuario no debería ver el resultado intermedio.

Convención:

- El asistente inicia su salida con `NO_REPLY` para indicar "no entregar una respuesta al usuario".
- OpenClaw elimina/suprime esto en la capa de entrega.

A partir de `2026.1.10`, OpenClaw también suprime el **streaming de borrador/escritura** cuando un fragmento parcial comienza con `NO_REPLY`, para que las operaciones silenciosas no filtren salida parcial a mitad de un turno.

---

## "Flush" de memoria de precompactación (implementado)

Objetivo: antes de que ocurra la auto-compactación, ejecutar un turno de agente silencioso que escriba un estado
durable en el disco (p. ej. `memory/YYYY-MM-DD.md` en el espacio de trabajo del agente) para que la compactación no pueda
borrar el contexto crítico.

OpenClaw utiliza el enfoque de **vaciado previo al umbral**:

1. Monitorear el uso del contexto de la sesión.
2. Cuando cruza un "umbral suave" (por debajo del umbral de compactación de Pi), ejecutar una directiva
   silenciosa de "escribir memoria ahora" al agente.
3. Use `NO_REPLY` para que el usuario no vea nada.

Configuración (`agents.defaults.compaction.memoryFlush`):

- `enabled` (predeterminado: `true`)
- `softThresholdTokens` (predeterminado: `4000`)
- `prompt` (mensaje de usuario para el turno de vaciado)
- `systemPrompt` (prompt del sistema adicional añadido para el turno de vaciado)

Notas:

- El prompt del sistema/predeterminado incluye una sugerencia `NO_REPLY` para suprimir la entrega.
- El vaciado se ejecuta una vez por ciclo de compactación (rastreado en `sessions.json`).
- El vaciado solo se ejecuta para sesiones Pi integradas (los backends de CLI lo omiten).
- El flush se omite cuando el espacio de trabajo de la sesión es de solo lectura (`workspaceAccess: "ro"` o `"none"`).
- Consulte [Memory](/es/concepts/memory) para ver el diseño del archivo del espacio de trabajo y los patrones de escritura.

Pi también expone un hook `session_before_compact` en la API de extensión, pero la lógica de flush de OpenClaw reside hoy en el lado del Gateway.

---

## Lista de verificación de solución de problemas

- ¿Clave de sesión incorrecta? Comience con [/concepts/session](/es/concepts/session) y confirme el `sessionKey` en `/status`.
- ¿Incoherencia entre la tienda y la transcripción? Confirme el host del Gateway y la ruta de la tienda desde `openclaw status`.
- ¿Spam de compactación? Compruebe:
  - ventana de contexto del modelo (demasiado pequeña)
  - configuración de compactación (`reserveTokens` demasiado alta para la ventana del modelo puede causar una compactación anterior)
  - hinchazón de tool-result: habilite/ajuste la poda de sesiones
- ¿Fugas de turnos silenciosos? Confirme que la respuesta comienza con `NO_REPLY` (token exacto) y que está en una compilación que incluye la corrección de supresión de transmisión.
