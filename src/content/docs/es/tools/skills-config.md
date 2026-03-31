---
summary: "Esquema de configuración de habilidades y ejemplos"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Configuración de habilidades"
---

# Configuración de habilidades

Toda la configuración relacionada con las habilidades reside bajo `skills` en `~/.openclaw/openclaw.json`.

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

Para la generación/edición de imágenes integrada, se prefiere `agents.defaults.imageGenerationModel`
más la herramienta central `image_generate`. `skills.entries.*` es solo para flujos de trabajo
de habilidades personalizadas o de terceros.

Si selecciona un proveedor/modelo de imagen específico, también configure la clave de autenticación/API de ese proveedor. Ejemplos típicos: `GEMINI_API_KEY` o `GOOGLE_API_KEY` para `google/*`, `OPENAI_API_KEY` para `openai/*` y `FAL_KEY` para `fal/*`.

Ejemplos:

- Configuración nativa estilo Nano Banana: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuración nativa de fal: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Campos

- Las raíces de habilidades integradas siempre incluyen `~/.openclaw/skills`, `~/.agents/skills`,
  `<workspace>/.agents/skills` y `<workspace>/skills`.
- `allowBundled`: lista de permitidos opcional solo para habilidades **incluidas (bundled)**. Cuando se establece, solo
  las habilidades incluidas en la lista son elegibles (las habilidades administradas, de agente y de espacio de trabajo no se ven afectadas).
- `load.extraDirs`: directorios de habilidades adicionales para escanear (menor precedencia).
- `load.watch`: observar las carpetas de habilidades y actualizar la instantánea de habilidades (predeterminado: true).
- `load.watchDebounceMs`: tiempo de espera (debounce) para eventos del observador de habilidades en milisegundos (predeterminado: 250).
- `install.preferBrew`: preferir instaladores de brew cuando estén disponibles (predeterminado: true).
- `install.nodeManager`: preferencia del instalador de node (`npm` | `pnpm` | `yarn` | `bun`, predeterminado: npm).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de Gateway aún debe ser Node
  (no se recomienda Bun para WhatsApp/Telegram).
- `entries.<skillKey>`: anulaciones por habilidad.

Campos por habilidad:

- `enabled`: establezca `false` para deshabilitar una habilidad incluso si está incluida/instalada.
- `env`: variables de entorno inyectadas para la ejecución del agente (solo si aún no están establecidas).
- `apiKey`: comodidad opcional para habilidades que declaran una variable de entorno principal.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).

## Notas

- Las claves bajo `entries` se asignan al nombre de la habilidad de forma predeterminada. Si una habilidad define
  `metadata.openclaw.skillKey`, use esa clave en su lugar.
- La precedencia de carga es `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → habilidades incluidas →
  `skills.load.extraDirs`.
- Los cambios en las habilidades se detectan en el siguiente turno del agente cuando el observador está habilitado.

### Habilidades en sandbox + variables de entorno

Cuando una sesión está en **sandbox**, los procesos de habilidad se ejecutan dentro de Docker. El sandbox
**no** hereda el `process.env` del host.

Use una de las siguientes opciones:

- `agents.defaults.sandbox.docker.env` (o `agents.list[].sandbox.docker.env` por agente)
- incorpore las variables de entorno en su imagen de sandbox personalizada

Las `env` y `skills.entries.<skill>.env/apiKey` globales solo se aplican a ejecuciones en el **host**.
