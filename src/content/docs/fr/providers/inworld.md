---
summary: "Synthèse vocale en continu Inworld pour les réponses OpenClaw"
read_when:
  - You want Inworld speech synthesis for outbound replies
  - You need PCM telephony or OGG_OPUS voice-note output from Inworld
title: "Inworld"
---

Inworld est un fournisseur de synthèse vocale en continu (TTS). Dans OpenClaw, il
synthétise l'audio des réponses sortantes (MP3 par défaut, OGG_OPUS pour les notes vocales)
et l'audio PCM pour les canaux de téléphonie tels que Voice Call.

OpenClaw envoie à Inworld une requête au point de terminaison TTS en continu, concatène les
fragments audio base64 renvoyés dans un seul tampon et transmet le résultat au
pipeline standard de réponse audio.

| Détail            | Valeur                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| Site Web          | [inworld.ai](https://inworld.ai)                                         |
| Docs              | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts)               |
| Auth              | `INWORLD_API_KEY` (HTTP Basic, identifiant du tableau de bord en Base64) |
| Voix par défaut   | `Sarah`                                                                  |
| Modèle par défaut | `inworld-tts-1.5-max`                                                    |

## Getting started

<Steps>
  <Step title="Définissez votre clé API">
    Copiez l'identifiant depuis votre tableau de bord Inworld (Workspace > API Keys)
    et définissez-le en tant que env var. La valeur est envoyée telle quelle en tant qu'identifiant
    HTTP Basic, ne l'encodez donc pas à nouveau en Base64 et ne la convertissez pas en jeton
    de porteur (bearer token).

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="Sélectionnez Inworld dans messages.tts">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              voiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envoyez un message">
    Envoyez une réponse via n'importe quel canal connecté. OpenClaw synthétise
    l'audio avec Inworld et le livre en MP3 (ou OGG_OPUS lorsque le canal
    attend une note vocale).
  </Step>
</Steps>

## Configuration options

| Option        | Chemin                                       | Description                                                                     |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `apiKey`      | `messages.tts.providers.inworld.apiKey`      | Identifiant du tableau de bord en Base64. Revient à `INWORLD_API_KEY`.          |
| `baseUrl`     | `messages.tts.providers.inworld.baseUrl`     | Remplacer l'URL de base de l'API Inworld (par défaut `https://api.inworld.ai`). |
| `voiceId`     | `messages.tts.providers.inworld.voiceId`     | Identifiant de voix (par défaut `Sarah`).                                       |
| `modelId`     | `messages.tts.providers.inworld.modelId`     | ID du modèle TTS (par défaut `inworld-tts-1.5-max`).                            |
| `temperature` | `messages.tts.providers.inworld.temperature` | Température d'échantillonnage `0..2` (facultatif).                              |

## Notes

<AccordionGroup>
  <Accordion title="Authentification">
    Inworld utilise l'authentification HTTP Basic avec une seule chaîne d'identification
    encodée en Base64. Copiez-la telle quelle depuis le tableau de bord Inworld. Le fournisseur l'envoie
    sous la forme `Authorization: Basic <apiKey>` sans encodage supplémentaire, donc
    ne l'encodez pas vous-même en Base64 et ne passez pas de jeton de type bearer.
    Voir [Notes d'authentification TTS](/fr/tools/tts#inworld-primary) pour le même avertissement.
  </Accordion>
  <Accordion title="Modèles">
    IDs de modèle pris en charge : `inworld-tts-1.5-max` (par défaut),
    `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`.
  </Accordion>
  <Accordion title="Sorties audio">
    Les réponses utilisent le MP3 par défaut. Lorsque la cible du canal est `voice-note`
    OpenClaw demande à Inworld du `OGG_OPUS` pour que l'audio soit diffusé sous forme de bulle vocale
    native. La synthèse téléphonique utilise du `PCM` brut à 22050 Hz pour alimenter
    le pont téléphonique.
  </Accordion>
  <Accordion title="Points de terminaison personnalisés">
    Remplacez l'hôte API par `messages.tts.providers.inworld.baseUrl`.
    Les barres obliques de fin sont supprimées avant l'envoi des requêtes.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Synthèse vocale" href="/fr/tools/tts" icon="waveform-lines">
    Vue d'ensemble de la synthèse vocale, fournisseurs et configuration `messages.tts`.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration, y compris les paramètres `messages.tts`.
  </Card>
  <Card title="Fournisseurs" href="/fr/providers" icon="grid">
    Tous les fournisseurs intégrés de OpenClaw.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
</CardGroup>
