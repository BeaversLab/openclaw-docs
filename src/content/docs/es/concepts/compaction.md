---
summary: "Ventana contextual + compactación: cómo OpenClaw mantiene las sesiones dentro de los límites del modelo"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactación"
---

# Ventana contextual y compactación

Cada modelo tiene una **ventana contextual** (máximo de tokens que puede ver). Los chats de larga duración acumulan mensajes y resultados de herramientas; una vez que la ventana se ajusta, OpenClaw **compacta** el historial anterior para mantenerse dentro de los límites.

## Qué es la compactación

La compactación **resume la conversación anterior** en una entrada de resumen compacta y mantiene los mensajes recientes intactos. El resumen se almacena en el historial de la sesión, por lo que las solicitudes futuras utilizan:

- El resumen de compactación
- Mensajes recientes después del punto de compactación

La compactación **persiste** en el historial JSONL de la sesión.

## Configuración

Use la configuración `agents.defaults.compaction` en su `openclaw.json` para configurar el comportamiento de la compactación (modo, tokens de destino, etc.).
El resumen de compactación conserva los identificadores opacos por defecto (`identifierPolicy: "strict"`). Puede anular esto con `identifierPolicy: "off"` o proporcionar texto personalizado con `identifierPolicy: "custom"` y `identifierInstructions`.

Opcionalmente, puede especificar un modelo diferente para el resumen de compactación a través de `agents.defaults.compaction.model`. Esto es útil cuando su modelo principal es un modelo local o pequeño y desea que los resúmenes de compactación sean producidos por un modelo más capaz. La anulación acepta cualquier cadena `provider/model-id`:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
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

## Auto-compactación (activada por defecto)

Cuando una sesión se acerca o excede la ventana contextual del modelo, OpenClaw activa la auto-compactación y puede reintentar la solicitud original utilizando el contexto compactado.

Verá:

- `🧹 Auto-compaction complete` en modo detallado
- `/status` mostrando `🧹 Compactions: <count>`

Antes de la compactación, OpenClaw puede ejecutar un turno de **flush de memoria silencioso** para almacenar notas duraderas en el disco. Consulte [Memory](/es/concepts/memory) para obtener detalles y configuración.

## Compactación manual

Use `/compact` (opcionalmente con instrucciones) para forzar un paso de compactación:

```
/compact Focus on decisions and open questions
```

## Fuente de la ventana de contexto

La ventana de contexto es específica del modelo. OpenClaw utiliza la definición del modelo del catálogo de proveedores configurado para determinar los límites.

## Compactación vs. poda

- **Compactación**: resume y **persiste** en JSONL.
- **Poda de sesión**: recorta antiguos **resultados de herramientas** solo, **en memoria**, por solicitud.

Consulte [/concepts/session-pruning](/es/concepts/session-pruning) para obtener detalles sobre la poda.

## Compactación del lado del servidor de OpenAI

OpenClaw también admite sugerencias de compactación del lado del servidor de OpenAI Responses para modelos directos de OpenAI compatibles. Esto está separado de la compactación local de OpenClaw y puede ejecutarse simultáneamente.

- Compactación local: OpenClaw resume y persiste en el JSONL de la sesión.
- Compactación del lado del servidor: OpenAI compacta el contexto en el lado del proveedor cuando
  `store` + `context_management` están habilitados.

Consulte [OpenAI provider](/es/providers/openai) para conocer los parámetros y anulaciones del modelo.

## Motores de contexto personalizados

El comportamiento de compactación es propiedad del motor de contexto
[context engine](/es/concepts/context-engine) activo. El motor heredado utiliza el resumen integrado descrito anteriormente. Los motores de complementos (seleccionados a través de
`plugins.slots.contextEngine`) pueden implementar cualquier estrategia de compactación: resúmenes DAG, recuperación vectorial, condensación incremental, etc.

Cuando un motor de complemento establece `ownsCompaction: true`, OpenClaw delega todas las decisiones de compactación al motor y no ejecuta la auto-compactación integrada.

Cuando `ownsCompaction` es `false` o no está configurado, OpenClaw aún puede usar la auto-compactación integrada en el intento de Pi, pero el método `compact()` del motor activo aún maneja `/compact` y la recuperación de desbordamiento. No hay retorno automático a la ruta de compactación del motor heredado.

Si está construyendo un motor de contexto no propietario, implemente `compact()` llamando a `delegateCompactionToRuntime(...)` desde `openclaw/plugin-sdk/core`.

## Consejos

- Use `/compact` cuando las sesiones se sientan obsoletas o el contexto esté hinchado.
- Las grandes salidas de herramientas ya están truncadas; la poda puede reducir aún más la acumulación de resultados de herramientas.
- Si necesita una pizarra limpia, `/new` o `/reset` inicia un nuevo id de sesión.
