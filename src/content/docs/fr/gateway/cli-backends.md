---
summary: "Backends CLI : repli texte uniquement via les CLI IA locales"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "Backends CLI"
---

# Backends CLI (runtime de repli)

OpenClaw peut exécuter des **CLI IA locales** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limité en débit, ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils sont désactivés** (pas d'appels d'outils).
- **Texte en → texte out** (fiable).
- **Les sessions sont prises en charge** (afin que les tours de suivi restent cohérents).
- **Les images peuvent être transmises** si la CLI accepte les chemins d'images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
voulez des réponses texte « fonctionne toujours » sans dépendre d'API externes.

## Démarrage rapide adapté aux débutants

Vous pouvez utiliser la CLI Claude Code **sans aucune configuration** (OpenClaw est livré avec une valeur par défaut intégrée) :

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

La CLI Codex fonctionne également hors de la boîte :

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

Si votre passerelle s'exécute sous launchd/systemd et que le PATH est minimal, ajoutez simplement le
chemin de la commande :

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

C'est tout. Pas de clés, pas de configuration d'auth supplémentaire nécessaire au-delà de la CLI elle-même.

## Utilisation en tant que repli

Ajoutez un backend CLI à votre liste de repli pour qu'il ne s'exécute que lorsque les modèles principaux échouent :

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/opus-4.6", "claude-cli/opus-4.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/opus-4.6": {},
        "claude-cli/opus-4.5": {},
      },
    },
  },
}
```

Remarques :

- Si vous utilisez `agents.defaults.models` (liste d'autorisation), vous devez inclure `claude-cli/...`.
- Si le fournisseur principal échoue (auth, limites de débit, délais d'attente), OpenClaw essaiera
  ensuite le backend CLI.

## Aperçu de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **id de fournisseur** (ex. `claude-cli`, `my-cli`).
L'id de fournisseur devient le côté gauche de votre référence de modèle :

```
<provider>/<model>
```

### Exemple de configuration

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true,
        },
      },
    },
  },
}
```

## Fonctionnement

1. **Sélectionne un backend** basé sur le préfixe du fournisseur (`claude-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + contexte de l'espace de travail.
3. **Exécute la CLI** avec un id de session (si pris en charge) pour que l'historique reste cohérent.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Conserve les identifiants de session** par backend, afin que les suites réutilisent la même session CLI.

## Sessions

- Si la CLI prend en charge les sessions, définissez `sessionArg` (par exemple `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'identifiant doit être inséré
  dans plusieurs indicateurs.
- Si la CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez
  `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput`
  (pour les reprises non JSON).
- `sessionMode` :
  - `always` : envoyez toujours un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyez un identifiant de session uniquement si l'un a été stocké précédemment.
  - `none` : n'envoyez jamais d'identifiant de session.

## Images (pass-through)

Si votre CLI accepte les chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira des images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces
chemins sont transmis comme arguments CLI. Si `imageArg` est manquant, OpenClaw ajoute les
chemins de fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent
automatiquement les fichiers locaux à partir de chemins simples (comportement du CLI Claude Code).

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- `output: "jsonl"` analyse les flux JSONL (Codex CLI `--json`) et extrait le
  dernier message de l'agent ainsi que `thread_id` lorsqu'il est présent.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) transmet le prompt comme dernier argument CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (intégrées)

OpenClaw est fourni avec une valeur par défaut pour `claude-cli` :

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw est également livré avec une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Ne modifier que si nécessaire (courant : chemin absolu `command`).

## Limitations

- **Pas d'outils OpenClaw** (le backend CLI ne reçoit jamais d'appels d'outils). Certains CLI
  peuvent toujours exécuter leurs propres outils d'agent.
- **Pas de streaming** (la sortie CLI est collectée puis renvoyée).
- **Sorties structurées** dépendent du format JSON du CLI.
- **Sessions Codex CLI** reprennent via la sortie texte (pas de JSONL), ce qui est moins
  structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours
  normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Nom de CLI incorrect** : utilisez `modelAliases` pour mapper `provider/model` → CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas
  `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que le CLI prend en charge les chemins de fichiers).
