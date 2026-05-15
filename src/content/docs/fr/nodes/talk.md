---
summary: "Mode discussion : conversations vocales continues via STT/TTS local et voix en temps réel"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk mode"
---

Le mode discussion existe sous deux formes à l'exécution :

- Le mode discussion natif macOS/iOS/Android utilise la reconnaissance vocale locale, la discussion Gateway et la TTS macOSiOSAndroidGateway`talk.speak`. Les nœuds annoncent la capacité `talk` et déclarent les commandes `talk.*` qu'ils prennent en charge.
- Le mode discussion navigateur utilise `talk.client.create` pour les sessions `webrtc` et `provider-websocket` appartenant au client, ou `talk.session.create`Gateway pour les sessions `gateway-relay` appartenant au Gateway. `managed-room`Gateway est réservé pour le transfert Gateway et les salons talkie-walkie.
- Les clients de transcription uniquement utilisent `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`, puis `talk.session.appendAudio`, `talk.session.cancelTurn` et `talk.session.close` lorsqu'ils ont besoin de sous-titres ou de dictée sans réponse vocale de l'assistant.

Le mode discussion natif est une boucle de conversation vocale continue :

1. Écouter la parole
2. Envoyer la transcription au modèle via la session active
3. Attendre la réponse
4. La prononcer via le provider Talk configuré (`talk.speak`)

Le mode discussion en temps réel navigateur transmet les appels d'outils du provider via `talk.client.toolCall` ; les clients navigateurs n'appellent pas `chat.send` directement pour les consultations en temps réel.

Le mode discussion de transcription uniquement émet la même enveloppe d'événements Talk commune que les sessions en temps réel et STT/TTS, mais utilise `mode: "transcription"` et `brain: "none"`. Il est destiné aux sous-titres, à la dictée et à la capture de parole observation uniquement ; les notes vocales téléchargées en une seule fois utilisent toujours le chemin média/audio.

## Comportement (macOS)

- **Superposition toujours active** pendant que le mode discussion est activé.
- Transitions de phase **Écoute → Réflexion → Parole**.
- Lors d'une **courte pause** (fenêtre de silence), la transcription actuelle est envoyée.
- Les réponses sont **écrites dans WebChat** (identique à la frappe).
- **Interrompre sur la parole** (activé par défaut) : si l'utilisateur commence à parler pendant que l'assistant s'exprime, nous arrêtons la lecture et notons l'horodatage de l'interruption pour la prochaine invite.

## Directives vocales dans les réponses

L'assistant peut préfixer sa réponse par une **seule ligne JSON** pour contrôler la voix :

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
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          apiKey: "openai_api_key",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

Valeurs par défaut :

- `interruptOnSpeech` : true
- `silenceTimeoutMs` : si non défini, Talk conserve la fenêtre de pause par défaut de la plate-forme avant d'envoyer la transcription (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider` : sélectionne le provider Talk actif. Utilisez `elevenlabs`, `mlx` ou `system` pour les chemins de lecture locaux macOS.
- `providers.<provider>.voiceId` : revient à `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` pour ElevenLabs (ou à la première voix ElevenLabs lorsque la clé API est disponible).
- `providers.elevenlabs.modelId` : par défaut, `eleven_v3` si non défini.
- `providers.mlx.modelId` : par défaut, `mlx-community/Soprano-80M-bf16` si non défini.
- `providers.elevenlabs.apiKey` : revient à `ELEVENLABS_API_KEY` (ou au profil shell de la passerelle si disponible).
- `consultThinkingLevel` : substitution facultative du niveau de réflexion pour toute l'exécution de l'agent OpenClaw en arrière-plan des appels `openclaw_agent_consult` temps réel.
- `consultFastMode` : substitution facultative du mode rapide pour les appels `openclaw_agent_consult` temps réel.
- `realtime.provider` : sélectionne le fournisseur de voix temps réel navigateur/serveur actif. Utilisez `openai` pour WebRTC, `google` pour le fournisseur WebSocket, ou un fournisseur pont uniquement via le relais Gateway.
- `realtime.providers.<provider>` stocke la configuration temps réel propriétaire du fournisseur. Le navigateur ne reçoit que des identifiants de session éphémères ou contraints, jamais une clé API standard.
- `realtime.providers.openai.voice` : id de voix temps réel intégré de OpenAI. Les voix `gpt-realtime-2` actuelles sont `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin` et `cedar` ; `marin` et `cedar` sont recommandées pour une meilleure qualité.
- `realtime.brain` : `agent-consult` achemine les appels d'outil temps réel via la stratégie Gateway ; `direct-tools` est un comportement de compatibilité propriétaire uniquement ; `none` est pour la transcription ou l'orchestration externe.
- `realtime.instructions` : ajoute des instructions système orientées fournisseur à l'invite temps réel intégrée de OpenClaw. Utilisez-le pour le style et le ton de la voix ; OpenClaw conserve les directives `openclaw_agent_consult` par défaut.
- `talk.catalog` expose les modes valides, transports, stratégies cérébrales, formats audio temps réel et indicateurs de capacité de chaque fournisseur afin que les clients Talk de première partie puissent éviter les combinaisons non prises en charge.
- Les fournisseurs de transcription en continu sont découverts via `talk.catalog.transcription`. Le relais Gateway actuel utilise la configuration du fournisseur de flux Voice Call jusqu'à ce que la surface de configuration de transcription Talk dédiée soit ajoutée.
- `speechLocale` : identifiant de locale BCP 47 facultatif pour la reconnaissance vocale Talk sur l'appareil sur iOS/macOS. Laisser non défini pour utiliser la valeur par défaut de l'appareil.
- `outputFormat` : par défaut `pcm_44100` sur macOS/iOS et `pcm_24000` sur Android (définir `mp3_*` pour forcer le flux MP3)

## Interface macOS

- Bouton de la barre de menus : **Talk**
- Onglet Config : groupe **Talk Mode** (identifiant vocal + bouton d'interruption)
- Superposition :
  - **Écoute** : le nuage pulse en fonction du niveau du micro
  - **Réflexion** : animation d'enfoncement
  - **Parole** : anneaux rayonnants
  - Clic sur le nuage : arrêter de parler
  - Clic sur X : quitter le mode Talk

## Interface Android

- Bouton de l'onglet Vocal : **Talk**
- Le **Micro** manuel et **Talk** sont des modes de capture d'exécution mutuellement exclusifs.
- Le micro manuel s'arrête lorsque l'application passe en arrière-plan ou lorsque l'utilisateur quitte l'onglet Vocal.
- Le mode Talk continue de s'exécuter jusqu'à ce qu'il soit désactivé ou que le nœud Android se déconnecte, et utilise le type de service de premier plan de microphone d'Android pendant son activité.

## Notes

- Nécessite les permissions Parole + Microphone.
- Le mode Talk natif utilise la session Gateway active et n'utilise l'interrogation de l'historique que lorsque les événements de réponse ne sont pas disponibles.
- Le mode Talk en temps réel du navigateur utilise `talk.client.toolCall` pour `openclaw_agent_consult` au lieu d'exposer `chat.send` aux sessions de navigateur détenues par le fournisseur.
- Le mode Talk de transcription uniquement utilise `talk.session.create`, `talk.session.appendAudio`, `talk.session.cancelTurn` et `talk.session.close` ; les clients s'abonnent à `talk.event` pour les mises à jour de transcription partielles/finales.
- La passerelle résout la lecture Talk via `talk.speak` en utilisant le fournisseur Talk actif. Android revient au TTS du système local uniquement lorsque ce RPC n'est pas disponible.
- La lecture MLX locale de macOS utilise l'assistant groupé `openclaw-mlx-tts` lorsqu'il est présent, ou un exécutable sur `PATH`. Définissez `OPENCLAW_MLX_TTS_BIN` pour pointer vers un binaire d'assistant personnalisé pendant le développement.
- `stability` pour `eleven_v3` est validé à `0.0`, `0.5` ou `1.0` ; d'autres modèles acceptent `0..1`.
- `latency_tier` est validé à `0..4` lorsqu'il est défini.
- Android prend en charge les formats de sortie `pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.

## Connexes

- [Réveil vocal](/fr/nodes/voicewake)
- [Notes audio et vocales](/fr/nodes/audio)
- [Compréhension des médias](/fr/nodes/media-understanding)
