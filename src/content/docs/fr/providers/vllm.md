---
summary: "Exécuter OpenClaw avec vLLM (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM peut servir des modèles open source (et certains personnalisés) via une OpenAI HTTP compatible **OpenAI**. API se connecte à vLLM en utilisant l'OpenClaw `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles auprès de vLLM lorsque vous activez l'option avec `VLLM_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification) et que vous ne définissez pas d'entrée `models.providers.vllm` explicite.

| Propriété              | Valeur                                   |
| ---------------------- | ---------------------------------------- |
| ID du fournisseur      | `vllm`                                   |
| API                    | `openai-completions` (compatible OpenAI) |
| Auth                   | Variable d'environnement `VLLM_API_KEY`  |
| URL de base par défaut | `http://127.0.0.1:8000/v1`               |

## Getting started

<Steps>
  <Step title="Démarrer vLLM avec un serveur compatible OpenAI">
    Votre URL de base doit exposer des points de terminaison `/v1` (p. ex. `/v1/models`, `/v1/chat/completions`). vLLM s'exécute généralement sur :

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="Définir la variable d'environnement de la clé d'API">
    N'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification :

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="Sélectionner un modèle">
    Remplacez par l'un de vos ID de modèle vLLM :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="Vérifiez que le modèle est disponible">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## Découverte de modèle (fournisseur implicite)

Lorsque `VLLM_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne définissez pas** `models.providers.vllm`, OpenClaw interroge :

```
GET http://127.0.0.1:8000/v1/models
```

et convertit les ID renvoyés en entrées de modèle.

<Note>Si vous définissez `models.providers.vllm` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement.</Note>

## Configuration explicite (modèles manuels)

Utilisez une configuration explicite lorsque :

- vLLM s'exécute sur un hôte ou un port différent
- Vous souhaitez épingler les valeurs `contextWindow` ou `maxTokens`
- Votre serveur nécessite une vraie clé API (ou vous souhaitez contrôler les en-têtes)

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
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

## Notes avancées

<AccordionGroup>
  <Accordion title="Comportement de type proxy">
    vLLM est traité comme un backend OpenAI compatible de type proxy `/v1`, et non comme un point de terminaison natif
    OpenAI. Cela signifie :

    | Comportement | Appliqué ? |
    |----------|----------|
    | Formatage des requêtes natives OpenAI | Non |
    | `service_tier` | Non envoyé |
    | Réponses `store` | Non envoyées |
    | Indicateurs de cache de prompt (Prompt-cache hints) | Non envoyés |
    | Formatage de la charge utile de compatibilité de raisonnement OpenAI | Non appliqué |
    | En-têtes d'attribution OpenClaw masqués | Non injectés sur les URL de base personnalisées |

  </Accordion>

  <Accordion title="URL de base personnalisée">
    Si votre serveur vLLM fonctionne sur un hôte ou un port non défini par défaut, définissez `baseUrl` dans la configuration explicite du fournisseur :

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="Serveur injoignable">
    Vérifiez que le serveur vLLM est en cours d'exécution et accessible :

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si vous voyez une erreur de connexion, vérifiez l'hôte, le port et que vLLM a démarré avec le mode serveur compatible OpenAI.

  </Accordion>

  <Accordion title="Erreurs d'auth sur les requêtes">
    Si les requêtes échouent avec des erreurs d'authentification, définissez une vraie `VLLM_API_KEY` correspondant à la configuration de votre serveur, ou configurez le fournisseur explicitement sous `models.providers.vllm`.

    <Tip>
    Si votre serveur vLLM n'applique pas l'authentification, toute valeur non vide pour `VLLM_API_KEY` fonctionne comme un signal d'acceptation pour OpenClaw.
    </Tip>

  </Accordion>

  <Accordion title="Aucun modèle découvert">
    La découverte automatique nécessite que `VLLM_API_KEY` soit défini **et** qu'il n'y ait aucune entrée de configuration explicite `models.providers.vllm`. Si vous avez défini le fournisseur manuellement, OpenClaw ignore la découverte et utilise uniquement vos modèles déclarés.
  </Accordion>
</AccordionGroup>

<Warning>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="OpenAI" href="/fr/providers/openai" icon="bolt">
    Provider natif OpenAI et comportement des routes compatibles OpenAI.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des informations d'identification.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
