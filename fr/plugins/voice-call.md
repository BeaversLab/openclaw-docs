---
summary: "Plugin d'appel vocal : appels sortants + entrants via Twilio/Telnyx/Plivo (installation du plugin + configuration + CLI)"
read_when:
  - Vous souhaitez passer un appel vocal sortant depuis OpenClaw
  - Vous configurez ou développez le plugin d'appel vocal
title: "Plugin d'appel vocal"
---

# Appel vocal (plugin)

Appels vocaux pour OpenClaw via un plugin. Prend en charge les notifications sortantes et
les conversations à tours multiples avec des stratégies entrantes.

Fournisseurs actuels :

- `twilio` (Voice Programmable + Media Streams)
- `telnyx` (Call Control v2)
- `plivo` (Voice API + transfert XML + reconnaissance vocale GetInput)
- `mock` (dev/sans réseau)

Modèle mental rapide :

- Installer le plugin
- Redémarrer Gateway
- Configurer sous `plugins.entries.voice-call.config`
- Utilisez `openclaw voicecall ...` ou l'outil `voice_call`

## Où il s'exécute (local vs distant)

Le plugin Voice Call s'exécute **à l'intérieur du processus Gateway**.

Si vous utilisez une Gateway distante, installez/configurez le plugin sur la **machine exécutant la Gateway**, puis redémarrez la Gateway pour le charger.

## Installer

### Option A : installer depuis npm (recommandé)

```bash
openclaw plugins install @openclaw/voice-call
```

Redémarrez la Gateway ensuite.

### Option B : installer depuis un dossier local (dev, pas de copie)

```bash
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

Redémarrez la Gateway ensuite.

## Config

Définir la config sous `plugins.entries.voice-call.config` :

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
            streamPath: "/voice/stream",
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

Notes :

- Twilio/Telnyx nécessitent une URL de webhook **publiquement accessible**.
- Plivo nécessite une URL de webhook **publiquement accessible**.
- `mock` est un fournisseur de développement local (pas d'appels réseau).
- Telnyx nécessite `telnyx.publicKey` (ou `TELNYX_PUBLIC_KEY`) sauf si `skipSignatureVerification` est vrai.
- `skipSignatureVerification` est réservé aux tests locaux uniquement.
- Si vous utilisez le niveau gratuit de ngrok, définissez `publicUrl` sur l'URL exacte de ngrok ; la vérification de signature est toujours appliquée.
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` autorise les webhooks Twilio avec des signatures invalides **uniquement** lorsque `tunnel.provider="ngrok"` et `serve.bind` sont en boucle locale (agent local ngrok). À utiliser pour le développement local uniquement.
- Les URL du niveau gratuit de Ngrok peuvent changer ou ajouter un comportement interstitiel ; si `publicUrl` dérive, les signatures Twilio échoueront. Pour la production, préférez un domaine stable ou un tunnel Tailscale.
- Valeurs par défaut de sécurité du flux :
  - `streaming.preStartTimeoutMs` ferme les sockets qui n'envoient jamais de trame `start` valide.
  - `streaming.maxPendingConnections` limite le nombre total de sockets non authentifiés avant le démarrage.
  - `streaming.maxPendingConnectionsPerIp` limite les sockets non authentifiés pré-démarrage par IP source.
  - `streaming.maxConnections` limite le nombre total de sockets de flux multimédia ouverts (en attente + actifs).

## Faucheur d'appels périmés

Utilisez `staleCallReaperSeconds` pour terminer les appels qui ne reçoivent jamais de webhook terminal
(par exemple, les appels en mode de notification qui ne se terminent jamais). La valeur par défaut est `0`
(désactivé).

Plages recommandées :

- **Production :** `120`–`300` secondes pour les flux de style notification.
- Conservez cette valeur **supérieure à `maxDurationSeconds`** afin que les appels normaux puissent
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

## Sécurité du Webhook

Lorsqu'un proxy ou un tunnel est placé devant la passerelle, le plugin reconstruit l'
URL publique pour la vérification de signature. Ces options contrôlent les en-têtes de transfert
de confiance.

`webhookSecurity.allowedHosts` met les hôtes sur liste blanche à partir des en-têtes de transfert.

`webhookSecurity.trustForwardingHeaders` fait confiance aux en-têtes de transfert sans liste blanche.

`webhookSecurity.trustedProxyIPs` fait confiance aux en-têtes de transfert uniquement lorsque l'IP distante
de la requête correspond à la liste.

La protection contre la répétition de webhook est activée pour Twilio et Plivo. Les demandes de webhook valides répétées sont reconnues mais ignorées pour les effets secondaires.

Les tours de conversation Twilio incluent un jeton par tour dans les rappels `<Gather>`, donc
les rappels vocaux périmés/répétés ne peuvent pas satisfaire un tour de transcription en attente plus récent.

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

Voice Call utilise la configuration de base `messages.tts` pour
la synthèse vocale en flux sur les appels. Vous pouvez la remplacer sous la configuration du plugin avec la
**même structure** — elle fusionne en profondeur avec `messages.tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2",
    },
  },
}
```

Notes :

- **La synthèse vocale Microsoft est ignorée pour les appels vocaux** (l'audio téléphonique nécessite le format PCM ; le transport Microsoft actuel n'expose pas de sortie PCM téléphonique).
- Le TTS Core est utilisé lorsque le streaming média Twilio est activé ; sinon, les appels reviennent aux voix natives du fournisseur.

### Plus d'exemples

Utiliser uniquement le TTS Core (pas de remplacement) :

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" },
    },
  },
}
```

Remplacer par ElevenLabs uniquement pour les appels (conserver la valeur par défaut de Core ailleurs) :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
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
}
```

Remplacer uniquement le modèle OpenAI pour les appels (exemple de fusion approfondie) :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            openai: {
              model: "gpt-4o-mini-tts",
              voice: "marin",
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

`inboundPolicy: "allowlist"` est un écran d'identification de l'appelant à faible assurance. Le plugin
normalise la valeur `From` fournie par le fournisseur et la compare à `allowFrom`.
La vérification du webhook authentifie la livraison et l'intégrité de la charge utile du fournisseur, mais
elle ne prouve pas la propriété du numéro d'appelant PSTN/VoIP. Traitez `allowFrom` comme un
filtrage d'identification de l'appelant, et non comme une identité d'appelant forte.

Les réponses automatiques utilisent le système d'agent. Ajustez avec :

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall expose --mode funnel
```

## Outil d'agent

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

import en from "/components/footer/en.mdx";

<en />
