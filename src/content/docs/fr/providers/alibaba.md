---
title: "Alibaba Model Studio"
summary: "Génération vidéo Wan Alibaba Model Studio dans OpenClaw"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw est fourni avec un provider de `alibaba` vidéo intégré pour les modèles Wan sur
Alibaba Model Studio / DashScope.

- Provider : `alibaba`
- Auth préférée : `MODELSTUDIO_API_KEY`
- Également accepté : `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API : Génération vidéo asynchrone DashScope / Model Studio

## Getting started

<Steps>
  <Step title="Set an API key">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
    ```
  </Step>
  <Step title="Set a default video model">
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
  </Step>
  <Step title="Verify the provider is available">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>N'importe quelle clé d'authentification acceptée (`MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`, `QWEN_API_KEY`) fonctionnera. Le choix d'onboarding `qwen-standard-api-key` configure les informations d'identification partagées DashScope.</Note>

## Modèles Wan intégrés

Le provider `alibaba` intégré enregistre actuellement :

| Réf du modèle              | Mode                          |
| -------------------------- | ----------------------------- |
| `alibaba/wan2.6-t2v`       | Texte vers vidéo              |
| `alibaba/wan2.6-i2v`       | Image vers vidéo              |
| `alibaba/wan2.6-r2v`       | Référence vers vidéo          |
| `alibaba/wan2.6-r2v-flash` | Référence vers vidéo (rapide) |
| `alibaba/wan2.7-r2v`       | Référence vers vidéo          |

## Limites actuelles

| Paramètre                | Limite                                                    |
| ------------------------ | --------------------------------------------------------- |
| Vidéos de sortie         | Jusqu'à **1** par requête                                 |
| Images d'entrée          | Jusqu'à **1**                                             |
| Vidéos d'entrée          | Jusqu'à **4**                                             |
| Durée                    | Jusqu'à **10 secondes**                                   |
| Contrôles pris en charge | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Image/vidéo de référence | URL distantes `http(s)` uniquement                        |

<Warning>Le mode image/vidéo de référence nécessite actuellement des **URL http(s) distantes**. Les chemins de fichiers locaux ne sont pas pris en charge pour les entrées de référence.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Relation avec Qwen">
    Le provider `qwen` intégré utilise également les points de terminaison DashScope hébergés par Alibaba pour
    la génération vidéo Wan. Utilisez :

    - `qwen/...` lorsque vous souhaitez l'interface canonique du provider Qwen
    - `alibaba/...` lorsque vous souhaitez l'interface vidéo Wan directe du fournisseur

    Consultez la [documentation du provider Qwen](/en/providers/qwen) pour plus de détails.

  </Accordion>

  <Accordion title="Priorité de la clé d'authentification">
    OpenClaw vérifie les clés d'authentification dans l'ordre suivant :

    1. `MODELSTUDIO_API_KEY` (préféré)
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    L'une quelconque de ces clés authentifiera le provider `alibaba`.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération vidéo" href="/en/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Qwen" href="/en/providers/qwen" icon="microchip">
    Configuration du provider Qwen et intégration DashScope.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent et configuration du model.
  </Card>
</CardGroup>
