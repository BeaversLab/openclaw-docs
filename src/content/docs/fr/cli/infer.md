---
summary: "CLICLI orienté inférence en priorité pour les workflows de modèle, d'image, d'audio, de TTS, de vidéo, de Web et d'intégration pris en charge par un fournisseur"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLICLI d'inférence"
---

`openclaw infer` est l'interface headless canonique pour les workflows d'inférence pris en charge par un fournisseur.

Il expose intentionnellement des familles de fonctionnalités, et non les noms bruts des passerelles RPC ni les identifiants bruts des outils de l'agent.

## Transformer infer en une compétence

Copiez et collez ceci dans un agent :

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

Une bonne compétence basée sur infer devrait :

- faire correspondre les intentions courantes des utilisateurs à la bonne sous-commande infer
- inclure quelques exemples canoniques d'infer pour les workflows qu'elle couvre
- préférer `openclaw infer ...` dans les exemples et les suggestions
- éviter de redocumenter l'ensemble de la surface infer dans le corps de la compétence

Couverture typique des compétences axées sur infer :

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## Pourquoi utiliser infer

`openclaw infer` fournit un CLI cohérent pour les tâches d'inférence prises en charge par un fournisseur au sein d'OpenClaw.

Avantages :

- Utilisez les fournisseurs et les modèles déjà configurés dans OpenClaw au lieu de créer des wrappers ponctuels pour chaque backend.
- Gardez les workflows de modèle, d'image, de transcription audio, de TTS, de vidéo, de web et d'intégration sous une seule arborescence de commandes.
- Utiliser une forme de sortie `--json` stable pour les scripts, l'automatisation et les workflows pilotés par des agents.
- Privilégiez une interface première partie OpenClaw lorsque la tâche est fondamentalement "exécuter une inférence".
- Utilisez le chemin local normal sans exiger la passerelle pour la plupart des commandes infer.

Pour les checks de bout en bout du fournisseur, privilégier `openclaw infer ...` une fois que les tests de niveau inférieur du fournisseur sont au vert. Cela exerce la CLI expédiée, le chargement de la configuration, la résolution de l'agent par défaut, l'activation du plugin groupé et le runtime de capacité partagé avant que la demande au fournisseur ne soit effectuée.

## Arborescence de commandes

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## Tâches courantes

Ce tableau mappe les tâches d'inférence courantes vers la commande infer correspondante.

| Tâche                                       | Commande                                                                                      | Notes                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Exécuter une invite textuelle/model         | `openclaw infer model run --prompt "..." --json`                                              | Utilise le chemin local normal par défaut                                |
| Exécuter un prompt de modèle sur des images | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | Répéter `--file` pour plusieurs entrées d'image                          |
| Générer une image                           | `openclaw infer image generate --prompt "..." --json`                                         | Utiliser `image edit` lors du démarrage à partir d'un fichier existant   |
| Décrire un fichier image ou une URL         | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` doit être un `<provider/model>` capable de traiter des images  |
| Transcrire l'audio                          | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` doit être `<provider/model>`                                   |
| Synthétiser la parole                       | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` est orienté passerelle                                      |
| Générer une vidéo                           | `openclaw infer video generate --prompt "..." --json`                                         | Prend en charge les indications de fournisseur telles que `--resolution` |
| Décrire un fichier vidéo                    | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` doit être `<provider/model>`                                   |
| Rechercher sur le Web                       | `openclaw infer web search --query "..." --json`                                              |                                                                          |
| Récupérer une page Web                      | `openclaw infer web fetch --url https://example.com --json`                                   |                                                                          |
| Créer des embeddings                        | `openclaw infer embedding create --text "..." --json`                                         |                                                                          |

## Comportement

- `openclaw infer ...` est l'interface CLI principale pour ces workflows.
- Utilisez `--json` lorsque la sortie sera consommée par une autre commande ou un autre script.
- Utilisez `--provider` ou `--model provider/model` lorsqu'un backend spécifique est requis.
- Utilisez `model run --thinking <level>` pour passer un niveau de réflexion/raisonnement ponctuel (`off`, `minimal`, `low`, `medium`, `high`, `adaptive`, `xhigh` ou `max`) tout en gardant l'exécution brute.
- Pour `image describe`, `audio transcribe` et `video describe`, `--model` doit utiliser la forme `<provider/model>`.
- Pour `image describe`, `--file` accepte les chemins locaux et les URL d'image HTTP(S). Les URL distantes utilisent la stratégie SSRF normale de récupération de médias.
- Pour `image describe`, un `--model` explicite exécute directement ce provider/modèle. Le modèle doit être capable de traiter des images dans le catalogue de modèles ou la configuration du provider. `codex/<model>` exécute un tour de compréhension d'image limité du serveur d'application Codex ; `openai-codex/<model>` utilise le chemin de provider OAuth OpenAI Codex OAuth.
- Les commandes d'exécution sans état sont par défaut locales.
- Les commandes d'état gérées par la Gateway sont par défaut sur la Gateway.
- Le chemin local normal ne nécessite pas que la Gateway soit en cours d'exécution.
- Le `model run` local est une complétion de provider unique et légère. Il résout le modèle d'agent configuré et l'authentification, mais ne démarre pas de tour d'agent de chat, ne charge pas les outils, ni n'ouvre les serveurs MCP groupés.
- `model run --file` accepte les fichiers image, détecte leur type MIME et les envoie avec l'invite fournie au modèle sélectionné. Répétez `--file` pour plusieurs images.
- `model run --file` rejette les entrées non image. Utilisez `infer audio transcribe` pour les fichiers audio et `infer video describe` pour les fichiers vidéo.
- `model run --gateway` exerce le routage de la Gateway, l'authentification sauvegardée, la sélection du provider et le runtime intégré, mais s'exécute toujours en tant que sonde de modèle brute : il envoie l'invite fournie et toutes les pièces jointes d'image sans historique de session, contexte bootstrap/AGENTS, assembly du moteur de contexte, outils ou serveurs MCP groupés.
- `model run --gateway --model <provider/model>` nécessite des identifiants d'opérateur de confiance pour la Gateway car la demande demande à la Gateway d'exécuter une substitution provider/modèle ponctuelle.
- Le `model run --thinking` local utilise le chemin de complétion de provider léger ; les niveaux spécifiques au provider tels que `adaptive` et `max` sont mappés au niveau portable le plus proche de complétion simple.

## Modèle

Utilisez `model` pour l'inférence de texte basée sur un provider et l'inspection de modèle/provider.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

Utilisez des références `<provider/model>` complètes pour tester rapidement un provider spécifique sans
démarrer la Gateway ni charger l'ensemble des outils de l'agent :

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-5.5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

Notes :

- Le `model run` local est le test de fumée CLI le plus strict pour la santé provider/model/auth car, pour les providers non-Codex, il n'envoie que le prompt fourni au modèle sélectionné.
- Le `model run --model <provider/model>` local peut utiliser des lignes exactes du catalogue statique regroupé issues de `models list --all` avant que ce provider ne soit écrit dans la configuration. L'authentification du provider est toujours requise ; les identifiants manquants échouent avec des erreurs d'authentification, et non comme `Unknown model`.
- Pour les sondes de raisonnement Mistral Medium 3.5, laissez la température non définie/par défaut. Mistral rejette `reasoning_effort="high"` plus `temperature: 0` ; utilisez `mistral/mistral-medium-3-5` avec la température par défaut ou une valeur non nulle pour le mode de raisonnement telle que `0.7`.
- Les sondes locales `openai-codex/*` constituent l'étroite exception : OpenClaw ajoute une instruction système minimale pour que le transport Codex Responses puisse remplir son champ `instructions` requis, sans ajouter le contexte complet de l'agent, les outils, la mémoire ou la transcription de session.
- Le `model run --file` local conserve ce chemin allégé et attache le contenu de l'image directement au message utilisateur unique. Les fichiers image courants tels que PNG, JPEG et WebP fonctionnent lorsque leur type MIME est détecté comme `image/*` ; les fichiers non pris en charge ou non reconnus échouent avant l'appel au provider.
- `model run --file` est idéal lorsque vous souhaitez tester directement le modèle de texte multimodal sélectionné. Utilisez `infer image describe` lorsque vous souhaitez la sélection de provider de compréhension d'image et le routage par défaut du modèle d'image de OpenClaw.
- Le modèle sélectionné doit prendre en charge l'entrée d'image ; les modèles texte uniquement peuvent rejeter la demande au niveau de la couche provider.
- `model run --prompt` doit contenir du texte non vide (non composé uniquement d'espaces) ; les prompts vides sont rejetés avant l'appel aux providers locaux ou à la Gateway.
- Local `model run` exits non-zero when the provider returns no text output, so unreachable local providers and empty completions do not look like successful probes.
- Use `model run --gateway` when you need to test Gateway routing, agent-runtime setup, or Gateway-managed provider state while keeping the model input raw. Use `openclaw agent` or chat surfaces when you want the full agent context, tools, memory, and session transcript.
- `model auth login`, `model auth logout`, and `model auth status` manage saved provider auth state.

## Image

Use `image` for generation, edit, and description.

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file https://example.com/photo.png --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-5.4-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

Notes :

- Use `image edit` when starting from existing input files.
- Use `--size`, `--aspect-ratio`, or `--resolution` with `image edit` for
  providers/models that support geometry hints on reference-image edits.
- Use `--output-format png --background transparent` with
  `--model openai/gpt-image-1.5` for transparent-background OpenAI PNG output;
  `--openai-background` remains available as an OpenAI-specific alias. Providers
  that do not declare background support report the hint as an ignored override.
- Use `image providers --json` to verify which bundled image providers are
  discoverable, configured, selected, and which generation/edit capabilities
  each provider exposes.
- Use `image generate --model <provider/model> --json` as the narrowest live
  CLI smoke for image generation changes. Example :

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  The JSON response reports `ok`, `provider`, `model`, `attempts`, and written
  output paths. When `--output` is set, the final extension may follow the
  provider's returned MIME type.

- Pour `image describe` et `image describe-many`, utilisez `--prompt` pour donner au modèle de vision une instruction spécifique à la tâche telle que l'OCR, la comparaison, l'inspection de l'interface utilisateur ou la légende concise.
- Utilisez `--timeout-ms` avec des modèles de vision locaux lents ou des démarrages à froid d'Ollama.
- Pour `image describe`, `--model` doit être un `<provider/model>` compatible avec les images.
- Pour les modèles de vision locaux Ollama, tirez d'abord le modèle et définissez `OLLAMA_API_KEY` sur n'importe quelle valeur d'espace réservé, par exemple `ollama-local`. Voir [Ollama](/fr/providers/ollama#vision-and-image-description).

## Audio

Utilisez `audio` pour la transcription de fichiers.

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Remarques :

- `audio transcribe` est destiné à la transcription de fichiers, et non à la gestion de session en temps réel.
- `--model` doit être `<provider/model>`.

## TTS

Utilisez `tts` pour la synthèse vocale et l'état du provider TTS.

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

Remarques :

- `tts status` est par défaut la passerelle (gateway) car elle reflète l'état TTS géré par la passerelle.
- Utilisez `tts providers`, `tts voices` et `tts set-provider` pour inspecter et configurer le comportement TTS.

## Vidéo

Utilisez `video` pour la génération et la description.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-5.4-mini --json
```

Remarques :

- `video generate` accepte `--size`, `--aspect-ratio`, `--resolution`, `--duration`, `--audio`, `--watermark` et `--timeout-ms` et les transmet au runtime de génération vidéo.
- `--model` doit être `<provider/model>` pour `video describe`.

## Web

Utilisez `web` pour les workflows de recherche et de récupération.

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

Remarques :

- Utilisez `web providers` pour inspecter les providers disponibles, configurés et sélectionnés.

## Embedding

Utilisez `embedding` pour la création de vecteurs et l'inspection du provider d'embeddings.

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## Sortie JSON

Les commandes Infer normalisent la sortie JSON sous une enveloppe commune :

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

Les champs de premier niveau sont stables :

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

Pour les commandes de média générés, `outputs` contient les fichiers écrits par OpenClaw. Utilisez
le `path`, `mimeType`, `size`, et toutes les dimensions spécifiques au média dans ce tableau
pour l'automatisation au lieu d'analyser la stdout lisible par l'homme.

## Pièges courants

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## Notes

- `openclaw capability ...` est un alias pour `openclaw infer ...`.

## Connexes

- [Référence CLI](/fr/cli)
- [Modèles](/fr/concepts/models)
