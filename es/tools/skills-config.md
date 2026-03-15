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
      "nano-banana-pro": {
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

## Campos

- `allowBundled`: lista de permitidos opcional solo para habilidades **incluidas**. Cuando se establece, solo
  las habilidades incluidas en la lista son elegibles (las habilidades gestionadas/del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: directorios de habilidades adicionales para escanear (menor prioridad).
- `load.watch`: vigila las carpetas de habilidades y actualiza la instantánea de habilidades (predeterminado: true).
- `load.watchDebounceMs`: tiempo de espera para los eventos del observador de habilidades en milisegundos (predeterminado: 250).
- `install.preferBrew`: prefiere instaladores brew cuando estén disponibles (predeterminado: true).
- `install.nodeManager`: preferencia del instalador de node (`npm` | `pnpm` | `yarn` | `bun`, predeterminado: npm).
  Esto solo afecta las **instalaciones de habilidades**; el tiempo de ejecución del Gateway todavía debe ser Node
  (no se recomienda Bun para WhatsApp/Telegram).
- `entries.<skillKey>`: anulaciones por habilidad.

Campos por habilidad:

- `enabled`: establezca `false` para deshabilitar una habilidad incluso si está incluida/instalada.
- `env`: variables de entorno inyectadas para la ejecución del agente (solo si no están establecidas previamente).
- `apiKey`: conveniencia opcional para habilidades que declaran una variable de entorno principal.
  Admite cadena de texto sin formato u objeto SecretRef (`{ source, provider, id }`).

## Notas

- Las claves bajo `entries` se asignan al nombre de la habilidad de forma predeterminada. Si una habilidad define
  `metadata.openclaw.skillKey`, use esa clave en su lugar.
- Los cambios en las habilidades se detectan en el siguiente turno del agente cuando el observador está habilitado.

### Habilidades en sandbox + variables de entorno

Cuando una sesión está en **sandbox**, los procesos de habilidad se ejecutan dentro de Docker. El sandbox
**no** hereda el `process.env` del host.

Utilice uno de:

- `agents.defaults.sandbox.docker.env` (o por agente `agents.list[].sandbox.docker.env`)
- incorpore las variables de entorno en su imagen de sandbox personalizada

El `env` y `skills.entries.<skill>.env/apiKey` globales se aplican solo a ejecuciones de **host**.

import es from "/components/footer/es.mdx";

<es />
