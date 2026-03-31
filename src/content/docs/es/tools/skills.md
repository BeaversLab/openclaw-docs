---
summary: "Habilidades: gestionadas vs del espacio de trabajo, reglas de filtrado y cableado de configuración/entorno"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Habilidades"
---

# Habilidades (OpenClaw)

OpenClaw utiliza carpetas de habilidades **compatibles con [AgentSkills](https://agentskills.io)** para enseñar al agente cómo utilizar herramientas. Cada habilidad es un directorio que contiene un `SKILL.md` con encabezados YAML e instrucciones. OpenClaw carga **habilidades integradas** además de anulaciones locales opcionales, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

## Ubicaciones y precedencia

OpenClaw carga habilidades desde estas fuentes:

1. **Carpetas de habilidades adicionales**: configuradas con `skills.load.extraDirs`
2. **Habilidades integradas**: incluidas con la instalación (paquete npm o OpenClaw.app)
3. **Habilidades gestionadas-locales**: `~/.openclaw/skills`
4. **Habilidades de agente personal**: `~/.agents/skills`
5. **Habilidades de agente de proyecto**: `<workspace>/.agents/skills`
6. **Habilidades del espacio de trabajo**: `<workspace>/skills`

Si hay un conflicto en el nombre de una habilidad, la precedencia es:

`<workspace>/skills` (más alto) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → habilidades integradas → `skills.load.extraDirs` (más bajo)

## Habilidades por agente vs. compartidas

En configuraciones de **multi-agente**, cada agente tiene su propio espacio de trabajo. Esto significa:

- Las **habilidades por agente** residen en `<workspace>/skills` solo para ese agente.
- Las **habilidades del agente del proyecto** residen en `<workspace>/.agents/skills` y se aplican a ese espacio de trabajo antes que la carpeta normal del espacio de trabajo `skills/`.
- Las **habilidades del agente personal** residen en `~/.agents/skills` y se aplican en todos los espacios de trabajo de esa máquina.
- Las **habilidades compartidas** residen en `~/.openclaw/skills` (gestionadas locales) y son visibles
  para **todos los agentes** en la misma máquina.
- Las **carpetas compartidas** también se pueden agregar a través de `skills.load.extraDirs` (menor
  precedencia) si deseas un paquete de habilidades común utilizado por varios agentes.

Si el mismo nombre de habilidad existe en más de un lugar, se aplica la precedencia
habitual: gana el espacio de trabajo, luego las habilidades del agente del proyecto, luego las habilidades del agente personal,
luego las gestionadas locales, luego las incluidas, luego los directorios adicionales.

## Complementos + habilidades

Los complementos pueden incluir sus propias habilidades listando los directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades de los complementos se cargan
cuando el complemento está habilitado. Hoy en día, esos directorios se fusionan en la misma
ruta de baja precedencia que `skills.load.extraDirs`, por lo que una habilidad incluida,
gestionada, de agente o de espacio de trabajo con el mismo nombre las anula.
Puedes filtrarlas mediante `metadata.openclaw.requires.config` en la entrada de configuración
del complemento. Consulta [Plugins](/en/tools/plugin) para el descubrimiento/configuración y [Tools](/en/tools) para la
superficie de herramientas que esas habilidades enseñan.

## ClawHub (instalación y sincronización)

ClawHub es el registro público de habilidades para OpenClaw. Navega en
[https://clawhub.com](https://clawhub.com). Usa los comandos nativos `openclaw skills`
para descubrir/instalar/actualizar habilidades, o la CLI independiente `clawhub` cuando
necesites flujos de trabajo de publicación/sincronización.
Guía completa: [ClawHub](/en/tools/clawhub).

Flujos comunes:

- Instala una habilidad en tu espacio de trabajo:
  - `openclaw skills install <skill-slug>`
- Actualiza todas las habilidades instaladas:
  - `openclaw skills update --all`
- Sincronización (escanear + publicar actualizaciones):
  - `clawhub sync --all`

La instalación nativa de `openclaw skills install` se realiza en el directorio `skills/` del espacio de trabajo activo. La CLI independiente `clawhub` también se instala en `./skills` bajo su directorio de trabajo actual (o recurre al espacio de trabajo OpenClaw configurado). OpenClaw lo detecta como `<workspace>/skills` en la siguiente sesión.

## Notas de seguridad

- Trate las habilidades de terceros como **código no confiable**. Léalas antes de habilitarlas.
- Prefiera ejecuciones en sandbox para entradas no confiables y herramientas riesgosas. Consulte [Sandboxing](/en/gateway/sandboxing).
- El descubrimiento de habilidades en el espacio de trabajo y el directorio adicional solo acepta raíces de habilidades y archivos `SKILL.md` cuya ruta real resuelta se mantenga dentro de la raíz configurada.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host** para ese turno del agente (no el sandbox). Mantenga los secretos fuera de los mensajes y registros.
- Para un modelo de amenazas más amplio y listas de verificación, consulte [Seguridad](/en/gateway/security).

## Formato (compatible con AgentSkills + Pi)

`SKILL.md` debe incluir al menos:

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

Notas:

- Seguimos la especificación de AgentSkills para el diseño/intención.
- El analizador utilizado por el agente integrado solo admite claves de frontmatter de **una sola línea**.
- `metadata` debe ser un **objeto JSON de una sola línea**.
- Use `{baseDir}` en las instrucciones para hacer referencia a la ruta de la carpeta de habilidades.
- Claves de frontmatter opcionales:
  - `homepage` — URL que se muestra como “Website” en la interfaz de usuario de Habilidades de macOS (también compatible con `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (predeterminado: `true`). Cuando `true`, la habilidad se expone como un comando de barra del usuario.
  - `disable-model-invocation` — `true|false` (predeterminado: `false`). Cuando `true`, la habilidad se excluye del mensaje del modelo (aún disponible mediante la invocación del usuario).
  - `command-dispatch` — `tool` (opcional). Cuando se establece en `tool`, el comando de barra omite el modelo y se envía directamente a una herramienta.
  - `command-tool` — nombre de la herramienta a invocar cuando se establece `command-dispatch: tool`.
  - `command-arg-mode` — `raw` (predeterminado). Para el envío de herramientas, reenvía la cadena de argumentos sin procesar a la herramienta (sin análisis central).

    La herramienta se invoca con parámetros:
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrado (filtros en tiempo de carga)

OpenClaw **filtra las habilidades en tiempo de carga** usando `metadata` (JSON de una sola línea):

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

Campos bajo `metadata.openclaw`:

- `always: true` — incluir siempre la habilidad (omitir otros filtros).
- `emoji` — emoji opcional utilizado por la interfaz de usuario de Habilidades de macOS.
- `homepage` — URL opcional que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS.
- `os` — lista opcional de plataformas (`darwin`, `linux`, `win32`). Si se establece, la habilidad solo es elegible en esos sistemas operativos.
- `requires.bins` — lista; cada uno debe existir en `PATH`.
- `requires.anyBins` — lista; al menos uno debe existir en `PATH`.
- `requires.env` — lista; la variable de entorno debe existir **o** proporcionarse en la configuración.
- `requires.config` — lista de rutas `openclaw.json` que deben ser verdaderas.
- `primaryEnv` — nombre de la variable de entorno asociada con `skills.entries.<name>.apiKey`.
- `install` — matriz opcional de especificaciones de instalador utilizadas por la interfaz de usuario de Habilidades de macOS (brew/node/go/uv/download).

Nota sobre el aislamiento (sandboxing):

- `requires.bins` se comprueba en el **host** en el momento de la carga de la habilidad.
- Si un agente está aislado, el binario también debe existir **dentro del contenedor**.
  Instálelo mediante `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada).
  `setupCommand` se ejecuta una vez después de que se crea el contenedor.
  Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz escribible y un usuario root en el aislamiento.
  Ejemplo: la habilidad `summarize` (`skills/summarize/SKILL.md`) necesita la CLI `summarize`
  en el contenedor aislado para ejecutarse allí.

Ejemplo de instalador:

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

Notas:

- Si se enumeran varios instaladores, la puerta de enlace elige una **única** opción preferida (brew si está disponible, de lo contrario node).
- Si todos los instaladores son `download`, OpenClaw enumera cada entrada para que pueda ver los artefactos disponibles.
- Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
- Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de Gateway todavía debe ser Node
  ️(no se recomienda Bun para WhatsApp/Telegram).
- Instalaciones de Go: si falta `go` y `brew` está disponible, la puerta de enlace instala Go a través de Homebrew primero y establece `GOBIN` al `bin` de Homebrew cuando es posible.
- Descarga de instalaciones: `url` (obligatorio), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: automático cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado `~/.openclaw/tools/<skillKey>`).

Si no hay ningún `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que esté desactivada en la configuración o bloqueada por `skills.allowBundled` para las habilidades incluidas).

## Anulaciones de configuración (`~/.openclaw/openclaw.json`)

Las habilidades incluidas/gestionadas se pueden activar y desactivar, y se les pueden suministrar valores de entorno:

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

Nota: si el nombre de la habilidad contiene guiones, ponga la clave entre comillas (JSON5 permite claves entrecomilladas).

Si desea generación/edición de imágenes estándar dentro del propio OpenClaw, use la herramienta principal `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad incluida. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros.

Para el análisis de imágenes nativo, use la herramienta `image` con `agents.defaults.imageModel`.
Para la generación/edición de imágenes nativa, use `image_generate` con
`agents.defaults.imageGenerationModel`. Si elige `openai/*`, `google/*`,
`fal/*` u otro modelo de imagen específico del proveedor, agregue también la clave de autenticación/API de ese proveedor.

Las claves de configuración coinciden con el **skill name** de forma predeterminada. Si una habilidad define
`metadata.openclaw.skillKey`, usa esa clave bajo `skills.entries`.

Reglas:

- `enabled: false` deshabilita la habilidad incluso si está empaquetada/instalada.
- `env`: se inyecta **solo si** la variable aún no está establecida en el proceso.
- `apiKey`: conveniencia para las habilidades que declaran `metadata.openclaw.primaryEnv`.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).
- `config`: bolsa opcional para campos personalizados por habilidad; las claves personalizadas deben vivir aquí.
- `allowBundled`: lista de permitidos opcional solo para habilidades **empaquetadas**. Si se establece, solo
  las habilidades empaquetadas de la lista son elegibles (las habilidades gestionadas/del espacio de trabajo no se ven afectadas).

## Inyección de entorno (por ejecución del agente)

Cuando se inicia una ejecución del agente, OpenClaw:

1. Lee los metadatos de la habilidad.
2. Aplica cualquier `skills.entries.<key>.env` o `skills.entries.<key>.apiKey` a
   `process.env`.
3. Construye el prompt del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

Esto está **limitado a la ejecución del agente**, no a un entorno de shell global.

## Instantánea de sesión (rendimiento)

OpenClaw toma una instantánea de las habilidades elegibles **cuando se inicia una sesión** y reutiliza esa lista para turnos posteriores en la misma sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima sesión nueva.

Las habilidades también pueden actualizarse a mitad de sesión cuando el observador de habilidades está habilitado o cuando aparece un nuevo nodo remoto elegible (ver abajo). Piense en esto como una **recarga en caliente (hot reload)**: la lista actualizada se recoge en el siguiente turno del agente.

## Nodos macOS remotos (puerta de enlace Linux)

Si la puerta de enlace se está ejecutando en Linux pero está conectado un **nodo macOS** **con `system.run` permitido** (la seguridad de aprobaciones de Exec no está establecida en `deny`), OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos están presentes en ese nodo. El agente debe ejecutar esas habilidades a través de la herramienta `nodes` (típicamente `nodes.run`).

Esto depende de que el nodo reporte su soporte de comandos y de una sonda de binarios a través de `system.run`. Si el nodo macOS se desconecta más tarde, las habilidades permanecen visibles; las invocaciones pueden fallar hasta que el nodo se reconecte.

## Observador de habilidades (autoactualización)

De manera predeterminada, OpenClaw observa las carpetas de habilidades y actualiza la instantánea de habilidades cuando cambian los archivos `SKILL.md`. Configure esto bajo `skills.load`:

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

## Impacto de tokens (lista de habilidades)

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades disponibles en el prompt del sistema (a través de `formatSkillsForPrompt` en `pi-coding-agent`). El costo es determinista:

- **Sobrecarga base (solo cuando hay ≥1 habilidad):** 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores escapados en XML de `<name>`, `<description>` y `<location>`.

Fórmula (caracteres):

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notas:

- El escape de XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.), aumentando la longitud.
- Los recuentos de tokens varían según el tokenizador del modelo. Una estimación aproximada estilo OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por habilidad más la longitud real de tus campos.

## Ciclo de vida de las habilidades gestionadas

OpenClaw incluye un conjunto base de habilidades como **habilidades empaquetadas** (bundled skills) como parte de la instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para las anulaciones locales (por ejemplo, fijar/ parchear una habilidad sin cambiar la copia empaquetada). Las habilidades del espacio de trabajo son propiedad del usuario y anulan a ambas en caso de conflictos de nombre.

## Referencia de configuración

Consulte [Skills config](/en/tools/skills-config) para ver el esquema de configuración completo.

## ¿Busca más habilidades?

Explore [https://clawhub.com](https://clawhub.com).

---
