---
summary: "Synthèse vocale (TTS) pour les réponses sortantes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Synthèse vocale"
---

# Synthèse vocale (TTS)

OpenClaw peut convertir les réponses sortantes en audio via ElevenLabs, Microsoft, MiniMax ou OpenAI.
Cela fonctionne partout où OpenClaw peut envoyer de l'audio.

## Services pris en charge

- **ElevenLabs** (provider principal ou de secours)
- **Microsoft** (provider principal ou de secours ; l'implémentation groupée actuelle utilise `node-edge-tts`)
- **MiniMax** (provider principal ou de secours ; utilise l'API T2A v2)
- **OpenAI** (provider principal ou de secours ; également utilisé pour les résumés)

### Notes sur la voix Microsoft

Le provider de voix Microsoft inclus utilise actuellement le service TTS neuronal en ligne de Microsoft Edge
via la bibliothèque `node-edge-tts`. C'est un service hébergé (non
local), qui utilise les points de terminaison Microsoft et ne nécessite pas de clé API.
`node-edge-tts` expose des options de configuration vocale et des formats de sortie, mais
toutes les options ne sont pas prises en charge par le service. La configuration héritée et les entrées de directive
utilisant `edge` fonctionnent toujours et sont normalisées en `microsoft`.

Ce chemin étant un service Web public sans SLA ni quota publié,
considérez-le comme un effort au mieux. Si vous avez besoin de limites et d'un support garantis, utilisez OpenAI
ou ElevenLabs.

## Clés facultatives

Si vous souhaitez utiliser OpenAI, ElevenLabs ou MiniMax :

- `ELEVENLABS_API_KEY` (ou `XI_API_KEY`)
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`

La voix Microsoft ne nécessite **pas** de clé API.

Si plusieurs providers sont configurés, le provider sélectionné est utilisé en premier et les autres servent d'options de secours.
Le résumé automatique utilise le `summaryModel` configuré (ou `agents.defaults.model.primary`),
c'est pourquoi ce provider doit également être authentifié si vous activez les résumés.

## Liens vers les services

- [Guide de synthèse vocale OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Référence de l'OpenAI audio API](https://platform.openai.com/docs/api-reference/audio)
- [Synthèse vocale ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Authentification ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formats de sortie Speech Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## Est-ce activé par défaut ?

Non. La synthèse vocale automatique (Auto‑TTS) est désactivée (**off**) par défaut. Activez-la dans la configuration avec
`messages.tts.auto` ou localement avec `/tts on`.

Lorsque `messages.tts.provider` n'est pas défini, OpenClaw choisit le premier
fournisseur de synthèse vocale configuré selon l'ordre de sélection automatique du registre.

## Configuration

La configuration TTS se trouve sous `messages.tts` dans `openclaw.json`.
Le schéma complet se trouve dans [Configuration de la Gateway](/en/gateway/configuration).

### Configuration minimale (activation + fournisseur)

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

### OpenAI principal avec basculement vers ElevenLabs

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true,
      },
      providers: {
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
      },
    },
  },
}
```

### Microsoft principal (pas de clé API)

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
          rate: "+10%",
          pitch: "-5%",
        },
      },
    },
  },
}
```

### MiniMax principal

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "minimax_api_key",
          baseUrl: "https://api.minimax.io",
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

### Désactiver la synthèse vocale Microsoft

```json5
{
  messages: {
    tts: {
      providers: {
        microsoft: {
          enabled: false,
        },
      },
    },
  },
}
```

### Limites personnalisées + chemin des préférences

```json5
{
  messages: {
    tts: {
      auto: "always",
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
    },
  },
}
```

### Répondre avec de l'audio uniquement après un message vocal entrant

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### Désactiver le résumé automatique pour les réponses longues

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

Exécutez ensuite :

```
/tts summary off
```

### Remarques sur les champs

- `auto` : mode de synthèse vocale automatique (`off`, `always`, `inbound`, `tagged`).
  - `inbound` n'envoie de l'audio qu'après réception d'un message vocal entrant.
  - `tagged` n'envoie de l'audio que lorsque la réponse inclut des directives `[[tts:key=value]]` ou un bloc `[[tts:text]]...[[/tts:text]]`.
- `enabled` : bascule héritée (le médecin migre cela vers `auto`).
- `mode` : `"final"` (par défaut) ou `"all"` (inclut les réponses outil/bloc).
- `provider` : id du fournisseur de synthèse vocale tel que `"elevenlabs"`, `"microsoft"`, `"minimax"` ou `"openai"` (le basculement est automatique).
- Si `provider` est **non défini**, OpenClaw utilise le premier fournisseur de synthèse vocale configuré dans l'ordre de sélection automatique du registre.
- L'ancien `provider: "edge"` fonctionne toujours et est normalisé vers `microsoft`.
- `summaryModel` : modèle économique facultatif pour le résumé automatique ; par défaut `agents.defaults.model.primary`.
  - Accepte `provider/model` ou un alias de modèle configuré.
- `modelOverrides` : autoriser le modèle à émettre des directives de synthèse vocale (activé par défaut).
  - `allowProvider` par défaut `false` (le changement de fournisseur est opt-in).
- `providers.<id>` : paramètres propres au fournisseur, indexés par l'ID du fournisseur de synthèse vocale.
- Les blocs de fournisseurs directs hérités (`messages.tts.openai`, `messages.tts.elevenlabs`, `messages.tts.microsoft`, `messages.tts.edge`) sont automatiquement migrés vers `messages.tts.providers.<id>` au chargement.
- `maxTextLength` : limite stricte pour l'entrée TTS (caractères). `/tts audio` échoue si elle est dépassée.
- `timeoutMs` : délai d'expiration de la requête (ms).
- `prefsPath` : remplacer le chemin du fichier JSON des préférences locales (fournisseur/limite/résumé).
- Les valeurs `apiKey` reviennent par défaut aux variables d'environnement (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `MINIMAX_API_KEY`, `OPENAI_API_KEY`).
- `providers.elevenlabs.baseUrl` : remplacer l'URL de base de l'API ElevenLabs.
- `providers.openai.baseUrl` : remplacer le point de terminaison TTS OpenAI.
  - Ordre de résolution : `messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Les valeurs non par défaut sont traitées comme des points de terminaison TTS compatibles OpenAI, les noms de modèle et de voix personnalisés sont donc acceptés.
- `providers.elevenlabs.voiceSettings` :
  - `stability`, `similarityBoost`, `style` : `0..1`
  - `useSpeakerBoost` : `true|false`
  - `speed` : `0.5..2.0` (1.0 = normal)
- `providers.elevenlabs.applyTextNormalization` : `auto|on|off`
- `providers.elevenlabs.languageCode` : code ISO 639-1 sur 2 lettres (ex. `en`, `de`)
- `providers.elevenlabs.seed` : `0..4294967295` entier (déterminisme de meilleur effort)
- `providers.minimax.baseUrl` : remplacer l'URL de base de l'API MiniMax (par défaut `https://api.minimax.io`, env : `MINIMAX_API_HOST`).
- `providers.minimax.model` : modèle TTS (par défaut `speech-2.8-hd`, env : `MINIMAX_TTS_MODEL`).
- `providers.minimax.voiceId` : identifiant de voix (par défaut `English_expressive_narrator`, env : `MINIMAX_TTS_VOICE_ID`).
- `providers.minimax.speed` : vitesse de lecture `0.5..2.0` (par défaut 1.0).
- `providers.minimax.vol` : volume `(0, 10]` (par défaut 1.0 ; doit être supérieur à 0).
- `providers.minimax.pitch` : modification de la tonalité `-12..12` (par défaut 0).
- `providers.microsoft.enabled` : autoriser l'utilisation de la synthèse vocale Microsoft (par défaut `true` ; aucune clé API).
- `providers.microsoft.voice` : nom de la voix neurale Microsoft (ex. `en-US-MichelleNeural`).
- `providers.microsoft.lang` : code de langue (ex. `en-US`).
- `providers.microsoft.outputFormat` : format de sortie Microsoft (ex. `audio-24khz-48kbitrate-mono-mp3`).
  - Consultez les formats de sortie de Microsoft Speech pour les valeurs valides ; tous les formats ne sont pas pris en charge par le transport Edge fourni.
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume` : chaînes de pourcentage (ex. `+10%`, `-5%`).
- `providers.microsoft.saveSubtitles` : écrire des sous-titres JSON à côté du fichier audio.
- `providers.microsoft.proxy` : URL du proxy pour les requêtes de synthèse vocale Microsoft.
- `providers.microsoft.timeoutMs` : remplacement du délai d'expiration de la requête (ms).
- `edge.*` : alias hérité pour les mêmes paramètres Microsoft.

## Remplacements pilotés par le modèle (activés par défaut)

Par défaut, le modèle **peut** émettre des directives TTS pour une seule réponse.
Lorsque `messages.tts.auto` est `tagged`, ces directives sont requises pour déclencher l'audio.

Lorsqu'il est activé, le modèle peut émettre des directives `[[tts:...]]` pour remplacer la voix
pour une seule réponse, ainsi qu'un bloc `[[tts:text]]...[[/tts:text]]` optionnel pour
fournir des balises expressives (rire, indices de chant, etc.) qui ne doivent apparaître que dans
l'audio.

Les directives `provider=...` sont ignorées sauf si `modelOverrides.allowProvider: true`.

Exemple de payload de réponse :

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Clés de directive disponibles (lorsqu'activées) :

- `provider` (id de fournisseur de parole enregistré, par exemple `openai`, `elevenlabs`, `minimax` ou `microsoft` ; nécessite `allowProvider: true`)
- `voice` (voix OpenAI) ou `voiceId` (ElevenLabs / MiniMax)
- `model` (modèle TTS OpenAI, id de modèle ElevenLabs ou modèle MiniMax)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (volume MiniMax, 0-10)
- `pitch` (hauteur MiniMax, -12 à 12)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

Désactiver toutes les substitutions de modèle :

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: false,
      },
    },
  },
}
```

Liste blanche facultative (permettre le changement de fournisseur tout en gardant les autres paramètres configurables) :

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: true,
        allowSeed: false,
      },
    },
  },
}
```

## Préférences par utilisateur

Les commandes slash écrivent des substitutions locales dans `prefsPath` (par défaut :
`~/.openclaw/settings/tts.json`, remplacer par `OPENCLAW_TTS_PREFS` ou
`messages.tts.prefsPath`).

Champs stockés :

- `enabled`
- `provider`
- `maxLength` (seuil de résumé ; 1500 caractères par défaut)
- `summarize` (`true` par défaut)

Cela remplace `messages.tts.*` pour cet hôte.

## Formats de sortie (fixes)

- **Feishu / Matrix / Telegram / WhatsApp** : message vocal Opus (`opus_48000_64` depuis ElevenLabs, `opus` depuis OpenAI).
  - 48kHz / 64kbps est un bon compromis pour les messages vocaux.
- **Autres canaux** : MP3 (`mp3_44100_128` depuis ElevenLabs, `mp3` depuis OpenAI).
  - 44,1kHz / 128kbps est l'équilibre par défaut pour la clarté de la parole.
- **MiniMax** : MP3 (modèle `speech-2.8-hd`, taux d'échantillonnage 32kHz). Le format de note vocale n'est pas pris en charge nativement ; utilisez OpenAI ou ElevenLabs pour garantir les messages vocaux Opus.
- **Microsoft** : utilise `microsoft.outputFormat` (par défaut `audio-24khz-48kbitrate-mono-mp3`).
  - Le transport inclus accepte un `outputFormat`, mais tous les formats ne sont pas disponibles depuis le service.
  - Les valeurs de format de sortie suivent les formats de sortie Microsoft Speech (y compris Ogg/WebM Opus).
  - Telegram `sendVoice` accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin de messages vocaux Opus garantis.
  - Si le format de sortie Microsoft configuré échoue, OpenClaw réessaie avec MP3.

Les formats de sortie OpenAI/ElevenLabs sont fixes par canal (voir ci-dessus).

## Comportement de TTS automatique

Lorsqu'il est activé, OpenClaw :

- ignore le TTS si la réponse contient déjà un média ou une directive `MEDIA:`.
- ignore les réponses très courtes (< 10 caractères).
- résume les réponses longues lorsqu'il est activé en utilisant `agents.defaults.model.primary` (ou `summaryModel`).
- joint l'audio généré à la réponse.

Si la réponse dépasse `maxLength` et que le résumé est désactivé (ou qu'il n'y a pas de clé API pour le modèle de résumé), l'audio est ignoré et la réponse textuelle normale est envoyée.

## Diagramme de flux

```
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize (summaryModel or agents.defaults.model.primary)
                                      -> TTS -> attach audio
```

## Utilisation des commandes slash

Il existe une seule commande : `/tts`.
Voir [Commandes slash](/en/tools/slash-commands) pour les détails d'activation.

Note Discord : `/tts` est une commande intégrée de Discord, donc OpenClaw enregistre `/voice` comme commande native. Le texte `/tts ...` fonctionne toujours.

```
/tts off
/tts on
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

Notes :

- Les commandes nécessitent un expéditeur autorisé (les règles de liste blanche/propriétaire s'appliquent toujours).
- `commands.text` ou l'enregistrement des commandes natives doit être activé.
- La config `messages.tts.auto` accepte `off|always|inbound|tagged`.
- `/tts on` écrit la préférence TTS locale dans `always` ; `/tts off` l'écrit dans `off`.
- Utilisez la configuration lorsque vous souhaitez définir des valeurs par défaut `inbound` ou `tagged`.
- `limit` et `summary` sont stockés dans les préférences locales, pas dans la configuration principale.
- `/tts audio` génère une réponse audio ponctuelle (n'active pas le TTS).
- `/tts status` inclut la visibilité du repli pour la dernière tentative :
  - succès du repli : `Fallback: <primary> -> <used>` plus `Attempts: ...`
  - échec : `Error: ...` plus `Attempts: ...`
  - diagnostics détaillés : `Attempt details: provider:outcome(reasonCode) latency`
- Les échecs de l'OpenAI API et d'ElevenLabs incluent désormais les détails de l'erreur du fournisseur analysés et l'ID de requête (lorsqu'ils sont renvoyés par le fournisseur), ce qui est affiché dans les erreurs/journaux TTS.

## Outil d'agent

L'outil `tts` convertit le texte en parole et renvoie une pièce jointe audio pour
la livraison de la réponse. Lorsque le canal est Feishu, Matrix, Telegram ou WhatsApp,
l'audio est livré sous forme de message vocal plutôt que de fichier joint.

## Gateway RPC

Méthodes Gateway :

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
