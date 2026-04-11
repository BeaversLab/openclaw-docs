---
summary: "Backends CLI : repli local AI CLI avec pont d'outils MCP optionnel"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "Backends CLI"
---

# Backends CLI (runtime de repli)

OpenClaw peut exécuter des **CLI IA locales** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limité en débit, ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils OpenClaw ne sont pas injectés directement**, mais les backends avec `bundleMcp: true` peuvent recevoir les outils de la passerelle via un pont MCP de bouclage.
- **Streaming JSONL** pour les CLI qui le prennent en charge.
- **Les sessions sont prises en charge** (afin que les tours de suivi restent cohérents).
- **Les images peuvent être transmises** si la CLI accepte les chemins d'images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
voulez des réponses texte « fonctionne toujours » sans dépendre d'API externes.

Si vous souhaitez un runtime de harnais complet avec des contrôles de session ACP, des tâches d'arrière-plan, la liaison thread/conversation et des sessions de codage externes persistantes, utilisez plutôt [ACP Agents](/en/tools/acp-agents). Les backends CLI ne sont pas de l'ACP.

## Démarrage rapide pour débutants

Vous pouvez utiliser Codex CLI **sans aucune configuration** (le plugin OpenAI intégré enregistre un backend par défaut) :

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
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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
        fallbacks: ["codex-cli/gpt-5.4"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.4": {},
      },
    },
  },
}
```

Notes :

- Si vous utilisez `agents.defaults.models` (liste d'autorisation), vous devez y inclure vos modèles de backend CLI également.
- Si le fournisseur principal échoue (auth, limites de débit, dépassements de délai), OpenClaw
  tentera ensuite le backend CLI.

## Vue d'ensemble de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **id de fournisseur** (par ex. `codex-cli`, `my-cli`).
L'identifiant du fournisseur devient la partie gauche de votre référence de modèle :

```
<provider>/<model>
```

### Exemple de configuration

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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

1. **Sélectionne un backend** basé sur le préfixe du fournisseur (`codex-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + le contexte de l'espace de travail.
3. **Exécute le CLI** avec un identifiant de session (si pris en charge) afin que l'historique reste cohérent.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend Anthropic `claude-cli` intégré est à nouveau pris en charge. Le personnel d'Anthropic nous a informé que l'utilisation de la CLI Claude style OpenClaw est à nouveau autorisée, donc OpenClaw considère l'usage de `claude -p` comme approuvé pour cette intégration, sauf si Anthropic publie une nouvelle politique.</Note>

## Sessions

- Si la CLI prend en charge les sessions, définissez `sessionArg` (par ex. `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré
  dans plusieurs indicateurs.
- Si la CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez
  `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput`
  (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : toujours envoyer un id de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyer un id de session uniquement si un a été stocké précédemment.
  - `none` : n'envoyer jamais d'id de session.

Notes de sérialisation :

- `serialize: true` maintient l'ordre des exécutions sur la même voie.
- La plupart des CLI sérialisent sur une voie de fournisseur unique.
- OpenClaw abandonne la réutilisation de la session CLI stockée lorsque l'état d'authentification du backend change, y compris lors d'une reconnexion, d'une rotation de jeton ou d'un changement d'identifiant dans le profil d'authentification.

## Images (transmission directe)

Si votre CLI accepte des chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces chemins sont passés en tant qu'arguments de la CLI. Si `imageArg` est manquant, OpenClaw ajoute les chemins des fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent automatiquement les fichiers locaux à partir de chemins simples.

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'ID de session.
- Pour la sortie JSON de la CLI Gemini, OpenClaw lit le texte de réponse depuis `response` et l'utilisation depuis `stats` lorsque `usage` est manquant ou vide.
- `output: "jsonl"` analyse les flux JSONL (par exemple Codex CLI `--json`) et extrait le message final de l'agent ainsi que les identifiants de session s'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) passe le prompt comme dernier argument de la CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (appartenant au plugin)

Le plugin OpenAI inclus enregistre également une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Le plugin Google inclus enregistre également une valeur par défaut pour `google-gemini-cli` :

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Prérequis : le CLI Gemini local doit être installé et disponible sous `gemini` sur `PATH` (`brew install gemini-cli` ou `npm install -g @google/gemini-cli`).

Notes JSON du CLI Gemini :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw dérive les jetons d'entrée de `stats.input_tokens - stats.cached`.

Remplacez uniquement si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut du plugin

Les valeurs par défaut du backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` remplace toujours la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste géré par le plugin via le hook optionnel `normalizeConfig`.

## Superpositions MCP groupées

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut opter pour une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `codex-cli` : remplacements de configuration en ligne pour `mcp_servers`
- `google-gemini-cli` : fichier de paramètres système Gemini généré

Lorsque le MCP groupé est activé, OpenClaw :

- lance un serveur MCP HTTP de boucle qui expose les outils de la passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils à la session, au compte et au contexte de canal actuels
- charge les serveurs MCP groupés activés pour l'espace de travail actuel
- les fusionne avec toute forme de configuration/paramètres MCP de backend existante
- réécrit la configuration de lancement en utilisant le mode d'intégration détenu par le backend depuis l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte toujours une configuration stricte lorsqu'un backend opte pour le MCP groupé afin que les exécutions en arrière-plan restent isolées.

## Limitations

- **Pas d'appels directs aux outils OpenClaw.** OpenClaw n'injecte pas d'appels d'outils dans le protocole backend CLI. Les backends ne voient les outils de la passerelle que s'ils activent `bundleMcp: true`.
- **Le streaming est spécifique au backend.** Certains backends diffusent du JSONL ; d'autres tamponnent jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON de la CLI.
- **Les sessions Codex CLI** reprennent via une sortie textuelle (pas de JSONL), ce qui est moins structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model` → le modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que la CLI prend en charge les chemins de fichiers).
