---
summary: "OpenClawConfiguration de la génération vidéo PixVerse dans OpenClaw"
title: "PixVerse"
read_when:
  - You want to use PixVerse video generation in OpenClaw
  - You need the PixVerse API key/env setup
  - You want to make PixVerse the default video provider
---

OpenClaw fournit OpenClaw`pixverse` en tant que plugin externe officiel pour la génération vidéo PixVerse hébergée. Le plugin enregistre le fournisseur `pixverse` selon le contrat `videoGenerationProviders`.

| Propriété                       | Valeur                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| ID du fournisseur               | `pixverse`                                                                                 |
| Package du plugin               | `@openclaw/pixverse-provider`                                                              |
| Variable d'environnement d'auth | `PIXVERSE_API_KEY`                                                                         |
| Indicateur d'intégration        | `--auth-choice pixverse-api-key`                                                           |
| Indicateur direct CLI           | `--pixverse-api-key <key>`                                                                 |
| API                             | API de la plateforme PixVerse v2 (soumission API`video_id` plus interrogation du résultat) |
| Modèle par défaut               | `pixverse/v6`                                                                              |
| Région API par défaut           | Internationale                                                                             |

## Getting started

<Steps>
  <Step title="Installer le plugin">
    ```bash
    openclaw plugins install clawhub:@openclaw/pixverse-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="APIDéfinir la clé API">
    ```bash
    openclaw onboard --auth-choice pixverse-api-key
    ```

    L'assistant demande s'il faut utiliser le point de terminaison International
    (`https://app-api.pixverse.ai/openapi/v2`) ou le point de terminaison CN
    (`https://app-api.pixverseai.cn/openapi/v2`) avant d'écrire `region` et
    `baseUrl` dans la configuration du fournisseur.

  </Step>
  <Step title="Définir PixVerse comme fournisseur vidéo par défaut">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "pixverse/v6"
    ```
  </Step>
  <Step title="Générer une vidéo">
    Demandez à l'agent de générer une vidéo. PixVerse sera utilisé automatiquement.
  </Step>
</Steps>

## Modes et modèles pris en charge

Le fournisseur expose les modèles de génération PixVerse via l'outil vidéo partagé d'OpenClaw.

| Mode             | Modèles                 | Référence d'entrée         |
| ---------------- | ----------------------- | -------------------------- |
| Texte vers vidéo | `v6` (par défaut), `c1` | Aucun                      |
| Image vers vidéo | `v6` (par défaut), `c1` | 1 image locale ou distante |

Les références d'images locales sont téléchargées vers PixVerse avant la demande image-à-vidéo. Les URL d'images distantes sont transmises via le point de terminaison de téléchargement d'image de PixVerse en tant que `image_url`.

| Option         | Valeurs prises en charge                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Durée          | 1-15 secondes                                                                |
| Résolution     | `360P`, `540P`, `720P`, `1080P`                                              |
| Format d'image | `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `2:3`, `3:2`, `21:9` pour texte-à-vidéo |
| Audio généré   | `audio: true`                                                                |

<Note>La génération de modèles d'images PixVerse n'est pas encore exposée via `image_generate`APIOpenClaw. Cette API est basée sur l'ID de modèle, alors que le contrat de génération d'images partagé d'OpenClaw ne dispose pas actuellement d'un ensemble d'options typées spécifiques à PixVerse.</Note>

## Options du provider

Le provider vidéo accepte ces clés facultatives spécifiques au provider :

| Option                               | Type   | Effet                                      |
| ------------------------------------ | ------ | ------------------------------------------ |
| `seed`                               | nombre | Germe déterministe lorsque pris en charge  |
| `negativePrompt` / `negative_prompt` | chaîne | Invite négative                            |
| `quality`                            | chaîne | Qualité PixVerse telle que `720p`          |
| `motionMode` / `motion_mode`         | chaîne | Mode de mouvement image-à-vidéo            |
| `cameraMovement` / `camera_movement` | chaîne | Préréglage de mouvement de caméra PixVerse |
| `templateId` / `template_id`         | nombre | ID de modèle PixVerse activé               |

## Configuration

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "pixverse/v6",
      },
    },
  },
}
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="APIAPI region"OpenClawAPI>
    OpenClaw utilise par défaut l'API internationale PixVerse. Définissez `models.providers.pixverse.region`
    manuellement lorsque votre clé appartient à une région de plateforme PixVerse spécifique, ou utilisez
    `openclaw onboard --auth-choice pixverse-api-key`API pour en choisir une dans l'assistant de configuration :

    | Region value    | PixVerse API base URL                         |
    | --------------- | --------------------------------------------- |
    | `international` | `https://app-api.pixverse.ai/openapi/v2`      |
    | `cn`            | `https://app-api.pixverseai.cn/openapi/v2`    |

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            region: "cn", // "international" or "cn"
            baseUrl: "https://app-api.pixverseai.cn/openapi/v2",
            models: [],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Custom base URL">
    Définissez `models.providers.pixverse.baseUrl` uniquement lors du routage via un proxy compatible de confiance.
    `baseUrl` prend le pas sur `region`.

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            baseUrl: "https://app-api.pixverse.ai/openapi/v2",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Task polling">
    PixVerse renvoie un `video_id`OpenClaw depuis la demande de génération. OpenClaw interroge
    `/openapi/v2/video/result/{video_id}` jusqu'à ce que la tâche réussisse, échoue
    ou expire.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Video generation" href="/fr/tools/video-generation" icon="video">
    Paramètres d'outil partagés, sélection de provider et comportement asynchrone.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Paramètres par défaut de l'agent, y compris le model de génération vidéo.
  </Card>
</CardGroup>
