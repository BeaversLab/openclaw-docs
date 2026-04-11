---
summary: "CLI de priorité à l'inférence pour les workflows de model, image, audio, TTS, vidéo, web et d'incorporation pris en charge par le provider"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLI d'inférence"
---

# CLI d'inférence

`openclaw infer` est l'interface canonique headless pour les workflows d'inférence pris en charge par le provider.

Elle expose intentionnellement des familles de fonctionnalités, et non les noms bruts des RPC de passerelle ni les ID bruts des outils d'agent.

## Transformer infer en une compétence

Copiez et collez ceci dans un agent :

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

Une bonne compétence basée sur infer devrait :

- mapper les intentions utilisateur courantes vers la bonne sous-commande infer
- inclure quelques exemples canoniques infer pour les workflows qu'elle couvre
- privilégier `openclaw infer ...` dans les exemples et suggestions
- éviter de redocumenter toute l'interface infer à l'intérieur du corps de la compétence

Couverture typique d'une compétence axée sur infer :

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## Pourquoi utiliser infer

`openclaw infer` fournit une CLI cohérente pour les tâches d'inférence prises en charge par le provider au sein d'OpenClaw.

Avantages :

- Utilisez les providers et models déjà configurés dans OpenClaw au lieu de créer des adaptateurs ponctuels pour chaque backend.
- Conservez les workflows de model, d'image, de transcription audio, de TTS, de vidéo, de web et d'incorporation sous une seule arborescence de commandes.
- Utilisez une forme de sortie `--json` stable pour les scripts, l'automatisation et les workflows pilotés par des agents.
- Privilégiez une interface OpenClaw de première partie lorsque la tâche est fondamentalement « exécuter une inférence ».
- Utilisez le chemin local normal sans exiger la passerelle pour la plupart des commandes infer.

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

| Tâche                               | Commande                                                               | Notes                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Exécuter une invite textuelle/model | `openclaw infer model run --prompt "..." --json`                       | Utilise le chemin local normal par défaut                       |
| Générer une image                   | `openclaw infer image generate --prompt "..." --json`                  | Utilisez `image edit` lorsque vous partez d'un fichier existant |
| Décrire un fichier image            | `openclaw infer image describe --file ./image.png --json`              | `--model` doit être `<provider/model>`                          |
| Transcrire l'audio                  | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` doit être `<provider/model>`                          |
| Synthétiser la parole               | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` est orienté passerelle                             |
| Générer une vidéo                   | `openclaw infer video generate --prompt "..." --json`                  |                                                                 |
| Décrire un fichier vidéo            | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` doit être `<provider/model>`                          |
| Rechercher sur le Web               | `openclaw infer web search --query "..." --json`                       |                                                                 |
| Récupérer une page Web              | `openclaw infer web fetch --url https://example.com --json`            |                                                                 |
| Créer des incorporations            | `openclaw infer embedding create --text "..." --json`                  |                                                                 |

## Comportement

- `openclaw infer ...` est l'interface CLI principale pour ces flux de travail.
- Utilisez `--json` lorsque la sortie sera consommée par une autre commande ou un autre script.
- Utilisez `--provider` ou `--model provider/model` lorsqu'un backend spécifique est requis.
- Pour `image describe`, `audio transcribe` et `video describe`, `--model` doit utiliser le formulaire `<provider/model>`.
- Les commandes d'exécution sans état sont par défaut locales.
- Les commandes d'état gérées par la passerelle sont par défaut sur la passerelle.
- Le chemin local normal ne nécessite pas l'exécution de la passerelle.

## Modèle

Utilisez `model` pour l'inférence de texte prise en charge par le provider et l'inspection de modèle/provider.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.4 --json
```

Remarques :

- `model run` réutilise le runtime de l'agent, de sorte que les remplacements de provider/modèle se comportent comme une exécution d'agent normale.
- `model auth login`, `model auth logout` et `model auth status` gèrent l'état d'authentification du provider enregistré.

## Image

Utilisez `image` pour la génération, l'édition et la description.

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
```

Remarques :

- Utilisez `image edit` lorsque vous partez de fichiers d'entrée existants.
- Pour `image describe`, `--model` doit être `<provider/model>`.

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

- `tts status` est défini par défaut sur gateway car il reflète l'état TTS géré par la passerelle.
- Utilisez `tts providers`, `tts voices` et `tts set-provider` pour inspecter et configurer le comportement TTS.

## Vidéo

Utilisez `video` pour la génération et la description.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notes :

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
  "model": "gpt-image-1",
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
