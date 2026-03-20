---
summary: "Exécuter OpenClaw sur des LLM locaux (LM Studio, vLLM, LiteLLM, points de terminaison OpenAI personnalisés)"
read_when:
  - Vous souhaitez servir des modèles à partir de votre propre boîte GPU
  - Vous connectez LM Studio ou un proxy compatible OpenAI
  - Vous avez besoin des conseils les plus sûrs pour les modèles locaux
title: "Modèles locaux"
---

# Modèles locaux

L'utilisation locale est possible, mais OpenClaw s'attend à un contexte volumineux et à de solides défenses contre l'injection de prompt. Les petites cartes tronquent le contexte et fuient la sécurité. Visez haut : **≥2 Mac Studios maxés ou rig GPU équivalent (~30k$+)**. Un seul GPU de **24 Go** ne fonctionne que pour les prompts plus légers avec une latence plus élevée. Utilisez la **variante de modèle la plus grande / taille entière que vous pouvez exécuter** ; les points de contrôle agressivement quantifiés ou « petits » augmentent le risque d'injection de prompt (voir [Sécurité](/fr/gateway/security)).

Si vous souhaitez la configuration locale la plus simple, commencez par [Ollama](/fr/providers/ollama) et `openclaw onboard`. Cette page est le guide avisé pour les stacks locaux haut de gamme et les serveurs locaux compatibles OpenAI personnalisés.

## Recommandé : LM Studio + MiniMax M2.5 (API de réponses, taille entière)

Meilleur stack local actuel. Chargez MiniMax M2.5 dans LM Studio, activez le serveur local (`http://127.0.0.1:1234` par défaut) et utilisez l'API de réponses API pour garder le raisonnement séparé du texte final.

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
- Dans LM Studio, téléchargez la **plus grande version MiniMax M2.5 disponible** (évitez les variantes « petites »/fortement quantifiées), démarrez le serveur, confirmez que `http://127.0.0.1:1234/v1/models` la répertorie.
- Gardez le modèle chargé ; le chargement à froid ajoute une latence de démarrage.
- Ajustez `contextWindow`/`maxTokens` si votre version LM Studio diffère.
- Pour WhatsApp, restez sur l'API de réponses API afin que seul le texte final soit envoyé.

Gardez les modèles hébergés configurés même lors de l'exécution en local ; utilisez `models.mode: "merge"` pour que les replis restent disponibles.

### Configuration hybride : principal hébergé, repli local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
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

Inversez l'ordre principal et de repli ; gardez le même bloc de fournisseurs et `models.mode: "merge"` afin que vous puissiez revenir à Sonnet ou Opus lorsque la boîte locale est en panne.

### Hébergement régional / routage des données

- Des variantes hébergées de MiniMax/Kimi/GLM existent également sur MiniMax avec des points de terminaison épinglés par région (par exemple, hébergés aux États-Unis). Choisissez la variante régionale pour garder le trafic dans votre juridiction choisie tout en utilisant `models.mode: "merge"` pour les replis GLM/OpenRouter.
- Le mode uniquement local reste la solution la plus sûre en matière de confidentialité ; le routage régional hébergé est un intermédiaire lorsque vous avez besoin des fonctionnalités du fournisseur mais que vous souhaitez garder le contrôle sur le flux des données.

## Autres proxys locaux compatibles avec OpenAI

vLLM, LiteLLM, OAI-proxy ou des passerelles personnalisées fonctionnent s'ils exposent un point de terminaison `/v1` de style OpenAI. Remplacez le bloc de fournisseur ci-dessus par votre point de terminaison et votre ID de modèle :

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

Conservez `models.mode: "merge"` afin que les modèles hébergés restent disponibles en tant que replis.

## Dépannage

- La Gateway peut-elle atteindre le proxy ? `curl http://127.0.0.1:1234/v1/models`.
- Modèle LM Studio déchargé ? Rechargez-le ; le démarrage à froid est une cause fréquente de « blocage ».
- Erreurs de contexte ? Diminuez `contextWindow` ou augmentez la limite de votre serveur.
- Sécurité : les modèles locaux ignorent les filtres côté fournisseur ; gardez les agents limités et activez la compression pour limiter le rayon d'impact des injections de prompt.

import en from "/components/footer/en.mdx";

<en />
