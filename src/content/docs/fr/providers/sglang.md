---
summary: "Exécuter OpenClaw avec SGLang (serveur auto-hébergé compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

SGLang sert des modèles à poids ouverts via une API HTTP compatible OpenAI. OpenClaw se connecte à SGLang en utilisant la famille de fournisseurs OpenAIAPIOpenClaw`openai-completions` avec la découverte automatique des modèles disponibles.

| Propriété                                   | Valeur                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| ID du fournisseur                           | `sglang`                                                                          |
| Plugin                                      | intégré, `enabledByDefault: true`                                                 |
| Variable d'environnement d'authentification | `SGLANG_API_KEY` (toute valeur non vide si le serveur n'a pas d'authentification) |
| Indicateur d'intégration                    | `--auth-choice sglang`                                                            |
| API                                         | Compatible OpenAI (OpenAI`openai-completions`)                                    |
| URL de base par défaut                      | `http://127.0.0.1:30000/v1`                                                       |
| Espace réservé de modèle par défaut         | `sglang/Qwen/Qwen3-8B`                                                            |
| Utilisation en streaming                    | Oui (`supportsStreamingUsage: true`)                                              |
| Tarification                                | Marqué comme externe-gratuit (`modelPricing.external: false`)                     |

OpenClaw **découvre automatiquement** également les modèles disponibles auprès de SGLang lorsque vous activez l'option avec OpenClaw`SGLANG_API_KEY` et que vous ne définissez pas d'entrée `models.providers.sglang` explicite — voir [Découverte de modèles (fournisseur implicite)](#model-discovery-implicit-provider) ci-dessous.

## Getting started

<Steps>
  <Step title="Démarrer SGLang"OpenAI>
    Lancez SGLang avec un serveur compatible OpenAI. Votre URL de base doit exposer
    des points de terminaison `/v1` (par exemple `/v1/models`, `/v1/chat/completions`). SGLang
    s'exécute généralement sur :

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="APIDéfinir une clé API">
    Toute valeur fonctionne si aucune authentification n'est configurée sur votre serveur :

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="Exécuter l'intégration ou définir un modèle directement">
    ```bash
    openclaw onboard
    ```

    Ou configurez le modèle manuellement :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## Model discovery (implicit provider)

Lorsque `SGLANG_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne** définissez
pas `models.providers.sglang`OpenClaw, OpenClaw interrogera :

- `GET http://127.0.0.1:30000/v1/models`

et convertir les ID renvoyés en entrées de model.

<Note>Si vous définissez `models.providers.sglang` explicitement, la découverte automatique est ignorée et vous devez définir les models manuellement.</Note>

## Configuration explicite (models manuels)

Utilisez une configuration explicite lorsque :

- SGLang s'exécute sur un hôte/port différent.
- Vous souhaitez épingler les valeurs `contextWindow`/`maxTokens`.
- Votre serveur nécessite une véritable clé API (ou vous souhaitez contrôler les en-têtes).

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    SGLang est traité comme un backend `/v1` compatible style proxy OpenAI, et non comme
    un point de terminaison natif OpenAI.

    | Comportement | SGLang |
    |----------|--------|
    | Mise en forme des requêtes uniquement OpenAI | Non appliquée |
    | `service_tier`, Responses `store`, prompt-cache hints | Non envoyés |
    | Mise en forme de charge utile compat Raisonnement | Non appliquée |
    | En-têtes d'attribution masqués (`originator`, `version`, `User-Agent`) | Non injectés sur les URL de base SGLang personnalisées |

  </Accordion>

  <Accordion title="Troubleshooting">
    **Serveur inaccessible**

    Vérifiez que le serveur est en cours d'exécution et qu'il répond :

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **Erreurs d'authentification**

    Si les requêtes échouent avec des erreurs d'authentification, définissez une vraie `SGLANG_API_KEY` qui correspond
    à la configuration de votre serveur, ou configurez le provider explicitement sous
    `models.providers.sglang`.

    <Tip>
    Si vous exécutez SGLang sans authentification, toute valeur non vide pour
    `SGLANG_API_KEY` suffit pour activer la découverte de models.
    </Tip>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choisir les providers, les références de models et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les entrées de provider.
  </Card>
</CardGroup>
