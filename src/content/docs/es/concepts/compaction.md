---
summary: "Cómo OpenClaw resume conversaciones largas para mantenerse dentro de los límites del modelo"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactación"
---

Cada modelo tiene una ventana de contexto: el número máximo de tokens que puede procesar. Cuando una conversación se acerca a ese límite, OpenClaw **compacta** los mensajes más antiguos en un resumen para que el chat pueda continuar.

## Cómo funciona

1. Los turnos de conversación más antiguos se resumen en una entrada compacta.
2. El resumen se guarda en la transcripción de la sesión.
3. Los mensajes recientes se mantienen intactos.

Cuando OpenClaw divide el historial en fragmentos de compactación, mantiene las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes. Si un punto de división cae dentro de un bloque de herramientas, OpenClaw mueve el límite para que el par permanezca junto y se preserve la cola no resumida actual.

El historial completo de la conversación se mantiene en el disco. La compactación solo cambia lo que el modelo ve en el siguiente turno.

## Auto-compactación

La auto-compactación está activada por defecto. Se ejecuta cuando la sesión se acerca al límite de contexto, o cuando el modelo devuelve un error de desbordamiento de contexto (en cuyo caso OpenClaw compacta y reintentar).

Verás:

- `🧹 Auto-compaction complete` en modo detallado.
- `/status` mostrando `🧹 Compactions: <count>`.

<Info>Antes de compactar, OpenClaw recuerda automáticamente al agente que guarde notas importantes en los archivos de [memoria](/es/concepts/memory). Esto evita la pérdida de contexto.</Info>

<AccordionGroup>
  <Accordion title="Firmas de desbordamiento reconocidas">
    OpenClaw detecta el desbordamiento de contexto a partir de estos patrones de error del proveedor:

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## Compactación manual

Escriba `/compact` en cualquier chat para forzar una compactación. Agregue instrucciones para guiar el resumen:

```
/compact Focus on the API design decisions
```

Cuando `agents.defaults.compaction.keepRecentTokens` está configurado, la compactación manual respeta ese punto de corte Pi y mantiene la cola reciente en el contexto reconstruido. Sin un presupuesto de mantenimiento explícito, la compactación manual se comporta como un punto de control duro y continúa solo desde el nuevo resumen.

## Configuración

Configure la compactación bajo `agents.defaults.compaction` en su `openclaw.json`. Los controles más comunes se enumeran a continuación; para la referencia completa, consulte [Inmersión profunda en la gestión de sesiones](/es/reference/session-management-compaction).

### Usar un modelo diferente

De forma predeterminada, la compactación utiliza el modelo principal del agente. Establezca `agents.defaults.compaction.model` para delegar el resumen a un modelo más capaz o especializado. La anulación acepta cualquier cadena `provider/model-id`:

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

Esto también funciona con modelos locales, por ejemplo, un segundo modelo de Ollama dedicado al resumen:

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

Cuando no está configurado, la compactación comienza con el modelo de sesión activo. Si la generación de resumen falla con un error de proveedor elegible para reserva de modelo (model-fallback), OpenClaw reintenta ese intento de compactación a través de la cadena de reserva de modelo existente de la sesión. La elección de reserva es temporal y no se escribe de nuevo en el estado de la sesión. Una anulación explícita de `agents.defaults.compaction.model` permanece exacta y no hereda la cadena de reserva de la sesión.

### Preservación de identificadores

El resumen de compactación conserva los identificadores opacos de forma predeterminada (`identifierPolicy: "strict"`). Invalide con `identifierPolicy: "off"` para desactivar, o `identifierPolicy: "custom"` más `identifierInstructions` para obtener orientación personalizada.

### Protección de bytes de transcripción activa

Cuando se establece `agents.defaults.compaction.maxActiveTranscriptBytes`, OpenClaw activa la compactación local normal antes de una ejecución si el JSONL activo alcanza ese tamaño. Esto es útil para sesiones de larga duración donde la gestión del contexto del lado del proveedor puede mantener el contexto del modelo saludable mientras la transcripción local sigue creciendo. No divide los bytes JSONL sin procesar; le pide a la canalización de compactación normal que cree un resumen semántico.

<Warning>El protector de bytes requiere `truncateAfterCompaction: true`. Sin la rotación de transcripciones, el archivo activo no se reduciría y el protector permanece inactivo.</Warning>

### Transcripciones sucesoras

Cuando `agents.defaults.compaction.truncateAfterCompaction` está habilitado, OpenClaw no reescribe la transcripción existente en su lugar. Crea una nueva transcripción sucesora activa a partir del resumen de compactación, el estado conservado y la cola no resumida, y luego mantiene el JSONL anterior como la fuente del punto de control archivado.
Las transcripciones sucesoras también eliminan los turnos largos de usuario duplicados exactos que llegan
dentro de una breve ventana de reintento, por lo que las tormentas de reintento del canal no se trasladan a la
siguiente transcripción activa después de la compactación.

Los puntos de control previos a la compactación se retienen solo mientras permanezcan por debajo del límite
de tamaño de punto de control de OpenClaw; las transcripciones activas de gran tamaño todavía se compactan, pero OpenClaw
omite la instantánea de depuración grande en lugar de duplicar el uso del disco.

### Avisos de compactación

De forma predeterminada, la compactación se ejecuta en silencio. Establezca `notifyUser` para mostrar mensajes de estado breves cuando comienza y finaliza la compactación:

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

### Vaciamiento de memoria

Antes de la compactación, OpenClaw puede ejecutar un turno de **flushing de memoria silencioso** para almacenar notas duraderas en el disco. Establezca `agents.defaults.compaction.memoryFlush.model` cuando este turno de mantenimiento deba usar un modelo local en lugar del modelo de conversación activo:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

La invalidación del modelo de flushing de memoria es exacta y no hereda la cadena de reserva de la sesión activa. Consulte [Memory](/es/concepts/memory) para obtener detalles y configuración.

## Proveedores de compactación conectables

Los complementos pueden registrar un proveedor de compactación personalizado a través de `registerCompactionProvider()` en la API de complementos. Cuando se registra y configura un proveedor, OpenClaw delega el resumen a él en lugar de a la canalización LLM integrada.

Para usar un proveedor registrado, establezca su id en su configuración:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

Configurar un `provider` fuerza automáticamente `mode: "safeguard"`. Los proveedores reciben las mismas instrucciones de compactación y la política de preservación de identificadores que la ruta integrada, y OpenClaw aún preserva el contexto de sufijo de turno reciente y dividido después de la salida del proveedor.

<Note>Si el proveedor falla o devuelve un resultado vacío, OpenClaw recurre al resumen LLM integrado.</Note>

## Compactación vs poda

|                | Compactación                          | Poda                                        |
| -------------- | ------------------------------------- | ------------------------------------------- |
| **Qué hace**   | Resume la conversación anterior       | Recorta resultados de herramientas antiguos |
| **¿Guardado?** | Sí (en la transcripción de la sesión) | No (solo en memoria, por solicitud)         |
| **Alcance**    | Toda la conversación                  | Solo resultados de herramientas             |

[Poda de sesiones](/es/concepts/session-pruning) es un complemento más ligero que recorta la salida de la herramienta sin resumir.

## Solución de problemas

**¿Compactando con demasiada frecuencia?** La ventana de contexto del modelo puede ser pequeña o las salidas de las herramientas pueden ser grandes. Intente habilitar la [poda de sesión](/es/concepts/session-pruning).

**¿El contexto parece obsoleto después de la compactación?** Use `/compact Focus on <topic>` para guiar el resumen o habilite el [flush de memoria](/es/concepts/memory) para que las notas sobrevivan.

**¿Necesita un comienzo limpio?** `/new` inicia una sesión nueva sin compactar.

Para una configuración avanzada (reservar tokens, preservación de identificadores, motores de contexto personalizados, compactación del lado del servidor de OpenAI), consulte la [Inmersión profunda en la gestión de sesiones](/es/reference/session-management-compaction).

## Relacionado

- [Sesión](/es/concepts/session): gestión y ciclo de vida de la sesión.
- [Poda de sesiones](/es/concepts/session-pruning): recortar resultados de herramientas.
- [Contexto](/es/concepts/context): cómo se construye el contexto para los turnos del agente.
- [Hooks](/es/automation/hooks): hooks del ciclo de vida de compactación (`before_compaction`, `after_compaction`).
