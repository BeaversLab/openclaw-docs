---
summary: "Referencia de CLI para `openclaw skills` (buscar/instalar/actualizar/listar/info/comprobar)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Habilidades"
---

# `openclaw skills`

Inspeccione las habilidades locales e instale/actualice habilidades desde ClawHub.

Relacionado:

- Sistema de habilidades: [Habilidades](/es/tools/skills)
- Configuración de habilidades: [Configuración de habilidades](/es/tools/skills-config)
- Instalaciones de ClawHub: [ClawHub](/es/clawhub/cli)

## Comandos

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search`/`install`/`update` usan ClawHub directamente e instalan en el directorio del espacio de trabajo activo `skills/`. `list`/`info`/`check` todavía inspeccionan las habilidades locales visibles para el espacio de trabajo y la configuración actuales. Los comandos respaldados por el espacio de trabajo resuelven el espacio de trabajo de destino desde `--agent <id>`, luego el directorio de trabajo actual cuando está dentro de un espacio de trabajo de agente configurado, y luego el agente predeterminado.

Este comando `install` de la CLI descarga carpetas de habilidades de ClawHub. Las instalaciones de dependencias de habilidades respaldadas por Gateway activadas desde la incorporación o la configuración de Habilidades usan la ruta de solicitud `skills.install` separada en su lugar.

Notas:

- `search [query...]` acepta una consulta opcional; omítala para navegar por el feed de búsqueda predeterminado de ClawHub.
- `search --limit <n>` limita los resultados devueltos.
- `install --force` sobrescribe una carpeta de habilidad de espacio de trabajo existente para el mismo slug.
- `--agent <id>` apunta a un espacio de trabajo de agente configurado y anula la inferencia del directorio de trabajo actual.
- `update --all` solo actualiza las instalaciones de ClawHub rastreadas en el espacio de trabajo activo.
- `check --agent <id>` comprueba el espacio de trabajo del agente seleccionado e informa qué habilidades listas son realmente visibles para la superficie de comandos o mensajes de ese agente.
- `list` es la acción predeterminada cuando no se proporciona ningún subcomando.
- `list`, `info` y `check` escriben su salida procesada en stdout. Con `--json`, eso significa que la carga útil legible por máquina se mantiene en stdout para tuberías y scripts.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Habilidades](/es/tools/skills)
