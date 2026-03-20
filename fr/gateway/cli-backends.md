---
summary: "CLI backends: repli texte uniquement via des CLI IA locales"
read_when:
  - Vous souhaitez un repli fiable lorsque les fournisseurs API échouent
  - Vous exécutez Claude Code CLI ou d'autres CLI IA locales et souhaitez les réutiliser
  - Vous avez besoin d'un chemin sans outil, texte uniquement, qui prend toujours en charge les sessions et les images
title: "Backends CLI"
---

# CLI backends (runtime de repli)

OpenClaw peut exécuter des **CLI IA locales** comme un **repli texte uniquement** lorsque les fournisseurs API sont en panne,
limités en débit ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils sont désactivés** (pas d'appels d'outil).
- **Texte entrant → texte sortant** (fiable).
- **Les sessions sont prises en charge** (afin que les tours de suivi restent cohérents).
- **Les images peuvent être transmises** si la CLI accepte les chemins d'image.

Il est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
souhaitez des réponses texte « toujours fonctionnelles » sans dépendre d'API externes.

## Démarrage rapide adapté aux débutants

Vous pouvez utiliser Claude Code CLI **sans aucune configuration** (OpenClaw fournit une valeur par défaut intégrée) :

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI fonctionne également directement :

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

C'est tout. Aucune clé, aucune configuration d'auth supplémentaire n'est nécessaire au-delà de la CLI elle-même.

## Utilisation comme repli

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
- Si le fournisseur principal échoue (auth, limites de débit, délais d'attente), OpenClaw
  essaiera ensuite le backend CLI.

## Aperçu de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **id de fournisseur** (par ex. `claude-cli`, `my-cli`).
L'id du fournisseur devient le côté gauche de votre référence de modèle :

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
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet",
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

1. **Sélectionne un backend** en fonction du préfixe du fournisseur (`claude-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + contexte de l'espace de travail.
3. **Exécute la CLI** avec un id de session (si pris en charge) afin que l'historique reste cohérent.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Conserve les ids de session** par backend, afin que les suites réutilisent la même session CLI.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (p. ex. `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré
  dans plusieurs indicateurs.
- Si le CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez
  `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput`
  (pour les reprises non JSON).
- `sessionMode` :
  - `always` : envoyez toujours un id de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyez un id de session uniquement si un a été stocké précédemment.
  - `none` : n'envoyez jamais un id de session.

## Images (transfert direct)

Si votre CLI accepte les chemins d'images, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira des images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces
chemins sont transmis comme arguments de CLI. Si `imageArg` est manquant, OpenClaw ajoute les
chemins de fichiers à l'invite (injection de chemin), ce qui suffit pour les CLI qui chargent
automatiquement les fichiers locaux à partir de chemins simples (comportement du CLI Claude Code).

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'id de session.
- `output: "jsonl"` analyse les flux JSONL (Codex CLI `--json`) et extrait le
  dernier message de l'agent plus `thread_id` lorsqu'il est présent.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) transmet l'invite comme dernier argument CLI.
- `input: "stdin"` envoie l'invite via stdin.
- Si l'invite est très longue et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (intégrées)

OpenClaw fournit une valeur par défaut pour `claude-cli` :

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw fournit également une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Ne remplacer que si nécessaire (courant : chemin absolu `command`).

## Limitations

- **Pas d'outils OpenClaw** (le backend CLI ne reçoit jamais d'appels d'outils). Certaines CLI peuvent toujours exécuter leurs propres outils d'agent.
- **Pas de streaming** (la sortie CLI est collectée puis renvoyée).
- **Les sorties structurées** dépendent du format JSON de la CLI.
- **Les sessions Codex CLI** reprennent via la sortie texte (pas de JSONL), ce qui est moins structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Mauvais nom de model** : utilisez `modelAliases` pour mapper `provider/model` → model CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que la CLI prend en charge les chemins de fichiers).

import fr from "/components/footer/fr.mdx";

<fr />
