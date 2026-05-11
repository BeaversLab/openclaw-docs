---
summary: "Backends CLI : repli CLI IA local avec pont d'outils MCP optionnel"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "Backends CLI"
---

OpenClaw peut exécuter des **CLIs IA locaux** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limités par débit ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils OpenClaw ne sont pas injectés directement**, mais les backends avec `bundleMcp: true`
  peuvent recevoir des outils de passerelle via un pont MCP de bouclage.
- **Streaming JSONL** pour les CLIs qui le prennent en charge.
- **Les sessions sont prises en charge** (afin que les tours de suite restent cohérents).
- **Les images peuvent être transmises** si le CLI accepte les chemins d'accès aux images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
souhaitez des réponses texte « toujours fonctionnelles » sans dépendre d'API externes.

Si vous souhaitez un environnement d'exécution complet avec des contrôles de session ACP, des tâches en arrière-plan, une liaison de fil/discussion et des sessions de codage externe persistantes, utilisez plutôt [ACP Agents](/fr/tools/acp-agents). Les backends CLI ne sont pas des ACP.

## Démarrage rapide adapté aux débutants

Vous pouvez utiliser Codex CLI **sans aucune configuration** (le plugin OpenAI inclus enregistre un backend par défaut) :

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

Si votre passerelle s'exécute sous launchd/systemd et que le PATH est minimal, ajoutez simplement le chemin de la commande :

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

C'est tout. Aucune clé ni configuration d'auth supplémentaire n'est nécessaire au-delà du CLI lui-même.

Si vous utilisez un backend CLI inclus en tant que **fournisseur de messages principal** sur un hôte de passerelle, OpenClaw charge désormais automatiquement le plugin inclus propriétaire lorsque votre configuration fait référence explicitement à ce backend dans une référence de modèle ou sous `agents.defaults.cliBackends`.

## Utilisation en tant que solution de repli

Ajoutez un backend CLI à votre liste de repli afin qu'il ne s'exécute que lorsque les modèles principaux échouent :

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

Notes :

- Si vous utilisez `agents.defaults.models` (liste d'autorisation), vous devez également y inclure vos modèles de backend CLI.
- Si le fournisseur principal échoue (auth, limites de débit, délais d'attente), OpenClaw tentera ensuite le backend CLI.

## Aperçu de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **id de fournisseur** (par ex. `codex-cli`, `my-cli`).
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
          // For CLIs with a dedicated prompt-file flag:
          // systemPromptFileArg: "--system-file",
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

1. **Sélectionne un backend** en fonction du préfixe du fournisseur (`codex-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + le contexte de l'espace de travail.
3. **Exécute le CLI** avec un identifiant de session (si pris en charge) afin que l'historique reste cohérent.
   Le backend `claude-cli` inclus maintient un processus stdio Claude en vie par
   session OpenClaw et envoie les tours suivants via stream- stdin.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend `claude-cli` Anthropic inclus est pris en charge à nouveau. Le personnel de Anthropic nous a indiqué que l'utilisation du CLI Claude de style OpenClaw est à nouveau autorisée, donc CLI considère l'utilisation de `claude -p` comme approuvée pour cette intégration, à moins que OpenClaw ne publie une nouvelle politique.</Note>

Le backend `codex-cli` OpenAI inclus fait passer le prompt système de OpenClaw via
la substitution de configuration `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex n'expose pas de drapeau
`--append-system-prompt` de style Claude, donc OpenClaw écrit le prompt assemblé dans un
fichier temporaire pour chaque nouvelle session CLI Codex CLI.

Le backend `claude-cli` Anthropic inclus reçoit l'instantané des compétences OpenClaw
de deux manières : le catalogue de compétences compact OpenClaw dans le prompt système ajouté, et
un plugin Claude Code temporaire passé avec `--plugin-dir`. Le plugin contient
uniquement les compétences éligibles pour cet agent/session, afin que le résolveur de compétences natif de Claude Code voie
le même ensemble filtré que OpenClaw annoncerait autrement dans
le prompt. Les substitutions de clé d'environnement/de compétences API sont toujours appliquées par OpenClaw à l'environnement
du processus fils pour l'exécution.

La CLI Claude possède également son propre mode d'autorisation non interactif. OpenClaw le mappe à la stratégie d'exécution existante au lieu d'ajouter une configuration spécifique à Claude : lorsque la stratégie d'exécution demandée effective est YOLO (`tools.exec.security: "full"` et `tools.exec.ask: "off"`), OpenClaw ajoute `--permission-mode bypassPermissions`. Les paramètres `agents.list[].tools.exec` par agent remplacent le `tools.exec` global pour cet agent. Pour forcer un mode Claude différent, définissez des arguments de backend bruts explicites tels que `--permission-mode default` ou `--permission-mode acceptEdits` sous `agents.defaults.cliBackends.claude-cli.args` et le `resumeArgs` correspondant.

Avant que OpenClaw puisse utiliser le backend `claude-cli` fourni, Claude Code lui-même doit déjà être connecté sur le même hôte :

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Utilisez `agents.defaults.cliBackends.claude-cli.command` uniquement lorsque le binaire `claude` n'est pas déjà sur `PATH`.

## Sessions

- Si la CLI prend en charge les sessions, définissez `sessionArg` (par ex. `--session-id`) ou `sessionArgs` (espace réservé `{sessionId}`) lorsque l'identifiant doit être inséré dans plusieurs indicateurs.
- Si la CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez `resumeArgs` (remplace `args` lors de la reprise) et éventuellement `resumeOutput` (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : envoyez toujours un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyez un identifiant de session uniquement si un a été stocké précédemment.
  - `none` : n'envoyez jamais d'identifiant de session.
- `claude-cli` est défini par défaut sur `liveSession: "claude-stdio"`, `output: "jsonl"`,
  et `input: "stdin"` afin que les tours suivants réutilisent le processus Claude en cours tant
  qu'il est actif. Le stdio chaud est désormais la valeur par défaut, y compris pour les configurations personnalisées
  qui omettent les champs de transport. Si le Gateway redémarre ou si le processus inactif
  se termine, OpenClaw reprend à partir de l'identifiant de session Claude stocké. Les identifiants de session
  stockés sont vérifiés par rapport à une transcription de projet lisible existante avant
  la reprise, donc les liaisons fantômes sont effacées avec `reason=transcript-missing`
  au lieu de démarrer silencieusement une nouvelle session Claude CLI sous `--resume`.
- Les sessions CLI stockées sont une continuité détenue par le fournisseur. La réinitialisation quotidienne implicite de session
  ne les interrompt pas ; les politiques `/reset` et `session.reset` explicites le font
  toujours.

Notes de sérialisation :

- `serialize: true` maintient les exécutions sur la même voie ordonnées.
- La plupart des CLI sérialisent sur une voie de fournisseur.
- OpenClaw abandonne la réutilisation de la session CLI stockée lorsque l'identité d'authentification sélectionnée change,
  y compris un id de profil d'authentification modifié, une clé API statique, un jeton statique, ou l'identité du compte OAuth
  lorsque la CLI en expose une. La rotation des jetons d'accès et de rafraîchissement OAuth
  n'interrompt pas la session CLI stockée. Si une CLI n'expose pas un
  id de compte OAuth stable, OpenClaw laisse cette CLI appliquer les permissions de reprise.

## Images (transfert direct)

Si votre CLI accepte des chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces
chemins sont transmis en tant qu'arguments CLI. Si `imageArg` est manquant, OpenClaw ajoute les
chemins de fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent
automatiquement des fichiers locaux à partir de chemins simples.

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- Pour la sortie JSON du CLI CLI, OpenClaw lit le texte de réponse depuis `response` et
  l'utilisation depuis `stats` lorsque `usage` est manquant ou vide.
- `output: "jsonl"` analyse les flux JSONL (par exemple Codex CLI `--json`) et extrait le message final de l'agent ainsi que les identifiants de session
  lorsqu'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) transmet le prompt comme dernier argument du CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (propriétaires du plugin)

Le plugin intégré OpenAI enregistre également une valeur par défaut pour `codex-cli` :

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
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

Prérequis : le CLI Gemini local doit être installé et disponible en tant que
`gemini` sur `PATH` (`brew install gemini-cli` ou
`npm install -g @google/gemini-cli`).

Notes JSON du CLI Gemini :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw dérive les jetons d'entrée depuis
  `stats.input_tokens - stats.cached`.

Remplacez uniquement si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut du plugin

Les valeurs par défaut du backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du provider dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` l'emporte toujours sur la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste géré par le plugin via le hook optionnel `normalizeConfig`.

Les plugins qui ont besoin de petites adaptations de compatibilité pour les invites/messages peuvent déclarer des transformations de texte bidirectionnelles sans remplacer un provider ou un backend CLI :

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

`input` réécrit l'invite système et l'invite utilisateur transmises à la CLI. `output` réécrit les deltas de l'assistant diffusés et le texte final analysé avant que OpenClaw ne gère ses propres marqueurs de contrôle et la diffusion sur le channel.

Pour les CLI qui émettent du JSONL compatible avec le flux JSON de Claude Code, définissez `jsonlDialect: "claude-stream-json"` dans la configuration de ce backend.

## Regrouper les superpositions MCP

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut choisir une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `codex-cli` : remplacements de configuration en ligne pour `mcp_servers` ; le serveur de bouclage OpenClaw généré est marqué avec le mode d'approbation d'outil par serveur de Codex afin que les appels MCP ne bloquent pas sur les invites d'approbation locales
- `google-gemini-cli` : fichier des paramètres système Gemini généré

Lorsque le groupement MCP est activé, OpenClaw :

- lance un serveur MCP HTTP de bouclage qui expose les outils de la passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils à la session, au compte et au contexte de channel actuels
- charge les serveurs bundle-MCP activés pour l'espace de travail actuel
- les fusionne avec toute forme existante de configuration/paramètres MCP du backend
- réécrit la configuration de lancement en utilisant le mode d'intégration propriétaire du backend provenant de l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte toujours une configuration stricte lorsqu'un backend opte pour le groupement MCP afin que les exécutions en arrière-plan restent isolées.

Les runtimes MCP groupés limités à la session sont mis en cache pour être réutilisés dans une session, puis récoltés après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (10 minutes par défaut ; définissez `0` pour désactiver). Les exécutions intégrées ponctuelles telles que les sondes d'authentification, la génération de slugs et le nettoyage des demandes de rappel de mémoire active à la fin de l'exécution, afin que les enfants stdio et les flux HTTP/SSE diffusables ne survivent pas à l'exécution.

## Limitations

- **Pas d'appels d'outil OpenClaw directs.** OpenClaw n'injecte pas d'appels d'outils dans le protocole backend CLI. Les backends ne voient les outils Gateway que s'ils optent pour `bundleMcp: true`.
- **Le streaming est spécifique au backend.** Certains backends diffusent du JSONL ; d'autres mettent en tampon jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON de la CLI.
- **Les sessions Codex CLI** reprennent via la sortie texte (pas de JSONL), ce qui est moins structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model` → modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas `none` (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg` (et vérifiez que la CLI prend en charge les chemins de fichiers).

## Connexes

- [Manuel d'exécution Gateway](/fr/gateway)
- [Modèles locaux](/fr/gateway/local-models)
