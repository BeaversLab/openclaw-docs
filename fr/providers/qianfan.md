---
summary: "Utilisez l'API unifiée de Qianfan pour accéder à de nombreux modèles dans OpenClaw"
read_when:
  - Vous souhaitez une seule clé API pour de nombreux LLM
  - Vous avez besoin de conseils pour la configuration de Baidu Qianfan
title: "Qianfan"
---

# Guide du fournisseur Qianfan

Qianfan est la plateforme MaaS de Baidu, elle fournit une **API unifiée** qui achemine les requêtes vers de nombreux modèles derrière un seul
point de terminaison et clé API. Elle est compatible avec OpenAI, donc la plupart des SDK OpenAI fonctionnent en changeant l'URL de base.

## Prérequis

1. Un compte Baidu Cloud avec accès à l'API Qianfan
2. Une clé API depuis la console Qianfan
3. OpenClaw installé sur votre système

## Obtenir votre clé API

1. Visitez la [Console Qianfan](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. Créez une nouvelle application ou sélectionnez une application existante
3. Générez une clé API (format : `bce-v3/ALTAK-...`)
4. Copiez la clé API pour l'utiliser avec OpenClaw

## Configuration CLI

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## Documentation associée

- [Configuration OpenClaw](/fr/gateway/configuration)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Configuration de l'agent](/fr/concepts/agent)
- [Documentation de l'API Qianfan](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

import fr from "/components/footer/fr.mdx";

<fr />
