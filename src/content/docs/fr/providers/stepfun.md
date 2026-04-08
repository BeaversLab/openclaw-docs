---
summary: "Utilisez les modèles StepFun avec OpenClaw"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

# StepFun

OpenClaw comprend un plugin de fournisseur StepFun intégré avec deux identifiants de fournisseur :

- `stepfun` pour le point de terminaison standard
- `stepfun-plan` pour le point de terminaison Step Plan

Les catalogues intégrés diffèrent actuellement selon la surface :

- Standard : `step-3.5-flash`
- Step Plan : `step-3.5-flash`, `step-3.5-flash-2603`

## Présentation des régions et des points de terminaison

- Point de terminaison standard en Chine : `https://api.stepfun.com/v1`
- Point de terminaison standard mondial : `https://api.stepfun.ai/v1`
- Point de terminaison Step Plan en Chine : `https://api.stepfun.com/step_plan/v1`
- Point de terminaison Step Plan mondial : `https://api.stepfun.ai/step_plan/v1`
- Variable d'environnement d'auth : `STEPFUN_API_KEY`

Utilisez une clé Chine avec les points de terminaison `.com` et une clé mondiale avec les points de terminaison `.ai`.

## Configuration CLI

Configuration interactive :

```bash
openclaw onboard
```

Choisissez l'une de ces options d'authentification :

- `stepfun-standard-api-key-cn`
- `stepfun-standard-api-key-intl`
- `stepfun-plan-api-key-cn`
- `stepfun-plan-api-key-intl`

Exemples non interactifs :

```bash
openclaw onboard --auth-choice stepfun-standard-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
openclaw onboard --auth-choice stepfun-plan-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
```

## Références de modèle

- Modèle standard par défaut : `stepfun/step-3.5-flash`
- Modèle Step Plan par défaut : `stepfun-plan/step-3.5-flash`
- Modèle Step Plan alternatif : `stepfun-plan/step-3.5-flash-2603`

## Catalogues intégrés

Standard (`stepfun`) :

| Réf. modèle              | Contexte | Sortie max. | Notes                      |
| ------------------------ | -------- | ----------- | -------------------------- |
| `stepfun/step-3.5-flash` | 262 144  | 65 536      | Modèle standard par défaut |

Step Plan (`stepfun-plan`) :

| Réf. modèle                        | Contexte | Sortie max. | Notes                           |
| ---------------------------------- | -------- | ----------- | ------------------------------- |
| `stepfun-plan/step-3.5-flash`      | 262 144  | 65 536      | Modèle Step Plan par défaut     |
| `stepfun-plan/step-3.5-flash-2603` | 262 144  | 65 536      | Modèle Step Plan supplémentaire |

## Extraits de configuration

Fournisseur standard :

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      stepfun: {
        baseUrl: "https://api.stepfun.ai/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

Fournisseur Step Plan :

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      "stepfun-plan": {
        baseUrl: "https://api.stepfun.ai/step_plan/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
          {
            id: "step-3.5-flash-2603",
            name: "Step 3.5 Flash 2603",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Notes

- Le fournisseur est intégré à OpenClaw ; il n'y a donc pas d'étape d'installation de plugin distincte.
- `step-3.5-flash-2603` est actuellement exposé uniquement sur `stepfun-plan`.
- Un seul flux d'authentification écrit des profils correspondant à la région pour `stepfun` et `stepfun-plan`, permettant ainsi aux deux surfaces d'être découvertes ensemble.
- Utilisez `openclaw models list` et `openclaw models set <provider/model>` pour inspecter ou changer de modèles.
- Pour une vue d'ensemble plus large des providers, consultez [Model providers](/en/concepts/model-providers).
