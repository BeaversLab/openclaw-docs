# Diseño de integración del proveedor Kilo Gateway

## Resumen

Este documento describe el diseño para integrar "Kilo Gateway" como un proveedor de primera clase en OpenClaw, tomando como modelo la implementación existente de OpenRouter. Kilo Gateway utiliza una API de completado compatible con OpenAI con una URL base diferente.

## Decisiones de diseño

### 1. Nombre del proveedor

**Recomendación: `kilocode`**

Justificación:

- Coincide con el ejemplo de configuración de usuario proporcionado (clave de proveedor `kilocode`)
- Es consistente con los patrones de nomenclatura de proveedores existentes (por ejemplo, `openrouter`, `opencode`, `moonshot`)
- Corto y memorable
- Evita confusiones con los términos genéricos "kilo" o "gateway"

Alternativa considerada: `kilo-gateway` - rechazada porque los nombres con guiones son menos comunes en la base de código y `kilocode` es más conciso.

### 2. Referencia del modelo predeterminado

**Recomendación: `kilocode/anthropic/claude-opus-4.6`**

Justificación:

- Basado en el ejemplo de configuración de usuario
- Claude Opus 4.5 es un modelo predeterminado capaz
- La selección explícita del modelo evita la dependencia del enrutamiento automático

### 3. Configuración de la URL base

**Recomendación: Predeterminado codificado con anulación de configuración**

- **URL base predeterminada:** `https://api.kilo.ai/api/gateway/`
- **Configurable:** Sí, a través de `models.providers.kilocode.baseUrl`

Esto coincide con el patrón utilizado por otros proveedores como Moonshot, Venice y Synthetic.

### 4. Escaneo de modelos

**Recomendación: Sin punto final dedicado para el escaneo de modelos inicialmente**

Justificación:

- Kilo Gateway actúa como proxy para OpenRouter, por lo que los modelos son dinámicos
- Los usuarios pueden configurar manualmente los modelos en su configuración
- Si Kilo Gateway expone un punto final `/models` en el futuro, se puede añadir el escaneo

### 5. Manejo especial

**Recomendación: Heredar el comportamiento de OpenRouter para los modelos de Anthropic**

Dado que Kilo Gateway actúa como proxy para OpenRouter, se debe aplicar el mismo manejo especial:

- Elegibilidad de TTL de caché para modelos `anthropic/*`
- Parámetros adicionales (cacheControlTtl) para modelos `anthropic/*`
- La política de transcripciones sigue los patrones de OpenRouter

## Archivos a modificar

### Gestión central de credenciales

#### 1. `src/commands/onboard-auth.credentials.ts`

Añadir:

```typescript
export const KILOCODE_DEFAULT_MODEL_REF = "kilocode/anthropic/claude-opus-4.6";

export async function setKilocodeApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "kilocode:default",
    credential: {
      type: "api_key",
      provider: "kilocode",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
```

#### 2. `src/agents/model-auth.ts`

Añadir a `envMap` en `resolveEnvApiKey()`:

```typescript
const envMap: Record<string, string> = {
  // ... existing entries
  kilocode: "KILOCODE_API_KEY",
};
```

#### 3. `src/config/io.ts`

Añadir a `SHELL_ENV_EXPECTED_KEYS`:

```typescript
const SHELL_ENV_EXPECTED_KEYS = [
  // ... existing entries
  "KILOCODE_API_KEY",
];
```

### Aplicación de Configuración

#### 4. `src/commands/onboard-auth.config-core.ts`

Añadir nuevas funciones:

```typescript
export const KILOCODE_BASE_URL = "https://api.kilo.ai/api/gateway/";

export function applyKilocodeProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[KILOCODE_DEFAULT_MODEL_REF] = {
    ...models[KILOCODE_DEFAULT_MODEL_REF],
    alias: models[KILOCODE_DEFAULT_MODEL_REF]?.alias ?? "Kilo Gateway",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.kilocode;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  providers.kilocode = {
    ...existingProviderRest,
    baseUrl: KILOCODE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyKilocodeConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyKilocodeProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: KILOCODE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}
```

### Sistema de Elección de Autenticación

#### 5. `src/commands/onboard-types.ts`

Añadir al tipo `AuthChoice`:

```typescript
export type AuthChoice =
  // ... existing choices
  "kilocode-api-key";
// ...
```

Añadir a `OnboardOptions`:

```typescript
export type OnboardOptions = {
  // ... existing options
  kilocodeApiKey?: string;
  // ...
};
```

#### 6. `src/commands/auth-choice-options.ts`

Añadir a `AuthChoiceGroupId`:

```typescript
export type AuthChoiceGroupId =
  // ... existing groups
  "kilocode";
// ...
```

Añadir a `AUTH_CHOICE_GROUP_DEFS`:

```typescript
{
  value: "kilocode",
  label: "Kilo Gateway",
  hint: "API key (OpenRouter-compatible)",
  choices: ["kilocode-api-key"],
},
```

Añadir a `buildAuthChoiceOptions()`:

```typescript
options.push({
  value: "kilocode-api-key",
  label: "Kilo Gateway API key",
  hint: "OpenRouter-compatible gateway",
});
```

#### 7. `src/commands/auth-choice.preferred-provider.ts`

Añadir mapeo:

```typescript
const PREFERRED_PROVIDER_BY_AUTH_CHOICE: Partial<Record<AuthChoice, string>> = {
  // ... existing mappings
  "kilocode-api-key": "kilocode",
};
```

### Aplicación de Elección de Autenticación

#### 8. `src/commands/auth-choice.apply.api-providers.ts`

Añadir importación:

```typescript
import {
  // ... existing imports
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.js";
```

Añadir manejo para `kilocode-api-key`:

```typescript
if (authChoice === "kilocode-api-key") {
  const store = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  const profileOrder = resolveAuthProfileOrder({
    cfg: nextConfig,
    store,
    provider: "kilocode",
  });
  const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
  const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
  let profileId = "kilocode:default";
  let mode: "api_key" | "oauth" | "token" = "api_key";
  let hasCredential = false;

  if (existingProfileId && existingCred?.type) {
    profileId = existingProfileId;
    mode =
      existingCred.type === "oauth" ? "oauth" : existingCred.type === "token" ? "token" : "api_key";
    hasCredential = true;
  }

  if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "kilocode") {
    await setKilocodeApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
    hasCredential = true;
  }

  if (!hasCredential) {
    const envKey = resolveEnvApiKey("kilocode");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing KILOCODE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setKilocodeApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
  }

  if (!hasCredential) {
    const key = await params.prompter.text({
      message: "Enter Kilo Gateway API key",
      validate: validateApiKeyInput,
    });
    await setKilocodeApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    hasCredential = true;
  }

  if (hasCredential) {
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId,
      provider: "kilocode",
      mode,
    });
  }
  {
    const applied = await applyDefaultModelChoice({
      config: nextConfig,
      setDefaultModel: params.setDefaultModel,
      defaultModel: KILOCODE_DEFAULT_MODEL_REF,
      applyDefaultConfig: applyKilocodeConfig,
      applyProviderConfig: applyKilocodeProviderConfig,
      noteDefault: KILOCODE_DEFAULT_MODEL_REF,
      noteAgentModel,
      prompter: params.prompter,
    });
    nextConfig = applied.config;
    agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
  }
  return { config: nextConfig, agentModelOverride };
}
```

También añadir el mapeo de tokenProvider en la parte superior de la función:

```typescript
if (params.opts.tokenProvider === "kilocode") {
  authChoice = "kilocode-api-key";
}
```

### Registro de CLI

#### 9. `src/cli/program/register.onboard.ts`

Añadir opción de CLI:

```typescript
.option("--kilocode-api-key <key>", "Kilo Gateway API key")
```

Añadir al manejador de acciones:

```typescript
kilocodeApiKey: opts.kilocodeApiKey as string | undefined,
```

Actualizar el texto de ayuda de auth-choice:

```typescript
.option(
  "--auth-choice <choice>",
  "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|kilocode-api-key|ai-gateway-api-key|...",
)
```

### Incorporación No Interactiva

#### 10. `src/commands/onboard-non-interactive/local/auth-choice.ts`

Añadir manejo para `kilocode-api-key`:

```typescript
if (authChoice === "kilocode-api-key") {
  const resolved = await resolveNonInteractiveApiKey({
    provider: "kilocode",
    cfg: baseConfig,
    flagValue: opts.kilocodeApiKey,
    flagName: "--kilocode-api-key",
    envVar: "KILOCODE_API_KEY",
  });
  await setKilocodeApiKey(resolved.apiKey, agentDir);
  nextConfig = applyAuthProfileConfig(nextConfig, {
    profileId: "kilocode:default",
    provider: "kilocode",
    mode: "api_key",
  });
  // ... apply default model
}
```

### Actualizaciones de Exportación

#### 11. `src/commands/onboard-auth.ts`

Añadir exportaciones:

```typescript
export {
  // ... existing exports
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_BASE_URL,
} from "./onboard-auth.config-core.js";

export {
  // ... existing exports
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.credentials.js";
```

### Manejo Especial (Opcional)

#### 12. `src/agents/pi-embedded-runner/cache-ttl.ts`

Añadir soporte para Kilo Gateway para modelos de Anthropic:

```typescript
export function isCacheTtlEligibleProvider(provider: string, modelId: string): boolean {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModelId = modelId.toLowerCase();
  if (normalizedProvider === "anthropic") return true;
  if (normalizedProvider === "openrouter" && normalizedModelId.startsWith("anthropic/"))
    return true;
  if (normalizedProvider === "kilocode" && normalizedModelId.startsWith("anthropic/")) return true;
  return false;
}
```

#### 13. `src/agents/transcript-policy.ts`

Añadir manejo de Kilo Gateway (similar a OpenRouter):

```typescript
const isKilocodeGemini = provider === "kilocode" && modelId.toLowerCase().includes("gemini");

// Include in needsNonImageSanitize check
const needsNonImageSanitize =
  isGoogle || isAnthropic || isMistral || isOpenRouterGemini || isKilocodeGemini;
```

## Estructura de Configuración

### Ejemplo de Configuración de Usuario

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "kilocode": {
        "baseUrl": "https://api.kilo.ai/api/gateway/",
        "apiKey": "xxxxx",
        "api": "openai-completions",
        "models": [
          {
            "id": "anthropic/claude-opus-4.6",
            "name": "Anthropic: Claude Opus 4.6"
          },
          { "id": "minimax/minimax-m2.5:free", "name": "Minimax: Minimax M2.5" }
        ]
      }
    }
  }
}
```

### Estructura del Perfil de Autenticación

```json
{
  "profiles": {
    "kilocode:default": {
      "type": "api_key",
      "provider": "kilocode",
      "key": "xxxxx"
    }
  }
}
```

## Consideraciones de Pruebas

1. **Pruebas Unitarias:**
   - Probar que `setKilocodeApiKey()` escribe el perfil correcto
   - Probar que `applyKilocodeConfig()` establece los valores predeterminados correctos
   - Probar que `resolveEnvApiKey("kilocode")` devuelve la variable de entorno correcta

2. **Pruebas de Integración:**
   - Probar el flujo de incorporación con `--auth-choice kilocode-api-key`
   - Probar la incorporación no interactiva con `--kilocode-api-key`
   - Probar la selección de modelos con el prefijo `kilocode/`

3. **Pruebas E2E:**
   - Probar las llamadas reales a la API a través de Kilo Gateway (pruebas en vivo)

## Notas de Migración

- No se necesita migración para los usuarios existentes
- Los nuevos usuarios pueden usar inmediatamente la elección de autenticación `kilocode-api-key`
- La configuración manual existente con el proveedor `kilocode` seguirá funcionando

## Consideraciones Futuras

1. **Catálogo de Modelos:** Si Kilo Gateway expone un endpoint `/models`, añada soporte de escaneo similar a `scanOpenRouterModels()`

2. **Soporte OAuth:** Si Kilo Gateway añade OAuth, extienda el sistema de autenticación consecuentemente

3. **Limitación de Tasa:** Considere añadir manejo de límites de tasa específico para Kilo Gateway si es necesario

4. **Documentación:** Añada documentación en `docs/providers/kilocode.md` explicando la configuración y el uso

## Resumen de Cambios

| Archivo                                                     | Tipo de Cambio | Descripción                                                                      |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `src/commands/onboard-auth.credentials.ts`                  | Añadir         | `KILOCODE_DEFAULT_MODEL_REF`, `setKilocodeApiKey()`                              |
| `src/agents/model-auth.ts`                                  | Modificar      | Añadir `kilocode` a `envMap`                                                     |
| `src/config/io.ts`                                          | Modificar      | Añadir `KILOCODE_API_KEY` a las claves de entorno de shell                       |
| `src/commands/onboard-auth.config-core.ts`                  | Añadir         | `applyKilocodeProviderConfig()`, `applyKilocodeConfig()`                         |
| `src/commands/onboard-types.ts`                             | Modificar      | Añadir `kilocode-api-key` a `AuthChoice`, añadir `kilocodeApiKey` a las opciones |
| `src/commands/auth-choice-options.ts`                       | Modificar      | Añadir grupo y opción de `kilocode`                                              |
| `src/commands/auth-choice.preferred-provider.ts`            | Modificar      | Añadir mapeo de `kilocode-api-key`                                               |
| `src/commands/auth-choice.apply.api-providers.ts`           | Modificar      | Añadir manejo de `kilocode-api-key`                                              |
| `src/cli/program/register.onboard.ts`                       | Modificar      | Añadir opción `--kilocode-api-key`                                               |
| `src/commands/onboard-non-interactive/local/auth-choice.ts` | Modificar      | Añadir manejo no interactivo                                                     |
| `src/commands/onboard-auth.ts`                              | Modificar      | Exportar nuevas funciones                                                        |
| `src/agents/pi-embedded-runner/cache-ttl.ts`                | Modificar      | Añadir soporte para kilocode                                                     |
| `src/agents/transcript-policy.ts`                           | Modificar      | Añadir manejo de Gemini para kilocode                                            |

import es from "/components/footer/es.mdx";

<es />
