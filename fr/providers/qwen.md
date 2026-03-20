---
summary: "Utiliser OAuth Qwen (version gratuite) dans OAuth"
read_when:
  - Vous souhaitez utiliser Qwen avec OpenClaw
  - Vous souhaitez un accès OAuth de niveau gratuit à Qwen Coder
title: "Qwen"
---

# Qwen

Qwen fournit un flux OAuth de niveau gratuit pour les modèles Qwen Coder et Qwen Vision
(2 000 requêtes/jour, sous réserve des limites de taux de Qwen).

## Activer le plugin

```bash
openclaw plugins enable qwen-portal-auth
```

Redémarrez la Gateway après l'avoir activé.

## Authentifier

```bash
openclaw models auth login --provider qwen-portal --set-default
```

Cela exécute le flux Qwen de code d'appareil OAuth et écrit une entrée de fournisseur dans votre
`models.json` (plus un alias `qwen` pour un basculement rapide).

## ID de modèle

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Changer de modèles avec :

```bash
openclaw models set qwen-portal/coder-model
```

## Réutiliser la connexion Qwen du code CLI

Si vous vous êtes déjà connecté avec le code Qwen CLI, OpenClaw synchronisera les informations d'identification
à partir de `~/.qwen/oauth_creds.json` lors du chargement du stockage d'authentification. Vous avez toujours besoin d'une
entrée `models.providers.qwen-portal` (utilisez la commande de connexion ci-dessus pour en créer une).

## Notes

- Les jetons s'actualisent automatiquement ; réexécutez la commande de connexion si l'actualisation échoue ou si l'accès est révoqué.
- URL de base par défaut : `https://portal.qwen.ai/v1` (remplacez par
  `models.providers.qwen-portal.baseUrl` si Qwen fournit un point de terminaison différent).
- Voir [Model providers](/fr/concepts/model-providers) pour les règles applicables à tous les fournisseurs.

import fr from "/components/footer/fr.mdx";

<fr />
