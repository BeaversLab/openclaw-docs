---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modèles locaux"
---

L'utilisation locale est possible, mais OpenClaw s'attend à un contexte volumineux et à de solides défenses contre l'injection de prompt. Les petites cartes tronquent le contexte et compromettent la sécurité. Visez haut : **≥2 Mac Studios maximisés ou une configuration GPU équivalente (~$30k+)**. Un seul GPU de **24 Go** ne fonctionne que pour les prompts plus légers avec une latence plus élevée. Utilisez la **plus grande variante de modèle / taille complète que vous pouvez exécuter** ; les points de contrôle agressivement quantifiés ou « petits » augmentent le risque d'injection de prompt (voir [Sécurité](/fr/gateway/security)).

Si vous souhaitez la configuration locale la plus simple, commencez par [LM Studio](/fr/providers/lmstudio) ou [Ollama](/fr/providers/ollama) et `openclaw onboard`. Cette page est le guide avisé pour les piles locales haut de gamme et les serveurs locaux compatibles OpenAI personnalisés.

<Warning>
  **Utilisateurs WSL2 + Ollama + NVIDIA/CUDA :** Le programme d'installation officiel de Ollama Linux active un service systemd avec `Restart=always`. Sur les configurations GPU WSL2, le démarrage automatique peut recharger le dernier modèle lors du démarrage et épingler la mémoire de l'hôte. Si votre VM WSL2 redémarre à plusieurs reprises après avoir activé Ollama, consultez [WSL2 crash
  loop](/fr/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recommandé : LM Studio + grand modèle local (API Responses)

Meilleure pile locale actuelle. Chargez un grand modèle dans LM Studio (par exemple, une version complète Qwen, DeepSeek ou Llama), activez le serveur local (par défaut `http://127.0.0.1:1234`) et utilisez l'API API Responses pour séparer le raisonnement du texte final.

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**Liste de contrôle de la configuration**

- Installez LM Studio : [https://lmstudio.ai](https://lmstudio.ai)
- Dans LM Studio, téléchargez la **plus grande version de modèle disponible** (évitez les variantes « petites »/fortement quantifiées), démarrez le serveur, confirmez que `http://127.0.0.1:1234/v1/models` le liste.
- Remplacez `my-local-model` par l'ID de modèle réel affiché dans LM Studio.
- Gardez le modèle chargé ; le chargement à froid (cold-load) ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version de LM Studio diffère.
- Pour WhatsApp, restez sur l'API Responses afin que seul le texte final soit envoyé.

Gardez les modèles hébergés configurés même lors de l'exécution en local ; utilisez `models.mode: "merge"` pour que les alternatives restent disponibles.

### Configuration hybride : hébergement principal, secours local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### Priorité locale avec filet de sécurité hébergé

Intervertissez l'ordre principal et de secours ; conservez le même bloc de fournisseurs et `models.mode: "merge"` afin de pouvoir revenir à Sonnet ou Opus lorsque la boîte locale est hors service.

### Hébergement régional / routage des données

- Des variantes hébergées MiniMax/Kimi/GLM existent également sur OpenRouter avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale appropriée pour garder le trafic dans votre juridiction choisie tout en utilisant `models.mode: "merge"` pour les replis Anthropic/OpenAI.
- Le mode uniquement local reste la voie la plus sûre pour la confidentialité ; le routage régional hébergé est un compromis lorsque vous avez besoin des fonctionnalités du fournisseur mais que vous souhaitez contrôler le flux des données.

## Autres proxys locaux compatibles avec OpenAI

MLX (`mlx_lm.server`), vLLM, SGLang, LiteLLM, OAI-proxy ou des passerelles personnalisées fonctionnent s'ils exposent un point de terminaison `/v1/chat/completions` de style OpenAI. Utilisez l'adaptateur Chat Completions, sauf si le backend documente explicitement la prise en charge de `/v1/responses`. Remplacez le bloc de fournisseur ci-dessus par votre point de terminaison et votre ID de modèle :

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Si `api` est omis sur un fournisseur personnalisé avec un `baseUrl`, OpenClaw est réglé par défaut sur `openai-completions`. Les points de terminaison de bouclage tels que `127.0.0.1` sont automatiquement approuvés ; les points de terminaison LAN, tailnet et DNS privés nécessitent toujours `request.allowPrivateNetwork: true`.

La valeur `models.providers.<id>.models[].id` est locale au fournisseur. N'incluez pas le préfixe du fournisseur à cet endroit. Par exemple, un serveur MLX démarré avec `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` doit utiliser cet ID de catalogue et cette référence de modèle :

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Conservez `models.mode: "merge"` afin que les modèles hébergés restent disponibles comme replis. Utilisez `models.providers.<id>.timeoutSeconds` pour les serveurs de modèles locaux ou distants lents avant de déclencher `agents.defaults.timeoutSeconds`. Le délai d'attente du fournisseur s'applique uniquement aux requêtes HTTP du modèle, y compris la connexion, les en-têtes, le flux du corps et l'abandon total du fetch sécurisé.

<Note>
  Pour les fournisseurs personnalisés compatibles OpenAI, la persistance d'un marqueur local non secret tel que `apiKey: "ollama-local"` est acceptée lorsque `baseUrl` résout vers une boucle, un LAN privé, `.local`, ou un nom d'hôte simple. OpenClaw le traite comme une information d'identification locale valide au lieu de signaler une clé manquante. Utilisez une vraie valeur pour tout fournisseur
  qui accepte un nom d'hôte public.
</Note>

Remarque sur le comportement pour les backends `/v1` locaux/proxifiés :

- OpenClaw traite celles-ci comme des routes compatibles avec OpenAI de type proxy, et non comme des points de terminaison OpenAI natifs
- le façonnage des requêtes natif OpenAI-only ne s'applique pas ici : pas de `service_tier`, pas de Réponses `store`, pas de façonnage de payload compatible avec le raisonnement OpenAI, et pas d'indications de cache de prompt
- les en-têtes d'attribution masqués de OpenClaw (`originator`, `version`, `User-Agent`) ne sont pas injectés sur ces URL de proxy personnalisées

Notes de compatibilité pour les backends compatibles avec OpenAI plus stricts :

- Certains serveurs n'acceptent que la chaîne `messages[].content` sur Chat Completions, et non les tableaux de parties de contenu structurées. Définissez `models.providers.<provider>.models[].compat.requiresStringContent: true` pour ces points de terminaison.
- Certains modèles locaux émettent des demandes d'outils entre crochets autonomes sous forme de texte, telles que `[tool_name]` suivi de JSON et `[END_TOOL_REQUEST]`. OpenClaw les convertit en vrais appels d'outils uniquement lorsque le nom correspond exactement à un outil enregistré pour le tour ; sinon, le bloc est traité comme du texte non pris en charge et est masqué des réponses visibles par l'utilisateur.
- Si un modèle émet du texte JSON, XML ou de style ReAct qui ressemble à un appel d'outil mais que le fournisseur n'a pas émis d'appel structuré, OpenClaw le laisse sous forme de texte et enregistre un avertissement avec l'ID d'exécution, le fournisseur/modèle, le modèle détecté et le nom de l'outil lorsque disponible. Traitez cela comme une incompatibilité d'appel d'outil fournisseur/modèle, et non comme une exécution d'outil terminée.
- Si les outils apparaissent sous forme de texte d'assistant au lieu de s'exécuter, par exemple JSON brut, syntaxe XML, ReAct, ou un tableau `tool_calls` vide dans la réponse du fournisseur, vérifiez d'abord que le serveur utilise un modèle/analyseur de chat capable d'appels d'outils. Pour les backends Chat Completions compatibles OpenAI dont l'analyseur ne fonctionne que lorsque l'utilisation de l'outil est forcée, définissez une substitution de requête par modèle au lieu de vous fier à l'analyse de texte :

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
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

  N'utilisez ceci que pour les modèles/sessions où chaque tour normal doit appeler un outil. Cela remplace la valeur de proxy par défaut de OpenClaw qui est `tool_choice: "auto"`. Remplacez `local/my-local-model` par la référence exacte du fournisseur/modèle indiquée par `openclaw models list`.

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- Certains backends locaux plus petits ou plus stricts sont instables avec la forme complète de l'invite d'agent-runtime d'OpenClaw, surtout lorsque les schémas d'outils sont inclus. Si le backend fonctionne pour de minuscules appels `/v1/chat/completions` directs mais échoue lors des tours d'agent OpenClaw normaux, essayez d'abord `agents.defaults.experimental.localModelLean: true` pour abandonner les outils par défaut lourds comme `browser`, `cron` et `message` ; c'est un indicateur expérimental, et non un paramètre de mode par défaut stable. Voir [Fonctionnalités expérimentales](/fr/concepts/experimental-features). Si cela échoue toujours, essayez `models.providers.<provider>.models[].compat.supportsTools: false`.
- Si le backend échoue toujours uniquement sur les exécutions OpenClaw plus volumineuses, le problème restant est généralement la capacité du modèle/serveur en amont ou un bogue du backend, et non la couche de transport d'OpenClaw.

## Dépannage

- Gateway peut atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Le serveur local indique `terminated`, `ECONNRESET` ou ferme le flux en cours de tour ? OpenClaw enregistre un `model.call.error.failureKind` à faible cardinalité ainsi que l'instantané RSS/du tas du processus OpenClaw dans les diagnostics. Pour la pression mémoire de LM Studio/Ollama, faites correspondre cet horodatage avec le journal du serveur ou le journal de plantage/jetsam de macOS pour confirmer si le serveur de modèle a été tué.
- OpenClaw avertit lorsque la fenêtre de contexte détectée est inférieure à **32k** et bloque en dessous de **16k**. Si vous rencontrez cette vérification préliminaire, augmentez la limite de contexte du serveur/modèle ou choisissez un modèle plus grand.
- Erreurs de contexte ? Diminuez `contextWindow` ou augmentez la limite de votre serveur.
- Le serveur compatible OpenAI renvoie `messages[].content ... expected a string` ? Ajoutez `compat.requiresStringContent: true` dans cette entrée de modèle.
- Les minuscules appels `/v1/chat/completions` directs fonctionnent, mais `openclaw infer model run` échoue sur Gemma ou un autre modèle local ? Désactivez d'abord les schémas d'outils avec `compat.supportsTools: false`, puis testez à nouveau. Si le serveur plante toujours uniquement sur les invites OpenClaw plus volumineuses, considérez cela comme une limitation du serveur/du modèle en amont.
- Les appels d'outils s'affichent sous forme de texte brut JSON/XML/ReAct, ou le fournisseur renvoie un tableau `tool_calls` vide ? N'ajoutez pas de proxy qui convertit aveuglément le texte de l'assistant en exécution d'outil. Corrigez d'abord le modèle de chat ou l'analyseur du serveur. Si le model ne fonctionne que lorsque l'utilisation de l'outil est forcée, ajoutez la substitution `params.extra_body.tool_choice: "required"` par model ci-dessus et utilisez cette entrée de model uniquement pour les sessions où un appel d'outil est attendu à chaque tour.
- Sécurité : les modèles locaux ignorent les filtres côté fournisseur ; gardez les agents étroits et la compaction activée pour limiter le rayon d'impact de l'injection de prompt.

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Bascule de model](/fr/concepts/model-failover)
