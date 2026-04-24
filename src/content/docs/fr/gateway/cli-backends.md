---
summary: "Backends CLI : repli local pour les IA CLI avec pont MCP tool optionnel"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "Backends CLI"
---

# Backends CLI (runtime de repli)

OpenClaw peut exécuter des **CLI IA locales** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limité en débit, ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils OpenClaw ne sont pas injectés directement**, mais les backends avec `bundleMcp: true`
  peuvent recevoir les outils de la passerelle via un pont MCP de bouclage.
- **Streaming JSONL** pour les CLI qui le prennent en charge.
- **Les sessions sont prises en charge** (afin que les tours de suivi restent cohérents).
- **Les images peuvent être transmises** si la CLI accepte les chemins d'images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
voulez des réponses texte « fonctionne toujours » sans dépendre d'API externes.

Si vous souhaitez un runtime harnaché complet avec des contrôles de session ACP, des tâches d'arrière-plan,
une liaison thread/conversation et des sessions de codage externes persistantes, utilisez
[ACP Agents](/fr/tools/acp-agents) à la place. Les backends CLI ne sont pas de l'ACP.

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

Si vous utilisez un backend CLI groupé comme **fournisseur de messages principal** sur un
hôte de passerelle, OpenClaw charge désormais automatiquement le plugin groupé propriétaire lorsque votre configuration
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

- Si vous utilisez `agents.defaults.models` (liste autorisée), vous devez y inclure également vos modèles de backend CLI.
- Si le fournisseur principal échoue (auth, limites de débit, dépassements de délai), OpenClaw
  tentera ensuite le backend CLI.

## Vue d'ensemble de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est cléée par un **id de fournisseur** (ex. `codex-cli`, `my-cli`).
L'id de fournisseur devient la partie gauche de votre référence de modèle :

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
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
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
   Le backend `claude-cli` inclus maintient un processus stdio Claude en vie par
   session OpenClaw et envoie les tours suivants via stdin stream-.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend Anthropic `claude-cli` inclus est à nouveau pris en charge. L'équipe Anthropic nous a indiqué que l'utilisation du CLI Claude style OpenClaw est à nouveau autorisée, donc CLI considère l'utilisation de `claude -p` comme approuvée pour cette intégration, sauf si OpenClaw publie une nouvelle politique.</Note>

Le backend OpenAI `codex-cli` inclus fait passer le système de prompt de OpenClaw via
la substitution de configuration `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex n'expose pas d'option
`--append-system-prompt` style Claude, donc OpenClaw écrit le prompt assemblé dans un
fichier temporaire pour chaque nouvelle session CLI Codex CLI.

Le backend Anthropic `claude-cli` inclus reçoit l'instantané des compétences OpenClaw
de deux manières : le catalogue compact des compétences OpenClaw dans le système de prompt ajouté, et
un plugin Claude Code temporaire passé avec `--plugin-dir`. Le plugin contient
uniquement les compétences éligibles pour cet agent/session, afin que le résolveur de compétences natif de Claude Code
voie le même ensemble filtré que OpenClaw annoncerait autrement dans
le prompt. Les substitutions de clé env/API des compétences sont toujours appliquées par OpenClaw à l'
environnement du processus enfant pour l'exécution.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (p. ex. `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré
  dans plusieurs options.
- Si le CLI utilise une **sous-commande de reprise** avec différentes options, définissez
  `resumeArgs` (remplace `args` lors de la reprise) et optionnellement `resumeOutput`
  (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : envoyez toujours un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : n'envoyer un identifiant de session que si l'un a été stocké précédemment.
  - `none` : n'envoyer jamais d'identifiant de session.
- `claude-cli` est défini par défaut sur `liveSession: "claude-stdio"`, `output: "jsonl"` et `input: "stdin"`, de sorte que les tours suivants réutilisent le processus Claude en cours d'exécution tant qu'il est actif. Le stdio chaud est désormais la valeur par défaut, y compris pour les configurations personnalisées qui omettent les champs de transport. Si le Gateway redémarre ou si le processus inactif se termine, OpenClaw reprend à partir de l'identifiant de session Claude stocké. Les identifiants de session stockés sont vérifiés par rapport à une transcription de projet lisible existante avant la reprise, de sorte que les liaisons fantômes sont effacées avec `reason=transcript-missing` au lieu de démarrer silencieusement une nouvelle session Claude CLI sous `--resume`.
- Les sessions CLI stockées sont une continuité appartenant au fournisseur. La réinitialisation quotidienne implicite de la session ne les coupe pas ; les politiques `/reset` et `session.reset` explicites le font toujours.

Notes de sérialisation :

- `serialize: true` maintient les exécutions de même voie ordonnées.
- La plupart des CLI sérialisent sur une voie de fournisseur.
- OpenClaw abandonne la réutilisation de la session CLI stockée lorsque l'identité d'authentification sélectionnée change, y compris un identifiant de profil d'authentification modifié, une clé statique API, un jeton statique, ou une identité de compte OAuth lorsque le CLI en expose une. La rotation des jetons d'accès et de rafraîchissement OAuth ne coupe pas la session CLI stockée. Si un CLI n'expose pas d'identifiant de compte OAuth stable, OpenClaw permet à ce CLI d'appliquer les autorisations de reprise.

## Images (transmission directe)

Si votre CLI accepte les chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces chemins sont passés comme arguments de CLI. Si `imageArg` est manquant, OpenClaw ajoute les chemins de fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent automatiquement les fichiers locaux à partir de chemins simples.

## Entrées / sorties

- `output: "json"` (par défaut) tente d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- Pour la sortie JSON du CLI Gemini, OpenClaw lit le texte de réponse à partir de `response` et l'utilisation à partir de `stats` lorsque `usage` est manquant ou vide.
- `output: "jsonl"` analyse les flux JSONL (par exemple Codex CLI `--json`) et extrait le message final de l'agent ainsi que les identifiants de session lorsqu'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) transmet le prompt comme dernier argument CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (appartenant au plugin)

Le plugin OpenAI intégré enregistre également une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Le plugin Google intégré enregistre également une valeur par défaut pour `google-gemini-cli` :

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Prérequis : le Gemini CLI local doit être installé et disponible en tant que
`gemini` sur `PATH` (`brew install gemini-cli` ou
`npm install -g @google/gemini-cli`).

Notes JSON du Gemini CLI :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw déduit les tokens d'entrée de
  `stats.input_tokens - stats.cached`.

Ne remplacez que si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut appartenant au plugin

Les valeurs par défaut du backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` prévaut toujours sur la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste géré par le plugin via le hook optionnel
  `normalizeConfig`.

Les plugins qui ont besoin de petits shims de compatibilité de prompt/message peuvent déclarer des transformations de texte bidirectionnelles sans remplacer un provider ou un backend CLI :

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` réécrit le système de prompt et le prompt utilisateur transmis au CLI. `output`
réécrit les deltas de l'assistant diffusés en continu et le texte final analysé avant que OpenClaw ne traite
ses propres marqueurs de contrôle et la diffusion sur le channel.

Pour les CLI qui émettent du JSONL compatible avec le stream- de Claude Code, définissez
`jsonlDialect: "claude-stream-json"` dans la configuration de ce backend.

## Regrouper les superpositions MCP

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut
opter pour une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `codex-cli` : substitutions de configuration en ligne pour `mcp_servers`
- `google-gemini-cli` : fichier des paramètres système Gemini généré

Lorsque le groupement MCP est activé, OpenClaw :

- lance un serveur MCP HTTP de boucle locale qui expose les outils de la passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils à la session, au compte et au contexte actuels
- charge les serveurs MCP bundle activés pour l'espace de travail actuel
- les fusionne avec toute forme de configuration/paramètres MCP de backend existante
- réécrit la configuration de lancement en utilisant le mode d'intégration propriétaire du backend provenant de l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte toujours une configuration stricte lorsqu'un
backend opte pour le bundle MCP afin que les exécutions en arrière-plan restent isolées.

## Limitations

- **Pas d'appels d'outil OpenClaw directs.** OpenClaw n'injecte pas d'appels d'outil dans
  le protocole du backend CLI. Les backends ne voient les outils de la passerelle que s'ils optent pour
  `bundleMcp: true`.
- **Le streaming est spécifique au backend.** Certains backends diffusent du JSONL ; d'autres mettent en tampon
  jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON du CLI.
- **Les sessions Codex CLI** reprennent via une sortie texte (pas de JSONL), ce qui est moins structuré que l'exécution initiale de `--json`. Les sessions OpenClaw fonctionnent toujours normalement.

## Dépannage

- **CLI introuvable** : définissez `command` avec un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model` → modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que le CLI prend en charge les chemins de fichiers).
