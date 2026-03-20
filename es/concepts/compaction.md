---
summary: "Context window + compaction: how OpenClaw keeps sessions under model limits"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compaction"
---

# Ventana de contexto y compactación

Cada modelo tiene una **ventana de contexto** (máximo de tokens que puede ver). Los chats de larga duración acumulan mensajes y resultados de herramientas; una vez que la ventana se ajusta, OpenClaw **compacta** el historial antiguo para mantenerse dentro de los límites.

## Qué es la compactación

La compactación **resume la conversación anterior** en una entrada de resumen compacta y mantiene los mensajes recientes intactos. El resumen se almacena en el historial de la sesión, por lo que las solicitudes futuras utilizan:

- El resumen de la compactación
- Mensajes recientes después del punto de compactación

La compactación **persiste** en el historial JSONL de la sesión.

## Configuración

Use la configuración `agents.defaults.compaction` en su `openclaw.json` para configurar el comportamiento de compactación (modo, tokens objetivo, etc.).
El resumen de compactación conserva identificadores opacos por defecto (`identifierPolicy: "strict"`). Puede anular esto con `identifierPolicy: "off"` o proporcionar texto personalizado con `identifierPolicy: "custom"` y `identifierInstructions`.

Opcionalmente, puede especificar un modelo diferente para el resumen de compactación a través de `agents.defaults.compaction.model`. Esto es útil cuando su modelo principal es un modelo local o pequeño y desea que los resúmenes de compactación sean producidos por un modelo más capaz. La anulación acepta cualquier cadena `provider/model-id`:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  }
}
```

Esto también funciona con modelos locales, por ejemplo, un segundo modelo Ollama dedicado al resumen o un especialista en compactación ajustado:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

Cuando no está configurado, la compactación utiliza el modelo principal del agente.

## Auto-compactación (activado por defecto)

Cuando una sesión se acerca o excede la ventana de contexto del modelo, OpenClaw activa la auto-compactación y puede reintentar la solicitud original utilizando el contexto compactado.

Verá:

- `🧹 Auto-compaction complete` en modo detallado
- `/status` mostrando `🧹 Compactions: <count>`

Antes de la compactación, OpenClaw puede ejecutar un turno de **flush de memoria silencioso** para guardar
notas duraderas en el disco. Consulte [Memory](/es/concepts/memory) para obtener detalles y configuración.

## Compactación manual

Use `/compact` (opcionalmente con instrucciones) para forzar un pase de compactación:

```
/compact Focus on decisions and open questions
```

## Context window source

Context window is model-specific. OpenClaw uses the model definition from the configured provider catalog to determine limits.

## Compaction vs pruning

- **Compaction**: summarises and **persists** in JSONL.
- **Session pruning**: trims old **tool results** only, **in-memory**, per request.

See [/concepts/session-pruning](/es/concepts/session-pruning) for pruning details.

## OpenAI server-side compaction

OpenClaw also supports OpenAI Responses server-side compaction hints for
compatible direct OpenAI models. This is separate from local OpenClaw
compaction and can run alongside it.

- Local compaction: OpenClaw summarizes and persists into session JSONL.
- Server-side compaction: OpenAI compacts context on the provider side when
  `store` + `context_management` are enabled.

See [OpenAI provider](/es/providers/openai) for model params and overrides.

## Custom context engines

Compaction behavior is owned by the active
[context engine](/es/concepts/context-engine). The legacy engine uses the built-in
summarization described above. Plugin engines (selected via
`plugins.slots.contextEngine`) can implement any compaction strategy — DAG
summaries, vector retrieval, incremental condensation, etc.

When a plugin engine sets `ownsCompaction: true`, OpenClaw delegates all
compaction decisions to the engine and does not run built-in auto-compaction.

When `ownsCompaction` is `false` or unset, OpenClaw may still use Pi's
built-in in-attempt auto-compaction, but the active engine's `compact()` method
still handles `/compact` and overflow recovery. There is no automatic fallback
to the legacy engine's compaction path.

If you are building a non-owning context engine, implement `compact()` by
calling `delegateCompactionToRuntime(...)` from `openclaw/plugin-sdk/core`.

## Tips

- Use `/compact` when sessions feel stale or context is bloated.
- Large tool outputs are already truncated; pruning can further reduce tool-result buildup.
- Si necesitas empezar de cero, `/new` o `/reset` inicia una nueva id de sesión.

import en from "/components/footer/en.mdx";

<en />
