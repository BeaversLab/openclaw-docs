---
summary: "Exécuter OpenClaw avec vLLM (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM peut servir des modèles open source (et certains modèles personnalisés) via une API HTTP **compatible OpenAI**. API se connecte à vLLM en utilisant l'OpenClaw `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles depuis vLLM lorsque vous activez l'option avec `VLLM_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification) et que vous ne définissez pas d'entrée `models.providers.vllm` explicite.

OpenClaw traite `vllm` comme un fournisseur local compatible OpenAI qui prend en charge
la comptabilité de l'utilisation en continu, de sorte que les totaux de jetons de statut/contexte peuvent être mis à jour à partir des
réponses `stream_options.include_usage`.

| Propriété              | Valeur                                   |
| ---------------------- | ---------------------------------------- |
| ID du fournisseur      | `vllm`                                   |
| API                    | `openai-completions` (compatible OpenAI) |
| Auth                   | variable d'environnement `VLLM_API_KEY`  |
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
    N'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification :

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

## Découverte de modèle (fournisseur implicite)

Lorsque `VLLM_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous **ne** définissez **pas** `models.providers.vllm`, OpenClaw interroge :

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
- Vous vous connectez à un point de terminaison vLLM de bouclage approuvé, un réseau local ou Tailscale

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 300, // Optional: extend connect/header/body/request timeout for slow local models
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

## Configuration avancée

<AccordionGroup>
  <Accordion title="Comportement de type proxy">
    vLLM est traité comme un backend `/v1` compatible avec le style proxy OpenAI, et non comme un point de terminaison OpenAI natif. Cela signifie :

    | Comportement | Appliqué ? |
    |----------|----------|
    | Mise en forme des requêtes OpenAI natives | Non |
    | `service_tier` | Non envoyé |
    | Réponses `store` | Non envoyé |
    | Indicateurs de cache de prompt | Non envoyés |
    | Mise en forme des payloads compatibles avec le raisonnement OpenAI | Non appliquée |
    | En-têtes d'attribution OpenClaw masqués | Non injectés sur les URL de base personnalisées |

  </Accordion>

  <Accordion title="Contrôles de réflexion Qwen">
    Pour les modèles Qwen servis via vLLM, définissez
    `params.qwenThinkingFormat: "chat-template"` sur l'entrée du modèle lorsque le
    serveur attend les kwargs du modèle de chat Qwen. OpenClaw mappe `/think off` à :

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    Les niveaux de réflexion non `off` envoient `enable_thinking: true`. Si votre point de terminaison
    attend plutôt des indicateurs de niveau supérieur de style DashScope, utilisez
    `params.qwenThinkingFormat: "top-level"` pour envoyer `enable_thinking` à la
    racine de la requête. La version en snake_case `params.qwen_thinking_format` est également acceptée.

  </Accordion>

  <Accordion title="Contrôles de réflexion Nemotron 3">
    vLLM/Nemotron 3 peut utiliser les kwargs du modèle de chat pour contrôler si le raisonnement est
    renvoyé sous forme de raisonnement masqué ou de texte de réponse visible. Lorsqu'une session OpenClaw
    utilise `vllm/nemotron-3-*` avec la réflexion désactivée, le plugin vLLM inclus envoie :

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    Pour personnaliser ces valeurs, définissez `chat_template_kwargs` sous les paramètres du modèle.
    Si vous définissez également `params.extra_body.chat_template_kwargs`, cette valeur a
    la priorité finale car `extra_body` est la dernière substitution du corps de la requête.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Les appels d'outils Qwen apparaissent sous forme de texte">
    Assurez-vous d'abord que vLLM a été démarré avec le bon analyseur d'appels d'outils et le bon modèle de chat
    pour le modèle. Par exemple, la documentation vLLM indique `hermes` pour les modèles
    Qwen2.5 et `qwen3_xml` pour les modèles Qwen3-Coder.

    Symptômes :

    - les compétences ou les outils ne s'exécutent jamais
    - l'assistant imprime du JSON/XML brut tel que `{"name":"read","arguments":...}`
    - vLLM renvoie un tableau `tool_calls` vide lorsque Qwen envoie
      `tool_choice: "auto"`

    Certaines combinaisons OpenClaw/vLLM ne renvoient des appels d'outils structurés que lorsque
    la requête utilise `tool_choice: "required"`. Pour ces entrées de modèle, forcez le
    champ de requête compatible Qwen avec `params.extra_body` :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
              params: {
                extra_body: {
                  tool_choice: "required",
                },
              },
            },
          },
        },
      },
    }
    ```

    Remplacez `Qwen-Qwen2.5-Coder-32B-Instruct` par l'identifiant exact renvoyé par :

    ```bash
    openclaw models list --provider vllm
    ```

    Vous pouvez appliquer la même modification depuis la OpenAI :

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    Il s'agit d'une solution de contournement de compatibilité par opt-in. Elle force chaque tour de modèle
    avec des outils à exiger un appel d'outil, utilisez-la donc uniquement pour une entrée de modèle locale dédiée
    où ce comportement est acceptable. Ne l'utilisez pas comme valeur par défaut globale pour tous
    les modèles vLLM, et n'utilisez pas de proxy qui convertit aveuglément
    le texte arbitraire de l'assistant en appels d'outils exécutables.

  </Accordion>

  <Accordion title="URL de base personnalisée">
    Si votre serveur vLLM s'exécute sur un hôte ou un port non défini par défaut, définissez `baseUrl` dans la configuration explicite du fournisseur :

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
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
  <Accordion title="Lenteur de la première réponse ou expiration du délai du serveur distant">
    Pour les grands modèles locaux, les hôtes de réseau local distants ou les liaisons tailnet, définissez un
    délai d'expiration de requête au niveau du fournisseur :

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` s'applique uniquement aux requêtes HTTP des modèles vLLM, y compris
    la configuration de la connexion, les en-têtes de réponse, la diffusion du corps et l'annulation
    totale du fetch sécurisé. Privilégiez ceci avant d'augmenter
    `agents.defaults.timeoutSeconds`, qui contrôle toute l'exécution de l'agent.

  </Accordion>

  <Accordion title="Serveur inaccessible">
    Vérifiez que le serveur vLLM est en cours d'exécution et accessible :

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si vous voyez une erreur de connexion, vérifiez l'hôte, le port et que vLLM a démarré avec le mode serveur compatible OpenAI.
    Pour les points de terminaison de bouclage explicite, de réseau local ou Tailscale, définissez également
    `models.providers.vllm.request.allowPrivateNetwork: true` ; par défaut, les requêtes du
    provider bloquent les URL de réseau privé, sauf si le provider est
    explicitement approuvé.

  </Accordion>

  <Accordion title="Erreurs d'authentification sur les requêtes">
    Si les requêtes échouent avec des erreurs d'authentification, définissez un vrai `VLLM_API_KEY` correspondant à la configuration de votre serveur, ou configurez le provider explicitement sous `models.providers.vllm`.

    <Tip>
    Si votre serveur vLLM n'applique pas l'authentification, toute valeur non vide pour `VLLM_API_KEY` fonctionne comme un signal d'acceptation pour OpenClaw.
    </Tip>

  </Accordion>

<Accordion title="Aucun modèle découvert">La découverte automatique nécessite que `VLLM_API_KEY` soit défini **et** qu'il n'y ait aucune entrée de configuration `models.providers.vllm` explicite. Si vous avez défini le provider manuellement, OpenClaw ignore la découverte et utilise uniquement vos modèles déclarés.</Accordion>

  <Accordion title="Les outils s'affichent en texte brut">
    Si un modèle Qwen imprime la syntaxe d'outil JSON/XML au lieu d'exécuter une compétence,
    consultez les instructions Qwen dans la configuration avancée ci-dessus. La solution habituelle est :

    - démarrer vLLM avec l'analyseur/modèle correct pour ce modèle
    - confirmer l'identifiant exact du modèle avec `openclaw models list --provider vllm`
    - ajouter un `params.extra_body.tool_choice: "required"` dédié par modèle
      uniquement si `tool_choice: "auto"` renvoie toujours des appels d'outil vides ou textuels

  </Accordion>
</AccordionGroup>

<Warning>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir des providers, des références de modèle et le comportement de basculement.
  </Card>
  <Card title="OpenAI" href="/fr/providers/openai" icon="bolt">
    Fournisseur OpenAI natif et comportement de routage compatible OpenAI.
  </Card>
  <Card title="OAuth and auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
