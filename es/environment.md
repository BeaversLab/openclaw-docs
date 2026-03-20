---
summary: "Dónde OpenClaw carga las variables de entorno y el orden de precedencia"
read_when:
  - Necesitas saber qué variables de entorno se cargan y en qué orden
  - Estás depurando claves de API faltantes en el Gateway
  - Estás documentando la autenticación del proveedor o los entornos de implementación
title: "Variables de entorno"
---

# Variables de entorno

OpenClaw extrae variables de entorno de múltiples fuentes. La regla es **nunca sobrescribir los valores existentes**.

## Precedencia (más alta → más baja)

1. **Entorno de proceso** (lo que el proceso del Gateway ya tiene del shell/daemon principal).
2. **`.env` en el directorio de trabajo actual** (predeterminado de dotenv; no sobrescribe).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; no sobrescribe).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional del shell de login** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para las claves esperadas que faltan.

Si falta completamente el archivo de configuración, se omite el paso 4; la importación del shell aún se ejecuta si está habilitada.

## Bloque `env` de configuración

Dos formas equivalentes de establecer variables de entorno en línea (ambas no sobrescriben):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Importación del entorno del shell

`env.shellEnv` ejecuta tu shell de login e importa solo las claves esperadas **que faltan**:

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

Equivalentes de variables de entorno:

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Sustitución de variables de entorno en la configuración

Puedes referenciar variables de entorno directamente en los valores de cadena de la configuración usando la sintaxis `${VAR_NAME}`:

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

Consulte [Configuración: Sustitución de variables de entorno](/es/gateway/configuration#env-var-substitution-in-config) para obtener detalles completos.

## Relacionado

- [Configuración del Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Descripción general de modelos](/es/concepts/models)

import en from "/components/footer/en.mdx";

<en />
