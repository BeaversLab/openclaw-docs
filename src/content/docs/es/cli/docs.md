---
summary: "Referencia de la CLI para `openclaw docs` (buscar en el índice de documentos en vivo)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which hosted search API the docs CLI calls
title: "Docs"
---

# `openclaw docs`

Busca el índice de documentos en vivo de OpenClaw desde la terminal. El comando llama a la API de búsqueda de documentos alojada en Cloudflare de OpenClaw y muestra los resultados en tu terminal.

## Uso

```bash
openclaw docs                       # print docs entrypoint and example search
openclaw docs <query...>            # search the live docs index
```

Argumentos:

| Argumento    | Descripción                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `[query...]` | Consulta de búsqueda libre. Las consultas de varias palabras se unen con espacios y se envían como una sola. |

## Ejemplos

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

Sin consulta, `openclaw docs` imprime la URL del punto de entrada de los documentos más un comando de búsqueda de ejemplo en lugar de ejecutar una búsqueda.

## Cómo funciona

`openclaw docs` llama a `https://docs.openclaw.ai/api/search` y muestra los resultados JSON. La llamada de búsqueda utiliza un tiempo de espera fijo de 30 segundos.

## Salida

En una terminal enriquecida (TTY), los resultados se muestran como un encabezado seguido de una lista con viñetas. Cada viñeta muestra el título de la página, la URL de los documentos vinculados y un breve fragmento en la siguiente línea. Los resultados vacíos imprimen "No results.".

En una salida no enriquecida (redirigida, `--no-color`, scripts), los mismos datos se muestran como Markdown:

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## Códigos de salida

| Código | Significado                                                                              |
| ------ | ---------------------------------------------------------------------------------------- |
| `0`    | Búsqueda exitosa (incluyendo respuestas con cero resultados).                            |
| `1`    | Falló la llamada a la API de búsqueda de documentos alojada; stderr se imprime en línea. |

## Relacionado

- [Referencia de CLI](/es/cli)
- [Documentos en vivo](https://docs.openclaw.ai)
