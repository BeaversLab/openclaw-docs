---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modèles locaux"
---

Les modèles locaux sont réalisables. Ils augmentent aussi la barre en matière de matériel, de taille de contexte et de défense contre l'injection de prompt — les petites cartes ou celles quantisées de manière agressive tronquent le contexte et fuient en matière de sécurité. Cette page est le guide avisé pour les stacks locaux haut de gamme et les serveurs locaux compatibles OpenAI personnalisés. Pour un onboarding avec le moins de friction possible, commencez par [LM Studio](/fr/providers/lmstudio) ou [Ollama](/fr/providers/ollama) et `openclaw onboard`.

Pour les serveurs locaux qui ne doivent démarrer que lorsqu'un modèle sélectionné en a besoin, consultez
[Local model services](/fr/gateway/local-model-services).

## Hardware floor

Visez haut : **≥2 Mac Studios entièrement équipés ou une configuration GPU équivalente (~30k$+)** pour une boucle d'agent confortable. Un seul GPU de **24 Go** ne fonctionne que pour les prompts plus légers avec une latence plus élevée. Lancez toujours **la plus grande variante / pleine taille que vous pouvez héberger** ; les checkpoints petits ou fortement quantisés augmentent le risque d'injection de prompt (voir [Security](/fr/gateway/security)).

## Pick a backend

| Backend                                                    | Use when                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [LM Studio](/fr/providers/lmstudio)                        | Première configuration locale, chargeur GUI, API Responses native                         |
| [Ollama](/fr/providers/ollama)                             | Workflow CLI, bibliothèque de modèles, service systemd sans intervention                  |
| MLX / vLLM / SGLang                                        | Hébergement auto-hébergé à haut débit avec un point de terminaison HTTP compatible OpenAI |
| LiteLLM / OAI-proxy / proxy compatible OpenAI personnalisé | Vous servez une autre API de modèle et avez besoin que APIOpenClaw la traite comme OpenAI |

Utilisez l'API Responses (API`api: "openai-responses"`) lorsque le backend la prend en charge (LM Studio le fait). Sinon, restez sur Chat Completions (`api: "openai-completions"`).

<Warning>
  **Utilisateurs WSL2 + Ollama + NVIDIA/CUDA :** Le programme d'installation officiel de Ollama Linux active un service systemd avec `Restart=always`. Sur les configurations GPU WSL2, le démarrage automatique peut recharger le dernier modèle lors du démarrage et épingler la mémoire de l'hôte. Si votre VM WSL2 redémarre à plusieurs reprises après avoir activé Ollama, consultez [WSL2 crash
  loop](/fr/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recommandé : LM Studio + grand modèle local (API Responses)

Meilleure pile locale actuelle. Chargez un grand modèle dans LM Studio (par exemple, une version complète de Qwen, DeepSeek ou Llama), activez le serveur local (par défaut `http://127.0.0.1:1234`API) et utilisez l'API Responses pour garder le raisonnement séparé du texte final.

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

**Liste de vérification de la configuration**

- Installez LM Studio : [https://lmstudio.ai](https://lmstudio.ai)
- Dans LM Studio, téléchargez la **plus grande version de modèle disponible** (évitez les variantes « small »/fortement quantifiées), démarrez le serveur, confirmez que `http://127.0.0.1:1234/v1/models` le répertorie.
- Remplacez `my-local-model` par l'ID réel du modèle affiché dans LM Studio.
- Gardez le modèle chargé ; le chargement à froid ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version de LM Studio diffère.
- Pour WhatsAppAPI, restez sur l'API Responses afin que seul le texte final soit envoyé.

Conservez les modèles hébergés configurés même lors de l'exécution en local ; utilisez `models.mode: "merge"` pour que les solutions de repli restent disponibles.

### Configuration hybride : principal hébergé, repli local

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

### Priorité au local avec filet de sécurité hébergé

Inversez l'ordre principal et de repli ; gardez le même bloc de fournisseurs et `models.mode: "merge"` afin de pouvoir revenir à Sonnet ou Opus lorsque la boîte locale est hors service.

### Hébergement régional / routage des données

- Des variantes hébergées de MiniMax/Kimi/GLM existent également sur OpenRouter avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale correspondante pour garder le trafic dans la juridiction de votre choix tout en utilisant MiniMaxGLMOpenRouter`models.mode: "merge"`AnthropicOpenAI pour les replis Anthropic/OpenAI.
- Le mode exclusivement local reste la solution la plus forte en matière de confidentialité ; le routage régional hébergé est un compromis lorsque vous avez besoin des fonctionnalités du fournisseur mais souhaitez contrôler le flux des données.

## Autres proxies locaux compatibles OpenAI

MLX (`mlx_lm.server`OpenAI), vLLM, SGLang, LiteLLM, OAI-proxy ou des passerelles personnalisées fonctionnent s'ils exposent un point de terminaison `/v1/chat/completions` de style OpenAI. Utilisez l'adaptateur Chat Completions sauf si le backend documente explicitement la prise en charge de `/v1/responses`. Remplacez le bloc fournisseur ci-dessus par votre point de terminaison et votre ID de modèle :

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

Si `api` est omis sur un fournisseur personnalisé avec un `baseUrl`OpenClaw, OpenClaw utilise par défaut `openai-completions`. Les points de terminaison de bouclage tels que `127.0.0.1` sont approuvés automatiquement ; les points de terminaison LAN, tailnet et DNS privés nécessitent toujours `request.allowPrivateNetwork: true`.

La valeur `models.providers.<id>.models[].id` est locale au fournisseur. N'incluez pas le préfixe du fournisseur à cet endroit. Par exemple, un serveur MLX démarré avec `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` doit utiliser cet identifiant de catalogue et cette référence de modèle :

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Définissez `input: ["text", "image"]` sur les modèles de vision locaux ou mandataires (proxied) afin que les pièces jointes d'images soient injectées dans les tours de l'agent. L'intégration interactive de fournisseurs personnalisés déduit les ID courants de modèles de vision et ne demande que les noms inconnus. L'intégration non interactive utilise la même déduction ; utilisez `--custom-image-input` pour les ID de vision inconnus ou `--custom-text-input` lorsqu'un modèle qui paraît connu est uniquement textuel derrière votre point de terminaison.

Conservez `models.mode: "merge"` pour que les modèles hébergés restent disponibles en tant que secours.
Utilisez `models.providers.<id>.timeoutSeconds` pour les serveurs de modèles locaux ou distants lents avant d'augmenter `agents.defaults.timeoutSeconds`. Le délai d'attente du fournisseur
ne s'applique qu'aux requêtes HTTP de modèle, y compris la connexion, les en-têtes, le flux du corps,
et l'abandon total de la récupération gardée.

<Note>
  Pour les fournisseurs compatibles OpenAI personnalisés, la persistance d'un marqueur local non secret tel que `apiKey: "ollama-local"` est acceptée lorsque `baseUrl` résout vers une boucle locale, un réseau LAN privé, `.local`, ou un nom d'hôte nu. OpenClaw le traite comme une information d'identification locale valide au lieu de signaler une clé manquante. Utilisez une valeur réelle pour tout
  fournisseur qui accepte un nom d'hôte public.
</Note>

Remarque sur le comportement pour les backends locaux/proxy `/v1` :

- OpenClaw traite ceux-ci comme des routes compatibles OpenAI de style proxy, et non comme des points de terminaison OpenAI natifs
- le formatage de requête natif OpenAI uniquement ne s'applique pas ici : pas de
  `service_tier`, pas de `store` Responses, pas de formatage de charge utile compatible avec le raisonnement OpenAI,
  et pas d'indices de cache de prompt
- les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
  ne sont pas injectés sur ces URL de proxy personnalisées

Notes de compatibilité pour les backends compatibles OpenAI plus stricts :

- Certains serveurs n'acceptent que des chaînes `messages[].content` dans Chat Completions, et non
  des tableaux de parties de contenu structurés. Définissez
  `models.providers.<provider>.models[].compat.requiresStringContent: true` pour
  ces points de terminaison.
- Certains modèles locaux émettent des requêtes d'outil entre crochets autonomes sous forme de texte, telles que
  `[tool_name]` suivi de JSON et `[END_TOOL_REQUEST]`. OpenClaw les convertit
  en véritables appels d'outil uniquement lorsque le nom correspond exactement à un outil
  enregistré pour le tour ; sinon, le bloc est traité comme un texte non pris en charge et est
  masqué des réponses visibles par l'utilisateur.
- Si un modèle émet du JSON, du XML ou du texte de style ReAct qui ressemble à un appel d'outil,
  mais que le fournisseur n'a pas émis d'invocation structurée, OpenClaw le laisse sous
  forme de texte et enregistre un avertissement avec l'identifiant d'exécution, le fournisseur/modèle, le modèle détecté et le nom de l'outil
  si disponible. Considérez cela comme une incompatibilité d'appel d'outil du fournisseur/modèle,
  et non comme une exécution d'outil terminée.
- Si les outils apparaissent sous forme de texte de l'assistant au lieu de s'exécuter, par exemple du JSON brut,
  de la syntaxe XML, ReAct ou un tableau `tool_calls` vide dans la réponse du fournisseur,
  vérifiez d'abord que le serveur utilise un modèle/analyseur de chat capable d'appeler des outils. Pour
  les backends de complétion de chat compatibles OpenAI dont l'analyseur ne fonctionne que lorsque l'utilisation
  de l'outil est forcée, définissez une substitution de requête par modèle au lieu de vous fier à l'analyse
  de texte :

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

  Utilisez ceci uniquement pour les modèles/sessions où chaque tour normal doit appeler un outil.
  Cela remplace la valeur de proxy par défaut de OpenClaw de `tool_choice: "auto"`.
  Remplacez `local/my-local-model` par la référence exacte du fournisseur/modèle affichée par
  `openclaw models list`.

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- Si un modèle personnalisé compatible OpenAI accepte les efforts de raisonnement OpenAI au-delà
  du profil intégré, déclarez-les dans le bloc de compatibilité du modèle. L'ajout de `"xhigh"`
  ici fait que `/think xhigh`, les sélecteurs de session, la validation Gateway et la validation `llm-task`
  exposent le niveau pour cette référence fournisseur/modèle configurée :

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## Backends plus petits ou plus stricts

Si le modèle se charge proprement mais que les tours complets de l'agent dysfonctionnent, travaillez de haut en bas — confirmez d'abord le transport, puis réduisez la surface.

1. **Confirmez que le modèle local lui-même répond.** Sans outils, sans contexte d'agent :

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **Confirmez le routage Gateway.** Envoie uniquement l'invite fournie — ignore la transcription, le démarrage AGENTS, l'assemblage du moteur de contexte, les outils et les serveurs MCP groupés, mais exerce toujours le routage Gateway, l'authentification et la sélection du fournisseur :

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **Essayez le mode allégé.** Si les deux sondages réussissent mais que les tours réels de l'agent échouent avec des appels d'outil malformés ou des invites trop volumineuses, activez `agents.defaults.experimental.localModelLean: true`. Cela supprime les trois outils par défaut les plus lourds (`browser`, `cron`, `message`) afin que la forme de l'invite soit plus petite et moins fragile. Consultez [Fonctionnalités expérimentales → Mode allégé pour les modèles locaux](/fr/concepts/experimental-features#local-model-lean-mode) pour l'explication complète, quand l'utiliser et comment confirmer qu'il est activé.

4. **Désactivez entièrement les outils en dernier recours.** Si le mode allégé ne suffit pas, définissez `models.providers.<provider>.models[].compat.supportsTools: false` pour cette entrée de modèle. L'agent fonctionnera alors sans appels d'outil sur ce modèle.

5. **Au-delà de cela, le goulot d'étranglement est en amont.** Si le backend échoue toujours uniquement sur les exécutions OpenClaw plus volumineuses après le mode allégé et `supportsTools: false`, le problème restant est généralement la capacité du modèle ou du serveur en amont — fenêtre de contexte, mémoire GPU, éviction du cache kv ou un bug du backend. Ce n'est plus la couche de transport de OpenClaw à ce stade.

## Dépannage

- Gateway peut-il atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Le serveur local indique `terminated`, `ECONNRESET`, ou ferme le flux en cours de tour ?
  OpenClaw enregistre une `model.call.error.failureKind` de faible cardinalité ainsi que
  l'instantané RSS/tas du processus OpenClaw dans les diagnostics. Pour la pression mémoire sur LM Studio/Ollama,
  faites correspondre cet horodatage avec le journal du serveur ou le journal de plantage / jetsam macOS pour confirmer si le serveur de modèle a été tué.
- OpenClaw déduit les seuils de pré-vérification de la fenêtre de contexte à partir de la fenêtre du modèle détecté, ou de la fenêtre du modèle non limitée lorsque `agents.defaults.contextTokens` réduit la fenêtre effective. Il avertit en dessous de 20 % avec un plancher de **8k**. Les blocs stricts utilisent le seuil de 10 % avec un plancher de **4k**, plafonné à la fenêtre de contexte effective afin que les métadonnées de modèle trop volumineuses ne puissent pas rejeter une limite utilisateur valide par ailleurs. Si vous rencontrez cette pré-vérification, augmentez la limite de contexte du serveur/modèle ou choisissez un modèle plus grand.
- Erreurs de contexte ? Diminuez `contextWindow` ou augmentez la limite de votre serveur.
- Le serveur compatible OpenAI renvoie `messages[].content ... expected a string` ?
  Ajoutez `compat.requiresStringContent: true` dans cette entrée de modèle.
- Le serveur compatible OpenAI renvoie `validation.keys` ou indique que les entrées de message ne permettent que `role` et `content` ?
  Ajoutez `compat.strictMessageKeys: true` dans cette entrée de modèle.
- Les appels directs minuscules `/v1/chat/completions` fonctionnent, mais `openclaw infer model run --local`
  échoue sur Gemma ou un autre modèle local ? Vérifiez d'abord l'URL du fournisseur, la référence du modèle, le marqueur d'authentification
  et les journaux du serveur ; le `model run` local n'inclut pas les outils d'agent.
  Si le `model run` local réussit mais que les tours d'agent plus volumineux échouent, réduisez la surface des outils de l'agent
  avec `localModelLean` ou `compat.supportsTools: false`.
- Les appels d'outils apparaissent sous forme de texte JSON/XML/ReAct brut, ou le fournisseur renvoie un
  tableau `tool_calls` vide ? N'ajoutez pas de proxy qui convertit aveuglément le texte de l'assistant
  en exécution d'outil. Corrigez d'abord le modèle/analyseur de chat du serveur. Si le
  modèle ne fonctionne que lorsque l'utilisation de l'outil est forcée, ajoutez la substitution
  `params.extra_body.tool_choice: "required"` par modèle ci-dessus et utilisez cette entrée de modèle
  uniquement pour les sessions où un appel d'outil est attendu à chaque tour.
- Sécurité : les modèles locaux ignorent les filtres côté fournisseur ; gardez les agents restreints et la compaction activée pour limiter le rayon d'explosion de l'injection de prompt.

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Basculement de modèle](/fr/concepts/model-failover)
