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

- `twilio` (Voix programmable + Flux de média)
- `telnyx` (Contrôle d'appel v2)
- `plivo` (Voice API + transfert XML + discours GetInput)
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
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
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

Remarques :

- Twilio/Telnyx nécessitent une URL de webhook **publiquement accessible**.
- Plivo nécessite une URL de webhook **publiquement accessible**.
- `mock` est un fournisseur de développement local (pas d'appels réseau).
- Telnyx nécessite `telnyx.publicKey` (ou `TELNYX_PUBLIC_KEY`) sauf si `skipSignatureVerification` est vrai.
- `skipSignatureVerification` est destiné uniquement aux tests locaux.
- Si vous utilisez le niveau gratuit ngrok, définissez `publicUrl` sur l'URL exacte de ngrok ; la vérification de la signature est toujours appliquée.
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` autorise les webhooks Twilio avec des signatures non valides **uniquement** lorsque `tunnel.provider="ngrok"` et `serve.bind` sont en boucle locale (agent local ngrok). À utiliser uniquement pour le développement local.
- Les URL du niveau gratuit de Ngrok peuvent changer ou ajouter un comportement interstitiel ; si `publicUrl` dérive, les signatures Twilio échoueront. Pour la production, préférez un domaine stable ou un tunnel Tailscale.
- Valeurs par défaut de sécurité du flux :
  - `streaming.preStartTimeoutMs` ferme les sockets qui n'envoient jamais de trame `start` valide.
  - `streaming.maxPendingConnections` limite le nombre total de sockets non authentifiés avant le démarrage.
  - `streaming.maxPendingConnectionsPerIp` limite les sockets non authentifiés avant le démarrage par IP source.
  - `streaming.maxConnections` limite le nombre total de sockets de flux multimédia ouverts (en attente + actifs).

## Nettoyeur d'appels périmés

Utilisez `staleCallReaperSeconds` pour terminer les appels qui ne reçoivent jamais de webhook terminal
(par exemple, les appels en mode de notification qui ne se terminent jamais). La valeur par défaut est `0`
(désactivé).

Plages recommandées :

- **Production :** `120` à `300` secondes pour les flux de style notification.
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

## Sécurité du webhook

Lorsqu'un proxy ou un tunnel est placé devant la passerelle, le plugin reconstruit l'URL
publique pour la vérification de signature. Ces options contrôlent les en-têtes de transfert
de confiance.

`webhookSecurity.allowedHosts` met en liste blanche les hôtes provenant des en-têtes de transfert.

`webhookSecurity.trustForwardingHeaders` fait confiance aux en-têtes de transfert sans liste blanche.

`webhookSecurity.trustedProxyIPs` ne fait confiance aux en-têtes de transfert que lorsque l'IP distante de la requête
correspond à la liste.

La protection contre la relecture de webhooks est activée pour Twilio et Plivo. Les requêtes webhook valides rejouées sont acquittées mais ignorées pour les effets secondaires.

Les tours de conversation Twilio incluent un jeton par tour dans les rappels `<Gather>`, de sorte que
les rappels vocaux périmés/rejoués ne peuvent pas satisfaire un tour de transcription en attente plus récent.

Les requêtes webhook non authentifiées sont rejetées avant la lecture du corps lorsque les en-têtes de signature requis par le fournisseur sont manquants.

Le webhook d'appel vocal utilise le profil de corps pré-authentifié partagé (64 Ko / 5 secondes) ainsi qu'une limite simultanée par adresse IP avant la vérification de la signature.

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

Voice Call utilise la configuration centrale `messages.tts` pour la diffusion vocale en continu lors des appels. Vous pouvez la remplacer dans la configuration du plugin avec la **même structure** — elle fusionne en profondeur avec `messages.tts`.

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

- **La synthèse vocale Microsoft est ignorée pour les appels vocaux** (l'audio téléphonique nécessite du PCM ; le transport Microsoft actuel n'expose pas de sortie PCM téléphonique).
- Le TTS central est utilisé lorsque le flux de médias Twilio est activé ; sinon, les appels reviennent aux voix natives du fournisseur.
- Si un flux de médias Twilio est déjà actif, Voice Call ne revient pas au TwiML `<Say>`. Si le TTS téléphonique n'est pas disponible dans cet état, la demande de lecture échoue au lieu de mélanger deux chemins de lecture.

### Plus d'exemples

Utiliser uniquement le TTS central (pas de remplacement) :

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

Remplacer par ElevenLabs uniquement pour les appels (garder la valeur par défaut centrale ailleurs) :

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

Remplacer uniquement le modèle OpenAI pour les appels (exemple de fusion en profondeur) :

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

`inboundPolicy: "allowlist"` est un filtre d'identification de l'appelant à faible assurance. Le plugin normalise la valeur `From` fournie par le fournisseur et la compare à `allowFrom`. La vérification du webhook authentifie la livraison et l'intégrité de la charge utile par le fournisseur, mais elle ne prouve pas la propriété du numéro d'appelant PSTN/VoIP. Traitez `allowFrom` comme un filtrage de l'identification de l'appelant, et non comme une identité forte de l'appelant.

Les réponses automatiques utilisent le système d'agent. Ajustez avec :

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### Contrat de sortie vocale

Pour les réponses automatiques, Voice Call ajoute un contrat strict de sortie vocale à l'invite système :

- `{"spoken":"..."}`

Voice Call extrait ensuite le texte de la parole de manière défensive :

- Ignore les charges utiles marquées comme contenu de raisonnement/erreur.
- Analyse le JSON direct, le JSON délimité ou les clés `"spoken"` en ligne.
- Revient au texte brut et supprime les paragraphes d'introduction probables liés à la planification/métadonnées.

Cela permet de concentrer la lecture vocale sur le texte destiné à l'appelant et d'éviter la fuite de texte de planification dans l'audio.

### Comportement de démarrage de la conversation

Pour les appels `conversation` sortants, la gestion du premier message est liée à l'état de la lecture en direct :

- Le vidage de la file d'attente d'interruption et la réponse automatique sont supprimés uniquement pendant la lecture active du message d'accueil initial.
- Si la lecture initiale échoue, l'appel revient à `listening` et le message initial reste en file d'attente pour une nouvelle tentative.
- La lecture initiale pour le flux Twilio commence lors de la connexion du flux sans délai supplémentaire.

### Délai de grâce de déconnexion du flux Twilio

Lorsqu'un flux média Twilio se déconnecte, Voice Call attend `2000ms` avant de terminer automatiquement l'appel :

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

`latency` lit `calls.jsonl` à partir du chemin de stockage vocal par défaut. Utilisez
`--file <path>` pour pointer vers un journal différent et `--last <n>` pour limiter l'analyse
aux N derniers enregistrements (par défaut 200). La sortie comprend p50/p90/p99 pour la latence
de tour et les temps d'attente d'écoute.

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

import fr from "/components/footer/fr.mdx";

<fr />
