---
summary: "Referencia de la CLI para `openclaw completion` (generar/instalar scripts de finalización de shell)"
read_when:
  - Deseas finalizaciones de shell para zsh/bash/fish/PowerShell
  - Necesitas almacenar en caché los scripts de finalización bajo el estado de OpenClaw
title: "completion"
---

# `openclaw completion`

Genera scripts de finalización de shell y opcionalmente los instala en tu perfil de shell.

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

- `-s, --shell <shell>`: destino de shell (`zsh`, `bash`, `powershell`, `fish`; predeterminado: `zsh`)
- `-i, --install`: instala la finalización añadiendo una línea de origen a tu perfil de shell
- `--write-state`: escribe los scripts de finalización en `$OPENCLAW_STATE_DIR/completions` sin imprimir en stdout
- `-y, --yes`: omite los avisos de confirmación de instalación

## Notas

- `--install` escribe un pequeño bloque "OpenClaw Completion" en tu perfil de shell y lo apunta al script almacenado en caché.
- Sin `--install` o `--write-state`, el comando imprime el script en stdout.
- La generación de finalización carga ansiosamente los árboles de comandos para que se incluyan los subcomandos anidados.

import en from "/components/footer/en.mdx";

<en />
