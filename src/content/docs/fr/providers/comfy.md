---
title: "ComfyUI"
summary: "Configuration de la génération d'images, de vidéos et de musique par workflow ComfyUI dans OpenClaw"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw inclut un plugin `comfy` intégré pour les exécutions ComfyUI basées sur des workflows. Le plugin est entièrement basé sur des workflows, donc OpenClaw n'essaie pas de mapper des contrôles génériques `size`, `aspectRatio`, `resolution`, `durationSeconds` ou de style TTS sur votre graphe.

| Propriété          | Détail                                                                                |
| ------------------ | ------------------------------------------------------------------------------------- |
| Fournisseur        | `comfy`                                                                               |
| Modèles            | `comfy/workflow`                                                                      |
| Surfaces partagées | `image_generate`, `video_generate`, `music_generate`                                  |
| Auth               | Aucune pour ComfyUI local ; `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour Comfy Cloud |
| API                | ComfyUI `/prompt` / `/history` / `/view` et Comfy Cloud `/api/*`                      |

## Ce qu'il prend en charge

- Génération d'images à partir d'un workflow JSON
- Modification d'images avec 1 image de référence téléchargée
- Génération de vidéos à partir d'un workflow JSON
- Génération de vidéos avec 1 image de référence téléchargée
- Génération de musique ou d'audio via l'outil `music_generate` partagé
- Téléchargement de la sortie à partir d'un nœud configuré ou de tous les nœuds de sortie correspondants

## Getting started

Choisissez entre exécuter ComfyUI sur votre propre machine ou utiliser Comfy Cloud.

<Tabs>
  <Tab title="Local">
    **Idéal pour :** exécuter votre propre instance ComfyUI sur votre machine ou votre réseau local.

    <Steps>
      <Step title="Démarrer ComfyUI en local">
        Assurez-vous que votre instance locale ComfyUI est en cours d'exécution (par défaut sur `http://127.0.0.1:8188`).
      </Step>
      <Step title="Préparer votre fichier JSON de workflow">
        Exportez ou créez un fichier JSON de workflow ComfyUI. Notez les identifiants des nœuds pour le nœud d'entrée de prompt et le nœud de sortie depuis lequel vous souhaitez qu'OpenClaw lise.
      </Step>
      <Step title="Configurer le fournisseur">
        Définissez `mode: "local"` et pointez vers votre fichier de workflow. Voici un exemple minimal pour une image :

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "local",
                baseUrl: "http://127.0.0.1:8188",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Définir le modèle par défaut">
        Pointez OpenClaw vers le modèle `comfy/workflow` pour la capacité que vous avez configurée :

        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Comfy Cloud">
    **Idéal pour :** exécuter des workflows sur Comfy Cloud sans gérer de ressources GPU locales.

    <Steps>
      <Step title="Obtenir une clé API">
        Inscrivez-vous sur [comfy.org](https://comfy.org) et générez une clé API depuis votre tableau de bord de compte.
      </Step>
      <Step title="Définir la clé API">
        Fournissez votre clé via l'une de ces méthodes :

        ```bash
        # Environment variable (preferred)
        export COMFY_API_KEY="your-key"

        # Alternative environment variable
        export COMFY_CLOUD_API_KEY="your-key"

        # Or inline in config
        openclaw config set models.providers.comfy.apiKey "your-key"
        ```
      </Step>
      <Step title="Préparer votre JSON de workflow">
        Exportez ou créez un fichier JSON de workflow ComfyUI. Notez les ID des nœuds pour le nœud d'entrée de prompt et le nœud de sortie.
      </Step>
      <Step title="Configurer le fournisseur">
        Définissez `mode: "cloud"` et pointez vers votre fichier de workflow :

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "cloud",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```

        <Tip>
        Le mode cloud définit `baseUrl` par défaut sur `https://cloud.comfy.org`. Vous n'avez besoin de définir `baseUrl` que si vous utilisez un point de terminaison cloud personnalisé.
        </Tip>
      </Step>
      <Step title="Définir le modèle par défaut">
        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuration

Comfy prend en charge les paramètres de connexion partagés de haut niveau ainsi que les sections de workflow par capacité (`image`, `video`, `music`) :

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

### Clés partagées

| Clé                   | Type                   | Description                                                                                                  |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `mode`                | `"local"` ou `"cloud"` | Mode de connexion.                                                                                           |
| `baseUrl`             | string                 | Par défaut, `http://127.0.0.1:8188` pour le mode local ou `https://cloud.comfy.org` pour le cloud.           |
| `apiKey`              | string                 | Clé en ligne optionnelle, alternative aux variables d'environnement `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY`. |
| `allowPrivateNetwork` | boolean                | Autoriser un `baseUrl` privé/LAN en mode cloud.                                                              |

### Clés par capacité

Ces clés s'appliquent dans les sections `image`, `video` ou `music` :

| Clé                          | Obligatoire | Par défaut | Description                                                                                              |
| ---------------------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `workflow` ou `workflowPath` | Oui         | --         | Chemin vers le fichier JSON de workflow ComfyUI.                                                         |
| `promptNodeId`               | Oui         | --         | ID du nœud qui reçoit le invite de texte.                                                                |
| `promptInputName`            | Non         | `"text"`   | Nom de l'entrée sur le nœud d'invite.                                                                    |
| `outputNodeId`               | Non         | --         | ID du nœud depuis lequel lire la sortie. Si omis, tous les nœuds de sortie correspondants sont utilisés. |
| `pollIntervalMs`             | Non         | --         | Intervalle d'interrogation en millisecondes pour l'achèvement de la tâche.                               |
| `timeoutMs`                  | Non         | --         | Délai d'expiration en millisecondes pour l'exécution du workflow.                                        |

Les sections `image` et `video` prennent également en charge :

| Clé                   | Obligatoire                                    | Par défaut | Description                                             |
| --------------------- | ---------------------------------------------- | ---------- | ------------------------------------------------------- |
| `inputImageNodeId`    | Oui (lors du passage d'une image de référence) | --         | ID du nœud qui reçoit l'image de référence téléchargée. |
| `inputImageInputName` | Non                                            | `"image"`  | Nom de l'entrée sur le nœud d'image.                    |

## Détails du workflow

<AccordionGroup>
  <Accordion title="Image workflows">
    Définir le model d'image par défaut sur `comfy/workflow` :

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    **Exemple d'édition d'image de référence :**

    Pour activer l'édition d'image avec une image de référence téléchargée, ajoutez `inputImageNodeId` à votre configuration d'image :

    ```json5
    {
      models: {
        providers: {
          comfy: {
            image: {
              workflowPath: "./workflows/edit-api.json",
              promptNodeId: "6",
              inputImageNodeId: "7",
              inputImageInputName: "image",
              outputNodeId: "9",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Video workflows">
    Définir le model vidéo par défaut sur `comfy/workflow` :

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    Les workflows vidéo Comfy prennent en charge le texte vers vidéo et l'image vers vidéo via le graphique configuré.

    <Note>
    OpenClaw ne transmet pas de vidéos d'entrée dans les workflows Comfy. Seuls les invites de texte et les images de référence uniques sont prises en charge en tant qu'entrées.
    </Note>

  </Accordion>

  <Accordion title="Workflows de musique">
    Le plugin inclus enregistre un provider de génération musicale pour les sorties audio ou musicales définies par le workflow, accessible via l'outil partagé `music_generate` :

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    Utilisez la section de configuration `music` pour pointer vers votre JSON de workflow audio et votre nœud de sortie.

  </Accordion>

  <Accordion title="Rétrocompatibilité">
    La configuration image de premier niveau existante (sans la section imbriquée `image`) fonctionne toujours :

    ```json5
    {
      models: {
        providers: {
          comfy: {
            workflowPath: "./workflows/flux-api.json",
            promptNodeId: "6",
            outputNodeId: "9",
          },
        },
      },
    }
    ```

    OpenClaw traite cette structure héritée comme la configuration du workflow d'image. Vous n'avez pas besoin de migrer immédiatement, mais les sections imbriquées `image` / `video` / `music` sont recommandées pour les nouvelles configurations.

    <Tip>
    Si vous utilisez uniquement la génération d'images, la configuration plate héritée et la nouvelle section imbriquée `image` sont fonctionnellement équivalentes.
    </Tip>

  </Accordion>

  <Accordion title="Tests en direct">
    Une couverture en direct optionnelle existe pour le plugin inclus :

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    Le test en direct ignore les cas individuels d'image, vidéo ou musique, sauf si la section de workflow Comfy correspondante est configurée.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Configuration et utilisation de l'outil de génération d'images.
  </Card>
  <Card title="Génération de vidéos" href="/fr/tools/video-generation" icon="video">
    Configuration et utilisation de l'outil de génération de vidéos.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Configuration de l'outil de génération de musique et d'audio.
  </Card>
  <Card title="Répertoire des fournisseurs" href="/fr/providers/index" icon="layers">
    Aperçu de tous les fournisseurs et références de modèle.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference#agent-defaults" icon="gear">
    Référence complète de la configuration, y compris les valeurs par défaut de l'agent.
  </Card>
</CardGroup>
