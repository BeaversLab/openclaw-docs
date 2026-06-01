---
summary: "Referencia de la CLI para `openclaw transcripts` (listar, mostrar y localizar transcripciones almacenadas)"
read_when:
  - You want to read stored transcript summaries from the terminal
  - You need the path to a transcripts markdown summary
  - You are debugging the core transcripts storage layout
title: "CLI de Transcripciones"
---

# `openclaw transcripts`

Inspeccione las transcripciones escritas por la herramienta central `transcripts` de OpenClaw. Esta CLI es
de solo lectura; la captura, importación y resumen son propiedad de la herramienta del agente y
las fuentes de inicio automático configuradas.

Use la CLI cuando desee encontrar las notas de ayer, abrir el archivo Markdown en
un editor, alimentar una transcripción a otra herramienta o depurar dónde se guardó una sesión en
disco. No inicia ni detiene la captura.

Los artefactos residen en el directorio de estado de OpenClaw:

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

El directorio de estado predeterminado es `~/.openclaw`; configure `OPENCLAW_STATE_DIR` para usar un
otro diferente. El directorio de fecha proviene de la hora de inicio de la sesión, y el
directorio de sesión es un segmento seguro del sistema de archivos derivado del id de la sesión.

## Comandos

```bash
openclaw transcripts list
openclaw transcripts show <session>
openclaw transcripts show YYYY-MM-DD/<session>
openclaw transcripts path <session>
openclaw transcripts path YYYY-MM-DD/<session>
openclaw transcripts path <session> --dir
openclaw transcripts path <session> --metadata
openclaw transcripts path <session> --transcript
openclaw transcripts list --json
openclaw transcripts show <session> --json
openclaw transcripts path <session> --json
```

- `list`: enumera las sesiones almacenadas, selector calificado por fecha, hora de inicio, título y ruta `summary.md`.
- `show <session>`: imprime el `summary.md` almacenado.
- `path <session>`: imprime la ruta `summary.md`.
- `path <session> --dir`: imprime el directorio de la sesión.
- `path <session> --metadata`: imprime `metadata.json`.
- `path <session> --transcript`: imprime `transcript.jsonl`.
- `--json`: imprime una salida legible por máquina.

Cuando un id de sesión humano se repite durante varios días, use el selector calificado por fecha
de `list`, por ejemplo `openclaw transcripts show 2026-05-22/standup`.
Los ids de sesión predeterminados incluyen una marca de tiempo y un sufijo aleatorio; configure ids de sesión
fijos solo cuando sean únicos dentro del día.

## Salida

`list` imprime una sesión por línea:

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/transcripts/2026-05-22/standup/summary.md
```

La salida está separada por tabulaciones. Las columnas son selector, hora de inicio, título y
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

`show --json` devuelve los metadatos de la sesión almacenada, el selector, el directorio de la sesión,
el resumen de la ruta y el texto Markdown del resumen. `path --json` devuelve la ruta seleccionada
y si ese archivo existe.

## Muchas reuniones por día

Transcripts agrupa las sesiones por fecha y luego por id de sesión. Diez reuniones en un
día se convierten en diez carpetas hermanas:

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

Use los ids generados por defecto para la mayor parte de la automatización. Use un id fijo como `standup`
solo cuando el mismo id no se vaya a usar dos veces en la misma fecha.

## Resúmenes faltantes

Las sesiones en vivo escriben `summary.md` cuando la sesión se detiene. Las transcripciones importadas
escriben `summary.md` inmediatamente después de la importación. Una sesión aún puede aparecer en
`list` sin un resumen cuando la captura está activa, un proveedor falló durante la detención,
o se escribieron metadatos antes de que llegaran cualquier enunciado.

Use `path <session> --transcript` para inspeccionar la transcripción de solo adición, y use
la acción de la herramienta `transcripts` `summarize` para regenerar el resumen de Markdown.

## Configuración

La captura de transcripciones es opcional porque las fuentes en vivo pueden unirse y grabar el audio
de la reunión. Habilite la herramienta con `transcripts.enabled` de nivel superior:

```json
{
  "transcripts": {
    "enabled": true,
    "maxUtterances": 2000
  }
}
```

Configure las fuentes de inicio automático con `transcripts.autoStart` en `openclaw.json`.
Cada entrada se habilita al estar presente; omita una entrada para deshabilitar esa fuente.

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "guildId": "1234567890",
        "channelId": "2345678901"
      },
      {
        "providerId": "slack-huddle",
        "accountId": "workspace",
        "channelId": "C123"
      }
    ]
  }
}
```
