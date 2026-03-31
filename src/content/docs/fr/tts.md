---
summary: "Synthèse vocale (TTS) pour les réponses sortantes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Synthèse vocale (chemin hérité)"
---

# Synthèse vocale (TTS)

OpenClaw peut convertir les réponses sortantes en audio en utilisant ElevenLabs, Microsoft ou OpenAI.
Cela fonctionne partout où OpenClaw peut envoyer de l'audio.

## Services pris en charge

- **ElevenLabs** (provider principal ou de secours)
- **Microsoft** (fournisseur principal ou de secours ; l'implémentation groupée actuelle utilise `node-edge-tts`)
- **OpenAI** (fournisseur principal ou de secours ; également utilisé pour les résumés)

### Notes sur la synthèse vocale Microsoft

Le fournisseur de synthèse vocale Microsoft groupé utilise actuellement le service TTS
neural en ligne de Microsoft Edge via la bibliothèque `node-edge-tts`. C'est un service hébergé (non
local), qui utilise les points de terminaison Microsoft et ne nécessite pas de clé API.
`node-edge-tts` expose les options de configuration de la voix et les formats de sortie, mais
toutes les options ne sont pas prises en charge par le service. La configuration héritée et la saisie de directive
utilisant `edge` fonctionnent toujours et sont normalisées en `microsoft`.

Comme ce chemin est un service Web public sans SLA publié ni quota,
considérez-le comme « au mieux ». Si vous avez besoin de limites garanties et d'une assistance, utilisez OpenAI
ou ElevenLabs.

## Clés facultatives

Si vous souhaitez utiliser OpenAI ou ElevenLabs :

- `ELEVENLABS_API_KEY` (ou `XI_API_KEY`)
- `OPENAI_API_KEY`

La synthèse vocale Microsoft ne nécessite **pas** de clé API.

Si plusieurs fournisseurs sont configurés, le fournisseur sélectionné est utilisé en premier et les autres servent d'options de secours.
Le résumé automatique utilise le `summaryModel` configuré (ou `agents.defaults.model.primary`),
donc ce fournisseur doit également être authentifié si vous activez les résumés.

## Liens vers les services

- [Guide de synthèse vocale OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API reference](https://platform.openai.com/docs/api-reference/audio)
- [Synthèse vocale ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Authentification ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formats de sortie pour la voix Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## Est-ce activé par défaut ?

Non. Auto‑TTS est **désactivé** par défaut. Activez-le dans la configuration avec
`messages.tts.auto` ou par session avec `/tts always` (alias : `/tts on`).

Lorsque `messages.tts.provider` n'est pas défini, OpenClaw choisit le premier fournisseur
de synthèse vocale configuré dans l'ordre de sélection automatique du registre.

## Configuration

La configuration TTS se trouve sous `messages.tts` dans `openclaw.json`.
Le schéma complet se trouve dans [Gateway configuration](/en/gateway/configuration).

### Configuration minimale (activation + provider)

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

### OpenAI principal avec ElevenLabs en secours

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

### Ne répondre avec de l'audio qu'après un message vocal entrant

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

### Notes sur les champs

- `auto` : mode auto‑TTS (`off`, `always`, `inbound`, `tagged`).
  - `inbound` n'envoie de l'audio qu'après un message vocal entrant.
  - `tagged` n'envoie de l'audio que lorsque la réponse inclut des balises `[[tts]]`.
- `enabled` : bascule héritée (le médecin migre celle-ci vers `auto`).
- `mode` : `"final"` (par défaut) ou `"all"` (inclut les réponses tool/block).
- `provider` : id du fournisseur de synthèse vocale tel que `"elevenlabs"`, `"microsoft"` ou `"openai"` (le repli est automatique).
- Si `provider` n'est pas **défini**, OpenClaw utilise le premier fournisseur de synthèse vocale configuré dans l'ordre de sélection automatique du registre.
- `provider: "edge"` Legacy fonctionne toujours et est normalisé à `microsoft`.
- `summaryModel` : modèle peu coûteux optionnel pour le résumé automatique ; par défaut `agents.defaults.model.primary`.
  - Accepte `provider/model` ou un alias de modèle configuré.
- `modelOverrides` : autoriser le modèle à émettre des directives TTS (activé par défaut).
  - `allowProvider` est défini par défaut sur `false` (le changement de fournisseur est optionnel).
- `providers.<id>` : paramètres appartenant au fournisseur, indexés par l'identifiant du fournisseur de synthèse vocale.
- `maxTextLength` : limite stricte pour l'entrée TTS (caractères). `/tts audio` échoue si elle est dépassée.
- `timeoutMs` : délai d'attente de la requête (ms).
- `prefsPath` : remplacer le chemin JSON des préférences locales (fournisseur/limite/résumé).
- Les valeurs `apiKey` reviennent aux env vars (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `providers.elevenlabs.baseUrl` : remplacer l'URL de base de l'API ElevenLabs.
- `providers.openai.baseUrl` : remplacer le point de terminaison TTS OpenAI.
  - Ordre de résolution : `messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Les valeurs non définies par défaut sont traitées comme des points de terminaison TTS compatibles OpenAI, donc les noms de modèle et de voix personnalisés sont acceptés.
- `providers.elevenlabs.voiceSettings` :
  - `stability`, `similarityBoost`, `style` : `0..1`
  - `useSpeakerBoost` : `true|false`
  - `speed` : `0.5..2.0` (1.0 = normal)
- `providers.elevenlabs.applyTextNormalization` : `auto|on|off`
- `providers.elevenlabs.languageCode` : ISO 639-1 à 2 lettres (p. ex. `en`, `de`)
- `providers.elevenlabs.seed` : entier `0..4294967295` (déterminisme de meilleure qualité)
- `providers.microsoft.enabled` : autoriser l'utilisation de la synthèse vocale Microsoft (par défaut `true` ; sans clé API).
- `providers.microsoft.voice` : nom de la voix neurale Microsoft (par ex. `en-US-MichelleNeural`).
- `providers.microsoft.lang` : code de langue (par ex. `en-US`).
- `providers.microsoft.outputFormat` : Format de sortie Microsoft (p. ex. `audio-24khz-48kbitrate-mono-mp3`).
  - Consultez les formats de sortie Microsoft Speech pour connaître les valeurs valides ; tous les formats ne sont pas pris en charge par le transport Edge fourni.
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume` : chaînes de pourcentage (p. ex. `+10%`, `-5%`).
- `providers.microsoft.saveSubtitles` : écrire des sous-titres JSON à côté du fichier audio.
- `providers.microsoft.proxy` : URL du proxy pour les requêtes vocales Microsoft.
- `providers.microsoft.timeoutMs` : substitution du délai d'expiration de la requête (ms).
- `edge.*` : alias hérité pour les mêmes paramètres Microsoft.

## Remplacements pilotés par le modèle (activés par défaut)

Par défaut, le modèle **peut** émettre des directives TTS pour une seule réponse.
Lorsque `messages.tts.auto` est `tagged`, ces directives sont nécessaires pour déclencher l'audio.

Une fois activé, le modèle peut émettre des directives `[[tts:...]]` pour remplacer la voix
pour une seule réponse, plus un bloc `[[tts:text]]...[[/tts:text]]` facultatif pour
fournir des balises expressives (rire, indices de chant, etc.) qui ne doivent apparaître que dans
l'audio.

`provider=...` directives are ignored unless `modelOverrides.allowProvider: true`.

Exemple de payload de réponse :

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Clés de directive disponibles (lorsqu'activé) :

- `provider` (id de fournisseur de synthèse vocale enregistré, par exemple `openai`, `elevenlabs` ou `microsoft` ; nécessite `allowProvider: true`)
- `voice` (voix OpenAI) ou `voiceId` (ElevenLabs)
- `model` (modèle TTS OpenAI ou id de modèle ElevenLabs)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
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

Liste d'autorisation facultative (activer le changement de provider tout en gardant d'autres options configurables) :

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

Les commandes slash écrivent des substitutions locales dans `prefsPath` (par défaut : `~/.openclaw/settings/tts.json`, remplacer par `OPENCLAW_TTS_PREFS` ou `messages.tts.prefsPath`).

Champs stockés :

- `enabled`
- `provider`
- `maxLength` (seuil de résumé ; 1500 caractères par défaut)
- `summarize` (par défaut `true`)

Ces paramètres remplacent `messages.tts.*` pour cet hôte.

## Formats de sortie (fixes)

- **Feishu / Matrix / Telegram / WhatsApp** : message vocal Opus (`opus_48000_64` depuis ElevenLabs, `opus` depuis OpenAI).
  - 48 kHz / 64 kbps est un bon compromis pour les messages vocaux.
- **Autres canaux** : MP3 (`mp3_44100_128` depuis ElevenLabs, `mp3` depuis OpenAI).
  - 44,1 kHz / 128 kbps est l'équilibre par défaut pour la clarté de la parole.
- **Microsoft** : utilise `microsoft.outputFormat` (par défaut `audio-24khz-48kbitrate-mono-mp3`).
  - Le transport intégré accepte un `outputFormat`, mais tous les formats ne sont pas disponibles auprès du service.
  - Les valeurs du format de sortie suivent les formats de sortie de Microsoft Speech (y compris Ogg/WebM Opus).
  - Telegram `sendVoice` accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin de messages vocaux Opus garantis.
  - Si le format de sortie Microsoft configuré échoue, OpenClaw réessaie avec MP3.

Les formats de sortie OpenAI/ElevenLabs sont fixes par channel (voir ci-dessus).

## Comportement de la synthèse vocale automatique

Une fois activé, OpenClaw :

- ignore le TTS si la réponse contient déjà un média ou une directive `MEDIA:`.
- ignore les réponses très courtes (< 10 caractères).
- résume les longues réponses lorsqu'il est activé en utilisant `agents.defaults.model.primary` (ou `summaryModel`).
- joint l'audio généré à la réponse.

Si la réponse dépasse `maxLength` et que le résumé est désactivé (ou qu'il n'y a pas de clé API pour le
modèle de résumé), l'audio
est ignoré et la réponse textuelle normale est envoyée.

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
Voir [Slash commands](/en/tools/slash-commands) pour les détails d'activation.

Remarque Discord : `/tts` est une commande native de Discord. Par conséquent, OpenClaw enregistre
`/voice` en tant que commande native. Le texte `/tts ...` fonctionne toujours.

```
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

Remarques :

- Les commandes nécessitent un expéditeur autorisé (les règles de liste blanche/propriétaire s'appliquent toujours).
- `commands.text` ou l'enregistrement des commandes natives doit être activé.
- `off|always|inbound|tagged` sont des bascules par session (`/tts on` est un alias pour `/tts always`).
- `limit` et `summary` sont stockés dans les préférences locales, pas dans la configuration principale.
- `/tts audio` génère une réponse audio unique (n'active pas la synthèse vocale).

## Outil d'agent

L'outil `tts` convertit le texte en parole et renvoie une pièce jointe audio pour
la livraison de la réponse. Lorsque le channel est Feishu, Matrix, Telegram ou WhatsApp,
l'audio est livré sous la forme d'un message vocal plutôt que d'une pièce jointe de fichier.

## Gateway RPC

Méthodes Gateway :

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
