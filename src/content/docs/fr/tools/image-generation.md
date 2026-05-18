---
summary: "Générer et modifier des images via image_generate avec OpenAI, Google, fal, MiniMax, ComfyUI, DeepInfra, OpenRouter, LiteLLM, xAI, Vydra"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "Génération d'images"
sidebarTitle: "Génération d'images"
---

L'outil `image_generate` permet à l'agent de créer et de modifier des images en utilisant vos
providers configurés. Dans les sessions de chat, la génération d'images s'exécute de manière asynchrone :
OpenClaw enregistre une tâche en arrière-plan, renvoie l'ID de tâche immédiatement, et réveille
l'agent lorsque le provider a terminé. L'agent de complétion doit envoyer les images
générées via l'outil `message` ; OpenClaw ne publie pas automatiquement de réponse finale privée
en secours.

<Note>L'outil n'apparaît que lorsqu'au moins un provider de génération d'images est disponible. Si vous ne voyez pas `image_generate` dans les outils de votre agent, configurez `agents.defaults.imageGenerationModel`, configurez une clé API de provider, ou connectez-vous avec OpenAI Codex OAuth.</Note>

## Quick start

<Steps>
  <Step title="Configurer l'auth">
    Définissez une clé API pour au moins un provider (par exemple `OPENAI_API_KEY`,
    `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) ou connectez-vous avec OpenAI Codex OAuth.
  </Step>
  <Step title="Choisir un modèle par défaut (facultatif)">
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
    ```OAuth

    Codex OAuth utilise la même référence de modèle `openai/gpt-image-2`. Lorsqu'un profil OAuth `openai-codex`OAuthOpenClawOAuth est configuré, OpenClaw achemine les demandes d'images via ce profil OAuth au lieu d'essayer d'abord `OPENAI_API_KEY`. Une configuration explicite `models.providers.openai`APIOpenAIAPI (clé d'API, URL de base personnalisée/Azure) permet de revenir à l'itinéraire direct de l'API d'images OpenAI.

  </Step>
  <Step title="Demander à l'agent">
    _"Génère une image d'une mascotte de robot amicale."_

    L'agent appelle `image_generate` automatiquement. Aucune liste d'autorisation d'outils n'est nécessaire - il est activé par défaut lorsqu'un fournisseur est disponible. L'outil renvoie un identifiant de tâche en arrière-plan, puis l'agent de complétion envoie la pièce jointe générée via l'outil `message` lorsqu'elle est prête.

  </Step>
</Steps>

<Warning>Pour les points de terminaison LAN compatibles avec OpenAI tels que LocalAI, gardez le OpenAI`models.providers.openai.baseUrl` personnalisé et optez explicitement pour `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`. Les points de terminaison d'images privés et internes restent bloqués par défaut.</Warning>

## Routes courantes

| Objectif                                                              | Réf. de modèle                                     | Auth                                              |
| --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Génération d'images OpenAI avec facturation API                       | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                                  |
| Génération d'images OpenAI avec authentification par abonnement Codex | `openai/gpt-image-2`                               | OpenAI Codex OAuth                                |
| OpenAI PNG/WebP avec fond transparent                                 | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY`OpenAIOAuth ou OpenAI Codex OAuth |
| Génération d'images DeepInfra                                         | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                               |
| Génération d'images OpenRouter                                        | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                              |
| Génération d'images LiteLLM                                           | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                                 |
| Génération d'images Google Gemini                                     | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`              |

Le même `image_generate` tool gère la génération de texte vers image et l'édition d'image de référence. Utilisez `image` pour une référence ou `images` pour plusieurs références.
Les indications de sortie prises en charge par le provider, telles que `quality`, `outputFormat` et `background`, sont transmises lorsqu'elles sont disponibles et signalées comme ignorées lorsqu'un provider ne les prend pas en charge. La prise en charge groupée de l'arrière-plan transparent est spécifique à OpenAI ; d'autres providers peuvent tout de même préserver la transparence PNG si leur backend l'émet.

## Providers pris en charge

| Provider   | Modèle par défaut                       | Prise en charge de la modification        | Auth                                                  |
| ---------- | --------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | Oui (1 image, configurée par le workflow) | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` pour cloud   |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | Oui (1 image)                             | `DEEPINFRA_API_KEY`                                   |
| fal        | `fal-ai/flux/dev`                       | Oui (limites spécifiques au model)        | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | Oui                                       | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | Oui (jusqu'à 5 images d'entrée)           | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | Oui (référence du sujet)                  | `MINIMAX_API_KEY` ou MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | Oui (jusqu'à 4 images)                    | `OPENAI_API_KEY` ou OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | Oui (jusqu'à 5 images en entrée)          | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | Non                                       | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | Oui (jusqu'à 5 images)                    | `XAI_API_KEY`                                         |

Utilisez `action: "list"` pour inspecter les providers et modèles disponibles lors de l'exécution :

```text
/tool image_generate action=list
```

Utilisez `action: "status"` pour inspecter la tâche de génération d'image active pour la session actuelle :

```text
/tool image_generate action=status
```

## Fonctionnalités du provider

| Fonctionnalité        | ComfyUI                | DeepInfra | fal                            | Google           | MiniMax              | OpenAI           | Vydra | xAI              |
| --------------------- | ---------------------- | --------- | ------------------------------ | ---------------- | -------------------- | ---------------- | ----- | ---------------- |
| Générer (nombre max)  | Défini par le workflow | 4         | 4                              | 4                | 9                    | 4                | 1     | 4                |
| Modifier / référence  | 1 image (workflow)     | 1 image   | Flux : 1 ; GPT : 10 ; NB2 : 14 | Jusqu'à 5 images | 1 image (réf. sujet) | Jusqu'à 5 images | -     | Jusqu'à 5 images |
| Contrôle de la taille | -                      | ✓         | ✓                              | ✓                | -                    | Jusqu'à 4K       | -     | -                |
| Rapport d'aspect      | -                      | -         | ✓                              | ✓                | ✓                    | -                | -     | ✓                |
| Résolution (1K/2K/4K) | -                      | -         | ✓                              | ✓                | -                    | -                | -     | 1K, 2K           |

## Paramètres de l'outil

<ParamField path="prompt" type="string" required>
  Invite de génération d'image. Requis pour `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  Utilisez `"status"` pour inspecter la tâche de la session active ou `"list"` pour inspecter les providers et modèles disponibles lors de l'exécution.
</ParamField>
<ParamField path="model" type="string">
  Remplacement de provider/modèle (p. ex. `openai/gpt-image-2`). Utilisez `openai/gpt-image-1.5` pour des arrière-plans transparents OpenAI.
</ParamField>
<ParamField path="image" type="string">
  Chemin ou URL d'une seule image de référence pour le mode édition.
</ParamField>
<ParamField path="images" type="string[]">
  Images de référence multiples pour le mode édition (jusqu'à 5 sur les providers prenant en charge).
</ParamField>
<ParamField path="size" type="string">
  Indication de taille : `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`.
</ParamField>
<ParamField path="aspectRatio" type="string">
  Format d'image : `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`.
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
  Indication d'arrière-plan lorsque le provider la prend en charge. Utilisez `transparent` avec `outputFormat: "png"` ou `"webp"` pour les providers prenant en charge la transparence.
</ParamField>
<ParamField path="count" type="number">
  Nombre d'images à générer (1-4).
</ParamField>
<ParamField path="timeoutMs" type="number">
  Délai d'expiration de la demande du provider optionnel en millisecondes. Lorsque Codex appelle `image_generate` via les outils dynamiques, cette valeur par appel remplace toujours la valeur par défaut configurée et est plafonnée à 600 000 ms.
</ParamField>
<ParamField path="filename" type="string">
  Indication de nom de fichier de sortie.
</ParamField>
<ParamField path="openai" type="object">
  Indices exclusifs OpenAI : `background`, `moderation`, `outputCompression` et `user`.
</ParamField>

<Note>
  Tous les providers ne prennent pas en charge tous les paramètres. Lorsqu'un provider de secours prend en charge une option géométrique proche au lieu de celle exactement demandée, OpenClaw la remappe vers la taille, le rapport d'aspect ou la résolution la plus proche prise en charge avant l'envoi. Les indicateurs de sortie non pris en charge sont ignorés pour les providers qui ne déclarent pas
  de prise en charge et signalés dans le résultat de l'outil. Les résultats de l'outil signalent les paramètres appliqués ; `details.normalization` capture toute traduction demandé vers appliqué.
</Note>

## Configuration

### Sélection du model

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

### Ordre de sélection des providers

OpenClaw essaie les providers dans cet ordre :

1. **Paramètre `model`** issu de l'appel de l'outil (si l'agent en spécifie un).
2. **`imageGenerationModel.primary`** depuis la configuration.
3. **`imageGenerationModel.fallbacks`** dans l'ordre.
4. **Détection automatique** - uniquement pour les providers par défaut avec authentification :
   - le provider par défaut actuel en premier ;
   - les providers de génération d'images enregistrés restants dans l'ordre des ID de provider.

Si un provider échoue (erreur d'authentification, limite de débit, etc.), le candidat
configuré suivant est essayé automatiquement. Si tous échouent, l'erreur inclut les détails
de chaque tentative.

<AccordionGroup>
  <Accordion title="Les remplacements de model par appel sont exacts">Un remplacement de `model` par appel n'essaie que ce provider/model et ne continue pas vers les providers principaux/secours configurés ou détectés automatiquement.</Accordion>
  <Accordion title="La détection automatique est consciente de l'authentification">Un provider par défaut n'entre dans la liste des candidats que lorsque OpenClaw peut réellement authentifier ce provider. Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` pour utiliser uniquement les entrées explicites `model`, `primary` et `fallbacks`.</Accordion>
  <Accordion title="Délais d'expiration">
    Définissez `agents.defaults.imageGenerationModel.timeoutMs` pour les serveurs principaux d'image lents. Un paramètre d'`timeoutMs` tool par appel remplace la valeur par défaut configurée. Les fournisseurs d'images hébergés par Google, OpenRouter et xAI utilisent des délais par défaut de 180 secondes ; la génération d'images Azure OpenAI utilise 600 secondes. Les appels d'`timeoutMs` tool
    dynamiques de Codex respectent le même budget de délai, limité par le maximum de 600000 ms du pont d'`timeoutMs` tool dynamique d'OpenClaw.
  </Accordion>
  <Accordion title="Inspecter à l'exécution">Utilisez `action: "list"` pour inspecter les fournisseurs actuellement enregistrés, leurs modèles par défaut et les indices de variables d'environnement d'authentification.</Accordion>
</AccordionGroup>

### Modification d'images

OpenAI, OpenRouter, Google, DeepInfra, fal, MiniMax, ComfyUI et xAI prennent en charge la modification
des images de référence. Transmettez un chemin ou une URL d'image de référence :

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, OpenRouter, Google et xAI prennent en charge jusqu'à 5 images de référence via le
paramètre `images`. fal prend en charge 1 image de référence pour Flux image-to-image, jusqu'à
10 pour les modifications GPT Image 2 et jusqu'à 14 pour les modifications Nano Banana 2. MiniMax et
ComfyUI prennent en charge 1.

## Approfondissement des fournisseurs

<AccordionGroup>
  <Accordion title="OpenAIOpenAI gpt-image-2 (et gpt-image-1.5)"OpenAI>
    La génération d'images OpenAI est réglée par défaut sur `openai/gpt-image-2`. Si un
    profil `openai-codex` OAuth est configuré, OpenClaw réutilise le même
    profil OAuth que celui utilisé par les modèles de chat d'abonnement Codex et envoie la
    demande d'image via le backend Codex Responses. Les URL de base Codex héritées telles que
    `https://chatgpt.com/backend-api` sont canonisées en
    `https://chatgpt.com/backend-api/codex` pour les demandes d'images. OpenClaw
    n'effectue **pas** de retour silencieux à `OPENAI_API_KEY`OpenAIAPI pour cette demande -
    pour forcer le routage direct vers l'API OpenAI Images, configurez
    `models.providers.openai` explicitement avec une clé API, une URL de base personnalisée,
    ou un point de terminaison Azure.

    Les modèles `openai/gpt-image-1.5`, `openai/gpt-image-1` et
    `openai/gpt-image-1-mini` peuvent toujours être sélectionnés explicitement. Utilisez
    `gpt-image-1.5` pour une sortie PNG/WebP avec fond transparent ; l'API `gpt-image-2` actuelle
    rejette `background: "transparent"`.

    `gpt-image-2` prend en charge à la fois la génération de texte vers image et
    l'édition d'image de référence via le même `image_generate` tool.
    OpenClaw transmet `prompt`, `count`, `size`, `quality`, `outputFormat`,
    et les images de référence à OpenAI. OpenAI ne reçoit **pas**
    directement `aspectRatio` ou `resolution` ; lorsque cela est possible, OpenClaw les mappe
    vers un `size` pris en charge, sinon le tool les signale comme des
    paramètres de substitution ignorés.

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
    les sorties transparentes nécessitent `outputFormat` `png` ou `webp` et un
    modèle d'image OpenAI compatible avec la transparence. OpenClaw route par défaut les demandes
    de fond transparent `gpt-image-2` vers `gpt-image-1.5`.
    `openai.outputCompression` s'applique aux sorties JPEG/WebP.

    L'indicateur `background` de premier niveau est neutre pour le provider et mappe actuellement
    vers le même champ de demande `background` OpenAI lorsque le provider OpenAI
    est sélectionné. Les providers qui ne déclarent pas la prise en charge de l'arrière-plan le renvoient
    dans `ignoredOverrides` au lieu de recevoir le paramètre non pris en charge.

    Pour router la génération d'images OpenAI via un déploiement Azure OpenAI
    au lieu de `api.openai.com`, consultez
    [Points de terminaison Azure OpenAI](/fr/providers/openai#azure-openai-endpoints).

  </Accordion>
  <Accordion title="Modèles d'image OpenRouter">
    La génération d'images OpenRouter utilise le même `OPENROUTER_API_KEY` et
    transite via l'API d'image de complétion de chat de OpenRouterAPI. Sélectionnez
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
    ```

    OpenClaw transfère `prompt`, `count`, les images de référence et
    les indices `aspectRatio` / `resolution` compatibles avec Gemini vers OpenRouter.
    Les raccourcis actuels des modèles d'image OpenRouter intégrés incluent
    `google/gemini-3.1-flash-image-preview`,
    `google/gemini-3-pro-image-preview` et `openai/gpt-5.4-image-2`. Utilisez
    `action: "list"` pour voir ce que votre plugin configuré expose.

  </Accordion>
  <Accordion title="Double authentification MiniMax">
    La génération d'images MiniMax est disponible via les deux chemins d'authentification MiniMax
    inclus :

    - `minimax/image-01` pour les configurations avec clé API
    - `minimax-portal/image-01` pour les configurations OAuth

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    Le fournisseur xAI inclus utilise `/v1/images/generations` pour les demandes basées uniquement sur une invite
    et `/v1/images/edits` lorsque `image` ou `images` sont présents.

    - Modèles : `xai/grok-imagine-image`, `xai/grok-imagine-image-quality`
    - Nombre : jusqu'à 4
    - Références : un `image` ou jusqu'à cinq `images`
    - Rapports d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`
    - Sorties : renvoyées sous forme de pièces jointes d'image gérées par OpenClaw

    OpenClaw n'expose volontairement pas les contrôles natifs xAI `quality`, `mask`,
    `user`, ni les rapports d'aspect natifs supplémentaires tant que ces contrôles n'existent pas
    dans le contrat partagé `image_generate` multi-fournisseurs.

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
```

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
</Tabs>

Les mêmes indicateurs `--output-format` et `--background` sont disponibles sur `openclaw infer image edit` ; `--openai-background` reste un alias spécifique à OpenAI. Les providers groupés autres que OpenAI ne déclarent pas aujourd'hui de contrôle explicite en arrière-plan, donc `background: "transparent"` est signalé comme ignoré pour eux.

## Connexes

- [Aperçu des outils](/fr/tools) - tous les outils d'agent disponibles
- [ComfyUI](/fr/providers/comfy) - configuration du workflow ComfyUI local et Comfy Cloud
- [fal](/fr/providers/fal) - configuration du provider d'image et vidéo fal
- [Google (Gemini)](/fr/providers/google) - configuration du provider d'images Gemini
- [MiniMax](/fr/providers/minimax) - configuration du provider d'images MiniMax
- [OpenAI](/fr/providers/openai) - configuration du provider d'images OpenAI
- [Vydra](/fr/providers/vydra) - configuration Vydra pour l'image, la vidéo et la parole
- [xAI](/fr/providers/xai) - configuration Grok pour l'image, la vidéo, la recherche, l'exécution de code et le TTS
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) - configuration `imageGenerationModel`
- [Modèles](/fr/concepts/models) - configuration et basculement des modèles
