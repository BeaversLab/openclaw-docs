---
summary: "Synthèse vocale Azure AI Speech pour les réponses OpenClaw"
read_when:
  - You want Azure Speech synthesis for outbound replies
  - You need native Ogg Opus voice-note output from Azure Speech
title: "Azure Speech"
---

Azure Speech est un fournisseur de synthèse vocale Azure AI Speech. Dans OpenClaw, il
synthétise par défaut l'audio de réponse sortant en MP3, en Ogg/Opus natif pour les
notes vocales, et en audio mulaw 8 kHz pour les canaux de téléphonie tels que Voice Call.

OpenClaw utilise directement l'API REST d'Azure Speech avec SSML et envoie le
format de sortie propriétaire via `X-Microsoft-OutputFormat`.

| Détail                            | Valeur                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Site Web                          | [Azure AI Speech](https://azure.microsoft.com/products/ai-services/ai-speech)                                   |
| Docs                              | [Synthèse vocale REST Speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech) |
| Auth                              | `AZURE_SPEECH_KEY` plus `AZURE_SPEECH_REGION`                                                                   |
| Voix par défaut                   | `en-US-JennyNeural`                                                                                             |
| Format de fichier par défaut      | `audio-24khz-48kbitrate-mono-mp3`                                                                               |
| Fichier de note vocale par défaut | `ogg-24khz-16bit-mono-opus`                                                                                     |

## Getting started

<Steps>
  <Step title="Créer une ressource Azure Speech">
    Dans le portail Azure, créez une ressource Speech. Copiez **CLÉ 1** à partir de
    Gestion des ressources > Clés et point de terminaison, et copiez l'emplacement de la
    ressource tel que `eastus`.

    ```
    AZURE_SPEECH_KEY=<speech-resource-key>
    AZURE_SPEECH_REGION=eastus
    ```

  </Step>
  <Step title="Sélectionner Azure Speech dans messages.tts">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "azure-speech",
          providers: {
            "azure-speech": {
              voice: "en-US-JennyNeural",
              lang: "en-US",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Envoyer un message">
    Envoyez une réponse via n'importe quel canal connecté. OpenClaw synthétise l'audio
    avec Azure Speech et livre du MP3 pour l'audio standard, ou Ogg/Opus lorsque
    le canal attend une note vocale.
  </Step>
</Steps>

## Options de configuration

| Option                  | Chemin                                                      | Description                                                                                              |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apiKey`                | `messages.tts.providers.azure-speech.apiKey`                | Clé de ressource Azure Speech. Se replie sur `AZURE_SPEECH_KEY`, `AZURE_SPEECH_API_KEY` ou `SPEECH_KEY`. |
| `region`                | `messages.tts.providers.azure-speech.region`                | Région de la ressource Azure Speech. Se replie sur `AZURE_SPEECH_REGION` ou `SPEECH_REGION`.             |
| `endpoint`              | `messages.tts.providers.azure-speech.endpoint`              | Remplacement facultatif du point de terminaison/de l'URL de base Azure Speech.                           |
| `baseUrl`               | `messages.tts.providers.azure-speech.baseUrl`               | Remplacement facultatif de l'URL de base Azure Speech.                                                   |
| `voice`                 | `messages.tts.providers.azure-speech.voice`                 | Nom court de la voix Azure (par défaut `en-US-JennyNeural`).                                             |
| `lang`                  | `messages.tts.providers.azure-speech.lang`                  | Code de langue SSML (par défaut `en-US`).                                                                |
| `outputFormat`          | `messages.tts.providers.azure-speech.outputFormat`          | Format de sortie du fichier audio (par défaut `audio-24khz-48kbitrate-mono-mp3`).                        |
| `voiceNoteOutputFormat` | `messages.tts.providers.azure-speech.voiceNoteOutputFormat` | Format de sortie des notes vocales (par défaut `ogg-24khz-16bit-mono-opus`).                             |

## Notes

<AccordionGroup>
  <Accordion title="Authentification">
    Azure Speech utilise une clé de ressource Speech, et non une clé Azure OpenAI. La clé
    est envoyée sous forme de `Ocp-Apim-Subscription-Key` ; OpenClaw dérive
    `https://<region>.tts.speech.microsoft.com` à partir de `region` sauf si vous
    fournissez `endpoint` ou `baseUrl`.
  </Accordion>
  <Accordion title="Noms de voix">
    Utilisez la valeur de `ShortName` de la voix Azure Speech, par exemple
    `en-US-JennyNeural`. Le fournisseur intégré peut lister les voix via la
    même ressource Speech et filtre les voix marquées comme dépréciées ou retirées.
  </Accordion>
  <Accordion title="Sorties audio">
    Azure accepte les formats de sortie tels que `audio-24khz-48kbitrate-mono-mp3`,
    `ogg-24khz-16bit-mono-opus` et `riff-24khz-16bit-mono-pcm`. OpenClaw
    demande Ogg/Opus pour les cibles `voice-note` afin que les canaux puissent envoyer des
    bulles vocales natives sans conversion MP3 supplémentaire.
  </Accordion>
  <Accordion title="Alias">
    `azure` est accepté comme alias de fournisseur pour les PR existants et la configuration utilisateur,
    mais la nouvelle configuration devrait utiliser `azure-speech` pour éviter toute confusion avec les
    fournisseurs de modèles Azure OpenAI.
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
    Tous les fournisseurs OpenClaw inclus.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et étapes de débogage.
  </Card>
</CardGroup>
