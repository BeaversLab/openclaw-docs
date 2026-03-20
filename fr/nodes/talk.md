---
summary: "Talk mode: continuous speech conversations with ElevenLabs TTS"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk Mode"
---

# Talk Mode

Talk mode is a continuous voice conversation loop:

1. Listen for speech
2. Send transcript to the model (main session, chat.send)
3. Wait for the response
4. Speak it via ElevenLabs (streaming playback)

## Behavior (macOS)

- **Always-on overlay** while Talk mode is enabled.
- **Listening → Thinking → Speaking** phase transitions.
- On a **short pause** (silence window), the current transcript is sent.
- Replies are **written to WebChat** (same as typing).
- **Interrupt on speech** (default on): if the user starts talking while the assistant is speaking, we stop playback and note the interruption timestamp for the next prompt.

## Voice directives in replies

L'assistant peut préfixer sa réponse par une **ligne JSON unique** pour contrôler la voix :

```json
{ "voice": "<voice-id>", "once": true }
```

Règles :

- Uniquement la première ligne non vide.
- Les clés inconnues sont ignorées.
- `once: true` s'applique uniquement à la réponse actuelle.
- Sans `once`, la voix devient la nouvelle valeur par défaut pour le mode Talk.
- La ligne JSON est supprimée avant la lecture TTS.

Clés prises en charge :

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (MPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Config (`~/.openclaw/openclaw.json`)

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

Par défaut :

- `interruptOnSpeech` : true
- `silenceTimeoutMs` : lorsqu'il n'est pas défini, Talk conserve la fenêtre de pause par défaut de la plateforme avant l'envoi de la transcription (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId` : revient à `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (ou à la première voix ElevenLabs lorsque la clé API est disponible)
- `modelId` : correspond par défaut à `eleven_v3` si non défini
- `apiKey` : revient à `ELEVENLABS_API_KEY` (ou au profil de shell de passerelle si disponible)
- `outputFormat` : valeur par défaut `pcm_44100` sur macOS/iOS et `pcm_24000` sur Android (définir `mp3_*` pour forcer le streaming MP3)

## Interface macOS

- Bascule de la barre de menus : **Talk**
- Onglet Config : groupe **Talk Mode** (id de voix + bascule d'interruption)
- Superposition :
  - **Écoute** : le nuage pulse avec le niveau du microphone
  - **Réflexion** : animation d'enfoncement
  - **Parole** : anneaux rayonnants
  - Cliquer sur le nuage : arrêter de parler
  - Cliquer sur X : quitter le mode Talk

## Notes

- Nécessite les autorisations de reconnaissance vocale et de microphone.
- Utilise `chat.send` avec la clé de session `main`.
- Le TTS utilise l'API de streaming ElevenLabs avec `ELEVENLABS_API_KEY` et une lecture incrémentale sur macOS/iOS/Android pour une latence plus faible.
- `stability` pour `eleven_v3` est validé par rapport à `0.0`, `0.5` ou `1.0` ; d'autres modèles acceptent `0..1`.
- `latency_tier` est validé par rapport à `0..4` lorsqu'il est défini.
- Android prend en charge les formats de sortie `pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.

import fr from "/components/footer/fr.mdx";

<fr />
