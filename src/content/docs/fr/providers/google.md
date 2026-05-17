---
summary: "APIOAuthConfiguration de Google Gemini (clé API + OAuth, génération d'images, compréhension des médias, synthèse vocale, recherche Web)"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension des médias (image/audio/vidéo), à la synthèse vocale et à la recherche Web via Gemini Grounding.

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : API Google Gemini
- Option d'exécution : provider/model `agentRuntime.id: "google-gemini-cli"`
  réutilise l'OAuth CLIOAuth Gemini tout en conservant les références de modèle canoniques sous la forme `google/*`.

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clé API">
    **Idéal pour :** un accès standard à l'API Gemini via Google AI Studio.

    <Steps>
      <Step title="Exécuter l'intégration">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="Définir un modèle par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    Les variables d'environnement `GEMINI_API_KEY` et `GOOGLE_API_KEY` sont toutes deux acceptées. Utilisez celle que vous avez déjà configurée.
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **Idéal pour :** réutiliser une connexion existante à Gemini CLI via PKCE OAuth au lieu d'une clé API distincte.

    <Warning>
    Le fournisseur `google-gemini-cli` est une intégration non officielle. Certains utilisateurs
    signalent des restrictions de compte lorsqu'ils utilisent OAuth de cette manière. Utilisation à vos risques et périls.
    </Warning>

    <Steps>
      <Step title="Installer la Gemini CLI">
        La commande locale `gemini` doit être disponible sur `PATH`.

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw prend en charge les installations Homebrew et les installations globales npm, y compris
        les configurations courantes Windows/npm.
      </Step>
      <Step title="Se connecter via OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - Modèle par défaut : `google/gemini-3.1-pro-preview`
    - Runtime : `google-gemini-cli`
    - Alias : `gemini-cli`

    L'identifiant du modèle Gemini API de Gemini 3.1 Pro est `gemini-3.1-pro-preview`. OpenClaw accepte le `google/gemini-3.1-pro` plus court comme alias pratique et le normalise avant les appels au fournisseur.

    **Variables d'environnement :**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (Ou les variantes `GEMINI_CLI_*`.)

    <Note>
    Si les demandes Gemini CLI OAuth échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou
    `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle et réessayez.
    </Note>

    <Note>
    Si la connexion échoue avant le démarrage du flux du navigateur, assurez-vous que la commande locale `gemini`
    est installée et sur `PATH`.
    </Note>

    Les références de modèle `google-gemini-cli/*` sont des alias de compatibilité hérités. Les nouvelles
    configurations doivent utiliser des références de modèle `google/*` ainsi que le runtime `google-gemini-cli`
    lorsqu'elles souhaitent une exécution locale de Gemini CLI.

  </Tab>
</Tabs>

## Capacités

| Capacité                  | Pris en charge                |
| ------------------------- | ----------------------------- |
| Chat completions          | Oui                           |
| Génération d'images       | Oui                           |
| Génération de musique     | Oui                           |
| Synthèse vocale           | Oui                           |
| Voix en temps réel        | Oui (API Google Live)         |
| Compréhension d'image     | Oui                           |
| Transcription audio       | Oui                           |
| Compréhension vidéo       | Oui                           |
| Recherche web (Grounding) | Oui                           |
| Réflexion/raisonnement    | Oui (Gemini 2.5+ / Gemini 3+) |
| Modèles Gemma 4           | Oui                           |

## Recherche Web

Le provider de recherche Web `gemini` intégré utilise l'ancrage Google Search de Gemini.
Configurez une clé de recherche dédiée sous `plugins.entries.google.config.webSearch`,
ou laissez-le réutiliser `models.providers.google.apiKey` après `GEMINI_API_KEY` :

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // falls back to models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

La priorité des identifiants est `webSearch.apiKey`, puis `GEMINI_API_KEY`,
puis `models.providers.google.apiKey`. `webSearch.baseUrl` est facultatif et
existe pour les mandataires d'opérateur ou les points de terminaison de l'API Gemini compatibles ; lorsqu'il est omis,
la recherche Web Gemini réutilise `models.providers.google.baseUrl`. Voir
[Recherche Gemini](/fr/tools/gemini-search) pour le comportement de l'outil spécifique au fournisseur.

<Tip>
Les modèles Gemini 3 utilisent `thinkingLevel` plutôt que `thinkingBudget`. OpenClaw mappe
les contrôles de raisonnement des alias Gemini 3, Gemini 3.1 et `gemini-*-latest` vers
`thinkingLevel` afin que les exécutions par défaut/à faible latence n'envoient pas de valeurs `thinkingBudget` désactivées.

`/think adaptive` conserve la sémantique de réflexion dynamique de Google au lieu de choisir
un niveau OpenClaw fixe. Gemini 3 et Gemini 3.1 omettent un `thinkingLevel` fixe pour
que Google puisse choisir le niveau ; Gemini 2.5 envoie la sentinelle dynamique
`thinkingBudget: -1` de Google.

Les modèles Gemma 4 (par exemple `gemma-4-26b-a4b-it`) prennent en charge le mode réflexion. OpenClaw
réécrit `thinkingBudget` vers un `thinkingLevel` Google pris en charge pour Gemma 4.
Définir la réflexion sur `off` conserve la réflexion désactivée au lieu de la mapper vers
`MINIMAL`.

</Tip>

## Génération d'images

Le provider de génération d'images `google` intégré est par défaut
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Génération : jusqu'à 4 images par demande
- Mode édition : activé, jusqu'à 5 images en entrée
- Contrôles de géométrie : `size`, `aspectRatio` et `resolution`

Pour utiliser Google comme provider d'images par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outils partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Génération vidéo

Le plugin `google` intégré enregistre également la génération vidéo via l'outil partagé
`video_generate`.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte vers vidéo, image vers vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio` (`16:9`, `9:16`) et `resolution` (`720P`, `1080P`) ; la sortie audio n'est pas prise en charge par Veo aujourd'hui
- Durées prises en charge : **4, 6 ou 8 secondes** (les autres valeurs sont ajustées à la valeur autorisée la plus proche)

Pour utiliser Google comme provider vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

<Note>Voir [Génération de vidéo](/fr/tools/video-generation) pour les paramètres d'outils partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Génération musicale

Le plugin `google` fourni enregistre également la génération de musique via l'outil
`music_generate` partagé.

- Modèle de musique par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées par session se détachent via le flux partagé de tâche/statut, y compris `action: "status"`

Pour utiliser Google comme provider musical par défaut :

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

<Note>Voir [Génération de musique](/fr/tools/music-generation) pour les paramètres d'outils partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Synthèse vocale

Le fournisseur de synthèse vocale `google` fourni utilise le chemin TTS de l'API Gemini avec
`gemini-3.1-flash-tts-preview`.

- Voix par défaut : `Kore`
- Auth : `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY`, ou `GOOGLE_API_KEY`
- Sortie : WAV pour les pièces jointes TTS régulières, Opus pour les cibles de notes vocales, PCM pour Talk/téléphonie
- Sortie de note vocale : le PCM Google est encapsulé en WAV et transcodé en Opus 48 kHz avec `ffmpeg`

Le chemin TTS Gemini par lots de Google renvoie l'audio généré dans la réponse `generateContent`API terminée. Pour des conversations vocales avec la latence la plus faible, utilisez le provider de voix en temps réel de Google soutenu par l'API Gemini Live au lieu du TTS par lots.

Pour utiliser Google comme provider TTS par défaut :

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

Le TTS de l'API Gemini utilise des invites en langage naturel pour le contrôle du style. Définissez API`audioProfile` pour prépendre une invite de style réutilisable avant le texte parlé. Définissez `speakerName` lorsque votre texte d'invite fait référence à un locuteur nommé.

Le TTS de l'API Gemini accepte également des balises audio expressives entre crochets carrés dans le texte, telles que API`[whispers]` ou `[laughs]`. Pour garder les balises hors de la réponse de chat visible tout en les envoyant au TTS, placez-les à l'intérieur d'un bloc `[[tts:text]]...[[/tts:text]]` :

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>Une clé API de Google Cloud Console limitée à l'API Gemini APIAPI est valide pour ce provider. Ce n'est pas le chemin de l'API Cloud Text-to-Speech séparé.</Note>

## Voix en temps réel

Le plugin intégré `google`API enregistre un provider de voix en temps réel soutenu par l'API Gemini Live pour les ponts audio backend tels que Voice Call et Google Meet.

| Paramètre                     | Chemin de configuration                                             | Par défaut                                                                       |
| ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Modèle                        | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                  |
| Voix                          | `...google.voice`                                                   | `Kore`                                                                           |
| Température                   | `...google.temperature`                                             | (non défini)                                                                     |
| Sensibilité de démarrage VAD  | `...google.startSensitivity`                                        | (non défini)                                                                     |
| Sensibilité de fin VAD        | `...google.endSensitivity`                                          | (non défini)                                                                     |
| Durée du silence              | `...google.silenceDurationMs`                                       | (non défini)                                                                     |
| Gestion de l'activité         | `...google.activityHandling`                                        | Google par défaut, `start-of-activity-interrupts`                                |
| Couverture de tour            | `...google.turnCoverage`                                            | Google par défaut, `only-activity`                                               |
| Désactiver le VAD automatique | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                          |
| Reprise de session            | `...google.sessionResumption`                                       | `true`                                                                           |
| Compression du contexte       | `...google.contextWindowCompression`                                | `true`                                                                           |
| Clé API                       | `...google.apiKey`                                                  | Revient à `models.providers.google.apiKey`, `GEMINI_API_KEY` ou `GOOGLE_API_KEY` |

Exemple de configuration en temps réel pour l'appel vocal :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
  Google Live API utilise l'audio bidirectionnel et l'appel de fonctions sur un WebSocket. OpenClaw adapte l'audio du pont téléphonique/Meet au flux PCM Live API de Gemini et maintient les appels d'outils sur le contrat de voix en temps réel partagé. Laissez `temperature` non défini, sauf si vous avez besoin de modifications d'échantillonnage ; OpenClaw omet les valeurs non positives car Google
  Live peut renvoyer des transcriptions sans audio pour `temperature: 0`. La transcription de la Gemini API est activée sans `languageCodes` ; le SDK Google actuel rejette les indices de code de langue sur ce chemin de API.
</Note>

<Note>Le contrôle UI Talk prend en charge les sessions de navigateur Google Live avec des jetons à usage unique contraints. Les fournisseurs de voix en temps réel backend uniquement peuvent également passer par le transport de relais générique Gateway, qui conserve les identifiants du fournisseur sur la Gateway.</Note>

Pour la vérification en direct par le responsable, exécutez
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`.
Le smoke test couvre également les chemins backend/WebRTC OpenAI ; la partie Google génère le même
format de jeton Live API contraint utilisé par Control UI Talk, ouvre le point de terminaison
WebSocket du navigateur, envoie la charge utile de configuration initiale et attend
`setupComplete`.

## Configuration avancée

<AccordionGroup>
  <Accordion title="Réutilisation directe du cache Gemini">
    Pour les exécutions directes de la Gemini API (`api: "google-generative-ai"`), OpenClaw
    transmet un gestionnaire `cachedContent` configuré aux requêtes Gemini.

    - Configurez les paramètres par modèle ou globaux avec
      `cachedContent` ou l'ancien `cached_content`
    - Si les deux sont présents, `cachedContent` l'emporte
    - Exemple de valeur : `cachedContents/prebuilt-context`
    - L'utilisation du cache de Gemini est normalisée dans le `cacheRead` de OpenClaw à partir de
      `cachedContentTokenCount` en amont

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "google/gemini-2.5-pro": {
              params: {
                cachedContent: "cachedContents/prebuilt-context",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Notes d'utilisation du JSON de la CLI Gemini">
    Lors de l'utilisation du fournisseur OAuth `google-gemini-cli`, OpenClaw normalise
    la sortie JSON de la CLI comme suit :

    - Le texte de réponse provient du champ `response` du JSON de la CLI.
    - L'utilisation revient à `stats` lorsque la CLI laisse `usage` vide.
    - `stats.cached` est normalisé en OpenClaw `cacheRead`.
    - Si `stats.input` est manquant, OpenClaw dérive les jetons d'entrée de
      `stats.input_tokens - stats.cached`.

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon">
    Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY`
    est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagés et sélection du provider.
  </Card>
  <Card title="Génération de vidéos" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil de musique partagés et sélection du provider.
  </Card>
</CardGroup>
