---
summary: "Referencia de CLI para `openclaw meeting-notes` (listar, mostrar y ubicar las notas de reuniones almacenadas)"
read_when:
  - You want to read stored meeting note summaries from the terminal
  - You need the path to a meeting notes markdown summary
  - You are debugging the meeting-notes plugin storage layout
title: "CLI de Notas de Reunión"
---

# `openclaw meeting-notes`

Inspeccione las notas de reuniones escritas por el plugin externo `meeting-notes`. Esta CLI
es de solo lectura y está disponible cuando ese plugin está instalado o cargado desde
el código fuente. La captura, importación y resumen son gestionados por la herramienta de
agente `meeting_notes` y por las fuentes de inicio automático configuradas.

Use la CLI cuando desee encontrar las notas de ayer, abrir el archivo Markdown en
un editor, alimentar una transcripción a otra herramienta o depurar dónde se guardó una sesión en
el disco. No inicia ni detiene la captura.

Los artefactos residen en el directorio de estado de OpenClaw:

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

El directorio de estado predeterminado es `~/.openclaw`; establezca `OPENCLAW_STATE_DIR` para usar
uno diferente. El directorio de fecha proviene de la hora de inicio de la sesión, y el
directorio de la sesión es un segmento seguro del sistema de archivos derivado del id de la sesión.

## Comandos

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes show YYYY-MM-DD/<session>
openclaw meeting-notes path <session>
openclaw meeting-notes path YYYY-MM-DD/<session>
openclaw meeting-notes path <session> --dir
openclaw meeting-notes path <session> --metadata
openclaw meeting-notes path <session> --transcript
openclaw meeting-notes list --json
openclaw meeting-notes show <session> --json
openclaw meeting-notes path <session> --json
```

- `list`: enumerar las sesiones almacenadas, selector calificado por fecha, hora de inicio, título y ruta `summary.md`.
- `show <session>`: imprimir el `summary.md` almacenado.
- `path <session>`: imprimir la ruta `summary.md`.
- `path <session> --dir`: imprimir el directorio de la sesión.
- `path <session> --metadata`: imprimir `metadata.json`.
- `path <session> --transcript`: imprimir `transcript.jsonl`.
- `--json`: imprimir salida legible por máquina.

Cuando un id de sesión humano se repite durante varios días, use el selector calificado por fecha
de `list`, por ejemplo `openclaw meeting-notes show 2026-05-22/standup`.
Los ids de sesión predeterminados incluyen una marca de tiempo y un sufijo aleatorio; configure ids de sesión
fijos solo cuando sean únicos dentro del día.

## Salida

`list` imprime una sesión por línea:

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/meeting-notes/2026-05-22/standup/summary.md
```

La salida está separada por tabuladores. Las columnas son selector, hora de inicio, título y
ruta de resumen. El selector es el valor más seguro para devolver a `show` o `path`.

`list --json` imprime objetos con:

- `sessionId`
- `selector`
- `date`
- `title`
- `startedAt`
- `stoppedAt`
- `source`
- `path`
- `summaryPath`
- `hasSummary`

`show --json` devuelve los metadatos de la sesión almacenada, el selector, el directorio de la sesión, la ruta del resumen y el texto Markdown del resumen. `path --json` devuelve la ruta seleccionada y si ese archivo existe.

## Muchas reuniones por día

Meeting Notes agrupa las sesiones por fecha y luego por id de sesión. Diez reuniones en un día se convierten en diez carpetas hermanas:

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

Utilice los ids generados por defecto para la mayoría de la automatización. Utilice un id fijo como `standup` solo cuando el mismo id no se vaya a utilizar dos veces en la misma fecha.

## Resúmenes faltantes

Las sesiones en vivo escriben `summary.md` cuando se detiene la sesión. Las transcripciones importadas escriben `summary.md` inmediatamente después de la importación. Una sesión aún puede aparecer en `list` sin un resumen cuando la captura está activa, un proveedor falló durante la detención, o los metadatos se escribieron antes de que llegaran cualquier enunciado.

Use `path <session> --transcript` para inspeccionar la transcripción de solo añadir, y use la acción de herramienta `meeting_notes` `summarize` para regenerar el resumen Markdown.

Consulte [Meeting Notes](/es/plugins/meeting-notes) para obtener detalles sobre la configuración, el inicio automático y el proveedor de fuentes.
