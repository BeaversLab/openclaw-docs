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
4. La lire via ElevenLabs (lecture en continu)

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

Valeurs par défaut :

- `interruptOnSpeech` : true
- `silenceTimeoutMs` : si non défini, Talk conserve la fenêtre de pause par défaut de la plateforme avant d'envoyer la transcription (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId` : revient à `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (ou à la première voix ElevenLabs lorsque la clé API est disponible)
- `modelId` : défaut à `eleven_v3` si non défini
- `apiKey` : revient à `ELEVENLABS_API_KEY` (ou au profil shell de la passerelle si disponible)
- `outputFormat` : défaut à `pcm_44100` sur macOS/iOS et `pcm_24000` sur Android (définir `mp3_*` pour forcer le streaming MP3)

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
- Utilise `chat.send` contre la clé de session `main`.
- Le TTS utilise l'API de streaming ElevenLabs avec `ELEVENLABS_API_KEY` et la lecture incrémentale sur API/macOS/iOS pour une latence plus faible.
- `stability` pour `eleven_v3` est validé à `0.0`, `0.5`, ou `1.0` ; les autres modèles acceptent `0..1`.
- `latency_tier` est validé à `0..4` lorsqu'il est défini.
- Android prend en charge les formats de sortie `pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.

import fr from '/components/footer/fr.mdx';

<fr />
