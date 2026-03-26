---
summary: "Synthèse vocale (TTS) pour les réponses sortantes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Synthèse vocale"
---

# Synthèse vocale (TTS)

OpenClaw peut convertir les réponses sortantes en audio via ElevenLabs, Microsoft ou OpenAI.
Cela fonctionne partout où OpenClaw peut envoyer de l'audio ; Telegram reçoit une bulle de note vocale ronde.

## Services pris en charge

- **ElevenLabs** (provider principal ou de secours)
- **Microsoft** (provider principal ou de secours ; l'implémentation groupée actuelle utilise `node-edge-tts`, par défaut sans clé API)
- **OpenAI** (provider principal ou de secours ; également utilisé pour les résumés)

### Notes sur la synthèse vocale Microsoft

Le provider de synthèse vocale Microsoft groupé utilise actuellement le service
neural TTS en ligne de Microsoft Edge via la bibliothèque `node-edge-tts`. C'est un service hébergé (non
local), qui utilise les points de terminaison Microsoft et ne nécessite pas de clé API.
`node-edge-tts` expose les options de configuration vocale et les formats de sortie, mais
toutes les options ne sont pas prises en charge par le service. La configuration héritée et les entrées de directive
utilisant `edge` fonctionnent toujours et sont normalisées en `microsoft`.

Étant donné que ce chemin est un service Web public sans SLA ni quota publiés,
considérez-le comme étant au mieux effort. Si vous avez besoin de limites garanties et d'une assistance, utilisez OpenAI
ou ElevenLabs.

## Clés facultatives

Si vous souhaitez utiliser OpenAI ou ElevenLabs :

- `ELEVENLABS_API_KEY` (ou `XI_API_KEY`)
- `OPENAI_API_KEY`

La synthèse vocale Microsoft n'exige **pas** de clé API. Si aucune clé API n'est trouvée,
OpenClaw utilise Microsoft par défaut (sauf si désactivé via
`messages.tts.microsoft.enabled=false` ou `messages.tts.edge.enabled=false`).

Si plusieurs providers sont configurés, le provider sélectionné est utilisé en premier et les autres sont des options de secours.
Le résumé automatique utilise le `summaryModel` configuré (ou `agents.defaults.model.primary`),
car ce provider doit également être authentifié si vous activez les résumés.

## Liens vers les services

- [Guide de synthèse vocale OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Référence de l'OpenAI Audio API](https://platform.openai.com/docs/api-reference/audio)
- [Synthèse vocale ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Authentification ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formats de sortie Microsoft Speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## Est-ce activé par défaut ?

Non. Le TTS automatique est **désactivé** par défaut. Activez-le dans la configuration avec `messages.tts.auto` ou par session avec `/tts always` (alias : `/tts on`).

La synthèse vocale Microsoft **est** activée par défaut une fois le TTS activé, et est utilisée automatiquement lorsque aucune clé OpenAI ou ElevenLabs API n'est disponible.

## Configuration

La configuration TTS se trouve sous `messages.tts` dans `openclaw.json`.
Le schéma complet est dans [Gateway configuration](/fr/gateway/configuration).

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
}
```

### Microsoft principal (pas de clé API)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
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
}
```

### Désactiver la synthèse vocale Microsoft

```json5
{
  messages: {
    tts: {
      microsoft: {
        enabled: false,
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

### Répondre avec de l'audio uniquement après une note vocale entrante

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

- `auto` : mode TTS automatique (`off`, `always`, `inbound`, `tagged`).
  - `inbound` envoie de l'audio uniquement après une note vocale entrante.
  - `tagged` envoie de l'audio uniquement lorsque la réponse inclut des balises `[[tts]]`.
- `enabled` : interrupteur hérité (doctor le migre vers `auto`).
- `mode` : `"final"` (par défaut) ou `"all"` (inclut les réponses tool/block).
- `provider` : id du provider de synthèse vocale tel que `"elevenlabs"`, `"microsoft"`, ou `"openai"` (le secours est automatique).
- Si `provider` est **non défini**, OpenClaw préfère `openai` (si clé), puis `elevenlabs` (si clé),
  sinon `microsoft`.
- L'ancien `provider: "edge"` fonctionne toujours et est normalisé vers `microsoft`.
- `summaryModel` : modèle économique optionnel pour le résumé automatique ; par défaut `agents.defaults.model.primary`.
  - Accepte `provider/model` ou un alias de modèle configuré.
- `modelOverrides` : autoriser le modèle à émettre des directives TTS (activé par défaut).
  - `allowProvider` par défaut à `false` (le changement de fournisseur est opt-in).
- `maxTextLength` : limite stricte pour l'entrée TTS (caractères). `/tts audio` échoue si dépassé.
- `timeoutMs` : délai d'expiration de la requête (ms).
- `prefsPath` : remplacer le chemin JSON des préférences locales (fournisseur/limite/résumé).
- Les valeurs `apiKey` reviennent aux variables d'environnement (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.baseUrl` : remplacer l'URL de base de l'API ElevenLabs.
- `openai.baseUrl` : remplacer le point de terminaison TTS OpenAI.
  - Ordre de résolution : `messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Les valeurs non par défaut sont traitées comme des points de terminaison TTS compatibles OpenAI, donc les noms de modèle et de voix personnalisés sont acceptés.
- `elevenlabs.voiceSettings` :
  - `stability`, `similarityBoost`, `style` : `0..1`
  - `useSpeakerBoost` : `true|false`
  - `speed` : `0.5..2.0` (1.0 = normal)
- `elevenlabs.applyTextNormalization` : `auto|on|off`
- `elevenlabs.languageCode` : ISO 639-1 à 2 lettres (ex. `en`, `de`)
- `elevenlabs.seed` : entier `0..4294967295` (déterminisme au mieux)
- `microsoft.enabled` : autoriser l'utilisation de la synthèse vocale Microsoft (par défaut `true` ; pas de clé API).
- `microsoft.voice` : nom de la voix neurale Microsoft (ex. `en-US-MichelleNeural`).
- `microsoft.lang` : code de langue (ex. `en-US`).
- `microsoft.outputFormat` : format de sortie Microsoft (ex. `audio-24khz-48kbitrate-mono-mp3`).
  - Consultez les formats de sortie Microsoft Speech pour les valeurs valides ; tous les formats ne sont pas pris en charge par le transport Edge inclus.
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume` : chaînes de pourcentage (par ex. `+10%`, `-5%`).
- `microsoft.saveSubtitles` : écrire les sous-titres JSON alongside le fichier audio.
- `microsoft.proxy` : URL de proxy pour les requêtes Microsoft Speech.
- `microsoft.timeoutMs` : remplacement du délai de requête (ms).
- `edge.*` : ancien alias pour les mêmes paramètres Microsoft.

## Remplacements pilotés par le model (activés par défaut)

Par défaut, le model **peut** émettre des directives TTS pour une seule réponse.
Lorsque `messages.tts.auto` est `tagged`, ces directives sont requises pour déclencher l'audio.

Lorsqu'elles sont activées, le model peut émettre des directives `[[tts:...]]` pour remplacer la voix
pour une seule réponse, ainsi qu'un bloc `[[tts:text]]...[[/tts:text]]` optionnel pour
fournir des balises expressives (rire, indices de chant, etc.) qui ne doivent apparaître que dans
l'audio.

Les directives `provider=...` sont ignorées sauf si `modelOverrides.allowProvider: true`.

Exemple de charge utile de réponse :

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Clés de directive disponibles (lorsqu'activées) :

- `provider` (id de provider de parole enregistré, par exemple `openai`, `elevenlabs`, ou `microsoft` ; nécessite `allowProvider: true`)
- `voice` (voix OpenAI) ou `voiceId` (ElevenLabs)
- `model` (model TTS OpenAI ou id de model ElevenLabs)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

Désactiver tous les remplacements de model :

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

Liste blanche optionnelle (permettre le changement de provider tout en gardant les autres paramètres configurables) :

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

Les commandes slash écrivent des substitutions locales dans `prefsPath` (par défaut : `~/.openclaw/settings/tts.json`, substituable avec `OPENCLAW_TTS_PREFS` ou `messages.tts.prefsPath`).

Champs stockés :

- `enabled`
- `provider`
- `maxLength` (seuil de résumé ; 1500 caractères par défaut)
- `summarize` (`true` par défaut)

Ces champs remplacent `messages.tts.*` pour cet hôte.

## Formats de sortie (fixes)

- **Telegram** : message vocal Opus (`opus_48000_64` depuis ElevenLabs, `opus` depuis OpenAI).
  - 48 kHz / 64 kbps est un bon compromis pour les messages vocaux et est requis pour la bulle ronde.
- **Autres canaux** : MP3 (`mp3_44100_128` depuis ElevenLabs, `mp3` depuis OpenAI).
  - 44,1 kHz / 128 kbps est l'équilibre par défaut pour la clarté de la parole.
- **Microsoft** : utilise `microsoft.outputFormat` (défaut `audio-24khz-48kbitrate-mono-mp3`).
  - Le transport groupé accepte un `outputFormat`, mais tous les formats ne sont pas disponibles depuis le service.
  - Les valeurs du format de sortie suivent les formats de sortie Microsoft Speech (y compris Ogg/WebM Opus).
  - Telegram `sendVoice` accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin
    de notes vocales Opus garanties. citeturn1search1
  - Si le format de sortie Microsoft configuré échoue, OpenClaw réessaie avec MP3.

Les formats OpenAI/ElevenLabs sont fixes ; Telegram attend Opus pour l'expérience utilisateur des notes vocales.

## Comportement de la synthèse vocale automatique

Lorsqu'elle est activée, OpenClaw :

- ignore la synthèse vocale si la réponse contient déjà un média ou une directive `MEDIA:`.
- ignore les réponses très courtes (< 10 caractères).
- résume les longues réponses lorsque activé en utilisant `agents.defaults.model.primary` (ou `summaryModel`).
- joint l'audio généré à la réponse.

Si la réponse dépasse `maxLength` et que le résumé est désactivé (ou qu'il n'y a pas de clé API pour le
model de résumé), l'audio
est ignoré et la réponse texte normale est envoyée.

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
Voir [Slash commands](/fr/tools/slash-commands) pour les détails d'activation.

Note Discord : `/tts` est une commande intégrée de Discord, donc Discord enregistre
`/voice` comme la commande native. Le texte `/tts ...` fonctionne toujours.

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

Notes :

- Les commandes nécessitent un expéditeur autorisé (les règles de liste blanche/propriétaire s'appliquent toujours).
- `commands.text` ou l'enregistrement de la commande native doit être activé.
- `off|always|inbound|tagged` sont des interrupteurs par session (`/tts on` est un alias pour `/tts always`).
- `limit` et `summary` sont stockés dans les préférences locales, et non dans la configuration principale.
- `/tts audio` génère une réponse audio unique (n'active pas la synthèse vocale).

## Outil de l'agent

L'outil `tts` convertit le texte en parole et renvoie un chemin `MEDIA:`. Lorsque le
résultat est compatible avec Telegram, l'outil inclut `[[audio_as_voice]]` afin que
Telegram envoie une bulle vocale.

## Gateway RPC

Méthodes Gateway :

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import fr from "/components/footer/fr.mdx";

<fr />
