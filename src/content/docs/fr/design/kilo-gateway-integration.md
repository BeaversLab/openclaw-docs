---
title: "Kilo Gateway Provider Integration Design"
---

# Kilo Gateway Provider Integration Design

## Overview

This document outlines the design for integrating "Kilo Gateway" as a first-class provider in OpenClaw, modeled after the existing OpenRouter implementation. Kilo Gateway uses an OpenAI-compatible completions API with a different base URL.

## Design Decisions

### 1. Provider Naming

**Recommendation: `kilocode`**

Rationale:

- Matches the user config example provided (`kilocode` provider key)
- Consistent with existing provider naming patterns (e.g., `openrouter`, `opencode`, `moonshot`)
- Short and memorable
- Avoids confusion with generic "kilo" or "gateway" terms

Alternative considérée : `kilo-gateway` - rejeté car les noms avec trait d'union sont moins courants dans la base de code et `kilocode` est plus concis.

### 2. Référence de model par défaut

**Recommandation : `kilocode/anthropic/claude-opus-4.6`**

Justification :

- Basé sur l'exemple de configuration utilisateur
- Claude Opus 4.5 est un model par défaut performant
- La sélection explicite du model évite de dépendre de l'acheminement automatique

### 3. Configuration de l'URL de base

**Recommandation : Valeur par défaut codée en dur avec possibilité de substitution par la configuration**

- **URL de base par défaut :** `https://api.kilo.ai/api/gateway/`
- **Configurable :** Oui, via `models.providers.kilocode.baseUrl`

Cela correspond au modèle utilisé par d'autres fournisseurs comme Moonshot, Venice et Synthetic.

### 4. Analyse des models

**Recommandation : Aucun point de terminaison dédié à l'analyse des models initialement**

Justification :

- Kilo Gateway agit comme un proxy vers OpenRouter, donc les models sont dynamiques
- Les utilisateurs peuvent configurer manuellement les modèles dans leur configuration
- Si Kilo Gateway expose un point de terminaison `/models` à l'avenir, l'analyse peut être ajoutée

### 5. Gestion spéciale

**Recommandation : Hériter du comportement OpenRouter pour les modèles Anthropic**

Puisque Kilo Gateway agit comme un proxy vers OpenRouter, la même gestion spéciale doit s'appliquer :

- Éligibilité au TTL du cache pour les modèles `anthropic/*`
- Paramètres supplémentaires (cacheControlTtl) pour les modèles `anthropic/*`
- La stratégie de transcription suit les modèles OpenRouter

## Fichiers à modifier

### Gestion centrale des identifiants

#### 1. `src/commands/onboard-auth.credentials.ts`

Ajouter :

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

Ajouter à `envMap` dans `resolveEnvApiKey()` :

```typescript
const envMap: Record<string, string> = {
  // ... existing entries
  kilocode: "KILOCODE_API_KEY",
};
```

#### 3. `src/config/io.ts`

Ajouter à `SHELL_ENV_EXPECTED_KEYS` :

```typescript
const SHELL_ENV_EXPECTED_KEYS = [
  // ... existing entries
  "KILOCODE_API_KEY",
];
```

### Application de configuration

#### 4. `src/commands/onboard-auth.config-core.ts`

Ajouter de nouvelles fonctions :

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
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<string, unknown> as { apiKey?: string };
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

### Système de choix d'authentification

#### 5. `src/commands/onboard-types.ts`

Ajouter au type `AuthChoice` :

```typescript
export type AuthChoice =
  // ... existing choices
  "kilocode-api-key";
// ...
```

Ajouter à `OnboardOptions` :

```typescript
export type OnboardOptions = {
  // ... existing options
  kilocodeApiKey?: string;
  // ...
};
```

#### 6. `src/commands/auth-choice-options.ts`

Ajouter à `AuthChoiceGroupId` :

```typescript
export type AuthChoiceGroupId =
  // ... existing groups
  "kilocode";
// ...
```

Ajouter à `AUTH_CHOICE_GROUP_DEFS` :

```typescript
{
  value: "kilocode",
  label: "Kilo Gateway",
  hint: "API key (OpenRouter-compatible)",
  choices: ["kilocode-api-key"],
},
```

Ajouter à `buildAuthChoiceOptions()` :

```typescript
options.push({
  value: "kilocode-api-key",
  label: "Kilo Gateway API key",
  hint: "OpenRouter-compatible gateway",
});
```

#### 7. `src/commands/auth-choice.preferred-provider.ts`

Ajouter le mappage :

```typescript
const PREFERRED_PROVIDER_BY_AUTH_CHOICE: Partial<Record<AuthChoice, string>> = {
  // ... existing mappings
  "kilocode-api-key": "kilocode",
};
```

### Application du choix d'authentification

#### 8. `src/commands/auth-choice.apply.api-providers.ts`

Ajouter l'import :

```typescript
import {
  // ... existing imports
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.js";
```

Ajouter la gestion pour `kilocode-api-key` :

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
    mode = existingCred.type === "oauth" ? "oauth" : existingCred.type === "token" ? "token" : "api_key";
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

Ajouter également le mappage tokenProvider en haut de la fonction :

```typescript
if (params.opts.tokenProvider === "kilocode") {
  authChoice = "kilocode-api-key";
}
```

### CLI Registration

#### 9. `src/cli/program/register.onboard.ts`

Ajouter l'option CLI :

```typescript
.option("--kilocode-api-key <key>", "Kilo Gateway API key")
```

Ajouter au gestionnaire d'action :

```typescript
kilocodeApiKey: opts.kilocodeApiKey as string | undefined,
```

Mettre à jour le texte d'aide auth-choice :

```typescript
.option(
  "--auth-choice <choice>",
  "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|kilocode-api-key|ai-gateway-api-key|...",
)
```

### Onboarding non interactif

#### 10. `src/commands/onboard-non-interactive/local/auth-choice.ts`

Ajouter la gestion pour `kilocode-api-key` :

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

### Mises à jour des exportations

#### 11. `src/commands/onboard-auth.ts`

Ajouter les exportations :

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

### Gestion spéciale (Facultatif)

#### 12. `src/agents/pi-embedded-runner/cache-ttl.ts`

Ajouter la prise en charge de Kilo Gateway pour les modèles Anthropic :

```typescript
export function isCacheTtlEligibleProvider(provider: string, modelId: string): boolean {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModelId = modelId.toLowerCase();
  if (normalizedProvider === "anthropic") return true;
  if (normalizedProvider === "openrouter" && normalizedModelId.startsWith("anthropic/")) return true;
  if (normalizedProvider === "kilocode" && normalizedModelId.startsWith("anthropic/")) return true;
  return false;
}
```

#### 13. `src/agents/transcript-policy.ts`

Ajouter la gestion de Kilo Gateway (similaire à OpenRouter) :

```typescript
const isKilocodeGemini = provider === "kilocode" && modelId.toLowerCase().includes("gemini");

// Include in needsNonImageSanitize check
const needsNonImageSanitize = isGoogle || isAnthropic || isMistral || isOpenRouterGemini || isKilocodeGemini;
```

## Structure de la configuration

### Exemple de configuration utilisateur

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

### Structure du profil d'authentification

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

## Considérations relatives aux tests

1. **Tests unitaires :**
   - Test `setKilocodeApiKey()` écrit le profil correct
   - Test `applyKilocodeConfig()` définit les valeurs par défaut correctes
   - Test `resolveEnvApiKey("kilocode")` renvoie la variable d'environnement correcte

2. **Tests d'intégration :**
   - Test du flux de configuration avec `--auth-choice kilocode-api-key`
   - Test de la configuration non interactive avec `--kilocode-api-key`
   - Test de la sélection du modèle avec le préfixe `kilocode/`

3. **Tests de bout en bout :**
   - Test des appels API réels via Kilo Gateway (tests en direct)

## Notes de migration

- Aucune migration nécessaire pour les utilisateurs existants
- Les nouveaux utilisateurs peuvent immédiatement utiliser le choix d'auth `kilocode-api-key`
- La configuration manuelle existante avec le provider `kilocode` continuera à fonctionner

## Considérations futures

1. **Catalogue de modèles :** Si Kilo Gateway expose un point de terminaison `/models`, ajoutez la prise en charge de l'analyse similaire à `scanOpenRouterModels()`

2. **Prise en charge OAuth :** Si Kilo Gateway ajoute OAuth, étendez le système d'authentification en conséquence

3. **Limitation de débit :** Envisagez d'ajouter une gestion de la limitation de débit spécifique à Kilo Gateway si nécessaire

4. **Documentation :** Ajoutez des docs à `docs/providers/kilocode.md` expliquant la configuration et l'utilisation

## Résumé des modifications

| Fichier                                                     | Type de modification | Description                                                                     |
| ----------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `src/commands/onboard-auth.credentials.ts`                  | Ajouter              | `KILOCODE_DEFAULT_MODEL_REF`, `setKilocodeApiKey()`                             |
| `src/agents/model-auth.ts`                                  | Modifier             | Ajouter `kilocode` à `envMap`                                                   |
| `src/config/io.ts`                                          | Modifier             | Ajouter `KILOCODE_API_KEY` aux clés d'environnement du shell                    |
| `src/commands/onboard-auth.config-core.ts`                  | Ajouter              | `applyKilocodeProviderConfig()`, `applyKilocodeConfig()`                        |
| `src/commands/onboard-types.ts`                             | Modifier             | Ajouter `kilocode-api-key` à `AuthChoice`, ajouter `kilocodeApiKey` aux options |
| `src/commands/auth-choice-options.ts`                       | Modifier             | Ajouter le groupe et l'option `kilocode`                                        |
| `src/commands/auth-choice.preferred-provider.ts`            | Modifier             | Ajouter le mappage `kilocode-api-key`                                           |
| `src/commands/auth-choice.apply.api-providers.ts`           | Modifier             | Ajouter la gestion de `kilocode-api-key`                                        |
| `src/cli/program/register.onboard.ts`                       | Modifier             | Ajouter l'option `--kilocode-api-key`                                           |
| `src/commands/onboard-non-interactive/local/auth-choice.ts` | Modifier             | Ajouter la gestion non interactive                                              |
| `src/commands/onboard-auth.ts`                              | Modifier             | Exporter les nouvelles fonctions                                                |
| `src/agents/pi-embedded-runner/cache-ttl.ts`                | Modifier             | Ajouter le support de kilocode                                                  |
| `src/agents/transcript-policy.ts`                           | Modifier             | Ajouter la gestion Gemini pour kilocode                                         |
