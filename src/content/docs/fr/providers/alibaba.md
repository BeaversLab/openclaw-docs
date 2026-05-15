---
summary: "OpenClawGénération vidéo Wan sur Alibaba Model Studio dans OpenClaw"
title: "Alibaba Model Studio"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

OpenClaw est fourni avec un plugin OpenClaw`alibaba`API intégré qui enregistre un fournisseur de génération vidéo pour les modèles Wan sur Alibaba Model Studio (le nom international de DashScope). Le plugin est activé par défaut ; vous n'avez qu'à définir une clé API.

| Propriété                | Valeur                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| ID du fournisseur        | `alibaba`                                                                                           |
| Plugin                   | intégré, `enabledByDefault: true`                                                                   |
| Variables d'env d'auth   | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY` (la première correspondance l'emporte) |
| Indicateur d'intégration | `--auth-choice alibaba-model-studio-api-key`                                                        |
| Indicateur direct CLI    | `--alibaba-model-studio-api-key <key>`                                                              |
| Modèle par défaut        | `alibaba/wan2.6-t2v`                                                                                |
| URL de base par défaut   | `https://dashscope-intl.aliyuncs.com`                                                               |

## Getting started

<Steps>
  <Step title="APIDéfinir une clé API">
    Utilisez l'intégration pour stocker la clé pour le fournisseur `alibaba` :

    ```bash
    openclaw onboard --auth-choice alibaba-model-studio-api-key
    ```

    Ou passez la clé directement lors de l'installation/intégration :

    ```bash
    openclaw onboard --alibaba-model-studio-api-key <your-key>
    ```Gateway

    Ou exportez l'une des variables d'env acceptées avant de démarrer le Gateway :

    ```bash
    export MODELSTUDIO_API_KEY=sk-...
    # or DASHSCOPE_API_KEY=...
    # or QWEN_API_KEY=...
    ```

  </Step>
  <Step title="Définir un modèle vidéo par défaut">
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
  <Step title="Vérifier que le fournisseur est configuré">
    ```bash
    openclaw models list --provider alibaba
    ```

    La liste doit inclure les cinq modèles Wan intégrés. Si `MODELSTUDIO_API_KEY` n'est pas résolu, `openclaw models status --json` signale l'identifiant manquant sous `auth.unusableProfiles`.

  </Step>
</Steps>

<Note>
  Le plugin Alibaba et le [plugin Qwen](/fr/providers/qwen) s'authentifient tous les deux auprès de DashScope et acceptent des variables d'environnement qui se chevauchent. Utilisez les identifiants de `alibaba/...` pour utiliser l'interface vidéo dédiée de Wan ; utilisez les identifiants `qwen/...` lorsque vous souhaitez l'interface de chat, d'embedding ou de compréhension multimédia de Qwen.
</Note>

## Modèles Wan intégrés

| Réf de modèle              | Mode                          |
| -------------------------- | ----------------------------- |
| `alibaba/wan2.6-t2v`       | Texte vers vidéo (par défaut) |
| `alibaba/wan2.6-i2v`       | Image vers vidéo              |
| `alibaba/wan2.6-r2v`       | Référence vers vidéo          |
| `alibaba/wan2.6-r2v-flash` | Référence vers vidéo (rapide) |
| `alibaba/wan2.7-r2v`       | Référence vers vidéo          |

## Capacités et limites

Le provider intégré reflète les limites de l'API vidéo Wan de DashScope. Les trois modes partagent la même limite de nombre et de durée de vidéo par requête ; seule la forme de l'entrée diffère.

| Mode                 | Vidéos de sortie max | Images d'entrée max | Vidéos d'entrée max | Durée max | Contrôles pris en charge                                  |
| -------------------- | -------------------- | ------------------- | ------------------- | --------- | --------------------------------------------------------- |
| Texte vers vidéo     | 1                    | n/a                 | n/a                 | 10 s      | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Image vers vidéo     | 1                    | 1                   | n/a                 | 10 s      | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Référence vers vidéo | 1                    | n/a                 | 4                   | 10 s      | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |

Lorsqu'une demande omet `durationSeconds`, le provider envoie la valeur par défaut acceptée par DashScope de **5 secondes**. Définissez `durationSeconds` explicitement sur l'[outil de génération vidéo](/fr/tools/video-generation) pour étendre jusqu'à 10 s.

<Warning>Les entrées d'image et de vidéo de référence doivent être des URL `http(s)` distantes. Les chemins de fichiers locaux ne sont pas acceptés par les modes de référence de DashScope ; téléchargez d'abord vers le stockage d'objets ou utilisez le flux de l'[outil multimédia](/fr/tools/media-overview) qui produit déjà une URL publique.</Warning>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Remplacer l'URL de base DashScope">
    Le provider utilise par défaut le point de terminaison international DashScope. Pour cibler le point de terminaison de la région Chine, définissez :

    ```json5
    {
      models: {
        providers: {
          alibaba: {
            baseUrl: "https://dashscope.aliyuncs.com",
          },
        },
      },
    }
    ```

    Le provider supprime les barres obliques de fin avant de construire les URL des tâches AIGC.

  </Accordion>

  <Accordion title="Priorité des variables d'environnement d'authentification">
    OpenClaw résout la clé API d'Alibaba à partir des variables d'environnement dans cet ordre, en prenant la première valeur non vide :

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    Les entrées `auth.profiles` configurées (définies via `openclaw models auth login`) remplacent la résolution des variables d'environnement. Voir [Profils d'authentification dans la FAQ des modèles](/fr/help/faq-models#what-is-an-auth-profile) pour la rotation, le temps de recharge et les mécanismes de remplacement des profils.

  </Accordion>

  <Accordion title="Relation avec le plugin Qwen">
    Les deux plugins intégrés communiquent avec DashScope et acceptent des clés API qui se chevauchent. Utilisez :

    - Les identifiants `alibaba/wan*.*` pour utiliser le provider vidéo Wan dédié documenté sur cette page.
    - Les identifiants `qwen/*` pour le chat, l'incorporation (embedding) et la compréhension multimédia Qwen (voir [Qwen](/fr/providers/qwen)).

    Définir `MODELSTUDIO_API_KEY` une seule fois authentifie les deux plugins car la liste des variables d'environnement d'authentification se chevauche intentionnellement ; vous n'avez pas besoin de mettre en service chaque plugin séparément.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="QwenQwen" href="/fr/providers/qwen" icon="microchip" Qwen>
    Configuration du chat, de l'incorporation et de la compréhension des médias pour Qwen avec la même authentification DashScope.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent et configuration du modèle.
  </Card>
  <Card title="Models FAQ" href="/fr/help/faq-models" icon="circle-question">
    Profils d'authentification, changement de modèles et résolution des erreurs « no profile ».
  </Card>
</CardGroup>
