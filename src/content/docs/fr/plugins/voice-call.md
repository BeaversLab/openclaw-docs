---
summary: "Effectuer des appels sortants et accepter des appels entrants via Twilio, Telnyx ou Plivo, avec voix en temps réel et transcription en flux optionnelles"
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

**Fournisseurs actuels :** `twilio` (Voice programmable + Media Streams),
`telnyx` (Call Control v2), `plivo` (Voice API + transfert XML + saisie vocale
GetInput), `mock` (dev/sans réseau).

<Note>Le plugin d'appel vocal s'exécute **à l'intérieur du processus Gateway**. Si vous utilisez une Gateway distante, installez et configurez le plugin sur la machine exécutant le Gateway, puis redémarrez le Gateway pour le charger.</Note>

## Quick start

<Steps>
  <Step title="Installer le plugin">
    <Tabs>
      <Tab title="Depuis npm (recommandé)">
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

    Redémarrez le Gateway ensuite pour que le plugin se charge.

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

    La sortie par défaut est lisible dans les journaux de discussion et les terminaux. Elle vérifie
    l'activation du plugin, les identifiants du fournisseur, l'exposition du webhook et qu'un seul
    mode audio (`streaming` ou `realtime`) est actif. Utilisez
    `--json` pour les scripts.

  </Step>
  <Step title="Test à blanc">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    Les deux sont des essais à blanc par défaut. Ajoutez `--yes` pour passer réellement un court
    appel de notification sortant :

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>Pour Twilio, Telnyx et Plivo, la configuration doit résoudre vers une **URL de webhook publique**. Si `publicUrl`, l'URL du tunnel, l'URL Tailscale ou le serveur de secours résout vers une boucle locale ou un espace de réseau privé, la configuration échoue au lieu de démarrer un provider qui ne peut pas recevoir les webhooks des opérateurs.</Warning>

## Configuration

Si `enabled: true` mais que le provider sélectionné manque d'identifiants,
le démarrage du Gateway enregistre un avertissement de configuration incomplète avec les clés manquantes et
saute le démarrage de l'exécution. Les commandes, les appels RPC et les outils de l'agent
renvoient toujours la configuration exacte du provider manquant lorsqu'ils sont utilisés.

<Note>Les identifiants d'appel vocal acceptent les SecretRefs. `plugins.entries.voice-call.config.twilio.authToken` et `plugins.entries.voice-call.config.tts.providers.*.apiKey` se résolvent via la surface standard SecretRef ; voir [SecretRef credential surface](/fr/reference/secretref-credential-surface).</Note>

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
  <Accordion title="Notes d'exposition et de sécurité du provider">
    - Twilio, Telnyx et Plivo nécessitent tous une URL de webhook **publiquement accessible**.
    - `mock` est un provider de développement local (pas d'appels réseau).
    - Telnyx nécessite `telnyx.publicKey` (ou `TELNYX_PUBLIC_KEY`) sauf si `skipSignatureVerification` est vrai.
    - `skipSignatureVerification` est réservé aux tests locaux uniquement.
    - Sur le niveau gratuit ngrok, définissez `publicUrl` sur l'URL exacte ngrok ; la vérification de signature est toujours appliquée.
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` autorise les webhooks Twilio avec des signatures non valides **uniquement** lorsque `tunnel.provider="ngrok"` et `serve.bind` sont en boucle locale (agent local ngrok). Développement local uniquement.
    - Les URL du niveau gratuit ngrok peuvent changer ou ajouter un comportement interstitiel ; si `publicUrl` dérive, les signatures Twilio échouent. Production : préférez un domaine stable ou un tunnel Tailscale.
  </Accordion>
  <Accordion title="Limites de connexion streaming">
    - `streaming.preStartTimeoutMs` ferme les sockets qui n'envoient jamais de trame `start` valide.
    - `streaming.maxPendingConnections` limite le total des sockets non authentifiés avant démarrage.
    - `streaming.maxPendingConnectionsPerIp` limite les sockets non authentifiés avant démarrage par IP source.
    - `streaming.maxConnections` limite le total des sockets de flux média ouverts (en attente + actifs).
  </Accordion>
  <Accordion title="Legacy config migrations">
    Les anciennes configurations utilisant `provider: "log"`, `twilio.from`, ou des clés OpenAI héritées `streaming.*` sont réécrites par `openclaw doctor --fix`.
    Le repli à l'exécution accepte toujours les anciennes clés voice-call pour l'instant, mais
    le chemin de réécriture est `openclaw doctor --fix` et la shim de compatibilité est
    temporaire.

    Clés de diffusion en continu auto-migrées :

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Conversations vocales en temps réel

`realtime` sélectionne un provider vocal en temps réel duplex intégral pour l'audio
des appels en direct. Il est distinct de `streaming`, qui ne fait que transmettre l'audio aux
providers de transcription en temps réel.

<Warning>`realtime.enabled` ne peut pas être combiné avec `streaming.enabled`. Choisissez un mode audio par appel.</Warning>

Comportement actuel à l'exécution :

- `realtime.enabled` est pris en charge pour Twilio Media Streams.
- `realtime.provider` est optionnel. S'il n'est pas défini, Voice Call utilise le premier provider vocal en temps réel enregistré.
- Providers vocaux en temps réel inclus : Google Gemini Live (`google`) et OpenAI (`openai`), enregistrés par leurs plugins de provider.
- La configuration brute appartenant au provider se trouve sous `realtime.providers.<providerId>`.
- Voice Call expose l'outil partagé `openclaw_agent_consult` realtime par défaut. Le modèle realtime peut l'appeler lorsque l'appelant demande un raisonnement plus approfondi, des informations actuelles ou les outils normaux d'OpenClaw.
- Si `realtime.provider` pointe vers un provider non enregistré, ou si aucun provider de voix realtime n'est enregistré du tout, Voice Call enregistre un avertissement et ignore le média realtime au lieu de faire échouer l'ensemble du plugin.
- Les clés de session de consultation réutilisent la session vocale existante si disponible, puis reviennent au numéro de téléphone de l'appelant/du destinataire afin que les appels de consultation de suivi gardent leur contexte pendant l'appel.

### Stratégie d'outil

`realtime.toolPolicy` contrôle l'exécution de la consultation :

| Stratégie        | Comportement                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | Exposer l'outil de consultation et limiter l'agent régulier à `read`, `web_search`, `web_fetch`, `x_search`, `memory_search`, et `memory_get`. |
| `owner`          | Exposer l'outil de consultation et laisser l'agent régulier utiliser la stratégie d'outil d'agent normal.                                      |
| `none`           | Ne pas exposer l'outil de consultation. Les `realtime.tools` personnalisés sont toujours transmis au provider realtime.                        |

### Exemples de providers realtime

<Tabs>
  <Tab title="Google Gemini Live">
    Valeurs par défaut : clé API issue de `realtime.providers.google.apiKey`,
    `GEMINI_API_KEY`, ou `GOOGLE_GENERATIVE_AI_API_KEY` ; modèle
    `gemini-2.5-flash-native-audio-preview-12-2025` ; voix `Kore`.

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
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
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
[OpenAI provider](/fr/providers/openai) pour les options vocales
dealtime spécifiques au provider.

## Transcription en continu

`streaming` sélectionne un provider de transcription realtime pour l'audio de l'appel en direct.

Comportement à l'exécution actuel :

- `streaming.provider` est optionnel. Si non défini, Voice Call utilise le premier provider de transcription realtime enregistré.
- Fournisseurs de transcription en temps réel intégrés : Deepgram (`deepgram`), ElevenLabs (`elevenlabs`), Mistral (`mistral`), OpenAI (`openai`) et xAI (`xai`), enregistrés par leurs plugins de fournisseur.
- La configuration brute propriétaire au fournisseur se trouve sous `streaming.providers.<providerId>`.
- Si `streaming.provider` pointe vers un fournisseur non enregistré, ou si aucun n'est enregistré, Voice Call enregistre un avertissement et ignore le streaming média au lieu de faire échouer l'ensemble du plugin.

### Exemples de fournisseurs de streaming

<Tabs>
  <Tab title="OpenAI">
    Valeurs par défaut : clé API `streaming.providers.openai.apiKey` ou
    `OPENAI_API_KEY` ; modèle `gpt-4o-transcribe` ; `silenceDurationMs: 800` ;
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
  <Tab title="xAI">
    Valeurs par défaut : clé API `streaming.providers.xai.apiKey` ou `XAI_API_KEY` ;
    point de terminaison `wss://api.x.ai/v1/stt` ; encodage `mulaw` ; taux d'échantillonnage `8000` ;
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

Voice Call utilise la configuration principale `messages.tts` pour le flux de
parole lors des appels. Vous pouvez la remplacer dans la configuration du plugin avec la
**même structure** — elle fusionne en profondeur avec `messages.tts`.

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

<Warning>**La voix Microsoft est ignorée pour les appels vocaux.** L'audio téléphonique a besoin de PCM ; le transport Microsoft actuel n'expose pas de sortie PCM téléphonique.</Warning>

Notes de comportement :

- Les clés héritées `tts.<provider>` dans la configuration du plugin (`openai`, `elevenlabs`, `microsoft`, `edge`) sont réparées par `openclaw doctor --fix` ; la configuration validée doit utiliser `tts.providers.<provider>`.
- Le TTS principal est utilisé lorsque le streaming média Twilio est activé ; sinon, les appels reviennent aux voix natives du fournisseur.
- Si un flux média Twilio est déjà actif, Voice Call ne revient pas à TwiML `<Say>`. Si la synthèse vocale téléphonique n'est pas disponible dans cet état, la demande de lecture échoue au lieu de mélanger deux chemins de lecture.
- Lorsque la synthèse vocale téléphonique revient à un provider secondaire, Voice Call enregistre un avertissement avec la chaîne de providers (`from`, `to`, `attempts`) pour le débogage.
- Lorsqu'une interruption Twilio ou la fermeture du flux vide la file d'attente TTS en attente, les demandes de lecture en file d'attente se règlent au lieu de laisser les appelants en attente de la fin de la lecture.

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
  <Tab title="Remplacement du model OpenAI (fusion approfondie)">
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
  `inboundPolicy: "allowlist"` est un écran d'identification de l'appelant à faible assurance. Le plugin normalise la valeur `From` fournie par le provider et la compare à `allowFrom`. La vérification du webhook authentifie la livraison du provider et l'intégrité du payload, mais elle ne prouve **pas** la propriété du numéro d'appelant PSTN/VoIP. Traitez `allowFrom` comme un filtrage
  d'identification de l'appelant, et non comme une identité d'appelant forte.
</Warning>

Les réponses automatiques utilisent le système d'agent. Ajustez avec `responseModel`,
`responseSystemPrompt` et `responseTimeoutMs`.

### Contrat de sortie vocale

Pour les réponses automatiques, Voice Call ajoute un contrat de sortie vocale strict au
prompt système :

```text
{"spoken":"..."}
```

Voice Call extrait le texte de la parole de manière défensive :

- Ignore les payloads marqués comme contenu de raisonnement/erreur.
- Analyse le JSON direct, le JSON délimité ou les clés `"spoken"` en ligne.
- Revient au texte brut et supprime les paragraphes d'introduction probables de planification/méta.

Cela permet de garder la lecture vocale concentrée sur le texte destiné à l'appelant et d'éviter
la fuite de texte de planification dans l'audio.

### Comportement de démarrage de la conversation

Pour les appels sortants `conversation`, la gestion du premier message est liée à l'état de lecture en direct :

- Le nettoyage de la file d'attente d'interruption (barge-in) et la réponse automatique sont supprimés uniquement pendant que le message d'accueil initial est en cours de lecture active.
- Si la lecture initiale échoue, l'appel revient à `listening` et le message initial reste en file d'attente pour une nouvelle tentative.
- La lecture initiale pour le streaming Twilio commence lors de la connexion du flux sans délai supplémentaire.
- L'interruption (barge-in) annule la lecture active et efface les entrées TTS Twilio mises en file d'attente mais pas encore lues. Les entrées effacées sont résolues comme étant ignorées, afin que la logique de réponse de suivi puisse continuer sans attendre l'audio qui ne sera jamais lu.
- Les conversations vocales en temps réel utilisent le tour d'ouverture propre au flux en temps réel. Voice Call **ne** publie **pas** de mise à jour TwiML `<Say>` héritée pour ce message initial, donc les sessions `<Connect><Stream>` sortantes restent attachées.

### Délai de grâce de déconnexion du flux Twilio

Lorsqu'un flux multimédia Twilio se déconnecte, Voice Call attend **2000 ms** avant de mettre fin automatiquement à l'appel :

- Si le flux se reconnecte pendant cette fenêtre, la fin automatique est annulée.
- Si aucun flux ne s'enregistre à nouveau après la période de grâce, l'appel est terminé pour empêcher les appels actifs bloqués.

## Nettoyeur d'appels périmés

Utilisez `staleCallReaperSeconds` pour terminer les appels qui ne reçoivent jamais de webhook terminal (par exemple, les appels en mode de notification qui ne se terminent jamais). La valeur par défaut est `0` (désactivé).

Plages recommandées :

- **Production :** `120`–`300` secondes pour les flux de style notification.
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

Lorsqu'un proxy ou un tunnel est placé devant le Gateway, le plugin reconstruit l'URL publique pour la vérification de la signature. Ces options contrôlent quels en-têtes transférés sont dignes de confiance :

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  Liste d'autorisation des hôtes provenant des en-têtes de transfert.
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  Faire confiance aux en-têtes de transfert sans liste d'autorisation.
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  Faire confiance aux en-têtes de transfert uniquement lorsque l'IP distante de la requête correspond à la liste.
</ParamField>

Protections supplémentaires :

- La **protection contre la réexécution** des webhooks est activée pour Twilio et Plivo. Les requêtes webhook valides rejouées sont acquittées mais ignorées pour les effets secondaires.
- Les tours de conversation Twilio incluent un jeton par tour dans les rappels `<Gather>`, de sorte que les rappels vocales obsolètes/rejouées ne peuvent pas satisfaire un tour de transcription en attente plus récent.
- Les requêtes webhook non authentifiées sont rejetées avant la lecture du corps lorsque les en-têtes de signature requis par le fournisseur sont manquants.
- Le webhook voice-call utilise le profil de corps partagé pré-auth (64 Ko / 5 secondes) plus une limite en cours par IP avant la vérification de la signature.

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

`latency` lit `calls.jsonl` à partir du chemin de stockage voice-call par défaut.
Utilisez `--file <path>` pour pointer vers un journal différent et `--last <n>` pour limiter
l'analyse aux N derniers enregistrements (par défaut 200). La sortie inclut p50/p90/p99
pour la latence des tours et les temps d'attente d'écoute.

## Outil d'agent

Nom de l'outil : `voice_call`.

| Action          | Args                      |
| --------------- | ------------------------- |
| `initiate_call` | `message`, `to?`, `mode?` |
| `continue_call` | `callId`, `message`       |
| `speak_to_user` | `callId`, `message`       |
| `send_dtmf`     | `callId`, `digits`        |
| `end_call`      | `callId`                  |
| `get_status`    | `callId`                  |

Ce dépôt fournit un document de compétence correspondant à `skills/voice-call/SKILL.md`.

## Gateway RPC

| Méthode              | Args                      |
| -------------------- | ------------------------- |
| `voicecall.initiate` | `to?`, `message`, `mode?` |
| `voicecall.continue` | `callId`, `message`       |
| `voicecall.speak`    | `callId`, `message`       |
| `voicecall.dtmf`     | `callId`, `digits`        |
| `voicecall.end`      | `callId`                  |
| `voicecall.status`   | `callId`                  |

## Connexes

- [Mode Talk](/fr/nodes/talk)
- [Synthèse vocale](/fr/tools/tts)
- [Réveil vocal](/fr/nodes/voicewake)
