---
summary: "Générer et modifier des images via image_generate avec OpenAI, Google, fal, MiniMax, ComfyUI, DeepInfra, OpenRouter, LiteLLM, xAI, Vydra"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "Génération d'images"
sidebarTitle: "Génération d'images"
---

Le tool `image_generate` permet à l'agent de créer et de modifier des images à l'aide de vos providers configurés. Dans les sessions de chat, la génération d'images s'exécute de manière asynchrone : OpenClaw enregistre une tâche en arrière-plan, renvoie l'ID de tâche immédiatement et réveille l'agent lorsque le provider a terminé. L'agent de complétion doit envoyer les images générées via le tool `message`. Si la session du demandeur est inactive ou si son réveil actif échoue, et que certaines images générées manquent toujours à la livraison du tool de message, OpenClaw envoie un retour direct idempotent avec uniquement les images manquantes.

<Note>The tool n'apparaît que lorsqu'au moins un provider de génération d'images est disponible. Si vous ne voyez pas `image_generate` dans les tools de votre agent, configurez `agents.defaults.imageGenerationModel`API, configurez une clé API de provider, ou connectez-vous avec OpenAI Codex OAuth.</Note>

## Quick start

<Steps>
  <Step title="Configurer l'authentification">
    Définissez une clé API pour au moins un provider (par exemple `OPENAI_API_KEY`,
    `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) ou connectez-vous avec OpenAI Codex OAuth.
  </Step>
  <Step title="Choisir un model par défaut (facultatif)">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openai/gpt-image-2",
            timeoutMs: 180_000,
          },
        },
      },
    }
    ```

    Codex OAuth utilise la même référence de `openai/gpt-image-2` model. Lorsqu'un
    profil `openai-codex` OAuth est configuré, OpenClaw achemine les demandes d'images
    via ce profil OAuth au lieu d'essayer d'abord
    `OPENAI_API_KEY`. Une configuration explicite `models.providers.openai` (clé API,
    URL de base personnalisée/Azure) permet de revenir à l'itinéraire direct de l'API Images OpenAI API.

  </Step>
  <Step title="Demander à l'agent">
    _"Génère une image d'une mascotte robot sympathique."_

    L'agent appelle `image_generate` automatiquement. Aucune liste d'autorisation de tool
    nécessaire - elle est activée par défaut lorsqu'un provider est disponible. Le tool
    renvoie un identifiant de tâche en arrière-plan, puis l'agent de complétion envoie la pièce jointe
    générée via le tool `message` lorsqu'elle est prête.

  </Step>
</Steps>

<Warning>Pour les points de terminaison LAN compatibles avec OpenAI tels que LocalAI, conservez le `models.providers.openai.baseUrl` personnalisé et optez explicitement avec `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`. Les points de terminaison d'images privés et internes restent bloqués par défaut.</Warning>

## Routes courantes

| Objectif                                                              | Réf. de modèle                                     | Auth                                   |
| --------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| Génération d'images OpenAI avec facturation API                       | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| Génération d'images OpenAI avec authentification par abonnement Codex | `openai/gpt-image-2`                               | OpenAI Codex OAuth                     |
| OpenAI PNG/WebP avec fond transparent                                 | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` ou Codex OpenAI OAuth |
| Génération d'images DeepInfra                                         | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                    |
| fal Krea 2 génération expressive/dirigée par le style                 | `fal/krea/v2/medium/text-to-image`                 | `FAL_KEY`                              |
| Génération d'images OpenRouter                                        | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| Génération d'images LiteLLM                                           | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Génération d'images Google Gemini                                     | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`   |

Le même `image_generate` tool gère la conversion de texte en image et l'édition d'images de référence. Utilisez `image` pour une référence ou `images` pour plusieurs références.
Pour les modèles Krea 2 sur fal, ces références sont envoyées en tant que références de style
au lieu d'entrées d'édition.
Les indices de sortie pris en charge par le provider, tels que `quality`, `outputFormat` et
`background`, sont transmis si disponibles et signalés comme ignorés lorsqu'un
provider ne les prend pas en charge. La prise en charge groupée de l'arrière-plan transparent est
spécifique à OpenAI ; d'autres providers peuvent tout de même préserver la transparence PNG si leur
backend l'émet.

## Providers pris en charge

| Provider   | Modèle par défaut                       | Prise en charge de l'édition          | Auth                                                   |
| ---------- | --------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| ComfyUI    | `workflow`                              | Oui (1 image, configuré par workflow) | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour le cloud |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | Oui (1 image)                         | `DEEPINFRA_API_KEY`                                    |
| fal        | `fal-ai/flux/dev`                       | Oui (limites spécifiques au modèle)   | `FAL_KEY`                                              |
| Google     | `gemini-3.1-flash-image-preview`        | Oui                                   | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`                   |
| LiteLLM    | `gpt-image-2`                           | Oui (jusqu'à 5 images en entrée)      | `LITELLM_API_KEY`                                      |
| MiniMax    | `image-01`                              | Oui (référence de sujet)              | `MINIMAX_API_KEY` ou MiniMax OAuth (`minimax-portal`)  |
| OpenAI     | `gpt-image-2`                           | Oui (jusqu'à 4 images)                | `OPENAI_API_KEY` ou OpenAI Codex OAuth                 |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | Oui (jusqu'à 5 images en entrée)      | `OPENROUTER_API_KEY`                                   |
| Vydra      | `grok-imagine`                          | Non                                   | `VYDRA_API_KEY`                                        |
| xAI        | `grok-imagine-image`                    | Oui (jusqu'à 5 images)                | `XAI_API_KEY`                                          |

Utilisez `action: "list"` pour inspecter les providers et modèles disponibles lors de l'exécution :

```text
/tool image_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche de génération d'images active pour la
session actuelle :

```text
/tool image_generate action=status
```

## Fonctionnalités du fournisseur

| Fonctionnalité        | ComfyUI                | DeepInfra | fal                                                   | Google           | MiniMax             | OpenAI           | Vydra | xAI              |
| --------------------- | ---------------------- | --------- | ----------------------------------------------------- | ---------------- | ------------------- | ---------------- | ----- | ---------------- |
| Générer (nombre max)  | Défini par le workflow | 4         | 4                                                     | 4                | 9                   | 4                | 1     | 4                |
| Modifier / référence  | 1 image (workflow)     | 1 image   | Flux : 1 ; GPT : 10 ; Réfs style Krea : 10 ; NB2 : 14 | Jusqu'à 5 images | 1 image (réf sujet) | Jusqu'à 5 images | -     | Jusqu'à 5 images |
| Contrôle de la taille | -                      | ✓         | ✓                                                     | ✓                | -                   | Jusqu'à 4K       | -     | -                |
| Format d'image        | -                      | -         | ✓                                                     | ✓                | ✓                   | -                | -     | ✓                |
| Résolution (1K/2K/4K) | -                      | -         | ✓                                                     | ✓                | -                   | -                | -     | 1K, 2K           |

## Paramètres de l'outil

<ParamField path="prompt" type="string" required>
  Invite de génération d'image. Requis pour `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  Utilisez `"status"` pour inspecter la tâche de session active ou `"list"` pour inspecter les providers et models disponibles à l'exécution.
</ParamField>
<ParamField path="model" type="string">
  Substitution de provider/model (p. ex. `openai/gpt-image-2`). Utilisez `openai/gpt-image-1.5` pour les arrière-plans OpenAI transparents.
</ParamField>
<ParamField path="image" type="string">
  Chemin ou URL unique de l'image de référence pour le mode édition.
</ParamField>
<ParamField path="images" type="string[]">
  Plusieurs images de référence pour le mode édition ou les modèles de référence de style (jusqu'à 10 via l'outil partagé ; les limites spécifiques au provider s'appliquent toujours).
</ParamField>
<ParamField path="size" type="string">
  Indication de taille : `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`.
</ParamField>
<ParamField path="aspectRatio" type="string">
  Format d'image : `1:1`, `2:3`, `3:2`, `2.35:1`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, `4:1`, `1:4`, `8:1`, `1:8`. Les providers valident leur sous-ensemble spécifique au modèle.
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>
  Indication de résolution.
</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  Indication de qualité lorsque le provider la prend en charge.
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  Indication de format de sortie lorsque le provider la prend en charge.
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  Indication d'arrière-plan lorsque le provider la prend en charge. Utilisez `transparent` avec `outputFormat: "png"` ou `"webp"` pour les providers capables de transparence.
</ParamField>
<ParamField path="count" type="number">
  Nombre d'images à générer (1-4).
</ParamField>
<ParamField path="timeoutMs" type="number">
  Délai d'expiration de la requête du provider optionnel en millisecondes. Lorsque Codex appelle `image_generate` via des outils dynamiques, cette valeur par appel substitue toujours la valeur par défaut configurée et est plafonnée à 600000 ms.
</ParamField>
<ParamField path="filename" type="string">
  Indication de nom de fichier de sortie.
</ParamField>
<ParamField path="openai" type="object">
  Indications OpenAI uniquement : `background`, `moderation`, `outputCompression` et `user`.
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  Contrôle de créativité fal Krea 2. La valeur par défaut est `medium`.
</ParamField>

<Note>
  Tous les fournisseurs ne prennent pas en charge tous les paramètres. Lorsqu'un fournisseur de secours prend en charge une option de géométrie proche au lieu de celle demandée exactement, OpenClaw remappe vers la taille, le rapport d'aspect ou la résolution prise en charge la plus proche avant l'envoi. Les indicateurs de sortie non pris en charge sont ignorés pour les fournisseurs qui ne
  déclarent pas de prise en charge et signalés dans le résultat de l'outil. Les résultats de l'outil signalent les paramètres appliqués ; `details.normalization` capture toute demande vers traduction appliquée.
</Note>

## Configuration

### Sélection du modèle

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        timeoutMs: 180_000,
        fallbacks: ["openrouter/google/gemini-3.1-flash-image-preview", "google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Ordre de sélection du fournisseur

OpenClaw essaie les fournisseurs dans cet ordre :

1. **paramètre `model`** de l'appel d'outil (si l'agent en spécifie un).
2. **`imageGenerationModel.primary`** à partir de la configuration.
3. **`imageGenerationModel.fallbacks`** dans l'ordre.
4. **Détection automatique** - uniquement pour les fournisseurs par défaut avec authentification :
   - le fournisseur par défaut actuel en premier ;
   - les fournisseurs de génération d'images restants enregistrés dans l'ordre des ID de fournisseur.

Si un fournisseur échoue (erreur d'authentification, limite de débit, etc.), le candidat
configuré suivant est essayé automatiquement. Si tous échouent, l'erreur inclut des détails
de chaque tentative.

<AccordionGroup>
  <Accordion title="Les remplacements de modèle par appel sont exacts">Un remplacement de `model` par appel n'essaie que ce fournisseur/modèle et ne continue pas vers les fournisseurs principaux/secours configurés ou détectés automatiquement.</Accordion>
  <Accordion title="La détection automatique est consciente de l'authentification">Un fournisseur par défaut n'entre dans la liste des candidats que lorsque OpenClaw peut réellement authentifier ce fournisseur. Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` pour utiliser uniquement les entrées explicites `model`, `primary` et `fallbacks`.</Accordion>
  <Accordion title="Délais d'expiration">
    Définissez `agents.defaults.imageGenerationModel.timeoutMs` pour les principaux d'images lents. Un paramètre d'outil `timeoutMs` par appel remplace la valeur par défaut configurée, et les valeurs par défaut configurées remplacent les valeurs par défaut du fournisseur créées par le plugin. Les fournisseurs d'images hébergés par Google et OpenRouter utilisent des valeurs par défaut de 180
    secondes ; la génération d'images xAI et Azure OpenAI utilise 600 secondes. Les appels d'outils dynamiques Codex utilisent une valeur par défaut de pont `image_generate` de 120 secondes et respectent le même budget de délai d'expiration lorsqu'il est configuré, dans la limite du maximum de 600000 ms du pont d'outils dynamiques de OpenClaw.
  </Accordion>
  <Accordion title="Inspecter lors de l'exécution">Utilisez `action: "list"` pour inspecter les fournisseurs actuellement enregistrés, leurs modèles par défaut et les indices de variables d'environnement d'authentification.</Accordion>
</AccordionGroup>

### Modification d'images

OpenAI, OpenRouter, Google, DeepInfra, fal, MiniMax, ComfyUI et xAI prennent en charge la modification
des images de référence. Les modèles Krea 2 sur fal utilisent les mêmes champs `image` / `images`
comme références de style au lieu d'entrées de modification. Transmettez un chemin ou une URL d'image de référence :

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, OpenRouter, Google et xAI prennent en charge jusqu'à 5 images de référence via le
paramètre `images`. fal prend en charge 1 image de référence pour Flux image-to-image, jusqu'à
10 pour les modifications GPT Image 2, jusqu'à 10 références de style pour Krea 2, et jusqu'à
14 pour les modifications Nano Banana 2. MiniMax et ComfyUI prennent en charge 1.

## Approfondissements sur les fournisseurs

<AccordionGroup>
  <Accordion title="OpenAIOpenAI gpt-image-2 (et gpt-image-1.5)"OpenAI>
    La génération d'images OpenAI est réglée par défaut sur `openai/gpt-image-2`. Si un
    profil `openai-codex`OAuthOpenClawOAuth OAuth est configuré, OpenClaw réutilise le même
    profil OAuth utilisé par les modèles de chat d'abonnement Codex et envoie la
    demande d'image via le backend Codex Responses. Les URL de base Codex héritées telles que `https://chatgpt.com/backend-api` sont canonicalisées en
    `https://chatgpt.com/backend-api/codex`OpenClaw pour les demandes d'images. OpenClaw
    ne bascule **pas** silencieusement vers `OPENAI_API_KEY` pour cette demande -
    pour forcer le routage direct vers l'API Images OpenAIAPI, configurez
    `models.providers.openai`API explicitement avec une clé API, une URL de base personnalisée,
    ou un point de terminaison Azure.

    Les modèles `openai/gpt-image-1.5`, `openai/gpt-image-1` et
    `openai/gpt-image-1-mini` peuvent toujours être sélectionnés explicitement. Utilisez
    `gpt-image-1.5` pour une sortie PNG/WebP avec fond transparent ; l'API actuelle
    `gpt-image-2` rejette `background: "transparent"`.

    `gpt-image-2` prend en charge la génération de texte vers image et
    l'édition d'image de référence via le même tool `image_generate`OpenClaw.
    OpenClaw transmet `prompt`, `count`, `size`, `quality`, `outputFormat`OpenAIOpenAI,
    et les images de référence à OpenAI. OpenAI ne reçoit **pas**
    `aspectRatio` ou `resolution`OpenClaw directement ; lorsque cela est possible, OpenClaw mappe
    ceux-ci vers un `size`OpenAI pris en charge, sinon le tool les signale comme
    des substitutions ignorées.

    Les options spécifiques à OpenAI se trouvent sous l'objet `openai` :

    ```json
    {
      "quality": "low",
      "outputFormat": "jpeg",
      "openai": {
        "background": "opaque",
        "moderation": "low",
        "outputCompression": 60,
        "user": "end-user-42"
      }
    }
    ```

    `openai.background` accepte `transparent`, `opaque` ou `auto` ;
    les sorties transparentes nécessitent `outputFormat` `png` ou `webp`OpenAIOpenClaw et un
    modèle d'image OpenAI capable de transparence. OpenClaw achemine les demandes
    `gpt-image-2` par défaut avec fond transparent vers `gpt-image-1.5`.
    `openai.outputCompression` s'applique aux sorties JPEG/WebP et est ignoré
    pour les sorties PNG.

    L'indicateur `background`OpenAI de niveau supérieur est neutre pour le provider et mappe actuellement
    vers le même champ de demande `background`OpenAI OpenAI lorsque le provider OpenAI
    est sélectionné. Les providers qui ne déclarent pas la prise en charge de l'arrière-plan le renvoient
    dans `ignoredOverrides`OpenAIOpenAI au lieu de recevoir le paramètre non pris en charge.

    Pour acheminer la génération d'images OpenAI via un déploiement Azure OpenAI
    au lieu de `api.openai.com`OpenAI, consultez
    [Points de terminaison Azure OpenAI](/fr/providers/openai#azure-openai-endpoints).

  </Accordion>
  <Accordion title="OpenRouterModèles d'image OpenRouter"OpenRouter>
    La génération d'images OpenRouter utilise le même `OPENROUTER_API_KEY`OpenRouterAPIOpenRouter et
    transite par l'API de complétion de chat d'images d'OpenRouter. Sélectionnez
    des modèles d'image OpenRouter avec le préfixe `openrouter/` :

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openrouter/google/gemini-3.1-flash-image-preview",
          },
        },
      },
    }
    ```OpenClaw

    OpenClaw transmet `prompt`, `count`, les images de référence, et
    les indices `aspectRatio` / `resolution`OpenRouterOpenRouter compatibles avec Gemini à OpenRouter.
    Les raccourcis actuels de modèles d'image OpenRouter intégrés incluent
    `google/gemini-3.1-flash-image-preview`,
    `google/gemini-3-pro-image-preview`, et `openai/gpt-5.4-image-2`. Utilisez
    `action: "list"` pour voir ce que votre plugin configuré expose.

  </Accordion>
  <Accordion title="fal Krea 2">
    Les modèles Krea 2 sur fal utilisent le schéma Krea natif de fal au lieu du schéma générique
    `image_size`OpenClaw utilisé par Flux. OpenClaw envoie :

    - `aspect_ratio` pour les indices de format d'image
    - `creativity`, par défaut à `medium`
    - `image_style_references` lorsque `image` ou `images` sont fournis

    Sélectionnez Krea 2 Medium pour une illustration expressive plus rapide et Krea 2 Large
    pour des looks photoréalistes et texturés plus lents et plus détaillés :

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "fal/krea/v2/medium/text-to-image",
          },
        },
      },
    }
    ```

    Krea 2 renvoie actuellement une image par requête. Préférez `aspectRatio`OpenClaw pour
    Krea ; OpenClaw mappe `size` au format d'image Krea pris en charge le plus proche et
    rejette `resolution` pour Krea plutôt que de l'ignorer. Utilisez `fal.creativity`
    lorsque vous souhaitez un niveau de créativité natif de Krea :

    ```json
    {
      "model": "fal/krea/v2/medium/text-to-image",
      "prompt": "A cyber zine portrait with risograph texture",
      "aspectRatio": "9:16",
      "fal": {
        "creativity": "high"
      }
    }
    ```

  </Accordion>
  <Accordion title="MiniMaxMiniMax double-auth"MiniMaxMiniMax>
    La génération d'images MiniMax est disponible via les deux chemins d'authentification MiniMax intégrés :

    - `minimax/image-01`API pour les configurations avec clé API
    - `minimax-portal/image-01`OAuth pour les configurations OAuth

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    Le provider xAI intégré utilise `/v1/images/generations` pour les requêtes basées uniquement sur une invite (prompt) et `/v1/images/edits` lorsque `image` ou `images` est présent.

    - Modèles : `xai/grok-imagine-image`, `xai/grok-imagine-image-quality`
    - Nombre : jusqu'à 4
    - Références : une `image` ou jusqu'à cinq `images`
    - Rapports d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`OpenClawOpenClaw
    - Sorties : renvoyées sous forme de pièces jointes d'images gérées par OpenClaw

    OpenClaw n'expose pas intentionnellement les `quality`, `mask`, `user` natifs xAI, ni les rapports d'aspect natifs supplémentaires, tant que ces contrôles n'existent pas dans le contrat `image_generate` multi-fournisseurs partagé.

  </Accordion>
</AccordionGroup>

## Exemples

<Tabs>
  <Tab title="Générer (paysage 4K)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="Générer (PNG transparent)">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```CLI

CLI équivalent :

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="Générer (deux carrés)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="Modifier (une référence)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="Modifier (références multiples)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab title="Références de style Krea">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

Les mêmes indicateurs `--output-format` et `--background` sont disponibles sur
`openclaw infer image edit` ; `--openai-background` reste un alias
spécifique à OpenAI. Les fournisseurs groupés autres que OpenAI ne déclarent
pas aujourd'hui de contrôle explicite en arrière-plan, donc `background: "transparent"` est signalé
comme ignoré pour eux.

## Connexes

- [Vue d'ensemble des outils](/fr/tools) - tous les outils d'agent disponibles
- [ComfyUI](/fr/providers/comfy) - configuration du flux de travail ComfyUI local et Comfy Cloud
- [fal](/fr/providers/fal) - configuration du fournisseur d'images et de vidéos fal
- [Google (Gemini)](/fr/providers/google) - configuration du fournisseur d'images Gemini
- [MiniMax](/fr/providers/minimax) - configuration du fournisseur d'images MiniMax
- [OpenAI](/fr/providers/openai) - configuration du fournisseur d'images OpenAI
- [Vydra](/fr/providers/vydra) - configuration de l'image, de la vidéo et de la synthèse vocale Vydra
- [xAI](/fr/providers/xai) - configuration de l'image, de la vidéo, de la recherche, de l'exécution de code et du TTS Grok
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) - configuration `imageGenerationModel`
- [Modèles](/fr/concepts/models) - configuration des modèles et basculement
