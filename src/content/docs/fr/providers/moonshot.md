---
summary: "Configurer Moonshot K2 vs Kimi Coding (providers et clés distincts)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot IA"
---

Moonshot fournit l'API Kimi avec des points de terminaison compatibles OpenAI. Configurez le provider et définissez le model par défaut sur `moonshot/kimi-k2.6`, ou utilisez Kimi Coding avec `kimi/kimi-code`.

<Warning>Moonshot et Kimi Coding sont des **providers distincts**. Les clés ne sont pas interchangeables, les points de terminaison diffèrent et les références de model diffèrent (`moonshot/...` contre `kimi/...`).</Warning>

## Catalogue de modèles intégré

[//]: # "moonshot-kimi-k2-ids:start"

| Réf. de modèle                    | Nom                    | Raisonnement | Entrée       | Contexte | Sortie max |
| --------------------------------- | ---------------------- | ------------ | ------------ | -------- | ---------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | Non          | texte, image | 262 144  | 262,144    |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | Non          | texte, image | 262 144  | 262,144    |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | Oui          | texte        | 262 144  | 262,144    |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | Oui          | texte        | 262 144  | 262 144    |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | Non          | texte        | 256 000  | 16 384     |

[//]: # "moonshot-kimi-k2-ids:end"

Les estimations de coûts groupés pour les modèles K2 actuels hébergés par Moonshot utilisent les tarifs publiés au paiement à l'usage de Moonshot : Kimi K2.6 est à 0,16 $/MTok en cas de succès de cache, 0,95 $/MTok en entrée et 4,00 $/MTok en sortie ; Kimi K2.5 est à 0,10 $/MTok en cas de succès de cache, 0,60 $/MTok en entrée et 3,00 $/MTok en sortie. Les autres entrées de catalogue héritées conservent des espaces réservés de coût nul, sauf si vous les remplacez dans la configuration.

## Getting started

Choisissez votre provider et suivez les étapes de configuration.

<Tabs>
  <Tab title="API Moonshot">
    **Idéal pour :** Les modèles Kimi K2 via la Plateforme Ouverte Moonshot.

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
              model: { primary: "moonshot/kimi-k2.6" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier que les modèles sont disponibles">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step title="Exécuter un test de fumée en direct">
        Utilisez un répertoire d'état isolé lorsque vous souhaitez vérifier l'accès au modèle et le suivi des coûts
        sans toucher à vos sessions normales :

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        La réponse JSON doit indiquer `provider: "moonshot"` et
        `model: "kimi-k2.6"`. L'entrée de transcript de l'assistant stocke l'utilisation normalisée
        des jetons ainsi que le coût estimé sous `usage.cost` lorsque Moonshot renvoie
        des métadonnées d'utilisation.
      </Step>
    </Steps>

    ### Exemple de configuration

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.6": { alias: "Kimi K2.6" },
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
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0 },
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
    **Idéal pour :** les tâches axées sur le code via le point de terminaison Kimi Coding.

    <Note>
    Kimi Coding utilise une clé API et un préfixe de fournisseur (`kimi/...`) différents de ceux de Moonshot (`moonshot/...`). La référence de modèle obsolète `kimi/k2p5` reste acceptée comme identifiant de compatibilité.
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

OpenClaw fournit également **Kimi** en tant que fournisseur `web_search`, soutenu par la recherche web
Moonshot.

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    Choisissez **Kimi** dans la section de recherche web pour stocker
    `plugins.entries.moonshot.config.webSearch.*`.

  </Step>
  <Step title="Configure the web search region and model">
    La configuration interactive demande :

    | Paramètre             | Options                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | Région API          | `https://api.moonshot.ai/v1` (international) ou `https://api.moonshot.cn/v1` (Chine) |
    | Modèle de recherche web    | Par défaut `kimi-k2.6`                                             |

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
            model: "kimi-k2.6",
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

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode de pensée natif">
    Moonshot Kimi prend en charge la pensée native binaire :

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    Configurez-la par modèle via `agents.defaults.models.<provider/model>.params` :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
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
    | Tout niveau non désactivé    | `thinking.type=enabled`    |

    <Warning>
    Lorsque la pensée Moonshot est activée, `tool_choice` doit être `auto` ou `none`. OpenClaw normalise les valeurs `tool_choice` incompatibles en `auto` pour la compatibilité.
    </Warning>

    Kimi K2.6 accepte également un champ optionnel `thinking.keep` qui contrôle
    la rétention multi-tours de `reasoning_content`. Réglez-le sur `"all"` pour conserver le
    raisonnement complet sur plusieurs tours ; omettez-le (ou laissez-le `null`) pour utiliser la stratégie
    par défaut du serveur. OpenClaw ne transmet `thinking.keep` que pour
    `moonshot/kimi-k2.6` et le supprime des autres modèles.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "enabled", keep: "all" },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Assainissement de l'ID d'appel d'outil">
    Moonshot Kimi sert des ids tool_call de la forme `functions.<name>:<index>`. OpenClaw les conserve inchangés pour que les appels d'outils multi-tours continuent de fonctionner.

    Pour forcer une désinfection stricte sur un provider personnalisé compatible OpenAI, définissez `sanitizeToolCallIds: true` :

    ```json5
    {
      models: {
        providers: {
          "my-kimi-proxy": {
            api: "openai-completions",
            sanitizeToolCallIds: true,
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Compatibilité de l'utilisation en streaming">
    Les points de terminaison natifs Moonshot (`https://api.moonshot.ai/v1` et
    `https://api.moonshot.cn/v1`) annoncent une compatibilité de l'utilisation en streaming sur le
    transport partagé `openai-completions`. Les clés OpenClaw désactivent les
    capacités des points de terminaison, donc les ID de fournisseurs personnalisés compatibles ciblant les mêmes hôtes natifs
    Moonshot héritent du même comportement d'utilisation en streaming.

    Avec la tarification groupée K2.6, l'utilisation en streaming qui inclut les jetons d'entrée, de sortie
    et de lecture du cache est également convertie en coût USD estimé localement pour
    `/status`, `/usage full`, `/usage cost`, et la comptabilité de session
    basée sur des transcriptions.

  </Accordion>

  <Accordion title="Référence du point de terminaison et du modèle">
    | Fournisseur   | Préfixe de référence du modèle | Point de terminaison                      | Variable env d'auth        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Point de terminaison Kimi Coding          | `KIMI_API_KEY`      |
    | Recherche web | N/A              | Identique à la région de l'Moonshot API   | `KIMI_API_KEY` ou `MOONSHOT_API_KEY` |

    - La recherche web Kimi utilise `KIMI_API_KEY` ou `MOONSHOT_API_KEY`, et par défaut `https://api.moonshot.ai/v1` avec le modèle `kimi-k2.6`.
    - Remplacez la tarification et les métadonnées de contexte dans `models.providers` si nécessaire.
    - Si Moonshot publie des limites de contexte différentes pour un modèle, ajustez `contextWindow` en conséquence.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Recherche Web" href="/fr/tools/web" icon="magnifying-glass">
    Configuration des fournisseurs de recherche Web, y compris Kimi.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet pour les fournisseurs, les modèles et les plugins.
  </Card>
  <Card title="Moonshot Open Platform" href="https://platform.moonshot.ai" icon="globe">
    Gestion des clés API Moonshot et documentation.
  </Card>
</CardGroup>
