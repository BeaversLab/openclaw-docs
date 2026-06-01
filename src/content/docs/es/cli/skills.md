---
summary: "Referencia de CLI para `openclaw skills` (buscar/instalar/actualizar/verificar/listar/info/comprobar)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to verify a ClawHub skill with ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Habilidades"
---

# `openclaw skills`

Inspeccionar habilidades locales, buscar en ClawHub, instalar habilidades desde directorios de ClawHub/Git/locales, verificar habilidades de ClawHub y actualizar instalaciones rastreadas por ClawHub.

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
openclaw skills verify <slug>
openclaw skills verify <slug> --version <version>
openclaw skills verify <slug> --tag <tag>
openclaw skills verify <slug> --card
openclaw skills verify <slug> --global
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

`search`, `update` y `verify` usan ClawHub directamente. `install <slug>` instala una habilidad de ClawHub, `install git:owner/repo[@ref]` clona una habilidad de Git y `install ./path` copia un directorio de habilidad local. Por defecto, `install`, `update` y `verify` apuntan al directorio `skills/` del espacio de trabajo activo; con `--global`, apuntan al directorio compartido de habilidades administradas. `list`/`info`/`check` todavía inspeccionan las habilidades locales visibles para el espacio de trabajo y la configuración actuales. Los comandos respaldados por el espacio de trabajo resuelven el espacio de trabajo de destino desde `--agent <id>`, luego el directorio de trabajo actual cuando está dentro de un espacio de trabajo de agente configurado, y luego el agente predeterminado.

Las instalaciones de directorios de Git y locales esperan `SKILL.md` en la raíz de la fuente. El slug de instalación proviene del `SKILL.md` frontmatter `name` cuando es válido, luego del directorio fuente o del nombre del repositorio; use `--as <slug>` para anularlo. `--version` es solo para ClawHub. Las instalaciones de habilidades no admiten especificaciones de paquetes npm o rutas zip/archivo, y `openclaw skills update` actualiza solo las instalaciones rastreadas por ClawHub.

Las instalaciones de dependencias de habilidades respaldadas por el portal, activadas desde la incorporación o la configuración de Habilidades, usan la ruta de solicitud `skills.install` separada en su lugar.

Notas:

- `search [query...]` acepta una consulta opcional; omítala para explorar el feed de búsqueda predeterminado de ClawHub.
- `search --limit <n>` limita los resultados devueltos.
- `install git:owner/repo[@ref]` instala una habilidad de Git. Las referencias de ramas pueden contener
  barras, como `git:owner/repo@feature/foo`.
- `install ./path/to/skill` instala un directorio local cuya raíz contiene
  `SKILL.md`.
- `install --as <slug>` anula el slug inferido para instalaciones de Git y directorios locales.
- `install --version <version>` se aplica solo a los slugs de habilidades de ClawHub.
- `install --force` sobrescribe una carpeta de habilidad de espacio de trabajo existente para el mismo
  slug.
- `--global` apunta al directorio compartido de habilidades administradas y no se puede combinar
  con `--agent <id>`.
- `--agent <id>` apunta a un espacio de trabajo de agente configurado y anula la inferencia
  del directorio de trabajo actual.
- `update <slug>` actualiza una única habilidad rastreada. Agregue `--global` para apuntar al
  directorio compartido de habilidades administradas en lugar del espacio de trabajo.
- `update --all` actualiza las instalaciones rastreadas de ClawHub en el espacio de trabajo seleccionado, o
  en el directorio compartido de habilidades administradas cuando se combina con `--global`.
- `verify <slug>` imprime el sobre JSON `clawhub.skill.verify.v1` de ClawHub por
  defecto. No hay una bandera `--json` porque JSON ya es el predeterminado.
- `verify` usa `.clawhub/origin.json` para las habilidades instaladas de ClawHub, por lo que
  verifica la versión instalada contra el registro de donde provino. `--version`
  y `--tag` anulan el selector de versión pero mantienen ese registro instalado
  cuando existen metadatos de origen.
- `verify --card` imprime el Markdown de la Tarjeta de Habilidad generada en lugar de JSON. El
  comando sale con un estado distinto de cero cuando ClawHub devuelve `ok: false` o `decision: "fail"`;
  las firmas sin firmar son informativas a menos que la política de ClawHub cambie.
- Los paquetes instalados de ClawHub pueden incluir un `skill-card.md` generado. OpenClaw
  trata la verificación como una decisión del servidor de ClawHub y no rechaza una
  habilidad instalada solo porque esa tarjeta generada cambia la huella digital
  del paquete.
- `check --agent <id>` comprueba el espacio de trabajo del agente seleccionado e informa de qué habilidades listas son realmente visibles para el mensaje o la superficie de comandos de ese agente.
- `list` es la acción predeterminada cuando no se proporciona ningún subcomando.
- `list`, `info` y `check` escriben su salida procesada en stdout. Con
  `--json`, eso significa que la carga legible por máquina se mantiene en stdout para tuberías (pipes)
  y scripts.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Habilidades](/es/tools/skills)
