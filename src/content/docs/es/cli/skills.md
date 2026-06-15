---
summary: "Referencia de CLI para `openclaw skills` (buscar/instalar/actualizar/verificar/listar/info/comprobar/taller)"
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
- Taller de habilidades: [Taller de habilidades](/es/tools/skill-workshop)
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
openclaw skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Not reusable"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`, `update` y `verify` usan ClawHub directamente. `install <slug>` instala
una habilidad de ClawHub, `install git:owner/repo[@ref]` clona una habilidad de Git y
`install ./path` copia un directorio de habilidades local. De forma predeterminada, `install`, `update`
y `verify` tienen como objetivo el directorio `skills/` del espacio de trabajo activo; con `--global`,
tienen como objetivo el directorio compartido de habilidades administradas. `list`/`info`/`check` todavía
inspeccionan las habilidades locales visibles para el espacio de trabajo y la configuración actuales.
Los comandos respaldados por el espacio de trabajo resuelven el espacio de trabajo de destino desde `--agent <id>`, luego
el directorio de trabajo actual cuando está dentro de un espacio de trabajo de agente configurado,
luego el agente predeterminado.

Las instalaciones de Git y de directorios locales esperan `SKILL.md` en la raíz de la fuente. El
slug de instalación proviene del frontmatter `name` de `SKILL.md` cuando es válido, luego el
nombre del directorio fuente o del repositorio; use `--as <slug>` para anularlo. `--version`
es exclusivo de ClawHub. Las instalaciones de habilidades no admiten especificaciones de paquetes npm o rutas de zip/archivos,
y `openclaw skills update` actualiza solo las instalaciones rastreadas por ClawHub.

Las instalaciones de dependencias de habilidades respaldadas por Gateway, activadas desde la incorporación o la configuración de
Habilidades, usan la ruta de solicitud `skills.install` separada en su lugar.

Notas:

- `search [query...]` acepta una consulta opcional; omítala para explorar el feed de
  búsqueda predeterminado de ClawHub.
- `search --limit <n>` limita los resultados devueltos.
- `install git:owner/repo[@ref]` instala una habilidad de Git. Las referencias de ramas pueden contener
  barras, como `git:owner/repo@feature/foo`.
- `install ./path/to/skill` instala un directorio local cuya raíz contiene
  `SKILL.md`.
- `install --as <slug>` anula el slug inferido para las instalaciones de Git y directorios
  locales.
- `install --version <version>` se aplica solo a los slugs de habilidades de ClawHub.
- `install --force` sobrescribe una carpeta de habilidad de espacio de trabajo existente para el mismo
  slug.
- `--global` apunta al directorio compartido de habilidades administradas y no se puede combinar
  con `--agent <id>`.
- `--agent <id>` apunta a un espacio de trabajo de agente configurado y anula la inferencia del
  directorio de trabajo actual.
- `update <slug>` actualiza una sola habilidad rastreada. Añada `--global` para apuntar al
  directorio compartido de habilidades administradas en lugar del espacio de trabajo.
- `update --all` actualiza las instalaciones rastreadas de ClawHub en el espacio de trabajo seleccionado, o
  en el directorio compartido de habilidades administradas cuando se combina con `--global`.
- `verify <slug>` imprime el sobre JSON `clawhub.skill.verify.v1` de ClawHub por
  defecto. No hay un indicador `--json` porque JSON ya es el predeterminado.
- `verify` usa `.clawhub/origin.json` para las habilidades de ClawHub instaladas, por lo que
  verifica la versión instalada contra el registro de donde provino. `--version`
  y `--tag` anulan el selector de versión pero mantienen ese registro instalado
  cuando existe metadatos de origen.
- `verify --card` imprime el Markdown de la Skill Card generada en lugar de JSON. El
  comando sale con un valor distinto de cero cuando ClawHub devuelve `ok: false` o `decision: "fail"`;
  las firmas sin firmar son informativas a menos que la política de ClawHub cambie.
- Los paquetes instalados de ClawHub pueden incluir un `skill-card.md` generado. OpenClaw
  trata la verificación como una decisión del servidor de ClawHub y no rechaza una
  habilidad instalada solo porque esa tarjeta generada cambia la huella digital
  del paquete.
- `check --agent <id>` verifica el espacio de trabajo del agente seleccionado e informa qué
  habilidades listas son visibles para el aviso o la superficie de comandos de ese agente.
- `list` es la acción predeterminada cuando no se proporciona ningún subcomando.
- `list`, `info` y `check` escriben su salida renderizada en stdout. Con
  `--json`, eso significa que la carga útil legible por máquina permanece en stdout para tuberías
  y scripts.

## Taller de habilidades

`openclaw skills workshop` gestiona las propuestas de habilidades pendientes en el espacio de trabajo
seleccionado. Las propuestas no son habilidades activas hasta que se aplican. Para el almacenamiento de propuestas,
las salvaguardas de archivos de soporte, los métodos de Gateway y la política de aprobación, consulte
[Taller de habilidades](/es/tools/skill-workshop).

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## Relacionado

- [Referencia de CLI](/es/cli)
- [Habilidades](/es/tools/skills)
