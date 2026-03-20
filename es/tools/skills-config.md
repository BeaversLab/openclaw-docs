---
summary: "Esquema y ejemplos de configuración de habilidades"
read_when:
  - Agregar o modificar la configuración de habilidades
  - Ajustar la lista de permitidos agrupados o el comportamiento de instalación
title: "Configuración de habilidades"
---

# Configuración de habilidades

Toda la configuración relacionada con habilidades reside bajo `skills` en `~/.openclaw/openclaw.json`.

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
junto con la herramienta principal `image_generate`. `skills.entries.*` es solo para flujos de trabajo de habilidades personalizados
o de terceros.

Ejemplos:

- Configuración nativa estilo Nano Banana: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Configuración nativa de fal: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Campos

- `allowBundled`: lista de permitidos opcional solo para habilidades **agrupadas**. Cuando se establece, solo
  las habilidades agrupadas de la lista son elegibles (las habilidades administradas/del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: directorios de habilidades adicionales para escanear (precedencia más baja).
- `load.watch`: vigila las carpetas de habilidades y actualiza la instantánea de habilidades (predeterminado: true).
- `load.watchDebounceMs`: tiempo de rebote para los eventos del observador de habilidades en milisegundos (predeterminado: 250).
- `install.preferBrew`: preferir instaladores de brew cuando estén disponibles (predeterminado: true).
- `install.nodeManager`: preferencia del instalador de node (`npm` | `pnpm` | `yarn` | `bun`, predeterminado: npm).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución de Gateway aún debe ser Node
  (Bun no recomendado para WhatsApp/Telegram).
- `entries.<skillKey>`: anulaciones por habilidad.

Campos por habilidad:

- `enabled`: establezca `false` para deshabilitar una habilidad incluso si está agrupada/instalada.
- `env`: variables de entorno inyectadas para la ejecución del agente (solo si aún no están establecidas).
- `apiKey`: conveniencia opcional para habilidades que declaran una variable de entorno principal.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).

## Notas

- Las claves bajo `entries` se asignan al nombre de la habilidad de forma predeterminada. Si una habilidad define
  `metadata.openclaw.skillKey`, use esa clave en su lugar.
- Los cambios en las habilidades se detectan en el siguiente turno del agente cuando el observador está habilitado.

### Habilidades en sandbox + variables de entorno

Cuando una sesión está **en sandbox**, los procesos de las habilidades se ejecutan dentro de Docker. El sandbox **no** hereda el `process.env` del host.

Utilice uno de los siguientes:

- `agents.defaults.sandbox.docker.env` (o por agente `agents.list[].sandbox.docker.env`)
- incorpore las variables de entorno en su imagen de sandbox personalizada

Las `env` y `skills.entries.<skill>.env/apiKey` globales solo se aplican a las ejecuciones en el **host**.

import es from "/components/footer/es.mdx";

<es />
