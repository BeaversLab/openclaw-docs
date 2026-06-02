---
summary: "Construir y probar habilidades personalizadas del espacio de trabajo con SKILL.md"
title: "Crear habilidades"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Las habilidades enseñan al agente cómo y cuándo usar las herramientas. Cada habilidad es un directorio
que contiene un archivo `SKILL.md` con frontmatter YAML e instrucciones en markdown.

Para saber cómo se cargan y priorizan las habilidades, consulte [Habilidades](/es/tools/skills).

## Crea tu primera habilidad

<Steps>
  <Step title="Crear el directorio de la habilidad">
    Las habilidades residen en su espacio de trabajo. Cree una nueva carpeta:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    Puede agrupar habilidades en subcarpetas cuando su biblioteca crezca:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    Las carpetas de grupo son solo organizativas. La habilidad todavía se nombra por
    el frontmatter `SKILL.md`, por lo que `name: hello-world` se invoca como
    `/hello-world`.

  </Step>

  <Step title="Escribir SKILL.md">
    Cree `SKILL.md` dentro de ese directorio. El frontmatter define los metadatos
    y el cuerpo markdown contiene instrucciones para el agente.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Use guiones (hyphen-case) con letras minúsculas, dígitos y guiones para el `name` de la habilidad.
    Mantenga el nombre de la carpeta final y el frontmatter `name` alineados.

  </Step>

  <Step title="Agregar herramientas (opcional)">
    Puede definir esquemas de herramientas personalizados en el frontmatter o instruir al agente
    para que use las herramientas del sistema existentes (como `exec` o `browser`). Las habilidades también
    pueden incluirse dentro de complementos junto con las herramientas que documentan.

  </Step>

  <Step title="Cargar la habilidad">
    Verifique que la habilidad se haya cargado:

    ```bash
    openclaw skills list
    ```

    OpenClaw observa los archivos `SKILL.md` anidados bajo las raíces de habilidades. Si el observador
    está deshabilitado o está continuando una sesión existente, inicie una nueva sesión
    para que el modelo reciba la lista de habilidades actualizada:

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Pruébelo">
    Envíe un mensaje que deba activar la habilidad:

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    O simplemente chatee con el agente y pida un saludo.

  </Step>
</Steps>

## Proponer antes de aplicar

Para los procedimientos generados por el agente, utilice una propuesta de Skill Workshop en lugar de
escribir `SKILL.md` directamente:

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal ./PROPOSAL.md
```

Use `--proposal-dir` cuando la propuesta también tenga archivos de soporte:

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal-dir ./hello-world-proposal
```

El borrador se almacena en
`<OPENCLAW_STATE_DIR>/skill-workshop/proposals/<proposal-id>/PROPOSAL.md` y
permanece inactivo hasta que un operador lo revisa y lo aplica. El directorio de estado
predeterminado es `~/.openclaw`. Los directorios de propuestas deben contener `PROPOSAL.md`.
Se pueden incluir archivos de soporte en `assets/`, `examples/`, `references/`,
`scripts/` o `templates/`; OpenClaw los almacena y escanea con la propuesta:

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
```

Cuando se aplica, OpenClaw escribe el `SKILL.md` final en la raíz del espacio de trabajo `skills/`,
escribe los archivos de soporte aprobados junto a él y elimina los frontmatter
solo para propuestas, como `status: proposal`, propuesta `version` y propuesta
`date`.

## Referencia de metadatos de habilidades

El frontmatter YAML admite estos campos:

| Campo                               | Obligatorio | Descripción                                                      |
| ----------------------------------- | ----------- | ---------------------------------------------------------------- |
| `name`                              | Sí          | Identificador único que usa letras minúsculas, dígitos y guiones |
| `description`                       | Sí          | Descripción de una línea que se muestra al agente                |
| `metadata.openclaw.os`              | No          | Filtro de sistema operativo (`["darwin"]`, `["linux"]`, etc.)    |
| `metadata.openclaw.requires.bins`   | No          | Binarios requeridos en PATH                                      |
| `metadata.openclaw.requires.config` | No          | Claves de configuración requeridas                               |

## Funcionalidades avanzadas

Una vez que una habilidad básica funciona, estos campos ayudan a que sea confiable y portátil:

- **Activación condicional** — use `requires.bins`, `requires.env` o
  `requires.config` para cargar la habilidad solo cuando las dependencias requeridas estén
  disponibles. Consulte [Referencia de habilidades: filtrado](/es/tools/skills#gating).
- **Entorno y cableado de API-key** — use `skills.entries.<name>.env` y
  `skills.entries.<name>.apiKey` para inyectar el entorno del lado del host para un turno
  de skill. Consulte [Skills reference: config wiring](/es/tools/skills#config-wiring).
- **Control de invocación** — establezca `user-invocable: false` para ocultar un comando de barra,
  o `disable-model-invocation: true` para mantener una skill de estilo de comando fuera del
  prompt del modelo. Consulte [Skills reference: frontmatter](/es/tools/skills#frontmatter).
- **Despacho directo de comandos** — use `command-dispatch: tool` con
  `command-tool` cuando un comando de barra deba llamar a una herramienta directamente en lugar de
  enrutar a través del modelo.
- **Rutas portables** — use `{baseDir}` en `SKILL.md` al referenciar scripts
  o activos dentro del directorio de la skill.
- **Publicación** — use la skill ClawHub al preparar una skill para su publicación.
  Documenta la forma actual del comando `clawhub publish` y los metadatos
  requeridos.

## Mejores prácticas

- **Sea conciso** — instruya al modelo sobre _qué_ hacer, no sobre cómo ser una IA
- **Seguridad ante todo** — si su skill usa `exec`, asegúrese de que los prompts no permitan la inyección arbitraria de comandos desde entradas que no son de confianza
- **Probar localmente** — use `openclaw agent --message "..."` para probar antes de compartir
- **Use ClawHub** — explore y contribuya con skills en [ClawHub](https://clawhub.ai)

## Dónde residen las skills

| Ubicación                       | Precedencia | Ámbito                              |
| ------------------------------- | ----------- | ----------------------------------- |
| `\<workspace\>/skills/`         | La más alta | Por agente                          |
| `\<workspace\>/.agents/skills/` | Alta        | Agente por área de trabajo          |
| `~/.agents/skills/`             | Media       | Perfil de agente compartido         |
| `~/.openclaw/skills/`           | Media       | Compartido (todos los agentes)      |
| Incluido (enviado con OpenClaw) | Baja        | Global                              |
| `skills.load.extraDirs`         | La más baja | Carpetas compartidas personalizadas |

Cada raíz de skills puede contener carpetas de skills directas como
`skills/hello-world/SKILL.md` o carpetas agrupadas como
`skills/personal/hello-world/SKILL.md`.

## Relacionado

- [Skills reference](/es/tools/skills) — reglas de carga, precedencia y restricción
- [Skills config](/es/tools/skills-config) — esquema de configuración de `skills.*`
- [ClawHub](/es/clawhub) — registro público de habilidades
- [Crear complementos](/es/plugins/building-plugins) — los complementos pueden incluir habilidades
