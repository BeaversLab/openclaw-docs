---
summary: "Configurer Moonshot K2 vs Kimi Coding (fournisseurs et clés distincts)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot fournit l'API Kimi avec des points de terminaison compatibles API. Configurez le fournisseur et définissez le modèle par défaut sur `moonshot/kimi-k2.5`, ou utilisez Kimi Coding avec `kimi/kimi-code`.

IDs actuels des modèles Kimi K2 :

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
# or
openclaw onboard --auth-choice moonshot-api-key-cn
```

Kimi Coding :

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

Remarque : Moonshot et Kimi Coding sont des fournisseurs distincts. Les clés ne sont pas interchangeables, les points de terminaison diffèrent et les références de modèle diffèrent (Moonshot utilise `moonshot/...`, Kimi Coding utilise `kimi/...`).

La recherche web Kimi utilise également le plugin Moonshot :

```bash
openclaw configure --section web
```

Choisissez **Kimi** dans la section de recherche web pour stocker
`plugins.entries.moonshot.config.webSearch.*`.

## Extrait de configuration (API Moonshot)

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
        // moonshot-kimi-k2-aliases:end
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-turbo",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 16384,
          },
          // moonshot-kimi-k2-models:end
        ],
      },
    },
  },
}
```

## Kimi Coding

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi/kimi-code" },
      models: {
        "kimi/kimi-code": { alias: "Kimi" },
      },
    },
  },
}
```

## Recherche web Kimi

OpenClaw fournit également **Kimi** en tant que fournisseur `web_search`, soutenu par la recherche web
Moonshot.

La configuration interactive peut demander :

- la région de l'API Moonshot API :
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- le modèle de recherche web Kimi par défaut (par défaut `kimi-k2.5`)

La configuration se trouve sous `plugins.entries.moonshot.config.webSearch` :

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## Notes

- Les références de modèle Moonshot utilisent `moonshot/<modelId>`. Les références de modèle Kimi Coding utilisent `kimi/<modelId>`.
- La référence de modèle par défaut actuelle de Kimi Coding est `kimi/kimi-code`. L'ancien `kimi/k2p5` reste accepté en tant qu'identifiant de modèle de compatibilité.
- La recherche web Kimi utilise `KIMI_API_KEY` ou `MOONSHOT_API_KEY`, et utilise par défaut `https://api.moonshot.ai/v1` avec le modèle `kimi-k2.5`.
- Les points de terminaison natifs Moonshot (`https://api.moonshot.ai/v1` et
  `https://api.moonshot.cn/v1`) annoncent une compatibilité d'utilisation en streaming sur le
  transport partagé `openai-completions`. OpenClaw se base désormais sur les
  capacités des points de terminaison, de sorte que les identifiants de fournisseur personnalisés compatibles ciblant les mêmes hôtes natifs
  Moonshot héritent du même comportement d'utilisation en streaming.
- Remplacez la tarification et les métadonnées de contexte dans `models.providers` si nécessaire.
- Si Moonshot publie des limites de contexte différentes pour un modèle, ajustez
  `contextWindow` en conséquence.
- Utilisez `https://api.moonshot.ai/v1` pour le point de terminaison international, et `https://api.moonshot.cn/v1` pour le point de terminaison Chine.
- Choix d'intégration :
  - `moonshot-api-key` pour `https://api.moonshot.ai/v1`
  - `moonshot-api-key-cn` pour `https://api.moonshot.cn/v1`

## Mode de réflexion natif (Moonshot)

Kimi de Moonshot prend en charge la réflexion natif binaire :

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

Configurez-le par modèle via `agents.defaults.models.<provider/model>.params` :

```json5
{
  agents: {
    defaults: {
      models: {
        "moonshot/kimi-k2.5": {
          params: {
            thinking: { type: "disabled" },
          },
        },
      },
    },
  },
}
```

OpenClaw mappe également les niveaux d'exécution `/think` pour Moonshot :

- `/think off` -> `thinking.type=disabled`
- tout niveau de réflexion non-off -> `thinking.type=enabled`

Lorsque la réflexion Moonshot est activée, `tool_choice` doit être `auto` ou `none`. OpenClaw normalise les valeurs incompatibles de `tool_choice` à `auto` pour la compatibilité.
