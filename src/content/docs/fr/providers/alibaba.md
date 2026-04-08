---
title: "Alibaba Model Studio"
summary: "Génération vidéo Wan Alibaba Model Studio dans OpenClaw"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw est fourni avec un `alibaba` provider de génération vidéo pour les modèles Wan sur
Alibaba Model Studio / DashScope.

- Provider : `alibaba`
- Auth préférée : `MODELSTUDIO_API_KEY`
- Agalement accepté : `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API : Génération vidéo asynchrone DashScope / Model Studio

## Quick start

1. Définir une clé API :

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

2. Définir un modèle vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "alibaba/wan2.6-t2v",
      },
    },
  },
}
```

## Modèles Wan intégrés

Le `alibaba` provider fourni enregistre actuellement :

- `alibaba/wan2.6-t2v`
- `alibaba/wan2.6-i2v`
- `alibaba/wan2.6-r2v`
- `alibaba/wan2.6-r2v-flash`
- `alibaba/wan2.7-r2v`

## Limites actuelles

- Jusqu'à **1** vidéo de sortie par requête
- Jusqu'à **1** image d'entrée
- Jusqu'à **4** vidéos d'entrée
- Jusqu'à **10 secondes** de durée
- Prend en charge `size`, `aspectRatio`, `resolution`, `audio` et `watermark`
- Le mode image/vidéo de référence nécessite actuellement des **URL http(s) distantes**

## Relation avec Qwen

Le `qwen` provider fourni utilise également les points de terminaison DashScope hébergés par Alibaba pour
la génération vidéo Wan. Utilisez :

- `qwen/...` lorsque vous souhaitez l'interface canonique du Qwen provider
- `alibaba/...` lorsque vous souhaitez l'interface vidéo Wan directe du fournisseur

## Connexes

- [Génération vidéo](/en/tools/video-generation)
- [Qwen](/en/providers/qwen)
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults)
