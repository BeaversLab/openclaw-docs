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
| Décrire un fichier image                    | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` doit être un `<provider/model>` capable de traiter des images  |
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
- Pour `image describe`, un `--model` explicite exécute directement ce fournisseur/model. Le modèle doit être capable de traiter des images dans le catalogue de modèles ou la configuration du fournisseur. `codex/<model>` exécute un tour de compréhension d'image limité sur le serveur d'application Codex ; `openai-codex/<model>` utilise le chemin du fournisseur Codex OpenAI OAuth.
- Les commandes d'exécution sans état sont par défaut locales.
- Les commandes d'état gérées par la Gateway sont par défaut définies sur la passerelle.
- Le chemin local normal ne nécessite pas que la passerelle soit en cours d'exécution.
- Le `model run` local est une complétion de fournisseur ponctuelle légère. Il résout le modèle d'agent et l'authentification configurés, mais ne démarre pas de tour d'agent de chat, ne charge pas d'outils et n'ouvre pas de serveurs MCP groupés.
- `model run --file` accepte les fichiers image, détecte leur type MIME et les envoie avec l'invite fournie au modèle sélectionné. Répétez `--file` pour plusieurs images.
- `model run --file` rejette les entrées non-image. Utilisez `infer audio transcribe` pour les fichiers audio et `infer video describe` pour les fichiers vidéo.
- `model run --gateway` exerce le routage du Gateway, l'authentification enregistrée, la sélection du provider et le runtime intégré, mais s'exécute toujours en tant que sonde de modèle brute : il envoie le prompt fourni et toutes les pièces jointes d'image sans transcript de session préalable, de contexte bootstrap/AGENTS, d'assemblage du moteur de contexte, d'outils ou de serveurs MCP groupés.
- `model run --gateway --model <provider/model>` nécessite des informations d'identification d'opérateur de confiance pour le Gateway car la demande demande au Gateway d'exécuter une substitution ponctuelle de provider/modèle.
- Le `model run --thinking` local utilise le chemin de completion allégé du provider ; les niveaux spécifiques au provider tels que `adaptive` et `max` sont mappés au niveau portable le plus proche de completion simple.

## Modèle

Utilisez `model` pour l'inférence de texte soutenue par un provider et l'inspection de modèle/provider.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

Utilisez des références complètes `<provider/model>` pour effectuer un test de fumée sur un provider spécifique sans
démarrer le Gateway ou charger la surface complète des outils de l'agent :

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

Notes :

- Le `model run` local est le test de fumée du CLI le plus étroit pour la santé du provider/modèle/auth car, pour les providers non-Codex, il envoie uniquement le prompt fourni au modèle sélectionné.
- Le `model run --model <provider/model>` local peut utiliser des lignes exactes du catalogue statique groupé issues de `models list --all` avant que ce provider ne soit écrit dans la configuration. L'authentification du provider est toujours requise ; les identifiants manquants échouent avec des erreurs d'authentification, et non comme `Unknown model`.
- Pour les sondes de raisonnement Mistral Medium 3.5, laissez la température non définie/défaut. Mistral rejette `reasoning_effort="high"` plus `temperature: 0` ; utilisez `mistral/mistral-medium-3-5` avec la température par défaut ou une valeur de mode de raisonnement non nulle telle que `0.7`.
- Les sondes locales `openai-codex/*` constituent l'étroite exception : OpenClaw ajoute une instruction système minimale pour que le transport Codex Responses puisse remplir son champ requis `instructions`, sans ajouter le contexte complet de l'agent, les outils, la mémoire ou le transcript de session.
- Le `model run --file` local conserve ce chemin léger et joint le contenu de l'image directement au message utilisateur unique. Les fichiers image courants tels que PNG, JPEG et WebP fonctionnent lorsque leur type MIME est détecté comme `image/*` ; les fichiers non pris en charge ou non reconnus échouent avant l'appel du provider.
- `model run --file` est idéal lorsque vous souhaitez tester directement le modèle textuel multimodal sélectionné. Utilisez `infer image describe` lorsque vous souhaitez la sélection du provider de compréhension d'image d'OpenClaw et le routage par défaut du modèle d'image.
- Le modèle sélectionné doit prendre en charge l'entrée d'image ; les modèles texte uniquement peuvent rejeter la requête au niveau du provider.
- `model run --prompt` doit contenir du texte non vide ; les invites vides sont rejetées avant l'appel des providers locaux ou de la Gateway.
- Le `model run` local se ferme avec un code non nul lorsque le provider ne renvoie aucune sortie texte, de sorte que les providers locaux inaccessibles et les complétions vides ne ressemblent pas à des sondages réussis.
- Utilisez `model run --gateway` lorsque vous devez tester le routage de la Gateway, la configuration du runtime de l'agent ou l'état du provider géré par la Gateway tout en gardant l'entrée du modèle brute. Utilisez `openclaw agent` ou les surfaces de chat lorsque vous souhaitez le contexte complet de l'agent, les outils, la mémoire et la transcription de session.
- `model auth login`, `model auth logout` et `model auth status` gèrent l'état d'authentification enregistré du provider.

## Image

Utilisez `image` pour la génération, l'édition et la description.

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

Notes :

- Utilisez `image edit` lors du démarrage à partir de fichiers d'entrée existants.
- Utilisez `--size`, `--aspect-ratio` ou `--resolution` avec `image edit` pour
  les providers/modèles qui prennent en charge les indications de géométrie sur les modifications d'image de référence.
- Utilisez `--output-format png --background transparent` avec
  `--model openai/gpt-image-1.5` pour une sortie PNG OpenAI à fond transparent ;
  `--openai-background` reste disponible comme un alias spécifique à OpenAI. Les providers
  qui ne déclarent pas la prise en charge de l'arrière-plan signalent l'indication comme une priorité ignorée.
- Utilisez `image providers --json` pour vérifier quels fournisseurs d'images intégrés sont détectables, configurés, sélectionnés, et quelles capacités de génération ou d'édition chaque fournisseur expose.
- Utilisez `image generate --model <provider/model> --json` comme le test de fumée CLI en direct le plus étroit pour les modifications de génération d'images. Exemple :

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  La réponse JSON rapporte `ok`, `provider`, `model`, `attempts` et les chemins de sortie écrits. Lorsque `--output` est défini, l'extension finale peut suivre le type MIME renvoyé par le fournisseur.

- Pour `image describe` et `image describe-many`, utilisez `--prompt` pour donner au modèle de vision une instruction spécifique à la tâche telle que l'OCR, la comparaison, l'inspection de l'interface utilisateur ou la légende concise.
- Utilisez `--timeout-ms` avec des modèles de vision locaux lents ou des démarrages à froid Ollama.
- Pour `image describe`, `--model` doit être un `<provider/model>` capable de traiter des images.
- Pour les modèles de vision Ollama locaux, tirez d'abord le modèle et définissez `OLLAMA_API_KEY` à n'importe quelle valeur d'espace réservé, par exemple `ollama-local`. Voir [Ollama](/fr/providers/ollama#vision-and-image-description).

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

Utilisez `tts` pour la synthèse vocale et l'état du fournisseur TTS.

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

Remarques :

- `tts status` utilise par défaut la passerelle car il reflète l'état TTS géré par la passerelle.
- Utilisez `tts providers`, `tts voices` et `tts set-provider` pour inspecter et configurer le comportement TTS.

## Vidéo

Utilisez `video` pour la génération et la description.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
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

Notes :

- Utilisez `web providers` pour inspecter les providers disponibles, configurés et sélectionnés.

## Embedding

Utilisez `embedding` pour la création de vecteurs et l'inspection de provider d'embeddings.

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## Sortie JSON

Les commandes Infer normalisent la sortie JSON sous une enveloppe partagée :

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

Les champs de niveau supérieur sont stables :

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

Pour les commandes de génération de médias, `outputs` contient les fichiers écrits par OpenClaw. Utilisez
le `path`, `mimeType`, `size` et toutes les dimensions spécifiques aux médias dans ce tableau
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
