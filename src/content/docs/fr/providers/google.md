---
title: "Google (Gemini)"
summary: "Configuration de Google Gemini (clé API + OAuth, génération d'images, compréhension des médias, TTS, recherche web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension des médias (image/audio/vidéo), à la synthèse vocale et à la recherche web via Gemini Grounding.

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : Google Gemini API
- Fournisseur alternatif : `google-gemini-cli` (OAuth)

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clé API%%%%">
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
    **Idéal pour :** réutiliser une connexion existante au Gemini CLI via OAuth PKCE au lieu d'une clé d'API distincte.

    <Warning>
    Le fournisseur `google-gemini-cli` est une intégration non officielle. Certains utilisateurs
    signalent des restrictions de compte lors de l'utilisation d'OAuth de cette manière. Utilisation à vos propres risques.
    </Warning>

    <Steps>
      <Step title="Installer le Gemini CLI">
        La commande locale `gemini` doit être disponible sur `PATH`.

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw prend en charge les installations via Homebrew ainsi que les installations globales npm, y compris
        les configurations communes Windows/npm.
      </Step>
      <Step title="Se connecter via OAuth">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider google-gemini-cli
        ```
      </Step>
    </Steps>

    - Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`
    - Alias : `gemini-cli`

    **Variables d'environnement :**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (Ou les variantes `GEMINI_CLI_*`.)

    <Note>
    Si les requêtes CLI du Gemini OAuth échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou
    `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle et réessayez.
    </Note>

    <Note>
    Si la connexion échoue avant le début du flux du navigateur, assurez-vous que la commande locale `gemini`
    est installée et présente sur `PATH`.
    </Note>

    Le fournisseur `google-gemini-cli` en OAuth uniquement est une surface d'inférence de texte
    distincte. La génération d'images, la compréhension des médias et le Gemini Grounding restent sur
    l'identifiant de fournisseur `google`.

  </Tab>
</Tabs>

## Capacités

| Capacité                  | Pris en charge                |
| ------------------------- | ----------------------------- |
| Complétions de chat       | Oui                           |
| Génération d'images       | Oui                           |
| Génération de musique     | Oui                           |
| Synthèse vocale           | Oui                           |
| Compréhension d'images    | Oui                           |
| Transcription audio       | Oui                           |
| Compréhension vidéo       | Oui                           |
| Recherche web (Grounding) | Oui                           |
| Réflexion/Raisonnement    | Oui (Gemini 2.5+ / Gemini 3+) |
| Modèles Gemma 4           | Oui                           |

<Tip>
Les modèles Gemini 3 utilisent `thinkingLevel` plutôt que `thinkingBudget`. OpenClaw mappe les
contrôles de raisonnement des alias Gemini 3, Gemini 3.1 et `gemini-*-latest` vers
`thinkingLevel` afin que les exécutions par défaut/à faible latence n'envoient pas de valeurs
`thinkingBudget` désactivées.

Les modèles Gemma 4 (par exemple `gemma-4-26b-a4b-it`) prennent en charge le mode de réflexion. OpenClaw
réécrit `thinkingBudget` vers un `thinkingLevel` Google pris en charge pour Gemma 4.
Le fait de définir la réflexion sur `off` préserve la réflexion désactivée au lieu de la mapper vers
`MINIMAL`.

</Tip>

## Génération d'images

Le provider de génération d'images `google` inclus par défaut correspond à
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Génération : jusqu'à 4 images par requête
- Mode édition : activé, jusqu'à 5 images en entrée
- Contrôles géométriques : `size`, `aspectRatio` et `resolution`

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

<Note>Voir [Image Generation](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

## Génération vidéo

Le plugin `google` inclus enregistre également la génération vidéo via l'outil partagé
`video_generate`.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte-vers-vidéo, image-vers-vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio`, `resolution` et `audio`
- Plage de durée actuelle : **4 à 8 secondes**

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

<Note>Voir [Video Generation](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

## Génération musicale

Le plugin `google` inclus enregistre également la génération musicale via l'outil partagé
`music_generate`.

- Modèle musical par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées en session se détachent via le flux de tâches/statut partagé, y compris `action: "status"`

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

Le fournisseur de reconnaissance vocale `google` fourni utilise le chemin TTS de l'API Gemini avec
`gemini-3.1-flash-tts-preview`.

- Voix par défaut : `Kore`
- Auth : `messages.tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY`, ou `GOOGLE_API_KEY`
- Sortie : WAV pour les pièces jointes TTS régulières, PCM pour Talk/téléphonie
- Sortie native de note vocale : non prise en charge sur ce chemin de l'API Gemini car l'API renvoie du PCM plutôt que de l'Opus

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
        },
      },
    },
  },
}
```

La TTS de l'API Gemini accepte des balises audio expressives entre crochets dans le texte, comme
`[whispers]` ou `[laughs]`. Pour empêcher les balises d'apparaître dans la réponse de chat visible tout
en les envoyant à la TTS, placez-les dans un bloc `[[tts:text]]...[[/tts:text]]` :

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>Une clé d'API Google Cloud Console restreinte à l'API Gemini est valide pour ce fournisseur. Ce n'est pas le chemin distinct de l'API Cloud Text-to-Speech.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Direct Gemini cache reuse">
    Pour les exécutions directes de l'API Gemini (`api: "google-generative-ai"`), OpenClaw
    transmet un gestionnaire `cachedContent` configuré aux requêtes Gemini.

    - Configurez les paramètres par modèle ou globaux avec soit
      `cachedContent` soit l'ancien `cached_content`
    - Si les deux sont présents, `cachedContent` l'emporte
    - Exemple de valeur : `cachedContents/prebuilt-context`
    - L'utilisation du cache Gemini est normalisée dans les `cacheRead` d'OpenClaw à partir des
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
    - `stats.cached` est normalisé en `cacheRead` OpenClaw.
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
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil de musique partagés et sélection du fournisseur.
  </Card>
</CardGroup>
