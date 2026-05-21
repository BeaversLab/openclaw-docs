---
summary: "Habilidades: gestionadas frente al espacio de trabajo, reglas de filtrado, listas de permitidos del agente y configuración"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Habilidades"
sidebarTitle: "Habilidades"
---

OpenClaw utiliza carpetas de habilidades compatibles con **[AgentSkills](https://agentskills.io)** para enseñar al agente cómo usar herramientas. Cada habilidad es un directorio que contiene un `SKILL.md` con frontmatter YAML e instrucciones. OpenClaw carga las habilidades agrupadas más opciones locales opcionales, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

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

El directorio nativo `$CODEX_HOME/skills` de Codex CLI no es una de estas raíces de habilidades de OpenClaw.
En el modo de arnés de Codex, los lanzamientos locales del servidor de aplicaciones utilizan hogares
Codex aislados por agente, por lo que las habilidades en el `~/.codex/skills`
personal del operador no se cargan implícitamente. El descubrimiento `.agents`
nativo de Codex utiliza `HOME` heredadas por separado; las raíces de habilidades propias de OpenClaw anteriores ya incluyen
`~/.agents/skills`. Use `openclaw migrate codex --dry-run` para inventariar las habilidades
desde el hogar de Codex, y luego `openclaw migrate codex` para elegir los directorios de habilidades
con un indicador interactivo
de casillas de verificación antes de copiarlos en el espacio de trabajo del agente actual de OpenClaw.
Para ejecuciones no interactivas, repita `--skill <name>` para las habilidades exactas que desea copiar.

## Habilidades por agente vs compartidas

En configuraciones **multiagente**, cada agente tiene su propio espacio de trabajo:

| Ámbito                        | Ruta                                        | Visible para                             |
| ----------------------------- | ------------------------------------------- | ---------------------------------------- |
| Por agente                    | `<workspace>/skills`                        | Solo ese agente                          |
| Agente de proyecto            | `<workspace>/.agents/skills`                | Solo el agente de ese espacio de trabajo |
| Agente personal               | `~/.agents/skills`                          | Todos los agentes en esa máquina         |
| Compartido gestionado/local   | `~/.openclaw/skills`                        | Todos los agentes en esa máquina         |
| Directorios extra compartidos | `skills.load.extraDirs` (menor precedencia) | Todos los agentes en esa máquina         |

Mismo nombre en varios lugares → gana la fuente más alta. El espacio de trabajo supera al agente de proyecto, que supera al agente personal, que supera al gestionado/local, que supera al empaquetado, que supera a los directorios extra.

## Listas de permitidos de habilidades del agente

La **ubicación** de la habilidad y la **visibilidad** de la habilidad son controles separados. La ubicación/precedencia decide qué copia de una habilidad con el mismo nombre gana; las listas de permitidos del agente deciden qué habilidades puede usar realmente un agente.

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
    - Omita `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada. - Omita `agents.list[].skills` para heredar `agents.defaults.skills`. - Establezca `agents.list[].skills: []` para no tener habilidades. - Una lista `agents.list[].skills` no vacía es el conjunto **final** para ese agente: no se fusiona con los predeterminados. - La lista de permitidos efectiva se
    aplica en la construcción del mensaje, descubrimiento de comandos de barra de habilidades, sincronización de sandbox e instantáneas de habilidades.
  </Accordion>
</AccordionGroup>

## Plugins y habilidades

Los complementos pueden incluir sus propias habilidades listando los directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos
se cargan cuando el complemento está habilitado. Este es el lugar indicado para las guías de operación
específicas de la herramienta que son demasiado largas para la descripción de la herramienta pero que deben estar
disponibles siempre que se instale el complemento; por ejemplo, el complemento del
navegador incluye una habilidad `browser-automation` para el control del navegador de varios pasos.

Los directorios de habilidades de los complementos se fusionan en la misma ruta de baja prioridad que
`skills.load.extraDirs`, por lo que una habilidad incluida, gestionada, de agente o
del espacio de trabajo con el mismo nombre tiene prioridad sobre ellas. Puede restringirlas mediante
`metadata.openclaw.requires.config` en la entrada de configuración del complemento.

Consulte [Plugins](/es/tools/plugin) para el descubrimiento/configuración y [Tools](/es/tools) para la superficie de herramienta que esas habilidades enseñan.

## Taller de habilidades

El complemento opcional y experimental **Skill Workshop** puede crear o actualizar
habilidades del espacio de trabajo a partir de procedimientos reutilizables observados durante el trabajo del agente. Está
deshabilitado de forma predeterminada y debe habilitarse explícitamente mediante
`plugins.entries.skill-workshop`.

Skill Workshop solo escribe en `<workspace>/skills`, escanea el contenido
generado, admite aprobación pendiente o escrituras automáticas seguras, pone en cuarentena
las propuestas no seguras y actualiza la instantánea de habilidades después de escrituras
exitosas para que las nuevas habilidades estén disponibles sin reiniciar el Gateway.

Úselo para correcciones como _"la próxima vez, verifique la atribución del GIF"_ o flujos de trabajo difíciles de lograr como listas de verificación de QA de medios. Comience con aprobación pendiente; use escrituras automáticas solo en espacios de trabajo de confianza después de revisar sus propuestas. Guía completa: [Skill Workshop plugin](/es/plugins/skill-workshop).

## ClawHub (instalar y sincronizar)

[ClawHub](https://clawhub.ai) es el registro público de habilidades para OpenClaw. Use comandos nativos `openclaw skills` para descubrir/instalar/actualizar, o la CLI separada `clawhub` para flujos de trabajo de publicación/sincronización. Guía completa: [ClawHub](/es/clawhub).

| Acción                                                               | Comando                                         |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| Instalar una habilidad en el espacio de trabajo                      | `openclaw skills install <skill-slug>`          |
| Instalar una habilidad para todos los agentes locales                | `openclaw skills install <skill-slug> --global` |
| Actualizar todas las habilidades instaladas en el espacio de trabajo | `openclaw skills update --all`                  |
| Actualizar una sola habilidad administrada compartida                | `openclaw skills update <skill-slug> --global`  |
| Actualizar todas las habilidades administradas compartidas/locale    | `openclaw skills update --all --global`         |
| Sincronizar (escanear + publicar actualizaciones)                    | `clawhub sync --all`                            |

Native `openclaw skills install` se instala en el espacio de trabajo activo
directorio `skills/` de forma predeterminada. Añada `--global` para instalar en el directorio
gestionado/compartido local (`~/.openclaw/skills` de forma predeterminada), el cual es visible para
todos los agentes locales a menos que las listas de permitidos de habilidades del agente restrinjan la visibilidad. La CLI independiente
`clawhub` también se instala en `./skills` en su directorio de trabajo actual
(o usa como alternativa el espacio de trabajo de OpenClaw configurado). OpenClaw lo detecta
como `<workspace>/skills` en la siguiente sesión.
Las raíces de habilidades configuradas también admiten un nivel de agrupación, como
`skills/<group>/<skill>/SKILL.md`, por lo que las habilidades de terceros relacionadas se pueden
mantener en una carpeta compartida sin un escaneo recursivo amplio.

Los clientes de Gateway que necesiten entrega privada, no a través de ClawHub, pueden preparar un archivo de habilidad zip
con `skills.upload.begin`, `skills.upload.chunk` y
`skills.upload.commit`, y luego instalar la carga confirmada con
`skills.install({ source: "upload", uploadId, slug, force?, sha256? })`. Este es
una ruta de carga de administrador explícita para clientes de confianza, no el flujo normal de
`openclaw skills install <slug>` o instalación de ClawHub. Está desactivado de forma predeterminada
y solo funciona cuando `skills.install.allowUploadedArchives: true` está establecido en
`openclaw.json`. El modo de carga todavía se instala en el directorio del espacio de trabajo del agente predeterminado
`skills/<slug>`; el nombre de la carpeta interna del archivo se ignora para el
objetivo de instalación final.

Las páginas de habilidades de ClawHub exponen el último estado del escaneo de seguridad antes de la instalación,
con páginas de detalles del escáner para VirusTotal, ClawScan y análisis estático.
`openclaw skills install <slug>` sigue siendo solo la ruta de instalación; los editores
recuperan los falsos positivos a través del panel de ClawHub o
`clawhub skill rescan <slug>`.

## Seguridad

<Warning>Trate las habilidades de terceros como **código no confiable**. Léales antes de habilitarlas. Prefiera ejecuciones en sandbox para entradas no confiables y herramientas de riesgo. Consulte [Sandboxing](/es/gateway/sandboxing) para conocer los controles del lado del agente.</Warning>

- El descubrimiento de habilidades del espacio de trabajo, agente del proyecto y directorio adicional solo acepta raíces de habilidad cuya ruta real resuelta se mantenga dentro de la raíz configurada, a menos que `skills.load.allowSymlinkTargets` confíe explícitamente en una raíz de destino. Las habilidades agrupadas siempre se mantienen contenidas. Las raíces administradas `~/.openclaw/skills` y personales `~/.agents/skills` pueden contener carpetas de habilidad con enlaces simbólicos instaladas por ClawHub u otro administrador de habilidades local, pero cada ruta real de `SKILL.md` aún debe permanecer dentro de su directorio de habilidad resuelto.
- Las instalaciones de archivos privados de Gateway están desactivadas de forma predeterminada. Cuando se habilitan explícitamente, requieren una carga zip confirmada que contenga `SKILL.md` y reutilizan las mismas protecciones de extracción de archivo, recorrido de ruta, enlace simbólico, forzamiento y reversión que las instalaciones de habilidades de ClawHub. Están limitadas por `skills.install.allowUploadedArchives`; las instalaciones normales de ClawHub no requieren esa configuración.
- Las instalaciones de dependencias de habilidades respaldadas por Gateway (`skills.install`, incorporación y la interfaz de usuario de configuración de Habilidades) ejecutan el escáner de código peligroso integrado antes de ejecutar los metadatos del instalador. Los hallazgos de `critical` se bloquean de forma predeterminada a menos que la persona que llama establezca explícitamente la anulación peligrosa; los hallazgos sospechosos aún solo advierten.
- `openclaw skills install <slug>` es diferente: descarga una carpeta de habilidad de ClawHub en el espacio de trabajo o en habilidades administradas/compartidas locales con `--global`, y no utiliza la ruta de metadatos del instalador mencionada anteriormente.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host** para ese turno del agente (no en el sandbox). Mantenga los secretos fuera de los mensajes y registros.

Para un modelo de amenazas más amplio y listas de verificación, consulte [Seguridad](/es/gateway/security).

## Formato SKILL.md

`SKILL.md` debe incluir al menos:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw sigue la especificación de AgentSkills para el diseño/intento. El analizador utilizado por el agente integrado solo admite claves de frontmatter de **una sola línea**; `metadata` debe ser un **objeto JSON de una sola línea**. Use `{baseDir}` en las instrucciones para hacer referencia a la ruta de la carpeta de habilidad.

### Claves de frontmatter opcionales

<ParamField path="homepage" type="string">
  URL que se muestra como "Website" en la interfaz de usuario de Skills de macOS. También compatible a través de `metadata.openclaw.homepage`.
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  Cuando `true`, la habilidad se expone como un comando de barra del usuario.
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  Cuando `true`, OpenClaw mantiene las instrucciones de la habilidad fuera del prompt normal
  del agente. La habilidad aún está instalada y aún se puede ejecutar explícitamente como un
  comando de barra cuando `user-invocable` también es `true`.
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  Cuando se establece en `tool`, el comando de barra omite el modelo y se envía directamente a una herramienta.
</ParamField>
<ParamField path="command-tool" type="string">
  Nombre de la herramienta a invocar cuando `command-dispatch: tool` está establecido.
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  Para el envío a la herramienta, reenvía la cadena de argumentos sin procesar a la herramienta (sin análisis básico). La herramienta se invoca con `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.
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
  Lista de rutas de `openclaw.json` que deben ser verdaderas.
</ParamField>
<ParamField path="primaryEnv" type="string">
  Nombre de la variable de entorno asociada con `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]">
  Especificaciones de instalador opcionales utilizadas por la interfaz de usuario de Habilidades de macOS (brew/node/go/uv/download).
</ParamField>

Si no hay ningún `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que esté deshabilitada en la configuración o bloqueada por `skills.allowBundled` para las habilidades empaquetadas).

<Note>Los bloques heredados de `metadata.clawdbot` todavía se aceptan cuando `metadata.openclaw` está ausente, por lo que las habilidades instaladas antiguas mantienen sus filtros de dependencia e indicaciones de instalación. Las habilidades nuevas y actualizadas deben usar `metadata.openclaw`.</Note>

### Notas sobre el sandbox

- `requires.bins` se verifica en el **host** en el momento de la carga de la habilidad.
- Si un agente está en sandbox, el binario también debe existir **dentro del contenedor**. Instálelo a través de `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada). `setupCommand` se ejecuta una vez después de que se crea el contenedor. Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz con permiso de escritura y un usuario root en el sandbox.
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
    - Si se listan varios instaladores, la puerta de enlace elige una sola opción preferida (brew cuando está disponible, de lo contrario node).
    - Si todos los instaladores son `download`, OpenClaw lista cada entrada para que pueda ver los artefactos disponibles.
    - Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
    - Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun). Esto solo afecta las instalaciones de habilidades; el tiempo de ejecución de Gateway todavía debe ser Node: no se recomienda Bun para WhatsApp/Telegram.
    - La selección del instalador respaldada por Gateway está impulsada por preferencias: cuando las especificaciones de instalación mezclan tipos, OpenClaw prefiere Homebrew cuando `skills.install.preferBrew` está habilitado y `brew` existe, luego `uv`, luego el administrador de node configurado, luego otras alternativas como `go` o `download`.
    - Si cada especificación de instalación es `download`, OpenClaw muestra todas las opciones de descarga en lugar de colapsar a un solo instalador preferido.

  </Accordion>
  <Accordion title="Detalles por instalador">
    - **Instalaciones de Homebrew:** OpenClaw no instala Homebrew automáticamente ni traduce
      las fórmulas de brew en comandos del gestor de paquetes del sistema. En contenedores de Linux
      sin `brew`, el proceso de incorporación oculta los instaladores de dependencias exclusivas de brew; use una
      imagen personalizada o instale la dependencia manualmente antes de habilitar esa habilidad.
    - **Instalaciones de Go:** si falta `go` y `brew` está disponible, la puerta de enlace instala Go mediante Homebrew primero y establece `GOBIN` en la `bin` de Homebrew cuando es posible.
    - **Instalaciones por descarga:** `url` (obligatorio), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: automático cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado: `~/.openclaw/tools/<skillKey>`).

  </Accordion>
</AccordionGroup>

## Anulaciones de configuración

Las habilidades agrupadas y administradas se pueden activar y desactivar, y proporcionarles valores de entorno
bajo `skills.entries` en `~/.openclaw/openclaw.json`:

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
  `false` deshabilita la habilidad incluso si está incluida o instalada. La habilidad incluida `coding-agent` es opcional: establezca `skills.entries.coding-agent.enabled: true` antes de exponerla a los agentes, y luego asegúrese de que uno de `claude`, `codex`, `opencode` o `pi` esté instalado y autenticado para su propia CLI.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Comodidad para habilidades que declaran `metadata.openclaw.primaryEnv`. Soporta texto plano o SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Se inyecta solo si la variable aún no está configurada en el proceso.
</ParamField>
<ParamField path="config" type="object">
  Contenedor opcional para campos personalizados por habilidad. Las claves personalizadas deben residir aquí.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Lista de permitidos opcional solo para habilidades **incluidas**. Si se establece, solo las habilidades incluidas en la lista son elegibles (las habilidades gestionadas/en el espacio de trabajo no se ven afectadas).
</ParamField>

Si el nombre de la habilidad contiene guiones, ponga la clave entre comillas (JSON5 permite claves entre comillas).
Las claves de configuración coinciden con el **nombre de la habilidad** de manera predeterminada: si una habilidad
define `metadata.openclaw.skillKey`, use esa clave en `skills.entries`.

<Note>
  Para la generación/edición de imágenes estándar dentro de OpenClaw, use la herramienta principal `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad incluida. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros. Para el análisis de imágenes nativo use la herramienta `image` con `agents.defaults.imageModel`. Si elige
  `openai/*`, `google/*`, `fal/*` u otro modelo de imagen específico del proveedor, agregue también la clave de autenticación/API de ese proveedor.
</Note>

## Inyección de entorno

Cuando se inicia una ejecución del agente, OpenClaw:

1. Lee los metadatos de la habilidad.
2. Aplica `skills.entries.<key>.env` y `skills.entries.<key>.apiKey` a `process.env`.
3. Construye el mensaje del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

La inyección de entorno está **limitada a la ejecución del agente**, no a un entorno de shell global.

Para el backend `claude-cli` incluido, OpenClaw también materializa la misma instantánea elegible como un complemento temporal de Claude Code y la pasa con `--plugin-dir`. Claude Code puede usar su solucionador de habilidades nativo mientras OpenClaw aún posee la precedencia, las listas de permitidos por agente, el gating y la inyección de entorno/clave API de `skills.entries.*`. Otros backends de CLI usan solo el catálogo de mensajes.

## Instantáneas y actualización

OpenClaw captura una instantánea de las habilidades elegibles **cuando se inicia una sesión** y reutiliza esa lista para turnos posteriores en la misma sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima sesión nueva.

Las habilidades pueden actualizarse a mitad de sesión en dos casos:

- El observador de habilidades está habilitado.
- Aparece un nuevo nodo remoto elegible.

Piense en esto como una **recarga en caliente (hot reload)**: la lista actualizada se recoge en el siguiente turno del agente. Si la lista de permitidos de habilidades del agente efectivo cambia para esa sesión, OpenClaw actualiza la instantánea para que las habilidades visibles se mantengan alineadas con el agente actual.

### Observador de habilidades

De forma predeterminada, OpenClaw observa las carpetas de habilidades y actualiza la instantánea de habilidades cuando cambian los archivos `SKILL.md`. Configure bajo `skills.load`:

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

Use `allowSymlinkTargets` para diseños intencionales de espacio de trabajo, agente de proyecto o directorio adicional donde una raíz de habilidad contiene un enlace simbólico, por ejemplo `<workspace>/skills/manager -> ~/Projects/manager/skills`. Los `~/.openclaw/skills` administrados y los `~/.agents/skills` personales pueden seguir enlaces simbólicos de directorios de habilidades de administradores de habilidades locales de forma predeterminada, pero la lista de objetivos aún se coincide después de la resolución de realpath y debe mantenerse estrecha cuando se configura.

### Nodos macOS remotos (puerta de enlace Linux)

Si la puerta de enlace (Gateway) se ejecuta en Linux pero está conectado un **nodo macOS** con `system.run` permitido (seguridad de aprobaciones Exec no configurada en `deny`), OpenClaw puede tratar las habilidades solo de macOS como elegibles cuando los binarios requeridos están presentes en ese nodo. El agente debe ejecutar esas habilidades a través de la herramienta `exec` con `host=node`.

Esto depende de que el nodo informe su compatibilidad de comandos y de una sonda binaria
vía `system.which` o `system.run`. Los nodos desconectados **no** hacen
visibles las habilidades solo remotas. Si un nodo conectado deja de responder a sondas
binarias, OpenClaw borra sus coincidencias binarias en caché para que los agentes ya no vean
habilidades que actualmente no se pueden ejecutar allí.

## Impacto de tokens

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades
disponibles en el mensaje del sistema (vía `formatSkillsForPrompt` en
`pi-coding-agent`). El costo es determinista:

- **Sobrecarga base** (solo cuando hay ≥1 habilidad): 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores `<name>`, `<description>` y `<location>` escapados en XML.

Fórmula (caracteres):

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

El escape XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.),
aumentando la longitud. Los recuentos de tokens varían según el tokenizador del modelo. Una estimación
aproximada al estilo de OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por
habilidad más la longitud real de sus campos.

## Ciclo de vida de habilidades administradas

OpenClaw incluye un conjunto base de habilidades como **habilidades agrupadas** (bundled skills) con la
instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para
las anulaciones locales, por ejemplo, fijar o parchear una habilidad sin
cambiar la copia agrupada. Las habilidades del espacio de trabajo son propiedad del usuario y anulan
ambas en caso de conflictos de nombre.

## ¿Buscas más habilidades?

Explora [https://clawhub.ai](https://clawhub.ai). Esquema de configuración
completo: [Skills config](/es/tools/skills-config).

## Relacionado

- [ClawHub](/es/clawhub) - registro público de habilidades
- [Crear habilidades](/es/tools/creating-skills) - construcción de habilidades personalizadas
- [Complementos (Plugins)](/es/tools/plugin) - descripción general del sistema de complementos
- [Complemento Skill Workshop](/es/plugins/skill-workshop) - generar habilidades desde el trabajo del agente
- [Configuración de habilidades](/es/tools/skills-config) - referencia de configuración de habilidades
- [Comandos de barra](/es/tools/slash-commands) - todos los comandos de barra disponibles
