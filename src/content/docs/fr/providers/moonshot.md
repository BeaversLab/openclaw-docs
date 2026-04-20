---
summary: "Configurer Moonshot K2 vs Kimi Coding (fournisseurs + clés séparés)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot IA"
---

# Moonshot AI (Kimi)

Moonshot fournit l'API Kimi avec des points de terminaison compatibles API. Configurez le fournisseur et définissez le modèle par défaut sur `moonshot/kimi-k2.5`, ou utilisez Kimi Coding avec `kimi/kimi-code`.

<Warning>Moonshot et Kimi Coding sont des **fournisseurs distincts**. Les clés ne sont pas interchangeables, les points de terminaison diffèrent et les références de modèle diffèrent (`moonshot/...` vs `kimi/...`).</Warning>

## Catalogue de modèles intégré

[//]: # "moonshot-kimi-k2-ids:start"

| Réf. modèle                       | Nom                    | Raisonnement | Entrée       | Contexte | Sortie max. |
| --------------------------------- | ---------------------- | ------------ | ------------ | -------- | ----------- |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | Non          | texte, image | 262,144  | 262,144     |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | Oui          | texte        | 262,144  | 262,144     |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | Oui          | texte        | 262,144  | 262,144     |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | Non          | texte        | 256,000  | 16,384      |

[//]: # "moonshot-kimi-k2-ids:end"

## Getting started

Choisissez votre fournisseur et suivez les étapes de configuration.

<Tabs>
  <Tab title="Moonshot API">
    **Idéal pour :** Modèles Kimi K2 via la Moonshot Open Platform.

    <Steps>
      <Step title="Choisissez votre région de point de terminaison">
        | Choix d'authentification            | Point de terminaison                       | Région        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | International |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | Chine         |
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        Ou pour le point de terminaison Chine :

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="Définir un modèle par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.5" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier la disponibilité des modèles">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
    </Steps>

    ### Exemple de configuration

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

  </Tab>

  <Tab title="Kimi Coding">
    **Idéal pour :** tâches axées sur le code via le point de terminaison Kimi Coding.

    <Note>
    Kimi Coding utilise une clé d'API et un préfixe de fournisseur (`kimi/...`) différents de ceux de Moonshot (`moonshot/...`). L'identifiant de modèle obsolète `kimi/k2p5` reste accepté comme identifiant de compatibilité.
    </Note>

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step title="Set a default model">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "kimi/kimi-code" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    ### Config example

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

  </Tab>
</Tabs>

## Recherche web Kimi

OpenClaw fournit également **Kimi** en tant que fournisseur `web_search`, soutenu par la recherche web Moonshot.

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    Choisissez **Kimi** dans la section de recherche web pour stocker
    `plugins.entries.moonshot.config.webSearch.*`.

  </Step>
  <Step title="Configure the web search region and model">
    L'configuration interactive demande :

    | Paramètre             | Options                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | Région de l'API          | `https://api.moonshot.ai/v1` (international) ou `https://api.moonshot.cn/v1` (Chine) |
    | Modèle de recherche web    | Par défaut, `kimi-k2.5`                                             |

  </Step>
</Steps>

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

## Avancé

<AccordionGroup>
  <Accordion title="Mode de réflexion natif">
    Moonshot Kimi prend en charge la réflexion native binaire :

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

    | Niveau `/think`       | Comportement Moonshot          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | Tout niveau autre que off    | `thinking.type=enabled`    |

    <Warning>
    Lorsque la réflexion Moonshot est activée, `tool_choice` doit être `auto` ou `none`. OpenClaw normalise les valeurs `tool_choice` incompatibles à `auto` pour la compatibilité.
    </Warning>

  </Accordion>

<Accordion title="Compatibilité de l'utilisation en streaming">
  Les points de terminaison natifs Moonshot (`https://api.moonshot.ai/v1` et `https://api.moonshot.cn/v1`) annoncent une compatibilité d'utilisation en streaming sur le transport partagé `openai-completions`. OpenClaw désactive les capacités des points de terminaison, de sorte que les ids de fournisseurs personnalisés compatibles ciblant les mêmes hôtes natifs Moonshot héritent du même
  comportement d'utilisation en streaming.
</Accordion>

  <Accordion title="Référence de point de terminaison et de modèle">
    | Fournisseur   | Préfixe de référence de modèle | Point de terminaison                      | Variable d'env d'auth        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Point de terminaison Kimi Coding          | `KIMI_API_KEY`      |
    | Recherche Web | N/A              | Identique à la région de l'Moonshot API   | `KIMI_API_KEY` ou `MOONSHOT_API_KEY` |

    - La recherche web Kimi utilise `KIMI_API_KEY` ou `MOONSHOT_API_KEY`, et utilise par défaut `https://api.moonshot.ai/v1` avec le modèle `kimi-k2.5`.
    - Remplacez les métadonnées de tarification et de contexte dans `models.providers` si nécessaire.
    - Si Moonshot publie des limites de contexte différentes pour un modèle, ajustez `contextWindow` en conséquence.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Recherche Web" href="/fr/tools/web-search" icon="magnifying-glass">
    Configuration des fournisseurs de recherche Web, y compris Kimi.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet pour les fournisseurs, les modèles et les plugins.
  </Card>
  <Card title="Plateforme ouverte Moonshot" href="https://platform.moonshot.ai" icon="globe">
    Gestion des clés Moonshot API et documentation.
  </Card>
</CardGroup>
