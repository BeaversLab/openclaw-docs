---
summary: "Referencia de CLI para `openclaw skills` (buscar/instalar/actualizar/listar/info/comprobar)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to debug missing binaries/env/config for skills
title: "Habilidades"
---

# `openclaw skills`

Inspeccione habilidades locales, busque en ClawHub, instale habilidades desde ClawHub/Git/directorios locales y actualice
las instalaciones rastreadas por ClawHub.

Relacionado:

- Sistema de habilidades: [Skills](/es/tools/skills)
- Configuración de habilidades: [Skills config](/es/tools/skills-config)
- Instalaciones de ClawHub: [ClawHub](/es/clawhub/cli)

## Comandos

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
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

`search` y `update` usan ClawHub directamente. `install <slug>` instala una habilidad de ClawHub,
`install git:owner/repo[@ref]` clona una habilidad de Git y `install ./path`
copia un directorio de habilidad local. De manera predeterminada, `install` y `update` apuntan al
directorio `skills/` del espacio de trabajo activo; con `--global`, apuntan al directorio compartido
de habilidades administradas. `list`/`info`/`check` todavía inspeccionan las habilidades locales
visibles para el espacio de trabajo y la configuración actuales. Los comandos respaldados por el espacio de trabajo resuelven
el espacio de trabajo de destino desde `--agent <id>`, luego el directorio de trabajo actual
cuando está dentro de un espacio de trabajo de agente configurado, y luego el agente predeterminado.

Las instalaciones desde directorios Git y locales esperan `SKILL.md` en la raíz de la fuente. El slug de instalación
proviene del frontmatter `name` de `SKILL.md` cuando es válido, y luego del
directorio fuente o el nombre del repositorio; use `--as <slug>` para anularlo. `--version`
es exclusivo de ClawHub. Las instalaciones de habilidades no soportan especificaciones de paquetes npm o rutas zip/de archivadores,
y `openclaw skills update` actualiza solo las instalaciones rastreadas por ClawHub.

Las instalaciones de dependencias de habilidades respaldadas por Gateway, activadas desde la incorporación o la configuración de
Habilidades, usan la ruta de solicitud separada `skills.install` en su lugar.

Notas:

- `search [query...]` acepta una consulta opcional; omítala para explorar el feed de
  búsqueda predeterminado de ClawHub.
- `search --limit <n>` limita los resultados devueltos.
- `install git:owner/repo[@ref]` instala una habilidad de Git. Las referencias de ramas pueden contener
  barras, como `git:owner/repo@feature/foo`.
- `install ./path/to/skill` instala un directorio local cuya raíz contiene
  `SKILL.md`.
- `install --as <slug>` anula el slug inferido para las instalaciones de Git y
  directorios locales.
- `install --version <version>` se aplica solo a los slugs de habilidades de ClawHub.
- `install --force` sobrescribe una carpeta de habilidad de espacio de trabajo existente
  para el mismo slug.
- `--global` apunta al directorio compartido de habilidades administradas y no puede combinarse
  con `--agent <id>`.
- `--agent <id>` apunta a un espacio de trabajo de agente configurado y anula la inferencia
  del directorio de trabajo actual.
- `update <slug>` actualiza una sola habilidad rastreada. Agregue `--global` para apuntar al
  directorio compartido de habilidades administradas en lugar del espacio de trabajo.
- `update --all` actualiza las instalaciones rastreadas de ClawHub en el espacio de trabajo seleccionado, o
  en el directorio compartido de habilidades administradas cuando se combina con `--global`.
- `check --agent <id>` verifica el espacio de trabajo del agente seleccionado e informa qué
  habilidades listas son realmente visibles para el prompt o la superficie de comandos de ese agente.
- `list` es la acción predeterminada cuando no se proporciona ningún subcomando.
- `list`, `info` y `check` escriben su salida procesada en stdout. Con
  `--json`, eso significa que la carga legible por máquina se mantiene en stdout para tuberías
  y scripts.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Habilidades](/es/tools/skills)
