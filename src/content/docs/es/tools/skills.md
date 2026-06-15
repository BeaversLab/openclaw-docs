---
title: "Habilidades"
sidebarTitle: "Habilidades"
summary: "Las habilidades enseñan a tu agente cómo usar las herramientas. Aprende cómo se cargan, cómo funciona la precedencia y cómo configurar el control de acceso, las listas permitidas y la inyección de entorno."
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
---

Las habilidades son archivos de instrucciones en Markdown que enseñan al agente cómo y cuándo usar las herramientas. Cada habilidad reside en un directorio que contiene un archivo `SKILL.md` con un frontmatter YAML y un cuerpo en Markdown. OpenClaw carga las habilidades agrupadas más cualquier anulación local, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

<CardGroup cols={2}>
  <Card title="Creación de habilidades" href="/es/tools/creating-skills" icon="hammer">
    Construye y prueba una habilidad personalizada desde cero.
  </Card>
  <Card title="Taller de habilidades" href="/es/tools/skill-workshop" icon="flask">
    Revisa y aprueba las propuestas de habilidades redactadas por el agente.
  </Card>
  <Card title="Configuración de habilidades" href="/es/tools/skills-config" icon="gear">
    Esquema de configuración `skills.*` completo y listas permitidas de agentes.
  </Card>
  <Card title="ClawHub" href="/es/clawhub" icon="cloud">
    Explora e instala habilidades de la comunidad.
  </Card>
</CardGroup>

## Orden de carga

OpenClaw se carga desde estas fuentes, **primero la mayor precedencia**. Cuando el mismo nombre de habilidad aparece en varios lugares, gana la fuente más alta.

| Prioridad       | Fuente                              | Ruta                                                  |
| --------------- | ----------------------------------- | ----------------------------------------------------- |
| 1 — la más alta | Habilidades del espacio de trabajo  | `<workspace>/skills`                                  |
| 2               | Habilidades del agente del proyecto | `<workspace>/.agents/skills`                          |
| 3               | Habilidades del agente personal     | `~/.agents/skills`                                    |
| 4               | Habilidades administradas / locales | `~/.openclaw/skills`                                  |
| 5               | Habilidades agrupadas               | incluidas con la instalación                          |
| 6 — la más baja | Directorios adicionales             | `skills.load.extraDirs` + habilidades de complementos |

Las raíces de habilidades admiten diseños agrupados. OpenClaw descubre una habilidad cada vez que
aparece `SKILL.md` en cualquier lugar bajo una raíz configurada:

```text
<workspace>/skills/research/SKILL.md          ✓ found as "research"
<workspace>/skills/personal/research/SKILL.md ✓ also found as "research"
```

La ruta de la carpeta es solo para la organización. El nombre de la habilidad, el comando de barra y
la clave de lista de permitidos provienen del campo de frontmatter `name` (o del nombre del directorio
cuando falta `name`).

<Note>El directorio nativo `$CODEX_HOME/skills` de Codex CLI **no** es una raíz de habilidades de OpenClaw. Use `openclaw migrate plan codex` para inventariar esas habilidades y luego `openclaw migrate codex` para copiarlas en su espacio de trabajo de OpenClaw.</Note>

## Habilidades por agente vs. compartidas

En configuraciones multiagente, cada agente tiene su propio espacio de trabajo. Use la ruta que
coincida con la visibilidad deseada:

| Ámbito                  | Ruta                         | Visible para                             |
| ----------------------- | ---------------------------- | ---------------------------------------- |
| Por agente              | `<workspace>/skills`         | Solo ese agente                          |
| Agente de proyecto      | `<workspace>/.agents/skills` | Solo el agente de ese espacio de trabajo |
| Agente personal         | `~/.agents/skills`           | Todos los agentes en esta máquina        |
| Compartido gestionado   | `~/.openclaw/skills`         | Todos los agentes en esta máquina        |
| Directorios adicionales | `skills.load.extraDirs`      | Todos los agentes en esta máquina        |

## Listas de permitidos del agente

La **ubicación** de la habilidad (precedencia) y la **visibilidad** de la habilidad (qué agente puede usarla)
son controles separados. Use listas de permitidos para restringir qué habilidades ve un agente,
independientemente de dónde se carguen.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Reglas de lista de permitidos">
    - Omita `agents.defaults.skills` para dejar todas las habilidades sin restricciones de forma predeterminada. - Omita `agents.list[].skills` para heredar `agents.defaults.skills`. - Establezca `agents.list[].skills: []` para no exponer ninguna habilidad para ese agente. - Una lista `agents.list[].skills` no vacía es el conjunto **final**; no se fusiona con los valores predeterminados. - La
    lista de permitidos efectiva se aplica durante la construcción del prompt, el descubrimiento de comandos de barra, la sincronización del sandbox y las instantáneas de habilidades.
  </Accordion>
</AccordionGroup>

## Complementos y habilidades

Los complementos pueden incluir sus propias habilidades listando los directorios `skills` en `openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos se cargan cuando el complemento está habilitado; por ejemplo, el complemento del navegador incluye una habilidad `browser-automation` para el control del navegador en varios pasos.

Los directorios de habilidades de los complementos se fusionan al mismo nivel de baja prioridad que `skills.load.extraDirs`, por lo que una habilidad incluida, administrada, de agente o de espacio de trabajo con el mismo nombre las anula. Puede controlarlas mediante `metadata.openclaw.requires.config` en la entrada de configuración del complemento.

Consulte [Plugins](/es/tools/plugin) y [Tools](/es/tools) para obtener información completa sobre el sistema de complementos.

## Skill Workshop

[Skill Workshop](/es/tools/skill-workshop) es una cola de propuestas entre el agente y sus archivos de habilidad activos. Cuando el agente detecta trabajo reutilizable, redacta una propuesta en lugar de escribir directamente en `SKILL.md`. Usted revisa y aprueba antes de que se realice cualquier cambio.

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

Consulte [Skill Workshop](/es/tools/skill-workshop) para conocer el ciclo de vida completo, la referencia de la CLI y la configuración.

## Instalar desde ClawHub

[ClawHub](https://clawhub.ai) es el registro público de habilidades. Utilice los comandos `openclaw skills` para instalar y actualizar, o la CLI `clawhub` para publicar y sincronizar.

| Acción                                                     | Comando                                                |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Instalar una habilidad en el espacio de trabajo            | `openclaw skills install <slug>`                       |
| Instalar desde un repositorio Git                          | `openclaw skills install git:owner/repo@ref`           |
| Instalar un directorio de habilidad local                  | `openclaw skills install ./path/to/skill --as my-tool` |
| Instalar para todos los agentes locales                    | `openclaw skills install <slug> --global`              |
| Actualizar todas las habilidades del espacio de trabajo    | `openclaw skills update --all`                         |
| Actualizar una habilidad administrada compartida           | `openclaw skills update <slug> --global`               |
| Actualizar todas las habilidades administradas compartidas | `openclaw skills update --all --global`                |
| Verificar el sobre de confianza de una habilidad           | `openclaw skills verify <slug>`                        |
| Imprimir la Skill Card generada                            | `openclaw skills verify <slug> --card`                 |
| Publicar / sincronizar mediante la CLI de ClawHub          | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion title="Detalles de la instalación">
    `openclaw skills install` se instala en el espacio de trabajo activo `skills/`
    de forma predeterminada. Añada `--global` para instalar en el directorio
    `~/.openclaw/skills` compartido, visible para todos los agentes locales a menos que las
    listas de permitidos del agente lo limiten.

    Las instalaciones de Git y locales esperan un `SKILL.md` en la raíz de origen. El slug proviene
    del frontmatter `SKILL.md` `name` cuando es válido, de lo contrario se recurre al
    nombre del directorio o del repositorio. Use `--as <slug>` para anularlo.
    `openclaw skills update` rastrea solo las instalaciones de ClawHub: reinstale fuentes de Git o
    locales para actualizarlas.

  </Accordion>
  <Accordion title="Verificación y análisis de seguridad">
    `openclaw skills verify <slug>` solicita a ClawHub el sobre de
    confianza `clawhub.skill.verify.v1` de la habilidad. Las habilidades de ClawHub instaladas se verifican
    contra la versión y el registro registrados en `.clawhub/origin.json`.

    Las páginas de habilidades de ClawHub exponen el último estado del análisis de seguridad antes de la instalación,
    con páginas de detalle para VirusTotal, ClawScan y análisis estático. El
    comando sale con un valor distinto de cero cuando ClawHub marca la verificación como fallida. Los editores
    recuperan los falsos positivos a través del panel de ClawHub o
    `clawhub skill rescan <slug>`.

  </Accordion>
  <Accordion title="Instalaciones de archivo privado">
    Los clientes de Gateway que necesiten entrega que no sea de ClawHub pueden preparar un archivo de habilidad zip
    con `skills.upload.begin`, `skills.upload.chunk` y `skills.upload.commit`,
    y luego instalar con `skills.install({ source: "upload", ... })`. Esta ruta está
    desactivada de forma predeterminada y requiere `skills.install.allowUploadedArchives: true` en
    `openclaw.json`. Las instalaciones normales de ClawHub nunca necesitan esa configuración.
  </Accordion>
</AccordionGroup>

## Seguridad

<Warning>Trate las habilidades de terceros como **código no confiable**. Léalas antes de habilitarlas. Prefiera ejecuciones en sandbox para entradas no confiables y herramientas riesgosas. Consulte [Sandboxing](/es/gateway/sandboxing) para controles del lado del agente.</Warning>

<AccordionGroup>
  <Accordion title="Path containment">
    El descubrimiento de habilidades del espacio de trabajo, el agente del proyecto y el directorio adicional solo acepta raíces de habilidad cuya ruta real resuelta se mantenga dentro de la raíz configurada, a menos que `skills.load.allowSymlinkTargets` confíe explícitamente en una raíz de destino.
    Las `~/.openclaw/skills` administradas y las `~/.agents/skills` personales pueden contener carpetas de habilidad enlazadas simbólicamente, pero cada ruta real `SKILL.md` todavía debe mantenerse dentro de su directorio de habilidad resuelto.
  </Accordion>
  <Accordion title="Scan and scan overrides">
    Las instalaciones de habilidades respaldadas por Gateway (incorporación, interfaz de usuario de configuración de Skills) ejecutan el escáner de código peligroso integrado antes de ejecutar los metadatos del instalador.
    Los hallazgos de `critical` se bloquean de forma predeterminada; los hallazgos de `suspicious` solo advierten.
    `openclaw skills install <slug>` descarga una carpeta de habilidad de ClawHub directamente y no utiliza el escáner de metadatos del instalador.
  </Accordion>
  <Accordion title="Secret injection scope">
    `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host** solo para ese turno del agente, no en el sandbox. Mantenga los secretos fuera de los mensajes y registros.
  </Accordion>
</AccordionGroup>

Para ver el modelo de amenazas más amplio y las listas de verificación de seguridad, consulte
[Security](/es/gateway/security).

## Formato SKILL.md

Cada habilidad necesita como mínimo un `name` y un `description` en el frontmatter:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---

When the user asks to generate an image, use the `image_generate` tool...
```

<Note>OpenClaw sigue la especificación [AgentSkills](https://agentskills.io). El analizador de frontmatter admite **solo claves de una sola línea** — `metadata` debe ser un objeto JSON de una sola línea. Use `{baseDir}` en el cuerpo para hacer referencia a la ruta de la carpeta de habilidad.</Note>

### Claves de frontmatter opcionales

<ParamField path="homepage" type="string">
  URL que se muestra como "Sitio web" en la interfaz de usuario de Skills de macOS. También compatible a través de `metadata.openclaw.homepage`.
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  Cuando `true`, la habilidad se expone como un comando de barra invocable por el usuario.
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  Cuando `true`, OpenClaw mantiene las instrucciones de la habilidad fuera del prompt normal del agente. La habilidad todavía está disponible como un comando de barra cuando `user-invocable` también es `true`.
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  Cuando se establece en `tool`, el comando de barra omite el modelo y envía directamente a una herramienta registrada.
</ParamField>

<ParamField path="command-tool" type="string">
  Nombre de la herramienta a invocar cuando `command-dispatch: tool` está establecido.
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Para el envío de herramientas, reenvía la cadena de argumentos raw a la herramienta sin
  análisis del núcleo. La herramienta recibe
  `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtrado

OpenClaw filtra las habilidades en el momento de la carga usando `metadata.openclaw` (JSON de una sola línea
en el frontmatter). Una habilidad sin bloque `metadata.openclaw` siempre es
elegible a menos que se desactive explícitamente.

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<ParamField path="always" type="boolean">
  Cuando `true`, incluye siempre la habilidad y omite todos los demás filtros.
</ParamField>

<ParamField path="emoji" type="string">
  Emoji opcional que se muestra en la interfaz de usuario de Habilidades de macOS.
</ParamField>

<ParamField path="homepage" type="string">
  URL opcional que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS.
</ParamField>

<ParamField path="os" type='"darwin" | "linux" | "win32"'>
  Filtro de plataforma. Cuando se establece, la habilidad solo es elegible en los sistemas operativos listados.
</ParamField>

<ParamField path="requires.bins" type="string[]">
  Cada binario debe existir en `PATH`.
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  Debe existir al menos un binario en `PATH`.
</ParamField>

<ParamField path="requires.env" type="string[]">
  Cada var de entorno debe existir en el proceso o proporcionarse a través de la configuración.
</ParamField>

<ParamField path="requires.config" type="string[]">
  Cada ruta de `openclaw.json` debe ser verdadera.
</ParamField>

<ParamField path="primaryEnv" type="string">
  Nombre de la variable de entorno asociada con `skills.entries.<name>.apiKey`.
</ParamField>

<ParamField path="install" type="object[]">
  Especificaciones de instalador opcionales utilizadas por la interfaz de usuario de Habilidades de macOS (brew / node / go / uv / download).
</ParamField>

<Note>Los bloques heredados de `metadata.clawdbot` todavía se aceptan cuando `metadata.openclaw` está ausente, por lo que las habilidades instaladas anteriormente mantienen sus puertas de dependencia e indicaciones de instalador. Las nuevas habilidades deben usar `metadata.openclaw`.</Note>

### Especificaciones del instalador

Las especificaciones del instalador indican a la interfaz de usuario de Habilidades de macOS cómo instalar una dependencia:

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Reglas de selección del instalador">
    - Cuando se listan varios instaladores, la puerta de enlace elige una opción preferida
      (brew si está disponible, de lo contrario node).
    - Si todos los instaladores son `download`, OpenClaw lista cada entrada para que puedas
      ver todos los artefactos disponibles.
    - Las especificaciones pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar por plataforma.
    - Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json`
      (predeterminado: npm; opciones: npm / pnpm / yarn / bun). Esto solo afecta las
      instalaciones de habilidades; el tiempo de ejecución de la Gateway aún debe ser Node.
    - Preferencia del instalador de la Gateway: Homebrew → uv → gestor de node configurado →
      go → download.
  </Accordion>
  <Accordion title="Detalles por instalador">
    - **Homebrew:** OpenClaw no instala automáticamente Homebrew ni traduce las fórmulas
      brew en comandos de paquetes del sistema. En contenedores de Linux sin
      `brew`, los instaladores que usan solo brew están ocultos; use una imagen personalizada o instale
      la dependencia manualmente.
    - **Go:** si `go` no está y `brew` está disponible, el gateway instala
      Go vía Homebrew primero y establece `GOBIN` al `bin` de Homebrew.
    - **Descarga:** `url` (requerido), `archive` (`tar.gz` | `tar.bz2` | `zip`),
      `extract` (predeterminado: auto cuando se detecta un archivo), `stripComponents`,
      `targetDir` (predeterminado `~/.openclaw/tools/<skillKey>`).
  </Accordion>
  <Accordion title="Notas sobre el sandbox">
    `requires.bins` se verifica en el **host** en el momento de carga de la habilidad. Si un agente
    se ejecuta en un sandbox, el binario también debe existir **dentro del contenedor**.
    Instálelo vía `agents.defaults.sandbox.docker.setupCommand` o una imagen
    personalizada. `setupCommand` se ejecuta una vez después de la creación del contenedor y requiere
    salida de red, un FS raíz escribible y un usuario root en el sandbox.
  </Accordion>
</AccordionGroup>

## anulaciones de configuración

Active y configure habilidades empaquetadas o gestionadas bajo `skills.entries` en
`~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` deshabilita la habilidad incluso cuando está empaquetada o instalada. La habilidad empaquetada `coding-agent` es opcional — establezca `skills.entries.coding-agent.enabled: true` y asegúrese de que uno de `claude`, `codex`, `opencode` u otro CLI compatible esté instalado y autenticado.
</ParamField>

<ParamField path="apiKey" type="string | { source, provider, id }">
  Campo de conveniencia para habilidades que declaran `metadata.openclaw.primaryEnv`. Admite una cadena de texto sin formato o un objeto SecretRef.
</ParamField>

<ParamField path="env" type="Record<string, string>">
  Variables de entorno inyectadas para la ejecución del agente. Solo se inyectan cuando la variable aún no está establecida en el proceso.
</ParamField>

<ParamField path="config" type="object">
  Bolsa opcional para campos de configuración personalizados por habilidad.
</ParamField>

<ParamField path="allowBundled" type="string[]">
  Lista de permitidos opcional solo para habilidades **incluidas**. Cuando se establece, solo las habilidades incluidas en la lista son elegibles. Las habilidades administradas y del espacio de trabajo no se ven afectadas.
</ParamField>

<Note>Las claves de configuración coinciden con el **nombre de la habilidad** por defecto. Si una habilidad define `metadata.openclaw.skillKey`, use esa clave bajo `skills.entries`. Ponga entre comillas los nombres con guiones: JSON5 permite claves entre comillas.</Note>

## Inyección de entorno

Cuando se inicia una ejecución de agente, OpenClaw:

<Steps>
  <Step title="Lee los metadatos de la habilidad">
    OpenClaw resuelve la lista efectiva de habilidades para el agente, aplicando reglas
    de filtrado, listas de permitidos y anulaciones de configuración.
  </Step>
  <Step title="Inyecta variables de entorno y claves de API">
    `skills.entries.<key>.env` y `skills.entries.<key>.apiKey` se aplican a
    `process.env` durante la duración de la ejecución.
  </Step>
  <Step title="Construye el prompt del sistema">
    Las habilidades elegibles se compilan en un bloque XML compacto y se inyectan en el
    prompt del sistema.
  </Step>
  <Step title="Restaura el entorno">
    Después de que termina la ejecución, se restaura el entorno original.
  </Step>
</Steps>

<Warning>La inyección de variables de entorno está limitada a la ejecución del agente **anfitrión**, no al sandbox. Dentro de un sandbox, `env` y `apiKey` no tienen efecto. Consulte [Configuración de habilidades](/es/tools/skills-config#sandboxed-skills-and-env-vars) para saber cómo pasar secretos a ejecuciones en sandbox.</Warning>

Para el backend `claude-cli` incluido, OpenClaw también materializa la misma instantánea de habilidades elegibles como un complemento temporal de Claude Code y la pasa a través de `--plugin-dir`. Otros backends de CLI utilizan únicamente el catálogo de prompts.

## Instantáneas y actualización

OpenClaw crea una instantánea de las habilidades elegibles **cuando se inicia una sesión** y reutiliza esa lista para todos los turnos posteriores en la sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima nueva sesión.

Las habilidades se actualizan a mitad de sesión en dos casos:

- El observador de habilidades detecta un cambio en `SKILL.md`.
- Se conecta un nuevo nodo remoto elegible.

La lista actualizada se recoge en el siguiente turno del agente. Si cambia la lista blanca efectiva del agente, OpenClaw actualiza la instantánea para mantener las habilidades visibles alineadas.

<AccordionGroup>
  <Accordion title="Observador de habilidades">
    Por defecto, OpenClaw observa las carpetas de habilidades y actualiza la instantánea cuando cambian los archivos `SKILL.md`. Configure en `skills.load`:

    ```json5
    {
      skills: {
        load: {
          extraDirs: ["~/Projects/agent-scripts/skills"],
          allowSymlinkTargets: ["~/Projects/manager/skills"],
          watch: true,
          watchDebounceMs: 250,
        },
      },
    }
    ```

    Use `allowSymlinkTargets` para diseños con enlaces simbólicos intencionales donde un enlace simbólico raíz de habilidad apunta fuera de la raíz configurada, por ejemplo `<workspace>/skills/manager -> ~/Projects/manager/skills`.

  </Accordion>
  <Accordion title="Nodos macOS remotos (puerta de enlace Linux)">
    Si la puerta de enlace se ejecuta en Linux pero está conectado un **nodo macOS** con `system.run` permitido, OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos están presentes en ese nodo. El agente debe ejecutar esas habilidades a través de la herramienta `exec` con `host=node`.

    Los nodos sin conexión **no** hacen visibles las habilidades solo remotas. Si un nodo deja de responder a las sondas de binarios, OpenClaw borra sus coincidencias de binarios en caché.

  </Accordion>
</AccordionGroup>

## Impacto en tokens

Cuando las habilidades son elegibles, OpenClaw inyecta un bloque XML compacto en el prompt del sistema. El costo es determinista:

```text
total = 195 + Σ (97 + len(name) + len(description) + len(filepath))
```

- **Sobrecarga base** (solo cuando ≥ 1 habilidad): ~195 caracteres
- **Por habilidad:** ~97 caracteres + las longitudes de sus campos `name`, `description` y `location`
- El escape de XML expande `& < > " '` en entidades, añadiendo algunos caracteres por cada ocurrencia
- A ~4 caracteres/token, 97 caracteres ≈ 24 tokens por habilidad antes de las longitudes de campo

Mantenga las descripciones cortas y descriptivas para minimizar la sobrecarga del prompt.

## Relacionado

<CardGroup cols={2}>
  <Card title="Creación de habilidades" href="/es/tools/creating-skills" icon="hammer">
    Guía paso a paso para crear una habilidad personalizada.
  </Card>
  <Card title="Taller de habilidades" href="/es/tools/skill-workshop" icon="flask">
    Cola de propuestas para habilidades redactadas por el agente.
  </Card>
  <Card title="Configuración de habilidades" href="/es/tools/skills-config" icon="gear">
    Esquema de configuración `skills.*` completo y listas de permitidos del agente.
  </Card>
  <Card title="Comandos de barra" href="/es/tools/slash-commands" icon="terminal">
    Cómo se registran y enrutan los comandos de barra de las habilidades.
  </Card>
  <Card title="ClawHub" href="/es/clawhub" icon="cloud">
    Navegue y publique habilidades en el registro público.
  </Card>
  <Card title="Plugins" href="/es/tools/plugin" icon="plug">
    Los plugins pueden incluir habilidades junto con las herramientas que documentan.
  </Card>
</CardGroup>
