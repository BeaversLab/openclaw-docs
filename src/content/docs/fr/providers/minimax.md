---
summary: "Utiliser les modèles MiniMax dans OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

Le fournisseur OpenClaw de MiniMax utilise par défaut **MiniMax M2.7**.

MiniMax fournit également :

- Synthèse vocale intégrée via T2A v2
- Compréhension d'images intégrée via `MiniMax-VL-01`
- Génération de musique intégrée via `music-2.6`
- Regroupé `web_search` via l'API de recherche Token Plan de MiniMaxAPI

Répartition du fournisseur :

| ID du fournisseur | Auth    | Capacités                                                                                                                      |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `minimax`         | Clé API | Texte, génération d'images, génération de musique, génération de vidéo, compréhension d'images, synthèse vocale, recherche web |
| `minimax-portal`  | OAuth   | Texte, génération d'images, génération de musique, génération de vidéo, compréhension d'images, synthèse vocale                |

## Catalogue intégré

| Modèle                   | Type                  | Description                                  |
| ------------------------ | --------------------- | -------------------------------------------- |
| `MiniMax-M2.7`           | Chat (raisonnement)   | Modèle de raisnement hébergé par défaut      |
| `MiniMax-M2.7-highspeed` | Chat (raisonnement)   | Niveau de raisnement M2.7 plus rapide        |
| `MiniMax-VL-01`          | Vision                | Modèle de compréhension d'images             |
| `image-01`               | Génération d'images   | Texte vers image et édition image vers image |
| `music-2.6`              | Génération de musique | Modèle de musique par défaut                 |
| `music-2.5`              | Génération de musique | Niveau de génération de musique précédent    |
| `music-2.0`              | Génération de musique | Niveau de génération de musique hérité       |
| `MiniMax-Hailuo-2.3`     | Génération de vidéo   | Flux texte vers vidéo et références d'images |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="OAuthOAuth (Coding Plan)"MiniMaxOAuthAPI>
    **Idéal pour :** configuration rapide avec le plan MiniMax Coding via OAuth, aucune clé API requise.

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            Ceci s'authentifie auprès de `api.minimax.io`.
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            Ceci s'authentifie auprès de `api.minimaxi.com`.
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```OAuth
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    Les configurations OAuth utilisent l'ID de fournisseur `minimax-portal`. Les références de modèle suivent le format `minimax-portal/MiniMax-M2.7`MiniMaxMiniMax.
    </Note>

    <Tip>
    Lien de parrainage pour le MiniMax Coding Plan (10 % de réduction) : [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="Clé API">
    **Idéal pour :** MiniMax hébergé avec une API compatible avec Anthropic.

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Exécuter l'intégration">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            Ceci configure `api.minimax.io` comme URL de base.
          </Step>
          <Step title="Vérifier que le model est disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="Chine">
        <Steps>
          <Step title="Exécuter l'intégration">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            Ceci configure `api.minimaxi.com` comme URL de base.
          </Step>
          <Step title="Vérifier que le model est disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### Exemple de configuration

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    Sur le chemin de flux compatible avec Anthropic, OpenClaw désactive la réflexion de MiniMax par défaut, sauf si vous définissez explicitement `thinking` vous-même. Le point de terminaison de flux de MiniMax émet `reasoning_content` dans des blocs delta de style OpenAI au lieu des blocs de réflexion natifs d'Anthropic, ce qui peut entraîner une fuite du raisonnement interne dans la sortie visible si laissé activé implicitement.
    </Warning>

    <Note>
    Les configurations avec clé API utilisent l'ID de fournisseur `minimax`. Les références de model suivent la forme `minimax/MiniMax-M2.7`.
    </Note>

  </Tab>
</Tabs>

## Configurer via `openclaw configure`

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier le JSON :

<Steps>
  <Step title="Lancer l'assistant">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="Sélectionner Modèle/auth">
    Choisissez **Modèle/auth** dans le menu.
  </Step>
  <Step title="Choisissez une option d'authentification MiniMax">
    Choisissez l'une des options MiniMax disponibles :

    | Choix d'authentification | Description |
    | --- | --- |
    | `minimax-global-oauth` | OAuth international (Coding Plan) |
    | `minimax-cn-oauth` | OAuth Chine (Coding Plan) |
    | `minimax-global-api` | Clé API internationale |
    | `minimax-cn-api` | Clé API Chine |

  </Step>
  <Step title="Choisissez votre modèle par défaut">
    Sélectionnez votre modèle par défaut lorsque vous y êtes invité.
  </Step>
</Steps>

## Capacités

### Génération d'images

Le plugin MiniMax enregistre le modèle `image-01` pour l'outil `image_generate`. Il prend en charge :

- **Génération de texte vers image** avec contrôle du ratio d'aspect
- **Modification d'image vers image** (référence de sujet) avec contrôle du ratio d'aspect
- Jusqu'à **9 images de sortie** par demande
- Jusqu'à **1 image de référence** par demande de modification
- Ratios d'aspect pris en charge : `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

Pour utiliser MiniMax pour la génération d'images, définissez-le comme fournisseur de génération d'images :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

Le plugin utilise la même authentification `MINIMAX_API_KEY` ou OAuth que les modèles de texte. Aucune configuration supplémentaire n'est nécessaire si MiniMax est déjà configuré.

`minimax` et `minimax-portal` enregistrent tous deux `image_generate` avec le même modèle `image-01`. Les configurations avec clé API utilisent `MINIMAX_API_KEY` ; les configurations OAuth peuvent utiliser le chemin d'authentification `minimax-portal` intégré à la place.

La génération d'images utilise toujours le point de terminaison d'image dédié de MiniMax
(`/v1/image_generation`) et ignore `models.providers.minimax.baseUrl`,
car ce champ configure l'URL de base du chat/compatible avec Anthropic. Définissez
`MINIMAX_API_HOST=https://api.minimaxi.com` pour acheminer la génération d'images
via le point de terminaison CN ; le point de terminaison global par défaut est
`https://api.minimax.io`.

Lors de l'intégration ou de la configuration de la clé API écrit des entrées explicites `models.providers.minimax`, OpenClaw matérialise `MiniMax-M2.7` et `MiniMax-M2.7-highspeed` en tant que modèles de chat texte uniquement. La compréhension d'image est exposée séparément via le `MiniMax-VL-01` fournisseur de média appartenant au plugin.

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

### Synthèse vocale

Le plugin `minimax` inclus enregistre MiniMax T2A v2 en tant que fournisseur vocal pour `messages.tts`.

- Modèle TTS par défaut : `speech-2.8-hd`
- Voix par défaut : `English_expressive_narrator`
- Les identifiants de modèle inclus pris en charge incluent `speech-2.8-hd`, `speech-2.8-turbo`, `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`, `speech-01-hd` et `speech-01-turbo`.
- La résolution d'auth est `messages.tts.providers.minimax.apiKey`, puis les profils d'auth OAuth/token `minimax-portal`, puis les clés d'environnement du plan de jeton (`MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`), puis `MINIMAX_API_KEY`.
- Si aucun hôte TTS n'est configuré, OpenClaw réutilise l'hôte OAuth `minimax-portal` configuré et supprime les suffixes de chemin compatibles avec Anthropic tels que `/anthropic`.
- Les pièces jointes audio normales restent en MP3.
- Les cibles de notes vocales telles que Feishu et Telegram sont transcodées du MP3 MiniMax en Opus 48kHz avec `ffmpeg`, car l'API de fichier Feishu/Lark n'accepte que `file_type: "opus"` pour les messages audio natifs.
- MiniMax T2A accepte des valeurs fractionnaires pour `speed` et `vol`, mais `pitch` est envoyé sous forme d'entier ; OpenClaw tronque les valeurs fractionnaires `pitch` avant la requête API.

| Paramètre                                | Var d'env              | Par défaut                    | Description                                    |
| ---------------------------------------- | ---------------------- | ----------------------------- | ---------------------------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | Hôte de l'API T2A MiniMax.                     |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | ID du modèle TTS.                              |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | ID de la voix utilisée pour la sortie audio.   |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | Vitesse de lecture, `0.5..2.0`.                |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | Volume, `(0, 10]`.                             |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | Décalage de hauteur (pitch) entier, `-12..12`. |

### Génération de musique

Le plugin MiniMax inclus enregistre la génération de musique via l'outil partagé
`music_generate` pour `minimax` et `minimax-portal`.

- Modèle de musique par défaut : `minimax/music-2.6`
- Modèle de musique OAuth : `minimax-portal/music-2.6`
- Prend également en charge `minimax/music-2.5` et `minimax/music-2.0`
- Contrôles de prompt : `lyrics`, `instrumental`
- Format de sortie : `mp3`
- Les exécutions sauvegardées par session se détachent via le flux de tâche/statut partagé, y compris `action: "status"`

Pour utiliser MiniMax comme fournisseur de musique par défaut :

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>Voir [Génération de musique](/fr/tools/music-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

### Génération de vidéo

Le plugin MiniMax intégré enregistre la génération vidéo via l'outil partagé
MiniMax`video_generate` pour à la fois `minimax` et `minimax-portal`.

- Modèle vidéo par défaut : `minimax/MiniMax-Hailuo-2.3`
- Modèle vidéo OAuth : OAuth`minimax-portal/MiniMax-Hailuo-2.3`
- Modes : flux de référence texte-vidéo et image unique
- Prend en charge `aspectRatio` et `resolution`

Pour utiliser MiniMax comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

### Compréhension d'image

Le plugin MiniMax enregistre la compréhension d'images séparément du catalogue
texte :

| ID du fournisseur | Modèle d'image par défaut |
| ----------------- | ------------------------- |
| `minimax`         | `MiniMax-VL-01`           |
| `minimax-portal`  | `MiniMax-VL-01`           |

C'est pourquoi le routage automatique des médias peut utiliser la compréhension d'images MiniMax même
lorsque le catalogue de fournisseur de texte groupé affiche encore des références de chat M2.7 texte uniquement.

### Recherche Web

Le plugin MiniMax enregistre également MiniMax`web_search`MiniMaxAPI via l'API de recherche du MiniMax Token Plan.

- ID du provider : `minimax`
- Résultats structurés : titres, URL, extraits, requêtes associées
- Variable d'environnement préférée : `MINIMAX_CODE_PLAN_KEY`
- Alias d'environnement acceptés : `MINIMAX_CODING_API_KEY`, `MINIMAX_OAUTH_TOKEN`
- Retour de compatibilité : `MINIMAX_API_KEY` lorsqu'il pointe déjà vers des informations d'identification token-plan
- Réutilisation de la région : `plugins.entries.minimax.config.webSearch.region`, puis `MINIMAX_API_HOST`, puis les URL de base du fournisseur MiniMax
- La recherche reste sur l'ID de provider `minimax`OAuth ; la configuration OAuth CN/global peut orienter indirectement la région via `models.providers.minimax-portal.baseUrl` et fournir une authentification bearer via `MINIMAX_OAUTH_TOKEN`

La configuration se trouve sous `plugins.entries.minimax.config.webSearch.*`.

<Note>Voir [MiniMax Search](MiniMax/en/tools/minimax-search) pour la configuration complète et l'utilisation de la recherche web.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Configuration options">
    | Option | Description |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | Préférer `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est facultatif pour les payloads compatibles OpenAI |
    | `models.providers.minimax.api` | Préférer `anthropic-messages` ; `openai-completions` est facultatif pour les payloads compatibles OpenAI |
    | `models.providers.minimax.apiKey` | Clé d'MiniMax API (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | Définir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost` |
    | `agents.defaults.models` | Modèles d'alias que vous souhaitez dans la liste d'autorisation |
    | `models.mode` | Conserver `merge` si vous souhaitez ajouter MiniMax en plus des modèles intégrés |
  </Accordion>

  <Accordion title="Thinking defaults">
    Sur `api: "anthropic-messages"`, OpenClaw injecte `thinking: { type: "disabled" }` sauf si la réflexion est déjà explicitement définie dans les params/config.

    Cela empêche le point de terminaison de streaming de MiniMax d'émettre `reasoning_content` dans les blocs delta de style OpenAI, ce qui divulguerait le raisonnement interne dans la sortie visible.

  </Accordion>

<Accordion title="Fast mode">`/fast on` ou `params.fastMode: true` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed` sur le chemin de flux compatible Anthropic.</Accordion>

  <Accordion title="Fallback example">
    **Idéal pour :** conserver votre modèle le plus puissant de dernière génération comme principal, basculer vers MiniMax M2.7 en cas de défaillance. L'exemple ci-dessous utilise Opus comme modèle principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Détails de l'utilisation du Coding Plan"API>
    - API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/token_plan/remains` ou `https://api.minimax.io/v1/token_plan/remains` (nécessite une clé de coding plan).
    - L'interrogation de l'utilisation dérive l'hôte de `models.providers.minimax-portal.baseUrl` ou `models.providers.minimax.baseUrl` lorsqu'il est configuré, donc les configurations globales utilisant `https://api.minimax.io/anthropic` interrogent `api.minimax.io`OpenClawMiniMax. Les URL de base manquantes ou malformées conservent le repli CN pour la compatibilité.
    - OpenClaw normalise l'utilisation du coding-plan MiniMax pour qu'elle corresponde au même affichage `% left`MiniMax que celui utilisé par d'autres providers. Les champs bruts `usage_percent` / `usagePercent`OpenClawAPI de MiniMax représentent le quota restant, et non le quota consommé, OpenClaw les inverse donc. Les champs basés sur le compte priment lorsqu'ils sont présents.
    - Lorsque l'API renvoie `model_remains`OpenClaw, OpenClaw privilégie l'entrée du modèle de chat, dérive l'étiquette de la fenêtre à partir de `start_time` / `end_time` si nécessaire, et inclut le nom du modèle sélectionné dans l'étiquette du plan afin que les fenêtres du coding-plan soient plus faciles à distinguer.
    - Les instantanés d'utilisation traitent `minimax`, `minimax-cn` et `minimax-portal`MiniMaxMiniMaxOAuth comme la même surface de quota MiniMax, et privilégient le OAuth MiniMax stocké avant de revenir aux variables d'environnement de clé du Coding Plan.

  </Accordion>
</AccordionGroup>

## Notes

- Les références de modèle suivent le chemin d'authentification :
  - Configuration de la clé API : API`minimax/<model>`
  - Configuration OAuth : OAuth`minimax-portal/<model>`
- Modèle de chat par défaut : `MiniMax-M2.7`
- Modèle de chat alternatif : `MiniMax-M2.7-highspeed`
- L'intégration et la configuration directe par clé API écrivent des définitions de modèle texte uniquement pour les deux variantes M2.7
- La compréhension d'images utilise le provider média `MiniMax-VL-01` propriétaire du plugin
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts
- Utilisez `openclaw models list` pour confirmer l'identifiant actuel du provider, puis changez avec `openclaw models set minimax/MiniMax-M2.7` ou `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>Lien de parrainage pour le forfait MiniMax Coding (10 % de réduction) : [MiniMax Coding Plan](MiniMaxMiniMaxhttps://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>Voir [Model providers](/fr/concepts/model-providers) pour les règles du provider.</Note>

## Dépannage

<AccordionGroup>
  <Accordion title='MiniMax"Unknown model: minimax/MiniMax-M2.7"'MiniMaxMiniMax>
    Cela signifie généralement que le **provider MiniMax n'est pas configuré** (aucune entrée de provider correspondante et aucun profil de clé d'environnement/auth MiniMax trouvé). Un correctif pour cette détection est prévu dans la version **2026.1.12**. Pour corriger :

    - Mettre à jour vers la version **2026.1.12** (ou exécuter à partir de la source `main`), puis redémarrer la passerelle.
    - Exécuter `openclaw configure`MiniMax et sélectionner une option d'authentification **MiniMax**, ou
    - Ajouter manuellement le bloc `models.providers.minimax` ou `models.providers.minimax-portal` correspondant, ou
    - Définir `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN`MiniMaxAPI, ou un profil d'authentification MiniMax afin que le provider correspondant puisse être injecté.

    Assurez-vous que l'ID du modèle respecte la **casse** :

    - Chemin de la clé API : `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed`OAuth
    - Chemin OAuth : `minimax-portal/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7-highspeed`

    Vérifiez ensuite avec :

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Troubleshooting](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèle et comportement de basculement.
  </Card>
  <Card title="Image generation" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagés et sélection du provider.
  </Card>
  <Card title="Music generation" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil de musique partagés et sélection du provider.
  </Card>
  <Card title="Video generation" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="MiniMax Search" href="/fr/tools/minimax-search" icon="magnifying-glass" MiniMax>
    Configuration de la recherche web via le MiniMax Token Plan.
  </Card>
  <Card title="Résolution des problèmes" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
