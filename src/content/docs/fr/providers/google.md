---
title: "Google (Gemini)"
summary: "Configuration de Google Gemini (clé API + OAuth, génération d'images, compréhension des médias, recherche web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension multimédia (image/audio/vidéo) et à la recherche Web via Gemini Grounding.

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : Google Gemini API
- Fournisseur alternatif : `google-gemini-cli` (OAuth)

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clé API">
    **Idéal pour :** un accès standard à l'API Gemini via Google AI Studio.

    <Steps>
      <Step title="Lancer l'onboarding">
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
    signalent des restrictions de compte lorsqu'ils utilisent OAuth de cette manière. Utilisation à vos propres risques.
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
    Si les requêtes CLI du OAuth Gemini échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou
    `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle et réessayez.
    </Note>

    <Note>
    Si la connexion échoue avant le démarrage du flux du navigateur, assurez-vous que la commande locale `gemini`
    est installée et présente sur `PATH`.
    </Note>

    Le provider `google-gemini-cli` OAuth uniquement est une surface d'inférence de texte
    distincte. La génération d'images, la compréhension des médias et Gemini Grounding restent sur
    l'identifiant de provider `google`.

  </Tab>
</Tabs>

## Capacités

| Capacité                  | Pris en charge    |
| ------------------------- | ----------------- |
| Complétions de chat       | Oui               |
| Génération d'images       | Oui               |
| Génération de musique     | Oui               |
| Compréhension d'images    | Oui               |
| Transcription audio       | Oui               |
| Compréhension vidéo       | Oui               |
| Recherche web (Grounding) | Oui               |
| Réflexion/raisonnement    | Oui (Gemini 3.1+) |
| Modèles Gemma 4           | Oui               |

<Tip>Les modèles Gemma 4 (par exemple `gemma-4-26b-a4b-it`) prennent en charge le mode de réflexion. OpenClaw réécrit `thinkingBudget` en un `thinkingLevel` Google pris en charge pour Gemma 4. Définir thinking sur `off` garde la réflexion désactivée au lieu de la mapper vers `MINIMAL`.</Tip>

## Génération d'images

Le fournisseur de génération d'images `google` inclus par défaut est
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Générer : jusqu'à 4 images par requête
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

Le plugin `google` inclus enregistre également la génération vidéo via l'outil partagé
`video_generate`.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte vers vidéo, image vers vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio`, `resolution` et `audio`
- Plage de durée actuelle : **4 à 8 secondes**

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

Le plugin `google` inclus enregistre également la génération de musique via l'outil partagé
`music_generate`.

- Modèle de musique par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées par session se détachent via le flux partagé de tâche/état, y compris `action: "status"`

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

## Configuration avancée

<AccordionGroup>
  <Accordion title="Réutilisation directe du cache Gemini">
    Pour les exécutions directes de l'API Gemini (`api: "google-generative-ai"`), OpenClaw
    transmet un descripteur `cachedContent` configuré aux requêtes Gemini.

    - Configurez les paramètres par modèle ou globaux avec
      `cachedContent` ou l'ancien `cached_content`
    - Si les deux sont présents, `cachedContent` l'emporte
    - Exemple de valeur : `cachedContents/prebuilt-context`
    - L'utilisation du cache de Gemini est normalisée dans les OpenClaw `cacheRead` à partir de
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

  <Accordion title="Notes d'utilisation JSON pour le CLI Gemini">
    Lors de l'utilisation du fournisseur OAuth `google-gemini-cli`, OpenClaw normalise
    la sortie JSON du CLI comme suit :

    - Le texte de réponse provient du champ `response` du JSON CLI.
    - L'utilisation revient à `stats` lorsque le CLI laisse `usage` vide.
    - `stats.cached` est normalisé dans les OpenClaw `cacheRead`.
    - Si `stats.input` est manquant, OpenClaw déduit les jetons d'entrée à partir de
      `stats.input_tokens - stats.cached`.

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY`
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
    Paramètres de l'outil d'image partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération musicale" href="/fr/tools/music-generation" icon="music">
    Paramètres de l'outil musical partagés et sélection du fournisseur.
  </Card>
</CardGroup>
