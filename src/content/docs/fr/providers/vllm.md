---
summary: "Exécuter OpenClaw avec vLLM (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM peut servir des modèles open source (et certains personnalisés) via une OpenAI HTTP compatible **API**. OpenClaw se connecte à vLLM en utilisant la API `openai-completions`.

OpenClaw peut également **découvrir automatiquement** les modèles disponibles depuis vLLM lorsque vous activez l'option avec `VLLM_API_KEY` (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification). Utilisez `vllm/*` dans `agents.defaults.models` pour garder la découverte dynamique lorsque vous configurez également une URL de base vLLM personnalisée.

OpenClaw traite `vllm` comme un fournisseur local compatible OpenAI qui prend en charge
la comptabilisation de l'utilisation en continu, de sorte que les totaux de jetons d'état/contexte peuvent être mis à jour à partir des
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
    Votre URL de base doit exposer des points de terminaison `/v1` (par ex. `/v1/models`, `/v1/chat/completions`). vLLM fonctionne couramment sur :

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="Définir la variable d'environnement de clé API">
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

## Découverte de modèle (fournisseur implicite)

Lorsque `VLLM_API_KEY` est défini (ou qu'un profil d'authentification existe) et que vous ne définissez **pas** `models.providers.vllm`, OpenClaw interroge :

```
GET http://127.0.0.1:8000/v1/models
```

et convertit les ID renvoyés en entrées de modèle.

<Note>Si vous définissez `models.providers.vllm` explicitement, OpenClaw utilise vos modèles déclarés par défaut. Ajoutez `"vllm/*": {}` à `agents.defaults.models` lorsque vous souhaitez que OpenClaw interroge le point de terminaison `/models` de ce provider configuré et inclue tous les modèles vLLM annoncés.</Note>

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

Pour garder ce provider dynamique sans lister manuellement chaque modèle, ajoutez un fournisseur générique (wildcard) au catalogue de modèles visible :

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/*": {},
      },
    },
  },
}
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM est traité comme un backend `/v1` compatible de style proxy OpenAI, et non comme un point de terminaison natif OpenAI. Cela signifie :

    | Comportement | Appliqué ? |
    |----------|----------|
    | Mise en forme des requêtes natives OpenAI | Non |
    | `service_tier` | Non envoyé |
    | Réponses `store` | Non envoyé |
    | Indices de cache de prompt (Prompt-cache hints) | Non envoyés |
    | Mise en forme des charges utiles de compatibilité de raisonnement OpenAI | Non appliquée |
    | En-têtes d'attribution OpenClaw masqués | Non injectés sur les URL de base personnalisées |

  </Accordion>

  <Accordion title="QwenQwen thinking controls"Qwen>
    Pour les modèles Qwen servis via vLLM, définissez
    `compat.thinkingFormat: "qwen-chat-template"`Qwen sur la ligne du modèle provider
    configuré lorsque le serveur attend des kwargs de modèle de chat Qwen. Les modèles
    configurés de cette manière exposent un profil binaire `/think` (`off`, `on`QwenOpenAI) car
    la réflexion (thinking) du modèle Qwen est un indicateur de requête tout ou rien, et non une échelle d'effort style OpenAI.

    ```json5
    {
      models: {
        providers: {
          vllm: {
            models: [
              {
                id: "Qwen/Qwen3-8B",
                name: "Qwen3 8B",
                reasoning: true,
                compat: { thinkingFormat: "qwen-chat-template" },
              },
            ],
          },
        },
      },
    }
    ```OpenClaw

    OpenClaw mappe `/think off` à :

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    Les niveaux de réflexion non-`off` envoient `enable_thinking: true`. Si votre point de terminaison
    attend des indicateurs de niveau supérieur style DashScope à la place, utilisez
    `compat.thinkingFormat: "qwen"` pour envoyer `enable_thinking` à la racine
    de la requête.

  </Accordion>

  <Accordion title="Nemotron 3 thinking controls"OpenClaw>
    vLLM/Nemotron 3 peut utiliser des kwargs de modèle de chat pour contrôler si le raisonnement est
    renvoyé sous forme de raisonnement masqué ou de texte de réponse visible. Lorsqu'une session OpenClaw
    utilise `vllm/nemotron-3-*` avec la réflexion désactivée, le plugin vLLM intégré envoie :

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

  <Accordion title="QwenLes appels d'outil Qwen apparaissent sous forme de texte">
    Assurez-vous d'abord que vLLM a été démarré avec le bon analyseur d'appels d'outil et le bon modèle de chat
    pour le model. Par exemple, la documentation vLLM indique `hermes` pour les modèles
    Qwen2.5 et `qwen3_xml` pour les modèles Qwen3-Coder.

    Symptômes :

    - les compétences ou les outils ne s'exécutent jamais
    - l'assistant imprime du JSON/XML brut tel que `{"name":"read","arguments":...}`
    - vLLM renvoie un tableau `tool_calls`OpenClaw vide lorsque OpenClaw envoie
      `tool_choice: "auto"`Qwen

    Certaines combinaisons Qwen/vLLM renvoient des appels d'outil structurés uniquement lorsque
    la requête utilise `tool_choice: "required"`OpenAI. Pour ces entrées de modèle, forcez le
    champ de requête compatible OpenAI avec `params.extra_body` :

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
    ```CLI

    Vous pouvez appliquer la même modification depuis le CLI :

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    Il s'agit d'une solution de contournement de compatibilité optionnelle. Elle impose que chaque tour de model
    avec outils exige un appel d'outil, utilisez-la donc uniquement pour une entrée de model local dédiée
    où ce comportement est acceptable. Ne l'utilisez pas comme valeur par défaut globale pour tous
    les modèles vLLM, et n'utilisez pas de proxy qui convertit aveuglément du texte
    d'assistant arbitraire en appels d'outil exécutables.

  </Accordion>

  <Accordion title="URL de base personnalisée">
    Si votre serveur vLLM s'exécute sur un hôte ou un port non défini par défaut, définissez `baseUrl` dans la configuration du provider explicite :

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
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
  <Accordion title="Première réponse lente ou expiration du délai du serveur distant">
    Pour les grands modèles locaux, les hôtes LAN distants ou les liaisons tailnet, définissez un
    délai d'expiration de requête limité au provider :

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` s'applique uniquement aux requêtes HTTP de modèle vLLM, y compris
    la configuration de la connexion, les en-têtes de réponse, la diffusion du corps et l'annulation
    totale du guarded-fetch. Privilégiez cela avant d'augmenter
    `agents.defaults.timeoutSeconds`, qui contrôle l'exécution entière de l'agent.

  </Accordion>

  <Accordion title="Serveur inaccessible">
    Vérifiez que le serveur vLLM est en cours d'exécution et accessible :

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si vous voyez une erreur de connexion, vérifiez l'hôte, le port et assurez-vous que vLLM a démarré avec le mode de serveur compatible OpenAI.
    Pour les points de terminaison de bouclage explicite, LAN ou Tailscale, OpenClaw fait confiance à l'origine exacte configurée `models.providers.vllm.baseUrl` pour les requêtes de modèle sécurisées. Les origines de métadonnées/link-local restent bloquées sans consentement explicite. Définissez `models.providers.vllm.request.allowPrivateNetwork: true` uniquement lorsque les requêtes vLLM doivent atteindre une autre origine privée, et définissez-le sur `false` pour refuser la confiance à l'origine exacte.

  </Accordion>

  <Accordion title="Erreurs d'authentification sur les requêtes">
    Si les requêtes échouent avec des erreurs d'authentification, définissez un `VLLM_API_KEY` réel correspondant à la configuration de votre serveur, ou configurez le fournisseur explicitement sous `models.providers.vllm`.

    <Tip>
    Si votre serveur vLLM n'applique pas l'authentification, toute valeur non vide pour `VLLM_API_KEY` fonctionne comme un signal d'activation pour OpenClaw.
    </Tip>

  </Accordion>

<Accordion title="Aucun modèle découvert">La découverte automatique nécessite que `VLLM_API_KEY` soit défini. Si vous avez défini `models.providers.vllm`, OpenClaw n'utilise que vos modèles déclarés, sauf si `agents.defaults.models` inclut `"vllm/*": {}`.</Accordion>

  <Accordion title="Les outils s'affichent sous forme de texte brut">
    Si un modèle Qwen imprime la syntaxe d'outil JSON/XML au lieu d'exécuter une compétence, consultez les instructions Qwen dans la configuration avancée ci-dessus. La solution habituelle est :

    - démarrer vLLM avec l'analyseur/modèle correct pour ce modèle
    - confirmer l'identifiant exact du modèle avec `openclaw models list --provider vllm`
    - ajouter une `params.extra_body.tool_choice: "required"` dédiée par modèle
      uniquement si `tool_choice: "auto"` renvoie toujours des appels d'outil vides ou en texte seul

  </Accordion>
</AccordionGroup>

<Warning>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="OpenAI" href="/fr/providers/openai" icon="bolt">
    Provider OpenAI natif et comportement de routage compatible OpenAI.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
