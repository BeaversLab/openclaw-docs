---
summary: "OpenClawExporter des bundles de trajectoire révisés pour le débogage d'une session agent OpenClaw"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "Bundles de trajectoire"
---

La capture de trajectoire est l'enregistreur de vol par session d'OpenClaw. Elle enregistre une chronologie structurée pour chaque exécution d'agent, puis OpenClaw`/export-trajectory` empaquette la session actuelle dans un bundle de support révisé.

Utilisez-le lorsque vous devez répondre à des questions telles que :

- Quels prompt, système de prompt et outils ont été envoyés au modèle ?
- Quels messages de transcription et quels appels d'outils ont conduit à cette réponse ?
- L'exécution a-t-elle expiré, a-t-elle été abandonnée, compactée ou a-t-elle rencontré une erreur de fournisseur ?
- Quel modèle, quels plugins, compétences et paramètres d'exécution étaient actifs ?
- Quelles métadonnées d'utilisation et de cache de prompt le fournisseur a-t-il renvoyées ?

Si vous soumettez un rapport de support général pour un problème en direct sur Gateway, commencez par [Gateway`/diagnostics`](/fr/gateway/diagnostics#chat-commandGatewayOpenAIOpenAI). Le module de diagnostic collecte le bundle Gateway assaini et, pour les sessions du harnais OpenAI Codex, peut également envoyer des commentaires Codex aux serveurs OpenAI après approbation. Utilisez `/export-trajectory` lorsque vous avez spécifiquement besoin de la chronologique détaillée par session des prompts, des outils et des transcriptions.

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

Les bundles de trajectoire peuvent contenir des prompts, des messages de modèle, des schémas d'outils, des résultats d'outils, des événements d'exécution et des chemins locaux. La commande slash de chat s'exécute donc via l'approbation d'exécution à chaque fois. Approuvez l'exportation une fois lorsque vous avez l'intention de créer le bundle ; n'utilisez pas autoriser-tout (allow-all). Dans les chats de groupe, OpenClaw envoie la demande d'approbation et le résultat de l'exportation au propriétaire de manière privée au lieu de publier les détails de la trajectoire dans la salle partagée.

Pour une inspection locale ou des workflows de support, vous pouvez également exécuter directement le chemin de commande approuvé :

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

## Accès

L'exportation de trajectoire est une commande de propriétaire. L'expéditeur doit réussir les vérifications d'autorisation de commande normales et les vérifications de propriétaire pour le channel.

## Ce qui est enregistré

La capture de trajectoire est activée par défaut pour les exécutions d'agent OpenClaw.

Les événements d'exécution incluent :

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.fallback_step`, y compris le modèle source, le modèle suivant, la raison/détail de l'échec, la position dans la chaîne et si le repli a avancé, réussi ou épuisé la chaîne
- `model.completed`
- `trace.artifacts`
- `session.ended`

Les événements de transcription sont également reconstruits à partir de la branche de session active :

- messages utilisateur
- messages de l'assistant
- appels de tool
- résultats des tools
- compactages
- changements de model
- étiquettes et entrées de session personnalisées

Les événements sont écrits en JSON Lines avec ce marqueur de schéma :

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## Fichiers de bundle

Un bundle exporté peut contenir :

| Fichier               | Contenu                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`       | Schéma du bundle, fichiers source, comptes d'événements et liste des fichiers générés                                                   |
| `events.jsonl`        | Chronologie d'exécution et de transcription ordonnée                                                                                    |
| `session-branch.json` | Branche de transcription active révisée et en-tête de session                                                                           |
| `metadata.json`       | Version d'OpenClaw, système d'exploitation/exécution, model, instantané de configuration, plugins, compétences et métadonnées de prompt |
| `artifacts.json`      | Statut final, erreurs, utilisation, cache de prompt, nombre de compactages, texte de l'assistant et métadonnées des tools               |
| `prompts.json`        | Prompts soumis et détails sélectionnés de la construction de prompt                                                                     |
| `system-prompt.txt`   | Dernier prompt système compilé, lors de la capture                                                                                      |
| `tools.json`          | Définitions des tools envoyées au model, lors de la capture                                                                             |

`manifest.json` liste les fichiers présents dans ce bundle. Certains fichiers sont omis
lorsque la session n'a pas capturé les données d'exécution correspondantes.

## Emplacement de capture

Par défaut, les événements de trajectoire d'exécution sont écrits à côté du fichier de session :

```text
<session>.trajectory.jsonl
```

OpenClaw écrit également un fichier pointeur de meilleur effort à côté de la session :

```text
<session>.trajectory-path.json
```

Définissez `OPENCLAW_TRAJECTORY_DIR` pour stocker les sidecars de trajectoire d'exécution dans un
répertoire dédié :

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

Lorsque cette variable est définie, OpenClaw écrit un fichier JSONL par identifiant de session dans ce
répertoire.

La maintenance de session supprime les sidecars de trajectoire lorsque leur entrée de session propriétaire
est élaguée, plafonnée ou évictée par le budget disque des sessions. Les fichiers d'exécution en dehors
du répertoire des sessions ne sont supprimés que lorsque la cible du pointeur prouve toujours
qu'elle appartient à cette session.

## Désactiver la capture

Définissez `OPENCLAW_TRAJECTORY=0`OpenClaw avant de démarrer OpenClaw :

```bash
export OPENCLAW_TRAJECTORY=0
```

Cela désactive la capture de trajectoire à l'exécution. `/export-trajectory` peut toujours exporter
la branche de transcription, mais les fichiers exclusifs à l'exécution tels que le contexte compilé,
les artefacts du provider et les métadonnées de prompt peuvent manquer.

## Confidentialité et limites

Les bundles de trajectoires sont conçus pour le support et le débogage, pas pour la publication publique.
OpenClaw masque les valeurs sensibles avant d'écrire les fichiers d'export :

- les identifiants et les champs de payload connus comme étant des secrets
- les données d'image
- les chemins d'état local
- les chemins de l'espace de travail, remplacés par `$WORKSPACE_DIR`
- les chemins du répertoire personnel, lorsqu'ils sont détectés

L'exportateur limite également la taille de l'entrée :

- fichiers sidecar d'exécution : la capture en direct s'arrête à 10 Mo et enregistre un événement de troncation lorsque de l'espace reste ; l'export accepte les sidecars d'exécution existants jusqu'à 50 Mo
- fichiers de session : 50 Mo
- événements d'exécution : 200 000
- total des événements exportés : 250 000
- les lignes d'événements d'exécution individuelles sont tronquées au-delà de 256 Ko

Révisez les bundles avant de les partager en dehors de votre équipe. Le masquage est fait au mieux
et ne peut pas connaître tous les secrets spécifiques à l'application.

## Dépannage

Si l'export n'a pas d'événements d'exécution :

- confirmez que OpenClaw a été démarré sans `OPENCLAW_TRAJECTORY=0`
- vérifiez si `OPENCLAW_TRAJECTORY_DIR` pointe vers un répertoire accessible en écriture
- exécutez un autre message dans la session, puis exportez à nouveau
- inspectez `manifest.json` pour `runtimeEventCount`

Si la commande rejette le chemin de sortie :

- utilisez un nom relatif comme `bug-1234`
- ne passez pas `/tmp/...` ou `~/...`
- gardez l'export à l'intérieur de `.openclaw/trajectory-exports/`

Si l'export échoue avec une erreur de taille, la session ou le sidecar a dépassé les
limites de sécurité d'export. Commencez une nouvelle session ou exportez une reproduction plus petite.

## Connexes

- [Diffs](/fr/tools/diffs)
- [Gestion de session](/fr/concepts/session)
- [Tool Exec](/fr/tools/exec)
