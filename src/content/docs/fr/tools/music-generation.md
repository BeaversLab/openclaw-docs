---
summary: "Générer de la musique avec des providers partagés, y compris les plugins basés sur des flux de travail"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "Génération de musique"
---

# Génération de musique

Le `music_generate` tool permet à l'agent de créer de la musique ou de l'audio via la
capacité de génération de musique partagée avec des providers configurés tels que Google,
MiniMax et ComfyUI configuré par flux de travail.

Pour les sessions d'agent soutenues par un fournisseur partagé, OpenClaw lance la génération de musique en tant que tâche d'arrière-plan, la suit dans le registre des tâches, puis réveille l'agent à nouveau lorsque la piste est prête afin que l'agent puisse renvoyer l'audio terminé dans le channel d'origine.

<Note>L'outil partagé intégré n'apparaît que lorsqu'au moins un provider de génération de musique est disponible. Si vous ne voyez pas `music_generate` dans les outils de votre agent, configurez `agents.defaults.musicGenerationModel` ou configurez une clé API provider.</Note>

## Quick start

### Génération soutenue par un fournisseur partagé

1. Définissez une clé API pour au moins un provider, par exemple `GEMINI_API_KEY` ou
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

L'agent appelle `music_generate` automatiquement. Aucune autorisation d'outil n'est nécessaire.

Pour les contextes synchrones directs sans exécution d'agent soutenue par une session, l'outil intégré revient toujours à la génération en ligne et renvoie le chemin média final dans le résultat de l'outil.

Exemples de prompts :

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### Génération Comfy pilotée par flux de travail

Le plugin groupé `comfy` se connecte à l'outil partagé `music_generate` via
le registre des providers de génération de musique.

1. Configurez `models.providers.comfy.music` avec un JSON de flux de travail et
   des nœuds d'invite/sortie.
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

### Matrice des capacités déclarées

Il s'agit du contrat de mode explicite utilisé par `music_generate`, les tests de contrat,
et le balayage en direct partagé.

| Provider | `generate` | `edit` | Limite d'édition | Voies en direct partagées                                                        |
| -------- | ---------- | ------ | ---------------- | -------------------------------------------------------------------------------- |
| ComfyUI  | Oui        | Oui    | 1 image          | Pas dans le balayage partagé ; couvert par `extensions/comfy/comfy.live.test.ts` |
| Google   | Oui        | Oui    | 10 images        | `generate`, `edit`                                                               |
| MiniMax  | Oui        | Non    | Aucun            | `generate`                                                                       |

Utilisez `action: "list"` pour inspecter les fournisseurs et modèles partagés disponibles lors de l'exécution :

```text
/tool music_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche musicale actuelle soutenue par la session :

```text
/tool music_generate action=status
```

Exemple de génération directe :

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Paramètres de l'outil intégré

| Paramètre         | Type     | Description                                                                                                          |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `prompt`          | string   | Invite de génération musicale (requis pour `action: "generate"`)                                                     |
| `action`          | string   | `"generate"` (par défaut), `"status"` pour la tâche de session actuelle, ou `"list"` pour inspecter les fournisseurs |
| `model`           | string   | Remplacement de fournisseur/modèle, par ex. `google/lyria-3-pro-preview` ou `comfy/workflow`                         |
| `lyrics`          | string   | Paroles optionnelles lorsque le fournisseur prend en charge la saisie explicite de paroles                           |
| `instrumental`    | boolean  | Demander une sortie instrumentale uniquement lorsque le fournisseur le prend en charge                               |
| `image`           | string   | Chemin ou URL d'une image de référence unique                                                                        |
| `images`          | string[] | Plusieurs images de référence (jusqu'à 10)                                                                           |
| `durationSeconds` | number   | Durée cible en secondes lorsque le fournisseur prend en charge les indications de durée                              |
| `format`          | string   | Indication de format de sortie (`mp3` ou `wav`) lorsque le fournisseur le prend en charge                            |
| `filename`        | string   | Indication de nom de fichier de sortie                                                                               |

Tous les fournisseurs ne prennent pas en charge tous les paramètres. OpenClaw valide toujours les limites strictes telles que les nombres d'entrées avant la soumission. Lorsqu'un fournisseur prend en charge la durée mais utilise un maximum plus court que la valeur demandée, OpenClaw la limite automatiquement à la durée prise en charge la plus proche. Les indications optionnelles réellement non prises en charge sont ignorées avec un avertissement lorsque le fournisseur ou le modèle sélectionné ne peut pas les honorer.

Les résultats de l'outil indiquent les paramètres appliqués. Lorsque OpenClaw limite la durée lors du basculement de fournisseur, le `durationSeconds` renvoyé reflète la valeur soumise et `details.normalization.durationSeconds` montre le mappage entre la valeur demandée et celle appliquée.

## Comportement asynchrone pour le chemin soutenu par le fournisseur partagé

- Exécutions d'agent basées sur une session : `music_generate` crée une tâche en arrière-plan, renvoie immédiatement une réponse started/task, et publie la piste terminée plus tard dans un message de suivi de l'agent.
- Prévention des doublons : tant que cette tâche d'arrière-plan est encore `queued` ou `running`, les appels ultérieurs à `music_generate` dans la même session renvoient le statut de la tâche au lieu de démarrer une autre génération.
- Recherche de statut : utilisez `action: "status"` pour inspecter la tâche musicale active basée sur la session sans en démarrer une nouvelle.
- Suivi des tâches : utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour inspecter les statuts en file d'attente, en cours d'exécution et terminaux pour la génération.
- Réveil à l'achèvement : OpenClaw réinjecte un événement d'achèvement interne dans la même session pour que le modèle puisse lui-même écrire le message de suivi destiné à l'utilisateur.
- Indicateur d'invite : les tours ultérieurs de l'utilisateur ou manuels dans la même session reçoivent un petit indice d'exécution lorsqu'une tâche musicale est déjà en cours, afin que le modèle n'appelle pas `music_generate` aveuglément à nouveau.
- Repli sans session : les contextes directs locaux sans véritable session d'agent s'exécutent toujours en ligne et renvoient le résultat audio final dans le même tour.

### Cycle de vie de la tâche

Chaque requête `music_generate` passe par quatre états :

1. **queued** -- tâche créée, en attente que le provider l'accepte.
2. **running** -- le provider traite la demande (généralement de 30 secondes à 3 minutes selon le provider et la durée).
3. **succeeded** -- piste prête ; l'agent se réveille et la publie dans la conversation.
4. **failed** -- erreur ou délai d'attente du provider ; l'agent se réveille avec les détails de l'erreur.

Vérifier le statut depuis la CLI :

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Prévention des doublons : si une tâche musicale est déjà `queued` ou `running` pour la session actuelle, `music_generate` renvoie le statut de la tâche existante au lieu d'en démarrer une nouvelle. Utilisez `action: "status"` pour vérifier explicitement sans déclencher une nouvelle génération.

## Configuration

### Sélection du modèle

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

1. Paramètre `model` de l'appel d'outil, si l'agent en spécifie un
2. `musicGenerationModel.primary` depuis la configuration
3. `musicGenerationModel.fallbacks` dans l'ordre
4. Détection automatique utilisant uniquement les valeurs par défaut du provider authentifié :
   - provider par défaut actuel en premier
   - providers de génération musicale enregistrés restants par ordre d'ID de provider

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` si vous voulez que la génération de musique utilise uniquement les entrées explicites `model`, `primary` et `fallbacks`.

## Notes sur le provider

- Google utilise la génération de lot Lyria 3. Le flux groupé actuel prend en charge le prompt, le texte de paroles facultatif et les images de référence facultatives.
- MiniMax utilise le point de terminaison de lot `music_generation`. Le flux groupé actuel prend en charge le prompt, les paroles facultatives, le mode instrumental, le pilotage de la durée et la sortie mp3.
- La prise en charge de ComfyUI est basée sur le workflow et dépend du graphe configuré ainsi que du mappage des nœuds pour les champs de prompt/sortie.

## Modes de capacité du provider

Le contrat de génération musicale partagée prend désormais en charge les déclarations de mode explicites :

- `generate` pour la génération par prompt uniquement
- `edit` lorsque la demande inclut une ou plusieurs images de référence

Les nouvelles implémentations de providers devraient préférer les blocs de mode explicites :

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

Les champs plats hérités tels que `maxInputImages`, `supportsLyrics` et `supportsFormat` ne suffisent pas à annoncer la prise en charge de l'édition. Les providers doivent déclarer `generate` et `edit` explicitement pour que les tests en direct, les tests de contrat et l'outil `music_generate` partagé puissent valider la prise en charge des modes de manière déterministe.

## Choisir le bon chemin

- Utilisez le chemin partagé supporté par le provider lorsque vous souhaitez la sélection de modèle, le basculement de provider et le flux de tâche/état asynchrone intégré.
- Utilisez un chemin de plugin tel que ComfyUI lorsque vous avez besoin d'un graphe de workflow personnalisé ou d'un provider qui ne fait pas partie de la capacité musicale groupée partagée.
- Si vous déboguez un comportement spécifique à ComfyUI, consultez [ComfyUI](/fr/providers/comfy). Si vous déboguez le comportement du provider partagé, commencez par [Google (Gemini)](/fr/providers/google) ou [MiniMax](/fr/providers/minimax).

## Tests en direct

Couverture en direct optionnelle pour les fournisseurs regroupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Enveloppe de dépôt :

```bash
pnpm test:live:media music
```

Ce fichier en direct charge les variables d'environnement du fournisseur manquantes depuis `~/.profile`, préfère par défaut les clés API live/env aux profils d'authentification stockés, et exécute à la fois la couverture `generate` et déclarée `edit` lorsque le fournisseur active le mode édition.

Aujourd'hui, cela signifie :

- `google` : `generate` plus `edit`
- `minimax` : `generate` uniquement
- `comfy` : couverture en direct Comfy séparée, pas le balayage du fournisseur partagé

Couverture en direct optionnelle pour le chemin musical ComfyUI regroupé :

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Le fichier en direct Comfy couvre également les workflows d'image et de vidéo Comfy lorsque ces sections sont configurées.

## Connexes

- [Tâches d'arrière-plan](/fr/automation/tasks) - suivi des tâches pour les exécutions détachées `music_generate`
- [Référence de configuration](/fr/gateway/configuration-reference#agent-defaults) - configuration `musicGenerationModel`
- [ComfyUI](/fr/providers/comfy)
- [Google (Gemini)](/fr/providers/google)
- [MiniMax](/fr/providers/minimax)
- [Modèles](/fr/concepts/models) - configuration des modèles et basculement
- [Aperçu des outils](/fr/tools)
