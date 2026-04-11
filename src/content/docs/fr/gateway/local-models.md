---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modèles locaux"
---

# Modèles locaux

L'exécution en local est possible, mais OpenClaw s'attend à un contexte volumineux et à de solides défenses contre l'injection de prompts. Les petites cartes tronquent le contexte et compromettent la sécurité. Visez haut : **≥2 Mac Studios entièrement équipés ou une configuration GPU équivalente (~30 k$+)**. Un seul GPU de **24 Go** ne fonctionne que pour les prompts plus légers avec une latence plus élevée. Utilisez la **variante de modèle la plus grande / en taille réelle que vous pouvez faire tourner** ; les points de contrôle agressivement quantifiés ou « petits » augmentent le risque d'injection de prompts (voir [Sécurité](/en/gateway/security)).

Si vous souhaitez la configuration locale la plus simple, commencez par [Ollama](/en/providers/ollama) et `openclaw onboard`. Cette page est le guide opiniâtre pour les piles locales haut de gamme et les serveurs locaux compatibles OpenAI personnalisés.

## Recommandé : LM Studio + grand modèle local (API Responses)

Meilleure stack locale actuelle. Chargez un grand modèle dans LM Studio (par exemple, une version complète de Qwen, DeepSeek ou Llama), activez le serveur local (par défaut `http://127.0.0.1:1234`) et utilisez l'API Responses pour garder le raisonnement séparé du texte final.

```json5
{
  agents: {
    defaults: {
      model: { primary: “lmstudio/my-local-model” },
      models: {
        “anthropic/claude-opus-4-6”: { alias: “Opus” },
        “lmstudio/my-local-model”: { alias: “Local” },
      },
    },
  },
  models: {
    mode: “merge”,
    providers: {
      lmstudio: {
        baseUrl: “http://127.0.0.1:1234/v1”,
        apiKey: “lmstudio”,
        api: “openai-responses”,
        models: [
          {
            id: “my-local-model”,
            name: “Local Model”,
            reasoning: false,
            input: [“text”],
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
- Remplacez `my-local-model` par l'ID réel du modèle affiché dans LM Studio.
- Gardez le modèle chargé ; le chargement à froid (cold-load) ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version de LM Studio diffère.
- Pour WhatsApp, restez sur l'API Responses afin que seul le texte final soit envoyé.

Gardez les modèles hébergés configurés même lors de l'exécution en local ; utilisez `models.mode: "merge"` pour que les secours (fallbacks) restent disponibles.

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

Inversez l'ordre principal et de secours ; gardez le même bloc fournisseurs et `models.mode: "merge"` afin de pouvoir revenir à Sonnet ou Opus lorsque la boîte locale est hors ligne.

### Hébergement régional / routage des données

- Des variantes hébergées de MiniMax/Kimi/GLM existent également sur OpenRouter avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale là-bas pour garder le trafic dans votre juridiction choisie tout en utilisant `models.mode: "merge"` pour les secours Anthropic/OpenAI.
- Le mode uniquement local reste la voie la plus sûre pour la confidentialité ; le routage régional hébergé est un compromis lorsque vous avez besoin des fonctionnalités du fournisseur mais que vous souhaitez contrôler le flux des données.

## Autres proxys locaux compatibles avec OpenAI

vLLM, LiteLLM, OAI-proxy, ou des passerelles personnalisées fonctionnent s'ils exposent un point de terminaison `/v1` de style OpenAI. Remplacez le bloc fournisseur ci-dessus par votre point de terminaison et votre ID de modèle :

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
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

Gardez `models.mode: "merge"` pour que les modèles hébergés restent disponibles en tant que solutions de repli.

Remarque sur le comportement pour les backends `/v1` locaux/proxys :

- OpenClaw traite ceux-ci comme des routes compatibles OpenAI de style proxy, et non comme des points de terminaison OpenAI natifs
- le façonnage des requêtes natif uniquement OpenAI ne s'applique pas ici : pas de `service_tier`, pas de `store` Responses, pas de façonnage de payload compatible raisonnement OpenAI, et pas d'indices de cache de prompt
- les en-têtes d'attribution masqués de OpenClaw (`originator`, `version`, `User-Agent`) ne sont pas injectés sur ces URL de proxy personnalisées

Notes de compatibilité pour les backends compatibles OpenAI plus stricts :

- Certains serveurs n'acceptent que des chaînes `messages[].content` sur Chat Completions, et non des tableaux de parties de contenu structurés. Définissez `models.providers.<provider>.models[].compat.requiresStringContent: true` pour ces points de terminaison.
- Certains backends locaux plus petits ou plus stricts sont instables avec la forme complète du prompt d'exécution de l'agent de OpenClaw, surtout lorsque les schémas d'outils sont inclus. Si le backend fonctionne pour de minuscules appels directs `/v1/chat/completions` mais échoue sur les tours d'agent normaux de OpenClaw, essayez d'abord `models.providers.<provider>.models[].compat.supportsTools: false`.
- Si le backend échoue encore uniquement sur les exécutions plus volumineuses de OpenClaw, le problème restant est généralement la capacité en amont du modèle/serveur ou un bogue du backend, et non la couche de transport de OpenClaw.

## Dépannage

- Gateway peut atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Erreurs de contexte ? Abaissez `contextWindow` ou augmentez la limite de votre serveur.
- Le serveur compatible OpenAI renvoie `messages[].content ... expected a string` ? Ajoutez `compat.requiresStringContent: true` dans cette entrée de modèle.
- Les minuscules appels directs `/v1/chat/completions` fonctionnent, mais `openclaw infer model run` échoue sur Gemma ou un autre modèle local ? Désactivez d'abord les schémas d'outils avec `compat.supportsTools: false`, puis testez à nouveau. Si le serveur plante encore uniquement sur des prompts plus volumineux de OpenClaw, considérez cela comme une limitation du serveur/modèle en amont.
- Sécurité : les modèles locaux ignorent les filtres côté fournisseur ; gardez les agents étroits et la compression activée pour limiter le rayon d'impact des injections de prompt.
