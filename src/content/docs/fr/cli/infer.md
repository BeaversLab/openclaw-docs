---
summary: "CLI Inférence en priorité pour les workflows de modèle, d'image, d'audio, de TTS, de vidéo, de web et d'intégration pris en charge par le fournisseur"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLI d'inférence"
---

`openclaw infer` est l'interface principale canonique pour les workflows d'inférence pris en charge par le fournisseur.

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

`openclaw infer` fournit un CLI cohérent pour les tâches d'inférence prises en charge par le fournisseur dans OpenClaw.

Avantages :

- Utilisez les fournisseurs et les modèles déjà configurés dans OpenClaw au lieu de créer des wrappers ponctuels pour chaque backend.
- Gardez les workflows de modèle, d'image, de transcription audio, de TTS, de vidéo, de web et d'intégration sous une seule arborescence de commandes.
- Utilisez une forme de sortie `--json` stable pour les scripts, l'automatisation et les workflows pilotés par des agents.
- Privilégiez une interface première partie OpenClaw lorsque la tâche est fondamentalement "exécuter une inférence".
- Utilisez le chemin local normal sans exiger la passerelle pour la plupart des commandes infer.

Pour les checks de fournisseur de bout en bout, préférez `openclaw infer ...` une fois que les tests de fournisseur de niveau inférieur sont verts. Il exerce le CLI expédié, le chargement de la configuration, la résolution de l'agent par défaut, l'activation du plugin groupé, la réparation des dépendances d'exécution et le runtime de capacité partagé avant que la demande de fournisseur ne soit effectuée.

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

| Tâche                               | Commande                                                               | Notes                                                               |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Exécuter une invite textuelle/model | `openclaw infer model run --prompt "..." --json`                       | Utilise le chemin local normal par défaut                           |
| Générer une image                   | `openclaw infer image generate --prompt "..." --json`                  | Utilisez `image edit` lorsque vous partez d'un fichier existant     |
| Décrire un fichier image            | `openclaw infer image describe --file ./image.png --json`              | `--model` doit être un `<provider/model>` capable d'image           |
| Transcrire l'audio                  | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` doit être `<provider/model>`                              |
| Synthétiser la parole               | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` est orienté passerelle                                 |
| Générer une vidéo                   | `openclaw infer video generate --prompt "..." --json`                  | Prend en charge les indicateurs de provider tels que `--resolution` |
| Décrire un fichier vidéo            | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` doit être `<provider/model>`                              |
| Rechercher sur le Web               | `openclaw infer web search --query "..." --json`                       |                                                                     |
| Récupérer une page Web              | `openclaw infer web fetch --url https://example.com --json`            |                                                                     |
| Créer des incorporations            | `openclaw infer embedding create --text "..." --json`                  |                                                                     |

## Comportement

- `openclaw infer ...` est l'interface CLI principale pour ces flux de travail.
- Utilisez `--json` lorsque la sortie sera consommée par une autre commande ou un autre script.
- Utilisez `--provider` ou `--model provider/model` lorsqu'un backend spécifique est requis.
- Pour `image describe`, `audio transcribe` et `video describe`, `--model` doit utiliser le formulaire `<provider/model>`.
- Pour `image describe`, un `--model` explicite exécute ce provider/model directement. Le modèle doit être compatible avec les images dans le catalogue de modèles ou la configuration du provider. `codex/<model>` exécute un tour de compréhension d'image de serveur d'application Codex borné ; `openai-codex/<model>` utilise le chemin de provider Codex OpenAI OAuth.
- Les commandes d'exécution sans état sont par défaut locales.
- Les commandes d'état gérées par la passerelle sont par défaut sur la passerelle.
- Le chemin local normal ne nécessite pas l'exécution de la passerelle.
- `model run` est ponctuel. Les serveurs MCP ouverts via le runtime de l'agent pour cette commande sont retirés après la réponse pour l'exécution locale et `--gateway`, les appels de script répétés ne gardent donc pas les processus enfants MCP stdio en vie.

## Modèle

Utilisez `model` pour l'inférence de texte prise en charge par le provider et l'inspection du modèle/provider.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

Remarques :

- `model run` réutilise le runtime de l'agent, les remplacements de provider/modèle se comportent donc comme une exécution normale de l'agent.
- Comme `model run` est destiné à l'automatisation sans interface, il ne conserve pas les runtimes MCP groupés par session après la fin de la commande.
- `model auth login`, `model auth logout` et `model auth status` gèrent l'état d'authentification provider enregistré.

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
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

Notes :

- Utilisez `image edit` lors du démarrage à partir de fichiers d'entrée existants.
- Utilisez `--size`, `--aspect-ratio` ou `--resolution` avec `image edit` pour
  les providers/modèles qui prennent en charge les indications géométriques sur les éditions d'images de référence.
- Utilisez `--output-format png --background transparent` avec
  `--model openai/gpt-image-1.5` pour une sortie PNG OpenAI à fond transparent ;
  `--openai-background` reste disponible en tant qu'alias spécifique à OpenAI. Les providers
  qui ne déclarent pas la prise en charge de l'arrière-plan signalent l'indication comme un paramètre ignoré.
- Utilisez `image providers --json` pour vérifier quels fournisseurs d'image intégrés sont
  détectables, configurés, sélectionnés, et quelles capacités de génération/édition
  chaque fournisseur expose.
- Utilisez `image generate --model <provider/model> --json` comme le test de fumée CLI en direct le plus étroit
  pour les modifications de génération d'images. Exemple :

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  La réponse JSON rapporte `ok`, `provider`, `model`, `attempts` et les chemins de sortie
  écrits. Lorsque `--output` est défini, l'extension finale peut suivre le
  type MIME renvoyé par le fournisseur.

- Pour `image describe`, `--model` doit être un `<provider/model>` capable d'image.
- Pour les modèles de vision locaux Ollama, téléchargez d'abord le modèle et définissez `OLLAMA_API_KEY` sur n'importe quelle valeur d'espace réservé, par exemple `ollama-local`. Voir [Ollama](/fr/providers/ollama#vision-and-image-description).

## Audio

Utilisez `audio` pour la transcription de fichiers.

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Notes :

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

Notes :

- `tts status` est par défaut la passerelle car il reflète l'état TTS géré par la passerelle.
- Utilisez `tts providers`, `tts voices` et `tts set-provider` pour inspecter et configurer le comportement TTS.

## Vidéo

Utilisez `video` pour la génération et la description.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notes :

- `video generate` accepte `--size`, `--aspect-ratio`, `--resolution`, `--duration`, `--audio`, `--watermark` et `--timeout-ms` et les transmet au runtime de génération vidéo.
- `--model` doit être `<provider/model>` pour `video describe`.

## Web

Utilisez `web` pour les flux de travail de recherche et de récupération.

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

Notes :

- Utilisez `web providers` pour inspecter les providers disponibles, configurés et sélectionnés.

## Embedding

Utilisez `embedding` pour la création de vecteurs et l'inspection du provider d'embedding.

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

Pour les commandes de média générés, `outputs` contient les fichiers écrits par OpenClaw. Utilisez
le `path`, `mimeType`, `size` et toutes les dimensions spécifiques au média dans ce tableau
pour l'automatisation au lieu d'analyser le stdout lisible par l'homme.

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

## Connexe

- [Référence CLI](/fr/cli)
- [Modèles](/fr/concepts/models)
