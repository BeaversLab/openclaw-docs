---
summary: "Synthèse vocale (TTS) pour les réponses sortantes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Synthèse vocale"
---

# Synthèse vocale (TTS)

OpenClaw peut convertir les réponses sortantes en audio en utilisant ElevenLabs, OpenAI ou Edge TTS.
Cela fonctionne partout où OpenClaw peut envoyer de l'audio ; Telegram reçoit une bulle de note vocale circulaire.

## Services pris en charge

- **ElevenLabs** (provider principal ou de secours)
- **OpenAI** (provider principal ou de secours ; également utilisé pour les résumés)
- **Edge TTS** (provider principal ou de secours ; utilise `node-edge-tts`, par défaut lorsqu'il n'y a pas de clés API)

### Notes sur Edge TTS

Edge TTS utilise le service TTS neuronal en ligne de Microsoft Edge via la bibliothèque
`node-edge-tts`. C'est un service hébergé (non local), utilise les points de terminaison de Microsoft et ne
nécessite pas de clé API. `node-edge-tts` expose les options de configuration de la parole et
les formats de sortie, mais toutes les options ne sont pas prises en charge par le service Edge. citeturn2search0

Étant donné qu'Edge TTS est un service Web public sans SLA ni quota publié, considérez-le
comme un service au meilleur effort. Si vous avez besoin de limites et d'un support garantis, utilisez OpenAI ou ElevenLabs.
L'API REST Speech de Microsoft documente une limite audio de 10 minutes par requête ; Edge TTS
ne publie pas de limites, supposez donc des limites similaires ou inférieures. citeturn0search3

## Clés facultatives

Si vous souhaitez utiliser OpenAI ou ElevenLabs :

- `ELEVENLABS_API_KEY` (ou `XI_API_KEY`)
- `OPENAI_API_KEY`

Edge TTS n'exige **pas** de clé API. Si aucune clé API n'est trouvée, OpenClaw utilise par défaut
Edge TTS (sauf si désactivé via `messages.tts.edge.enabled=false`).

Si plusieurs providers sont configurés, le provider sélectionné est utilisé en premier et les autres sont des options de secours.
Le résumé automatique utilise le `summaryModel` configuré (ou `agents.defaults.model.primary`),
ce provider doit donc également être authentifié si vous activez les résumés.

## Liens vers les services

- [Guide de synthèse vocale OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Référence de l'API Audio OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [Synthèse vocale ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Authentification ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formats de sortie Speech Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## Est-ce activé par défaut ?

Non. La TTS automatique est **désactivée** par défaut. Activez-la dans la configuration avec
`messages.tts.auto` ou par session avec `/tts always` (alias : `/tts on`).

Edge TTS **est** activé par défaut une fois la TTS activée, et est utilisé automatiquement
lorsqu'aucune clé API OpenAI ou ElevenLabs n'est disponible.

## Configuration

La configuration TTS se trouve sous `messages.tts` dans `openclaw.json`.
Le schéma complet se trouve dans [Configuration Gateway](/fr/gateway/configuration).

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

### Edge TTS principal (pas de clé API)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "edge",
      edge: {
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

### Désactiver Edge TTS

```json5
{
  messages: {
    tts: {
      edge: {
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

### Répondre avec l'audio uniquement après une note vocale entrante

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
  - `inbound` n'envoie de l'audio qu'après une note vocale entrante.
  - `tagged` n'envoie de l'audio que lorsque la réponse inclut des balises `[[tts]]`.
- `enabled` : bascule héritée (doctor migre ceci vers `auto`).
- `mode` : `"final"` (par défaut) ou `"all"` (inclut les réponses tool/block).
- `provider` : `"elevenlabs"`, `"openai"` ou `"edge"` (le secours est automatique).
- Si `provider` n'est pas défini (**unset**), OpenClaw préfère `openai` (si la clé est présente), puis `elevenlabs` (si la clé est présente),
  sinon `edge`.
- `summaryModel` : modèle économique facultatif pour le résumé automatique ; par défaut `agents.defaults.model.primary`.
  - Accepte `provider/model` ou un alias de modèle configuré.
- `modelOverrides` : autoriser le modèle à émettre des directives TTS (activé par défaut).
  - `allowProvider` a pour valeur par défaut `false` (le changement de fournisseur est opt-in).
- `maxTextLength` : limite stricte pour l'entrée TTS (caractères). `/tts audio` échoue si elle est dépassée.
- `timeoutMs` : délai d'expiration de la requête (ms).
- `prefsPath` : remplacer le chemin JSON des préférences locales (fournisseur/limite/résumé).
- Les valeurs `apiKey` reviennent aux variables d'environnement (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.baseUrl` : remplacer l'URL de base de l'API ElevenLabs.
- `openai.baseUrl` : remplacer le point de terminaison TTS OpenAI.
  - Ordre de résolution : `messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Les valeurs non par défaut sont traitées comme des points de terminaison TTS compatibles avec OpenAI, donc les noms de modèle et de voix personnalisés sont acceptés.
- `elevenlabs.voiceSettings` :
  - `stability`, `similarityBoost`, `style` : `0..1`
  - `useSpeakerBoost` : `true|false`
  - `speed` : `0.5..2.0` (1.0 = normal)
- `elevenlabs.applyTextNormalization` : `auto|on|off`
- `elevenlabs.languageCode` : code ISO 639-1 sur 2 lettres (ex. `en`, `de`)
- `elevenlabs.seed` : `0..4294967295` entier (déterminisme au mieux)
- `edge.enabled` : autoriser l'utilisation d'Edge TTS (par défaut `true` ; pas de clé API).
- `edge.voice` : nom de la voix neuronale Edge (ex. `en-US-MichelleNeural`).
- `edge.lang` : code de langue (ex. `en-US`).
- `edge.outputFormat` : format de sortie Edge (ex. `audio-24khz-48kbitrate-mono-mp3`).
  - Consultez les formats de sortie Microsoft Speech pour les valeurs valides ; tous les formats ne sont pas pris en charge par Edge.
- `edge.rate` / `edge.pitch` / `edge.volume` : chaînes de pourcentage (ex. `+10%`, `-5%`).
- `edge.saveSubtitles` : écrire des sous-titres JSON à côté du fichier audio.
- `edge.proxy` : URL du proxy pour les requêtes Edge TTS.
- `edge.timeoutMs` : remplacement du délai de requête (ms).

## Remplacements pilotés par le modèle (activés par défaut)

Par défaut, le modèle **peut** émettre des directives TTS pour une seule réponse.
Lorsque `messages.tts.auto` est `tagged`, ces directives sont requises pour déclencher l'audio.

Lorsqu'il est activé, le modèle peut émettre des directives `[[tts:...]]` pour remplacer la voix
pour une seule réponse, ainsi qu'un bloc `[[tts:text]]...[[/tts:text]]` facultatif pour
fournir des balises expressives (rire, indices de chant, etc.) qui ne doivent apparaître que dans
l'audio.

Les directives `provider=...` sont ignorées sauf si `modelOverrides.allowProvider: true`.

Exemple de payload de réponse :

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Clés de directive disponibles (lorsqu'activé) :

- `provider` (`openai` | `elevenlabs` | `edge`, nécessite `allowProvider: true`)
- `voice` (voix OpenAI) ou `voiceId` (ElevenLabs)
- `model` (model TTS OpenAI ou id de model ElevenLabs)
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

Liste blanche optionnelle (activer le changement de fournisseur tout en gardant les autres paramètres configurables) :

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
- `summarize` (par défaut `true`)

Cela remplace `messages.tts.*` pour cet hôte.

## Formats de sortie (fixes)

- **Telegram** : note vocale Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48kHz / 64kbps est un bon compromis pour les notes vocales et requis pour la bulle ronde.
- **Autres canaux** : MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44.1kHz / 128kbps est l'équilibre par défaut pour la clarté de la parole.
- **Edge TTS** : utilise `edge.outputFormat` (par défaut `audio-24khz-48kbitrate-mono-mp3`).
  - `node-edge-tts` accepte un `outputFormat`, mais tous les formats ne sont pas disponibles
    depuis le service Edge. citeturn2search0
  - Les valeurs de format de sortie suivent les formats de sortie de Microsoft Speech (y compris Ogg/WebM Opus). citeturn1search0
  - Le Telegram `sendVoice` accepte OGG/MP3/M4A ; utilisez OpenAI/ElevenLabs si vous avez besoin
    de notes vocales Opus garanties. citeturn1search1
  - Si le format de sortie Edge configuré échoue, OpenClaw réessaie avec MP3.

Les formats OpenAI/ElevenLabs sont fixes ; OpenAI s'attend à Opus pour l'UX des notes vocales.

## Comportement du TTS automatique

Lorsqu'il est activé, OpenClaw :

- ignore le TTS si la réponse contient déjà des médias ou une directive `MEDIA:`.
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

Il y a une seule commande : `/tts`.
Voir [Slash commands](/fr/tools/slash-commands) pour les détails d'activation.

Note Discord : `/tts` est une commande intégrée Discord, donc OpenClaw enregistre
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
- `commands.text` ou l'enregistrement des commandes natives doit être activé.
- `off|always|inbound|tagged` sont des activateurs par session (`/tts on` est un alias pour `/tts always`).
- `limit` et `summary` sont stockés dans les préférences locales, pas dans la configuration principale.
- `/tts audio` génère une réponse audio ponctuelle (n'active pas le TTS).

## Outil d'agent

L'outil `tts` convertit le texte en parole et renvoie un chemin `MEDIA:`. Lorsque le
résultat est compatible Telegram, l'outil inclut `[[audio_as_voice]]` afin
que Telegram envoie une bulle vocale.

## Gateway RPC

Méthodes Gateway :

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import fr from '/components/footer/fr.mdx';

<fr />
