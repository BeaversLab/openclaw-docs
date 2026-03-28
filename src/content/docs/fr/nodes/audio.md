---
summary: "Comment les notes audio/voix entrantes sont téléchargées, transcrites et injectées dans les réponses"
read_when:
  - Changing audio transcription or media handling
title: "Audio et notes vocales"
---

# Audio / Notes vocales (2026-01-17)

## Ce qui fonctionne

- **Compréhension des médias (audio)** : Si la compréhension audio est activée (ou détectée automatiquement), OpenClaw :
  1. Localise la première pièce jointe audio (chemin local ou URL) et la télécharge si nécessaire.
  2. Applique `maxBytes` avant l'envoi à chaque entrée de modèle.
  3. Exécute la première entrée de modèle éligible dans l'ordre (fournisseur ou CLI).
  4. En cas d'échec ou d'ignorance (taille/délai d'attente), il essaie l'entrée suivante.
  5. En cas de succès, il remplace `Body` par un bloc `[Audio]` et définit `{{Transcript}}`.
- **Analyse des commandes** : Lorsque la transcription réussit, `CommandBody`/`RawBody` sont définis avec la transcription pour que les commandes slash fonctionnent toujours.
- **Journalisation détaillée** : Dans `--verbose`, nous journalisons l'exécution de la transcription et le remplacement du corps.

## Détection automatique (par défaut)

Si vous **ne configurez pas de modèles** et que `tools.media.audio.enabled` n'est **pas** défini sur `false`,
OpenClaw détecte automatiquement dans cet ordre et s'arrête à la première option fonctionnelle :

1. **CLI locales** (si installées)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/joineur/jetons)
   - `whisper-cli` (depuis `whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le petit modèle inclus)
   - `whisper` (CLI Python ; télécharge les modèles automatiquement)
2. **CLI Gemini** (`gemini`) utilisant `read_many_files`
3. **Clés de fournisseur** (OpenAI → Groq → Deepgram → Google)

Pour désactiver la détection automatique, définissez `tools.media.audio.enabled: false`.
Pour personnaliser, définissez `tools.media.audio.models`.
Remarque : La détection binaire est de meilleure effort sur macOS/Linux/Windows ; assurez-vous que le CLI est sur `PATH` (nous développons `~`), ou définissez un CLI explicite avec un chemin de commande complet.

## Exemples de configuration

### Provider + repli CLI (OpenAI + Whisper CLI)

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

### Provider uniquement avec filtrage par périmètre

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

### Renvoyer la transcription au chat (opt-in)

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

- L'authentification du provider suit l'ordre standard d'authentification des modèles (profils d'authentification, env vars, `models.providers.*.apiKey`).
- Deepgram récupère `DEEPGRAM_API_KEY` lorsque `provider: "deepgram"` est utilisé.
- Détails de configuration Deepgram : [Deepgram (transcription audio)](/fr/providers/deepgram).
- Détails de configuration Mistral : [Mistral](/fr/providers/mistral).
- Les providers audio peuvent remplacer `baseUrl`, `headers` et `providerOptions` via `tools.media.audio`.
- La limite de taille par défaut est de 20 Mo (`tools.media.audio.maxBytes`). Les fichiers audio trop volumineux sont ignorés pour ce modèle et l'entrée suivante est essayée.
- Les fichiers audio minuscules/vides de moins de 1024 octets sont ignorés avant la transcription par le provider/CLI.
- La valeur par défaut `maxChars` pour l'audio est **non définie** (transcription complète). Définissez `tools.media.audio.maxChars` ou `maxChars` par entrée pour réduire la sortie.
- La valeur par défaut automatique de OpenAI est `gpt-4o-mini-transcribe` ; définissez `model: "gpt-4o-transcribe"` pour une précision accrue.
- Utilisez `tools.media.audio.attachments` pour traiter plusieurs notes vocales (`mode: "all"` + `maxAttachments`).
- La transcription est disponible pour les modèles en tant que `{{Transcript}}`.
- `tools.media.audio.echoTranscript` est désactivé par défaut ; activez-le pour renvoyer la confirmation de la transcription au chat d'origine avant le traitement par l'agent.
- `tools.media.audio.echoFormat` personnalise le texte d'écho (espace réservé : `{transcript}`).
- Le stdout CLI est limité (5 Mo) ; gardez la sortie CLI concise.

### Prise en charge de l'environnement proxy

La transcription audio basée sur des fournisseurs respecte les variables d'environnement de proxy sortant standard :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si aucune variable d'environnement de proxy n'est définie, une sortie directe est utilisée. Si la configuration du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération directe.

## Détection de mentions dans les groupes

Lorsque `requireMention: true` est défini pour une conversation de groupe, OpenClaw transcrit désormais l'audio **avant** de vérifier les mentions. Cela permet de traiter les notes vocales même si elles contiennent des mentions.

**Comment cela fonctionne :**

1. Si un message vocal n'a pas de corps de texte et que le groupe nécessite des mentions, OpenClaw effectue une transcription « préliminaire ».
2. La transcription est vérifiée pour les modèles de mention (par exemple, `@BotName`, déclencheurs d'emoji).
3. Si une mention est trouvée, le message passe par le pipeline de réponse complet.
4. La transcription est utilisée pour la détection de mentions afin que les notes vocales puissent passer la porte de mention.

**Comportement de repli :**

- Si la transcription échoue lors de la phase préliminaire (délai d'attente, erreur API, etc.), le message est traité sur la base de la détection de mention par texte uniquement.
- Cela garantit que les messages mixtes (texte + audio) ne sont jamais incorrectement abandonnés.

**Désactivation par groupe/sujet Telegram :**

- Définissez `channels.telegram.groups.<chatId>.disableAudioPreflight: true` pour ignorer les vérifications de mention de la transcription préliminaire pour ce groupe.
- Définissez `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` pour remplacer par sujet (`true` pour ignorer, `false` pour forcer l'activation).
- La valeur par défaut est `false` (préliminaire activé lorsque les conditions de porte de mention correspondent).

**Exemple :** Un utilisateur envoie une note vocale disant « Hey @Claude, quelle est la météo ? » dans un groupe Telegram avec `requireMention: true`. La note vocale est transcrite, la mention est détectée et l'agent répond.

## Pièges

- Les règles de portée s'appliquent selon la première correspondance trouvée. `chatType` est normalisé à `direct`, `group` ou `room`.
- Assurez-vous que votre CLI se ferme avec le code 0 et imprime du texte brut ; le JSON doit être traité via `jq -r .text`.
- Pour `parakeet-mlx`, si vous passez `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque `--output-format` est `txt` (ou omis) ; les formats de sortie autres que `txt` reviennent à l'analyse de stdout.
- Gardez des délais d'expiration raisonnables (`timeoutSeconds`, 60 s par défaut) pour éviter de bloquer la file de réponse.
- La transcription préliminaire ne traite que la **première** pièce jointe audio pour la détection des mentions. L'audio supplémentaire est traité lors de la phase principale de compréhension des médias.
