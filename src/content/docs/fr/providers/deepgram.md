---
summary: "Transcription Deepgram pour les notes vocales entrantes"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You want Deepgram streaming transcription for Voice Call
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (Transcription Audio)

Deepgram est une API de reconnaissance vocale. Dans API, elle est utilisée pour la transcription de
messages audio/voix entrants via `tools.media.audio` et pour la STT en continu des appels vocaux
via `plugins.entries.voice-call.config.streaming`.

Pour la transcription par lots, OpenClaw télécharge le fichier audio complet vers Deepgram
et injecte la transcription dans le pipeline de réponse (bloc `{{Transcript}}` +
`[Audio]`). Pour le streaming d'appels vocaux, OpenClaw transmet en direct les trames
G.711 u-law vers le point de terminaison WebSocket `listen` de Deepgram et émet des transcriptions partielles ou
finales au fur et à mesure que Deepgram les renvoie.

| Détail            | Valeur                                                     |
| ----------------- | ---------------------------------------------------------- |
| Site Web          | [deepgram.com](https://deepgram.com)                       |
| Docs              | [developers.deepgram.com](https://developers.deepgram.com) |
| Auth              | `DEEPGRAM_API_KEY`                                         |
| Modèle par défaut | `nova-3`                                                   |

## Getting started

<Steps>
  <Step title="Définir votre clé API">
    Ajoutez votre clé API API à l'environnement :

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="Activer le fournisseur audio">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envoyer une note vocale">
    Envoyez un message audio via n'importe quel canal connecté. OpenClaw la transcrit
    via Deepgram et injecte la transcription dans le pipeline de réponse.
  </Step>
</Steps>

## Options de configuration

| Option            | Chemin                                                       | Description                                   |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | ID du modèle Deepgram (par défaut : `nova-3`) |
| `language`        | `tools.media.audio.models[].language`                        | Indication de langue (optionnel)              |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | Activer la détection de langue (optionnel)    |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | Activer la ponctuation (optionnel)            |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | Activer le formatage intelligent (optionnel)  |

<Tabs>
  <Tab title="Avec indication de langue">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Avec les options Deepgram">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## STT en continu pour les appels vocaux

Le plugin `deepgram` fourni enregistre également un fournisseur de transcription en temps réel pour le plugin Voice Call.

| Paramètre                  | Chemin de configuration                                                 | Par défaut                   |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Clé API                    | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | Revient à `DEEPGRAM_API_KEY` |
| Modèle                     | `...deepgram.model`                                                     | `nova-3`                     |
| Langue                     | `...deepgram.language`                                                  | (non défini)                 |
| Encodage                   | `...deepgram.encoding`                                                  | `mulaw`                      |
| Taux d'échantillonnage     | `...deepgram.sampleRate`                                                | `8000`                       |
| Détection de fin de phrase | `...deepgram.endpointingMs`                                             | `800`                        |
| Résultats intermédiaires   | `...deepgram.interimResults`                                            | `true`                       |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "deepgram",
            providers: {
              deepgram: {
                apiKey: "${DEEPGRAM_API_KEY}",
                model: "nova-3",
                endpointingMs: 800,
                language: "en-US",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>Voice Call reçoit l'audio téléphonique en G.711 u-law à 8 kHz. Le fournisseur de streaming Deepgram utilise par défaut `encoding: "mulaw"` et `sampleRate: 8000`, de sorte que les trames média Twilio peuvent être transmises directement.</Note>

## Remarques

<AccordionGroup>
  <Accordion title="Authentification">L'authentification suit l'ordre d'authentification standard des fournisseurs. `DEEPGRAM_API_KEY` est la méthode la plus simple.</Accordion>
  <Accordion title="Proxy et points de terminaison personnalisés">Remplacez les points de terminaison ou les en-têtes par `tools.media.audio.baseUrl` et `tools.media.audio.headers` lors de l'utilisation d'un proxy.</Accordion>
  <Accordion title="Comportement de sortie">La sortie suit les mêmes règles audio que les autres fournisseurs (limites de taille, délais d'attente, injection de transcription).</Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Outils médias" href="/fr/tools/media-overview" icon="photo-film">
    Aperçu du pipeline de traitement audio, image et vidéo.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration, y compris les paramètres des outils médias.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
  <Card title="FAQ" href="/fr/help/faq" icon="circle-question">
    Questions fréquentes sur la configuration d'OpenClaw.
  </Card>
</CardGroup>
