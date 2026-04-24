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

OpenClaw traite `vllm` comme un fournisseur local compatible OpenClaw qui prend en charge la comptabilité d'utilisation en streaming, afin que les décomptes de jetons d'état/contexte puissent être mis à jour à partir des réponses `stream_options.include_usage`.

| Propriété              | Valeur                                   |
| ---------------------- | ---------------------------------------- |
| ID du fournisseur      | `vllm`                                   |
| API                    | `openai-completions` (compatible OpenAI) |
| Auth                   | Variable d'environnement `VLLM_API_KEY`  |
| URL de base par défaut | `http://127.0.0.1:8000/v1`               |

## Getting started

<Steps>
  <Step title="Démarrer vLLM avec un serveur compatible OpenAI">
    Votre URL de base doit exposer des points de terminaison `/v1` (par ex. `/v1/models`, `/v1/chat/completions`). vLLM s'exécute généralement sur :

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="Définir la variable d'environnement de la clé API">
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
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## Découverte de modèles (fournisseur implicite)

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
- Votre serveur nécessite une vraie clé API (ou que vous souhaitez contrôler les en-têtes)

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
    vLLM est traité comme un backend `/v1` compatible de style proxy, et non comme un point de terminaison
    OpenAI natif. Cela signifie :

    | Comportement | Appliqué ? |
    |----------|----------|
    | Mise en forme des requêtes natives OpenAI | Non |
    | `service_tier` | Non envoyé |
    | Réponses `store` | Non envoyé |
    | Indices de cache de prompt | Non envoyés |
    | Mise en forme du payload de compatibilité de raisonnement OpenAI | Non appliquée |
    | En-têtes d'attribution OpenAI masqués | Non injectés sur les URL de base personnalisées |

  </Accordion>

  <Accordion title="URL de base personnalisée">
    Si votre serveur vLLM fonctionne sur un hôte ou un port non défini par défaut, définissez `baseUrl` dans la configuration du fournisseur explicite :

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
  <Accordion title="Serveur inaccessible">
    Vérifiez que le serveur vLLM est en cours d'exécution et accessible :

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si vous voyez une erreur de connexion, vérifiez l'hôte, le port et que vLLM a démarré avec le mode serveur compatible OpenAI.

  </Accordion>

  <Accordion title="Erreurs d'authentification sur les requêtes">
    Si les requêtes échouent avec des erreurs d'authentification, définissez un `VLLM_API_KEY` réel qui correspond à la configuration de votre serveur, ou configurez le fournisseur explicitement sous `models.providers.vllm`.

    <Tip>
    Si votre serveur vLLM n'applique pas l'authentification, toute valeur non vide pour `VLLM_API_KEY` sert de signal d'adhésion pour OpenClaw.
    </Tip>

  </Accordion>

  <Accordion title="Aucun modèle découvert">
    La découverte automatique nécessite que `VLLM_API_KEY` soit défini **et** qu'il n'y ait aucune entrée de configuration `models.providers.vllm` explicite. Si vous avez défini le fournisseur manuellement, OpenClaw ignore la découverte et utilise uniquement vos modèles déclarés.
  </Accordion>
</AccordionGroup>

<Warning>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="OpenAI" href="/fr/providers/openai" icon="bolt">
    Provider natif OpenAI et comportement des routes compatibles avec OpenAI.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
