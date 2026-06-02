---
summary: "Habilidades: administradas vs. del espacio de trabajo, reglas de bloqueo, listas de permitidos del agente y cableado de configuración"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Habilidades"
sidebarTitle: "Habilidades"
---

OpenClaw utiliza carpetas de habilidades **[compatibles con AgentSkills](https://agentskills.io)**
para enseñar al agente cómo usar las herramientas. Cada habilidad es un directorio
que contiene un `SKILL.md` con YAML frontmatter e instrucciones. OpenClaw
carga las habilidades incluidas más anulaciones locales opcionales, y las filtra en
el momento de la carga basándose en el entorno, la configuración y la presencia de binarios.

## Ubicaciones y precedencia

OpenClaw carga habilidades desde estas fuentes, **en orden de mayor precedencia**:

| #   | Fuente                              | Ruta                             |
| --- | ----------------------------------- | -------------------------------- |
| 1   | Habilidades del espacio de trabajo  | `<workspace>/skills`             |
| 2   | Habilidades del agente del proyecto | `<workspace>/.agents/skills`     |
| 3   | Habilidades del agente personal     | `~/.agents/skills`               |
| 4   | Habilidades gestionadas/locale      | `~/.openclaw/skills`             |
| 5   | Habilidades incluidas               | enviadas con la instalación      |
| 6   | Carpetas de habilidades adicionales | `skills.load.extraDirs` (config) |

Si hay un conflicto con el nombre de una habilidad, gana la fuente más alta.

Las raíces de habilidades pueden organizarse con carpetas. Una habilidad se descubre cuando un
`SKILL.md` aparece bajo una raíz de habilidades configurada, por lo que ambos son válidos:

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

La ruta de la carpeta es solo para organización. El nombre visible de la habilidad, el comando
de barra y la clave de lista de permitidos provienen del `SKILL.md` frontmatter `name` (o del nombre
del directorio de habilidad cuando falta `name`), por lo que una habilidad anidada con `name: research`
se invoca como `/research`, no como `/personal/research`.

El directorio nativo `$CODEX_HOME/skills` de Codex CLI no es una de estas raíces de habilidades de OpenClaw.
En el modo de arnés de Codex, los lanzamientos locales del servidor de aplicaciones utilizan hogares
Codex aislados por agente, por lo que las habilidades en el `~/.codex/skills`
personal del operador no se cargan implícitamente. El descubrimiento `.agents` nativo de Codex utiliza
`HOME` heredados por separado; las propias raíces de habilidad de OpenClaw anteriores ya incluyen
`~/.agents/skills`. Use `openclaw migrate plan codex` para inventariar habilidades desde
el hogar de Codex, luego `openclaw migrate codex` para elegir directorios de habilidad con un mensaje
interactivo de casillas de verificación antes de copiarlos en el espacio de trabajo del agente OpenClaw actual.
Para ejecuciones no interactivas, repita `--skill <name>` para las habilidades exactas a copiar.

## Habilidades por agente frente a habilidades compartidas

En configuraciones de **multi-agent** cada agente tiene su propio espacio de trabajo:

| Ámbito                              | Ruta                                           | Visible para                             |
| ----------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Por agente                          | `<workspace>/skills`                           | Solo ese agente                          |
| Agente de proyecto                  | `<workspace>/.agents/skills`                   | Solo el agente de ese espacio de trabajo |
| Agente personal                     | `~/.agents/skills`                             | Todos los agentes en esa máquina         |
| Compartido gestionado/local         | `~/.openclaw/skills`                           | Todos los agentes en esa máquina         |
| Directorios adicionales compartidos | `skills.load.extraDirs` (precedencia más baja) | Todos los agentes en esa máquina         |

Mismo nombre en múltiples lugares → gana la fuente más alta. El espacio de trabajo gana a
project-agent, que gana a personal-agent, que gana a managed/local, que gana a bundled,
que gana a extra dirs.

## Listas de permitidos de habilidades del agente

La **ubicación** de la habilidad y la **visibilidad** de la habilidad son controles separados.
La ubicación/precedencia decide qué copia de una habilidad con el mismo nombre gana; las listas
permitidas del agente deciden qué habilidades puede usar realmente un agente.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Reglas de lista de permitidos">
    - Omite `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada. - Omite `agents.list[].skills` para heredar `agents.defaults.skills`. - Establece `agents.list[].skills: []` para no tener habilidades. - Una lista `agents.list[].skills` no vacía es el conjunto **final** para ese agente: no se fusiona con los valores predeterminados. - La lista de permitidos efectiva
    se aplica en la creación del mensaje, el descubrimiento de comandos de barra de habilidades, la sincronización del sandbox y las instantáneas de habilidades.
  </Accordion>
</AccordionGroup>

## Complementos y habilidades

Los complementos pueden incluir sus propias habilidades listando directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos
se cargan cuando el complemento está habilitado. Este es el lugar indicado para guías de operación
eespecíficas de la herramienta que son demasiado largas para la descripción de la herramienta pero que deben estar
disponibles siempre que se instale el complemento; por ejemplo, el complemento del
navegador incluye una habilidad `browser-automation` para el control del navegador en varios pasos.

Los directorios de habilidades de los complementos se fusionan en la misma ruta de baja precedencia que
`skills.load.extraDirs`, por lo que una habilidad incluida, administrada, de agente o
del espacio de trabajo con el mismo nombre las anula. Puedes restringirlas mediante
`metadata.openclaw.requires.config` en la entrada de configuración del complemento.

Consulta [Plugins](/es/tools/plugin) para el descubrimiento/configuración y [Tools](/es/tools) para
la superficie de la herramienta que esas habilidades enseñan.

## Propuestas del Taller de Habilidades

Las propuestas del Taller de Habilidades son borradores duraderos para crear o actualizar habilidades
del espacio de trabajo sin mutar silenciosamente los archivos `SKILL.md` activos. OpenClaw las almacena
en:

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    references/
    scripts/
    rollback.json
```

El directorio de estado predeterminado es `~/.openclaw`.

`proposal.json` es el registro canónico de la propuesta. `proposals.json` es el manifiesto de listado rápido y se puede reconstruir desde las carpetas de propuestas cuando falta o está obsoleto. `PROPOSAL.md` marca explícitamente el contenido borrador con `status: proposal`, `version: v1` y `date`; esos campos exclusivos de la propuesta se eliminan cuando la propuesta se aplica como un `SKILL.md` activo.

Los cuerpos de las propuestas respetan `skills.workshop.maxSkillBytes`, y las descripciones de las propuestas se limitan a 160 bytes porque pueden aparecer en los resultados de descubrimiento y listado.

Las carpetas de propuestas también pueden contener archivos de soporte bajo `assets/`, `examples/`, `references/`, `scripts/` o `templates/`. OpenClaw registra los metadatos de los archivos de soporte en `proposal.json`, almacena el contenido de los archivos junto a `PROPOSAL.md`, los escanea con la propuesta y verifica sus hashes antes de aplicar. Los archivos de soporte aprobados se escriben en el directorio de habilidades activo junto a `SKILL.md`.

Solo las propuestas pendientes se pueden revisar o aplicar. La revisión mantiene el mismo id de propuesta, incrementa la versión de la propuesta, actualiza la fecha de la propuesta, vuelve a ejecutar los metadatos del escáner y conserva los archivos de soporte existentes a menos que se proporcione una nueva lista de archivos de soporte. La aplicación escribe en la raíz `skills/` del espacio de trabajo seleccionado, ejecuta el escáner de habilidades, escribe los metadatos de reversión, se niega a sobrescribir un objetivo de creación existente y marca las propuestas de actualización como obsoletas cuando la habilidad objetivo ha cambiado desde la creación de la propuesta. Rechazar y poner en cuarentena actualiza solo los metadatos de la propuesta; no tocan las habilidades activas.

Use la CLI para la revisión del operador:

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id>
openclaw skills workshop quarantine <proposal-id>
```

Los agentes pueden redactar propuestas a través de la herramienta `skill_workshop` cuando identifican trabajo digno de reutilizar y pueden revisar las propuestas pendientes durante la revisión. Cuando el usuario pide explícitamente aprobar/usar/aplicar, rechazar o poner en cuarentena una propuesta específica, la herramienta puede realizar esa acción del ciclo de vida a través de Skill Workshop en lugar de cambios en el shell o directamente en el sistema de archivos.

## ClawHub (instalar y sincronizar)

[ClawHub](https://clawhub.ai) es el registro público de habilidades para OpenClaw.
Use los comandos nativos de `openclaw skills` para descubrir/instalar/actualizar, o el
CLI separado `clawhub` para flujos de trabajo de publicación/sincronización. Guía completa:
[ClawHub](/es/clawhub).

| Acción                                                               | Comando                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| Instalar una habilidad de ClawHub en el espacio de trabajo           | `openclaw skills install <skill-slug>`                 |
| Instalar una habilidad de Git en el espacio de trabajo               | `openclaw skills install git:owner/repo@ref`           |
| Instalar una habilidad local en el espacio de trabajo                | `openclaw skills install ./path/to/skill --as my-tool` |
| Instalar una habilidad para todos los agentes locales                | `openclaw skills install <skill-slug> --global`        |
| Actualizar todas las habilidades instaladas en el espacio de trabajo | `openclaw skills update --all`                         |
| Actualizar una única habilidad administrada compartida               | `openclaw skills update <skill-slug> --global`         |
| Actualizar todas las habilidades administradas compartidas y locales | `openclaw skills update --all --global`                |
| Verificar una habilidad de ClawHub                                   | `openclaw skills verify <skill-slug>`                  |
| Imprimir la Skill Card generada                                      | `openclaw skills verify <skill-slug> --card`           |
| Sincronizar (escanear + publicar actualizaciones)                    | `clawhub sync --all`                                   |

Las instalaciones nativas de `openclaw skills install` se instalan en el directorio del
espacio de trabajo activo `skills/` de forma predeterminada. Añada `--global` para instalar en el directorio
gestionado/compartido local (`~/.openclaw/skills` de forma predeterminada), que es visible para
todos los agentes locales a menos que las listas de permitidos de habilidades del agente limiten la visibilidad. El
CLI separado `clawhub` también se instala en `./skills` bajo su directorio de
trabajo actual (o recurre al espacio de trabajo de OpenClaw configurado). OpenClaw lo
detecta como `<workspace>/skills` en la siguiente sesión.
Las raíces de habilidades configuradas también admiten diseños agrupados, como
`skills/<group>/<skill>/SKILL.md`, por lo que las habilidades de terceros relacionadas se pueden mantener
en carpetas compartidas sin un escaneo recursivo amplio. Utilice nombres de frontmatter planos
al agrupar, por ejemplo `skills/imported/research/SKILL.md` con
`name: research`.

Las instalaciones de Git y de directorio local esperan un `SKILL.md` en la raíz de la fuente. El slug de instalación proviene del `SKILL.md` frontmatter `name` cuando es un slug válido; de lo contrario, recurre al nombre del directorio fuente o del repositorio. Use `--as <slug>` para anular el slug inferido. `--version` se aplica solo a las instalaciones de ClawHub. Las instalaciones de habilidades no admiten especificaciones de paquetes npm o rutas de zip/archivos. `openclaw skills update` actualiza solo las instalaciones rastreadas por ClawHub; reinstale fuentes de Git o locales para actualizarlas.

Use `openclaw skills verify <slug>` para pedirle a ClawHub el sobre de confianza `clawhub.skill.verify.v1` de la habilidad. La salida es JSON por defecto; use `--card` para imprimir el Markdown de la Skill Card generada. Las habilidades de ClawHub instaladas se verifican contra la versión y el registro registrados en `.clawhub/origin.json`; `--version` y `--tag` solo anulan el selector de versión. El comando sale con un valor distinto de cero cuando ClawHub marca la verificación como fallida. Un `skill-card.md` generado puede estar presente en los paquetes instalados, pero OpenClaw lo trata como metadatos proporcionados por ClawHub y no lo usa como instrucciones de modelo local ni como puerta de hash local.

Los clientes de Gateway que necesiten entrega privada, no ClawHub, pueden preparar un archivo de habilidad zip con `skills.upload.begin`, `skills.upload.chunk` y `skills.upload.commit`, y luego instalar la carga confirmada con `skills.install({ source: "upload", uploadId, slug, force?, sha256? })`. Esta es una ruta de carga de administrador explícita para clientes de confianza, no el flujo de instalación normal `openclaw skills install <slug>` o ClawHub. Está desactivada por defecto y solo funciona cuando `skills.install.allowUploadedArchives: true` está establecido en `openclaw.json`. El modo de carga todavía instala en el directorio `skills/<slug>` del espacio de trabajo del agente predeterminado; el nombre de la carpeta interna del archivo se ignora para el objetivo de instalación final.

Las páginas de habilidades de ClawHub exponen el estado más reciente del escaneo de seguridad antes de la instalación, con páginas de detalles del escáner para VirusTotal, ClawScan y análisis estático. `openclaw skills install <slug>` sigue siendo solo la ruta de instalación; los editores recuperan los falsos positivos a través del panel de ClawHub o `clawhub skill rescan <slug>`.

## Seguridad

<Warning>Trate las habilidades de terceros como **código no confiable**. Léalas antes de habilitarlas. Prefiera ejecuciones en sandbox para entradas no confiables y herramientas riesgosas. Vea [Sandboxing](/es/gateway/sandboxing) para los controles del lado del agente.</Warning>

- El descubrimiento de habilidades del espacio de trabajo, el agente del proyecto y el directorio adicional solo acepta raíces de habilidad cuya ruta real resuelta se mantenga dentro de la raíz configurada, a menos que `skills.load.allowSymlinkTargets` confíe explícitamente en una raíz de destino. Las habilidades agrupadas siempre se mantienen contenidas. Las raíces administradas `~/.openclaw/skills` y personales `~/.agents/skills` pueden contener carpetas de habilidades enlazadas simbólicamente instaladas por ClawHub u otro administrador de habilidades local, pero cada ruta real `SKILL.md` aún debe mantenerse dentro de su directorio de habilidad resuelto.
- El descubrimiento anidado está limitado. OpenClaw escanea carpetas de habilidades agrupadas bajo
  raíces de habilidades como `<workspace>/skills`, `<workspace>/.agents/skills`,
  `~/.agents/skills` y `~/.openclaw/skills`, pero omite directorios ocultos,
  `node_modules`, archivos `SKILL.md` demasiado grandes, enlaces simbólicos escapados y árboles de directorios
  sospechosamente grandes.
- Las instalaciones de archivos privados de la puerta de enlace están desactivadas por defecto. Cuando se habilitan explícitamente,
  requieren una carga zip confirmada que contenga `SKILL.md` y reutilizan las mismas
  protecciones de extracción de archivos, recorrido de rutas, enlaces simbólicos, fuerza y reversión que
  las instalaciones de habilidades de ClawHub. Están limitadas por
  `skills.install.allowUploadedArchives`; las instalaciones normales de ClawHub no requieren
  esa configuración.
- Las instalaciones de dependencias de habilidades respaldadas por la puerta de enlace (`skills.install`, incorporación y la interfaz de usuario de configuración de habilidades) ejecutan el escáner de código peligroso integrado antes de ejecutar los metadatos del instalador. Los hallazgos de `critical` se bloquean de forma predeterminada a menos que la persona que llama establezca explícitamente la anulación de peligro; los hallazgos sospechosos aún solo advierten.
- `openclaw skills install <slug>` es diferente: descarga una carpeta de habilidades de ClawHub
  en el espacio de trabajo, o en habilidades compartidas gestionadas/locales con
  `--global`, y no utiliza la ruta de metadatos del instalador mencionada anteriormente. Las instalaciones de Git y de
  directorios locales copian un directorio `SKILL.md` de confianza en la misma raíz de
  habilidades, pero no son rastreadas por `openclaw skills update`.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso del **host** para ese turno del agente (no en el sandbox). Mantenga los secretos fuera de los mensajes y registros.

Para obtener un modelo de amenazas más amplio y listas de verificación, consulte [Security](/es/gateway/security).

## Formato SKILL.md

`SKILL.md` debe incluir al menos:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw sigue la especificación AgentSkills para el diseño/intención. El analizador utilizado
por el agente integrado solo admite claves de frontmatter de **una sola línea**;
`metadata` debe ser un **objeto JSON de una sola línea**. Use `{baseDir}` en
las instrucciones para hacer referencia a la ruta de la carpeta de habilidades.

### Claves de frontmatter opcionales

<ParamField path="homepage" type="string">
  URL que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS. También compatible a través de `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Cuando `true`, la habilidad se expone como un comando de barra del usuario.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Cuando `true`, OpenClaw mantiene las instrucciones de la habilidad fuera del prompt normal
  del agente. La habilidad aún está instalada y todavía se puede ejecutar explícitamente como un
  comando de barra cuando `user-invocable` también es `true`.
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Cuando se establece en `tool`, el comando de barra omite el modelo y se envía directamente a una herramienta.
</ParamField>
<ParamField path="command-tool" type="string">
  Nombre de la herramienta a invocar cuando `command-dispatch: tool` está establecido.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Para el envío a la herramienta, reenvía la cadena de argumentos cruda a la herramienta (sin análisis básico). La herramienta se invoca con `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtros (filtros de tiempo de carga)

OpenClaw filtra las habilidades en el momento de la carga usando `metadata` (JSON de una sola línea):

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Campos bajo `metadata.openclaw`:

<ParamField path="always" type="boolean">
  Cuando es `true`, siempre incluir la habilidad (omitir otros filtros).
</ParamField>
<ParamField path="emoji" type="string">
  Emoji opcional utilizado por la interfaz de usuario de Habilidades de macOS.
</ParamField>
<ParamField path="homepage" type="string">
  URL opcional que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS.
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  Lista opcional de plataformas. Si se establece, la habilidad solo es elegible en esos sistemas operativos.
</ParamField>
<ParamField path="requires.bins" type="string[]">
  Cada uno debe existir en `PATH`.
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  Al menos uno debe existir en `PATH`.
</ParamField>
<ParamField path="requires.env" type="string[]">
  La variable de entorno debe existir o proporcionarse en la configuración.
</ParamField>
<ParamField path="requires.config" type="string[]">
  Lista de rutas `openclaw.json` que deben ser verdaderas.
</ParamField>
<ParamField path="primaryEnv" type="string">
  Nombre de la variable de entorno asociada con `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]">
  Especificaciones de instalación opcionales utilizadas por la interfaz de usuario de Habilidades de macOS (brew/node/go/uv/download).
</ParamField>

Si no hay ningún `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que esté deshabilitada en la configuración o bloqueada por `skills.allowBundled` para las habilidades incluidas).

<Note>Los bloques heredados `metadata.clawdbot` todavía se aceptan cuando `metadata.openclaw` está ausente, por lo que las habilidades instaladas anteriormente mantienen sus filtros de dependencia y sugerencias de instalación. Las habilidades nuevas y actualizadas deben usar `metadata.openclaw`.</Note>

### Notas sobre el sandbox

- `requires.bins` se verifica en el **host** en el momento de la carga de la habilidad.
- Si un agente está en sandbox, el binario también debe existir **dentro del contenedor**. Instálelo mediante `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada). `setupCommand` se ejecuta una vez después de que se crea el contenedor. Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz con permisos de escritura y un usuario root en el sandbox.
- Ejemplo: la habilidad `summarize` (`skills/summarize/SKILL.md`) necesita la CLI `summarize` en el contenedor sandbox para ejecutarse allí.

### Especificaciones del instalador

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Reglas de selección del instalador">
    - Si se listan varios instaladores, la puerta de enlace elige una sola opción preferida (brew si está disponible, de lo contrario node).
    - Si todos los instaladores son `download`, OpenClaw enumera cada entrada para que pueda ver los artefactos disponibles.
    - Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
    - Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun). Esto solo afecta las instalaciones de habilidades; el tiempo de ejecución de Gateway aún debe ser Node: no se recomienda Bun para WhatsApp/Telegram.
    - La selección del instalador respaldada por Gateway se basa en preferencias: cuando las especificaciones de instalación mezclan tipos, OpenClaw prefiere Homebrew cuando `skills.install.preferBrew` está habilitado y `brew` existe, luego `uv`, luego el administrador de node configurado, luego otros respaldos como `go` o `download`.
    - Si cada especificación de instalación es `download`, OpenClaw muestra todas las opciones de descarga en lugar de contraerlas a un solo instalador preferido.

  </Accordion>
  <Accordion title="Detalles por instalador">
    - **Instalaciones de Homebrew:** OpenClaw no instala automáticamente Homebrew ni traduce
      las fórmulas de brew en comandos del gestor de paquetes del sistema. En contenedores de Linux
      sin `brew`, el onboarding oculta los instaladores de dependencias exclusivas de brew; use una
      imagen personalizada o instale la dependencia manualmente antes de habilitar esa habilidad.
    - **Instalaciones de Go:** si `go` no está disponible y `brew` está disponible, el gateway instala Go a través de Homebrew primero y configura `GOBIN` al `bin` de Homebrew cuando es posible.
    - **Instalaciones por descarga:** `url` (requerido), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: automático cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado: `~/.openclaw/tools/<skillKey>`).

  </Accordion>
</AccordionGroup>

## Anulaciones de configuración

Las habilidades empaquetadas y gestionadas se pueden activar y desactivar, y se les pueden proporcionar valores de entorno
en `skills.entries` en `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
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
  `false` deshabilita la habilidad incluso si está incluida en el paquete o instalada. La habilidad incluida en el paquete `coding-agent` es opcional: establezca `skills.entries.coding-agent.enabled: true` antes de exponerla a los agentes, y luego asegúrese de que uno de `claude`, `codex`, `opencode`, u otra CLI compatible esté instalado y autenticado para su propia CLI.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Comodidad para habilidades que declaran `metadata.openclaw.primaryEnv`. Admite texto plano o SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Se inyecta solo si la variable aún no está configurada en el proceso.
</ParamField>
<ParamField path="config" type="object">
  Contenedor opcional para campos personalizados por habilidad. Las claves personalizadas deben vivir aquí.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Lista de permitidos opcional solo para habilidades **incluidas en el paquete**. Si se establece, solo las habilidades incluidas en el paquete en la lista son elegibles (las habilidades gestionadas/en el espacio de trabajo no se ven afectadas).
</ParamField>

Si el nombre de la habilidad contiene guiones, ponga la clave entre comillas (JSON5 permite claves entre comillas).
Las claves de configuración coinciden con el **nombre de la habilidad** de forma predeterminada; si una habilidad
define `metadata.openclaw.skillKey`, use esa clave en `skills.entries`.

<Note>
  Para la generación/edición de imágenes estándar dentro de OpenClaw, use la herramienta principal `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad incluida en el paquete. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros. Para el análisis de imágenes nativo use la herramienta `image` con `agents.defaults.imageModel`. Si
  elige `openai/*`, `google/*`, `fal/*`, u otro modelo de imagen específico del proveedor, agregue también la clave de autenticación/API de ese proveedor.
</Note>

## Inyección de entorno

Cuando se inicia una ejecución del agente, OpenClaw:

1. Lee los metadatos de la habilidad.
2. Aplica `skills.entries.<key>.env` y `skills.entries.<key>.apiKey` a `process.env`.
3. Construye el mensaje del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

La inyección de entorno está **limitada a la ejecución del agente**, no a un entorno de shell global.

Para el backend `claude-cli` incluido, OpenClaw también materializa la misma instantánea elegible como un complemento temporal de Claude Code y lo pasa con `--plugin-dir`. Claude Code puede entonces usar su solucionador de habilidades nativo mientras OpenClaw sigue teniendo la precedencia, listas de permitidos por agente, restricciones y inyección de entorno/clave API `skills.entries.*`. Otros backends de CLI usan solo el catálogo de prompts.

## Instantáneas y actualización

OpenClaw toma una instantánea de las habilidades elegibles **cuando se inicia una sesión** y reutiliza esa lista para los turnos subsiguientes en la misma sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima sesión nueva.

Las habilidades pueden actualizarse a mitad de sesión en dos casos:

- El observador de habilidades está habilitado.
- Aparece un nuevo nodo remoto elegible.

Piense en esto como una **recarga en caliente (hot reload)**: la lista actualizada se recoge en el siguiente turno del agente. Si la lista de permitidos de habilidades del agente efectivo cambia para esa sesión, OpenClaw actualiza la instantánea para que las habilidades visibles se mantengan alineadas con el agente actual.

### Observador de habilidades

Por defecto, OpenClaw observa las carpetas de habilidades y actualiza la instantánea de habilidades cuando cambian los archivos `SKILL.md`. Configure bajo `skills.load`:

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

Use `allowSymlinkTargets` para diseños intencionales de espacio de trabajo, agente de proyecto o directorio adicional donde una raíz de habilidad contiene un enlace simbólico, por ejemplo `<workspace>/skills/manager -> ~/Projects/manager/skills`. Los `~/.openclaw/skills` administrados y los `~/.agents/skills` personales pueden seguir enlaces simbólicos de directorio de habilidades de gestores de habilidades locales por defecto, pero la lista de objetivos todavía se compara después de la resolución de realpath y debe mantenerse estrecha cuando se configura.

El observador cubre archivos `SKILL.md` anidados bajo raíces de habilidades agrupadas. Agregar o editar `skills/personal/foo/SKILL.md` actualiza la instantánea de la misma manera que editar `skills/foo/SKILL.md`.

### Nodos macOS remotos (puerta de enlace Linux)

Si el Gateway se ejecuta en Linux pero está conectado un **nodo macOS** con
`system.run` permitido (seguridad de aprobaciones Exec no establecida en `deny`),
OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los
binarios requeridos están presentes en ese nodo. El agente debe ejecutar esas habilidades
a través de la herramienta `exec` con `host=node`.

Esto depende de que el nodo informe su soporte de comandos y de una sonda de binarios
vía `system.which` o `system.run`. Los nodos desconectados **no** hacen
visibles las habilidades exclusivas remotas. Si un nodo conectado deja de responder a las sondas
de binarios, OpenClaw borra sus coincidencias de binarios en caché para que los agentes ya no vean
habilidades que actualmente no se pueden ejecutar allí.

## Impacto en los tokens

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades
disponibles en el mensaje del sistema (vía `formatSkillsForPrompt` en
`session runtime`). El costo es determinista:

- **Sobrecarga base** (solo cuando hay ≥1 habilidad): 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores `<name>`, `<description>` y `<location>` escapados en XML.

Fórmula (caracteres):

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

El escape XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.),
aumentando la longitud. Los recuentos de tokens varían según el tokenizador del modelo. Una estimación
aproximada estilo OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por
habilidad más las longitudes reales de sus campos.

## Ciclo de vida de habilidades administradas

OpenClaw incluye un conjunto base de habilidades como **habilidades empaquetadas** con la
instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para
las anulaciones locales; por ejemplo, fijar o parchear una habilidad sin
cambiar la copia empaquetada. Las habilidades del espacio de trabajo son propiedad del usuario y anulan
ambas en caso de conflictos de nombre.

## ¿Busca más habilidades?

Explore [https://clawhub.ai](https://clawhub.ai). Esquema de configuración
completo: [Skills config](/es/tools/skills-config).

## Relacionado

- [ClawHub](/es/clawhub) - registro público de habilidades
- [Creating skills](/es/tools/creating-skills) - construcción de habilidades personalizadas
- [Complementos](/es/tools/plugin) - descripción general del sistema de complementos
- [Configuración de habilidades](/es/tools/skills-config) - referencia de configuración de habilidades
- [Comandos de barra](/es/tools/slash-commands) - todos los comandos de barra disponibles
