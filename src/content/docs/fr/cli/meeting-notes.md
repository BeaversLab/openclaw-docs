---
summary: "CLIRéférence CLI pour `openclaw meeting-notes` (lister, afficher et localiser les notes de réunion stockées)"
read_when:
  - You want to read stored meeting note summaries from the terminal
  - You need the path to a meeting notes markdown summary
  - You are debugging the meeting-notes plugin storage layout
title: "CLICLI Notes de réunion"
---

# `openclaw meeting-notes`

Inspectez les notes de réunion écrites par le plugin externe `meeting-notes`CLI. Cette CLI
est en lecture seule et est disponible lorsque ce plugin est installé ou chargé depuis
la source. La capture, l'importation et la synthèse sont gérées par l'outil
agent `meeting_notes` et par les sources de démarrage automatique configurées.

Utilisez la CLI lorsque vous souhaitez trouver les notes d'hier, ouvrir le fichier Markdown dans
un éditeur, transmettre une transcription à un autre outil, ou déboguer l'emplacement sur le
disque d'une session. Elle ne démarre ni n'arrête la capture.

Les artefacts résident dans le répertoire d'état OpenClaw :

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

Le répertoire d'état par défaut est `~/.openclaw` ; définissez `OPENCLAW_STATE_DIR` pour en
utiliser un autre. Le répertoire de date provient de l'heure de début de la session, et le
répertoire de session est un segment de système de fichiers sûr dérivé de l'identifiant de session.

## Commandes

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes show YYYY-MM-DD/<session>
openclaw meeting-notes path <session>
openclaw meeting-notes path YYYY-MM-DD/<session>
openclaw meeting-notes path <session> --dir
openclaw meeting-notes path <session> --metadata
openclaw meeting-notes path <session> --transcript
openclaw meeting-notes list --json
openclaw meeting-notes show <session> --json
openclaw meeting-notes path <session> --json
```

- `list` : lister les sessions stockées, le sélecteur qualifié par date, l'heure de début, le titre et le chemin `summary.md`.
- `show <session>` : afficher le `summary.md` stocké.
- `path <session>` : afficher le chemin `summary.md`.
- `path <session> --dir` : afficher le répertoire de session.
- `path <session> --metadata` : afficher `metadata.json`.
- `path <session> --transcript` : afficher `transcript.jsonl`.
- `--json` : afficher une sortie lisible par machine.

Lorsqu'un identifiant de session humain se répète sur plusieurs jours, utilisez le sélecteur qualifié par date
de `list`, par exemple `openclaw meeting-notes show 2026-05-22/standup`.
Les identifiants de session par défaut incluent un horodatage et un suffixe aléatoire ; configurez des identifiants
de session fixes uniquement lorsqu'ils sont uniques dans la journée.

## Sortie

`list` affiche une session par ligne :

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/meeting-notes/2026-05-22/standup/summary.md
```

La sortie est séparée par des tabulations. Les colonnes sont le sélecteur, l'heure de début, le titre et le chemin du résumé. Le sélecteur est la valeur la plus sûre à repasser à `show` ou `path`.

`list --json` affiche des objets avec :

- `sessionId`
- `selector`
- `date`
- `title`
- `startedAt`
- `stoppedAt`
- `source`
- `path`
- `summaryPath`
- `hasSummary`

`show --json` renvoie les métadonnées de session stockées, le sélecteur, le répertoire de la session, le chemin du résumé et le texte Markdown du résumé. `path --json` renvoie le chemin sélectionné et indique si ce fichier existe.

## Plusieurs réunions par jour

Meeting Notes regroupe les sessions par date, puis par id de session. Dix réunions un même jour deviennent dix dossiers frères :

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

Utilisez les id générés par défaut pour la plupart des automatisations. Utilisez un id fixe tel que `standup` uniquement lorsque le même id ne sera pas utilisé deux fois le même jour.

## Résumés manquants

Les sessions en direct écrivent `summary.md` lorsque la session s'arrête. Les transcriptions importées écrivent `summary.md` immédiatement après l'importation. Une session peut toujours apparaître dans `list` sans résumé lorsque la capture est active, qu'un provider a échoué pendant l'arrêt, ou que des métadonnées ont été écrites avant l'arrivée des énoncés.

Utilisez `path <session> --transcript` pour inspecter la transcription en ajout uniquement, et utilisez l'action de tool `meeting_notes` `summarize` pour régénérer le résumé Markdown.

Consultez [Meeting Notes](/fr/plugins/meeting-notes) pour la configuration, le démarrage automatique et les détails du source-provider.
