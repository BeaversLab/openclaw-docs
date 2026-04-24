---
summary: "Plugin d'appel vocal : appels sortants + entrants via Twilio/Telnyx/Plivo (installation du plugin + configuration + CLI)"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Plugin d'appel vocal"
---

# Appel vocal (plugin)

Appels vocaux pour OpenClaw via un plugin. Prend en charge les notifications sortantes et
les conversations à plusieurs tours avec des stratégies entrantes.

Fournisseurs actuels :

- `twilio` (Voix programmable + flux médias)
- `telnyx` (Contrôle d'appel v2)
- `plivo` (API vocale + transfert XML + parole GetInput)
- `mock` (dev/sans réseau)

Modèle mental rapide :

- Installer le plugin
- Redémarrer Gateway
- Configurer sous `plugins.entries.voice-call.config`
- Utilisez `openclaw voicecall ...` ou l'outil `voice_call`

## Où il s'exécute (local vs distant)

Le plugin d'appel vocal s'exécute **à l'intérieur du processus Gateway**.

Si vous utilisez un Gateway distant, installez/configurez le plugin sur la **machine exécutant le Gateway**, puis redémarrez le Gateway pour le charger.

## Installer

### Option A : installer depuis npm (recommandé)

```bash
openclaw plugins install @openclaw/voice-call
```

Redémarrez Gateway par la suite.

### Option B : installer depuis un dossier local (dev, pas de copie)

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

Redémarrez Gateway par la suite.

## Configuration

Définir la configuration sous `plugins.entries.voice-call.config` :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },

          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Telnyx Mission Control Portal
            // (Base64 string; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: {
            enabled: true,
            provider: "openai", // optional; first registered realtime transcription provider when unset
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },
        },
      },
    },
  },
}
```

Remarques :

- Twilio/Telnyx nécessitent une URL de webhook **publiquement accessible**.
- Plivo nécessite une URL de webhook **publiquement accessible**.
- `mock` est un provider de développement local (pas d'appels réseau).
- Si les anciennes configurations utilisent encore `provider: "log"`, `twilio.from` ou d'anciennes clés `streaming.*` OpenAI, exécutez `openclaw doctor --fix` pour les réécrire.
- Telnyx nécessite `telnyx.publicKey` (ou `TELNYX_PUBLIC_KEY`) sauf si `skipSignatureVerification` est vrai.
- `skipSignatureVerification` est réservé aux tests locaux uniquement.
- Si vous utilisez le niveau gratuit de ngrok, définissez `publicUrl` sur l'URL exacte de ngrok ; la vérification de la signature est toujours appliquée.
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` autorise les webhooks Twilio avec des signatures non valides **uniquement** lorsque `tunnel.provider="ngrok"` et `serve.bind` sont en boucle locale (agent local ngrok). À n'utiliser que pour le développement local.
- Les URL du niveau gratuit de Ngrok peuvent changer ou ajouter un comportement interstitiel ; si `publicUrl` dérive, les signatures Twilio échoueront. Pour la production, préférez un domaine stable ou un tunnel Tailscale.
- Paramètres de sécurité de diffusion en continu par défaut :
  - `streaming.preStartTimeoutMs` ferme les sockets qui n'envoient jamais de trame `start` valide.
- `streaming.maxPendingConnections` limite le total des sockets non authentifiés pré-démarrage.
- `streaming.maxPendingConnectionsPerIp` limite les sockets non authentifiés pré-démarrage par IP source.
- `streaming.maxConnections` limite le total des sockets de flux médias ouverts (en attente + actifs).
- Le repli à l'exécution accepte toujours ces anciennes clés voice-call pour l'instant, mais le chemin de réécriture est `openclaw doctor --fix` et la compatibilité est temporaire.

## Transcription en continu

`streaming` sélectionne un fournisseur de transcription en temps réel pour l'audio des appels en direct.

Comportement actuel à l'exécution :

- `streaming.provider` est optionnel. S'il n'est pas défini, Voice Call utilise le premier
  fournisseur de transcription en temps réel enregistré.
- Les fournisseurs de transcription en temps réel intégrés incluent Deepgram (`deepgram`),
  ElevenLabs (`elevenlabs`), Mistral (`mistral`), OpenAI (`openai`) et xAI
  (`xai`), enregistrés par leurs plugins de fournisseur.
- La configuration brute détenue par le fournisseur se trouve sous `streaming.providers.<providerId>`.
- Si `streaming.provider` pointe vers un fournisseur non enregistré, ou si aucun fournisseur
  de transcription en temps réel n'est enregistré, Voice Call enregistre un avertissement et
  ignore le streaming média au lieu de faire échouer tout le plugin.

Valeurs par défaut de la transcription en continu OpenAI :

- Clé API : `streaming.providers.openai.apiKey` ou `OPENAI_API_KEY`
- modèle : `gpt-4o-transcribe`
- `silenceDurationMs` : `800`
- `vadThreshold` : `0.5`

Valeurs par défaut de transcription en temps réel xAI :

- Clé API : `streaming.providers.xai.apiKey` ou `XAI_API_KEY`
- point de terminaison : `wss://api.x.ai/v1/stt`
- `encoding` : `mulaw`
- `sampleRate` : `8000`
- `endpointingMs` : `800`
- `interimResults` : `true`

Exemple :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "openai",
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
          },
        },
      },
    },
  },
}
```

Utilisez plutôt xAI :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "xai",
            streamPath: "/voice/stream",
            providers: {
              xai: {
                apiKey: "${XAI_API_KEY}", // optional if XAI_API_KEY is set
                endpointingMs: 800,
                language: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

Les clés héritées sont toujours automatiquement migrées par `openclaw doctor --fix` :

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## Nettoyeur d'appels périmés

Utilisez `staleCallReaperSeconds` pour terminer les appels qui ne reçoivent jamais de webhook terminal
(par exemple, les appels en mode notification qui ne se terminent jamais). La valeur par défaut est `0`
(désactivé).

Plages recommandées :

- **Production :** `120`–`300` secondes pour les flux de style notification.
- Gardez cette valeur **supérieure à `maxDurationSeconds`** afin que les appels normaux puissent
  se terminer. Un bon point de départ est `maxDurationSeconds + 30–60` secondes.

Exemple :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Sécurité des Webhooks

Lorsqu'un proxy ou un tunnel est placé devant le Gateway, le plugin reconstruit l'
URL publique pour la vérification de signature. Ces options contrôlent les en-têtes
transférés dignes de confiance.

`webhookSecurity.allowedHosts` met en liste blanche les hôtes provenant des en-têtes transférés.

`webhookSecurity.trustForwardingHeaders` fait confiance aux en-têtes transférés sans liste blanche.

`webhookSecurity.trustedProxyIPs` fait confiance aux en-têtes transférés uniquement lorsque l'IP
distante de la requête correspond à la liste.

La protection contre la relecture de webhooks est activée pour Twilio et Plivo. Les demandes webhook
valides relues sont confirmées mais ignorées pour les effets secondaires.

Les tours de conversation Twilio incluent un jeton par tour dans les rappels `<Gather>`, de sorte que
les rappels vocaux obsolètes/relus ne peuvent pas satisfaire un tour de transcription plus récent en attente.

Les demandes webhook non authentifiées sont rejetées avant la lecture du corps lorsque les
en-têtes de signature requis par le provider sont manquants.

Le webhook d'appel vocal utilise le profil de corps pré-auth partagé (64 Ko / 5 secondes)
plus une limite en vol par IP avant la vérification de signature.

Exemple avec un hôte public stable :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## TTS pour les appels

Voice Call utilise la configuration `messages.tts` principale pour
la diffusion audio en continu (streaming) lors des appels. Vous pouvez la remplacer dans la configuration du plugin avec la
**même forme** — elle fusionne en profondeur avec `messages.tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

Remarques :

- Les clés `tts.<provider>` héritées dans la configuration du plugin (`openai`, `elevenlabs`, `microsoft`, `edge`) sont automatiquement migrées vers `tts.providers.<provider>` lors du chargement. Privilégiez la forme `providers` dans la configuration validée.
- **La synthèse vocale Microsoft est ignorée pour les appels vocaux** (l'audio téléphonique a besoin de PCM ; le transport Microsoft actuel n'expose pas de sortie PCM téléphonique).
- Le TTS principal est utilisé lorsque le streaming média Twilio est activé ; sinon, les appels reviennent aux voix natives du provider.
- Si un flux média Twilio est déjà actif, Voice Call ne revient pas à TwiML `<Say>`. Si la synthèse vocale téléphonique n'est pas disponible dans cet état, la demande de lecture échoue au lieu de mélanger deux chemins de lecture.
- Lorsque la synthèse vocale téléphonique revient à un fournisseur secondaire, Voice Call enregistre un avertissement avec la chaîne de fournisseurs (`from`, `to`, `attempts`) pour le débogage.

### Plus d'exemples

Utiliser uniquement le TTS principal (sans remplacement) :

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```

Remplacer par ElevenLabs uniquement pour les appels (conserver la valeur par défaut principale ailleurs) :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```

Remplacer uniquement le modèle OpenAI pour les appels (exemple de fusion profonde) :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```

## Appels entrants

La stratégie entrante par défaut est `disabled`. Pour activer les appels entrants, définissez :

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` est un écran d'identification de l'appelant à faible assurance. Le plugin normalise la valeur `From` fournie par le fournisseur et la compare à `allowFrom`.
La vérification du webhook authentifie la livraison et l'intégrité de la charge utile par le fournisseur, mais elle ne prouve pas la propriété du numéro d'appelant PSTN/VoIP. Traitez `allowFrom` comme un filtrage de l'identification de l'appelant, et non comme une identité forte de l'appelant.

Les réponses automatiques utilisent le système d'agent. Ajustez avec :

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### Contrat de sortie vocale

Pour les réponses automatiques, Voice Call ajoute un contrat strict de sortie vocale à l'invite système :

- `{"spoken":"..."}`

Voice Call extrait ensuite le texte de la parole de manière défensive :

- Ignore les charges utiles marquées comme contenu de raisonnement/erreur.
- Analyse le JSON direct, le JSON clôturé ou les clés `"spoken"` en ligne.
- Revient au texte brut et supprime les paragraphes d'introduction probablement liés à la planification/métadonnées.

Cela permet de garder la lecture vocale concentrée sur le texte destiné à l'appelant et évite de divulguer du texte de planification dans l'audio.

### Comportement de démarrage de la conversation

Pour les appels sortants `conversation`, la gestion du premier message est liée à l'état de lecture en direct :

- Le vidage de la file d'attente d'interruption et la réponse automatique ne sont supprimés que pendant la lecture active du message d'accueil initial.
- Si la lecture initiale échoue, l'appel revient à `listening` et le message initial reste en file d'attente pour une nouvelle tentative.
- La lecture initiale pour le streaming Twilio commence lors de la connexion du flux sans délai supplémentaire.

### Délai de grâce de déconnexion du flux Twilio

Lorsqu'un flux média Twilio se déconnecte, Voice Call attend `2000ms` avant de mettre fin automatiquement à l'appel :

- Si le flux se reconnecte pendant cette fenêtre, la fin automatique est annulée.
- Si aucun flux n'est réenregistré après la période de grâce, l'appel est terminé pour éviter les appels actifs bloqués.

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` lit `calls.jsonl` à partir du chemin de stockage voice-call par défaut. Utilisez
`--file <path>` pour pointer vers un journal différent et `--last <n>` pour limiter l'analyse
aux N derniers enregistrements (par défaut 200). La sortie inclut p50/p90/p99 pour la latence de tour
et les temps d'attente d'écoute.

## Outil de l'agent

Nom de l'outil : `voice_call`

Actions :

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

Ce dépôt fournit un document de compétence correspondant à `skills/voice-call/SKILL.md`.

## Gateway RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
