---
summary: "Générer de la musique avec des fournisseurs partagés, y compris les plugins basés sur des flux de travail"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "Génération de musique"
---

# Génération de musique

L'outil `music_generate` permet à l'agent de créer de la musique ou de l'audio via la capacité de génération de musique partagée avec des fournisseurs configurés tels que Google, MiniMax et ComfyUI configuré par flux de travail.

Pour les sessions d'agent soutenues par un fournisseur partagé, OpenClaw lance la génération de musique en tant que tâche d'arrière-plan, la suit dans le registre des tâches, puis réveille l'agent à nouveau lorsque la piste est prête afin que l'agent puisse renvoyer l'audio terminé dans le channel d'origine.

<Note>L'outil partagé intégré n'apparaît que lorsqu'au moins un fournisseur de génération de musique est disponible. Si vous ne voyez pas `music_generate` dans les outils de votre agent, configurez `agents.defaults.musicGenerationModel` ou configurez une clé API de fournisseur.</Note>

## Quick start

### Génération soutenue par un fournisseur partagé

1. Définissez une clé API pour au moins un fournisseur, par exemple `GEMINI_API_KEY` ou
   `MINIMAX_API_KEY`.
2. Définissez facultativement votre model préféré :

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

3. Demandez à l'agent : _« Générer une piste synthpop entraînante sur un trajet nocturne
   à travers une ville au néon. »_

L'agent appelle `music_generate` automatiquement. Aucune autorisation d'outil (allow-listing) nécessaire.

Pour les contextes synchrones directs sans exécution d'agent soutenue par une session, l'outil intégré revient toujours à la génération en ligne et renvoie le chemin média final dans le résultat de l'outil.

Exemples de prompts :

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### Génération Comfy pilotée par flux de travail

Le plugin intégré `comfy` se connecte à l'outil partagé `music_generate` via le registre des fournisseurs de génération de musique.

1. Configurez `models.providers.comfy.music` avec un JSON de flux de travail et
   des nœuds de prompt/sortie.
2. Si vous utilisez Comfy Cloud, définissez `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY`.
3. Demandez de la musique à l'agent ou appelez l'outil directement.

Exemple :

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

## Prise en charge des fournisseurs groupés partagés

| Provider | Model par défaut       | Entrées de référence | Contrôles pris en charge                                  | Clé API                                |
| -------- | ---------------------- | -------------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI  | `workflow`             | Jusqu'à 1 image      | Musique ou audio défini par le flux de travail            | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google   | `lyria-3-clip-preview` | Jusqu'à 10 images    | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax  | `music-2.5+`           | Aucun                | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

Utilisez `action: "list"` pour inspecter les providers et modèles partagés disponibles à l'exécution :

```text
/tool music_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche musicale actuelle basée sur la session :

```text
/tool music_generate action=status
```

Exemple de génération directe :

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Paramètres de l'outil intégré

| Paramètre         | Type     | Description                                                                                                       |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `prompt`          | string   | Prompt de génération musicale (requis pour `action: "generate"`)                                                  |
| `action`          | string   | `"generate"` (par défaut), `"status"` pour la tâche de session actuelle, ou `"list"` pour inspecter les providers |
| `model`           | string   | Surcharge de provider/modèle, par ex. `google/lyria-3-pro-preview` ou `comfy/workflow`                            |
| `lyrics`          | string   | Paroles facultatives lorsque le provider prend en charge la saisie explicite de paroles                           |
| `instrumental`    | boolean  | Demander une sortie instrumentale uniquement lorsque le provider le prend en charge                               |
| `image`           | string   | Chemin ou URL d'une image de référence unique                                                                     |
| `images`          | string[] | Plusieurs images de référence (jusqu'à 10)                                                                        |
| `durationSeconds` | number   | Durée cible en secondes lorsque le provider prend en charge les indications de durée                              |
| `format`          | string   | Indication de format de sortie (`mp3` ou `wav`) lorsque le provider le prend en charge                            |
| `filename`        | string   | Indication de nom de fichier de sortie                                                                            |

Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw valide toujours les limites strictes
telles que les nombres d'entrées avant la soumission, mais les indications facultatives non prises en charge sont
ignorées avec un avertissement lorsque le provider ou le modèle sélectionné ne peut pas les honorer.

## Comportement asynchrone pour le chemin basé sur un provider partagé

- Exécutions d'agent basées sur une session : `music_generate` crée une tâche en arrière-plan, renvoie immédiatement une réponse started/task, et publie la piste terminée ultérieurement dans un message de suivi de l'agent.
- Prévention des doublons : tant que cette tâche en arrière-plan est encore `queued` ou `running`, les appels ultérieurs à `music_generate` dans la même session renvoient l'état de la tâche au lieu de lancer une autre génération.
- Recherche de statut : utilisez `action: "status"` pour inspecter la tâche musicale active basée sur une session sans en lancer une nouvelle.
- Suivi des tâches : utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour inspecter les états en file d'attente, en cours d'exécution et terminaux de la génération.
- Réveil à la fin : OpenClaw réinjecte un événement de fin interne dans la même session afin que le model puisse lui-même rédiger la suite orientée utilisateur.
- Indice d'invite : les tours ultérieurs de l'utilisateur ou manuels dans la même session reçoivent un petit indice d'exécution lorsqu'une tâche musicale est déjà en cours, pour que le model n'appelle pas `music_generate` aveuglément à nouveau.
- Recours sans session : les contextes directs/locaux sans vraie session d'agent s'exécutent toujours en ligne et renvoient le résultat audio final dans le même tour.

## Configuration

### Sélection du model

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.5+"],
      },
    },
  },
}
```

### Ordre de sélection du provider

Lors de la génération de musique, OpenClaw essaie les providers dans cet ordre :

1. paramètre `model` de l'appel d'outil, si l'agent en spécifie un
2. `musicGenerationModel.primary` depuis la config
3. `musicGenerationModel.fallbacks` dans l'ordre
4. Détection automatique en utilisant uniquement les valeurs par défaut du provider avec authentification :
   - provider par défaut actuel en premier
   - providers de génération de musique restants enregistrés dans l'ordre de provider-id

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

## Notes sur les providers

- Google utilise la génération par lot Lyria 3. Le flux groupé actuel prend en charge l'invite, le texte de paroles facultatif et les images de référence facultatives.
- MiniMax utilise le point de terminaison par lot `music_generation`. Le flux groupé actuel prend en charge l'invite, des paroles facultatives, le mode instrumental, la direction de la durée et la sortie mp3.
- Le support ComfyUI est basé sur le flux de travail et dépend du graphe configuré ainsi que du mappage des nœuds pour les champs d'invite/de sortie.

## Choisir le bon chemin

- Utilisez le chemin partagé basé sur un provider lorsque vous souhaitez la sélection de modèle, le basculement de provider et le flux asynchrone intégré de tâche/statut.
- Utilisez un chemin de plugin tel que ComfyUI lorsque vous avez besoin d'un graphe de flux de travail personnalisé ou d'un provider qui ne fait pas partie de la capacité musicale groupée partagée.
- Si vous déboguez un comportement spécifique à ComfyUI, consultez [ComfyUI](/en/providers/comfy). Si vous déboguez le comportement du provider partagé, commencez par [Google (Gemini)](/en/providers/google) ou [MiniMax](/en/providers/minimax).

## Tests en direct

Couverture en direct optionnelle pour les providers groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Couverture en direct optionnelle pour le chemin musical groupé ComfyUI :

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Le fichier live Comfy couvre également les flux de travail d'image et de vidéo Comfy lorsque ces sections sont configurées.

## Connexes

- [Tâches d'arrière-plan](/en/automation/tasks) - suivi des tâches pour les exécutions détachées `music_generate`
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) - config `musicGenerationModel`
- [ComfyUI](/en/providers/comfy)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [Modèles](/en/concepts/models) - configuration et basculement de modèle
- [Aperçu des outils](/en/tools)
