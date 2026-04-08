---
summary: "Talk mode : conversations vocales continues avec ElevenLabs TTS"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Mode Talk"
---

# Mode Talk

Le mode Talk est une boucle de conversation vocale continue :

1. Écouter la parole
2. Envoyer la transcription au modèle (session principale, chat.send)
3. Attendre la réponse
4. Speak it via the configured Talk provider (`talk.speak`)

## Comportement (macOS)

- **Superposition toujours active** tant que le mode Talk est activé.
- Transitions de phase **Écoute → Réflexion → Parole**.
- Lors d'une **courte pause** (fenêtre de silence), la transcription actuelle est envoyée.
- Les réponses sont **écrites dans WebChat** (identique à la frappe).
- **Interruption à la parole** (activé par défaut) : si l'utilisateur commence à parler pendant que l'assistant parle, nous arrêtons la lecture et notons l'horodatage de l'interruption pour la prochaine invite.

## Directives vocales dans les réponses

L'assistant peut préfixer sa réponse par une **ligne JSON unique** pour contrôler la voix :

```json
{ "voice": "<voice-id>", "once": true }
```

Règles :

- Uniquement la première ligne non vide.
- Les clés inconnues sont ignorées.
- `once: true` applies to the current reply only.
- Without `once`, the voice becomes the new default for Talk mode.
- La ligne JSON est supprimée avant la lecture TTS.

Clés prises en charge :

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
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

Valeurs par défaut :

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: when unset, Talk keeps the platform default pause window before sending the transcript (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`: falls back to `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (or first ElevenLabs voice when API key is available)
- `modelId`: defaults to `eleven_v3` when unset
- `apiKey`: falls back to `ELEVENLABS_API_KEY` (or gateway shell profile if available)
- `outputFormat`: defaults to `pcm_44100` on macOS/iOS and `pcm_24000` on Android (set `mp3_*` to force MP3 streaming)

## Interface macOS

- Bouton de la barre de menus : **Talk**
- Onglet Config : groupe **Talk Mode** (id de voix + interrupteur d'interruption)
- Superposition :
  - **Écoute** : le nuage pulse avec le niveau du microphone
  - **Réflexion** : animation d'enfoncement
  - **Parole** : anneaux rayonnants
  - Cliquer sur le nuage : arrêter de parler
  - Cliquer sur X : quitter le mode Talk

## Notes

- Nécessite les permissions Speech + Microphone.
- Uses `chat.send` against session key `main`.
- The gateway resolves Talk playback through `talk.speak` using the active Talk provider. Android falls back to local system TTS only when that RPC is unavailable.
- `stability` for `eleven_v3` is validated to `0.0`, `0.5`, or `1.0`; other models accept `0..1`.
- `latency_tier` est validé comme `0..4` lors de la définition.
- Android prend en charge les formats de sortie `pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.
