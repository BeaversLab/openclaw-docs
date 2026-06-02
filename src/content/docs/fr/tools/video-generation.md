---
summary: "Générer des vidéos via video_generate à partir de texte, d'images ou de références vidéo sur 16 fournisseurs de backend"
read_when:
  - Generating videos via the agent
  - Configuring video-generation providers and models
  - Understanding the video_generate tool parameters
title: "Génération de vidéos"
sidebarTitle: "Génération de vidéos"
---

Les agents OpenClaw peuvent générer des vidéos à partir de invites textuelles, d'images de référence ou de vidéos existantes. Seize fournisseurs de backend sont pris en charge, chacun avec des options de modèle, des modes d'entrée et des ensembles de fonctionnalités différents. L'agent choisit le bon fournisseur automatiquement en fonction de votre configuration et des clés API disponibles.

<Note>L'outil `video_generate` n'apparaît que lorsqu'au moins un fournisseur de génération vidéo est disponible. Si vous ne le voyez pas dans vos outils d'agent, définissez une clé API de fournisseur ou configurez `agents.defaults.videoGenerationModel`.</Note>

OpenClaw traite la génération de vidéo selon trois modes d'exécution :

- `generate` - demandes de texte vers vidéo sans média de référence.
- `imageToVideo` - la demande inclut une ou plusieurs images de référence.
- `videoToVideo` - la demande inclut une ou plusieurs vidéos de référence.

Les fournisseurs peuvent prendre en charge n'importe quel sous-ensemble de ces modes. L'outil valide le mode actif avant soumission et signale les modes pris en charge dans `action=list`.

## Quick start

<Steps>
  <Step title="Configurer l'authentification">
    Définissez une clé API pour n'importe quel fournisseur pris en charge :

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="Choisir un modèle par défaut (facultatif)">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="Ask the agent">
    > Générer une vidéo cinématique de 5 secondes d'un homard sympathique surfant au coucher du soleil.

    L'agent appelle `video_generate` automatiquement. Aucune autorisation d'outil n'est nécessaire.

  </Step>
</Steps>

## Fonctionnement de la génération asynchrone

La génération vidéo est asynchrone. Lorsque l'agent appelle `video_generate` dans une session :

1. OpenClaw soumet la demande au fournisseur et renvoie immédiatement un identifiant de tâche.
2. Le fournisseur traite la tâche en arrière-plan (généralement de 30 secondes à plusieurs minutes selon le fournisseur et la résolution ; les fournisseurs lents avec une file d'attente peuvent aller jusqu'au délai d'attente configuré).
3. Lorsque la vidéo est prête, OpenClaw réveille la même session avec un événement interne de finition.
4. L'agent informe l'utilisateur via le mode de réponse visible normal de la session :
   livraison de la réponse finale lorsqu'elle est automatique, ou `message(action="send")` lorsque la
   session nécessite l'outil de message. Si la session demanderesse est inactive ou
   si son réveil actif échoue, et qu'une vidéo générée manque toujours dans la
   réponse d'achèvement, OpenClaw envoie un retour direct idempotent avec uniquement la
   vidéo manquante.

Pendant qu'une tâche est en cours, les appels en double à `video_generate` dans la même
session renvoient l'état actuel de la tâche au lieu de démarrer une autre
génération. Utilisez `openclaw tasks list` ou `openclaw tasks show <taskId>` pour
vérifier la progression depuis le CLI.

En dehors des exécutions d'agent basées sur une session (par exemple, des appels directs d'outils), l'outil revient à la génération en ligne et renvoie le chemin du média final dans le même tour.

Les fichiers vidéo générés sont enregistrés dans le stockage média géré par OpenClaw lorsque
le fournisseur renvoie des octets. La limite d'enregistrement par défaut des vidéos générées suit
la limite des médias vidéo, et `agents.defaults.mediaMaxMb` l'augmente pour
les rendus plus volumineux. Lorsqu'un fournisseur renvoie également une URL de sortie hébergée, OpenClaw
peut fournir cette URL au lieu d'échouer la tâche si la persistance locale
rejette un fichier trop volumineux.

### Cycle de vie de la tâche

| État        | Signification                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `queued`    | Tâche créée, en attente que le fournisseur l'accepte.                                                               |
| `running`   | Le provider traite la demande (généralement de 30 secondes à plusieurs minutes selon le provider et la résolution). |
| `succeeded` | Vidéo prête ; l'agent se réveille et la publie dans la conversation.                                                |
| `failed`    | Erreur ou expiration du délai du fournisseur ; l'agent se réveille avec les détails de l'erreur.                    |

Vérifier l'état depuis le CLI :

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Si une tâche vidéo est déjà `queued` ou `running` pour la session actuelle,
`video_generate` renvoie l'état de la tâche existante au lieu de démarrer une nouvelle
tâche. Utilisez `action: "status"` pour vérifier explicitement sans déclencher une nouvelle
génération.

## Fournisseurs pris en charge

| Fournisseur           | Modèle par défaut               | Texte | Réf image                                                             | Réf vidéo                                         | Auth                                     |
| --------------------- | ------------------------------- | :---: | --------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |   ✓   | Oui (URL distante)                                                    | Oui (URL distante)                                | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |   ✓   | Jusqu'à 2 images (modèles I2V uniquement ; première + dernière image) | -                                                 | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |   ✓   | Jusqu'à 2 images (première + dernière image via le rôle)              | -                                                 | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |   ✓   | Jusqu'à 9 images de référence                                         | Jusqu'à 3 vidéos                                  | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |   ✓   | 1 image                                                               | -                                                 | `COMFY_API_KEY` ou `COMFY_CLOUD_API_KEY` |
| DeepInfra             | `Pixverse/Pixverse-T2V`         |   ✓   | -                                                                     | -                                                 | `DEEPINFRA_API_KEY`                      |
| fal                   | `fal-ai/minimax/video-01-live`  |   ✓   | 1 image ; jusqu'à 9 avec Seedance reference-to-video                  | Jusqu'à 3 vidéos avec Seedance reference-to-video | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |   ✓   | 1 image                                                               | 1 vidéo                                           | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |   ✓   | 1 image                                                               | -                                                 | `MINIMAX_API_KEY` ou MiniMax OAuth       |
| OpenAI                | `sora-2`                        |   ✓   | 1 image                                                               | 1 video                                           | `OPENAI_API_KEY`                         |
| OpenRouter            | `google/veo-3.1-fast`           |   ✓   | Jusqu'à 4 images (première/dernière image ou références)              | -                                                 | `OPENROUTER_API_KEY`                     |
| Qwen                  | `wan2.6-t2v`                    |   ✓   | Oui (URL distante)                                                    | Oui (URL distante)                                | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |   ✓   | 1 image                                                               | 1 video                                           | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |   ✓   | `Wan-AI/Wan2.2-I2V-A14B` uniquement                                   | -                                                 | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |   ✓   | 1 image (`kling`)                                                     | -                                                 | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |   ✓   | 1 image de première image ou jusqu'à 7 `reference_image`s             | 1 video                                           | `XAI_API_KEY`                            |

Certains providers acceptent des variables d'environnement de clé API supplémentaires ou alternatives. Consultez les
[pages de providers](#related) individuelles pour plus de détails.

Exécutez `video_generate action=list` pour inspecter les providers, modèles et
modes d'exécution disponibles lors de l'exécution.

### Matrice des capacités

Le contrat de mode explicite utilisé par `video_generate`, les tests de contrat et
le balayage en direct partagé :

| Provider   | `generate` | `imageToVideo` | `videoToVideo` | Voies partagées en direct aujourd'hui                                                                                                            |
| ---------- | :--------: | :------------: | :------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alibaba    |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce provider a besoin d'URL vidéo `http(s)` distantes                                       |
| BytePlus   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                                       |
| ComfyUI    |     ✓      |       ✓        |       -        | Pas dans le sweep partagé; la couverture spécifique au flux de travail réside avec les tests Comfy                                               |
| DeepInfra  |     ✓      |       -        |       -        | `generate`; les schémas vidéo natifs DeepInfra sont text-to-video dans le contrat groupé                                                         |
| fal        |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` uniquement lors de l'utilisation de Seedance reference-to-video                                       |
| Google     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` partagé ignoré car le balayage Gemini/Veo actuel basé sur des tampons n'accepte pas cette entrée      |
| MiniMax    |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                                       |
| OpenAI     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` partagé ignoré car ce chemin org/input a actuellement besoin d'un accès d'édition vidéo côté provider |
| OpenRouter |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                                       |
| Qwen       |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce fournisseur nécessite des URL vidéo distantes `http(s)`                                 |
| Runway     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` ne s'exécute que lorsque le modèle sélectionné est `runway/gen4_aleph`                                |
| Together   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                                       |
| Vydra      |     ✓      |       ✓        |       -        | `generate`; `imageToVideo` partagé ignoré car le `veo3` groupé est texte uniquement et le `kling` groupé nécessite une URL d'image distante      |
| xAI        |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` ignoré car ce fournisseur nécessite actuellement une URL MP4 distante                                 |

## Paramètres de l'outil

### Obligatoire

<ParamField path="prompt" type="string" required>
  Description textuelle de la vidéo à générer. Requis pour `action: "generate"`.
</ParamField>

### Entrées de contenu

<ParamField path="image" type="string">
  Image de référence unique (chemin ou URL).
</ParamField>
<ParamField path="images" type="string[]">
  Images de référence multiples (jusqu'à 9).
</ParamField>
<ParamField path="imageRoles" type="string[]">
  Indices de rôle facultatifs par position parallèles à la liste d'images combinée. Valeurs canoniques : `first_frame`, `last_frame`, `reference_image`.
</ParamField>
<ParamField path="video" type="string">
  Vidéo de référence unique (chemin ou URL).
</ParamField>
<ParamField path="videos" type="string[]">
  Vidéos de référence multiples (jusqu'à 4).
</ParamField>
<ParamField path="videoRoles" type="string[]">
  Indices de rôle facultatifs par position parallèles à la liste de vidéos combinée. Valeur canonique : `reference_video`.
</ParamField>
<ParamField path="audioRef" type="string">
  Audio de référence unique (chemin ou URL). Utilisé pour la musique de fond ou la référence vocale lorsque le provider prend en charge les entrées audio.
</ParamField>
<ParamField path="audioRefs" type="string[]">
  Audios de référence multiples (jusqu'à 3).
</ParamField>
<ParamField path="audioRoles" type="string[]">
  Indices de rôle facultatifs par position parallèles à la liste d'audios combinée. Valeur canonique : `reference_audio`.
</ParamField>

<Note>
  Les indices de rôle sont transmis au provider tels quels. Les valeurs canoniques proviennent de l'union `VideoGenerationAssetRole`, mais les providers peuvent accepter des chaînes de rôle supplémentaires. Les tableaux `*Roles` ne doivent pas comporter plus d'entrées que la liste de référence correspondante ; les erreurs de décalage échouent avec une erreur claire. Utilisez une chaîne vide pour
  laisser un emplacement non défini. Pour xAI, définissez chaque rôle d'image sur `reference_image` pour utiliser son mode de génération `reference_images` ; omettez le rôle ou utilisez `first_frame` pour la génération vidéo à partir d'une seule image.
</Note>

### Contrôles de style

<ParamField path="aspectRatio" type="string">
  Indication de format d'image telle que `1:1`, `16:9`, `9:16`, `adaptive`OpenClaw, ou une valeur spécifique au provider. OpenClaw normalise ou ignore les valeurs non prises en charge pour chaque provider.
</ParamField>
<ParamField path="resolution" type="string">
  Indication de résolution telle que `480P`, `720P`, `768P`, `1080P`, `4K`OpenClaw, ou une valeur spécifique au provider. OpenClaw normalise ou ignore les valeurs non prises en charge pour chaque provider.
</ParamField>
<ParamField path="durationSeconds" type="number">
  Durée cible en secondes (arrondie à la valeur prise en charge la plus proche par le provider).
</ParamField>
<ParamField path="size" type="string">
  Indication de taille lorsque le provider la prend en charge.
</ParamField>
<ParamField path="audio" type="boolean">
  Activer l'audio généré dans la sortie lorsque pris en charge. Distinct de `audioRef*` (entrées).
</ParamField>
<ParamField path="watermark" type="boolean">
  Activer ou désactiver le filigrane du provider lorsque pris en charge.
</ParamField>

`adaptive` est une sentinelle spécifique au provider : elle est transmise telle quelle aux
providers qui déclarent `adaptive` dans leurs capacités (par exemple, BytePlus
Seedance l'utilise pour détecter automatiquement le format à partir des dimensions de l'image
d'entrée). Les providers qui ne la déclarent pas affichent la valeur via
`details.ignoredOverrides` dans le résultat du tool afin que l'abandon soit visible.

### Avancé

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` renvoie la tâche de session actuelle ; `"list"` inspecte les providers.
</ParamField>
<ParamField path="model" type="string">Redéfinition du provider/model (ex. `runway/gen4.5`).</ParamField>
<ParamField path="filename" type="string">Indication du nom du fichier de sortie.</ParamField>
<ParamField path="timeoutMs" type="number">Délai d'expiration d'opération du provider facultatif en millisecondes. Si omis, OpenClaw utilise `agents.defaults.videoGenerationModel.timeoutMs` si configuré, sinon la valeur par défaut du provider définie par le plugin si elle existe.</ParamField>
<ParamField path="providerOptions" type="object">
  Options spécifiques au provider sous forme d'objet JSON (ex. `{"seed": 42, "draft": true}`).
  Les providers qui déclarent un schéma typé valident les clés et les types ; les clés
  inconnues ou les inadéquations ignorent le candidat lors du repli. Les providers sans
  schéma déclaré reçoivent les options telles quelles. Exécutez `video_generate action=list`
  pour voir ce que chaque provider accepte.
</ParamField>

<Note>
  Tous les providers ne prennent pas en charge tous les paramètres. OpenClaw normalise la durée à la valeur prise en charge la plus proche par le provider, et remappe les indications de géométrie traduites telles que le rapport taille/aspect lorsqu'un provider de repli expose une surface de contrôle différente. Les redéfinitions réellement non prises en charge sont ignorées sur une base de
  meilleure effort et signalées sous forme d'avertissements dans le résultat de l'outil. Les limites strictes de capacité (telles que trop d'entrées de référence) échouent avant la soumission. Les résultats de l'outil signalent les paramètres appliqués ; `details.normalization` capture toute traduction de demandé à appliqué.
</Note>

Les entrées de référence sélectionnent le mode d'exécution :

- Aucun média de référence → `generate`
- Toute référence d'image → `imageToVideo`
- Toute référence vidéo → `videoToVideo`
- Les entrées audio de référence **ne modifient pas** le mode résolu ; elles s'appliquent
  par-dessus tout mode sélectionné par les références d'image/vidéo, et ne fonctionnent
  qu'avec les providers qui déclarent `maxInputAudios`.

Les références mixtes image et vidéo ne constituent pas une surface de capacité partagée stable.
Préférez un seul type de référence par demande.

#### Basculement et options typées

Certains contrôles de capacité sont appliqués au niveau de la couche de secours plutôt qu'aux limites de l'outil, donc une demande qui dépasse les limites du provider principal peut toujours s'exécuter sur un secours capable :

- Le candidat actuel déclarant ne pas prendre en charge `maxInputAudios` (ou `0`) est ignoré lorsque la requête contient des références audio ; le candidat suivant est essayé.
- Le `maxDurationSeconds` du candidat actuel est inférieur au `durationSeconds` demandé sans liste de `supportedDurationSeconds` déclarée → ignoré.
- La requête contient `providerOptions` et le candidat actuel déclare explicitement un schéma `providerOptions` typé → ignoré si les clés fournies ne sont pas dans le schéma ou si les types de valeurs ne correspondent pas. Les providers sans schéma déclaré reçoivent les options telles quelles (transmission rétrocompatible). Un provider peut refuser toutes les options de provider en déclarant un schéma vide (`capabilities.providerOptions: {}`), ce qui entraîne le même abandon qu'une incompatibilité de type.

La première raison d'abandon dans une requête est enregistrée au niveau `warn` pour que les opérateurs voient quand leur provider principal a été passé ; les abandons ultérieurs sont enregistrés au niveau `debug` pour garder les longues chaînes de repli silencieuses. Si chaque candidat est ignoré, l'erreur agrégée inclut la raison d'abandon pour chacun.

## Actions

| Action     | Ce qu'elle fait                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `generate` | Par défaut. Crée une vidéo à partir de l'invite donnée et des entrées de référence facultatives.     |
| `status`   | Vérifie l'état de la tâche vidéo en cours pour la session actuelle sans lancer une autre génération. |
| `list`     | Affiche les providers, les modèles disponibles et leurs capacités.                                   |

## Sélection du modèle

OpenClaw résout le modèle dans cet ordre :

1. **Paramètre d'outil `model`** - si l'agent en spécifie un dans l'appel.
2. **`videoGenerationModel.primary`** à partir de la configuration.
3. **`videoGenerationModel.fallbacks`** dans l'ordre.
4. **Détection automatique** - providers qui ont une authentification valide, en commençant par le provider par défaut actuel, puis les providers restants par ordre alphabétique.

Si un provider échoue, le candidat suivant est essayé automatiquement. Si tous les candidats échouent, l'erreur inclut les détails de chaque tentative.

Définissez `agents.defaults.mediaGenerationAutoProviderFallback: false` pour utiliser uniquement les entrées explicites `model`, `primary` et `fallbacks`.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## Notes sur les fournisseurs

<AccordionGroup>
  <Accordion title="Alibaba">
    Utilise le point de terminaison asynchrone DashScope / Model Studio. Les images et vidéos de référence doivent être des URL `http(s)` distantes.
  </Accordion>
  <Accordion title="BytePlus (1.0)">
    ID du fournisseur : `byteplus`.

    Models : `seedance-1-0-pro-250528` (par défaut),
    `seedance-1-0-pro-t2v-250528`, `seedance-1-0-pro-fast-251015`,
    `seedance-1-0-lite-t2v-250428`, `seedance-1-0-lite-i2v-250428`.

    Les models T2V (`*-t2v-*`) n'acceptent pas les entrées d'image ; les models I2V et
    les models `*-pro-*` généraux prennent en charge une seule image de référence (première
    image). Passez l'image de manière positionnelle ou définissez `role: "first_frame"`.
    Les ID de models T2V sont automatiquement basculés vers la variante I2V
    correspondante lorsqu'une image est fournie.

    Clés `providerOptions` prises en charge : `seed` (nombre), `draft` (booléen -
    force 480p), `camera_fixed` (booléen).

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    Nécessite le plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark).
    ID du fournisseur : `byteplus-seedance15`. Model :
    `seedance-1-5-pro-251215`.

    Utilise l'`content[]`API unifiée. Prend en charge au maximum 2 images d'entrée
    (`first_frame` + `last_frame`). Toutes les entrées doivent être des URL distantes `https://`.
    Définissez `role: "first_frame"` / `"last_frame"` sur chaque image, ou
    passez les images de manière positionnelle.

    `aspectRatio: "adaptive"` détecte automatiquement le rapport à partir de l'image d'entrée.
    `audio: true` correspond à `generate_audio`. `providerOptions.seed`
    (nombre) est transmis.

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    Nécessite le plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark).
    ID du fournisseur : `byteplus-seedance2`. Modèles :
    `dreamina-seedance-2-0-260128`,
    `dreamina-seedance-2-0-fast-260128`.

    Utilise l'API unifiée `content[]` API. Prend en charge jusqu'à 9 images de référence,
    3 vidéos de référence et 3 audios de référence. Toutes les entrées doivent être des
    URL distantes `https://`. Définissez `role` sur chaque élément - valeurs prises en charge :
    `"first_frame"`, `"last_frame"`, `"reference_image"`,
    `"reference_video"`, `"reference_audio"`.

    `aspectRatio: "adaptive"` détecte automatiquement le ratio à partir de l'image d'entrée.
    `audio: true` correspond à `generate_audio`. `providerOptions.seed`
    (nombre) est transmis.

  </Accordion>
  <Accordion title="ComfyUI">
    Exécution locale ou dans le cloud basée sur un workflow. Prend en charge text-to-video et
    image-to-video via le graphe configuré.
  </Accordion>
  <Accordion title="fal">
    Utilise un flux avec file d'attente pour les tâches de longue durée. OpenClaw attend jusqu'à 20
    minutes par défaut avant de considérer une tâche fal en cours comme ayant expiré.
    La plupart des modèles vidéo fal
    acceptent une seule image de référence. Les modèles référence-vers-vidéo
n    Seedance 2.0 acceptent jusqu'à 9 images, 3 vidéos et 3 références audio, avec
n    au maximum 12 fichiers de référence au total.
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    Prend en charge une image ou une vidéo de référence. Les demandes d'audio généré sont
    ignorées avec un avertissement sur le chemin de l'API Gemini car cette API rejette
    le paramètre `generateAudio` pour la génération vidéo Veo actuelle.
  </Accordion>
  <Accordion title="MiniMax">
    Référence d'image unique uniquement. MiniMax accepte les résolutions
    `768P` et `1080P` ; les demandes telles que `720P` sont normalisées à la valeur
    prise en charge la plus proche avant la soumission.
  </Accordion>
  <Accordion title="OpenAI">
    Seule la substitution `size` est transmise. Les autres substitutions de style
    (`aspectRatio`, `resolution`, `audio`, `watermark`) sont ignorées avec
    un avertissement.
  </Accordion>
  <Accordion title="OpenRouterOpenRouter"OpenRouter>
    Utilise l'API asynchrone `/videos`APIOpenClaw d'OpenRouter. OpenClaw soumet la
    tâche, interroge `polling_url` et télécharge soit `unsigned_urls` soit
    le point de terminaison de contenu de tâche documenté. Le modèle `google/veo-3.1-fast` par défaut
    inclus prend en charge des durées de 4/6/8 secondes, des résolutions `720P`/`1080P` et
    des rapports de forme `16:9`/`9:16`.
  </Accordion>
  <Accordion title="QwenQwen">
    Même backend DashScope que chez Alibaba. Les entrées de référence doivent être des
    URL distantes `http(s)` ; les fichiers locaux sont rejetés dès le départ.
  </Accordion>
  <Accordion title="Runway">
    Prend en charge les fichiers locaux via des URI de données. La vidéo-vers-vidéo nécessite
    `runway/gen4_aleph`. Les exécutions en mode texte uniquement exposent les rapports de forme
    `16:9` et `9:16`.
  </Accordion>
  <Accordion title="Together">
    Référence par image unique uniquement.
  </Accordion>
  <Accordion title="Vydra">
    Utilise `https://www.vydra.ai/api/v1` directement pour éviter les
    redirections entraînant une perte d'authentification. `veo3` est fourni en texte-vers-vidéo uniquement ; `kling` nécessite
    une URL d'image distante.
  </Accordion>
  <Accordion title="xAI">
    Prend en charge le texte-vers-vidéo, l'image-vers-vidéo à trame unique initiale, jusqu'à 7
    entrées `reference_image` via xAI `reference_images`, et des flux distants
    d'édition/extension de vidéo.
  </Accordion>
</AccordionGroup>

## Modes de capacité des providers

Le contrat partagé de génération vidéo prend en charge les capacités spécifiques au mode
au lieu des limites agrégées plates uniquement. Les nouvelles implémentations de providers
devraient privilégier les blocs de mode explicites :

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

Les champs d'agrégation plats tels que `maxInputImages` et `maxInputVideos` ne sont
**pas** suffisants pour annoncer la prise en charge du mode de transformation. Les providers doivent
déclarer `generate`, `imageToVideo` et `videoToVideo` explicitement afin que les tests
en direct, les tests de contrat et le `video_generate` partagé puissent valider
la prise en charge du mode de manière déterministe.

Lorsqu'un modèle d'un provider dispose d'une prise en charge des entrées de référence plus étendue que
les autres, utilisez `maxInputImagesByModel`, `maxInputVideosByModel` ou
`maxInputAudiosByModel` au lieu d'augmenter la limite à l'échelle du mode.

## Tests en direct

Couverture en direct facultative pour les providers groupés partagés :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Wrapper du dépôt :

```bash
pnpm test:live:media video
```

Ce fichier en direct utilise par défaut les env vars du fournisseur déjà exportées avant les profils d'authentification stockés,
et exécute par défaut un smoke test sans risque pour la version :

- `generate` pour chaque provider non-FAL dans le balayage.
- Prompt homard d'une seconde.
- Plafond d'opérations par provider à partir de
  `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut).

FAL est en option car la latence de la file d'attente côté provider peut dominer le temps de release :

```bash
pnpm test:live:media video --video-providers fal
```

Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les
modes de transformation déclarés que le balayage partagé peut tester en toute sécurité avec des médias locaux :

- `imageToVideo` lorsque `capabilities.imageToVideo.enabled`.
- `videoToVideo` lorsque `capabilities.videoToVideo.enabled` et que le
  provider/modèle accepte l'entrée vidéo locale basée sur des tampons dans le balayage
  partagé.

Aujourd'hui, la ligne dynamique `videoToVideo` partagée couvre `runway` uniquement lorsque vous
sélectionnez `runway/gen4_aleph`.

## Configuration

Définissez le modèle de génération vidéo par défaut dans votre configuration OpenClaw :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

Ou via la CLI :

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## Connexes

- [Alibaba Model Studio](/fr/providers/alibaba)
- [Tâches en arrière-plan](/fr/automation/tasks) - suivi des tâches pour la génération vidéo asynchrone
- [BytePlus](/fr/concepts/model-providers#byteplus-international)
- [ComfyUI](/fr/providers/comfy)
- [Référence de configuration](/fr/gateway/config-agents#agent-defaults)
- [fal](/fr/providers/fal)
- [Google (Gemini)](/fr/providers/google)
- [MiniMax](/fr/providers/minimax)
- [Modèles](/fr/concepts/models)
- [OpenAI](/fr/providers/openai)
- [Qwen](/fr/providers/qwen)
- [Runway](/fr/providers/runway)
- [Together AI](/fr/providers/together)
- [Aperçu des outils](/fr/tools)
- [Vydra](/fr/providers/vydra)
- [xAI](/fr/providers/xai)
