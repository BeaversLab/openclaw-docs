---
summary: "Referencia de la CLI para `openclaw completion` (generar/instalar scripts de completado de shell)"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
title: "completado"
---

# `openclaw completion`

Genera scripts de completado de shell y opcionalmente los instala en tu perfil de shell.

## Uso

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## Opciones

- `-s, --shell <shell>`: destino del shell (`zsh`, `bash`, `powershell`, `fish`; por defecto: `zsh`)
- `-i, --install`: instala el completado añadiendo una línea de origen a tu perfil de shell
- `--write-state`: escribe el/los script(s) de completado en `$OPENCLAW_STATE_DIR/completions` sin imprimir en stdout
- `-y, --yes`: omite los avisos de confirmación de instalación

## Notas

- `--install` escribe un pequeño bloque "OpenClaw Completion" en tu perfil de shell y lo apunta al script en caché.
- Sin `--install` o `--write-state`, el comando imprime el script en stdout.
- La generación de completado carga con avidez los árboles de comandos para que se incluyan los subcomandos anidados.
