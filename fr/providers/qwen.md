---
summary: "Utiliser Qwen OAuth (offre gratuite) dans OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You want free-tier OAuth access to Qwen Coder
title: "Qwen"
---

# Qwen

Qwen fournit un flux OAuth de niveau gratuit pour les modèles Qwen Coder et Qwen Vision
(2 000 requêtes/jour, sous réserve des limites de taux de Qwen).

## Activer le plugin

```bash
openclaw plugins enable qwen-portal-auth
```

Redémarrez la Gateway après l'activation.

## Authentifier

```bash
openclaw models auth login --provider qwen-portal --set-default
```

Cela exécute le flux Qwen avec code d'appareil de OAuth et écrit une entrée de fournisseur dans votre
`models.json` (plus un alias `qwen` pour un changement rapide).

## ID de modèle

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Changer de modèle avec :

```bash
openclaw models set qwen-portal/coder-model
```

## Réutiliser la connexion Qwen de CLI Code

Si vous vous êtes déjà connecté avec la Qwen CLI Code, OpenClaw synchronisera les informations d'identification
de `~/.qwen/oauth_creds.json` lors du chargement du magasin d'auth. Vous avez toujours besoin d'une
entrée `models.providers.qwen-portal` (utilisez la commande de connexion ci-dessus pour en créer une).

## Remarques

- Les jetons s'actualisent automatiquement ; réexécutez la commande de connexion si l'actualisation échoue ou si l'accès est révoqué.
- URL de base par défaut : `https://portal.qwen.ai/v1` (remplacez par
  `models.providers.qwen-portal.baseUrl` si Qwen fournit un point de terminaison différent).
- Voir [Modèles de fournisseurs](/fr/concepts/model-providers) pour les règles générales des fournisseurs.

import fr from "/components/footer/fr.mdx";

<fr />
