---
summary: "Esquema de configuración de habilidades y ejemplos"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuración de habilidades"
---

# Configuración de habilidades

La mayor parte de la configuración del cargador/instalador de habilidades se encuentra en `skills` en
`~/.openclaw/openclaw.json`. La visibilidad de habilidades específicas del agente se encuentra en
`agents.defaults.skills` y `agents.list[].skills`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

Para la generación/edición de imágenes integrada, prefiera `agents.defaults.imageGenerationModel`
junto con la herramienta `image_generate` principal. `skills.entries.*` es solo para flujos de trabajo
de habilidades personalizados o de terceros.

Si selecciona un proveedor/modelo de imagen específico, también configure la clave de autenticación/API
de ese proveedor. Ejemplos típicos: `GEMINI_API_KEY` o `GOOGLE_API_KEY` para
`google/*`, `OPENAI_API_KEY` para `openai/*`, y `FAL_KEY` para `fal/*`.

Ejemplos:

- Configuración estilo Nano Banana Pro nativa: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuración nativa de fal: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Listas de permitidos de habilidades del agente

Use la configuración del agente cuando desee las mismas raíces de habilidades de máquina/espacio de trabajo,
pero un conjunto de habilidades visible diferente para cada agente.

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

Reglas:

- `agents.defaults.skills`: lista de permitidos base compartida para los agentes que omiten
  `agents.list[].skills`.
- Omita `agents.defaults.skills` para dejar las habilidades sin restricciones de forma predeterminada.
- `agents.list[].skills`: conjunto final de habilidades explícito para ese agente; no se fusiona
  con los valores predeterminados.
- `agents.list[].skills: []`: no expone habilidades para ese agente.

## Campos

- Las raíces de habilidades integradas siempre incluyen `~/.openclaw/skills`, `~/.agents/skills`,
  `<workspace>/.agents/skills` y `<workspace>/skills`.
- `allowBundled`: lista de permitidos opcional solo para habilidades **incluidas**. Cuando se establece,
  solo las habilidades incluidas en la lista son elegibles (las habilidades administradas, de agente y del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: directorios de habilidades adicionales para escanear (menor precedencia).
- `load.watch`: vigila las carpetas de habilidades y actualiza la instantánea de habilidades (predeterminado: true).
- `load.watchDebounceMs`: tiempo de rebote para los eventos del observador de habilidades en milisegundos (por defecto: 250).
- `install.preferBrew`: prefierir los instaladores de brew cuando estén disponibles (por defecto: true).
- `install.nodeManager`: preferencia del instalador de node (`npm` | `pnpm` | `yarn` | `bun`, por defecto: npm).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución del Gateway debe seguir siendo Node
  (no se recomienda Bun para WhatsApp/Telegram).
  - `openclaw setup --node-manager` es más limitado y actualmente acepta `npm`,
    `pnpm`, o `bun`. Establezca `skills.install.nodeManager: "yarn"` manualmente si desea
    instalaciones de habilidades respaldadas por Yarn.
- `entries.<skillKey>`: anulaciones por habilidad.
- `agents.defaults.skills`: lista blanca de habilidades predeterminada opcional heredada por los agentes
  que omiten `agents.list[].skills`.
- `agents.list[].skills`: lista blanca final de habilidades opcional por agente; las listas
  explícitas reemplazan los valores predeterminados heredados en lugar de fusionarse.

Campos por habilidad:

- `enabled`: establezca `false` para deshabilitar una habilidad incluso si está empaquetada/instalada.
- `env`: variables de entorno inyectadas para la ejecución del agente (solo si no están establecidas).
- `apiKey`: conveniencia opcional para habilidades que declaran una variable de entorno principal.
  Admite cadenas de texto sin formato u objetos SecretRef (`{ source, provider, id }`).

## Notas

- Las claves bajo `entries` se asignan al nombre de la habilidad por defecto. Si una habilidad define
  `metadata.openclaw.skillKey`, use esa clave en su lugar.
- La precedencia de carga es `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → habilidades empaquetadas →
  `skills.load.extraDirs`.
- Los cambios en las habilidades se detectan en el siguiente turno del agente cuando el observador está habilitado.

### Habilidades en entorno aislado + variables de entorno

Cuando una sesión está **en sandbox**, los procesos de las habilidades se ejecutan dentro del backend de sandbox configurado. El sandbox **no** hereda el `process.env` del host.

Use uno de:

- `agents.defaults.sandbox.docker.env` para el backend de Docker (o `agents.list[].sandbox.docker.env` por agente)
- incorpore las variables de entorno en su imagen personalizada de sandbox o en el entorno remoto de sandbox

Los `env` y `skills.entries.<skill>.env/apiKey` globales solo se aplican a ejecuciones en el **host**.
