---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modèles locaux"
---

# Modèles locaux

Le mode local est réalisable, mais OpenClaw s'attend à un contexte large + de solides défenses contre l'injection de prompts. Les petites cartes tronquent le contexte et fuient la sécurité. Visez haut : **≥2 Mac Studios maximisés ou une configuration GPU équivalente (~30 k$+)**. Un seul GPU de **24 Go** ne fonctionne que pour les prompts plus légers avec une latence plus élevée. Utilisez **la plus grande variante de modèle / taille complète que vous pouvez exécuter** ; les points de contrôle quantifiés de manière agressive ou « petits » augmentent le risque d'injection de prompt (voir [Sécurité](/fr/gateway/security)).

Si vous souhaitez la configuration locale la plus simple, commencez par [Ollama](/fr/providers/ollama) et `openclaw onboard`. Cette page est le guide opinionné pour les stacks locales haut de gamme et les serveurs locaux compatibles OpenAI personnalisés.

## Recommandé : LM Studio + MiniMax M2.5 (Réponses API, taille complète)

Meilleur stack local actuel. Chargez MiniMax M2.5 dans LM Studio, activez le serveur local (par défaut `http://127.0.0.1:1234`) et utilisez l'API Responses pour garder le raisonnement séparé du texte final.

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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
- Dans LM Studio, téléchargez la **plus grande version de MiniMax M2.5 disponible** (évitez les variantes « petites »/fortement quantifiées), démarrez le serveur, confirmez que `http://127.0.0.1:1234/v1/models` la liste.
- Gardez le modèle chargé ; le chargement à froid ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version de LM Studio diffère.
- Pour WhatsApp, restez sur l'API Responses afin que seul le texte final soit envoyé.

Conservez les modèles hébergés configurés même lors d'une exécution locale ; utilisez `models.mode: "merge"` pour que les solutions de repli restent disponibles.

### Configuration hybride : hébergement principal, repli local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/minimax-m2.5-gs32": { alias: "MiniMax Local" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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

Inversez l'ordre principal et de secours ; conservez le même bloc fournisseurs et `models.mode: "merge"` afin de pouvoir revenir à Sonnet ou Opus lorsque la boîte locale est hors service.

### Hébergement régional / acheminement des données

- Des variantes hébergées MiniMax/Kimi/GLM existent également sur OpenRouter avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale appropriée pour maintenir le trafic dans la juridiction de votre choix tout en utilisant `models.mode: "merge"` pour les secours Anthropic/OpenAI.
- Le mode entièrement local reste la voie la plus sûre pour la confidentialité ; l'acheminement régional hébergé est un compromis lorsque vous avez besoin des fonctionnalités du fournisseur mais souhaitez garder le contrôle sur le flux des données.

## Autres proxies locaux compatibles avec OpenAI

vLLM, LiteLLM, OAI-proxy ou des passerelles personnalisées fonctionnent s'ils exposent un point de terminaison `/v1` de style OpenAI. Remplacez le bloc fournisseur ci-dessus par votre point de terminaison et votre ID de modèle :

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

Conservez `models.mode: "merge"` afin que les modèles hébergés restent disponibles en tant que secours.

## Dépannage

- La Gateway peut-elle atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Erreurs de contexte ? Abaissez `contextWindow` ou augmentez la limite de votre serveur.
- Sécurité : les modèles locaux ignorent les filtres côté fournisseur ; gardez les agents restreints et la compactage activé pour limiter le rayon d'impact de l'injection de prompt.

import fr from "/components/footer/fr.mdx";

<fr />
