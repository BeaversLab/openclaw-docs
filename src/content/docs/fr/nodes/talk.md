---
summary: "Talk mode : conversations vocales continues avec des fournisseurs TTS configurés"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk mode"
---

Talk mode est une boucle de conversation vocale continue :

1. Écouter la parole
2. Envoyer la transcription au modèle (session principale, chat.send)
3. Attendre la réponse
4. La prononcer via le fournisseur Talk configuré (`talk.speak`)

## Comportement (macOS)

- **Superposition toujours active** tant que Talk mode est activé.
- Transitions de phase **Écoute → Réflexion → Parole**.
- Lors d'une **courte pause** (fenêtre de silence), la transcription actuelle est envoyée.
- Les réponses sont **écrites dans WebChat** (identique à la saisie au clavier).
- **Interruption sur la parole** (activé par défaut) : si l'utilisateur commence à parler pendant que l'assistant parle, nous arrêtons la lecture et notons l'horodatage de l'interruption pour la prochaine invite.

## Directives vocales dans les réponses

L'assistant peut préfixer sa réponse par une **ligne JSON unique** pour contrôler la voix :

```json
{ "voice": "<voice-id>", "once": true }
```

Règles :

- Uniquement la première ligne non vide.
- Les clés inconnues sont ignorées.
- `once: true` s'applique uniquement à la réponse actuelle.
- Sans `once`, la voix devient la nouvelle valeur par défaut pour Talk mode.
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
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

Valeurs par défaut :

- `interruptOnSpeech` : true
- `silenceTimeoutMs` : non défini, Talk conserve la fenêtre de pause par défaut de la plateforme avant d'envoyer la transcription (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider` : sélectionne le provider Talk actif. Utilisez `elevenlabs`, `mlx` ou `system` pour les chemins de lecture locaux macOS.
- `providers.<provider>.voiceId` : revient à `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` pour ElevenLabs (ou à la première voix ElevenLabs lorsque la clé API est disponible).
- `providers.elevenlabs.modelId` : par défaut, `eleven_v3` si non défini.
- `providers.mlx.modelId` : par défaut, `mlx-community/Soprano-80M-bf16` si non défini.
- `providers.elevenlabs.apiKey` : revient à `ELEVENLABS_API_KEY` (ou au profil shell de passerelle si disponible).
- `speechLocale` : identifiant de locale BCP 47 facultatif pour la reconnaissance vocale Talk sur l'appareil sur iOS/macOS. Laissez non défini pour utiliser la valeur par défaut de l'appareil.
- `outputFormat` : par défaut, `pcm_44100` sur macOS/iOS et `pcm_24000` sur Android (définissez `mp3_*` pour forcer le streaming MP3).

## Interface macOS

- Bouton de la barre de menus : **Talk**
- Onglet Config : groupe **Talk Mode** (id de voix + interrupteur d'interruption)
- Superposition :
  - **Écoute** : le nuage pulse en fonction du niveau du microphone
  - **Réflexion** : animation d'enfoncement
  - **Parole** : cercles rayonnants
  - Clic sur le nuage : arrêter de parler
  - Clic sur X : quitter le mode Talk

## Interface Android

- Bouton de l'onglet Voice : **Talk**
- Le **Mic** manuel et **Talk** sont des modes de capture d'exécution mutuellement exclusifs.
- Le microphone manuel s'arrête lorsque l'application passe en arrière-plan ou que l'utilisateur quitte l'onglet Voice.
- Le mode Talk continue de fonctionner jusqu'à ce qu'il soit désactivé ou que le nœud Android se déconnecte, et utilise le type de service de premier plan du microphone de Android lorsqu'il est actif.

## Notes

- Nécessite les permissions Speech + Microphone.
- Utilise `chat.send` avec la clé de session `main`.
- La passerelle résout la lecture Talk via `talk.speak` en utilisant le provider Talk actif. Android revient au TTS du système local uniquement lorsque cette RPC est indisponible.
- La lecture MLX locale macOS utilise l'assistant groupé `openclaw-mlx-tts` lorsqu'il est présent, ou un exécutable sur `PATH`. Définissez `OPENCLAW_MLX_TTS_BIN` pour pointer vers un binaire d'assistant personnalisé pendant le développement.
- `stability` pour `eleven_v3` est validé pour `0.0`, `0.5` ou `1.0` ; d'autres modèles acceptent `0..1`.
- `latency_tier` est validé pour `0..4` lorsqu'il est défini.
- Android prend en charge les formats de sortie `pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.

## Connexes

- [Réveil vocal](/fr/nodes/voicewake)
- [Notes audio et vocales](/fr/nodes/audio)
- [Compréhension des médias](/fr/nodes/media-understanding)
