---
summary: "Générer de la musique via music_generate sur Google Lyria, MiniMax et les workflows ComfyUI"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "Génération de musique"
sidebarTitle: "Génération de musique"
---

Le tool `music_generate` permet à l'agent de créer de la musique ou de l'audio via la
capacité de génération de musique partagée avec des providers configurés — Google,
MiniMax et ComfyUI configuré par workflow aujourd'hui.

Pour les exécutions d'agent soutenues par une session, OpenClaw lance la génération de musique en tant que
tâche d'arrière-plan, la suit dans le registre des tâches, puis réveille l'agent à nouveau
lorsque la piste est prête afin que l'agent puisse renvoyer l'audio terminé dans le
channel d'origine.

<Note>L'outil partagé intégré n'apparaît que lorsqu'au moins un provider de génération de musique est disponible. Si vous ne voyez pas `music_generate` dans les outils de votre agent, configurez `agents.defaults.musicGenerationModel` ou configurez une clé API de provider.</Note>

## Quick start

<Tabs>
  <Tab title="Shared provider-backed">
    <Steps>
      <Step title="Configure auth">
        Définissez une clé API pour au moins un provider — par exemple
        `GEMINI_API_KEY` ou `MINIMAX_API_KEY`.
      </Step>
      <Step title="Pick a default model (optional)">
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
      <Step title="Ask the agent">
        _"Générer une piste synthpop entraînante sur un trajet nocturne dans une
        ville néon."_

        L'agent appelle `music_generate` automatiquement. Aucune liste d'autorisation

de tool n'est nécessaire.
</Step>
</Steps>

    Pour les contextes synchrones directs sans exécution d'agent soutenue par une session,
    l'outil intégré revient toujours à la génération en ligne et renvoie
    le chemin du média final dans le résultat de l'outil.

  </Tab>
  <Tab title="Flux de travail ComfyUI">
    <Steps>
      <Step title="Configurer le flux de travail">
        Configurez `plugins.entries.comfy.config.music` avec un JSON de
        flux de travail et des nœuds de prompt/sortie.
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

| Fournisseur | Modèle par défaut      | Référence des entrées | Contrôles pris en charge                                  | Auth                                   |
| ----------- | ---------------------- | --------------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI     | `workflow`             | Jusqu'à 1 image       | Musique ou audio défini par le flux de travail            | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google      | `lyria-3-clip-preview` | Jusqu'à 10 images     | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax     | `music-2.6`            | Aucun                 | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY` ou MiniMax OAuth     |

### Matrice des capacités

Le contrat de mode explicite utilisé par `music_generate`, les tests de contrat et le
live sweep partagé :

| Fournisseur | `generate` | `edit` | Limite de modification | Voies partagées en direct                                                            |
| ----------- | :--------: | :----: | ---------------------- | ------------------------------------------------------------------------------------ |
| ComfyUI     |     ✓      |   ✓    | 1 image                | Non inclus dans le sweep partagé ; couvert par `extensions/comfy/comfy.live.test.ts` |
| Google      |     ✓      |   ✓    | 10 images              | `generate`, `edit`                                                                   |
| MiniMax     |     ✓      |   —    | Aucun                  | `generate`                                                                           |

Utilisez `action: "list"` pour inspecter les fournisseurs et modèles partagés disponibles à
l'exécution :

```text
/tool music_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche musicale active sauvegardée par session :

```text
/tool music_generate action=status
```

Exemple de génération directe :

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## Paramètres de l'outil

<ParamField path="prompt" type="string" required>
  Invite de génération de musique. Requis pour `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` renvoie la tâche de session actuelle ; `"list"` inspecte les providers.
</ParamField>
<ParamField path="model" type="string">
  Surcharge de provider/model (p. ex. `google/lyria-3-pro-preview`, `comfy/workflow`).
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
  Plusieurs images de référence (jusqu'à 10 sur les providers prenant en charge cette fonctionnalité).
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
<ParamField path="timeoutMs" type="number">
  Délai d'expiration facultatif de la demande du provider en millisecondes.
</ParamField>

<Note>
  Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw valide néanmoins les limites strictes telles que les nombres d'entrées avant la soumission. Lorsqu'un provider prend en charge la durée mais utilise un maximum plus court que la valeur demandée, OpenClaw réduit la durée à la valeur prise en charge la plus proche. Les indications facultatives non prises en charge sont
  ignorées avec un avertissement lorsque le provider ou le modèle sélectionné ne peut pas les respecter. Les résultats de l'outil signalent les paramètres appliqués ; `details.normalization` capture toute correspondance entre la demande et l'application.
</Note>

## Comportement asynchrone

La génération de musique avec session s'exécute en tant que tâche d'arrière-plan :

- **Tâche d'arrière-plan :** `music_generate` crée une tâche d'arrière-plan, renvoie une réponse de démarrage/tâche immédiatement, et publie la piste terminée ultérieurement dans un message de suivi de l'agent.
- **Prévention des doublons :** tant qu'une tâche est `queued` ou `running`, les appels `music_generate` ultérieurs dans la même session renvoient le statut de la tâche au lieu de démarrer une autre génération. Utilisez `action: "status"` pour vérifier explicitement.
- **Recherche de statut :** `openclaw tasks list` ou `openclaw tasks show <taskId>` inspectent les statuts mis en file d'attente, en cours d'exécution et terminaux.
- **Réveil à l'achèvement :** OpenClaw réinjecte un événement d'achèvement interne dans la même session pour que le modèle puisse écrire lui-même le suivi destiné à l'utilisateur.
- **Indicateur d'invite (prompt hint) :** les tours ultérieurs de l'utilisateur ou manuels dans la même session reçoivent un petit indice d'exécution lorsqu'une tâche musicale est déjà en cours, pour que le modèle n'appelle pas `music_generate` aveuglément à nouveau.
- **Repli sans session :** les contextes directs/locaux sans véritable session d'agent s'exécutent en ligne et renvoient le résultat audio final dans le même tour.

### Cycle de vie de la tâche

| État        | Signification                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `queued`    | Tâche créée, en attente que le fournisseur l'accepte.                                                     |
| `running`   | Le fournisseur traite la demande (généralement 30 secondes à 3 minutes selon le fournisseur et la durée). |
| `succeeded` | Piste prête ; l'agent se réveille et la publie dans la conversation.                                      |
| `failed`    | Erreur ou dépassement de délai du fournisseur ; l'agent se réveille avec les détails de l'erreur.         |

Vérifier le statut depuis le CLI :

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## Configuration

### Sélection du modèle

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.6"],
      },
    },
  },
}
```

### Ordre de sélection du fournisseur

OpenClaw essaie les fournisseurs dans cet ordre :

1. Paramètre `model` de l'appel d'outil (si l'agent en spécifie un).
2. `musicGenerationModel.primary` à partir de la configuration.
3. `musicGenerationModel.fallbacks` dans l'ordre.
4. Détection automatique utilisant uniquement les valeurs par défaut du fournisseur prises en charge par l'authentification :
   - le fournisseur par défaut actuel en premier ;
   - les fournisseurs de génération de musique enregistrés restants dans l'ordre de leur ID de fournisseur.

Si un fournisseur échoue, le candidat suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` pour utiliser uniquement
les entrées explicites `model`, `primary` et `fallbacks`.

## Notes sur les fournisseurs

<AccordionGroup>
  <Accordion title="ComfyUI">Basé sur un workflow et dépend du graphe configuré ainsi que du mappage des nœuds pour les champs de prompt/sortie. Le plugin `comfy` inclus se connecte à l'outil partagé `music_generate` via le registre des fournisseurs de génération musicale.</Accordion>
  <Accordion title="Google (Lyria 3)">Utilise la génération par lots Lyria 3. Le flux groupé actuel prend en charge le prompt, le texte de paroles facultatif et les images de référence facultatives.</Accordion>
  <Accordion title="MiniMax">Utilise le point de terminaison de lot `music_generation`. Prend en charge le prompt, les paroles facultatives, le mode instrumental, le contrôle de la durée et la sortie mp3 via soit l'auth par clé `minimax` MiniMax, soit `minimax-portal` API.</Accordion>
</AccordionGroup>

## Choisir le bon chemin

- **Fournisseur partagé** lorsque vous souhaitez la sélection de modèle, la bascule
  de fournisseur et le flux de tâche/état asynchrone intégré.
- **Chemin du plugin (ComfyUI)** lorsque vous avez besoin d'un graphe de workflow personnalisé ou d'un
  fournisseur qui ne fait pas partie de la fonctionnalité musicale groupée partagée.

Si vous déboguez un comportement spécifique à ComfyUI, consultez
[ComfyUI](/fr/providers/comfy). Si vous déboguez le comportement du fournisseur partagé,
commencez par [Google (Gemini)](/fr/providers/google) ou
[MiniMax](/fr/providers/minimax).

## Modes de capacité du fournisseur

Le contrat de génération musicale partagée prend en charge les déclarations de mode explicites :

- `generate` pour la génération avec prompt uniquement.
- `edit` lorsque la demande inclut une ou plusieurs images de référence.

Les nouvelles implémentations de fournisseurs devraient préférer les blocs de mode explicites :

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
`supportsFormat` ne sont **pas** suffisants pour annoncer la prise en charge de l'édition. Les fournisseurs
doivent déclarer `generate` et `edit` explicitement afin que les tests en direct, les tests
de contrat et l'outil `music_generate` partagé puissent valider la prise en charge du mode
de manière déterministe.

## Tests en direct

Couverture en direct par opt-in pour les fournisseurs groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Wrapper de dépôt :

```bash
pnpm test:live:media music
```

Ce fichier en direct charge les variables d'environnement du fournisseur manquantes depuis `~/.profile`, préfère
les clés API live/env aux profils d'authentification stockés par défaut, et exécute à la fois
la couverture `generate` et la couverture déclarée `edit` lorsque le fournisseur active le mode
édition. Couverture actuelle :

- `google` : `generate` plus `edit`
- `minimax` : `generate` uniquement
- `comfy` : couverture en direct Comfy distincte, et non le balayage du fournisseur partagé

Couverture en direct par opt-in pour le chemin musical ComfyUI groupé :

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Le fichier en direct Comfy couvre également les flux de travail d'image et de vidéo Comfy lorsque ces
sections sont configurées.

## Connexes

- [Tâches d'arrière-plan](/fr/automation/tasks) — suivi des tâches pour les exécutions `music_generate` détachées
- [ComfyUI](/fr/providers/comfy)
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) — config `musicGenerationModel`
- [Google (Gemini)](/fr/providers/google)
- [MiniMax](/fr/providers/minimax)
- [Modèles](/fr/concepts/models) — configuration et basculement des modèles
- [Aperçu des outils](/fr/tools)
