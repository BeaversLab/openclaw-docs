---
summary: "Configuration de Google Gemini (clé API + OAuth, génération d'images, compréhension des médias, TTS, recherche Web)"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension des médias (image/audio/vidéo), à la synthèse vocale et à la recherche Web via Gemini Grounding.

- Fournisseur : `google`
- Authentification : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : API Google Gemini
- Option d'exécution : `agents.defaults.agentRuntime.id: "google-gemini-cli"`
  réutilise l'OAuth de la CLI Gemini tout en conservant les références de modèle canoniques comme `google/*`.

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
    **Idéal pour :** réutiliser une connexion existante au CLI Gemini via PKCE OAuth au lieu d'une clé API distincte.

    <Warning>
    Le provider `google-gemini-cli` est une intégration non officielle. Certains utilisateurs
    signalent des restrictions de compte lors de l'utilisation de OAuth de cette manière. Utilisation à vos propres risques.
    </Warning>

    <Steps>
      <Step title="Installer le CLI Gemini">
        La commande locale `gemini` doit être disponible sur `PATH`.

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw prend en charge les installations via Homebrew ainsi que les installations globales via npm, y compris
        les configurations courantes Windows/npm.
      </Step>
      <Step title="Se connecter via OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Vérifier la disponibilité du modèle">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - Modèle par défaut : `google/gemini-3.1-pro-preview`
    - Runtime : `google-gemini-cli`
    - Alias : `gemini-cli`

    **Variables d'environnement :**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (Ou les variantes `GEMINI_CLI_*`.)

    <Note>
    Si les requêtes CLI du OAuth Gemini échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou
    `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle et réessayez.
    </Note>

    <Note>
    Si la connexion échoue avant le démarrage du flux du navigateur, assurez-vous que la commande locale `gemini`
    est installée et présente dans `PATH`.
    </Note>

    Les références de modèle `google-gemini-cli/*` sont des alias de compatibilité hérités. Les nouvelles
    configurations devraient utiliser des références de modèle `google/*` avec le runtime `google-gemini-cli`
    lorsqu'elles souhaitent une exécution locale du CLI Gemini.

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

<Tip>
Les modèles Gemini 3 utilisent `thinkingLevel` plutôt que `thinkingBudget`. OpenClaw mappe
les contrôles de raisonnement des alias Gemini 3, Gemini 3.1 et `gemini-*-latest` sur
`thinkingLevel` afin que les exécutions par défaut/à faible latence n'envoient pas de valeurs
`thinkingBudget` désactivées.

`/think adaptive` conserve la sémantique de réflexion dynamique de Google au lieu de choisir
un niveau OpenClaw fixe. Gemini 3 et Gemini 3.1 omettent un niveau `thinkingLevel` fixe afin que
Google puisse choisir le niveau ; Gemini 2.5 envoie la sentinelle dynamique
`thinkingBudget: -1` de Google.

Les modèles Gemma 4 (par exemple `gemma-4-26b-a4b-it`) prennent en charge le mode réflexion. OpenClaw
réécrit `thinkingBudget` en un niveau `thinkingLevel` Google pris en charge pour Gemma 4.
Définir la réflexion sur `off` préserve la réflexion désactivée au lieu de la mapper sur
`MINIMAL`.

</Tip>

## Génération d'images

Le fournisseur de génération d'images `google` inclus par défaut est
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Génération : jusqu'à 4 images par requête
- Mode édition : activé, jusqu'à 5 images en entrée
- Contrôles géométriques : `size`, `aspectRatio` et `resolution`

Pour utiliser Google comme fournisseur d'images par défaut :

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

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Génération vidéo

Le plugin `google` inclus enregistre également la génération vidéo via l'outil
`video_generate` partagé.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte vers vidéo, image vers vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio`, `resolution` et `audio`
- Durée de clamp actuelle : **4 à 8 secondes**

Pour utiliser Google comme fournisseur vidéo par défaut :

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

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Génération de musique

Le plugin `google` fourni enregistre également la génération de musique via l'outil `music_generate` partagé.

- Modèle de musique par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées par session se détachent via le flux partagé de tâche/statut, y compris `action: "status"`

Pour utiliser Google comme fournisseur de musique par défaut :

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

<Note>Voir [Génération de musique](/fr/tools/music-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Synthèse vocale

Le fournisseur de synthèse vocale `google` fourni utilise le chemin TTS de l'API Gemini avec `gemini-3.1-flash-tts-preview`.

- Voix par défaut : `Kore`
- Auth : `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- Sortie : WAV pour les pièces jointes TTS régulières, Opus pour les cibles de notes vocales, PCM pour Talk/téléphonie
- Sortie en note vocale : Le PCM Google est encapsulé en WAV et transcodé en Opus 48 kHz avec `ffmpeg`

Pour utiliser Google comme fournisseur TTS par défaut :

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

La TTS de l'API Gemini utilise des invites en langage naturel pour le contrôle du style. Définissez `audioProfile` pour ajouter une invite de style réutilisable avant le texte parlé. Définissez `speakerName` lorsque votre texte d'invite fait référence à un locuteur nommé.

La TTS de l'API Gemini accepte également des balises audio expressives entre crochets dans le texte, telles que `[whispers]` ou `[laughs]`. Pour garder les balises hors de la réponse visible du chat tout en les envoyant à la TTS, placez-les dans un bloc `[[tts:text]]...[[/tts:text]]` :

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>Une clé d'API de la Google Cloud Console restreinte à l'API Gemini est valide pour ce fournisseur. Ce n'est pas le chemin d'API Cloud Text-to-Speech distinct.</Note>

## Voix en temps réel

Le plugin `google` inclus enregistre un provider de voix en temps réel basé sur la API Gemini Live pour les ponts audio backend tels que Voice Call et Google Meet.

| Paramètre                     | Chemin de config                                                    | Par défaut                                                                        |
| ----------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Modèle                        | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                   |
| Voix                          | `...google.voice`                                                   | `Kore`                                                                            |
| Température                   | `...google.temperature`                                             | (non défini)                                                                      |
| Sensibilité de début VAD      | `...google.startSensitivity`                                        | (non défini)                                                                      |
| Sensibilité de fin VAD        | `...google.endSensitivity`                                          | (non défini)                                                                      |
| Durée de silence              | `...google.silenceDurationMs`                                       | (non défini)                                                                      |
| Gestion de l'activité         | `...google.activityHandling`                                        | Par défaut Google, `start-of-activity-interrupts`                                 |
| Couverture de tour            | `...google.turnCoverage`                                            | Par défaut Google, `only-activity`                                                |
| Désactiver le VAD automatique | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                           |
| Clé API                       | `...google.apiKey`                                                  | Replie sur `models.providers.google.apiKey`, `GEMINI_API_KEY` ou `GOOGLE_API_KEY` |

Exemple de config en temps réel Voice Call :

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
  La API Google Live utilise l'audio bidirectionnel et l'appel de fonctions sur un WebSocket. OpenClaw adapte l'audio du pont téléphonie/Meet au flux PCM Live de la API Gemini et maintient les appels d'outils sur le contrat de voix en temps réel partagé. Laissez `temperature` non défini sauf si vous avez besoin de modifications d'échantillonnage ; OpenClaw omet les valeurs non positives car Google
  Live peut renvoyer des transcriptions sans audio pour `temperature: 0`. La transcription de la API Gemini est activée sans `languageCodes` ; le SDK Google actuel rejette les indices de code de langue sur ce chemin de API.
</Note>

<Note>Control UI Talk prend en charge les sessions de navigateur Google Live avec des jetons à usage unique contraints. Les providers de voix en temps réel backend uniquement peuvent également passer par le transport relais générique Gateway, qui conserve les identifiants du provider sur la Gateway.</Note>

Pour la vérification en direct par le mainteneur, exécutez
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`.
Le composant Google génère le même jeton contraint de API Live API que celui utilisé par Control
UI Talk, ouvre le point de terminaison WebSocket du navigateur, envoie la charge utile de configuration initiale,
et attend `setupComplete`.

## Configuration avancée

<AccordionGroup>
  <Accordion title="Réutilisation directe du cache Gemini">
    Pour les exécutions directes de l'API Gemini (`api: "google-generative-ai"`), OpenClaw
    transmet un gestionnaire `cachedContent` configuré aux requêtes Gemini.

    - Configurez les paramètres par modèle ou globaux avec `cachedContent` ou l'ancien `cached_content`
    - Si les deux sont présents, `cachedContent` prime
    - Exemple de valeur : `cachedContents/prebuilt-context`
    - L'utilisation du cache Gemini est normalisée en OpenClaw `cacheRead` à partir de `cachedContentTokenCount` en amont

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

  <Accordion title="Remarques sur l'utilisation du JSON CLI Gemini">
    Lors de l'utilisation du fournisseur OAuth `google-gemini-cli`, OpenClaw normalise
    la sortie JSON du CLI comme suit :

    - Le texte de réponse provient du champ `response` du JSON du CLI.
    - L'utilisation revient à `stats` lorsque le CLI laisse `usage` vide.
    - `stats.cached` est normalisé en OpenClaw `cacheRead`.
    - Si `stats.input` est manquant, OpenClaw dérive les jetons d'entrée de `stats.input_tokens - stats.cached`.

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY`
    est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagée et sélection du fournisseur.
  </Card>
  <Card title="Génération de vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil de vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil de musique partagés et sélection du fournisseur.
  </Card>
</CardGroup>
