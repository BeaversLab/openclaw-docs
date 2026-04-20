---
summary: "Referencia de CLI para `openclaw skills` (buscar/instalar/actualizar/listar/info/comprobar)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "habilidades"
---

# `openclaw skills`

Inspeccione las habilidades locales e instale/actualice habilidades desde ClawHub.

Relacionado:

- Sistema de habilidades: [Habilidades](/es/tools/skills)
- Configuración de habilidades: [Configuración de habilidades](/es/tools/skills-config)
- Instalaciones de ClawHub: [ClawHub](/es/tools/clawhub)

## Comandos

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills check
openclaw skills check --json
```

`search`/`install`/`update` usan ClawHub directamente e instalan en el directorio del espacio de trabajo activo `skills/`. `list`/`info`/`check` todavía inspeccionan las habilidades locales visibles para el espacio de trabajo y la configuración actuales.

Este comando `install` de la CLI descarga carpetas de habilidades de ClawHub. Las instalaciones de dependencias de habilidades respaldadas por Gateway y activadas desde la incorporación o la configuración de Habilidades utilizan la ruta de solicitud `skills.install` separada en su lugar.

Notas:

- `search [query...]` acepta una consulta opcional; omítala para explorar el feed de
  búsqueda predeterminado de ClawHub.
- `search --limit <n>` limita los resultados devueltos.
- `install --force` sobrescribe una carpeta de habilidad del espacio de trabajo existente para el mismo
  slug.
- `update --all` solo actualiza las instalaciones rastreadas de ClawHub en el espacio de trabajo activo.
- `list` es la acción predeterminada cuando no se proporciona ningún subcomando.
- `list`, `info` y `check` escriben su salida renderizada en stdout. Con
  `--json`, eso significa que la carga legible por máquina se mantiene en stdout para tuberías
  y scripts.
