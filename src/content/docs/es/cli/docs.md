---
summary: "Referencia de la CLI para `openclaw docs` (buscar en el índice de documentos en vivo)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which helper binaries the docs CLI shells out to
title: "Docs"
---

# `openclaw docs`

Busca en el índice en vivo de la documentación de OpenClaw desde la terminal. El comando ejecuta el punto final de búsqueda MCP de la documentación alojada en Mintlify en `https://docs.openclaw.ai/mcp.search_open_claw` y muestra los resultados en tu terminal.

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

Sin consulta, `openclaw docs` imprime la URL del punto de entrada de los documentos más un comando de búsqueda de ejemplo en lugar de realizar una búsqueda.

## Cómo funciona

`openclaw docs` invoca la CLI de `mcporter` para llamar a la herramienta de búsqueda MCP de documentos, y luego analiza los bloques `Title: / Link: / Content:` de la salida de la herramienta en una lista de resultados.

Para resolver `mcporter`, OpenClaw verifica en orden:

1. `mcporter` en `PATH` (se usa directamente si está presente).
2. `pnpm dlx mcporter ...` si `pnpm` está instalado.
3. `npx -y mcporter ...` si `npx` está instalado.

Si no hay ninguno disponible, el comando falla con una sugerencia para instalar `pnpm` (`npm install -g pnpm`).

La llamada de búsqueda utiliza un tiempo de espera fijo de 30 segundos. Los fragmentos de resultados se truncarán a ~220 caracteres por entrada.

## Salida

En una terminal enriquecida (TTY), los resultados se representan como un encabezado seguido de una lista con viñetas. Cada viñeta muestra el título de la página, la URL de los documentos vinculados y un breve fragmento en la línea siguiente. Los resultados vacíos imprimen "No results.".

En una salida no enriquecida (redirigida, `--no-color`, scripts), los mismos datos se representan como Markdown:

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## Códigos de salida

| Código | Significado                                                        |
| ------ | ------------------------------------------------------------------ |
| `0`    | Búsqueda exitosa (incluyendo respuestas con cero resultados).      |
| `1`    | La llamada a la herramienta MCP falló; stderr se imprime en línea. |

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Documentos en vivo](https://docs.openclaw.ai)
