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

- Sistema de habilidades: [Habilidades](/en/tools/skills)
- Configuración de habilidades: [Configuración de habilidades](/en/tools/skills-config)
- Instalaciones de ClawHub: [ClawHub](/en/tools/clawhub)

## Comandos

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` usan ClawHub directamente e instalan en el directorio del espacio de trabajo activo `skills/`. `list`/`info`/`check` todavía inspeccionan las habilidades locales visibles para el espacio de trabajo y la configuración actuales.
