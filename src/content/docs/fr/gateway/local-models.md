---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modèles locaux"
---

Les modèles locaux sont réalisables. Ils élèvent également la barre en matière de matériel, de taille de contexte et de défense contre l'injection de prompt — les petites cartes ou celles quantisées de manière agressive tronquent le contexte et compromettent la sécurité. Cette page est le guide avisé pour les stacks locales haut de gamme et les serveurs locaux compatibles OpenAI. Pour un onboarding le plus simple possible, commencez par [LM Studio](/fr/providers/lmstudio) ou [Ollama](/fr/providers/ollama) et `openclaw onboard`.

## Configuration matérielle minimale

Visez haut : **≥2 Mac Studios entièrement équipés ou une configuration GPU équivalente (~30 000 $+)** pour une boucle d'agent confortable. Un seul GPU de **24 Go** ne fonctionne que pour des prompts plus légers avec une latence plus élevée. Exécutez toujours **la plus grande variante / taille complète que vous pouvez héberger** ; les petits points de contrôle ou fortement quantisés augmentent le risque d'injection de prompt (voir [Sécurité](/fr/gateway/security)).

## Choisir un backend

| Backend                                                    | Utiliser quand                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [LM Studio](/fr/providers/lmstudio)                        | Première configuration locale, chargeur GUI, API Responses native                         |
| [Ollama](/fr/providers/ollama)                             | Flux de travail CLI, bibliothèque de modèles, service systemd automatique                 |
| MLX / vLLM / SGLang                                        | Hébergement self-hosté à haut débit avec un point de terminaison HTTP compatible OpenAI   |
| LiteLLM / OAI-proxy / proxy compatible OpenAI personnalisé | Vous placez une autre API de modèle et avez besoin que APIOpenClaw la traite comme OpenAI |

Utilisez l'API Responses (API`api: "openai-responses"`) lorsque le backend la prend en charge (LM Studio le fait). Sinon, restez sur Chat Completions (`api: "openai-completions"`).

<Warning>
  **WSL2 + Ollama + utilisateurs NVIDIA/CUDA :** L'installateur officiel de Ollama Linux active un service systemd avec `Restart=always`. Sur les configurations GPU WSL2, le démarrage automatique peut recharger le dernier modèle lors du démarrage et épingler la mémoire de l'hôte. Si votre VM WSL2 redémarre de manière répétée après avoir activé Ollama, consultez [WSL2 crash
  loop](/fr/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recommandé : LM Studio + grand modèle local (API Responses)

Meilleure pile locale actuelle. Chargez un grand modèle dans LM Studio (par exemple, une version complète de Qwen, DeepSeek ou Llama), activez le serveur local (par défaut `http://127.0.0.1:1234`) et utilisez l'API Responses pour garder le raisonnement séparé du texte final.

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
- Dans LM Studio, téléchargez la **plus grande version de modèle disponible** (évitez les variantes « small »/fortement quantisées), démarrez le serveur, confirmez que `http://127.0.0.1:1234/v1/models` le répertorie.
- Remplacez `my-local-model` par l'ID réel du modèle affiché dans LM Studio.
- Gardez le modèle chargé ; le chargement à froid ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version de LM Studio diffère.
- Pour WhatsApp, restez sur l'API Responses afin que seul le texte final soit envoyé.

Gardez les modèles hébergés configurés même lors de l'exécution en local ; utilisez `models.mode: "merge"` pour que les alternatives restent disponibles.

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

### Priorité locale avec filet de sécurité hébergé

Inversez l'ordre principal et de repli ; gardez le même bloc de fournisseurs et `models.mode: "merge"` pour pouvoir revenir à Sonnet ou Opus lorsque la boîte locale est en panne.

### Hébergement régional / acheminement des données

- Des variantes hébergées de MiniMax/Kimi/GLM existent également sur OpenRouter avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale là-bas pour garder le trafic dans la juridiction de votre choix tout en utilisant MiniMaxGLMOpenRouter`models.mode: "merge"` pour les replis Anthropic/OpenAI.
- Le mode entièrement local reste la voie la plus forte en matière de confidentialité ; le routage régional hébergé est un compromis lorsque vous avez besoin des fonctionnalités du fournisseur mais que vous souhaitez contrôler le flux des données.

## Autres proxies locaux compatibles OpenAI

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

Si `api` est omis sur un fournisseur personnalisé avec un `baseUrl`, OpenClaw par défaut est `openai-completions`. Les points de terminaison de bouclage tels que `127.0.0.1` sont automatiquement approuvés ; les points de terminaison LAN, tailnet et DNS privés nécessitent toujours `request.allowPrivateNetwork: true`.

La valeur `models.providers.<id>.models[].id` est locale au fournisseur. N'incluez pas le préfixe du fournisseur à cet endroit. Par exemple, un serveur MLX démarré avec `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` doit utiliser cet ID de catalogue et cette référence de modèle :

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Définissez `input: ["text", "image"]` sur les modèles de vision locaux ou proxyés afin que les pièces jointes d'images soient injectées dans les tours de l'agent. L'intégration interactive de fournisseurs personnalisés déduit les ID courants de modèles de vision et ne demande que les noms inconnus. L'intégration non interactive utilise la même déduction ; utilisez `--custom-image-input` pour les ID de vision inconnus ou `--custom-text-input` lorsqu'un modèle qui paraît connu est uniquement textuel derrière votre point de terminaison.

Gardez `models.mode: "merge"` pour que les modèles hébergés restent disponibles en tant que solutions de secours.
Utilisez `models.providers.<id>.timeoutSeconds` pour les serveurs de modèles locaux ou distants lents avant d'augmenter `agents.defaults.timeoutSeconds`. Le délai d'attente du fournisseur
ne s'applique qu'aux requêtes HTTP de modèle, y compris la connexion, les en-têtes, le flux du corps,
et l'abandon total de la récupération gardée.

<Note>
  Pour les fournisseurs compatibles OpenAI personnalisés, la persistance d'un marqueur local non secret tel que `apiKey: "ollama-local"` est acceptée lorsque `baseUrl` résout vers une boucle locale, un réseau privé (LAN), `.local`, ou un nom d'hôte nu. OpenClaw le considère comme une identifiant local valide au lieu de signaler une clé manquante. Utilisez une vraie valeur pour tout fournisseur qui
  accepte un nom d'hôte public.
</Note>

Note de comportement pour les backends locaux/proxifiés `/v1` :

- OpenClaw traite ceux-ci comme des routes compatibles OpenAI de type proxy, et non comme des points de terminaison
  OpenAI natifs
- la mise en forme des requêtes native uniquement OpenAI ne s'applique pas ici : pas de
  `service_tier`, pas de `store` Responses, pas de mise en forme de charge utile compatible avec le raisonnement OpenAI,
  et pas d'indices de cache de prompt
- les en-têtes d'attribution cachés de OpenClaw (`originator`, `version`, `User-Agent`)
  ne sont pas injectés sur ces URL de proxy personnalisées

Notes de compatibilité pour les backends compatibles OpenAI plus stricts :

- Certains serveurs n'acceptent que des `messages[].content` de chaîne sur Chat Completions, et non
  des tableaux de parties de contenu structurés. Définissez
  `models.providers.<provider>.models[].compat.requiresStringContent: true` pour
  ces points de terminaison.
- Certains modèles locaux émettent des requêtes d'outils entre crochets autonomes sous forme de texte, telles que
  `[tool_name]` suivi de JSON et `[END_TOOL_REQUEST]`. OpenClaw les convertit
  en véritables appels d'outils uniquement lorsque le nom correspond exactement à un outil
  enregistré pour le tour ; sinon, le bloc est traité comme du texte non pris en charge et est
  masqué des réponses visibles par l'utilisateur.
- Si un modèle émet du JSON, du XML ou du texte de style ReAct qui ressemble à un appel de tool mais que le provider n'a pas émis d'invocation structurée, OpenClaw le laisse tel quel et enregistre un avertissement avec l'ID d'exécution, le provider/model, le modèle détecté et le nom du tool si disponible. Considérez cela comme une incompatibilité d'appel de tool provider/model, et non comme une exécution de tool terminée.
- Si les tools apparaissent sous forme de texte d'assistant au lieu de s'exécuter, par exemple JSON brut, syntaxe XML ou ReAct, ou un tableau `tool_calls` vide dans la réponse du provider, vérifiez d'abord que le serveur utilise un modèle/analyseur de chat capable d'appeler des tools. Pour les backends de Chat Completions compatibles OpenAI dont l'analyseur ne fonctionne que lorsque l'utilisation de tools est forcée, définissez une substitution de demande par model au lieu de vous fier à l'analyse de texte :

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

  Utilisez ceci uniquement pour les models/sessions où chaque tour normal doit appeler un tool. Cela remplace la valeur de proxy par défaut de OpenClaw qui est `tool_choice: "auto"`. Remplacez `local/my-local-model` par la référence provider/model exacte affichée par `openclaw models list`.

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- Si un modèle personnalisé compatible OpenAI accepte les efforts de raisonnement OpenAI au-delà du profil intégré, déclarez-les dans le bloc de compatibilité du modèle. L'ajout de `"xhigh"` ici fait en sorte que `/think xhigh`, les sélecteurs de session, la validation Gateway et la validation `llm-task` exposent le niveau pour cette référence provider/model configurée :

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

Si le modèle se charge correctement mais que les tours complets de l'agent dysfonctionnent, travaillez de haut en bas — confirmez d'abord le transport, puis réduisez la surface.

1. **Confirmez que le modèle local lui-même répond.** Pas de tools, pas de contexte d'agent :

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **Confirmez le routage Gateway.** Envoie uniquement l'invite fournie — ignore la transcription, le démarrage AGENTS, l'assemblage du moteur de contexte, les tools et les serveurs MCP groupés, mais exerce toujours le routage Gateway, l'authentification et la sélection du provider :

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **Essayez le mode allégé.** Si les deux sondages réussissent mais que les tours d'agent réels échouent avec des appels d'outil malformés ou des invites trop volumineuses, activez `agents.defaults.experimental.localModelLean: true`. Il supprime les trois outils par défaut les plus lourds (`browser`, `cron`, `message`) afin que la forme de l'invite soit plus petite et moins fragile. Consultez [Fonctionnalités expérimentales → Mode allégé pour modèle local](/fr/concepts/experimental-features#local-model-lean-mode) pour l'explication complète, quand l'utiliser et comment confirmer qu'il est activé.

4. **Désactivez entièrement les outils en dernier recours.** Si le mode allégé ne suffit pas, définissez `models.providers.<provider>.models[].compat.supportsTools: false` pour cette entrée de modèle. L'agent fonctionnera alors sans appels d'outil sur ce modèle.

5. **Au-delà de cela, le goulot d'étranglement est en amont.** Si le backend échoue toujours uniquement lors des exécutions OpenClaw plus importantes après le mode allégé et `supportsTools: false`, le problème restant est généralement la capacité du modèle ou du serveur en amont — fenêtre de contexte, mémoire GPU, éviction du cache kv ou un bug du backend. Ce n'est plus la couche de transport de OpenClaw à ce stade.

## Dépannage

- Le Gateway peut-il atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Le serveur local indique `terminated`, `ECONNRESET`, ou ferme le flux en cours de tour ?
  OpenClaw enregistre un `model.call.error.failureKind` à faible cardinalité ainsi que l'instantané RSS/heap du processus OpenClaw dans les diagnostics. Pour la pression mémoire sur LM Studio/Ollama,
  faites correspondre cet horodatage avec le journal du serveur ou le journal de plantage/jetsam macOS pour confirmer si le serveur de modèle a été tué.
- OpenClaw déduit les seuils de pré-vérification de la fenêtre de contexte à partir de la fenêtre de modèle détectée, ou de la fenêtre de modèle non plafonnée lorsque `agents.defaults.contextTokens` réduit la fenêtre effective. Il avertit en dessous de 20 % avec un plancher de **8k**. Les blocs durs utilisent le seuil de 10 % avec un plancher de **4k**, plafonné à la fenêtre de contexte effective afin que les métadonnées de modèle trop volumineuses ne puissent pas rejeter une limite utilisateur par ailleurs valide. Si vous rencontrez cette pré-vérification, augmentez la limite de contexte du serveur/modèle ou choisissez un modèle plus grand.
- Erreurs de contexte ? Abaissez `contextWindow` ou augmentez la limite de votre serveur.
- Le serveur compatible OpenAI renvoie `messages[].content ... expected a string` ?
  Ajoutez `compat.requiresStringContent: true` sur cette entrée de model.
- Les appels `/v1/chat/completions` directs minuscules fonctionnent, mais `openclaw infer model run --local`
  échoue sur Gemma ou un autre model local ? Vérifiez d'abord l'URL du provider, la référence du model, le marqueur
  d'auth et les journaux du serveur ; le `model run` local n'inclut pas les tools d'agent.
  Si le `model run` local réussit mais que les tours d'agent plus volumineux échouent, réduisez la surface
  du tool de l'agent avec `localModelLean` ou `compat.supportsTools: false`.
- Les appels de tool apparaissent sous forme de texte JSON/XML/ReAct brut, ou le provider renvoie un
  tableau `tool_calls` vide ? N'ajoutez pas de proxy qui convertit aveuglément le texte
  de l'assistant en exécution de tool. Corrigez d'abord le modèle/analyseur de chat du serveur. Si le
  model ne fonctionne que lorsque l'utilisation du tool est forcée, ajoutez la substitution
  `params.extra_body.tool_choice: "required"` par model ci-dessus et utilisez cette entrée de model
  uniquement pour les sessions où un appel de tool est attendu à chaque tour.
- Sécurité : les models locaux ignorent les filtres côté provider ; gardez les agents étroits et la compaction activée pour limiter le rayon d'explosion de l'injection de prompt.

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Basculement de model](/fr/concepts/model-failover)
