---
summary: "Transcription Deepgram pour les notes vocales entrantes"
read_when:
  - You want Deepgram speech-to-text for audio attachments
  - You need a quick Deepgram config example
title: "Deepgram"
---

# Deepgram (Transcription Audio)

Deepgram est une API de reconnaissance vocale. Dans OpenClaw, elle est utilisée pour la **transcription de notes audio/voix entrantes** via `tools.media.audio`.

Lorsqu'elle est activée, OpenClaw télécharge le fichier audio vers Deepgram et injecte la transcription dans le pipeline de réponse (bloc `{{Transcript}}` + `[Audio]`). Il ne s'agit **pas de streaming** ; cela utilise le point de terminaison de transcription préenregistrée.

| Détail            | Valeur                                                     |
| ----------------- | ---------------------------------------------------------- |
| Site Web          | [deepgram.com](https://deepgram.com)                       |
| Docs              | [developers.deepgram.com](https://developers.deepgram.com) |
| Auth              | `DEEPGRAM_API_KEY`                                         |
| Modèle par défaut | `nova-3`                                                   |

## Getting started

<Steps>
  <Step title="Définissez votre clé API">
    Ajoutez votre clé API Deepgram à l'environnement :

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="Activez le fournisseur audio">
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
  <Step title="Envoyez une note vocale">
    Envoyez un message audio via n'importe quel canal connecté. OpenClaw le transcrit
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

## Notes

<AccordionGroup>
  <Accordion title="Authentification">L'authentification suit l'ordre d'authentification standard du fournisseur. `DEEPGRAM_API_KEY` est le chemin le plus simple.</Accordion>
  <Accordion title="Proxy et points de terminaison personnalisés">Remplacez les points de terminaison ou les en-têtes avec `tools.media.audio.baseUrl` et `tools.media.audio.headers` lors de l'utilisation d'un proxy.</Accordion>
  <Accordion title="Comportement de la sortie">La sortie suit les mêmes règles audio que les autres fournisseurs (limites de taille, délais d'attente, injection de transcription).</Accordion>
</AccordionGroup>

<Note>La transcription Deepgram est **uniquement pré-enregistrée** (pas de streaming en temps réel). OpenClaw télécharge le fichier audio complet et attend la transcription complète avant de l'injecter dans la conversation.</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Outils médias" href="/fr/tools/media" icon="photo-film">
    Aperçu du pipeline de traitement audio, image et vidéo.
  </Card>
  <Card title="Configuration" href="/fr/configuration" icon="gear">
    Référence complète de la configuration, y compris les paramètres des outils médias.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
  <Card title="FAQ" href="/fr/help/faq" icon="circle-question">
    Questions fréquemment posées sur la configuration de OpenClaw.
  </Card>
</CardGroup>
