---
summary: "Utilisez l'API compatible OpenAIAPI de NovitaAI avec OpenClaw"
read_when:
  - You want to run OpenClaw with NovitaAI models
  - You need the Novita provider id, key, or endpoint
title: "NovitaAI"
---

NovitaAI est un fournisseur d'infrastructure AI hébergé avec une OpenAI de modèle compatible API. Dans OpenClaw, c'est un fournisseur de modèle intégré, donc l'identifiant du fournisseur est `novita`, les informations d'identification passent par le flux d'authentification de modèle normal, et les références de modèle ressemblent à `novita/deepseek/deepseek-v3-0324`.

Utilisez Novita lorsque vous souhaitez un accès hébergé aux itinéraires de modèles open-weight et tiers sans exécuter votre propre serveur d'inférence. Le catalogue intégré se concentre sur les modèles de conversation pratiques pour les tours d'agent, y compris les itinéraires DeepSeek, Moonshot, MiniMax, GLM et Qwen exposés par Novita.

Ce fournisseur utilise le point de terminaison compatible OpenAI de Novita. OpenClaw gère l'enregistrement du fournisseur, l'authentification, les alias, la normalisation des références de modèle et la sélection de l'URL de base ; Novita contrôle la disponibilité en direct des modèles, les autorisations de compte, la tarification et les limites de débit.

## Configuration

Créez une clé API sur [novita.ai/settings/key-management](https://novita.ai/settings/key-management), puis exécutez :

```bash
openclaw onboard --auth-choice novita-api-key
```

Ou définissez :

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## Valeurs par défaut

- Fournisseur : `novita`
- Alias : `novita-ai`, `novitaai`
- URL de base : `https://api.novita.ai/openai/v1`
- Variable d'environnement : `NOVITA_API_KEY`
- Modèle par défaut : `novita/deepseek/deepseek-v3-0324`

## Quand choisir Novita

- Vous souhaitez un accès hébergé aux modèles open-weight avec une OpenAI compatible API.
- Vous souhaitez des itinéraires DeepSeek, Kimi, MiniMax, GLM ou de la famille Qwen via un compte fournisseur unique.
- Vous souhaitez un autre chemin de repli hébergé en plus de OpenRouter, GMI, DeepInfra ou des de fournisseurs directs.
- Vous préférez l'hébergement de modèles côté fournisseur plutôt que de maintenir l'infrastructure vLLM, SGLang, LM Studio ou Ollama.

Choose a direct vendor provider when you need vendor-native request parameters
or support contracts. Choose a local provider when the model must run on your
own hardware or behind your own network boundary.

## Modèles

Le catalogue intégré inclut les identifiants de route NovitaAI couramment disponibles, notamment :

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

Le catalogue sert de point de départ pour la sélection de modèle OpenClaw. Votre compte,
votre région ou le catalogue actuel de Novita peuvent ajouter, supprimer ou restreindre des routes. Vérifiez
le provider via la CLI avant de définir une valeur par défaut persistante :

```bash
openclaw models list --provider novita
```

## Dépannage

- `401` ou `403` : vérifiez la clé dans la page de gestion des clés de Novita et relancez
  `openclaw onboard --auth-choice novita-api-key` si le profil stocké est
  périmé.
- Erreurs de modèle inconnues : utilisez l' `novita/<route-id>` exact renvoyé par
  `openclaw models list --provider novita`.
- Routes lentes ou échouées : essayez une autre route de modèle Novita ou définissez Novita comme
  provider de secours pour les charges de travail qui peuvent tolérer des variations spécifiques au provider.

## Connexes

- [Providers de modèle](/fr/concepts/model-providers)
- [Tous les providers](/fr/providers/index)
