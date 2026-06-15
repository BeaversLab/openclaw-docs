---
title: "Crear habilidades"
sidebarTitle: "Crear habilidades"
summary: "Construya, pruebe y publique habilidades de espacio de trabajo SKILL.md personalizadas para sus agentes de OpenClaw."
read_when:
  - You are creating a new custom skill
  - You need a quick starter workflow for SKILL.md-based skills
  - You want to use Skill Workshop to propose a skill for agent review
---

Las habilidades enseñan al agente cómo y cuándo usar las herramientas. Cada habilidad es un directorio
que contiene un archivo `SKILL.md` con frontmatter YAML e instrucciones markdown.
OpenClaw carga habilidades desde varias raíces en un [orden de precedencia](/es/tools/skills#loading-order) definido.

## Crea tu primera habilidad

<Steps>
  <Step title="Crear el directorio de la habilidad">
    Las habilidades residen en su carpeta del espacio de trabajo `skills/`. Cree un directorio para su
    nueva habilidad:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    Puede agrupar habilidades en subcarpetas para organizarlas — la habilidad aún se
    nombra por el frontmatter `SKILL.md`, no por la ruta de la carpeta:

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # skill name is still "hello-world", invoked as /hello-world
    ```

  </Step>

  <Step title="Escribir SKILL.md">
    Cree `SKILL.md` dentro del directorio. El frontmatter define los metadatos;
    el cuerpo le da instrucciones al agente.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that prints a greeting.
    ---

    # Hello World

    When the user asks for a greeting, use the `exec` tool to run:

    ```bash
    echo "Hello from your custom skill!"
    ```
    ```

    Reglas de nomenclatura:
    - Use letras minúsculas, dígitos y guiones para `name`.
    - Mantenga el nombre del directorio y el frontmatter `name` alineados.
    - `description` se muestra al agente y en el descubrimiento de comandos de barra —
      manténgalo en una línea y por debajo de 160 caracteres.

  </Step>

  <Step title="Verificar que la habilidad se cargó">
    ```bash
    openclaw skills list
    ```

    OpenClaw observa los archivos `SKILL.md` bajo las raíces de habilidades por defecto. Si el
    observador está deshabilitado o está continuando una sesión existente, inicie una
    nueva para que el agente reciba la lista actualizada:

    ```bash
    # From chat — archive current session and start fresh
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Probarlo">
    Envíe un mensaje que debería activar la habilidad:

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    O abra un chat y pregúntele al agente directamente. Use `/skill hello-world` para
    invocarla explícitamente por nombre.

  </Step>
</Steps>

## Referencia de SKILL.md

### Campos obligatorios

| Campo         | Descripción                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `name`        | Identificador único usando letras minúsculas, dígitos y guiones                 |
| `description` | Descripción de una línea mostrada al agente y en el resultado de descubrimiento |

### Claves de frontmatter opcionales

| Campo                      | Predeterminado | Descripción                                                                                                 |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `user-invocable`           | `true`         | Exponer la habilidad como un comando de barra diagonal del usuario                                          |
| `disable-model-invocation` | `false`        | Mantener la habilidad fuera del mensaje del sistema del agente (aún se ejecuta a través de `/skill`)        |
| `command-dispatch`         | —              | Establézcalo en `tool` para enrutar el comando de barra directamente a una herramienta, omitiendo el modelo |
| `command-tool`             | —              | Nombre de la herramienta a invocar cuando `command-dispatch: tool` está establecido                         |
| `command-arg-mode`         | `raw`          | Para el envío a la herramienta, reenvía la cadena de argumentos cruda a la herramienta                      |
| `homepage`                 | —              | URL que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS                       |

Para los campos de puerta de enlace (`requires.bins`, `requires.env`, etc.) consulte
[Habilidades — Puerta de enlace](/es/tools/skills#gating).

### Uso de `{baseDir}`

Use `{baseDir}` en el cuerpo de la habilidad para hacer referencia a archivos dentro del directorio
de la habilidad sin codificar rutas:

```markdown
Run the helper script at `{baseDir}/scripts/run.sh`.
```

## Agregar activación condicional

Establezca una puerta de enlace para su habilidad para que solo se cargue cuando sus dependencias estén disponibles:

```markdown
---
name: gemini-search
description: Search using Gemini CLI.
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion title="Opciones de filtrado">
    | Clave | Descripción |
    | --- | --- |
    | `requires.bins` | Todos los binarios deben existir en `PATH` |
    | `requires.anyBins` | Al menos un binario debe existir en `PATH` |
    | `requires.env` | Cada variable de entorno debe existir en el proceso o en la configuración |
    | `requires.config` | Cada ruta `openclaw.json` debe ser verdadera |
    | `os` | Filtro de plataforma: `["darwin"]`, `["linux"]`, `["win32"]` |
    | `always` | Establezca `true` para omitir todos los filtros e incluir siempre la skill |

    Referencia completa: [Skills — Gating](/es/tools/skills#gating).

  </Accordion>
  <Accordion title="Entorno y claves API">
    Conecte una clave API a una entrada de skill en `openclaw.json`:

    ```json5
    {
      skills: {
        entries: {
          "gemini-search": {
            enabled: true,
            apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
          },
        },
      },
    }
    ```

    La clave se inyecta en el proceso host solo para ese turno del agente.
    No llega al sandbox — consulte
    [variables de entorno en sandbox](/es/tools/skills-config#sandboxed-skills-and-env-vars).

  </Accordion>
</AccordionGroup>

## Proponer a través de Skill Workshop

Para habilidades redactadas por el agente o cuando desee una revisión del operador antes de que una habilidad se
active, use propuestas de [Skill Workshop](/es/tools/skill-workshop) en lugar de escribir
`SKILL.md` directamente.

```bash
# Propose a brand-new skill
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal ./PROPOSAL.md

# Propose an update to an existing skill
openclaw skills workshop propose-update hello-world \
  --proposal ./PROPOSAL.md \
  --description "Updated greeting skill"
```

Use `--proposal-dir` cuando la propuesta incluya archivos de soporte:

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal-dir ./hello-world-proposal/
```

El directorio debe contener `PROPOSAL.md`. Los archivos de soporte pueden ir en `assets/`,
`examples/`, `references/`, `scripts/` o `templates/`.

Después de la revisión:

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

Consulte [Skill Workshop](/es/tools/skill-workshop) para ver el ciclo de vida completo de la propuesta.

## Publicar en ClawHub

<Steps>
  <Step title="Asegúrese de que su SKILL.md esté completo">
    Asegúrese de que `name`, `description` y cualquier `metadata.openclaw` campos de filtrado
    estén configurados. Agregue una URL `homepage` si tiene una página de proyecto.
  </Step>
  <Step title="Instalar la habilidad ClawHub">
    La habilidad ClawHub documenta la forma actual del comando de publicación y los metadatos
    requeridos:

    ```bash
    openclaw skills install clawhub-publish
    ```

  </Step>
  <Step title="Publicar">
    ```bash
    clawhub publish
    ```

    Consulte [ClawHub — Publicación](/es/clawhub/publishing) para ver el flujo completo.

  </Step>
</Steps>

## Mejores prácticas

<Tip>
  - **Sea conciso** — indique al modelo *qué* hacer, no cómo ser una IA. - **Seguridad primero** — si su habilidad usa `exec`, asegúrese de que los prompts no permitan la inyección de comandos arbitrarios desde entradas que no son de confianza. - **Pruebe localmente** — use `openclaw agent --message "..."` antes de compartir. - **Use ClawHub** — explore las habilidades de la comunidad en
  [clawhub.ai](https://clawhub.ai) antes de construir desde cero.
</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Referencia de habilidades" href="/es/tools/skills" icon="puzzle-piece">
    Orden de carga, restricciones, listas de permitidos y formato SKILL.md.
  </Card>
  <Card title="Skill Workshop" href="/es/tools/skill-workshop" icon="flask">
    Cola de propuestas para habilidades redactadas por el agente.
  </Card>
  <Card title="Configuración de habilidades" href="/es/tools/skills-config" icon="gear">
    Esquema de configuración `skills.*` completo.
  </Card>
  <Card title="ClawHub" href="/es/clawhub" icon="cloud">
    Explore y publique habilidades en el registro público.
  </Card>
  <Card title="Construcción de complementos" href="/es/plugins/building-plugins" icon="plug">
    Los complementos pueden incluir habilidades junto con las herramientas que documentan.
  </Card>
</CardGroup>
