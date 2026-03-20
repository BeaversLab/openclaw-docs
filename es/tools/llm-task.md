---
summary: "Tareas LLM solo JSON para flujos de trabajo (herramienta de complemento opcional)"
read_when:
  - Deseas un paso LLM solo JSON dentro de los flujos de trabajo
  - Necesitas salida LLM validada por esquema para automatización
title: "Tarea LLM"
---

# Tarea LLM

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

2. Permite la herramienta (está registrada con `optional: true`):

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## Configuración (opcional)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` es una lista de permitidos de cadenas `provider/model`. Si se establece, cualquier solicitud
fuera de la lista es rechazada.

## Parámetros de la herramienta

- `prompt` (cadena, requerido)
- `input` (cualquier, opcional)
- `schema` (objeto, esquema JSON opcional)
- `provider` (cadena, opcional)
- `model` (cadena, opcional)
- `thinking` (cadena, opcional)
- `authProfileId` (cadena, opcional)
- `temperature` (número, opcional)
- `maxTokens` (número, opcional)
- `timeoutMs` (número, opcional)

`thinking` acepta los preajustes de razonamiento estándar de OpenClaw, como `low` o `medium`.

## Salida

Devuelve `details.json` que contiene el JSON analizado (y valida contra
`schema` cuando se proporciona).

## Ejemplo: paso de flujo de trabajo de Lobster

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

- La herramienta es **solo JSON** e indica al modelo que solo produzca JSON (sin
  vallas de código, sin comentarios).
- No se exponen herramientas al modelo para esta ejecución.
- Trata la salida como no confiable a menos que valides con `schema`.
- Coloca aprobaciones antes de cualquier paso con efectos secundarios (enviar, publicar, ejecutar).

import es from "/components/footer/es.mdx";

<es />
