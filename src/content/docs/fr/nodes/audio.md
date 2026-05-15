---
summary: "Comment les notes audio/voix entrantes sont téléchargées, transcrites et injectées dans les réponses"
read_when:
  - Changing audio transcription or media handling
title: "Audio et notes vocales"
---

## Ce qui fonctionne

- **Compréhension des médias (audio)** : Si la compréhension audio est activée (ou détectée automatiquement), OpenClaw :
  1. Localise la première pièce jointe audio (chemin local ou URL) et la télécharge si nécessaire.
  2. Applique `maxBytes` avant d'envoyer à chaque entrée de model.
  3. Exécute la première entrée de model éligible dans l'ordre (provider ou CLI).
  4. En cas d'échec ou d'ignorance (taille/timeout), il essaie l'entrée suivante.
  5. En cas de succès, il remplace `Body` par un bloc `[Audio]` et définit `{{Transcript}}`.
- **Analyse des commandes** : Lorsque la transcription réussit, `CommandBody`/`RawBody` sont définis sur la transcription pour que les commandes slash fonctionnent toujours.
- **Journalisation détaillée** : Dans `--verbose`, nous consignons le moment où la transcription s'exécute et le moment où elle remplace le corps.

## Détection automatique (par défaut)

Si vous **ne configurez pas de models** et que `tools.media.audio.enabled` n'est **pas** défini sur `false`,
OpenClaw détecte automatiquement dans cet ordre et s'arrête à la première option fonctionnelle :

1. **Model de réponse actif** lorsque son provider prend en charge la compréhension audio.
2. **CLIs locales** (si installées)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/jointeur/jetons)
   - `whisper-cli` (depuis `whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le tiny model groupé)
   - `whisper` (Python CLI ; télécharge les models automatiquement)
3. **Gemini CLI** (`gemini`) utilisant `read_many_files`
4. **Auth provider**
   - Les entrées `models.providers.*` configurées prenant en charge l'audio sont essayées en premier
   - Ordre de repli groupé : OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

Pour désactiver la détection automatique, définissez `tools.media.audio.enabled: false`.
Pour personnaliser, définissez `tools.media.audio.models`macOSLinuxWindowsCLI.
Remarque : La détection binaire est effectuée au mieux sur macOS/Linux/Windows ; assurez-vous que le CLI est sur `PATH` (nous développons `~`CLI), ou définissez un model CLI explicite avec un chemin de commande complet.

## Exemples de configuration

### Provider + CLI de secours (OpenAI + Whisper CLI)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### Provider uniquement avec gestion de la portée

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### Provider uniquement (Deepgram)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### Provider uniquement (Mistral Voxtral)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### Provider uniquement (SenseAudio)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### Écho de la transcription vers le chat (optionnel)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // default is false
        echoFormat: '📝 "{transcript}"', // optional, supports {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## Notes et limites

- L'authentification du provider suit l'ordre standard d'authentification de model (profils d'authentification, env vars, `models.providers.*.apiKey`).
- Détails de la configuration de Groq : [Groq](/fr/providers/groq).
- Deepgram prend Deepgram`DEEPGRAM_API_KEY` lorsque `provider: "deepgram"` est utilisé.
- Détails de la configuration de Deepgram : [Deepgram (transcription audio)](DeepgramDeepgram/en/providers/deepgram).
- Détails de la configuration de Mistral : [Mistral](/fr/providers/mistral).
- SenseAudio prend `SENSEAUDIO_API_KEY` lorsque `provider: "senseaudio"` est utilisé.
- Détails de la configuration de SenseAudio : [SenseAudio](/fr/providers/senseaudio).
- Les providers audio peuvent remplacer `baseUrl`, `headers` et `providerOptions` via `tools.media.audio`.
- La limite de taille par défaut est de 20 Mo (`tools.media.audio.maxBytes`). Les fichiers audio trop volumineux sont ignorés pour ce model et l'entrée suivante est essayée.
- Les fichiers audio minuscules/vides de moins de 1024 octets sont ignorés avant la transcription par le provider/CLI.
- Le `maxChars` par défaut pour l'audio est **non défini** (transcription complète). Définissez `tools.media.audio.maxChars` ou un `maxChars` par entrée pour réduire la sortie.
- La valeur par défaut automatique d'OpenAI est OpenAI`gpt-4o-mini-transcribe` ; définissez `model: "gpt-4o-transcribe"` pour une plus grande précision.
- Utilisez `tools.media.audio.attachments` pour traiter plusieurs notes vocales (`mode: "all"` + `maxAttachments`).
- La transcription est disponible pour les modèles sous la forme `{{Transcript}}`.
- `tools.media.audio.echoTranscript` est désactivé par défaut ; activez-le pour renvoyer la confirmation de la transcription au chat d'origine avant le traitement par l'agent.
- `tools.media.audio.echoFormat` personnalise le texte d'écho (espace réservé : `{transcript}`).
- Le stdout de la CLI est limité (5 Mo) ; gardez la sortie de la CLI concise.
- La CLI `args` doit utiliser `{{MediaPath}}` pour le chemin du fichier audio local. Exécutez `openclaw doctor --fix` pour migrer les espaces réservés `{input}` obsolètes des anciennes configurations `audio.transcription.command`.

### Prise en charge de l'environnement proxy

La transcription audio basée sur un fournisseur respecte les variables d'environnement de proxy sortant standard :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

Si aucune variable d'environnement de proxy n'est définie, un accès direct sortant est utilisé. Si la configuration du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération directe.

## Détection des mentions dans les groupes

Lorsque `requireMention: true` est défini pour un chat de groupe, OpenClaw transcrit désormais l'audio **avant** de vérifier les mentions. Cela permet de traiter les notes vocales même lorsqu'elles contiennent des mentions.

**Fonctionnement :**

1. Si un message vocal n'a pas de corps de texte et que le groupe nécessite des mentions, OpenClaw effectue une transcription « préliminaire ».
2. La transcription est vérifiée pour les motifs de mention (par exemple, `@BotName`, déclencheurs d'emoji).
3. Si une mention est trouvée, le message passe par le pipeline complet de réponse.
4. La transcription est utilisée pour la détection des mentions afin que les notes vocales puissent franchir la barrière des mentions.

**Comportement de secours :**

- Si la transcription échoue pendant la phase préliminaire (délai d'attente, erreur API, etc.), le message est traité sur la base de la détection de mentions par texte uniquement.
- Cela garantit que les messages mixtes (texte + audio) ne sont jamais incorrectement ignorés.

**Désactivation par groupe/sujet Telegram :**

- Définissez `channels.telegram.groups.<chatId>.disableAudioPreflight: true` pour ignorer les vérifications de mention de transcription préliminaire pour ce groupe.
- Définissez `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` pour remplacer par sujet (`true` pour ignorer, `false` pour forcer l'activation).
- La valeur par défaut est `false` (préparation activée lorsque les conditions de mention correspondantes sont remplies).

**Exemple :** Un utilisateur envoie une note vocale disant "Hey @Claude, quelle est la météo ?" dans un groupe Telegram avec `requireMention: true`. La note vocale est transcrite, la mention est détectée et l'agent répond.

## Pièges

- Les règles de portée utilisent le premier correspondant gagne. `chatType` est normalisé à `direct`, `group` ou `room`.
- Assurez-vous que votre CLI renvoie 0 et imprime du texte brut ; JSON doit être traité via `jq -r .text`.
- Pour `parakeet-mlx`, si vous passez `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque `--output-format` est `txt` (ou omis) ; les formats de sortie non `txt` reviennent à l'analyse stdout.
- Gardez les délais d'attente raisonnables (`timeoutSeconds`, par défaut 60 s) pour éviter de bloquer la file de réponse.
- La transcription préliminaire traite uniquement la **première** pièce jointe audio pour la détection de mention. L'audio supplémentaire est traité lors de la phase principale de compréhension des médias.

## Connexes

- [Compréhension des médias](/fr/nodes/media-understanding)
- [Mode Talk](/fr/nodes/talk)
- [Réveil vocal](/fr/nodes/voicewake)
