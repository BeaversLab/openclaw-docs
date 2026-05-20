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
- Android Talk peut opter pour des sessions de relais en temps réel détenues par Gateway avec AndroidGateway`talk.realtime.mode: "realtime"` et `talk.realtime.transport: "gateway-relay"`Gateway. Sinon, il reste sur la reconnaissance vocale native, le chat Gateway et `talk.speak`.
- Les clients de transcription uniquement utilisent `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`, puis `talk.session.appendAudio`, `talk.session.cancelTurn` et `talk.session.close` lorsqu'ils ont besoin de sous-titres ou de dictée sans réponse vocale de l'assistant.

Le mode Talk natif est une boucle de conversation vocale continue :

1. Écouter la parole
2. Envoyer la transcription au modèle via la session active
3. Attendre la réponse
4. La prononcer via le fournisseur Talk configuré (`talk.speak`)

Le mode Talk en temps réel du navigateur transmet les appels d'outils du fournisseur via `talk.client.toolCall` ; les clients navigateurs n'appellent pas `chat.send` directement pour les consultations en temps réel.

Le mode Talk de transcription uniquement émet la même enveloppe d'événement Talk commune que les sessions en temps réel et STT/TTS, mais utilise `mode: "transcription"` et `brain: "none"`. Il est destiné aux sous-titres, à la dictée et à la capture de parole en observation seule ; les notes vocales téléchargées en une seule fois utilisent toujours le chemin média/audio.

## Comportement (macOS)

- **Superposition toujours active** tant que le mode Talk est activé.
- Transitions de phase **Écoute → Réflexion → Parole**.
- Lors d'une **courte pause** (fenêtre de silence), la transcription actuelle est envoyée.
- Les réponses sont **écrites dans WebChat** (comme lors de la frappe).
- **Interrompre sur parole** (activé par défaut) : si l'utilisateur commence à parler alors que l'assistant parle, nous arrêtons la lecture et notons l'horodatage de l'interruption pour la prochaine invite.

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

Par défaut :

- `interruptOnSpeech` : true
- `silenceTimeoutMs` : si non défini, Talk conserve la fenêtre de pause par défaut de la plateforme avant d'envoyer la transcription (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider` : sélectionne le provider Talk actif. Utilisez `elevenlabs`, `mlx` ou `system` pour les chemins de lecture locaux macOS.
- `providers.<provider>.voiceId` : revient à `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` pour ElevenLabs (ou à la première voix ElevenLabs lorsque la clé API est disponible).
- `providers.elevenlabs.modelId` : par défaut, `eleven_v3` si non défini.
- `providers.mlx.modelId` : par défaut, `mlx-community/Soprano-80M-bf16` si non défini.
- `providers.elevenlabs.apiKey` : revient à `ELEVENLABS_API_KEY` (ou au profil shell de la passerelle si disponible).
- `consultThinkingLevel` : substitution facultative du niveau de réflexion pour l'exécution complète de l'agent OpenClaw derrière les appels `openclaw_agent_consult` en temps réel.
- `consultFastMode` : substitution facultative du mode rapide pour les appels `openclaw_agent_consult` en temps réel.
- `realtime.provider` : sélectionne le provider de voix en temps réel actif pour le navigateur/serveur. Utilisez `openai` pour WebRTC, `google` pour le provider WebSocket, ou un provider de pont uniquement via le relais Gateway.
- `realtime.providers.<provider>`API stocke la configuration temps réel détenue par le provider. Le navigateur ne reçoit que des informations d'identification de session éphémères ou contraintes, jamais une clé API standard.
- `realtime.providers.openai.voice` : identifiant vocal temps réel intégré d'OpenAI. Les voix `gpt-realtime-2` actuelles sont `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin` et `cedar` ; `marin` et `cedar` sont recommandées pour une meilleure qualité.
- `realtime.transport` : `webrtc` et `provider-websocket` sont des transports temps réel du navigateur. Android utilise le relais temps réel uniquement lorsque ceci est `gateway-relay` ; sinon, Talk Android utilise sa boucle native STT/TTS.
- `realtime.brain` : `agent-consult` achemine les appels d'outil temps réel via la stratégie du Gateway ; `direct-tools` est un comportement de compatibilité propriétaire uniquement ; `none` est destiné à la transcription ou à l'orchestration externe.
- `realtime.instructions` : ajoute des instructions système destinées au provider au prompt temps réel intégré de OpenClaw. Utilisez-le pour le style et le ton de la voix ; OpenClaw conserve les directives `openclaw_agent_consult` par défaut.
- `talk.catalog` expose les modes valides, les transports, les stratégies cérébrales, les formats audio temps réel et les indicateurs de capacité de chaque provider afin que les clients Talk de première partie puissent éviter les combinaisons non prises en charge.
- Les providers de transcription en continu sont découverts via `talk.catalog.transcription`. Le relais actuel du Gateway utilise la configuration du provider de streaming Voice Call jusqu'à ce que l'interface de configuration dédiée à la transcription Talk soit ajoutée.
- `speechLocale` : identifiant de locale BCP 47 facultatif pour la reconnaissance vocale Talk sur appareil sur iOS/macOS. Laisser non défini pour utiliser la valeur par défaut de l'appareil.
- `outputFormat` : par défaut, `pcm_44100` sur macOS/iOS et `pcm_24000` sur Android (définir `mp3_*` pour forcer le streaming MP3)

## Interface macOS

- Bouton de la barre de menu : **Talk**
- Onglet Config : groupe **Talk Mode** (id de voix + bouton interrupteur d'interruption)
- Superposition :
  - **Écoute** : le nuage pulse en fonction du niveau du micro
  - **Réflexion** : animation d'enfoncement
  - **Parole** : anneaux rayonnants
  - Cliquer sur le nuage : arrêter de parler
  - Cliquer sur X : quitter le mode Talk

## Interface Android

- Bouton de l'onglet Voice : **Talk**
- Le **Micro** manuel et **Talk** sont des modes de capture d'exécution mutuellement exclusifs.
- Le micro manuel s'arrête lorsque l'application quitte le premier plan ou lorsque l'utilisateur quitte l'onglet Voice.
- Le mode Talk continue de s'exécuter jusqu'à ce qu'il soit désactivé ou que le nœud Android se déconnecte, et utilise le type de service de premier plan du microphone de Android pendant son activité.

## Remarques

- Nécessite les permissions Speech + Microphone.
- Le Talk natif utilise la session Gateway active et ne revient au polling de l'historique que lorsque les événements de réponse ne sont pas disponibles.
- Le Talk en temps réel du navigateur utilise `talk.client.toolCall` pour `openclaw_agent_consult` au lieu d'exposer `chat.send` aux sessions du navigateur détenues par le provider.
- Le Talk de transcription uniquement utilise `talk.session.create`, `talk.session.appendAudio`, `talk.session.cancelTurn` et `talk.session.close` ; les clients s'abonnent à `talk.event` pour les mises à jour de transcription partielles/finales.
- La passerelle résout la lecture Talk via `talk.speak` en utilisant le provider Talk actif. Android revient au TTS du système local uniquement lorsque cette RPC n'est pas disponible.
- La lecture MLX locale sur macOS utilise l'assistant intégré macOS`openclaw-mlx-tts` lorsqu'il est présent, ou un exécutable sur `PATH`. Définissez `OPENCLAW_MLX_TTS_BIN` pour pointer vers un binaire d'assistant personnalisé lors du développement.
- `stability` pour `eleven_v3` est validé comme étant `0.0`, `0.5` ou `1.0` ; d'autres modèles acceptent `0..1`.
- `latency_tier` est validé comme `0..4` lors de la définition.
- Android prend en charge les formats de sortie Android`pcm_16000`, `pcm_22050`, `pcm_24000` et `pcm_44100` pour le streaming AudioTrack à faible latence.

## Connexes

- [Réveil vocal](/fr/nodes/voicewake)
- [Notes audio et vocales](/fr/nodes/audio)
- [Compréhension des médias](/fr/nodes/media-understanding)
