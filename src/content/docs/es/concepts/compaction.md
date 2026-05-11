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

Cuando OpenClaw divide el historial en bloques de compactación, mantiene las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes. Si un punto de división cae dentro de un bloque de herramientas, OpenClaw mueve el límite para que el par se mantenga unido y se preserve la cola no resumida actual.

El historial completo de la conversación se mantiene en el disco. La compactación solo cambia lo que el modelo ve en el siguiente turno.

## Auto-compactación

La auto-compactación está activada por defecto. Se ejecuta cuando la sesión se acerca al límite de contexto, o cuando el modelo devuelve un error de desbordamiento de contexto (en cuyo caso OpenClaw compacta y reintentar).

Verás:

- `🧹 Auto-compaction complete` en modo detallado.
- `/status` mostrando `🧹 Compactions: <count>`.

<Info>Antes de compactar, OpenClaw recuerda automáticamente al agente que guarde notas importantes en archivos de [memoria](/es/concepts/memory). Esto evita la pérdida de contexto.</Info>

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

Escribe `/compact` en cualquier chat para forzar una compactación. Añade instrucciones para guiar el resumen:

```
/compact Focus on the API design decisions
```

Cuando se establece `agents.defaults.compaction.keepRecentTokens`, la compactación manual respeta ese punto de corte Pi y mantiene la cola reciente en el contexto reconstruido. Sin un presupuesto de mantenimiento explícito, la compactación manual se comporta como un punto de control fijo y continúa solo desde el nuevo resumen.

## Configuración

Configure la compactación en `agents.defaults.compaction` en su `openclaw.json`. Los controles más comunes se enumeran a continuación; para la referencia completa, consulte [Profundización en la gestión de sesiones](/es/reference/session-management-compaction).

### Usar un modelo diferente

De manera predeterminada, la compactación utiliza el modelo principal del agente. Establezca `agents.defaults.compaction.model` para delegar el resumen a un modelo más capaz o especializado. La anulación acepta cualquier cadena `provider/model-id`:

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

Cuando no está establecido, la compactación utiliza el modelo principal del agente.

### Preservación de identificadores

El resumen de compactación preserva los identificadores opacos de manera predeterminada (`identifierPolicy: "strict"`). Anule con `identifierPolicy: "off"` para desactivar, o `identifierPolicy: "custom"` más `identifierInstructions` para obtener orientación personalizada.

### Protección de bytes de transcripción activa

Cuando se establece `agents.defaults.compaction.maxActiveTranscriptBytes`, OpenClaw activa la compactación local normal antes de una ejecución si el JSONL activa alcanza ese tamaño. Esto es útil para sesiones de larga duración donde la gestión del contexto del lado del proveedor puede mantener el contexto del modelo saludable mientras la transcripción local sigue creciendo. No divide los bytes JSONL sin procesar; le pide a la canalización de compactación normal que cree un resumen semántico.

<Warning>La protección de bytes requiere `truncateAfterCompaction: true`. Sin la rotación de transcripciones, el archivo activo no se reduciría y la protección permanecerá inactiva.</Warning>

### Transcripciones sucesoras

Cuando `agents.defaults.compaction.truncateAfterCompaction` está habilitado, OpenClaw no reescribe la transcripción existente en su lugar. Crea una nueva transcripción sucesora activa a partir del resumen de compactación, el estado preservado y la cola no resumida, y luego mantiene el JSONL anterior como la fuente del punto de control archivado.
Las transcripciones sucesoras también eliminan los turnos largos de usuario duplicados exactos que llegan
dentro de una breve ventana de reintento, por lo que las tormentas de reintento del canal no se trasladan a la
siguiente transcripción activa después de la compactación.

Los puntos de control previos a la compactación se retienen solo mientras permanezcan por debajo del límite
de tamaño de punto de control de OpenClaw; las transcripciones activas de gran tamaño todavía se compactan, pero OpenClaw
omite la instantánea de depuración grande en lugar de duplicar el uso del disco.

### Avisos de compactación

De forma predeterminada, la compactación se ejecuta en silencio. Configure `notifyUser` para mostrar mensajes de estado breves cuando la compactación se inicia y se completa:

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

Antes de la compactación, OpenClaw puede ejecutar un turno de **vaciamiento de memoria silencioso** para almacenar notas duraderas en el disco. Consulte [Memoria](/es/concepts/memory) para obtener detalles y configuración.

## Proveedores de compactación conectables

Los complementos pueden registrar un proveedor de compactación personalizado a través de `registerCompactionProvider()` en la API de complementos. Cuando se registra y configura un proveedor, OpenClaw delega el resumen en él en lugar de utilizar la canalización LLM integrada.

Para utilizar un proveedor registrado, configure su id en su configuración:

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

Establecer un `provider` fuerza automáticamente `mode: "safeguard"`. Los proveedores reciben las mismas instrucciones de compactación y la política de preservación de identificadores que la ruta integrada, y OpenClaw todavía preserva el contexto de sufijo de turnos recientes y de división de turnos después de la salida del proveedor.

<Note>Si el proveedor falla o devuelve un resultado vacío, OpenClaw recurre al resumen LLM integrado.</Note>

## Compactación frente a poda

|                 | Compactación                          | Poda                                        |
| --------------- | ------------------------------------- | ------------------------------------------- |
| **Lo que hace** | Resume la conversación anterior       | Recorta resultados de herramientas antiguos |
| **¿Guardado?**  | Sí (en la transcripción de la sesión) | No (solo en memoria, por solicitud)         |
| **Alcance**     | Toda la conversación                  | Solo resultados de herramientas             |

[Poda de sesiones](/es/concepts/session-pruning) es un complemento más ligero que recorta la salida de las herramientas sin resumir.

## Solución de problemas

**¿Se compacta con demasiada frecuencia?** La ventana de contexto del modelo puede ser pequeña o las salidas de las herramientas pueden ser grandes. Intente habilitar la [poda de sesiones](/es/concepts/session-pruning).

**¿El contexto parece obsoleto después de la compactación?** Use `/compact Focus on <topic>` para guiar el resumen o habilite el [vaciamiento de memoria](/es/concepts/memory) para que las notas sobrevivan.

**¿Necesita un comienzo limpio?** `/new` inicia una sesión nueva sin compactar.

Para una configuración avanzada (reservar tokens, preservación de identificadores, motores de contexto personalizados, compactación del lado del servidor de OpenAI), consulte el [análisis profundo de la gestión de sesiones](/es/reference/session-management-compaction).

## Relacionado

- [Sesión](/es/concepts/session): gestión y ciclo de vida de la sesión.
- [Poda de sesiones](/es/concepts/session-pruning): recortar resultados de herramientas.
- [Contexto](/es/concepts/context): cómo se construye el contexto para los turnos del agente.
- [Ganchos (Hooks)](/es/automation/hooks): ganchos del ciclo de vida de compactación (`before_compaction`, `after_compaction`).
