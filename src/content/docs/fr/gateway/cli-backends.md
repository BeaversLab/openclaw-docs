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

Vous pouvez utiliser Claude Code CLI **sans aucune configuration** (le plugin Anthropic inclus
enregistre un backend par défaut) :

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI fonctionne également hors de la boîte (via le plugin OpenAI inclus) :

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

Si vous utilisez un backend CLI inclus en tant que **fournisseur de messages principal** sur un
hôte de passerelle, OpenClaw charge désormais automatiquement le plugin inclus propriétaire lorsque votre configuration
référence explicitement ce backend dans une référence de modèle ou sous
`agents.defaults.cliBackends`.

## L'utiliser comme solution de repli

Ajoutez un backend CLI à votre liste de repli afin qu'il ne s'exécute que lorsque les modèles principaux échouent :

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

Notes :

- Si vous utilisez `agents.defaults.models` (liste d'autorisation), vous devez inclure `claude-cli/...`.
- Si le fournisseur principal échoue (auth, limites de débit, dépassements de délai), OpenClaw
  tentera ensuite le backend CLI.

## Vue d'ensemble de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **provider id** (ex. : `claude-cli`, `my-cli`).
L'identifiant du provider devient le côté gauche de votre référence de modèle :

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

1. **Sélectionne un backend** en fonction du préfixe du provider (`claude-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + le contexte de l'espace de travail.
3. **Exécute le CLI** avec un identifiant de session (si pris en charge) afin que l'historique reste cohérent.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (ex. : `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'identifiant doit être inséré
  dans plusieurs indicateurs.
- Si le CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput` (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : envoyez toujours un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : n'envoyez un identifiant de session que si un en a été stocké précédemment.
  - `none` : n'envoyez jamais d'identifiant de session.

## Images (transfert direct)

Si votre CLI accepte des chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces chemins sont passés en tant qu'arguments CLI. Si `imageArg` est manquant, OpenClaw ajoute les chemins des fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent automatiquement les fichiers locaux à partir de chemins simples (comportement de Claude Code CLI).

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'id de session.
- `output: "jsonl"` analyse les flux JSONL (Codex CLI `--json`) et extrait le dernier message de l'agent ainsi que `thread_id` lorsqu'il est présent.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) passe le prompt en tant que dernier argument CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (appartenant au plugin)

Le plugin Anthropic intégré enregistre une valeur par défaut pour `claude-cli` :

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

Le plugin OpenAI intégré enregistre également une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Le plugin Google fourni enregistre également une valeur par défaut pour `google-gemini-cli` :

- `command: "gemini"`
- `args: ["--prompt", "--output-format", "json"]`
- `resumeArgs: ["--resume", "{sessionId}", "--prompt", "--output-format", "json"]`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Remplacez uniquement si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut du plugin

Les valeurs par défaut du backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du provider dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` remplace toujours la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste géré par le plugin via le hook optionnel
  `normalizeConfig`.

## Limitations

- **Pas d'outils OpenClaw** (le backend CLI ne reçoit jamais d'appels d'outils). Certains CLI
  peuvent toujours exécuter leurs propres outils d'agent.
- **Pas de streaming** (la sortie CLI est collectée puis renvoyée).
- **Les sorties structurées** dépendent du format JSON du CLI.
- **Les sessions CLI de Codex** reprennent via la sortie texte (pas de JSONL), ce qui est moins
  structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours
  normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model` → modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas
  `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que le CLI prend en charge les chemins de fichiers).
