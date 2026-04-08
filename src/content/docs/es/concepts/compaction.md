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

Cuando OpenClaw divide el historial en fragmentos de compactación, mantiene las llamadas a herramientas del asistente emparejadas con sus entradas `toolResult` correspondientes. Si un punto de división cae dentro de un bloque de herramientas, OpenClaw mueve el límite para que el par se mantenga unido y la cola no resumida actual se preserve.

El historial completo de la conversación se mantiene en el disco. La compactación solo cambia lo que el modelo ve en el siguiente turno.

## Auto-compactación

La auto-compactación está activada por defecto. Se ejecuta cuando la sesión se acerca al límite de contexto, o cuando el modelo devuelve un error de desbordamiento de contexto (en cuyo caso OpenClaw compacta y reintenta). Las firmas típicas de desbordamiento incluyen `request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`.

<Info>Antes de compactar, OpenClaw recuerda automáticamente al agente que guarde notas importantes en archivos de [memoria](/en/concepts/memory). Esto evita la pérdida de contexto.</Info>

## Compactación manual

Escriba `/compact` en cualquier chat para forzar una compactación. Agregue instrucciones para guiar el resumen:

```
/compact Focus on the API design decisions
```

## Usar un modelo diferente

Por defecto, la compactación utiliza el modelo principal de su agente. Puede utilizar un modelo más capaz para obtener mejores resúmenes:

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

Por defecto, la compactación se ejecuta en silencio. Para mostrar un breve aviso cuando comienza la compactación, habilite `notifyUser`:

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

Cuando está habilitado, el usuario ve un mensaje breve (por ejemplo, "Compactando contexto...") al inicio de cada ejecución de compactación.

## Compactación vs poda

|                 | Compactación                          | Poda                                        |
| --------------- | ------------------------------------- | ------------------------------------------- |
| **Lo que hace** | Resume la conversación anterior       | Recorta resultados de herramientas antiguos |
| **¿Guardado?**  | Sí (en la transcripción de la sesión) | No (solo en memoria, por solicitud)         |
| **Alcance**     | Conversación completa                 | Solo resultados de herramientas             |

La [poda de sesiones](/en/concepts/session-pruning) es un complemento más ligero que recorta la salida de las herramientas sin resumir.

## Solución de problemas

**¿Compactando con demasiada frecuencia?** La ventana de contexto del modelo puede ser pequeña, o las
salidas de las herramientas pueden ser grandes. Intente habilitar
[session pruning](/en/concepts/session-pruning).

**¿El contexto parece obsoleto después de la compactación?** Use `/compact Focus on <topic>` para
guiar el resumen, o habilite el [memory flush](/en/concepts/memory) para que las notas
sobrevivan.

**¿Necesita un comienzo limpio?** `/new` inicia una sesión nueva sin compactar.

Para configuración avanzada (reservar tokens, preservación de identificadores, motores de
contexto personalizados, compactación del lado del servidor de OpenAI), consulte la
[Inmersión profunda en la gestión de sesiones](/en/reference/session-management-compaction).

## Relacionado

- [Sesión](/en/concepts/session) — gestión y ciclo de vida de la sesión
- [Poda de sesión](/en/concepts/session-pruning) — recortar resultados de herramientas
- [Contexto](/en/concepts/context) — cómo se construye el contexto para los turnos del agente
- [Hooks](/en/automation/hooks) — ganchos del ciclo de vida de compactación (before_compaction, after_compaction)
