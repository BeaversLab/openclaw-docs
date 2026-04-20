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

1. **Modèle de réponse actif** lorsque son fournisseur prend en charge la compréhension audio.
2. **CLI locales** (si installées)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/joineur/tokens)
   - `whisper-cli` (à partir de `whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le modèle tiny intégré)
   - `whisper` (CLI CLI ; télécharge les modèles automatiquement)
3. **Gemini CLI** (`gemini`) utilisant `read_many_files`
4. **Authentification du fournisseur**
   - Les entrées `models.providers.*` configurées qui prennent en charge l'audio sont essayées en premier
   - Ordre de repli intégré : OpenAI → Groq → Deepgram → Google → Mistral

Pour désactiver la détection automatique, définissez `tools.media.audio.enabled: false`.
Pour personnaliser, définissez `tools.media.audio.models`.
Remarque : La détection de binaire est au mieux possible sur macOS/Linux/Windows ; assurez-vous que la CLI est sur `PATH` (nous développons `~`), ou définissez un modèle CLI explicite avec un chemin de commande complet.

## Exemples de configuration

### Fournisseur + repli CLI (OpenAI + Whisper CLI)

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

### Fournisseur uniquement avec filtrage par portée

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

### Fournisseur uniquement (Deepgram)

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

### Fournisseur uniquement (Mistral Voxtral)

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

- L'authentification du fournisseur suit l'ordre d'authentification de modèle standard (profils d'auth, env vars, `models.providers.*.apiKey`).
- Détails de la configuration Groq : [Groq](/fr/providers/groq).
- Deepgram récupère `DEEPGRAM_API_KEY` lorsque `provider: "deepgram"` est utilisé.
- Détails de la configuration Deepgram : [Deepgram (transcription audio)](/fr/providers/deepgram).
- Détails de la configuration Mistral : [Mistral](/fr/providers/mistral).
- Les fournisseurs audio peuvent remplacer `baseUrl`, `headers` et `providerOptions` via `tools.media.audio`.
- La limite de taille par défaut est de 20 Mo (`tools.media.audio.maxBytes`). L'audio trop volumineux est ignoré pour ce modèle et l'entrée suivante est essayée.
- Les fichiers audio minuscules/vides de moins de 1024 octets sont ignorés avant la transcription par le fournisseur/la CLI.
- Le `maxChars` par défaut pour l'audio est **non défini** (transcription complète). Définissez `tools.media.audio.maxChars` ou le `maxChars` par entrée pour réduire la sortie.
- Le mode auto par défaut d'OpenAI est `gpt-4o-mini-transcribe`; définissez `model: "gpt-4o-transcribe"` pour une meilleure précision.
- Utilisez `tools.media.audio.attachments` pour traiter plusieurs notes vocales (`mode: "all"` + `maxAttachments`).
- La transcription est disponible pour les modèles sous `{{Transcript}}`.
- `tools.media.audio.echoTranscript` est désactivé par défaut; activez-le pour renvoyer la confirmation de la transcription au chat d'origine avant le traitement par l'agent.
- `tools.media.audio.echoFormat` personnalise le texte de l'écho (espace réservé : `{transcript}`).
- Le stdout de la CLI est limité (5 Mo); gardez la sortie de la CLI concise.

### Prise en charge de l'environnement proxy

La transcription audio basée sur le fournisseur respecte les variables d'environnement proxy sortant standard :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si aucune variable d'environnement proxy n'est définie, une sortie directe est utilisée. Si la configuration du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération directe.

## Détection des mentions dans les groupes

Lorsque `requireMention: true` est défini pour un chat de groupe, OpenClaw transcrit désormais l'audio **avant** de vérifier les mentions. Cela permet de traiter les notes vocales même lorsqu'elles contiennent des mentions.

**Fonctionnement :**

1. Si un message vocal n'a pas de corps de texte et que le groupe nécessite des mentions, OpenClaw effectue une transcription « préliminaire ».
2. La transcription est vérifiée pour les modèles de mention (par exemple, `@BotName`, déclencheurs d'emoji).
3. Si une mention est trouvée, le message passe par le pipeline complet de réponse.
4. La transcription est utilisée pour la détection des mentions afin que les notes vocales puissent franchir la porte des mentions.

**Comportement de repli :**

- Si la transcription échoue pendant la phase préliminaire (délai d'attente, erreur API, etc.), le message est traité sur la base de la détection des mentions textuelles uniquement.
- Cela garantit que les messages mixtes (texte + audio) ne sont jamais incorrectement ignorés.

**Désactivation par groupe/sujet Telegram :**

- Définissez `channels.telegram.groups.<chatId>.disableAudioPreflight: true` pour ignorer les vérifications de mention de transcription préliminaire pour ce groupe.
- Définissez `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` pour remplacer par sujet (`true` pour ignorer, `false` pour forcer l'activation).
- La valeur par défaut est `false` (préliminaire activé lorsque les conditions de porte de mention correspondent).

**Exemple :** Un utilisateur envoie une note vocale disant « Salut @Claude, quelle est la météo ? » dans un groupe Telegram avec `requireMention: true`. La note vocale est transcrite, la mention est détectée et l'agent répond.

## Pièges

- Les règles de portée appliquent le premier correspondant trouvé. `chatType` est normalisé en `direct`, `group` ou `room`.
- Assurez-vous que votre CLI se termine avec le code 0 et imprime du texte brut ; JSON doit être traité via `jq -r .text`.
- Pour `parakeet-mlx`, si vous passez `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` quand `--output-format` est `txt` (ou omis) ; les formats de sortie non `txt` reviennent à l'analyse de stdout.
- Gardez des délais d'attente raisonnables (`timeoutSeconds`, 60 s par défaut) pour éviter de bloquer la file de réponse.
- La transcription préliminaire ne traite que la **première** pièce jointe audio pour la détection de mention. L'audio supplémentaire est traité lors de la phase principale de compréhension des médias.
