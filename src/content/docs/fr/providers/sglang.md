---
summary: "Exécuter OpenClaw avec SGLang (serveur auto-hébergé compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang peut servir des modèles open source via une API HTTP **compatible OpenAI**.
API peut se connecter à SGLang en utilisant l'OpenClaw `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles depuis SGLang lorsque vous activez
l'option avec `SGLANG_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification)
et que vous ne définissez pas d'entrée `models.providers.sglang` explicite.

## Getting started

<Steps>
  <Step title="Démarrer SGLang">
    Lancez SGLang avec un serveur compatible OpenAI. Votre URL de base doit exposer
    des points de terminaison `/v1` (par exemple `/v1/models`, `/v1/chat/completions`). SGLang
    fonctionne généralement sur :

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="Définir une clé d'API">
    N'importe quelle valeur fonctionne si aucune authentification n'est configurée sur votre serveur :

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="Exécuter l'onboarding ou définir un modèle directement">
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

## Découverte de modèles (provider implicite)

Lorsque `SGLANG_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne**
définissez **pas** `models.providers.sglang`, OpenClaw interrogera :

- `GET http://127.0.0.1:30000/v1/models`

et convertira les ID renvoyés en entrées de modèle.

<Note>Si vous définissez `models.providers.sglang` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement.</Note>

## Configuration explicite (modèles manuels)

Utilisez une configuration explicite lorsque :

- SGLang fonctionne sur un hôte/port différent.
- Vous souhaitez épingler les valeurs `contextWindow`/`maxTokens`.
- Votre serveur nécessite une vraie clé API (ou vous souhaitez contrôler les en-têtes).

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
  <Accordion title="Comportement de type proxy">
    SGLang est traité comme un backend OpenAI-compatible de type proxy `/v1`, et non comme
    un point de terminaison natif OpenAI.

    | Comportement | SGLang |
    |----------|--------|
    | Mise en forme des requêtes exclusivement OpenAI | Non appliquée |
    | `service_tier`, Réponses `store`, indices de cache de prompt | Non envoyés |
    | Mise en forme des charges utiles compatibles avec le raisonnement | Non appliquée |
    | En-têtes d'attribution masqués (`originator`, `version`, `User-Agent`) | Non injectés sur les URL de base SGLang personnalisées |

  </Accordion>

  <Accordion title="Dépannage">
    **Serveur inaccessible**

    Vérifiez que le serveur est en cours d'exécution et répond :

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **Erreurs d'authentification**

    Si les demandes échouent avec des erreurs d'authentification, définissez une vraie valeur `SGLANG_API_KEY` qui correspond
    à la configuration de votre serveur, ou configurez le fournisseur explicitement sous
    `models.providers.sglang`.

    <Tip>
    Si vous exécutez SGLang sans authentification, toute valeur non vide pour
    `SGLANG_API_KEY` suffit pour activer la découverte de modèles.
    </Tip>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet, y compris les entrées du fournisseur.
  </Card>
</CardGroup>
