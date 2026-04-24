---
summary: "Exportez des bundles de trajectoire rédigés pour le débogage d'une session d'agent OpenClaw"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "Bundles de trajectoire"
---

# Bundles de trajectoire

La capture de trajectoire est l'enregistreur de vol par session d'OpenClaw. Elle enregistre une chronologie structurée pour chaque exécution d'agent, puis `/export-trajectory` empaquette la session actuelle dans un bundle de support rédigé.

Utilisez-le lorsque vous devez répondre à des questions telles que :

- Quels prompts, prompts système et outils ont été envoyés au modèle ?
- Quels messages de transcription et appels d'outils ont conduit à cette réponse ?
- L'exécution a-t-elle expiré, a-t-elle été abandonnée, compactée ou a-t-elle rencontré une erreur de fournisseur ?
- Quel modèle, quels plugins, compétences et paramètres d'exécution étaient actifs ?
- Quelles métadonnées d'utilisation et de cache de prompt le fournisseur a-t-il renvoyées ?

## Quick start

Envoyez ceci dans la session active :

```text
/export-trajectory
```

Alias :

```text
/trajectory
```

OpenClaw écrit le bundle sous l'espace de travail :

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

Vous pouvez choisir un nom de répertoire de sortie relatif :

```text
/export-trajectory bug-1234
```

Le chemin personnalisé est résolu à l'intérieur de `.openclaw/trajectory-exports/`. Les chemins absolus et les chemins `~` sont rejetés.

## Accès

L'exportation de trajectoire est une commande de propriétaire. L'expéditeur doit réussir les vérifications d'autorisation de commande normales et les vérifications de propriétaire pour le canal.

## Ce qui est enregistré

La capture de trajectoire est activée par défaut pour les exécutions d'agent OpenClaw.

Les événements d'exécution incluent :

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

Les événements de transcription sont également reconstruits à partir de la branche de session active :

- messages utilisateur
- messages de l'assistant
- appels d'outils
- résultats des outils
- compactages
- changements de modèle
- étiquettes et entrées de session personnalisées

Les événements sont écrits sous forme de JSON Lines avec ce marqueur de schéma :

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## Fichiers de bundle

Un bundle exporté peut contenir :

| Fichier               | Contenu                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`       | Schéma de bundle, fichiers source, nombre d'événements et liste des fichiers générés                                       |
| `events.jsonl`        | Chronologie d'exécution et de transcription ordonnée                                                                       |
| `session-branch.json` | Branche de transcription active rédigée et en-tête de session                                                              |
| `metadata.json`       | Version d'OpenClaw, OS/runtime, modèle, instantané de la configuration, plugins, compétences et métadonnées de prompt      |
| `artifacts.json`      | Statut final, erreurs, utilisation, cache de prompt, nombre de compactages, texte de l'assistant et métadonnées de l'outil |
| `prompts.json`        | Prompts soumis et détails sélectionnés de la construction du prompt                                                        |
| `system-prompt.txt`   | Dernier prompt système compilé, lors de la capture                                                                         |
| `tools.json`          | Définitions des outils envoyées au modèle, lors de la capture                                                              |

`manifest.json` liste les fichiers présents dans ce bundle. Certains fichiers sont omis lorsque la session n'a pas capturé les données d'exécution correspondantes.

## Emplacement de capture

Par défaut, les événements de trajectoire d'exécution sont écrits à côté du fichier de session :

```text
<session>.trajectory.jsonl
```

OpenClaw écrit également un fichier pointeur de « meilleur effort » à côté de la session :

```text
<session>.trajectory-path.json
```

Définissez `OPENCLAW_TRAJECTORY_DIR` pour stocker les sidecars de trajectoire d'exécution dans un répertoire dédié :

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

Lorsque cette variable est définie, OpenClaw écrit un fichier JSONL par identifiant de session dans ce répertoire.

## Désactiver la capture

Définissez `OPENCLAW_TRAJECTORY=0` avant de démarrer OpenClaw :

```bash
export OPENCLAW_TRAJECTORY=0
```

Cela désactive la capture de la trajectoire d'exécution. `/export-trajectory` peut toujours exporter la branche de transcription, mais les fichiers exclusivement liés à l'exécution tels que le contexte compilé, les artefacts du fournisseur et les métadonnées de prompt peuvent être manquants.

## Confidentialité et limites

Les bundles de trajectoire sont conçus pour le support et le débogage, pas pour la publication publique. OpenClaw masque les valeurs sensibles avant d'écrire les fichiers d'exportation :

- identifiants et champs de payload connus comme étant des secrets
- données d'image
- chemins d'état locaux
- chemins de l'espace de travail, remplacés par `$WORKSPACE_DIR`
- chemins du répertoire personnel, lorsqu'ils sont détectés

L'exportateur limite également la taille de l'entrée :

- fichiers sidecar d'exécution : 50 Mio
- fichiers de session : 50 Mio
- événements d'exécution : 200 000
- total des événements exportés : 250 000
- les lignes d'événements d'exécution individuelles sont tronquées au-delà de 256 Kio

Examinez les bundles avant de les partager en dehors de votre équipe. Le masquage est de « meilleur effort » et ne peut pas connaître chaque secret spécifique à l'application.

## Dépannage

Si l'exportation ne contient pas d'événements d'exécution :

- confirmez que OpenClaw a été démarré sans `OPENCLAW_TRAJECTORY=0`
- vérifiez si `OPENCLAW_TRAJECTORY_DIR` pointe vers un répertoire accessible en écriture
- exécutez un autre message dans la session, puis exportez à nouveau
- inspect `manifest.json` pour `runtimeEventCount`

Si la commande rejette le chemin de sortie :

- utilisez un nom relatif comme `bug-1234`
- ne passez pas `/tmp/...` ou `~/...`
- gardez l'exportation à l'intérieur de `.openclaw/trajectory-exports/`

Si l'exportation échoue avec une erreur de taille, la session ou le sidecar a dépassé les
limites de sécurité d'exportation. Commencez une nouvelle session ou exportez une
reproduction plus petite.
