---
summary: "Synthèse vocale pour les réponses sortantes — providers, personas, commandes slash et sortie par canal"
read_when:
  - Enabling text-to-speech for replies
  - Configuring a TTS provider, fallback chain, or persona
  - Using /tts commands or directives
title: "Synthèse vocale"
sidebarTitle: "Synthèse vocale (TTS)"
---

OpenClaw peut convertir les réponses sortantes en audio via **14 fournisseurs de synthèse vocale** et envoyer des messages vocaux natifs sur Feishu, Matrix, Telegram et WhatsApp, des pièces jointes audio partout ailleurs, ainsi que des flux PCM/Ulaw pour la téléphonie et Talk.

La TTS est la partie sortie vocale du mode `stt-tts` de Talk. Les sessions Talk natives du `realtime` synthétisent la voix à l'intérieur du fournisseur en temps réel au lieu d'appeler ce chemin TTS, tandis que les sessions `transcription` ne synthétisent pas de réponse vocale de l'assistant.

## Quick start

<Steps>
  <Step title="Choisissez un fournisseur"OpenAI>
    OpenAI et ElevenLabs sont les options hébergées les plus fiables. Microsoft et
    le CLI local fonctionnent sans clé API. Consultez la [matrice des fournisseurs](#supported-providers)
    pour la liste complète.
  </Step>
  <Step title="Définir la clé API">
    Exportez la variable d'environnement pour votre fournisseur (par exemple `OPENAI_API_KEY`,
    `ELEVENLABS_API_KEY`). Microsoft et le CLI local n'ont pas besoin de clé.
  </Step>
  <Step title="Activer dans la configuration">
    Définissez `messages.tts.auto: "always"` et `messages.tts.provider` :

    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "elevenlabs",
        },
      },
    }
    ```

  </Step>
  <Step title="Essayer dans le chat">
    `/tts status` affiche l'état actuel. `/tts audio Hello from OpenClaw`
    envoie une réponse audio unique.
  </Step>
</Steps>

<Note>
  La TTS automatique est désactivée (**off**) par défaut. Lorsque `messages.tts.provider` n'est pas défini, OpenClaw choisit le premier fournisseur configuré dans l'ordre de sélection automatique du registre. L'outil d'agent intégré `tts` est à intention explicite uniquement : le chat ordinaire reste du texte sauf si l'utilisateur demande de l'audio, utilise `/tts` ou active la TTS automatique/la
  directive vocale.
</Note>

## Fournisseurs pris en charge

| Fournisseur       | Auth                                                                                                              | Notes                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (aussi `AZURE_SPEECH_API_KEY`, `SPEECH_KEY`, `SPEECH_REGION`)          | Sortie de notes vocales Ogg/Opus natives et téléphonie.                                          |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                               | TTS compatible OpenAI. La valeur par défaut est `hexgrad/Kokoro-82M`.                            |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` ou `XI_API_KEY`                                                                              | Clonage vocal, multilingue, déterministe via `seed`; diffusé pour la lecture vocale sur Discord. |
| **Google Gemini** | `GEMINI_API_KEY` ou `GOOGLE_API_KEY`                                                                              | TTS par lots de l'API Gemini; conscient du personnage via `promptTemplate: "audio-profile-v1"`.  |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                                 | Sortie de notes vocales et téléphonie.                                                           |
| **Inworld**       | `INWORLD_API_KEY`                                                                                                 | API TTS en continu. Note vocale Opus native et téléphonie PCM.                                   |
| **CLI local**     | aucun                                                                                                             | Exécute une commande TTS locale configurée.                                                      |
| **Microsoft**     | aucun                                                                                                             | TTS neuronal Edge public via `node-edge-tts`. Best-effort, sans SLA.                             |
| **MiniMax**       | `MINIMAX_API_KEY` (ou Plan de jeton : `MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`)   | T2A v2 API. La valeur par défaut est `speech-2.8-hd`.                                            |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                  | Également utilisé pour le résumé automatique; prend en charge le personnage `instructions`.      |
| **OpenRouter**    | `OPENROUTER_API_KEY` (peut réutiliser `models.providers.openrouter.apiKey`)                                       | Modèle par défaut `hexgrad/kokoro-82m`.                                                          |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` ou `BYTEPLUS_SEED_SPEECH_API_KEY` (AppID/jeton hérité : `VOLCENGINE_TTS_APPID`/`_TOKEN`) | BytePlus Seed Speech HTTP API.                                                                   |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                   | Fournisseur partagé d'images, de vidéos et de synthèse vocale.                                   |
| **xAI**           | `XAI_API_KEY`                                                                                                     | Synthèse vocale par lots xAI. La note vocale native Opus n'est **pas** prise en charge.          |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                  | Synthèse vocale MiMo via les compléments de chat Xiaomi.                                         |

Si plusieurs providers sont configurés, celui sélectionné est utilisé en premier et les
autres servent d'options de secours. Le résumé automatique utilise `summaryModel` (ou
`agents.defaults.model.primary`), donc ce provider doit également être authentifié
si vous conservez les résumés activés.

<Warning>
  Le provider **Microsoft** intégré utilise le service de synthèse vocale neuronale en ligne de Microsoft Edge via `node-edge-tts`. C'est un service web public sans SLA ou quota publié — considérez-le comme au meilleur effort. L'identifiant de provider hérité `edge` est normalisé vers `microsoft` et `openclaw doctor --fix` réécrit la configuration persistée ; les nouvelles configurations doivent
  toujours utiliser `microsoft`.
</Warning>

## Configuration

La configuration TTS se trouve sous `messages.tts` dans `~/.openclaw/openclaw.json`. Choisissez un
préréglage et adaptez le bloc de provider :

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "azure-speech",
      providers: {
        "azure-speech": {
          apiKey: "${AZURE_SPEECH_KEY}",
          region: "eastus",
          voice: "en-US-JennyNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          voiceNoteOutputFormat: "ogg-24khz-16bit-mono-opus",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "${GEMINI_API_KEY}",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          // Optional natural-language style prompts:
          // audioProfile: "Speak in a calm, podcast-host tone.",
          // speakerName: "Alex",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          apiKey: "${GRADIUM_API_KEY}",
          voiceId: "YTpq7expH9539ERJ",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "inworld",
      providers: {
        inworld: {
          apiKey: "${INWORLD_API_KEY}",
          modelId: "inworld-tts-1.5-max",
          voiceId: "Sarah",
          temperature: 0.7,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="CLILocal CLI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "tts-local-cli",
      providers: {
        "tts-local-cli": {
          command: "say",
          args: ["-o", "{{OutputPath}}", "{{Text}}"],
          outputFormat: "wav",
          timeoutMs: 120000,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Microsoft (no key)">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
        microsoft: {
          enabled: true,
          voice: "en-US-MichelleNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          rate: "+0%",
          pitch: "+0%",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="MiniMaxMiniMax">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "${MINIMAX_API_KEY}",
          model: "speech-2.8-hd",
          voiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenAIOpenAI + ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      providers: {
        openai: {
          apiKey: "${OPENAI_API_KEY}",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.0, useSpeakerBoost: true, speed: 1.0 },
          applyTextNormalization: "auto",
          languageCode: "en",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenRouterOpenRouter">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          apiKey: "${OPENROUTER_API_KEY}",
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "${VOLCENGINE_TTS_API_KEY}",
          resourceId: "seed-tts-1.0",
          voice: "en_female_anna_mars_bigtts",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "${XAI_API_KEY}",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="XiaomiXiaomi MiMo">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "${XIAOMI_API_KEY}",
          model: "mimo-v2.5-tts",
          voice: "mimo_default",
          format: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

### Remplacements vocaux par agent

Utilisez `agents.list[].tts` lorsqu'un agent doit parler avec un fournisseur, une voix, un modèle, un persona ou un mode TTS automatique différent. Le bloc de l'agent fusionne en profondeur `messages.tts`, de sorte que les informations d'identification du fournisseur peuvent rester dans la configuration globale du fournisseur :

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
      },
    },
  },
  agents: {
    list: [
      {
        id: "reader",
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

Pour épingler un persona par agent, définissez `agents.list[].tts.persona` à côté de la configuration du fournisseur — cela remplace le `messages.tts.persona` global pour cet agent uniquement.

Ordre de priorité pour les réponses automatiques, `/tts audio`, `/tts status`, et l'outil agent `tts` :

1. `messages.tts`
2. `agents.list[].tts` actif
3. remplacement du channel, lorsque le channel prend en charge `channels.<channel>.tts`
4. remplacement du compte, lorsque le channel transmet `channels.<channel>.accounts.<id>.tts`
5. préférences `/tts` locales pour cet hôte
6. directives `[[tts:...]]` en ligne lorsque les [surcharges de modèle](#model-driven-directives) sont activées

Les remplacements de channel et de compte utilisent la même structure que `messages.tts` et fusionnent en profondeur avec les couches précédentes, afin que les informations d'identification partagées du provider puissent rester dans `messages.tts` tandis qu'un channel ou un compte bot ne modifie que la voix, le model, la persona ou le mode auto :

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
      },
    },
  },
  channels: {
    feishu: {
      accounts: {
        english: {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

## Personas

Une **persona** est une identité vocale stable qui peut être appliquée de manière déterministe sur plusieurs providers. Elle peut privilégier un provider, définir une intention de prompt neutre par rapport au provider et transporter des liaisons spécifiques au provider pour les voix, les models, les modèles de prompt, les graines et les paramètres vocaux.

### Persona minimale

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "narrator",
      personas: {
        narrator: {
          label: "Narrator",
          provider: "elevenlabs",
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL", modelId: "eleven_multilingual_v2" },
          },
        },
      },
    },
  },
}
```

### Persona complète (prompt neutre par rapport au provider)

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "alfred",
      personas: {
        alfred: {
          label: "Alfred",
          description: "Dry, warm British butler narrator.",
          provider: "google",
          fallbackPolicy: "preserve-persona",
          prompt: {
            profile: "A brilliant British butler. Dry, witty, warm, charming, emotionally expressive, never generic.",
            scene: "A quiet late-night study. Close-mic narration for a trusted operator.",
            sampleContext: "The speaker is answering a private technical request with concise confidence and dry warmth.",
            style: "Refined, understated, lightly amused.",
            accent: "British English.",
            pacing: "Measured, with short dramatic pauses.",
            constraints: ["Do not read configuration values aloud.", "Do not explain the persona."],
          },
          providers: {
            google: {
              model: "gemini-3.1-flash-tts-preview",
              voiceName: "Algieba",
              promptTemplate: "audio-profile-v1",
            },
            openai: { model: "gpt-4o-mini-tts", voice: "cedar" },
            elevenlabs: {
              voiceId: "voice_id",
              modelId: "eleven_multilingual_v2",
              seed: 42,
              voiceSettings: {
                stability: 0.65,
                similarityBoost: 0.8,
                style: 0.25,
                useSpeakerBoost: true,
                speed: 0.95,
              },
            },
          },
        },
      },
    },
  },
}
```

### Résolution de persona

La persona active est sélectionnée de manière déterministe :

1. Préférence locale `/tts persona <id>`, si définie.
2. `messages.tts.persona`, si défini.
3. Aucune persona.

La sélection du provider fonctionne d'abord de manière explicite :

1. Remplacements directs (CLI, passerelle, Talk, directives TTS autorisées).
2. Préférence locale `/tts provider <id>`.
3. `provider` de la persona active.
4. `messages.tts.provider`.
5. Sélection automatique du registre.

Pour chaque tentative de provider, OpenClaw fusionne les configurations dans cet ordre :

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. Remplacements de requêtes de confiance
4. Remplacements de directives TTS émises par le model autorisées

### Comment les providers utilisent les prompts de persona

Les champs de prompt de persona (`profile`, `scene`, `sampleContext`, `style`, `accent`,
`pacing`, `constraints`) sont **neutres par rapport au provider**. Chaque provider décide comment
les utiliser :

<AccordionGroup>
  <Accordion title="Google Gemini">
    Enveloppe les champs de prompt de persona dans une structure de prompt TTS Gemini **uniquement lorsque**
    la configuration effective du provider Google définit `promptTemplate: "audio-profile-v1"`
    ou `personaPrompt`. Les anciens champs `audioProfile` et `speakerName` sont
    toujours ajoutés en préambule comme texte de prompt spécifique à Google. Les balises audio en ligne telles que
    `[whispers]` ou `[laughs]` à l'intérieur d'un bloc `[[tts:text]]` sont préservées
    dans la transcription Gemini ; OpenClaw ne génère pas ces balises.
  </Accordion>
  <Accordion title="OpenAI">
    Mappe les champs de prompt de persona vers le champ de requête `instructions` **uniquement lorsque**
    aucun `instructions` explicite OpenAI n'est configuré. Le `instructions`
    explicite l'emporte toujours.
  </Accordion>
  <Accordion title="Autres providers">
    Utilisent uniquement les liaisons de persona spécifiques au provider sous
    `personas.<id>.providers.<provider>`. Les champs de prompt de persona sont ignorés
    sauf si le provider implémente sa propre carte de prompts de persona.
  </Accordion>
</AccordionGroup>

### Politique de repli

`fallbackPolicy` contrôle le comportement lorsqu'un persona n'a **aucune liaison** pour le
provider tenté :

| Politique           | Comportement                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **Par défaut.** Les champs de prompt neutres par rapport au provider restent disponibles ; le provider peut les utiliser ou les ignorer.                                           |
| `provider-defaults` | Le persona est omis de la préparation du prompt pour cette tentative ; le provider utilise ses paramètres neutres par défaut tandis que le repli vers d'autres providers continue. |
| `fail`              | Ignorez cette tentative de provider avec `reasonCode: "not_configured"` et `personaBinding: "missing"`. Les providers de secours sont toujours essayés.                            |

La requête TTS entière échoue uniquement lorsque **tous** les providers tentés sont ignorés ou échouent.

La sélection du provider de session Talk est limitée à la session. Un client Talk doit choisir les ids de provider, les ids de model, les ids de voix et les paramètres régionaux à partir de `talk.catalog` et les transmettre via la session Talk ou la requête de transfert. L'ouverture d'une session vocale ne doit pas modifier `messages.tts` ni les providers Talk globaux par défaut.

## Directives pilotées par le modèle

Par défaut, l'assistant **peut** émettre des directives `[[tts:...]]` pour remplacer la voix, le modèle ou la vitesse pour une seule réponse, plus un bloc `[[tts:text]]...[[/tts:text]]` optionnel pour les indices expressifs qui doivent apparaître uniquement dans l'audio :

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Lorsque `messages.tts.auto` est `"tagged"`, les **directives sont requises** pour déclencher l'audio. La livraison en bloc par flux supprime les directives du texte visible avant que le channel ne les voie, même lorsqu'elles sont divisées sur des blocs adjacents.

`provider=...` est ignoré sauf si `modelOverrides.allowProvider: true`. Lorsqu'une réponse déclare `provider=...`, les autres clés de cette directive ne sont analysées que par ce provider ; les clés non prises en charge sont supprimées et signalées en tant qu'avertissements de directive TTS.

**Clés de directive disponibles :**

- `provider` (id de provider enregistré ; nécessite `allowProvider: true`)
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume`MiniMax (volume MiniMax, 0–10)
- `pitch`MiniMax (hauteur de ton entière MiniMax, −12 à 12 ; les valeurs fractionnaires sont tronquées)
- `emotion` (balise d'émotion Volcengine)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**Désactiver entièrement les remplacements par le modèle :**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**Autoriser le changement de provider tout en gardant les autres options configurables :**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## Commandes slash

Commande unique `/tts`. Sur Discord, OpenClaw enregistre également `/voice` car
`/tts` est une commande intégrée de Discord — le texte `/tts ...` fonctionne toujours.

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>Les commandes nécessitent un expéditeur autorisé (les règles de liste blanche/propriétaire s'appliquent) et soit `commands.text` soit l'enregistrement natif des commandes doit être activé.</Note>

Notes de comportement :

- `/tts on` écrit la préférence TTS locale dans `always` ; `/tts off` l'écrit dans `off`.
- `/tts chat on|off|default` écrit un remplacement d'auto-TTS limité à la session pour la discussion actuelle.
- `/tts persona <id>` écrit la préférence de persona locale ; `/tts persona off` l'efface.
- `/tts latest` lit la dernière réponse de l'assistant à partir de la transcription de la session actuelle et l'envoie sous forme d'audio une fois. Il ne stocke qu'un hachage de cette réponse sur l'entrée de session pour supprimer les envois vocaux en double.
- `/tts audio` génère une réponse audio ponctuelle (n'**active pas** le TTS).
- `limit` et `summary` sont stockés dans les **préférences locales**, et non dans la configuration principale.
- `/tts status` inclut des diagnostics de secours pour la dernière tentative — `Fallback: <primary> -> <used>`, `Attempts: ...`, et les détails par tentative (`provider:outcome(reasonCode) latency`).
- `/status` affiche le mode TTS actif ainsi que le provider, le model, la voix configurés et les métadonnées de point de terminaison personnalisé nettoyées lorsque le TTS est activé.

## Préférences par utilisateur

Les commandes slash écrivent des redéfinitions locales dans `prefsPath`. La valeur par défaut est `~/.openclaw/settings/tts.json` ; redéfinissez avec la variable d'env `OPENCLAW_TTS_PREFS` ou `messages.tts.prefsPath`.

| Champ stocké | Effet                                                       |
| ------------ | ----------------------------------------------------------- |
| `auto`       | Redéfinition locale de TTS automatique (`always`, `off`, …) |
| `provider`   | Redéfinition locale du provider principal                   |
| `persona`    | Redéfinition locale du persona                              |
| `maxLength`  | Seuil de résumé (défaut `1500` caractères)                  |
| `summarize`  | Bascule de résumé (défaut `true`)                           |

Ces paramètres remplacent la configuration effective issue de `messages.tts` ainsi que le bloc `agents.list[].tts` actif pour cet hôte.

## Formats de sortie (fixes)

La diffusion vocale TTS est pilotée par les capacités du canal. Les plugins de canal indiquent si la TTS de style vocal doit demander aux providers une cible `voice-note` native ou conserver une synthèse `audio-file` normale et marquer uniquement la sortie compatible pour la diffusion vocale.

- **Canaux prenant en charge les notes vocales** : les réponses par note vocale préfèrent Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48 kHz / 64 kbps est un bon compromis pour les messages vocaux.
- **Feishu / WhatsApp** : lorsqu'une réponse par note vocale est produite en MP3/WebM/WAV/M4A ou un autre fichier audio probable, le plugin de canal la transcode en Ogg/Opus 48 kHz avec `ffmpeg` avant d'envoyer le message vocal natif. WhatsApp envoie le résultat via la charge utile `audio` de Baileys avec `ptt: true` et `audio/ogg; codecs=opus`. Si la conversion échoue, Feishu reçoit le fichier d'origine en pièce jointe ; l'envoi WhatsApp échoue plutôt que de poster une charge utile PTT incompatible.
- **Autres canaux** : MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44,1 kHz / 128 kbps est le compromis par défaut pour la clarté de la parole.
- **MiniMax** : MP3 (MiniMax`speech-2.8-hd`OpenClawMiniMax model, 32 kHz sample rate) pour les pièces jointes audio normales. Pour les cibles de notes vocales annoncées par le canal, OpenClaw transcode le MP3 MiniMax en Opus 48 kHz avec `ffmpeg` avant la livraison lorsque le canal annonce le transcodage.
- **Xiaomi MiMo** : MP3 par défaut, ou WAV si configuré. Pour les cibles de notes vocales annoncées par le canal, OpenClaw transcode la sortie Xiaomi en Opus 48 kHz avec XiaomiOpenClawXiaomi`ffmpeg` avant la livraison lorsque le canal annonce le transcodage.
- **Local CLI** : utilise le CLI`outputFormat` configuré. Les cibles de notes vocales sont
  converties en Ogg/Opus et la sortie téléphonique est convertie en PCM mono brut 16 kHz
  avec `ffmpeg`.
- **Google Gemini** : L'API TTS Gemini renvoie du PCM brut 24 kHz. OpenClaw l'enveloppe en WAV pour les pièces jointes audio, le transcode en Opus 48 kHz pour les cibles de notes vocales, et renvoie le PCM directement pour Talk/téléphonie.
- **Gradium** : WAV pour les pièces jointes audio, Opus pour les cibles de notes vocales, et `ulaw_8000` à 8 kHz pour la téléphonie.
- **Inworld** : MP3 pour les pièces jointes audio normales, `OGG_OPUS` natif pour les cibles de notes vocales, et `PCM` brut à 22050 Hz pour Talk/téléphonie.
- **xAI** : MP3 par défaut ; `responseFormat` peut être `mp3`, `wav`, `pcm`, `mulaw` ou `alaw`OpenClaw. OpenClaw utilise le point de terminaison REST TTS par lot d'xAI et renvoie une pièce jointe audio complète ; le WebSocket TTS en continu d'xAI n'est pas utilisé par ce chemin provider. Le format de note vocale Opus natif n'est pas pris en charge par ce chemin.
- **Microsoft** : utilise `microsoft.outputFormat` (défaut `audio-24khz-48kbitrate-mono-mp3`).
  - Le transport groupé accepte un `outputFormat`, mais tous les formats ne sont pas disponibles auprès du service.
  - Les valeurs de format de sortie suivent les formats de sortie Microsoft Speech (y compris Ogg/WebM Opus).
  - Telegram Telegram `sendVoice` accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin
    de messages vocaux Opus garantis.
  - Si le format de sortie Microsoft configuré échoue, OpenClaw réessaie avec MP3.

Les formats de sortie OpenAI/ElevenLabs sont fixes par channel (voir ci-dessus).

## Comportement Auto-TTS

Lorsque `messages.tts.auto` est activé, OpenClaw :

- Ignore TTS si la réponse contient déjà des médias ou une directive `MEDIA:`.
- Ignore les réponses très courtes (moins de 10 caractères).
- Résume les réponses longues lorsque les résumés sont activés, en utilisant
  `summaryModel` (ou `agents.defaults.model.primary`).
- Joint l'audio généré à la réponse.
- Dans `mode: "final"`, envoie toujours du TTS audio uniquement pour les réponses finales en streaming
  une fois le flux de texte terminé ; les médias générés passent par la même
  normalisation des médias du channel que les pièces jointes de réponse normales.

Si la réponse dépasse `maxLength` et que le résumé est désactivé (ou qu'il n'y a pas de clé API pour le
model de résumé), l'audio est ignoré et la réponse texte normale est envoyée.

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize -> TTS -> attach audio
```

## Formats de sortie par channel

| Cible                                 | Format                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Feishu / Matrix / Telegram / WhatsApp | Les réponses en notes vocales préfèrent **Opus** (`opus_48000_64` de ElevenLabs, `opus` de OpenAI). 48 kHz / 64 kbps équilibre la clarté et la taille. |
| Autres channels                       | **MP3** (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI). 44,1 kHz / 128 kbps par défaut pour la parole.                                               |
| Talk / téléphonie                     | **PCM** natif du provider (Inworld 22050 Hz, Google 24 kHz), ou `ulaw_8000` de Gradium pour la téléphonie.                                             |

Notes par provider :

- **Transcodage Feishu / WhatsApp :** Lorsqu'une réponse sous forme de note vocale arrive au format MP3/WebM/WAV/M4A, le plugin de canal la convertit en Ogg/Opus 48 kHz avec WhatsApp`ffmpeg`WhatsAppBaileys. WhatsApp envoie via Baileys avec `ptt: true` et `audio/ogg; codecs=opus`WhatsApp. Si la conversion échoue : Feishu revient à l'envoi du fichier original ; l'envoi WhatsApp échoue plutôt que de poster une charge utile PTT incompatible.
- **MiniMax / Xiaomi MiMo :** MP3 par défaut (32 kHz pour MiniMax MiniMaxXiaomiMiniMax`speech-2.8-hd`) ; converti en Opus 48 kHz pour les cibles de notes vocales via `ffmpeg`.
- **CLI locale :** Utilise le CLI`outputFormat` configuré. Les cibles de notes vocales sont converties en Ogg/Opus et la sortie téléphonique en PCM brut mono 16 kHz.
- **Google Gemini :** Renvoie du PCM brut 24 kHz. OpenClaw l'enveloppe en WAV pour les pièces jointes, le convertit en Opus 48 kHz pour les cibles de notes vocales, et renvoie le PCM directement pour Talk/téléphonie.
- **Inworld :** Pièces jointes MP3, note vocale native `OGG_OPUS`, PCM brut `PCM` 22050 Hz pour Talk/téléphonie.
- **xAI :** MP3 par défaut ; `responseFormat` peut être `mp3|wav|pcm|mulaw|alaw`. Utilise le point de terminaison REST par lot de xAI — la TTS WebSocket en continu n'est **pas** utilisée. Le format de note vocale Opus natif n'est **pas** pris en charge.
- **Microsoft :** Utilise `microsoft.outputFormat` (`audio-24khz-48kbitrate-mono-mp3`Telegram par défaut). Telegram `sendVoice`OpenAIOpenClaw accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin de messages vocaux Opus garantis. Si le format Microsoft configuré échoue, OpenClaw réessaie avec MP3.

Les formats de sortie d'OpenAI et ElevenLabs sont fixes par canal, comme indiqué ci-dessus.

## Référence des champs

<AccordionGroup>
  <Accordion title="Top-level messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      Mode TTS automatique. `inbound` n'envoie de l'audio qu'après un message vocal entrant ; `tagged` n'envoie de l'audio que si la réponse inclut des directives `[[tts:...]]` ou un bloc `[[tts:text]]`.
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      Interrupteur hérité. `openclaw doctor --fix` migre ceci vers `auto`.
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` inclut les réponses d'outil/bloc en plus des réponses finales.
    </ParamField>
    <ParamField path="provider" type="string">
      Identifiant du fournisseur de synthèse vocale. Si non défini, OpenClaw utilise le premier fournisseur configuré dans l'ordre de sélection automatique du registre. L'ancien `provider: "edge"` est réécrit en `"microsoft"` par `openclaw doctor --fix`.
    </ParamField>
    <ParamField path="persona" type="string">
      Identifiant de persona actif depuis `personas`. Normalisé en minuscules.
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      Identité vocale stable. Champs : `label`, `description`, `provider`, `fallbackPolicy`, `prompt`, `providers.<provider>`. Voir [Personas](#personas).
    </ParamField>
    <ParamField path="summaryModel" type="string">
      Modèle économique pour le résumé automatique ; par défaut `agents.defaults.model.primary`. Accepte `provider/model` ou un alias de modèle configuré.
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      Autoriser le modèle à émettre des directives TTS. `enabled` par défaut `true` ; `allowProvider` par défaut `false`.
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      Paramètres propres au fournisseur, indexés par l'identifiant du fournisseur de synthèse vocale. Les blocs directs hérités (`messages.tts.openai`, `.elevenlabs`, `.microsoft`, `.edge`) sont réécrits par `openclaw doctor --fix` ; ne valider que `messages.tts.providers.<id>`.
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      Limite stricte pour les caractères d'entrée TTS. `/tts audio` échoue si dépassé.
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      Délai d'expiration de la requête en millisecondes.
    </ParamField>
    <ParamField path="prefsPath" type="string">
      Remplacer le chemin JSON des préférences locales (fournisseur/limite/résumé). Par défaut `~/.openclaw/settings/tts.json`.
    </ParamField>
  </Accordion>

<Accordion title="Azure Speech">
  <ParamField path="apiKey" type="string">
    Env : `AZURE_SPEECH_KEY`, `AZURE_SPEECH_API_KEY` ou `SPEECH_KEY`.
  </ParamField>
  <ParamField path="region" type="string">
    Région Azure Speech (ex. `eastus`). Env : `AZURE_SPEECH_REGION` ou `SPEECH_REGION`.
  </ParamField>
  <ParamField path="endpoint" type="string">
    Surcharge facultative du point de terminaison Azure Speech (alias `baseUrl`).
  </ParamField>
  <ParamField path="voice" type="string">
    Nom court de la voix Azure (ShortName). Par défaut `en-US-JennyNeural`.
  </ParamField>
  <ParamField path="lang" type="string">
    Code de langue SSML. Par défaut `en-US`.
  </ParamField>
  <ParamField path="outputFormat" type="string">
    `X-Microsoft-OutputFormat` Azure pour l'audio standard. Par défaut `audio-24khz-48kbitrate-mono-mp3`.
  </ParamField>
  <ParamField path="voiceNoteOutputFormat" type="string">
    `X-Microsoft-OutputFormat` Azure pour la sortie en note vocale. Par défaut `ogg-24khz-16bit-mono-opus`.
  </ParamField>
</Accordion>

<Accordion title="ElevenLabs">
  <ParamField path="apiKey" type="string">
    Revient à `ELEVENLABS_API_KEY` ou `XI_API_KEY`.
  </ParamField>
  <ParamField path="model" type="string">
    ID du modèle (ex. `eleven_multilingual_v2`, `eleven_v3`).
  </ParamField>
  <ParamField path="voiceId" type="string">
    ID de voix ElevenLabs.
  </ParamField>
  <ParamField path="voiceSettings" type="object">
    `stability`, `similarityBoost`, `style` (chaque `0..1`), `useSpeakerBoost` (`true|false`), `speed` (`0.5..2.0`, `1.0` = normal).
  </ParamField>
  <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>
    Mode de normalisation du texte.
  </ParamField>
  <ParamField path="languageCode" type="string">
    ISO 639-1 sur 2 lettres (ex. `en`, `de`).
  </ParamField>
  <ParamField path="seed" type="number">
    Entier `0..4294967295` pour un déterminisme au mieux possible.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Remplacer l'URL de base de l'API ElevenLabs.
  </ParamField>
</Accordion>

<Accordion title="Google Gemini">
  <ParamField path="apiKey" type="string">
    Revient à `GEMINI_API_KEY` / `GOOGLE_API_KEY`. Si omis, le TTS peut réutiliser `models.providers.google.apiKey` avant le repli vers l'environnement.
  </ParamField>
  <ParamField path="model" type="string">
    Modèle TTS Gemini. Par défaut `gemini-3.1-flash-tts-preview`.
  </ParamField>
  <ParamField path="voiceName" type="string">
    Nom de la voix préconstruite Gemini. Par défaut `Kore`. Alias : `voice`.
  </ParamField>
  <ParamField path="audioProfile" type="string">
    Invite de style en langage naturel ajoutée avant le texte parlé.
  </ParamField>
  <ParamField path="speakerName" type="string">
    Étiquette de locuteur optionnelle ajoutée avant le texte parlé lorsque votre invite utilise un locuteur nommé.
  </ParamField>
  <ParamField path="promptTemplate" type='"audio-profile-v1"'>
    Définir sur `audio-profile-v1` pour encapsuler les champs d'invite de persona actifs dans une structure d'invite TTS Gemini déterministe.
  </ParamField>
  <ParamField path="personaPrompt" type="string">
    Texte d'invite de persona supplémentaire spécifique à Google, ajouté aux Notes du réalisateur du modèle.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Seul `https://generativelanguage.googleapis.com` est accepté.
  </ParamField>
</Accordion>

<Accordion title="Gradium">
  <ParamField path="apiKey" type="string">
    Env : `GRADIUM_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Par défaut `https://api.gradium.ai`.
  </ParamField>
  <ParamField path="voiceId" type="string">
    Par défaut Emma (`YTpq7expH9539ERJ`).
  </ParamField>
</Accordion>

  <Accordion title="Inworld">
    ### Inworld principal

    <ParamField path="apiKey" type="string">Env : `INWORLD_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Par défaut `https://api.inworld.ai`.</ParamField>
    <ParamField path="modelId" type="string">Par défaut `inworld-tts-1.5-max`. Aussi : `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`.</ParamField>
    <ParamField path="voiceId" type="string">Par défaut `Sarah`.</ParamField>
    <ParamField path="temperature" type="number">Température d'échantillonnage `0..2`.</ParamField>

  </Accordion>

<Accordion title="Local CLI (tts-local-cli)">
  <ParamField path="command" type="string">
    Exécutable local ou chaîne de commande pour le TTS CLI.
  </ParamField>
  <ParamField path="args" type="string[]">
    Arguments de commande. Prend en charge les espaces réservés `{{ Text }}`, `{{ OutputPath }}`, `{{ OutputDir }}`, `{{ OutputBase }}`.
  </ParamField>
  <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>
    Format de sortie CLI attendu. Par défaut `mp3` pour les pièces jointes audio.
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    Délai d'attente de la commande en millisecondes. Par défaut `120000`.
  </ParamField>
  <ParamField path="cwd" type="string">
    Répertoire de travail facultatif pour la commande.
  </ParamField>
  <ParamField path="env" type="Record<string, string>">
    Remplacements d'environnement facultatifs pour la commande.
  </ParamField>
</Accordion>

<Accordion title="APIMicrosoft (sans clé API)">
  <ParamField path="enabled" type="boolean" default="true">
    Autoriser l'utilisation de la synthèse vocale Microsoft.
  </ParamField>
  <ParamField path="voice" type="string">
    Nom de la voix neuronale Microsoft (ex. : `en-US-MichelleNeural`).
  </ParamField>
  <ParamField path="lang" type="string">
    Code de langue (ex. : `en-US`).
  </ParamField>
  <ParamField path="outputFormat" type="string">
    Format de sortie Microsoft. Par défaut `audio-24khz-48kbitrate-mono-mp3`. Tous les formats ne sont pas pris en charge par le transport Edge fourni.
  </ParamField>
  <ParamField path="rate / pitch / volume" type="string">
    Chaînes de pourcentage (ex. : `+10%`, `-5%`).
  </ParamField>
  <ParamField path="saveSubtitles" type="boolean">
    Écrire des sous-titres JSON avec le fichier audio.
  </ParamField>
  <ParamField path="proxy" type="string">
    URL du proxy pour les requêtes de synthèse vocale Microsoft.
  </ParamField>
  <ParamField path="timeoutMs" type="number">
    Remplacement du délai d'expiration de la requête (ms).
  </ParamField>
  <ParamField path="edge.*" type="object" deprecated>
    Ancien alias. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante en `providers.microsoft`.
  </ParamField>
</Accordion>

<Accordion title="MiniMaxMiniMax">
  <ParamField path="apiKey" type="string">
    Revient à `MINIMAX_API_KEY`. Auth Token Plan via `MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, ou `MINIMAX_CODING_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Par défaut `https://api.minimax.io`. Env : `MINIMAX_API_HOST`.
  </ParamField>
  <ParamField path="model" type="string">
    Par défaut `speech-2.8-hd`. Env : `MINIMAX_TTS_MODEL`.
  </ParamField>
  <ParamField path="voiceId" type="string">
    Par défaut `English_expressive_narrator`. Env : `MINIMAX_TTS_VOICE_ID`.
  </ParamField>
  <ParamField path="speed" type="number">
    `0.5..2.0`. Par défaut `1.0`.
  </ParamField>
  <ParamField path="vol" type="number">
    `(0, 10]`. Par défaut `1.0`.
  </ParamField>
  <ParamField path="pitch" type="number">
    Entier `-12..12`. Par défaut `0`. Les valeurs fractionnaires sont tronquées avant la requête.
  </ParamField>
</Accordion>

<Accordion title="OpenAIOpenAI">
  <ParamField path="apiKey" type="string">
    Retourne à `OPENAI_API_KEY`.
  </ParamField>
  <ParamField path="model" type="string" OpenAI>
    Identifiant du model TTS OpenAI (par ex. `gpt-4o-mini-tts`).
  </ParamField>
  <ParamField path="voice" type="string">
    Nom de la voix (par ex. `alloy`, `cedar`).
  </ParamField>
  <ParamField path="instructions" type="string" OpenAI>
    Champ OpenAI `instructions` explicite. Lorsqu'il est défini, les champs de prompt de persona ne sont **pas** mappés automatiquement.
  </ParamField>
  <ParamField path="extraBody / extra_body" type="Record<string, unknown>">
    Champs JSON supplémentaires fusionnés dans les corps de requête `/audio/speech`OpenAIOpenAI après les champs TTS OpenAI générés. À utiliser pour les points de terminaison compatibles OpenAI tels que Kokoro qui nécessitent des clés spécifiques au provider comme `lang` ; les clés de prototype non sécurisées sont ignorées.
  </ParamField>
  <ParamField path="baseUrl" type="string" OpenAI>
    Remplacer le point de terminaison TTS OpenAI. Ordre de résolution : config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`OpenAI. Les valeurs non par défaut sont traitées comme des points de terminaison TTS compatibles OpenAI, les noms de model et de voix personnalisés sont donc acceptés.
  </ParamField>
</Accordion>

<Accordion title="OpenRouterOpenRouter">
  <ParamField path="apiKey" type="string">
    Env : `OPENROUTER_API_KEY`. Peut réutiliser `models.providers.openrouter.apiKey`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Par défaut `https://openrouter.ai/api/v1`. L'ancien `https://openrouter.ai/v1` est normalisé.
  </ParamField>
  <ParamField path="model" type="string">
    Par défaut `hexgrad/kokoro-82m`. Alias : `modelId`.
  </ParamField>
  <ParamField path="voice" type="string">
    Par défaut `af_alloy`. Alias : `voiceId`.
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "pcm"'>
    Par défaut `mp3`.
  </ParamField>
  <ParamField path="speed" type="number">
    Remplacement de la vitesse propre au fournisseur.
  </ParamField>
</Accordion>

<Accordion title="Volcengine (BytePlus Seed Speech)">
  <ParamField path="apiKey" type="string">
    Env : `VOLCENGINE_TTS_API_KEY` ou `BYTEPLUS_SEED_SPEECH_API_KEY`.
  </ParamField>
  <ParamField path="resourceId" type="string">
    Par défaut `seed-tts-1.0`. Env : `VOLCENGINE_TTS_RESOURCE_ID`. Utilisez `seed-tts-2.0` lorsque votre projet dispose des droits TTS 2.0.
  </ParamField>
  <ParamField path="appKey" type="string">
    En-tête de la clé d'application. Par défaut `aGjiRDfUWi`. Env : `VOLCENGINE_TTS_APP_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Remplacer le point de terminaison HTTP TTS Seed Speech. Env : `VOLCENGINE_TTS_BASE_URL`.
  </ParamField>
  <ParamField path="voice" type="string">
    Type de voix. Par défaut `en_female_anna_mars_bigtts`. Env : `VOLCENGINE_TTS_VOICE`.
  </ParamField>
  <ParamField path="speedRatio" type="number">
    Rapport de vitesse natif du fournisseur.
  </ParamField>
  <ParamField path="emotion" type="string">
    Balise d'émotion native du fournisseur.
  </ParamField>
  <ParamField path="appId / token / cluster" type="string" deprecated>
    Champs de la console Volcengine Speech hérités. Env : `VOLCENGINE_TTS_APPID`, `VOLCENGINE_TTS_TOKEN`, `VOLCENGINE_TTS_CLUSTER` (par défaut `volcano_tts`).
  </ParamField>
</Accordion>

<Accordion title="xAI">
  <ParamField path="apiKey" type="string">
    Env : `XAI_API_KEY`.
  </ParamField>
  <ParamField path="baseUrl" type="string">
    Par défaut `https://api.x.ai/v1`. Env : `XAI_BASE_URL`.
  </ParamField>
  <ParamField path="voiceId" type="string">
    Par défaut `eve`. Voix en direct : `ara`, `eve`, `leo`, `rex`, `sal`, `una`.
  </ParamField>
  <ParamField path="language" type="string">
    Code de langue BCP-47 ou `auto`. Par défaut `en`.
  </ParamField>
  <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>
    Par défaut `mp3`.
  </ParamField>
  <ParamField path="speed" type="number">
    Surcharge de vitesse native du fournisseur.
  </ParamField>
</Accordion>

  <Accordion title="XiaomiXiaomi MiMo">
    <ParamField path="apiKey" type="string">Env : `XIAOMI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Par défaut `https://api.xiaomimimo.com/v1`. Env : `XIAOMI_BASE_URL`.</ParamField>
    <ParamField path="model" type="string">Par défaut `mimo-v2.5-tts`. Env : `XIAOMI_TTS_MODEL`. Prend également en charge `mimo-v2-tts`.</ParamField>
    <ParamField path="voice" type="string">Par défaut `mimo_default`. Env : `XIAOMI_TTS_VOICE`.</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>Par défaut `mp3`. Env : `XIAOMI_TTS_FORMAT`.</ParamField>
    <ParamField path="style" type="string">Instruction de style en langage naturel optionnelle envoyée en tant que message utilisateur ; non prononcée.</ParamField>
  </Accordion>
</AccordionGroup>

## Outil de l'agent

L'outil `tts`MatrixTelegramWhatsAppWhatsApp convertit le texte en parole et renvoie une pièce jointe audio pour
la livraison de la réponse. Sur Feishu, Matrix, Telegram et WhatsApp, l'audio est
livré sous forme de message vocal plutôt que de pièce jointe de fichier. Feishu et
WhatsApp peuvent transcoder la sortie TTS non-Opus sur ce chemin lorsque `ffmpeg` est
disponible.

WhatsApp envoie l'audio via Baileys sous forme de note vocale PTT (WhatsAppBaileys`audio` avec
`ptt: true`) et envoie le texte visible **séparément** de l'audio PTT car
les clients ne rendent pas consistently les légendes sur les notes vocales.

L'outil accepte les champs facultatifs `channel` et `timeoutMs` ; `timeoutMs` est un délai d'expiration de la requête provider par appel en millisecondes. Les valeurs par appel remplacent `messages.tts.timeoutMs` ; les délais d'expiration TTS configurés remplacent toute valeur par défaut provider définie par un plugin.

## Gateway RPC

| Méthode           | Objectif                                               |
| ----------------- | ------------------------------------------------------ |
| `tts.status`      | Lire l'état TTS actuel et la dernière tentative.       |
| `tts.enable`      | Définir la préférence automatique locale sur `always`. |
| `tts.disable`     | Définir la préférence automatique locale sur `off`.    |
| `tts.convert`     | Conversion ponctuelle texte → audio.                   |
| `tts.setProvider` | Définir la préférence locale de provider.              |
| `tts.setPersona`  | Définir la préférence locale de persona.               |
| `tts.providers`   | Lister les providers configurés et leur statut.        |

## Liens de service

- [Guide de synthèse vocale OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Référence de l'API Audio OpenAIAPI](https://platform.openai.com/docs/api-reference/audio)
- [Synthèse vocale Azure Speech REST](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Provider Azure Speech](/fr/providers/azure-speech)
- [Synthèse vocale ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Authentification ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/fr/providers/gradium)
- [API TTS Inworld](APIhttps://docs.inworld.ai/tts/tts)
- [API T2A v2 MiniMaxAPI](https://platform.minimaxi.com/document/T2A%20V2)
- [API HTTP TTS Volcengine](API/en/providers/volcengine#text-to-speech)
- [Synthèse vocale Xiaomi MiMo](Xiaomi/en/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formats de sortie vocale Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [Synthèse vocale xAI](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## Connexes

- [Aperçu des médias](/fr/tools/media-overview)
- [Génération musicale](/fr/tools/music-generation)
- [Génération vidéo](/fr/tools/video-generation)
- [Commandes slash](/fr/tools/slash-commands)
- [Plugin d'appel vocal](/fr/plugins/voice-call)
