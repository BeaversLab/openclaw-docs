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

- [/concepts/session](/en/concepts/session)
- [/concepts/compaction](/en/concepts/compaction)
- [/concepts/memory](/en/concepts/memory)
- [/concepts/memory-search](/en/concepts/memory-search)
- [/concepts/session-pruning](/en/concepts/session-pruning)
- [/reference/transcript-hygiene](/en/reference/transcript-hygiene)

---

## Fuente de verdad: el Gateway

OpenClaw está diseñado en torno a un único **proceso Gateway** que posee el estado de la sesión.

- Las interfaces de usuario (aplicación macOS, interfaz de control web, TUI) deben consultar al Gateway para obtener listas de sesiones y recuentos de tokens.
- En modo remoto, los archivos de sesión se encuentran en el host remoto; "verificar sus archivos locales de Mac" no reflejará lo que el Gateway está utilizando.

---

## Dos capas de persistencia

OpenClaw persiste las sesiones en dos capas:

1. **Almacén de sesiones (`sessions.json`)**
   - Mapa de clave/valor: `sessionKey -> SessionEntry`
   - Pequeño, mutable, seguro para editar (o eliminar entradas)
   - Rastrea los metadatos de la sesión (id de sesión actual, última actividad, interruptores, contadores de tokens, etc.)

2. **Transcripción (`<sessionId>.jsonl`)**
   - Transcripción de solo adición con estructura de árbol (las entradas tienen `id` + `parentId`)
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

## Mantenimiento del almacén y controles de disco

La persistencia de la sesión tiene controles de mantenimiento automático (`session.maintenance`) para `sessions.json` y artefactos de transcripción:

- `mode`: `warn` (predeterminado) o `enforce`
- `pruneAfter`: límite de edad de entrada obsoleta (predeterminado `30d`)
- `maxEntries`: límite de entradas en `sessions.json` (predeterminado `500`)
- `rotateBytes`: rotar `sessions.json` cuando sea demasiado grande (predeterminado `10mb`)
- `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>` (predeterminado: igual que `pruneAfter`; `false` desactiva la limpieza)
- `maxDiskBytes`: presupuesto opcional del directorio de sesiones
- `highWaterBytes`: objetivo opcional después de la limpieza (predeterminado `80%` de `maxDiskBytes`)

Orden de aplicación para la limpieza del presupuesto de disco (`mode: "enforce"`):

1. Eliminar primero los artefactos de transcripción archivados o huérfanos más antiguos.
2. Si aún está por encima del objetivo, expulsar las entradas de sesión más antiguas y sus archivos de transcripción.
3. Continuar hasta que el uso esté en o por debajo de `highWaterBytes`.

En `mode: "warn"`, OpenClaw informa las posibles expulsiones pero no modifica el almacenamiento/archivos.

Ejecutar mantenimiento bajo demanda:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sesiones de Cron y registros de ejecución

Las ejecuciones de Cron aisladas también crean entradas de sesión/transcripciones, y tienen controles de retención dedicados:

- `cron.sessionRetention` (predeterminado `24h`) poda las sesiones de ejecución de Cron aisladas antiguas del almacenamiento de sesión (`false` desactiva).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` podan los archivos `~/.openclaw/cron/runs/<jobId>.jsonl` (predeterminados: `2_000_000` bytes y `2000` líneas).

---

## Claves de sesión (`sessionKey`)

Una `sessionKey` identifica _en qué cubo de conversación_ se está (enrutamiento + aislamiento).

Patrones comunes:

- Chat principal/directo (por agente): `agent:<agentId>:<mainKey>` (predeterminado `main`)
- Grupo: `agent:<agentId>:<channel>:group:<id>`
- Sala/canal (Discord/Slack): `agent:<agentId>:<channel>:channel:<id>` o `...:room:<id>`
- Cron: `cron:<job.id>`
- Webhook: `hook:<uuid>` (a menos que se anule)

Las reglas canónicas están documentadas en [/concepts/session](/en/concepts/session).

---

## Ids de sesión (`sessionId`)

Cada `sessionKey` apunta a un `sessionId` actual (el archivo de transcripción que continúa la conversación).

Reglas generales:

- **Reset** (`/new`, `/reset`) crea un nuevo `sessionId` para ese `sessionKey`.
- **Daily reset** (por defecto a las 4:00 AM hora local en el host de la puerta de enlace) crea un nuevo `sessionId` en el siguiente mensaje después del límite de restablecimiento.
- **Idle expiry** (`session.reset.idleMinutes` o heredado `session.idleMinutes`) crea un nuevo `sessionId` cuando llega un mensaje después de la ventana de inactividad. Cuando se configuran tanto daily + idle, gana el que expire primero.
- **Thread parent fork guard** (`session.parentForkMaxTokens`, por defecto `100000`) omite la bifurcación de la transcripción padre cuando la sesión padre ya es demasiado grande; el nuevo hilo comienza desde cero. Establezca `0` para desactivar.

Detalle de implementación: la decisión ocurre en `initSessionState()` en `src/auto-reply/reply/session.ts`.

---

## Esquema del almacén de sesiones (`sessions.json`)

El tipo de valor del almacén es `SessionEntry` en `src/config/sessions.ts`.

Campos clave (no exhaustivo):

- `sessionId`: id de transcripción actual (el nombre de archivo se deriva de este a menos que se establezca `sessionFile`)
- `updatedAt`: marca de tiempo de la última actividad
- `sessionFile`: anulación opcional explícita de la ruta de la transcripción
- `chatType`: `direct | group | room` (ayuda a las UI y a la política de envío)
- `provider`, `subject`, `room`, `space`, `displayName`: metadatos para el etiquetado de grupo/canal
- Interruptores:
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (anulación por sesión)
- Selección de modelo:
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Contadores de tokens (mejor esfuerzo / dependiente del proveedor):
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: con qué frecuencia se completó la compactación automática para esta clave de sesión
- `memoryFlushAt`: marca de tiempo de la última limpieza de memoria previa a la compactación
- `memoryFlushCompactionCount`: recuento de compactación cuando se ejecutó la última limpieza

Es seguro editar el almacenamiento, pero la Gateway es la autoridad: puede reescribir o rehidratar las entradas a medida que se ejecutan las sesiones.

---

## Estructura de la transcripción (`*.jsonl`)

Las transcripciones son administradas por `SessionManager` de `@mariozechner/pi-coding-agent`.

El archivo es JSONL:

- Primera línea: encabezado de sesión (`type: "session"`, incluye `id`, `cwd`, `timestamp`, `parentSession` opcional)
- Luego: entradas de sesión con `id` + `parentId` (árbol)

Tipos de entrada notables:

- `message`: mensajes de usuario/asistente/toolResult
- `custom_message`: mensajes inyectados por extensión que _sí_ entran en el contexto del modelo (pueden ocultarse de la interfaz de usuario)
- `custom`: estado de la extensión que _no_ entra en el contexto del modelo
- `compaction`: resumen de compactación persistente con `firstKeptEntryId` y `tokensBefore`
- `branch_summary`: resumen persistente al navegar por una rama del árbol

OpenClaw intencionalmente **no** "corrige" las transcripciones; la Gateway usa `SessionManager` para leer/escribirlas.

---

## Ventanas de contexto frente a tokens rastreados

Importan dos conceptos diferentes:

1. **Ventana de contexto del modelo**: límite máximo por modelo (tokens visibles para el modelo)
2. **Contadores del almacenamiento de sesiones**: estadísticas continuas escritas en `sessions.json` (usadas para /status y paneles)

Si estás ajustando los límites:

- La ventana de contexto proviene del catálogo de modelos (y puede anularse mediante configuración).
- `contextTokens` en el almacenamiento es un valor estimado/de informe en tiempo de ejecución; no lo trates como una garantía estricta.

Para más información, consulte [/token-use](/en/reference/token-use).

---

## Compactación: qué es

La compactación resume la conversación anterior en una entrada persistente `compaction` en la transcripción y mantiene los mensajes recientes intactos.

Después de la compactación, los turnos futuros ven:

- El resumen de compactación
- Mensajes después de `firstKeptEntryId`

La compactación es **persistente** (a diferencia de la poda de sesiones). Consulte [/concepts/session-pruning](/en/concepts/session-pruning).

## Límites de los fragmentos de compactación y emparejamiento de herramientas

Cuando OpenClaw divide una transcripción larga en fragmentos de compactación, mantiene
las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes.

- Si la división del porcentaje de tokens cae entre una llamada a herramienta y su resultado, OpenClaw
  desplaza el límite hacia el mensaje de llamada a herramienta del asistente en lugar de separar
  el par.
- Si un bloque de resultado de herramienta final empujara el fragmento por encima del objetivo,
  OpenClaw preserva ese bloque de herramientas pendiente y mantiene la cola no resumida
  intacta.
- Los bloques de llamadas a herramientas abortados/errores no mantienen abierta una división pendiente.

---

## Cuándo ocurre la auto-compactación (tiempo de ejecución de Pi)

En el agente Pi integrado, la auto-compactación se activa en dos casos:

1. **Recuperación de desbordamiento**: el modelo devuelve un error de desbordamiento de contexto
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, y variantes similares moldeadas por el proveedor) → compactar → reintentar.
2. **Mantenimiento del umbral**: después de un turno exitoso, cuando:

`contextTokens > contextWindow - reserveTokens`

Donde:

- `contextWindow` es la ventana de contexto del modelo
- `reserveTokens` es el margen reservado para los mensajes + la siguiente salida del modelo

Estas son semánticas del tiempo de ejecución de Pi (OpenClaw consume los eventos, pero Pi decide cuándo compactar).

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

OpenClaw también impone un límite de seguridad para las ejecuciones integradas:

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw lo incrementa.
- El límite predeterminado es `20000` tokens.
- Establezca `agents.defaults.compaction.reserveTokensFloor: 0` para desactivar el límite.
- Si ya es más alto, OpenClaw lo deja como está.

Por qué: dejar suficiente espacio para tareas de “mantenimiento” de múltiples turnos (como escrituras en memoria) antes de que la compactación sea inevitable.

Implementación: `ensurePiCompactionReserveTokens()` en `src/agents/pi-settings.ts`
(llamado desde `src/agents/pi-embedded-runner.ts`).

---

## Superficies visibles para el usuario

Puede observar la compactación y el estado de la sesión a través de:

- `/status` (en cualquier sesión de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Modo detallado: `🧹 Auto-compaction complete` + recuento de compactación

---

## Mantenimiento silencioso (`NO_REPLY`)

OpenClaw admite turnos “silenciosos” para tareas en segundo plano donde el usuario no debe ver el resultado intermedio.

Convención:

- El asistente inicia su resultado con el token silencioso exacto `NO_REPLY` /
  `no_reply` para indicar “no entregar una respuesta al usuario”.
- OpenClaw elimina/suprime esto en la capa de entrega.
- La supresión exacta del token silencioso no distingue entre mayúsculas y minúsculas, por lo que `NO_REPLY` y
  `no_reply` cuentan cuando toda la carga es solo el token silencioso.
- Esto es solo para turnos verdaderamente en segundo plano/sin entrega; no es un atajo para
  solicitudes de usuario ordinarias accionables.

A partir de `2026.1.10`, OpenClaw también suprime el **streaming de borrador/escritura** cuando un
fragmento parcial comienza con `NO_REPLY`, para que las operaciones silenciosas no filtren resultados
parciales a mitad del turno.

---

## “Limpieza de memoria” previa a la compactación (implementado)

Objetivo: antes de que ocurra la auto-compactación, ejecutar un turno agente silencioso que escriba un estado
duradero en el disco (p. ej. `memory/YYYY-MM-DD.md` en el espacio de trabajo del agente) para que la compactación no pueda
borrar el contexto crítico.

OpenClaw utiliza el enfoque de **limpieza previa al umbral**:

1. Supervisar el uso del contexto de la sesión.
2. Cuando cruza un “umbral suave” (por debajo del umbral de compactación de Pi), ejecute una directiva silenciosa de "escribir memoria ahora" al agente.
3. Use el token silencioso exacto `NO_REPLY` / `no_reply` para que el usuario no vea nada.

Configuración (`agents.defaults.compaction.memoryFlush`):

- `enabled` (predeterminado: `true`)
- `softThresholdTokens` (predeterminado: `4000`)
- `prompt` (mensaje de usuario para el turno de vaciado)
- `systemPrompt` (prompt del sistema adicional añadido para el turno de vaciado)

Notas:

- El prompt del sistema por defecto incluye una pista `NO_REPLY` para suprimir la entrega.
- El vaciado se ejecuta una vez por ciclo de compactación (rastreado en `sessions.json`).
- El vaciado se ejecuta solo para sesiones de Pi integradas.
- Se omite el vaciado cuando el espacio de trabajo de la sesión es de solo lectura (`workspaceAccess: "ro"` o `"none"`).
- Consulte [Memoria](/en/concepts/memory) para conocer el diseño de archivos del espacio de trabajo y los patrones de escritura.

Pi también expone un gancho `session_before_compact` en la API de extensiones, pero la lógica de vaciado de OpenClaw vive hoy en el lado del Gateway.

---

## Lista de verificación de solución de problemas

- ¿Clave de sesión incorrecta? Comience con [/concepts/session](/en/concepts/session) y confirme el `sessionKey` en `/status`.
- ¿Discrepancia entre el almacén y la transcripción? Confirme el host del Gateway y la ruta del almacén desde `openclaw status`.
- ¿Spam de compactación? Verifique:
  - ventana de contexto del modelo (demasiado pequeña)
  - configuración de compactación (`reserveTokens` demasiado alta para la ventana del modelo puede causar una compactación anterior)
  - hinchazón de resultados de herramientas: habilite/ajuste la poda de sesiones
- ¿Filtración de turnos silenciosos? Confirme que la respuesta comience con `NO_REPLY` (token exacto sin distinción de mayúsculas y minúsculas) y que esté en una compilación que incluya la corrección de supresión de streaming.
