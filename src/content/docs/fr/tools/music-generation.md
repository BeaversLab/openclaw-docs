---
summary: "MiniMaxOpenRouterGénérer de la musique via music_generate sur les flux de travail ComfyUI, fal, Google Lyria, MiniMax et OpenRouter"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "Génération de musique"
sidebarTitle: "Génération de musique"
---

L'outil `music_generate`MiniMaxOpenRouter permet à l'agent de créer de la musique ou de l'audio via la
capacité de génération de musique partagée avec les providers configurés — ComfyUI,
fal, Google, MiniMax et OpenRouter aujourd'hui.

Pour les exécutions d'agent basées sur une session, OpenClaw lance la génération de musique en tant que
tâche d'arrière-plan, la suit dans le registre des tâches, puis réveille l'agent à nouveau
lorsque la piste est prête afin que l'agent puisse informer l'utilisateur et joindre
l'audio terminé. Les complétions de médias générés sont transmis par l'agent via
l'outil de message. Si la session du demandeur est inactive et que certains audio
générés manquent toujours à la transmission par l'outil de message, OpenClaw envoie un
secours direct idempotent avec uniquement l'audio manquant. Le réveil de complétion
avertit explicitement l'agent que les réponses finales normales sont privées pour cette
route.

<Note>L'outil partagé intégré n'apparaît que lorsqu'au moins un provider de génération de musique est disponible. Si vous ne voyez pas `music_generate` dans les outils de votre agent, configurez `agents.defaults.musicGenerationModel`API ou configurez une clé d'API de provider.</Note>

## Quick start

<Tabs>
  <Tab title="Fournisseur partagé pris en charge">
    <Steps>
      <Step title="Configurer l'authentification"API>
        Définissez une clé API pour au moins un provider — par exemple
        `GEMINI_API_KEY` ou `MINIMAX_API_KEY`.
      </Step>
      <Step title="Choisir un modèle par défaut (facultatif)">
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
      </Step>
      <Step title="Demander à l'agent">
        _« Générer une piste synthpop entraînante sur un conduite nocturne dans une
        ville au néon. »_

        L'agent appelle `music_generate` automatiquement. Aucune liste d'autorisation

d'outil n'est nécessaire.
</Step>
</Steps>

    Pour les contextes synchrones directs sans exécution d'agent soutenue par une session,

l'outil intégré revient toujours à la génération en ligne et renvoie
le chemin média final dans le résultat de l'outil.

  </Tab>
  <Tab title="Workflow ComfyUI">
    <Steps>
      <Step title="Configurer le workflow">
        Configurez `plugins.entries.comfy.config.music` avec un workflow
        JSON et des nœuds de prompt/sortie.
      </Step>
      <Step title="Auth Cloud (facultatif)">
        Pour Comfy Cloud, définissez `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY`.
      </Step>
      <Step title="Appeler l'outil">
        ```text
        /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

Exemples de prompts :

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

## Fournisseurs pris en charge

| Fournisseur | Modèle par défaut            | Référence des entrées | Contrôles pris en charge                              | Auth                                   |
| ----------- | ---------------------------- | --------------------- | ----------------------------------------------------- | -------------------------------------- |
| ComfyUI     | `workflow`                   | Jusqu'à 1 image       | Musique ou audio défini par le flux de travail        | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| fal         | `fal-ai/minimax-music/v2.6`  | Aucun                 | `lyrics`, `instrumental`, `durationSeconds`, `format` | `FAL_KEY` ou `FAL_API_KEY`             |
| Google      | `lyria-3-clip-preview`       | Jusqu'à 10 images     | `lyrics`, `instrumental`, `format`                    | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax     | `music-2.6`                  | Aucun                 | `lyrics`, `instrumental`, `format=mp3`                | `MINIMAX_API_KEY` ou MiniMax OAuth     |
| OpenRouter  | `google/lyria-3-pro-preview` | Jusqu'à 1 image       | `lyrics`, `instrumental`, `durationSeconds`, `format` | `OPENROUTER_API_KEY`                   |

### Matrice des capacités

Le contrat de mode explicite utilisé par `music_generate`, les tests de contrat et le
balayage en direct partagé :

| Provider   | `generate` | `edit` | Limite d'édition | Voies en direct partagées                                                        |
| ---------- | :--------: | :----: | ---------------- | -------------------------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 image          | Pas dans le balayage partagé ; couvert par `extensions/comfy/comfy.live.test.ts` |
| fal        |     ✓      |   —    | Aucun            | `generate`                                                                       |
| Google     |     ✓      |   ✓    | 10 images        | `generate`, `edit`                                                               |
| MiniMax    |     ✓      |   —    | Aucun            | `generate`                                                                       |
| OpenRouter |     ✓      |   ✓    | 1 image          | `generate`, `edit`                                                               |

Utilisez `action: "list"` pour inspecter les fournisseurs partagés et modèles disponibles à
l'exécution :

```text
/tool music_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche musicale active basée sur une session :

```text
/tool music_generate action=status
```

Exemple de génération directe :

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Paramètres de l'outil

<ParamField path="prompt" type="string" required>
  Invite de génération musicale. Requis pour `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` renvoie la tâche de session actuelle ; `"list"` inspecte les providers.
</ParamField>
<ParamField path="model" type="string">
  Remplacement de provider/model (p. ex. `google/lyria-3-pro-preview`, `comfy/workflow`).
</ParamField>
<ParamField path="lyrics" type="string">
  Paroles facultatives lorsque le provider prend en charge la saisie explicite de paroles.
</ParamField>
<ParamField path="instrumental" type="boolean">
  Demander une sortie instrumentale uniquement lorsque le provider le prend en charge.
</ParamField>
<ParamField path="image" type="string">
  Chemin ou URL d'une image de référence unique.
</ParamField>
<ParamField path="images" type="string[]">
  Plusieurs images de référence (jusqu'à 10 sur les providers compatibles).
</ParamField>
<ParamField path="durationSeconds" type="number">
  Durée cible en secondes lorsque le provider prend en charge les indications de durée.
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  Indication de format de sortie lorsque le provider le prend en charge.
</ParamField>
<ParamField path="filename" type="string">
  Indication de nom de fichier de sortie.
</ParamField>

<Note>
  Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw valide tout de même les limites strictes telles que les comptes d'entrées avant soumission. Lorsqu'un provider prend en charge la durée mais utilise un maximum plus court que la valeur demandée, OpenClaw la limite à la durée prise en charge la plus proche. Les indications facultatives non prises en charge sont ignorées
  avec un avertissement lorsque le provider ou le modèle sélectionné ne peut pas les honorer. Les résultats de l'outil signalent les paramètres appliqués ; `details.normalization` capture toute correspondance entre les valeurs demandées et appliquées.
</Note>

Les délais d'expiration des requêtes du fournisseur sont une configuration de l'opérateur uniquement. OpenClaw utilise OpenClaw`agents.defaults.musicGenerationModel.timeoutMs` lorsqu'il est configuré, augmente les valeurs inférieures à 120000 ms à 120000 ms, et sinon définit par défaut les requêtes du fournisseur à 300000 ms.

## Comportement asynchrone

La génération de musique avec session s'exécute en tant que tâche d'arrière-plan :

- **Tâche en arrière-plan :** `music_generate` crée une tâche en arrière-plan, renvoie immédiatement une réponse de tâche démarrée, et publie la piste terminée ultérieurement dans un message de suivi de l'agent.
- **Prévention des doublons :** alors qu'une tâche est `queued` ou `running`, les appels `music_generate` ultérieurs dans la même session renvoient le statut de la tâche au lieu de démarrer une autre génération. Utilisez `action: "status"` pour vérifier explicitement.
- **Recherche de statut :** `openclaw tasks list` ou `openclaw tasks show <taskId>` inspecte les statuts en file d'attente, en cours d'exécution et terminaux.
- **Réveil à la fin :** OpenClaw réinjecte un événement de fin interne dans
  la même session afin que le modèle puisse écrire lui-même le suivi orienté utilisateur.
- **Indicateur d'invite :** les tours ultérieurs utilisateur/manuel dans la même session reçoivent un petit indice d'exécution lorsqu'une tâche musicale est déjà en cours, afin que le modèle n'appelle pas `music_generate` aveuglément à nouveau.
- **Solution de repli sans session :** les contextes directs/locaux sans vraie session
  d'agent s'exécutent en ligne et renvoient le résultat audio final dans le même tour.

### Cycle de vie de la tâche

| État        | Signification                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `queued`    | Tâche créée, en attente que le provider l'accepte.                                                  |
| `running`   | Le provider traite la demande (généralement 30 secondes à 3 minutes selon le provider et la durée). |
| `succeeded` | Piste prête ; l'agent se réveille et la publie dans la conversation.                                |
| `failed`    | Erreur ou délai d'attente du provider ; l'agent se réveille avec les détails de l'erreur.           |

Vérifier le statut depuis la CLI :

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## Configuration

### Sélection du model

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
      },
    },
  },
}
```

### Ordre de sélection du provider

OpenClaw essaie les providers dans cet ordre :

1. paramètre `model` de l'appel d'outil (si l'agent en spécifie un).
2. `musicGenerationModel.primary` à partir de la configuration.
3. `musicGenerationModel.fallbacks` dans l'ordre.
4. Détection automatique utilisant uniquement les valeurs par défaut des providers authentifiés :
   - d'abord le provider par défaut actuel ;
   - les providers de génération de musique enregistrés restants dans l'ordre des provider-id.

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` pour utiliser uniquement des entrées explicites `model`, `primary` et `fallbacks`.

## Notes sur les providers

<AccordionGroup>
  <Accordion title="ComfyUI">Basé sur le flux de travail et dépend du graphe configuré ainsi que du mappage des nœuds pour les champs d'invite/de sortie. Le plugin groupé `comfy` se connecte à l'outil `music_generate` partagé via le registre des fournisseurs de génération de musique.</Accordion>
  <Accordion title="fal">Utilise les points de terminaison du model fal via le chemin d'authentification partagé du provider. Le provider par défaut est `fal-ai/minimax-music/v2.6` et expose également `fal-ai/ace-step/prompt-to-audio` et `fal-ai/stable-audio-25/text-to-audio` pour les requêtes de type « prompt-to-audio ».</Accordion>
  <Accordion title="Google (Lyria 3)">Utilise la génération par lot Lyria 3. Le flux groupé actuel prend en charge le prompt, le texte des paroles facultatif et les images de référence facultatives.</Accordion>
  <Accordion title="MiniMax">Utilise le point de terminaison de lot `music_generation`. Prend en charge le prompt, les paroles optionnelles, le mode instrumental et la sortie mp3, soit via une clé d'API `minimax`API soit via `minimax-portal` OAuth.</Accordion>
  <Accordion title="OpenRouter">Utilise la sortie audio des complétions de chat OpenRouter avec le streaming activé. Le provider par défaut est `google/lyria-3-pro-preview` et expose également `openrouter/google/lyria-3-clip-preview`.</Accordion>
</AccordionGroup>

## Choosing the right path

- **Shared provider-backed** lorsque vous souhaitez la sélection de modèle, la redondance
  de fournisseur et le flux de tâche/état asynchrone intégré.
- **Plugin path (ComfyUI)** lorsque vous avez besoin d'un graphe de workflow personnalisé ou d'un
  fournisseur qui ne fait pas partie de la capacité musicale groupée partagée.

Si vous déboguez un comportement spécifique à ComfyUI, consultez
[ComfyUI](/fr/providers/comfy). Si vous déboguez le comportement partagé du
provider, commencez par [fal](/fr/providers/fal), [Google (Gemini)](/fr/providers/google),
[MiniMax](/fr/providers/minimax) ou [OpenRouter](/fr/providers/openrouter).

## Provider capability modes

Le contrat de génération de musique partagé prend en charge les déclarations de mode explicites :

- `generate` pour la génération par prompt uniquement.
- `edit` lorsque la requête inclut une ou plusieurs images de référence.

Les nouvelles implémentations de fournisseurs devraient préférer des blocs de mode explicites :

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

Les champs plats hérités tels que `maxInputImages`, `supportsLyrics` et
`supportsFormat` ne sont **pas** suffisants pour annoncer la prise en charge de l'édition. Les providers
devraient déclarer `generate` et `edit` explicitement afin que les tests en direct, les tests de contrat
et l'outil `music_generate` partagé puissent valider la prise en charge des modes
de manière déterministe.

## Live tests

Couverture en direct opt-in pour les fournisseurs groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Repo wrapper :

```bash
pnpm test:live:media music
```

Ce fichier en direct utilise par défaut les variables d'environnement de fournisseur déjà exportées avant les profils d'authentification stockés, et exécute à la fois la couverture `generate` et `edit` déclarée lorsque le fournisseur active le mode d'édition. Couverture actuelle :

- `google` : `generate` plus `edit`
- `fal` : `generate` uniquement
- `minimax` : `generate` uniquement
- `openrouter` : `generate` plus `edit`
- `comfy` : couverture en direct séparée pour Comfy, et non le balayage partagé des fournisseurs

Couverture en direct optionnelle pour le chemin musical ComfyUI inclus :

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Le fichier en direct Comfy couvre également les flux de travail d'image et de vidéo Comfy lorsque ces sections sont configurées.

## Connexes

- [Tâches d'arrière-plan](/fr/automation/tasks) — suivi des tâches pour les exécutions détachées de `music_generate`
- [ComfyUI](/fr/providers/comfy)
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) — config `musicGenerationModel`
- [Google (Gemini)](/fr/providers/google)
- [MiniMax](MiniMax/en/providers/minimax)
- [Modèles](/fr/concepts/models) — configuration et basculement des modèles
- [Aperçu des outils](/fr/tools)
