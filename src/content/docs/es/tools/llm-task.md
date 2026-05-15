---
summary: "Tareas LLM solo JSON para flujos de trabajo (herramienta de complemento opcional)"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "Tarea LLM"
---

`llm-task` es una **herramienta de complemento opcional** que ejecuta una tarea LLM solo JSON y
devuelve salida estructurada (opcionalmente validada contra JSON Schema).

Esto es ideal para motores de flujo de trabajo como Lobster: puedes agregar un solo paso LLM
sin escribir código OpenClaw personalizado para cada flujo de trabajo.

## Habilitar el complemento

1. Habilitar el complemento:

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. Permitir la herramienta opcional:

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

Use `tools.allow` solo cuando desee un modo restrictivo de lista blanca.

## Configuración (opcional)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` es una lista blanca de cadenas `provider/model`. Si se establece, cualquier solicitud
fuera de la lista es rechazada.

## Parámetros de la herramienta

- `prompt` (cadena, requerido)
- `input` (cualquiera, opcional)
- `schema` (objeto, JSON Schema opcional)
- `provider` (cadena, opcional)
- `model` (cadena, opcional)
- `thinking` (cadena, opcional)
- `authProfileId` (cadena, opcional)
- `temperature` (número, opcional)
- `maxTokens` (número, opcional)
- `timeoutMs` (número, opcional)

`thinking` acepta los ajustes preestablecidos de razonamiento estándar de OpenClaw, como `low` o `medium`.

## Salida

Devuelve `details.json` que contiene el JSON analizado (y valida contra
`schema` cuando se proporciona).

## Ejemplo: paso de flujo de trabajo de Lobster

### Limitación importante

El ejemplo a continuación asume que el **CLI de Lobster independiente** se está ejecutando en un entorno donde `openclaw.invoke` ya tiene la URL de puerta de enlace y el contexto de autenticación correctos.

Para el ejecutor **integrado** de Lobster dentro de OpenClaw, este patrón de CLI anidado **actualmente no es confiable**:

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

Hasta que Lobster integrado tenga un puente compatible para este flujo, prefiera cualquiera de los siguientes:

- llamadas directas a la herramienta `llm-task` fuera de Lobster, o
- pasos de Lobster que no dependen de llamadas anidadas a `openclaw.invoke`.

Ejemplo de CLI de Lobster independiente:

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## Notas de seguridad

- La herramienta es **solo JSON** e instruye al modelo a que genere solo JSON (sin
  cercas de código, sin comentarios).
- No se exponen herramientas al modelo para esta ejecución.
- Trate la salida como no confiable a menos que la valide con `schema`.
- Coloque aprobaciones antes de cualquier paso con efectos secundarios (send, post, exec).

## Relacionado

- [Niveles de pensamiento](/es/tools/thinking)
- [Subagentes](/es/tools/subagents)
- [Comandos de barra](/es/tools/slash-commands)
