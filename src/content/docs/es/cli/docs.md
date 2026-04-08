---
summary: "Referencia de CLI para `openclaw docs` (buscar el índice de documentación en vivo)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
title: "docs"
---

# `openclaw docs`

Buscar el índice de documentación en vivo.

Argumentos:

- `[query...]`: términos de búsqueda para enviar al índice de documentación en vivo

Ejemplos:

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

Notas:

- Sin consulta, `openclaw docs` abre el punto de entrada de búsqueda de la documentación en vivo.
- Las consultas de varias palabras se pasan como una única solicitud de búsqueda.
