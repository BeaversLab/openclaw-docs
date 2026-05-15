---
summary: "Passer des appels vocaux sortants et accepter des appels entrants via Twilio, Telnyx ou Plivo, avec une voix en temps réel et une transcription en flux optionnelle"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "Plugin d'appel vocal"
sidebarTitle: "Appel vocal"
---

Appels vocaux pour OpenClaw via un plugin. Prend en charge les notifications sortantes,
les conversations à tours multiples, la voix en temps réel duplex intégral, la transcription
en flux et les appels entrants avec des stratégies de liste d'autorisation.

**Fournisseurs actuels :** `twilio` (Programmable Voice + Media Streams),
`telnyx` (Call Control v2), `plivo` (Voice API + XML transfer + GetInput
speech), `mock` (dev/no network).

<Note>Le plugin d'appel vocal s'exécute **à l'intérieur du processus Gateway**. Si vous utilisez une Gateway distante, installez et configurez le plugin sur la machine exécutant le Gateway, puis redémarrez le Gateway pour le charger.</Note>

## Quick start

<Steps>
  <Step title="Installer le plugin">
    <Tabs>
      <Tab title="Depuis npm">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="Depuis un dossier local (dev)">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    Utilisez le package nu pour suivre la balise de version officielle actuelle. N'épinglez une
    version exacte que lorsque vous avez besoin d'une installation reproductible.

    Redémarrez ensuite la passerelle Gateway pour que le plugin se charge.

  </Step>
  <Step title="Configurer le fournisseur et le webhook">
    Définissez la configuration sous `plugins.entries.voice-call.config` (voir
    [Configuration](#configuration) ci-dessous pour la structure complète). Au minimum :
    `provider`, les identifiants du fournisseur, `fromNumber`, et une URL de webhook
    publiquement accessible.
  </Step>
  <Step title="Vérifier l'installation">
    ```bash
    openclaw voicecall setup
    ```

    La sortie par défaut est lisible dans les journaux de chat et les terminaux. Elle vérifie
    l'activation du plugin, les identifiants du fournisseur, l'exposition du webhook et qu'un
    seul mode audio (`streaming` ou `realtime`) est actif. Utilisez
    `--json` pour les scripts.

  </Step>
  <Step title="Smoke test">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    Les deux sont des exécutions à blanc par défaut. Ajoutez `--yes` pour réellement passer un court
    appel de notification sortant :

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>Pour Twilio, Telnyx et Plivo, la configuration doit résoudre vers une **URL de webhook publique**. Si `publicUrl`, l'URL du tunnel, l'URL Tailscale ou le fallback de service résout vers une adresse de bouclage ou un espace de réseau privé, la configuration échoue au lieu de démarrer un fournisseur qui ne peut pas recevoir les webhooks des opérateurs.</Warning>

## Configuration

Si `enabled: true` mais que le fournisseur sélectionné manque d'identifiants,
le démarrage du Gateway enregistre un avertissement de configuration incomplète avec les clés manquantes et
ignore le démarrage du runtime. Les commandes, les appels RPC et les outils de l'agent
renvoient toujours la configuration exacte du fournisseur manquant lors de leur utilisation.

<Note>
  Les identifiants d'appel vocal acceptent les SecretRefs. `plugins.entries.voice-call.config.twilio.authToken`, `plugins.entries.voice-call.config.realtime.providers.*.apiKey`, `plugins.entries.voice-call.config.streaming.providers.*.apiKey` et `plugins.entries.voice-call.config.tts.providers.*.apiKey` se résolvent via l'interface standard SecretRef ; voir [Surface d'identifiants
  SecretRef](/fr/reference/secretref-credential-surface).
</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // or TWILIO_FROM_NUMBER for Twilio
          toNumber: "+15550005678",
          sessionScope: "per-phone", // per-phone | per-call
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
              tts: {
                providers: {
                  openai: { voice: "alloy" },
                },
              },
            },
          },

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Mission Control Portal
            // (Base64; can also be set via TELNYX_PUBLIC_KEY).
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
          // tailscale: { mode: "funnel", path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* see Streaming transcription */ },
          realtime: { enabled: false /* see Realtime voice */ },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Exposition du provider et notes de sécurité">
    - Twilio, Telnyx et Plivo nécessitent tous une URL de webhook **publiquement accessible**.
    - `mock` est un provider de développement local (pas d'appels réseau).
    - Telnyx nécessite `telnyx.publicKey` (ou `TELNYX_PUBLIC_KEY`) sauf si `skipSignatureVerification` est vrai.
    - `skipSignatureVerification` est destiné uniquement aux tests locaux.
    - Sur le niveau gratuit de ngrok, définissez `publicUrl` sur l'URL ngrok exacte ; la vérification de signature est toujours appliquée.
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` autorise les webhooks Twilio avec des signatures invalides **uniquement** lorsque `tunnel.provider="ngrok"` et `serve.bind` sont en boucle locale (agent local ngrok). Uniquement pour le développement local.
    - Les URL de niveau gratuit de Ngrok peuvent changer ou ajouter un comportement interstitiel ; si `publicUrl` dérive, les signatures Twilio échouent. Production : préférez un domaine stable ou un entonnoir Tailscale.

  </Accordion>
  <Accordion title="Limites de connexion de streaming">
    - `streaming.preStartTimeoutMs` ferme les sockets qui n'envoient jamais de trame `start` valide.
    - `streaming.maxPendingConnections` limite le total des sockets non authentifiés avant démarrage.
    - `streaming.maxPendingConnectionsPerIp` limite les sockets non authentifiés avant démarrage par IP source.
    - `streaming.maxConnections` limite le total des sockets ouverts de flux multimédia (en attente + actifs).

  </Accordion>
  <Accordion title="Migrations de configuration héritées">
    Les anciennes configurations utilisant `provider: "log"`, `twilio.from``streaming.*` ou des clés OpenAI héritées sont réécrites par `openclaw doctor --fix`.
    Pour l'instant, le repli d'exécution accepte toujours les anciennes clés voice-call, mais
    le chemin de réécriture est `openclaw doctor --fix` et la shim de compatibilité est
    temporaire.

    Clés de diffusion en continu migrées automatiquement :

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Portée de la session

Par défaut, Voice Call utilise `sessionScope: "per-phone"` afin que les appels répétés du même appelant conservent la mémoire de la conversation. Définissez `sessionScope: "per-call"` lorsque chaque appel d'opérateur doit commencer avec un contexte frais, par exemple pour la réception, la réservation, les SVI ou les flux de pont Google Meet où le même numéro de téléphone peut représenter différentes réunions.

## Conversations vocales en temps réel

`realtime` sélectionne un fournisseur vocal temps réel full-duplex pour l'audio des appels en direct. Il est distinct de `streaming`, qui ne transmet l'audio qu'aux fournisseurs de transcription temps réel.

<Warning>`realtime.enabled` ne peut pas être combiné avec `streaming.enabled`. Choisissez un seul mode audio par appel.</Warning>

Comportement d'exécution actuel :

- `realtime.enabled` est pris en charge pour Twilio Media Streams.
- `realtime.provider` est facultatif. S'il n'est pas défini, Voice Call utilise le premier fournisseur vocal temps réel enregistré.
- Fournisseurs vocaux temps réel inclus : Google Gemini Live (`google`) et OpenAI (`openai`), enregistrés par leurs plugins de fournisseur.
- La configuration brute détenue par le fournisseur se trouve sous `realtime.providers.<providerId>`.
- Voice Call expose l'outil partagé `openclaw_agent_consult` de temps réel par défaut. Le modèle temps réel peut l'appeler lorsque l'appelant demande un raisonnement plus approfondi, des informations actuelles ou les outils normaux d'OpenClaw.
- `realtime.consultPolicy` ajoute facultativement des conseils sur le moment où le modèle temps réel doit appeler `openclaw_agent_consult`.
- `realtime.agentContext.enabled` est désactivé par défaut. Lorsqu'il est activé, Voice Call injecte une identité d'agent délimitée, une substitution de prompt système et une capsule de fichier d'espace de travail sélectionnée dans les instructions du fournisseur temps réel lors de la configuration de la session.
- `realtime.fastContext.enabled` est désactivé par défaut. Lorsqu'il est activé, Voice Call recherche d'abord dans la mémoire indexée/le contexte de session pour la question de consultation et renvoie ces extraits au modèle temps réel dans `realtime.fastContext.timeoutMs` avant de revenir à l'agent de consultation complet uniquement si `realtime.fastContext.fallbackToConsult` est vrai.
- Si `realtime.provider` pointe vers un fournisseur non enregistré, ou si aucun fournisseur de voix temps réel n'est enregistré du tout, Voice Call enregistre un avertissement et ignore les médias temps réel au lieu de faire échouer l'ensemble du plugin.
- Les clés de session de consultation réutilisent la session d'appel stockée lorsqu'elle est disponible, puis reviennent au `sessionScope` configuré (`per-phone` par défaut, ou `per-call` pour les appels isolés).

### Stratégie d'outil

`realtime.toolPolicy` contrôle l'exécution de la consultation :

| Stratégie        | Comportement                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | Exposez l'outil de consultation et limitez l'agent normal à `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` et `memory_get`. |
| `owner`          | Exposez l'outil de consultation et laissez l'agent normal utiliser la stratégie d'outil d'agent normal.                                     |
| `none`           | N'exposez pas l'outil de consultation. Les `realtime.tools` personnalisés sont toujours transmis au fournisseur temps réel.                 |

`realtime.consultPolicy` contrôle uniquement les instructions du modèle temps réel :

| Stratégie     | Conseils                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `auto`        | Conservez le prompt par défaut et laissez le fournisseur décider quand appeler l'outil de consultation.                        |
| `substantive` | Répondez directement aux éléments de conversation simples et consultez avant les faits, la mémoire, les outils ou le contexte. |
| `always`      | Consultez avant chaque réponse substantielle.                                                                                  |

### Contexte vocal de l'agent

Activez `realtime.agentContext` lorsque le pont vocal doit sonner comme l'agent OpenClaw configuré sans payer un cycle complet de consultation de l'agent lors des tours ordinaires. La capsule de contexte est ajoutée une seule fois lors de la création de la session temps réel, elle n'ajoute donc pas de latence par tour. Les appels à `openclaw_agent_consult` exécutent toujours l'agent OpenClaw complet et doivent être utilisés pour le travail d'outil, les informations actuelles, les recherches en mémoire ou l'état de l'espace de travail.

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          agentId: "main",
          realtime: {
            enabled: true,
            provider: "google",
            toolPolicy: "safe-read-only",
            consultPolicy: "substantive",
            agentContext: {
              enabled: true,
              maxChars: 6000,
              includeIdentity: true,
              includeSystemPrompt: true,
              includeWorkspaceFiles: true,
              files: ["SOUL.md", "IDENTITY.md", "USER.md"],
            },
          },
        },
      },
    },
  },
}
```

### Exemples de fournisseurs temps réel

<Tabs>
  <Tab title="Google Gemini Live">
    Valeurs par défaut : clé API issue de `realtime.providers.google.apiKey`,
    `GEMINI_API_KEY`, ou `GOOGLE_GENERATIVE_AI_API_KEY` ; modèle
    `gemini-2.5-flash-native-audio-preview-12-2025` ; voix `Kore`.
    `sessionResumption` et `contextWindowCompression` sont activés par défaut pour les appels plus longs
    et reconnectables. Utilisez `silenceDurationMs`, `startSensitivity` et
    `endSensitivity` pour régler l'échange de tours plus rapide sur l'audio téléphonique.

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              provider: "twilio",
              inboundPolicy: "allowlist",
              allowFrom: ["+15550005678"],
              realtime: {
                enabled: true,
                provider: "google",
                instructions: "Speak briefly. Call openclaw_agent_consult before using deeper tools.",
                toolPolicy: "safe-read-only",
                consultPolicy: "substantive",
                consultThinkingLevel: "low",
                consultFastMode: true,
                agentContext: { enabled: true },
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
                    silenceDurationMs: 500,
                    startSensitivity: "high",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="OpenAI">
    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              realtime: {
                enabled: true,
                provider: "openai",
                providers: {
                  openai: { apiKey: "${OPENAI_API_KEY}" },
                },
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

Voir [Google provider](/fr/providers/google) et
[OpenAI provider](/fr/providers/openai) pour les options vocales en temps réel spécifiques au fournisseur.

## Transcription en continu

`streaming` sélectionne un fournisseur de transcription en temps réel pour l'audio des appels en direct.

Comportement d'exécution actuel :

- `streaming.provider` est facultatif. S'il n'est pas défini, Voice Call utilise le premier fournisseur de transcription en temps réel enregistré.
- Fournisseurs de transcription en temps réel inclus : Deepgram (Deepgram`deepgram`), ElevenLabs (`elevenlabs`), Mistral (`mistral`OpenAI), OpenAI (`openai`) et xAI (`xai`), enregistrés par leurs plugins de fournisseur.
- La configuration brute propriétaire au fournisseur se trouve sous `streaming.providers.<providerId>`.
- Une fois que Twilio a envoyé un message de flux accepté `start`, Voice Call enregistre immédiatement le flux, met en file d'attente les médias entrants via le fournisseur de transcription pendant que le fournisseur se connecte, et ne lance le message d'accueil initial qu'une fois la transcription en temps réel prête.
- Si `streaming.provider` pointe vers un fournisseur non enregistré, ou si aucun n'est enregistré, Voice Call enregistre un avertissement et ignore le streaming média au lieu de faire échouer l'ensemble du plugin.

### Exemples de fournisseurs de streaming

<Tabs>
  <Tab title="OpenAIOpenAI"API>
    Valeurs par défaut : clé API `streaming.providers.openai.apiKey` ou
    `OPENAI_API_KEY` ; model `gpt-4o-transcribe` ; `silenceDurationMs: 800` ;
    `vadThreshold: 0.5`.

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

  </Tab>
  <Tab title="xAI"API>
    Valeurs par défaut : clé API `streaming.providers.xai.apiKey` ou `XAI_API_KEY` ;
    endpoint `wss://api.x.ai/v1/stt` ; encodage `mulaw` ; taux d'échantillonnage `8000` ;
    `endpointingMs: 800` ; `interimResults: true`.

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

  </Tab>
</Tabs>

## TTS pour les appels

Voice Call utilise la configuration principale `messages.tts` pour la synthèse vocale en continu lors des appels. Vous pouvez la remplacer sous la configuration du plugin avec la **même structure** — elle fusionne en profondeur avec `messages.tts`.

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

<Warning>**La synthèse vocale Microsoft est ignorée pour les appels vocaux.** L'audio téléphonique a besoin de PCM ; le transport Microsoft actuel n'expose pas de sortie PCM téléphonique.</Warning>

Notes de comportement :

- Les clés `tts.<provider>` héritées dans la configuration du plugin (`openai`, `elevenlabs`, `microsoft`, `edge`) sont réparées par `openclaw doctor --fix` ; la configuration validée doit utiliser `tts.providers.<provider>`.
- Le TTS Core est utilisé lorsque le streaming média Twilio est activé ; sinon, les appels reviennent aux voix natives du provider.
- Si un flux média Twilio est déjà actif, Voice Call ne revient pas au TwiML `<Say>`. Si le TTS téléphonique n'est pas disponible dans cet état, la demande de lecture échoue au lieu de mélanger deux chemins de lecture.
- Lorsque le TTS téléphonique revient à un provider secondaire, Voice Call enregistre un avertissement avec la chaîne de providers (`from`, `to`, `attempts`) pour le débogage.
- Lorsque l'interruption Twilio ou l'arrêt du flux vide la file d'attente TTS en attente, les demandes de lecture en file d'attente se règlent au lieu de mettre en attente les appelants en attendant la fin de la lecture.

### Exemples TTS

<Tabs>
  <Tab title="TTS Core uniquement">
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
  </Tab>
  <Tab title="Remplacer par ElevenLabs (appels uniquement)">
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
  </Tab>
  <Tab title="OpenAIRemplacement du model OpenAI (fusion approfondie)">
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
  </Tab>
</Tabs>

## Appels entrants

La stratégie entrante par défaut est `disabled`. Pour activer les appels entrants, définissez :

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>
  `inboundPolicy: "allowlist"` est un écran d'identification de l'appelant à faible assurance. Le plugin normalise la valeur `From` fournie par le provider et la compare à `allowFrom`. La vérification du webhook authentifie la livraison du provider et l'intégrité du payload, mais elle ne prouve **pas** la propriété du numéro d'appelant PSTN/VoIP. Traitez `allowFrom` comme un filtrage par ID
  d'appelant, et non comme une identité d'appelant forte.
</Warning>

Les réponses automatiques utilisent le système d'agent. Ajustez avec `responseModel`,
`responseSystemPrompt` et `responseTimeoutMs`.

### Routage par numéro

Utilisez `numbers` lorsqu'un seul plugin Voice Call reçoit des appels pour plusieurs numéros de téléphone et que chaque numéro doit se comporter comme une ligne différente. Par exemple, un numéro peut utiliser un assistant personnel décontracté tandis qu'un autre utilise une persona professionnelle, un agent de réponse différent et une voix TTS différente.

Les itinéraires sont sélectionnés à partir du numéro composé `To` fourni par le provider. Les clés doivent être des numéros E.164. Lorsqu'un appel arrive, Voice Call résout l'itinéraire correspondant une seule fois, stocke l'itinéraire correspondant sur l'enregistrement de l'appel et réutilise cette configuration effective pour le message d'accueil, le chemin de réponse automatique classique, le chemin de consultation en temps réel et la lecture TTS. Si aucun itinéraire ne correspond, la configuration globale Voice Call est utilisée. Les appels sortants n'utilisent pas `numbers` ; transmettez la cible sortante, le message et la session explicitement lors de l'initiation de l'appel.

Les remplacements d'itinéraire prennent actuellement en charge :

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

La valeur d'itinéraire `tts` fusionne en profondeur avec la configuration `tts` globale de Voice Call, vous pouvez donc généralement remplacer uniquement la voix du provider :

```json5
{
  inboundGreeting: "Hello from the main line.",
  responseSystemPrompt: "You are the default voice assistant.",
  tts: {
    provider: "openai",
    providers: {
      openai: { voice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

### Contrat de sortie vocale

Pour les réponses automatiques, Voice Call ajoute un contrat de sortie vocale strict au prompt système :

```text
{"spoken":"..."}
```

Voice Call extrait le texte de la parole de manière défensive :

- Ignore les charges utiles marquées comme contenu de raisonnement/erreur.
- Analyse le JSON direct, le JSON clôturé ou les clés `"spoken"` en ligne.
- Revient au texte brut et supprime les paragraphes d'introduction probables de planification/métadonnées.

Cela permet de maintenir la lecture vocale concentrée sur le texte destiné à l'appelant et d'éviter la fuite de texte de planification dans l'audio.

### Comportement de démarrage de la conversation

Pour les appels `conversation` sortants, la gestion du premier message est liée à l'état de lecture en direct :

- Le vidage de la file d'attente et la réponse automatique en cas de coupure sont supprimés uniquement pendant que le message d'accueil initial parle activement.
- Si la lecture initiale échoue, l'appel revient à `listening` et le message initial reste en file d'attente pour une nouvelle tentative.
- La lecture initiale pour le streaming Twilio commence lors de la connexion du flux sans délai supplémentaire.
- L'interrution (barge-in) interrompt la lecture active et efface les entrées TTS Twilio mises en file d'attente mais pas encore lues. Les entrées effacées sont résolues comme étant ignorées, ce qui permet à la logique de réponse de suite de continuer sans attendre l'audio qui ne sera jamais diffusé.
- Les conversations vocales en temps réel utilisent le tour d'ouverture propre au flux temps réel. Voice Call **ne** publie **pas** de mise à jour `<Say>` TwiML héritée pour ce message initial, les sessions `<Connect><Stream>` sortantes restent donc attachées.

### Délai de grâce de déconnexion du flux Twilio

Lorsqu'un flux média Twilio se déconnecte, Voice Call attend **2000 ms** avant de mettre fin automatiquement à l'appel :

- Si le flux se reconnecte pendant cette fenêtre, la fin automatique est annulée.
- Si aucun flux ne s'enregistre à nouveau après la période de grâce, l'appel est terminé pour éviter d'avoir des appels actifs bloqués.

## Nettoyeur d'appels périmés

Utilisez `staleCallReaperSeconds` pour terminer les appels qui ne reçoivent jamais de webhook terminal (par exemple, les appels en mode notification qui ne se terminent jamais). La valeur par défaut est `0` (désactivé).

Plages recommandées :

- **Production :** `120`–`300` secondes pour les flux de type notification.
- Gardez cette valeur **supérieure à `maxDurationSeconds`** afin que les appels normaux puissent se terminer. Un bon point de départ est `maxDurationSeconds + 30–60` secondes.

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

## Sécurité des webhooks

Lorsqu'un proxy ou un tunnel est placé devant le Gateway, le plugin reconstruit l'URL publique pour la vérification de signature. Ces options contrôlent quels en-têtes transférés sont fiables :

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  Autoriser les hôtes depuis les en-têtes de transfert (allowlist).
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  Faire confiance aux en-têtes transférés sans liste d'autorisation.
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  Faire confiance uniquement aux en-têtes transférés lorsque l'IP distante de la demande correspond à la liste.
</ParamField>

Protections supplémentaires :

- La **protection contre la répétition** (replay protection) des webhooks est activée pour Twilio et Plivo. Les demandes de webhook valides répétées sont accusées réception mais ignorées pour leurs effets secondaires.
- Les tours de conversation Twilio incluent un jeton par tour dans les rappels `<Gather>`, de sorte que les rappels vocaux périmés/répétés ne peuvent pas satisfaire un tour de transcription en attente plus récent.
- Les requêtes webhook non authentifiées sont rejetées avant la lecture du corps lorsque les en-têtes de signature requis par le fournisseur sont manquants.
- Le webhook d'appel vocal utilise le profil de corps de pré-authentification partagé (64 Ko / 5 secondes) plus une limite en vol par adresse IP avant la vérification de signature.

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

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

Lorsque le Gateway est déjà en cours d'exécution, les commandes opérationnelles `voicecall` délèguent
au runtime d'appel vocal propriétaire du Gateway de sorte que le CLI ne lie pas un second
serveur webhook. Si aucun Gateway n'est joignable, les commandes reviennent à un
runtime autonome CLI.

`latency` lit `calls.jsonl` à partir du chemin de stockage d'appel vocal par défaut.
Utilisez `--file <path>` pour pointer vers un journal différent et `--last <n>` pour limiter
l'analyse aux N derniers enregistrements (par défaut 200). La sortie inclut p50/p90/p99
pour la latence de tour et les temps d'écoute-attente.

## Outil de l'agent

Nom de l'outil : `voice_call`.

| Action          | Args                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

Ce dépôt fournit un document de compétence correspondant à `skills/voice-call/SKILL.md`.

## Gateway RPC

| Méthode              | Args                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`, `message`, `mode?`, `dtmfSequence?` |
| `voicecall.continue` | `callId`, `message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` n'est valide qu'avec `mode: "conversation"`. Les appels en mode de notification
devraient utiliser `voicecall.dtmf` après que l'appel existe s'ils ont besoin de chiffres
après connexion.

## Dépannage

### L'échec de la configuration expose le webhook

Exécutez la configuration à partir du même environnement que celui qui exécute le Gateway :

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

Pour `twilio`, `telnyx` et `plivo`, `webhook-exposure` doit être vert. Un
`publicUrl` configur échoue toujours lorsqu'il pointe vers un espace réseau local
ou privé, car le transporteur ne peut pas rappeler ces adresses. N'utilisez pas
`localhost`, `127.0.0.1`, `0.0.0.0`, `10.x`, `172.16.x`-`172.31.x`,
`192.168.x`, `169.254.x`, `fc00::/7` ou `fd00::/8` comme `publicUrl`.

Les appels sortants en mode de notification Twilio envoient leur `<Say>` TwiML initial
directement dans la requête de création d'appel, de sorte que le premier message vocal ne d pas
de Twilio r cup rant le TwiML du webhook. Un webhook public est toujours requis pour les rappels
de statut, les appels de conversation, le DTMF pr -connexion, les flux en temps réel et le contrôle
d'appel post-connexion.

Utilisez un chemin d'exposition public :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // or
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

Apr avoir modifi la configuration, red marrez ou rechargez le Gateway, puis ex cutez :

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` est un essai vide (dry run) sauf si vous passez `--yes`.

### Échec des informations d'identification du fournisseur

Vérifiez le fournisseur s lectionn et les champs d'identification requis :

- Twilio : `twilio.accountSid`, `twilio.authToken` et `fromNumber`, ou
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` et `TWILIO_FROM_NUMBER`.
- Telnyx : `telnyx.apiKey`, `telnyx.connectionId`, `telnyx.publicKey` et
  `fromNumber`.
- Plivo : `plivo.authId`, `plivo.authToken` et `fromNumber`.

Les identifiants doivent exister sur l'hôte du Gateway. La modification d'un profil de shell local n'a
pas d'effet sur un Gateway déjà en cours d'exécution jusqu'à ce qu'il redémarre ou recharge son
environnement.

### Les appels commencent mais les webhooks du provider n'arrivent pas

Confirmez que la console du provider pointe vers l'URL publique exacte du webhook :

```text
https://voice.example.com/voice/webhook
```

Ensuite, inspectez l'état d'exécution :

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

Causes courantes :

- `publicUrl` pointe vers un chemin différent de `serve.path`.
- L'URL du tunnel a changé après le démarrage du Gateway.
- Un proxy transmet la demande mais supprime ou réécrit les en-têtes hôte/proto.
- Un pare-feu ou un DNS achemine le nom d'hôte public ailleurs que vers le Gateway.
- Le Gateway a été redémarré sans que le plugin Voice Call soit activé.

Lorsqu'un proxy inverse ou un tunnel est devant le Gateway, définissez
`webhookSecurity.allowedHosts` sur le nom d'hôte public, ou utilisez
`webhookSecurity.trustedProxyIPs` pour une adresse proxy connue. N'utilisez
`webhookSecurity.trustForwardingHeaders` que lorsque la limite du proxy est sous
votre contrôle.

### La vérification de la signature échoue

Les signatures du provider sont vérifiées par rapport à l'URL publique que OpenClaw reconstruit
à partir de la demande entrante. Si les signatures échouent :

- Confirmez que l'URL du webhook du provider correspond exactement à `publicUrl`, y compris
  le schéma, l'hôte et le chemin.
- Pour les URL ngrok de niveau gratuit, mettez à jour `publicUrl` lorsque le nom d'hôte du tunnel change.
- Assurez-vous que le proxy préserve les en-tètres hôte et proto d'origine, ou configurez
  `webhookSecurity.allowedHosts`.
- N'activez pas `skipSignatureVerification` en dehors des tests locaux.

### Les jointures Google Meet Twilio échouent

Google Meet utilise ce plugin pour les connexions Twilio par entrée d'appel. Vérifiez d'abord Voice Call :

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

Vérifiez ensuite explicitement le transport Google Meet :

```bash
openclaw googlemeet setup --transport twilio
```

Si Voice Call est vert mais que le participant Meet ne rejoint jamais, vérifiez le numéro d'appel Meet, le code PIN et `--dtmf-sequence`. L'appel téléphonique peut être sain alors que la réunion rejette ou ignore une séquence DTMF incorrecte.

Google Meet lance la phase téléphonique Twilio via `voicecall.start` avec une séquence DTMF de pré-connexion. Les séquences dérivées du code PIN incluent `voiceCall.dtmfDelayMs` du plugin Google Meet comme premiers chiffres d'attente Twilio. La valeur par défaut est de 12 secondes car les invites d'appel Meet peuvent arriver tardivement. Voice Call redirige ensuite vers le traitement en temps réel avant que la salutation d'introduction ne soit demandée.

Utilisez `openclaw logs --follow` pour la trace de phase en direct. Une jointure Meet Twilio saine enregistre cet ordre :

- Google Meet délègue la jointure Twilio à Voice Call.
- Voice Call stocke le TwiML DTMF de pré-connexion.
- Le TwiML initial Twilio est consommé et servi avant le traitement en temps réel.
- Voice Call sert le TwiML en temps réel pour l'appel Twilio.
- Google Meet demande le discours d'introduction avec `voicecall.speak` après le délai post-DTMF.

`openclaw voicecall tail` affiche toujours les enregistrements d'appels persistants ; il est utile pour l'état de l'appel et les transcriptions, mais chaque transition webhook/temps réel n'y apparaît pas.

### L'appel en temps réel n'a pas de parole

Confirmez qu'un seul mode audio est activé. `realtime.enabled` et `streaming.enabled` ne peuvent pas tous deux être vrais.

Pour les appels Twilio en temps réel, vérifiez également :

- Un plugin de provider en temps réel est chargé et enregistré.
- `realtime.provider` est non défini ou nomme un provider enregistré.
- La clé API du provider est disponible pour le processus Gateway.
- `openclaw logs --follow` montre le TwiML en temps réel servi, le pont en temps réel démarré et la salutation initiale mise en file d'attente.

## Connexes

- [Talk mode](/fr/nodes/talk)
- [Text-to-speech](/fr/tools/tts)
- [Voice wake](/fr/nodes/voicewake)
