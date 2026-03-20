---
summary: "Habilidades: administradas vs. del área de trabajo, reglas de filtrado y cableado de configuración/entorno"
read_when:
  - Agregar o modificar habilidades
  - Cambiar el filtrado de habilidades o las reglas de carga
title: "Habilidades"
---

# Habilidades (OpenClaw)

OpenClaw utiliza carpetas de habilidades **compatibles con [AgentSkills](https://agentskills.io)** para enseñar al agente cómo usar las herramientas. Cada habilidad es un directorio que contiene un `SKILL.md` con encabezados YAML e instrucciones. OpenClaw carga **habilidades empaquetadas** más anulaciones locales opcionales, y las filtra en el momento de la carga según el entorno, la configuración y la presencia de binarios.

## Ubicaciones y precedencia

Las habilidades se cargan desde **tres** lugares:

1. **Habilidades empaquetadas**: incluidas con la instalación (paquete npm o OpenClaw.app)
2. **Habilidades administradas/locales**: `~/.openclaw/skills`
3. **Habilidades del área de trabajo**: `<workspace>/skills`

Si hay un conflicto con el nombre de una habilidad, la precedencia es:

`<workspace>/skills` (más alta) → `~/.openclaw/skills` → habilidades empaquetadas (más baja)

Además, puedes configurar carpetas de habilidades adicionales (precedencia más baja) a través de
`skills.load.extraDirs` en `~/.openclaw/openclaw.json`.

## Habilidades por agente vs. compartidas

En configuraciones **multiagente**, cada agente tiene su propio área de trabajo. Esto significa que:

- **Las habilidades por agente** residen en `<workspace>/skills` solo para ese agente.
- **Las habilidades compartidas** residen en `~/.openclaw/skills` (administradas/locales) y son visibles
  para **todos los agentes** en la misma máquina.
- También se pueden agregar **carpetas compartidas** a través de `skills.load.extraDirs` (precedencia
  más baja) si deseas un paquete de habilidades común utilizado por múltiples agentes.

Si el mismo nombre de habilidad existe en más de un lugar, se aplica la precedencia habitual:
prevalece el área de trabajo, luego la administrada/local y luego la empaquetada.

## Complementos + habilidades

Los complementos pueden incluir sus propias habilidades al listar directorios `skills` en
`openclaw.plugin.json` (rutas relativas a la raíz del complemento). Las habilidades del complemento se cargan
cuando el complemento está habilitado y participan en las reglas normales de precedencia de habilidades.
Puedes filtrarlas a través de `metadata.openclaw.requires.config` en la entrada de configuración
del complemento. Consulte [Plugins](/es/tools/plugin) para descubrimiento/configuración y [Tools](/es/tools) para la
superficie de herramienta que enseñan esas habilidades.

## ClawHub (instalación + sincronización)

ClawHub es el registro público de habilidades para OpenClaw. Navegue en
[https://clawhub.com](https://clawhub.com). Úselo para descubrir, instalar, actualizar y hacer copias de seguridad de las habilidades.
Guía completa: [ClawHub](/es/tools/clawhub).

Flujos comunes:

- Instalar una habilidad en su espacio de trabajo:
  - `clawhub install <skill-slug>`
- Actualizar todas las habilidades instaladas:
  - `clawhub update --all`
- Sincronizar (escanear + publicar actualizaciones):
  - `clawhub sync --all`

De forma predeterminada, `clawhub` instala en `./skills` en su directorio de trabajo
actual (o recurre al espacio de trabajo de OpenClaw configurado). OpenClaw
lo reconoce como `<workspace>/skills` en la siguiente sesión.

## Notas de seguridad

- Trate las habilidades de terceros como **código no confiable**. Léalas antes de habilitarlas.
- Prefiera ejecuciones en espacio aislado para entradas que no son de confianza y herramientas riesgosas. Consulte [Sandboxing](/es/gateway/sandboxing).
- El descubrimiento de habilidades en el espacio de trabajo y en directorios adicionales solo acepta raíces de habilidades y archivos `SKILL.md` cuya ruta resuelta (realpath) se mantenga dentro de la raíz configurada.
- `skills.entries.*.env` y `skills.entries.*.apiKey` inyectan secretos en el proceso **host**
  para ese turno del agente (no el espacio aislado). Mantenga los secretos fuera de los avisos y los registros.
- Para un modelo de amenazas más amplio y listas de verificación, consulte [Security](/es/gateway/security).

## Formato (AgentSkills + compatible con Pi)

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
- Use `{baseDir}` en las instrucciones para hacer referencia a la ruta de la carpeta de la habilidad.
- Claves de frontmatter opcionales:
  - `homepage` — URL que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS (también compatible a través de `metadata.openclaw.homepage`).
  - `user-invocable` — `true|false` (predeterminado: `true`). Cuando `true`, la habilidad se expone como un comando de barra de usuario.
  - `disable-model-invocation` — `true|false` (predeterminado: `false`). Cuando `true`, la habilidad se excluye del mensaje del modelo (aún disponible por invocación del usuario).
  - `command-dispatch` — `tool` (opcional). Cuando se establece en `tool`, el comando de barra oblicua omite el modelo y se envía directamente a una herramienta.
  - `command-tool` — nombre de la herramienta a invocar cuando `command-dispatch: tool` está establecido.
  - `command-arg-mode` — `raw` (predeterminado). Para el envío de herramientas, reenvía la cadena de argumentos cruda a la herramienta (sin análisis principal).

    La herramienta se invoca con parámetros:
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Filtrado (filtros de tiempo de carga)

OpenClaw **filtra las habilidades en el momento de la carga** usando `metadata` (JSON de una sola línea):

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

Campos bajo `metadata.openclaw`:

- `always: true` — siempre incluir la habilidad (omitir otros filtros).
- `emoji` — emoji opcional utilizado por la interfaz de usuario de Habilidades de macOS.
- `homepage` — URL opcional que se muestra como "Sitio web" en la interfaz de usuario de Habilidades de macOS.
- `os` — lista opcional de plataformas (`darwin`, `linux`, `win32`). Si se establece, la habilidad solo es elegible en esos sistemas operativos.
- `requires.bins` — lista; cada uno debe existir en `PATH`.
- `requires.anyBins` — lista; al menos uno debe existir en `PATH`.
- `requires.env` — lista; la variable de entorno debe existir **o** proporcionarse en la configuración.
- `requires.config` — lista de rutas `openclaw.json` que deben ser verdaderas.
- `primaryEnv` — nombre de variable de entorno asociado con `skills.entries.<name>.apiKey`.
- `install` — matriz opcional de especificaciones de instalador utilizadas por la interfaz de usuario de Habilidades de macOS (brew/node/go/uv/download).

Nota sobre el sandbox:

- `requires.bins` se verifica en el **host** en el momento de la carga de la habilidad.
- Si un agente está en un entorno limitado (sandboxed), el binario también debe existir **dentro del contenedor**.
  Instálalo mediante `agents.defaults.sandbox.docker.setupCommand` (o una imagen personalizada).
  `setupCommand` se ejecuta una vez después de que se crea el contenedor.
  Las instalaciones de paquetes también requieren salida de red, un sistema de archivos raíz escribible y un usuario root en el entorno limitado.
  Ejemplo: la habilidad `summarize` (`skills/summarize/SKILL.md`) necesita la CLI de `summarize`
  en el contenedor del entorno limitado para ejecutarse allí.

Ejemplo de instalador:

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

Notas:

- Si se enumeran varios instaladores, la puerta de enlace elige una **única** opción preferida (brew si está disponible, de lo contrario node).
- Si todos los instaladores son `download`, OpenClaw enumera cada entrada para que puedas ver los artefactos disponibles.
- Las especificaciones del instalador pueden incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opciones por plataforma.
- Las instalaciones de Node respetan `skills.install.nodeManager` en `openclaw.json` (predeterminado: npm; opciones: npm/pnpm/yarn/bun).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de la puerta de enlace aún debe ser Node
  (no se recomienda Bun para WhatsApp/Telegram).
- Instalaciones de Go: si falta `go` y `brew` está disponible, la puerta de enlace instala Go a través de Homebrew primero y establece `GOBIN` al `bin` de Homebrew cuando es posible.
- Instalaciones por descarga: `url` (obligatorio), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (predeterminado: automático cuando se detecta un archivo), `stripComponents`, `targetDir` (predeterminado: `~/.openclaw/tools/<skillKey>`).

Si no hay ningún `metadata.openclaw` presente, la habilidad siempre es elegible (a menos que
esté deshabilitada en la configuración o bloqueada por `skills.allowBundled` para las habilidades incluidas).

## Invalidaciones de configuración (`~/.openclaw/openclaw.json`)

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

Nota: si el nombre de la habilidad contiene guiones, pon la clave entre comillas (JSON5 permite claves entre comillas).

Si deseas generación/edición de imágenes stock dentro del propio OpenClaw, utiliza la herramienta principal `image_generate` con `agents.defaults.imageGenerationModel` en lugar de una habilidad incluida. Los ejemplos de habilidades aquí son para flujos de trabajo personalizados o de terceros.

Las claves de configuración coinciden con el **nombre de habilidad** por defecto. Si una habilidad define `metadata.openclaw.skillKey`, usa esa clave bajo `skills.entries`.

Reglas:

- `enabled: false` deshabilita la habilidad incluso si está incluida/instalada.
- `env`: inyectado **solo si** la variable ya no está configurada en el proceso.
- `apiKey`: comodidad para habilidades que declaran `metadata.openclaw.primaryEnv`.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).
- `config`: bolsa opcional para campos personalizados por habilidad; las claves personalizadas deben vivir aquí.
- `allowBundled`: lista de permitidos opcional solo para habilidades **incluidas**. Si se establece, solo
  las habilidades incluidas en la lista son elegibles (habilidades gestionadas/en el espacio de trabajo no afectadas).

## Inyección de entorno (por ejecución de agente)

Cuando comienza una ejecución de agente, OpenClaw:

1. Lee los metadatos de la habilidad.
2. Aplica cualquier `skills.entries.<key>.env` o `skills.entries.<key>.apiKey` a
   `process.env`.
3. Construye el mensaje del sistema con habilidades **elegibles**.
4. Restaura el entorno original después de que finaliza la ejecución.

Esto está **limitado a la ejecución del agente**, no a un entorno de shell global.

## Instantánea de sesión (rendimiento)

OpenClaw guarda una instantánea de las habilidades elegibles **cuando comienza una sesión** y reutiliza esa lista para los turnos posteriores en la misma sesión. Los cambios en las habilidades o la configuración surten efecto en la próxima nueva sesión.

Las habilidades también pueden actualizarse a mitad de sesión cuando el observador de habilidades está habilitado o cuando aparece un nuevo nodo remoto elegible (ver abajo). Piensa en esto como una **recarga en caliente (hot reload)**: la lista actualizada se recoge en el siguiente turno del agente.

## Nodos macOS remotos (puerta de enlace Linux)

Si el Gateway se está ejecutando en Linux pero hay un **nodo macOS** conectado **con `system.run` permitido** (Seguridad de aprobaciones de ejecución no establecida en `deny`), OpenClaw puede considerar las habilidades exclusivas de macOS como elegibles cuando los binarios necesarios están presentes en ese nodo. El agente debe ejecutar esas habilidades a través de la herramienta `nodes` (típicamente `nodes.run`).

Esto depende de que el nodo reporte su soporte de comandos y de una sonda de binarios a través de `system.run`. Si el nodo macOS se desconecta más tarde, las habilidades permanecen visibles; las invocaciones pueden fallar hasta que el nodo se reconecte.

## Skills watcher (actualización automática)

Por defecto, OpenClaw observa las carpetas de habilidades y actualiza la instantánea de habilidades cuando cambian los archivos `SKILL.md`. Configure esto en `skills.load`:

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

Cuando las habilidades son elegibles, OpenClaw inyecta una lista XML compacta de las habilidades disponibles en el mensaje del sistema (a través de `formatSkillsForPrompt` en `pi-coding-agent`). El costo es determinista:

- **Sobrecarga base (solo cuando hay ≥1 habilidad):** 195 caracteres.
- **Por habilidad:** 97 caracteres + la longitud de los valores XML escapados `<name>`, `<description>` y `<location>`.

Fórmula (caracteres):

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notas:

- El escape XML expande `& < > " '` en entidades (`&amp;`, `&lt;`, etc.), aumentando la longitud.
- Los recuentos de tokens varían según el tokenizador del modelo. Una estim aproximada estilo OpenAI es de ~4 caracteres/token, por lo que **97 caracteres ≈ 24 tokens** por habilidad más las longitudes reales de sus campos.

## Ciclo de vida de habilidades gestionadas

OpenClaw incluye un conjunto base de habilidades como **habilidades empaquetadas** (bundled skills) como parte de la instalación (paquete npm u OpenClaw.app). `~/.openclaw/skills` existe para anulaciones locales (por ejemplo, fijar/ parchear una habilidad sin cambiar la copia empaquetada). Las habilidades del espacio de trabajo (Workspace) son propiedad del usuario y anulan ambas en caso de conflictos de nombre.

## Referencia de configuración

Consulte [Skills config](/es/tools/skills-config) para ver el esquema de configuración completo.

## ¿Busca más habilidades?

Explore [https://clawhub.com](https://clawhub.com).

---

import en from "/components/footer/en.mdx";

<en />
