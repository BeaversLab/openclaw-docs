---
title: "Memoria"
summary: "Cómo funciona la memoria de OpenClaw (archivos del espacio de trabajo + vaciado automático de memoria)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Memoria

La memoria de OpenClaw es **Markdown plano en el espacio de trabajo del agente**. Los archivos son la
fuente de la verdad; el modelo solo "recuerda" lo que se escribe en el disco.

Las herramientas de búsqueda de memoria son proporcionadas por el complemento de memoria activo (por defecto:
`memory-core`). Desactive los complementos de memoria con `plugins.slots.memory = "none"`.

## Archivos de memoria (Markdown)

El diseño del espacio de trabajo predeterminado utiliza dos capas de memoria:

- `memory/YYYY-MM-DD.md`
  - Registro diario (solo agregar).
  - Leer hoy + ayer al inicio de la sesión.
- `MEMORY.md` (opcional)
  - Memoria a largo plazo curada.
  - Si existen tanto `MEMORY.md` como `memory.md` en la raíz del espacio de trabajo, OpenClaw carga ambos (deduplicados por realpath, por lo que los enlaces simbólicos que apuntan al mismo archivo no se inyectan dos veces).
  - **Cargar solo en la sesión principal y privada** (nunca en contextos grupales).

Estos archivos se encuentran en el espacio de trabajo (`agents.defaults.workspace`, por defecto
`~/.openclaw/workspace`). Consulte [Agent workspace](/en/concepts/agent-workspace) para ver el diseño completo.

## Herramientas de memoria

OpenClaw expone dos herramientas orientadas al agente para estos archivos Markdown:

- `memory_search` -- recuperación semántica sobre fragmentos indexados.
- `memory_get` -- lectura específica de un archivo o rango de líneas Markdown específico.

`memory_get` ahora **se degrada con elegancia cuando un archivo no existe** (por ejemplo,
el registro diario de hoy antes de la primera escritura). Tanto el administrador integrado como el backend QMD
devuelven `{ text: "", path }` en lugar de lanzar `ENOENT`, por lo que los agentes pueden
manejar "aún no se ha registrado nada" y continuar su flujo de trabajo sin envolver la
llamada a la herramienta en lógica try/catch.

## Cuándo escribir memoria

- Las decisiones, preferencias y datos duraderos van a `MEMORY.md`.
- Las notas del día a día y el contexto en ejecución van a `memory/YYYY-MM-DD.md`.
- Si alguien dice "recuerda esto", escríbelo (no lo guardes en la RAM).
- Esta área sigue evolucionando. Ayuda recordar al modelo que almacene recuerdos; él sabrá qué hacer.
- Si quieres que algo se quede, **pide al bot que lo escriba** en la memoria.

## Flujo de memoria automático (pre-compaction ping)

Cuando una sesión está **cerca de la compactación automática**, OpenClaw activa un **turno
silencioso y agentic** que recuerda al modelo que escriba una memoria duradera **antes** de que
se compacte el contexto. Las indicaciones predeterminadas dicen explícitamente que el modelo _puede responder_,
pero usualmente `NO_REPLY` es la respuesta correcta para que el usuario nunca vea este turno.
El complemento de memoria activa posee la política de indicación/ruta para ese vaciado; el
complemento `memory-core` predeterminado escribe en el archivo diario canónico bajo
`memory/YYYY-MM-DD.md`.

Esto está controlado por `agents.defaults.compaction.memoryFlush`:

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

Detalles:

- **Umbral suave**: el vaciado se activa cuando la estimación de tokens de la sesión supera
  `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencioso** de forma predeterminada: las indicaciones incluyen `NO_REPLY` para que no se entregue nada.
- **Dos avisos**: un aviso de usuario más un aviso del sistema añaden el recordatorio.
- **Un vaciado por ciclo de compactación** (rastreado en `sessions.json`).
- **El espacio de trabajo debe ser escribible**: si la sesión se ejecuta en un espacio aislado con
  `workspaceAccess: "ro"` o `"none"`, se omite el vaciado.

Para ver el ciclo de vida completo de compactación, consulte
[Gestión de sesiones + compactación](/en/reference/session-management-compaction).

## Búsqueda de memoria vectorial

OpenClaw puede construir un pequeño índice vectorial sobre `MEMORY.md` y `memory/*.md` para que
las consultas semánticas puedan encontrar notas relacionadas incluso cuando la redacción difiera. La búsqueda híbrida
(BM25 + vector) está disponible para combinar la coincidencia semántica con búsquedas exactas de palabras clave.

Los identificadores de adaptadores de búsqueda de memoria provienen del complemento de memoria activo. El complemento
`memory-core` predeterminado incluye funciones integradas para OpenAI, Gemini, Voyage, Mistral,
Ollama y modelos GGUF locales, además de un backend opcional QMD sidecar para
características avanzadas de recuperación y posprocesamiento como la reorganización de diversidad MMR
y el decaimiento temporal.

Para obtener la referencia de configuración completa, incluida la configuración del proveedor de incrustaciones, el backend QMD,
el ajuste de búsqueda híbrida, la memoria multimodal y todos los controles de configuración, consulte
[Referencia de configuración de memoria](/en/reference/memory-config).
