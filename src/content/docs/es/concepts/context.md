---
summary: "Contexto: lo que ve el modelo, cómo se construye y cómo inspeccionarlo"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Contexto"
---

# Contexto

El "contexto" es **todo lo que OpenClaw envía al modelo para una ejecución**. Está limitado por la **ventana de contexto** del modelo (límite de tokens).

Modelo mental para principiantes:

- **Prompt del sistema** (construido por OpenClaw): reglas, herramientas, lista de habilidades, tiempo/ejecución y archivos del espacio de trabajo inyectados.
- **Historial de conversación**: tus mensajes + los mensajes del asistente para esta sesión.
- **Llamadas/resultados de herramientas + archivos adjuntos**: salida de comandos, lecturas de archivos, imágenes/audio, etc.

El contexto _no es lo mismo_ que la "memoria": la memoria se puede almacenar en disco y recargar más tarde; el contexto es lo que está dentro de la ventana actual del modelo.

## Inicio rápido (inspeccionar contexto)

- `/status` → vista rápida de "qué tan llena está mi ventana" + configuración de la sesión.
- `/context list` → lo que se ha inyectado + tamaños aproximados (por archivo + totales).
- `/context detail` → desglose más profundo: por archivo, tamaños de esquema por herramienta, tamaños de entrada por habilidad y tamaño del prompt del sistema.
- `/usage tokens` → añade un pie de página de uso por respuesta a las respuestas normales.
- `/compact` → resume el historial anterior en una entrada compacta para liberar espacio en la ventana.

Consulta también: [Comandos de barra](/en/tools/slash-commands), [Uso de tokens y costes](/en/reference/token-use), [Compactación](/en/concepts/compaction).

## Salida de ejemplo

Los valores varían según el modelo, el proveedor, la política de herramientas y lo que haya en tu espacio de trabajo.

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## Qué cuenta hacia la ventana de contexto

Todo lo que recibe el modelo cuenta, incluyendo:

- Prompt del sistema (todas las secciones).
- Historial de conversación.
- Llamadas a herramientas + resultados de herramientas.
- Archivos adjuntos/transcripciones (imágenes/audio/archivos).
- Resúmenes de compactación y artefactos de poda.
- "Envoltorios" del proveedor o encabezados ocultos (no visibles, pero contados).

## Cómo OpenClaw construye el prompt del sistema

El prompt del sistema es **propiedad de OpenClaw** y se reconstruye en cada ejecución. Incluye:

- Lista de herramientas + descripciones breves.
- Lista de habilidades (solo metadatos; ver más abajo).
- Ubicación del espacio de trabajo.
- Hora (UTC + hora de usuario convertida si está configurado).
- Metadatos de tiempo de ejecución (host/SO/modelo/pensamiento).
- Archivos de arranque del espacio de trabajo inyectados bajo **Project Context**.

Desglose completo: [Prompt del sistema](/en/concepts/system-prompt).

## Archivos del espacio de trabajo inyectados (Project Context)

De forma predeterminada, OpenClaw inyecta un conjunto fijo de archivos del espacio de trabajo (si están presentes):

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en la primera ejecución)

Los archivos grandes se truncarán por archivo usando `agents.defaults.bootstrapMaxChars` (por defecto `20000` caracteres). OpenClaw también impone un límite total de inyección de arranque entre archivos con `agents.defaults.bootstrapTotalMaxChars` (por defecto `150000` caracteres). `/context` muestra los tamaños **sin procesar frente a inyectados** y si se produjo el truncamiento.

Cuando se produce el truncamiento, el tiempo de ejecución puede inyectar un bloque de advertencia en el mensaje bajo Project Context. Configure esto con `agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`; por defecto `once`).

## Habilidades: inyectadas vs cargadas a pedido

El mensaje del sistema incluye una **lista de habilidades** compacta (nombre + descripción + ubicación). Esta lista tiene una sobrecarga real.

Las instrucciones de la habilidad _no_ se incluyen de forma predeterminada. Se espera que el modelo `read` el `SKILL.md` de la habilidad **solo cuando sea necesario**.

## Herramientas: hay dos costes

Las herramientas afectan el contexto de dos maneras:

1. **Texto de la lista de herramientas** en el mensaje del sistema (lo que ves como "Tooling").
2. **Esquemas de herramientas** (JSON). Estos se envían al modelo para que pueda llamar a las herramientas. Cuentan para el contexto aunque no los veas como texto sin formato.

`/context detail` desglosa los esquemas de herramientas más grandes para que puedas ver lo que domina.

## Comandos, directivas y "atajos en línea"

Los comandos de barra son manejados por el Gateway. Hay algunos comportamientos diferentes:

- **Comandos independientes**: un mensaje que solo es `/...` se ejecuta como un comando.
- **Directivas**: `/think`, `/verbose`, `/reasoning`, `/elevated`, `/model`, `/queue` se eliminan antes de que el modelo vea el mensaje.
  - Los mensajes que solo contienen directivas persisten en la configuración de la sesión.
  - Las directivas en línea en un mensaje normal actúan como sugerencias por mensaje.
- **Atajos en línea** (solo remitentes permitidos): ciertos tokens `/...` dentro de un mensaje normal pueden ejecutarse inmediatamente (ejemplo: “hey /status”) y se eliminan antes de que el modelo vea el texto restante.

Detalles: [Comandos de barra](/en/tools/slash-commands).

## Sesiones, compactación y poda (lo que persiste)

Lo que persiste entre mensajes depende del mecanismo:

- **El historial normal** persiste en la transcripción de la sesión hasta que se compacta o se poda por política.
- **La compactación** guarda un resumen en la transcripción y mantiene los mensajes recientes intactos.
- **La poda** elimina los resultados de herramientas antiguos del prompt _en memoria_ de una ejecución, pero no reescribe la transcripción.

Documentación: [Sesión](/en/concepts/session), [Compactación](/en/concepts/compaction), [Poda de sesión](/en/concepts/session-pruning).

De forma predeterminada, OpenClaw utiliza el motor de contexto `legacy` integrado para el ensamblaje y la compactación. Si instalas un complemento que proporciona `kind: "context-engine"` y lo seleccionas con `plugins.slots.contextEngine`, OpenClaw delega el ensamblaje de contexto, `/compact` y los enlaces del ciclo de vida del contexto de subagentes relacionados a ese motor en su lugar. `ownsCompaction: false` no vuelve automáticamente al motor heredado; el motor activo aún debe implementar `compact()` correctamente. Consulta [Context Engine](/en/concepts/context-engine) para obtener la interfaz conectable completa, los enlaces del ciclo de vida y la configuración.

## Lo que `/context` realmente reporta

`/context` prefiere el informe más reciente del prompt del sistema **construido en la ejecución** cuando está disponible:

- `System prompt (run)` = capturado de la última ejecución integrada (con capacidad de herramientas) y persistido en el almacén de sesiones.
- `System prompt (estimate)` = calculado al vuelo cuando no existe un informe de ejecución (o al ejecutarse a través de un backend de CLI que no genera el informe).

De cualquier manera, reporta los tamaños y los principales contribuyentes; **no** vuelca el prompt del sistema completo ni los esquemas de herramientas.
