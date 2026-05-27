---
summary: "Convenciones de marcadores de posición seguros para escáneres de secretos en documentación y ejemplos"
read_when:
  - Writing docs that include tokens, API keys, or credential snippets
  - Updating examples that may be scanned by secret-detection tooling
title: "Convenciones de marcadores de posición de secretos"
---

# Convenciones de marcadores de posición de secretos

Utilice marcadores de posición que sean legibles por humanos pero que no se parezcan a secretos reales.

## Estilo recomendado

- Prefiera valores descriptivos como `example-openai-key-not-real` o `example-discord-bot-token`.
- Para fragmentos de shell, prefiera `${OPENAI_API_KEY}` en lugar de cadenas similares a tokens en línea.
- Mantenga los ejemplos obviamente falsos y limitados a su propósito (proveedor, canal, tipo de autenticación).

## Evite estos patrones en la documentación

- Texto literal de encabezado o pie de página de clave privada PEM.
- Prefijos que se asemejen a credenciales reales, por ejemplo `sk-...`, `xoxb-...`, `AKIA...`.
- Tokens de portador (bearer) realistas copiados de registros de tiempo de ejecución.

## Ejemplo

```bash
# Good
export OPENAI_API_KEY="example-openai-key-not-real"

# Better (when the doc is about env wiring)
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```
