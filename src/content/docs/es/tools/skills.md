---
summary: "Habilidades: gestionadas frente al espacio de trabajo, reglas de filtrado, listas de permitidos del agente y configuración"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Habilidades"
sidebarTitle: "Habilidades"
---

OpenClaw utiliza carpetas de habilidades **compatibles con [AgentSkills](https://agentskills.io)** para enseñar al agente cómo utilizar las herramientas. Cada habilidad es un directorio que contiene un `SKILL.md` con frontmatter YAML e instrucciones. OpenClaw carga las habilidades incluidas más las anulaciones locales opcionales, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

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

## Habilidades por agente frente a compartidas

En configuraciones **multiagente**, cada agente tiene su propio espacio de trabajo:

| Ámbito                         | Ruta                                        | Visible para                             |
| ------------------------------ | ------------------------------------------- | ---------------------------------------- |
| Por agente                     | `<workspace>/skills`                        | Solo ese agente                          |
| Agente del proyecto            | `<workspace>/.agents/skills`                | Solo el agente de ese espacio de trabajo |
| Agente personal                | `~/.agents/skills`                          | Todos los agentes en esa máquina         |
| Gestionadas/locale compartidas | `~/.openclaw/skills`                        | Todos los agentes en esa máquina         |
| Dirs adicionales compartidas   | `skills.load.extraDirs` (menor precedencia) | Todos los agentes en esa máquina         |

Mismo nombre en varios lugares → gana la fuente más alta. El espacio de trabajo gana al agente del proyecto, el cual gana al agente personal, el cual gana a las gestionadas/locale, las cuales ganan a las incluidas, las cuales ganan a los dirs adicionales.

## Listas de permitidos de habilidades del agente

La **ubicación** de la habilidad y la **visibilidad** de la habilidad son controles separados.
La ubicación/precedencia decide qué copia de una habilidad con el mismo nombre gana; las listas de permitidos del agente deciden qué habilidades puede usar realmente un agente.

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
    - Omita `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada. - Omita `agents.list[].skills` para heredar `agents.defaults.skills`. - Establezca `agents.list[].skills: []` para no tener habilidades. - Una lista `agents.list[].skills` no vacía es el conjunto **final** para ese agente: no se fusiona con los valores predeterminados. - La lista de permitidos efectiva
    se aplica en la creación de mensajes, el descubrimiento de comandos de barra de habilidades, la sincronización del entorno sandbox y las instantáneas de habilidades.
  </Accordion>
</AccordionGroup>

## Complementos y habilidades

Los complementos pueden incluir sus propias habilidades listando directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos
se cargan cuando el complemento está habilitado. Este es el lugar indicado para guías de operación
específicas de la herramienta que son demasiado largas para la descripción de la herramienta pero que deben estar
disponibles siempre que el complemento esté instalado; por ejemplo, el complemento
del navegador incluye una habilidad `browser-automation` para el control del navegador de varios pasos.

Los directorios de habilidades de los complementos se fusionan en la misma ruta de baja prioridad que
`skills.load.extraDirs`, por lo que una habilidad incluida, administrada, de agente o
del espacio de trabajo con el mismo nombre las anula. Puede restringirlas mediante
`metadata.openclaw.requires.config` en la entrada de configuración del complemento.

Consulte [Complementos](/es/tools/plugin) para el descubrimiento/la configuración y [Herramientas](/es/tools) para
la superficie de la herramienta que esas habilidades enseñan.

## Taller de habilidades

El complemento opcional y experimental **Taller de habilidades** puede crear o actualizar
habilidades del espacio de trabajo a partir de procedimientos reutilizables observados durante el trabajo del agente. Está
deshabilitado de forma predeterminada y debe habilitarse explícitamente mediante
`plugins.entries.skill-workshop`.

El Taller de habilidades solo escribe en `<workspace>/skills`, analiza el contenido
generado, admite la aprobación pendiente o las escrituras seguras automáticas, pone en cuarentena
las propuestas no seguras y actualiza la instantánea de habilidades después de las escrituras
exitosas para que las nuevas habilidades estén disponibles sin reiniciar Gateway.

Úselo para correcciones tales como _"la próxima vez, verifique la atribución del GIF"_ o flujos de trabajo difíciles de lograr como listas de verificación de control de calidad de medios. Comience con la aprobación pendiente; use escrituras automáticas solo en espacios de trabajo de confianza después de revisar sus propuestas. Guía completa: [complemento Skill Workshop](/es/plugins/skill-workshop).

## ClawHub (instalación y sincronización)

[ClawHub](https://clawhub.ai) es el registro público de habilidades para OpenClaw.
Use comandos nativos de `openclaw skills` para descubrir/instalar/actualizar, o el CLI `clawhub` separado para flujos de trabajo de publicación/sincronización. Guía completa:
[ClawHub](/es/tools/clawhub).

| Acción                                            | Comando                                |
| ------------------------------------------------- | -------------------------------------- |
| Instalar una habilidad en el espacio de trabajo   | `openclaw skills install <skill-slug>` |
| Actualizar todas las habilidades instaladas       | `openclaw skills update --all`         |
| Sincronizar (escanear + publicar actualizaciones) | `clawhub sync --all`                   |

Las instalaciones nativas de `openclaw skills install` se realizan en el directorio `skills/` del espacio de trabajo activo. El CLI `clawhub` separado también se instala en `./skills` bajo su directorio de trabajo actual (o recurre al espacio de trabajo OpenClaw configurado). OpenClaw lo detecta como `<workspace>/skills` en la siguiente sesión.

## Seguridad

<Warning>Trate las habilidades de terceros como **código no confiable**. Léalas antes de habilitarlas. Prefiera ejecuciones en sandbox para entradas no confiables y herramientas riesgosas. Vea [Sandboxing](/es/gateway/sandboxing) para los controles del lado del agente.</Warning>

- El descubrimiento de habilidades en el espacio de trabajo y en directorios adicionales solo acepta raíces de habilidades y archivos `SKILL.md` cuyo camino resuelto (realpath) se mantenga dentro de la raíz configurada.
- Las instalaciones de dependencias de habilidades respaldadas por Gateway (`skills.install`, incorporación y la interfaz de usuario de configuración de Habilidades) ejecutan el escáner de código peligroso integrado antes de ejecutar los metadatos del instalador. Los hallazgos de `critical` se bloquean de forma predeterminada a menos que la persona que llama establezca explícitamente la anulación de peligro; los hallazgos sospechosos aún solo advierten.
- `openclaw skills install <slug>` es diferente: descarga una carpeta de habilidad de ClawHub en el espacio de trabajo y no utiliza la ruta de metadatos del instalador mencionada anteriormente.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host** para ese turno del agente (no el sandbox). Mantén los secretos fuera de los prompts y los registros.

Para un modelo de amenazas más amplio y listas de verificación, consulta [Seguridad](/es/gateway/security).

## Formato SKILL.md

`SKILL.md` debe incluir al menos:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw sigue la especificación AgentSkills para el diseño/intención. El analizador utilizado por el agente integrado solo admite claves de frontmatter de **una sola línea**; `metadata` debe ser un **objeto JSON de una sola línea**. Usa `{baseDir}` en las instrucciones para referenciar la ruta de la carpeta de la habilidad.

### Claves de frontmatter opcionales

<ParamField path="homepage" type="string">
  URL que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS. También se admite a través de `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Cuando es `true`, la habilidad se expone como un comando de barra de usuario.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Cuando es `true`, la habilidad se excluye del prompt del modelo (aún disponible mediante invocación del usuario).
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Cuando se establece en `tool`, el comando de barra omite el modelo y se envía directamente a una herramienta.
</ParamField>
<ParamField path="command-tool" type="string">
  Nombre de la herramienta a invocar cuando se establece `command-dispatch: tool`.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Para el envío de la herramienta, reenvía la cadena de argumentos cruda a la herramienta (sin análisis principal). La herramienta se invoca con `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
</ParamField>

## Filtrado (filtros de tiempo de carga)

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
  Especificaciones de instalador opcionales utilizadas por la interfaz de usuario de Habilidades de macOS (brew/node/go/uv/download).
</ParamField>

Si no hay `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que esté deshabilitada en la configuración o bloqueada por `skills.allowBundled` para las habilidades incluidas).

<Note>Los bloques `metadata.clawdbot` heredados aún se aceptan cuando `metadata.openclaw` está ausente, por lo que las habilidades instaladas antiguas mantienen sus filtros de dependencia e indicaciones de instalador. Las habilidades nuevas y actualizadas deben usar `metadata.openclaw`.</Note>

### Notas sobre el aislamiento (sandboxing)

- `requires.bins` se verifica en el **host** en el momento de la carga de la habilidad.
- Si un agente está en modo sandbox, el binario también debe existir **dentro del contenedor**. Instálelo a través de `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada). `setupCommand` se ejecuta una vez después de que se crea el contenedor. Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz con permisos de escritura y un usuario root en el sandbox.
- Ejemplo: la habilidad `summarize` (`skills/summarize/SKILL.md`) necesita la CLI de `summarize` en el contenedor sandbox para ejecutarse allí.

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
    - Si se enumeran varios instaladores, la puerta de enlace elige una sola opción preferida (brew cuando está disponible, de lo contrario node).
    - Si todos los instaladores son `download`, OpenClaw lista cada entrada para que pueda ver los artefactos disponibles.
    - Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
    - Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun). Esto solo afecta las instalaciones de habilidades; el tiempo de ejecución de Gateway todavía debe ser Node — no se recomienda Bun para WhatsApp/Telegram.
    - La selección del instalador respaldada por Gateway se basa en preferencias: cuando las especificaciones de instalación mezclan tipos, OpenClaw prefiere Homebrew cuando `skills.install.preferBrew` está habilitado y `brew` existe, luego `uv`, luego el administrador de node configurado, luego otras alternativas como `go` o `download`.
    - Si cada especificación de instalación es `download`, OpenClaw muestra todas las opciones de descarga en lugar de contraerlas a un solo instalador preferido.
  </Accordion>
  <Accordion title="Detalles por instalador">
    - **Instalaciones de Go:** si falta `go` y `brew` está disponible, la puerta de enlace instala Go mediante Homebrew primero y establece `GOBIN` en el `bin` de Homebrew cuando es posible.
    - **Instalaciones por descarga:** `url` (requerido), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: automático cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado: `~/.openclaw/tools/<skillKey>`).
  </Accordion>
</AccordionGroup>

## Anulaciones de configuración

Las habilidades agrupadas y gestionadas se pueden activar y desactivar, y se les pueden proporcionar valores de entorno
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
  `false` deshabilita la habilidad incluso si está agrupada o instalada.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Comodidad para habilidades que declaran `metadata.openclaw.primaryEnv`. Admite texto plano o SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Se inyecta solo si la variable no ya está establecida en el proceso.
</ParamField>
<ParamField path="config" type="object">
  Contenedor opcional para campos personalizados por habilidad. Las claves personalizadas deben vivir aquí.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Lista de permitidos opcional solo para habilidades **agrupadas**. Si se establece, solo las habilidades agrupadas en la lista son elegibles (las habilidades gestionadas/en el espacio de trabajo no se ven afectadas).
</ParamField>

Si el nombre de la habilidad contiene guiones, ponga la clave entre comillas (JSON5 permite claves
entre comillas). Las claves de configuración coinciden con el **nombre de la habilidad** de manera predeterminada; si una habilidad
define `metadata.openclaw.skillKey`, use esa clave en `skills.entries`.

<Note>
  Para la generación/edición de imágenes stock dentro de OpenClaw, use la herramienta central `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad empaquetada. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros. Para el análisis de imágenes nativo use la herramienta `image` con `agents.defaults.imageModel`. Si elige `openai/*`,
  `google/*`, `fal/*` u otro modelo de imagen específico del proveedor, añada también la clave de autenticación/API de ese proveedor.
</Note>

## Inyección de entorno

Cuando se inicia una ejecución del agente, OpenClaw:

1. Lee los metadatos de las habilidades.
2. Aplica `skills.entries.<key>.env` y `skills.entries.<key>.apiKey` a `process.env`.
3. Construye el mensaje del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

La inyección de entorno está **limitada a la ejecución del agente**, no a un entorno de shell global.

Para el backend `claude-cli` empaquetado, OpenClaw también materializa la misma instantánea elegible como un complemento temporal de Claude Code y la pasa con
`--plugin-dir`. Claude Code puede usar su resolvedor de habilidades nativo mientras
OpenClaw sigue poseyendo la precedencia, las listas de permitidos por agente, el bloqueo y la inyección de claves de entorno/API de `skills.entries.*`. Otros backends de CLI usan solo el catálogo de mensajes.

## Instantáneas y actualización

OpenClaw crea una instantánea de las habilidades elegibles **cuando se inicia una sesión** y
reutiliza esa lista para los turnos posteriores en la misma sesión. Los cambios en
las habilidades o la configuración surten efecto en la próxima nueva sesión.

Las habilidades pueden actualizarse a mitad de la sesión en dos casos:

- El observador de habilidades está habilitado.
- Aparece un nuevo nodo remoto elegible.

Piense en esto como una **recarga en caliente**: la lista actualizada se recoge en el
siguiente turno del agente. Si la lista de permitidos de habilidades del agente efectiva cambia para esa
sesión, OpenClaw actualiza la instantánea para que las habilidades visibles sigan alineadas
con el agente actual.

### Observador de habilidades

De forma predeterminada, OpenClaw observa las carpetas de habilidades y actualiza la instantánea de habilidades
cuando cambian los archivos `SKILL.md`. Configure en `skills.load`:

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

### Nodos remotos de macOS (puerta de enlace Linux)

Si el Gateway se ejecuta en Linux pero está conectado un **nodo macOS** con
`system.run` permitido (la seguridad de aprobaciones de Exec no está configurada en `deny`),
OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios
requeridos están presentes en ese nodo. El agente debería ejecutar esas habilidades
a través de la herramienta `exec` con `host=node`.

Esto depende de que el nodo informe su soporte de comandos y de una sonda de bin
a través de `system.which` o `system.run`. Los nodos desconectados **no** hacen
visibles las habilidades solo remotas. Si un nodo conectado deja de responder sondas
bin, OpenClaw borra sus coincidencias de bin en caché para que los agentes ya no vean
habilidades que no se pueden ejecutar allí actualmente.

## Impacto en tokens

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades
disponibles en el prompt del sistema (a través de `formatSkillsForPrompt` en
`pi-coding-agent`). El costo es determinista:

- **Sobrecarga base** (solo cuando hay ≥1 habilidad): 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores `<name>`, `<description>` y `<location>` escapados en XML.

Fórmula (caracteres):

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

El escapado de XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.),
aumentando la longitud. Los recuentos de tokens varían según el tokenizador del modelo. Una estimación
aproximada estilo OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por
habilidad más las longitudes reales de sus campos.

## Ciclo de vida de habilidades administradas

OpenClaw incluye un conjunto base de habilidades como **habilidades empaquetadas** con la
instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para
las anulaciones locales; por ejemplo, fijar o parchear una habilidad sin
cambiar la copia empaquetada. Las habilidades del espacio de trabajo son propiedad del usuario y anulan
ambas en caso de conflicto de nombres.

## ¿Buscando más habilidades?

Explore [https://clawhub.ai](https://clawhub.ai). Esquema de configuración
completo: [Skills config](/es/tools/skills-config).

## Relacionado

- [ClawHub](/es/tools/clawhub) — registro público de habilidades
- [Creating skills](/es/tools/creating-skills) — creación de habilidades personalizadas
- [Complementos](/es/tools/plugin) — descripción general del sistema de complementos
- [Complemento Skill Workshop](/es/plugins/skill-workshop) — generar habilidades a partir del trabajo del agente
- [Configuración de habilidades](/es/tools/skills-config) — referencia de configuración de habilidades
- [Comandos de barra diagonal](/es/tools/slash-commands) — todos los comandos de barra diagonal disponibles
