---
summary: "Cómo OpenClaw resume conversaciones largas para mantenerse dentro de los límites del modelo"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactación"
---

# Compactación

Cada modelo tiene una ventana de contexto: el número máximo de tokens que puede procesar.
Cuando una conversación se acerca a ese límite, OpenClaw **compacta** los mensajes anteriores
en un resumen para que el chat pueda continuar.

## Cómo funciona

1. Los turnos de conversación anteriores se resumen en una entrada compacta.
2. El resumen se guarda en la transcripción de la sesión.
3. Los mensajes recientes se mantienen intactos.

Cuando OpenClaw divide el historial en fragmentos de compactación, mantiene las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes. Si un punto de división cae dentro de un bloque de herramientas, OpenClaw mueve el límite para que el par permanezca junto y se preserve la cola actual no resumida.

El historial completo de la conversación se mantiene en el disco. La compactación solo cambia lo que el modelo ve en el siguiente turno.

## Auto-compactación

La autocompactación está activada por defecto. Se ejecuta cuando la sesión se acerca al límite de contexto, o cuando el modelo devuelve un error de desbordamiento de contexto (en cuyo caso OpenClaw compacta y reintenta). Las firmas típicas de desbordamiento incluyen `request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`.

<Info>Antes de compactar, OpenClaw recuerda automáticamente al agente que guarde notas importantes en archivos de [memoria](/en/concepts/memory). Esto evita la pérdida de contexto.</Info>

Utilice la configuración `agents.defaults.compaction` en su `openclaw.json` para configurar el comportamiento de compactación (modo, tokens objetivo, etc.).
El resumen de compactación preserva los identificadores opacos por defecto (`identifierPolicy: "strict"`). Puede anular esto con `identifierPolicy: "off"` o proporcionar texto personalizado con `identifierPolicy: "custom"` y `identifierInstructions`.

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

Esto también funciona con modelos locales, por ejemplo un segundo modelo Ollama dedicado al resumen o un especialista en compactación ajustado:

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

## Proveedores de compactación conectables

Los complementos pueden registrar un proveedor de compactación personalizado a través de `registerCompactionProvider()` en la API de complementos. Cuando se registra y configura un proveedor, OpenClaw delega el resumen a él en lugar de a la canalización LLM integrada.

Para usar un proveedor registrado, configure el id del proveedor en su configuración:

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

Establecer un `provider` fuerza automáticamente `mode: "safeguard"`. Los proveedores reciben las mismas instrucciones de compactación y la política de preservación de identificadores que la ruta integrada, y OpenClaw aún preserva el contexto de sufijo de turnos recientes y de turnos divididos después de la salida del proveedor. Si el proveedor falla o devuelve un resultado vacío, OpenClaw recurre al resumen LLM integrado.

## Auto-compacción (activada por defecto)

Cuando una sesión se acerca o excede la ventana de contexto del modelo, OpenClaw activa la auto-compacción y puede reintentar la solicitud original utilizando el contexto compactado.

Verás:

- `🧹 Auto-compaction complete` en modo detallado
- `/status` que muestra `🧹 Compactions: <count>`

Antes de la compactación, OpenClaw puede ejecutar un turno de **purga de memoria silenciosa** para almacenar
notas duraderas en el disco. Consulte [Memory](/en/concepts/memory) para obtener detalles y configuración.

## Compactación manual

Escriba `/compact` en cualquier chat para forzar una compactación. Agregue instrucciones para guiar
el resumen:

```
/compact Focus on the API design decisions
```

## Usar un modelo diferente

De forma predeterminada, la compactación utiliza el modelo principal de su agente. Puede utilizar un modelo
más capaz para obtener mejores resúmenes:

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## Aviso de inicio de compactación

De forma predeterminada, la compactación se ejecuta en silencio. Para mostrar un breve aviso cuando la compactación
comienza, habilite `notifyUser`:

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

Cuando está habilitado, el usuario ve un mensaje corto (por ejemplo, "Compactando
contexto...") al comienzo de cada ejecución de compactación.

## Compactación vs poda

|                 | Compactación                          | Poda                                        |
| --------------- | ------------------------------------- | ------------------------------------------- |
| **Lo que hace** | Resume la conversación anterior       | Recorta resultados de herramientas antiguos |
| **¿Guardado?**  | Sí (en la transcripción de la sesión) | No (solo en memoria, por solicitud)         |
| **Alcance**     | Toda la conversación                  | Solo resultados de herramientas             |

[Poda de sesión](/en/concepts/session-pruning) es un complemento más ligero que
recorta la salida de las herramientas sin resumir.

## Solución de problemas

**¿Compactando con demasiada frecuencia?** La ventana de contexto del modelo puede ser pequeña, o las
salidas de las herramientas pueden ser grandes. Intente habilitar
[poda de sesión](/en/concepts/session-pruning).

**¿El contexto se siente obsoleto después de la compactación?** Use `/compact Focus on <topic>` para
guiar el resumen, o habilite el [vacío de memoria](/en/concepts/memory) para que las notas
sobrevivan.

**¿Necesita una limpieza total?** `/new` inicia una sesión nueva sin compactar.

Para configuración avanzada (reservar tokens, preservación de identificadores, motores de
contexto personalizados, compactación del lado del servidor de OpenAI), consulte la
[Inmersión profunda en la gestión de sesiones](/en/reference/session-management-compaction).

## Relacionado

- [Sesión](/en/concepts/session) — gestión y ciclo de vida de la sesión
- [Poda de sesión](/en/concepts/session-pruning) — recorte de resultados de herramientas
- [Contexto](/en/concepts/context) — cómo se construye el contexto para los turnos del agente
- [Hooks](/en/automation/hooks) — ganchos del ciclo de vida de compactación (before_compaction, after_compaction)
