---
summary: "Habilidades: administradas vs. espacio de trabajo, reglas de filtrado y cableado de configuración/entorno"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Habilidades"
---

# Habilidades (OpenClaw)

OpenClaw utiliza carpetas de habilidades **compatibles con [AgentSkills](https://agentskills.io)** para enseñar al agente cómo utilizar las herramientas. Cada habilidad es un directorio que contiene un `SKILL.md` con encabezados YAML e instrucciones. OpenClaw carga **habilidades incluidas** además de anulaciones locales opcionales, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

## Ubicaciones y precedencia

OpenClaw carga habilidades desde estas fuentes:

1. **Carpetas de habilidades adicionales**: configuradas con `skills.load.extraDirs`
2. **Habilidades incluidas**: enviadas con la instalación (paquete npm u OpenClaw.app)
3. **Habilidades administradas-locales**: `~/.openclaw/skills`
4. **Habilidades de agente personal**: `~/.agents/skills`
5. **Habilidades de agente de proyecto**: `<workspace>/.agents/skills`
6. **Habilidades del espacio de trabajo**: `<workspace>/skills`

Si hay un conflicto con el nombre de una habilidad, la precedencia es:

`<workspace>/skills` (más alta) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → habilidades incluidas → `skills.load.extraDirs` (más baja)

## Habilidades por agente vs. compartidas

En configuraciones de **múltiples agentes**, cada agente tiene su propio espacio de trabajo. Esto significa:

- Las **habilidades por agente** residen en `<workspace>/skills` solo para ese agente.
- Las **habilidades de agente de proyecto** residen en `<workspace>/.agents/skills` y se aplican a
  ese espacio de trabajo antes que la carpeta normal del espacio de trabajo `skills/`.
- Las **habilidades de agente personal** residen en `~/.agents/skills` y se aplican en
  todos los espacios de trabajo de esa máquina.
- Las **habilidades compartidas** residen en `~/.openclaw/skills` (administradas-locales) y son visibles
  para **todos los agentes** en la misma máquina.
- Las **carpetas compartidas** también se pueden agregar mediante `skills.load.extraDirs` (menor
  precedencia) si desea un paquete de habilidades común utilizado por varios agentes.

Si el mismo nombre de habilidad existe en más de un lugar, se aplica la precedencia
usual: gana el espacio de trabajo, luego las habilidades de agente de proyecto, luego las habilidades de agente personal,
luego las gestionadas/locales, luego las incluidas y finalmente los directorios adicionales.

## Listas de permisos de habilidades del agente

La **ubicación** de la habilidad y la **visibilidad** de la habilidad son controles separados.

- La ubicación/precedencia decide qué copia de una habilidad con el mismo nombre gana.
- Las listas de permisos del agente deciden qué habilidades visibles puede usar realmente un agente.

Use `agents.defaults.skills` para una base compartida, luego anule por agente con
`agents.list[].skills`:

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

Reglas:

- Omita `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada.
- Omit `agents.list[].skills` to inherit `agents.defaults.skills`.
- Establezca `agents.list[].skills: []` para no tener habilidades.
- Una lista `agents.list[].skills` no vacía es el conjunto final para ese agente; no se fusiona con los valores predeterminados.

OpenClaw aplica el conjunto de habilidades efectivo del agente durante la creación del prompt, el descubrimiento de comandos de barra diagonal de habilidades, la sincronización del sandbox y las instantáneas de habilidades.

## Complementos + habilidades

Los complementos pueden incluir sus propias habilidades listando los directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos se cargan
cuando el complemento está habilitado. Hoy en día, esos directorios se fusionan en la misma ruta de baja precedencia que `skills.load.extraDirs`, por lo que una habilidad incluida, gestionada, de agente o del espacio de trabajo con el mismo nombre las anula.
Puedes filtrarlas mediante `metadata.openclaw.requires.config` en la entrada de configuración
del complemento. Consulta [Plugins](/es/tools/plugin) para el descubrimiento/configuración y [Tools](/es/tools) para la
superficie de herramientas que esas habilidades enseñan.

## Skill Workshop

El complemento opcional y experimental Skill Workshop puede crear o actualizar habilidades
del espacio de trabajo a partir de procedimientos reutilizables observados durante el trabajo del agente. Está deshabilitado de forma predeterminada y debe habilitarse explícitamente a través de
`plugins.entries.skill-workshop`.

Skill Workshop escribe solo en `<workspace>/skills`, escanea el contenido generado,
admite la aprobación pendiente o las escrituras automáticas seguras, pone en cuarentena las
propuestas no seguras y actualiza la instantánea de habilidades después de las escrituras exitosas para que las nuevas
habilidades puedan estar disponibles sin reiniciar el Gateway.

Úselo cuando desee que correcciones como "la próxima vez, verifique la atribución del GIF" o
flujos de trabajo difíciles de conseguir, como listas de verificación de QA de medios, se conviertan en instrucciones
procedimentales duraderas. Comience con la aprobación pendiente; use escrituras automáticas solo en espacios de trabajo de confianza
después de revisar sus propuestas. Guía completa:
[Skill Workshop Plugin](/es/plugins/skill-workshop).

## ClawHub (instalación + sincronización)

ClawHub es el registro público de habilidades para OpenClaw. Navegue en
[https://clawhub.ai](https://clawhub.ai). Use los comandos nativos `openclaw skills`
para descubrir/instalar/actualizar habilidades, o el CLI independiente `clawhub` cuando
necesite flujos de trabajo de publicación/sincronización.
Guía completa: [ClawHub](/es/tools/clawhub).

Flujos comunes:

- Instala una habilidad en tu espacio de trabajo:
  - `openclaw skills install <skill-slug>`
- Actualiza todas las habilidades instaladas:
  - `openclaw skills update --all`
- Sincronizar (escanear + publicar actualizaciones):
  - `clawhub sync --all`

Las instalaciones nativas de `openclaw skills install` se realizan en el directorio `skills/` del espacio de trabajo activo.
La CLI independiente `clawhub` también se instala en `./skills` en tu
directorio de trabajo actual (o recurre al espacio de trabajo OpenClaw configurado).
OpenClaw lo detecta como `<workspace>/skills` en la siguiente sesión.

## Notas de seguridad

- Trata las habilidades de terceros como **código no confiable**. Léelas antes de habilitarlas.
- Prefiere ejecuciones en sandbox (entorno aislado) para entradas no confiables y herramientas riesgosas. Consulta [Sandboxing](/es/gateway/sandboxing).
- El descubrimiento de habilidades en el espacio de trabajo y directorios adicionales solo acepta raíces de habilidades y archivos `SKILL.md` cuya ruta absoluta resuelta se mantenga dentro de la raíz configurada.
- Las instalaciones de dependencias de habilidades respaldadas por Gateway (`skills.install`, incorporación y la interfaz de usuario de configuración de Habilidades) ejecutan el escáner de código peligroso integrado antes de ejecutar los metadatos del instalador. Los hallazgos de `critical` se bloquean de forma predeterminada a menos que la persona que llama establezca explícitamente la anulación de peligro; los hallazgos sospechosos aún solo advierten.
- `openclaw skills install <slug>` es diferente: descarga una carpeta de habilidad de ClawHub en el espacio de trabajo y no utiliza la ruta de metadatos del instalador mencionada anteriormente.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host**
  para ese turno del agente (no en el sandbox). Mantén los secretos fuera de los avisos y los registros.
- Para obtener un modelo de amenazas más amplio y listas de verificación, consulta [Security](/es/gateway/security).

## Formato (compatible con AgentSkills + Pi)

`SKILL.md` debe incluir al menos:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notas:

- Seguimos la especificación AgentSkills para el diseño/intención.
- El analizador utilizado por el agente integrado solo admite claves de frontmatter de **una sola línea**.
- `metadata` debe ser un **objeto JSON de una sola línea**.
- Usa `{baseDir}` en las instrucciones para hacer referencia a la ruta de la carpeta de habilidad.
- Claves de frontmatter opcionales:
  - `homepage` — URL que se muestra como “Sitio web” en la interfaz de usuario de Skills de macOS (también compatible a través de `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (predeterminado: `true`). Cuando es `true`, la habilidad se expone como un comando de barra del usuario.
  - `disable-model-invocation` — `true|false` (predeterminado: `false`). Cuando es `true`, la habilidad se excluye del mensaje del modelo (aún disponible mediante la invocación del usuario).
  - `command-dispatch` — `tool` (opcional). Cuando se establece en `tool`, el comando de barra omite el modelo y se envía directamente a una herramienta.
  - `command-tool` — nombre de la herramienta a invocar cuando se establece `command-dispatch: tool`.
  - `command-arg-mode` — `raw` (predeterminado). Para el envío de la herramienta, reenvía la cadena de argumentos sin procesar a la herramienta (sin análisis principal).

    La herramienta se invoca con los parámetros:
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrado (filtros de tiempo de carga)

OpenClaw **filtra las habilidades en el tiempo de carga** usando `metadata` (JSON de una sola línea):

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Campos bajo `metadata.openclaw`:

- `always: true` — incluir siempre la habilidad (omitir otras puertas).
- `emoji` — emoji opcional utilizado por la interfaz de usuario de Skills de macOS.
- `homepage` — URL opcional que se muestra como “Sitio web” en la interfaz de usuario de Skills de macOS.
- `os` — lista opcional de plataformas (`darwin`, `linux`, `win32`). Si se establece, la habilidad solo es elegible en esos sistemas operativos.
- `requires.bins` — lista; cada uno debe existir en `PATH`.
- `requires.anyBins` — lista; al menos uno debe existir en `PATH`.
- `requires.env` — lista; la variable de entorno debe existir **o** proporcionarse en la configuración.
- `requires.config` — lista de rutas `openclaw.json` que deben ser verdaderas.
- `primaryEnv` — nombre de la variable de entorno asociada con `skills.entries.<name>.apiKey`.
- `install` — matriz opcional de especificaciones de instalador utilizadas por la interfaz de usuario de Skills en macOS (brew/node/go/uv/descarga).

Nota sobre el sandbox:

- `requires.bins` se comprueba en el **host** en el momento de la carga de la habilidad.
- Si un agente está en sandbox, el binario también debe existir **dentro del contenedor**.
  Instálalo a través de `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada).
  `setupCommand` se ejecuta una vez después de que se crea el contenedor.
  Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz escribible y un usuario root en el sandbox.
  Ejemplo: la habilidad `summarize` (`skills/summarize/SKILL.md`) necesita la CLI `summarize`
  en el contenedor de sandbox para ejecutarse allí.

Ejemplo de instalador:

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

Notas:

- Si se listan varios instaladores, la puerta de enlace elige una **única** opción preferida (brew si está disponible, de lo contrario node).
- Si todos los instaladores son `download`, OpenClaw enumera cada entrada para que puedas ver los artefactos disponibles.
- Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
- Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de Gateway todavía debe ser Node
  (no se recomienda Bun para WhatsApp/Telegram).
- La selección del instalador respaldada por Gateway se basa en preferencias, no solo en node:
  cuando las especificaciones de instalación mezclan tipos, OpenClaw prefiere Homebrew cuando
  `skills.install.preferBrew` está habilitado y `brew` existe, luego `uv`, luego el
  administrador de node configurado, luego otros alternativas como `go` o `download`.
- Si cada especificación de instalación es `download`, OpenClaw muestra todas las opciones de descarga
  en lugar de colapsarlas en un solo instalador preferido.
- Instalaciones de Go: si falta `go` y `brew` está disponible, la puerta de enlace instala Go a través de Homebrew primero y establece `GOBIN` al `bin` de Homebrew cuando es posible.
- Descargar instalaciones: `url` (requerido), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: auto cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado `~/.openclaw/tools/<skillKey>`).

Si no hay `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que esté deshabilitada en la configuración o bloqueada por `skills.allowBundled` para las habilidades incluidas).

## Anulaciones de configuración (`~/.openclaw/openclaw.json`)

Las habilidades incluidas/gestionadas se pueden alternar y suministrar con valores de entorno:

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

Nota: si el nombre de la habilidad contiene guiones, ponga la clave entre comillas (JSON5 permite claves entre comillas).

Si desea generación/edición de imágenes estándar dentro del propio OpenClaw, use la herramienta central `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad incluida. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros.

Para el análisis de imágenes nativo, use la herramienta `image` con `agents.defaults.imageModel`.
Para la generación/edición de imágenes nativa, use `image_generate` con
`agents.defaults.imageGenerationModel`. Si elige `openai/*`, `google/*`,
`fal/*` u otro modelo de imagen específico del proveedor, agregue también la clave de autenticación/API de ese proveedor.

Las claves de configuración coinciden con el **nombre de habilidad** de forma predeterminada. Si una habilidad define
`metadata.openclaw.skillKey`, use esa clave bajo `skills.entries`.

Reglas:

- `enabled: false` deshabilita la habilidad incluso si está incluida/instalada.
- `env`: se inyecta **solo si** la variable aún no está establecida en el proceso.
- `apiKey`: conveniencia para habilidades que declaran `metadata.openclaw.primaryEnv`.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).
- `config`: bolsa opcional para campos personalizados por habilidad; las claves personalizadas deben vivir aquí.
- `allowBundled`: lista de permitidos opcional solo para habilidades **incluidas**. Si se establece, solo las habilidades incluidas en la lista son elegibles (las habilidades gestionadas/del espacio de trabajo no se ven afectadas).

## Inyección de entorno (por ejecución del agente)

Cuando se inicia una ejecución del agente, OpenClaw:

1. Lee los metadatos de las habilidades.
2. Aplica cualquier `skills.entries.<key>.env` o `skills.entries.<key>.apiKey` a
   `process.env`.
3. Construye el prompt del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

Esto está **limitado a la ejecución del agente**, no a un entorno de shell global.

Para el backend `claude-cli` incluido, OpenClaw también materializa la misma instantánea elegible como un complemento temporal de Claude Code y lo pasa con `--plugin-dir`. Claude Code puede usar su resolvedor de habilidades nativo mientras OpenClaw todavía posee la precedencia, las listas de permitidos por agente, el filtrado y la inyección de claves de entorno/API `skills.entries.*`. Otros backends de CLI solo usan el catálogo de prompts.

## Instantánea de sesión (rendimiento)

OpenClaw guarda una instantánea de las habilidades elegibles **cuando comienza una sesión** y reutiliza esa lista para los turnos posteriores en la misma sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima nueva sesión.

Las habilidades también pueden actualizarse a mitad de la sesión cuando el observador de habilidades está habilitado o cuando aparece un nuevo nodo remoto elegible (ver abajo). Piense en esto como una **recarga en caliente**: la lista actualizada se recoge en el siguiente turno del agente.

Si la lista de permitidos de habilidades del agente efectiva cambia para esa sesión, OpenClaw actualiza la instantánea para que las habilidades visibles se mantengan alineadas con el agente actual.

## Nodos macOS remotos (puerta de enlace Linux)

Si la puerta de enlace se está ejecutando en Linux pero un **nodo macOS** está conectado **con `system.run` permitido** (seguridad de aprobaciones Exec no configurada en `deny`), OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos están presentes en ese nodo. El agente debe ejecutar esas habilidades a través de la herramienta `exec` con `host=node`.

Esto depende de que el nodo informe su soporte de comandos y de un sondeo de binario a través de `system.run`. Si el nodo macOS se desconecta más tarde, las habilidades permanecen visibles; las invocaciones pueden fallar hasta que el nodo se vuelva a conectar.

## Observador de habilidades (actualización automática)

De forma predeterminada, OpenClaw vigila las carpetas de habilidades y actualiza la instantánea de habilidades cuando cambian los archivos `SKILL.md`. Configure esto en `skills.load`:

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

## Impacto en tokens (lista de habilidades)

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades disponibles en el mensaje del sistema (vía `formatSkillsForPrompt` en `pi-coding-agent`). El costo es determinista:

- **Sobrecarga base (solo cuando hay ≥1 habilidad):** 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores escapados en XML de `<name>`, `<description>` y `<location>`.

Fórmula (caracteres):

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notas:

- El escape de XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.), aumentando la longitud.
- Los recuentos de tokens varían según el tokenizador del modelo. Una estimación aproximada estilo OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por habilidad más las longitudes reales de sus campos.

## Ciclo de vida de las habilidades gestionadas

OpenClaw incluye un conjunto base de habilidades como **habilidades agrupadas** como parte de la
instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para las
superposiciones locales (por ejemplo, fijar/ parchear una habilidad sin cambiar la copia
agrupada). Las habilidades del espacio de trabajo son propiedad del usuario y anulan ambas en caso de conflicto de nombres.

## Referencia de configuración

Consulte [Skills config](/es/tools/skills-config) para ver el esquema de configuración completo.

## ¿Busca más habilidades?

Explore [https://clawhub.ai](https://clawhub.ai).

---

## Relacionado

- [Creating Skills](/es/tools/creating-skills) — crear habilidades personalizadas
- [Skills Config](/es/tools/skills-config) — referencia de configuración de habilidades
- [Slash Commands](/es/tools/slash-commands) — todos los comandos de barra disponibles
- [Plugins](/es/tools/plugin) — descripción general del sistema de complementos
