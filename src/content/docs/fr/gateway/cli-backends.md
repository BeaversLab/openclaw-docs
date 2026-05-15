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
voulez des réponses textuelles « qui fonctionnent toujours » sans dépendre d'API externes.

Si vous souhaitez un environnement d'exécution complet avec des contrôles de session ACP, des tâches en arrière-plan,
la liaison de fils/conversations et des sessions de codage externe persistantes, utilisez
[ACP Agents](/fr/tools/acp-agentsCLI) à la place. Les backends CLI ne font pas partie d'ACP.

<Tip>Vous créez un nouveau plugin de backend ? Utilisez [les plugins de backend CLI](CLI/en/plugins/cli-backend-plugins). Cette page est destinée aux utilisateurs configurant et exploitant un backend déjà enregistré.</Tip>

## Démarrage rapide pour débutants

Vous pouvez utiliser Codex CLI **sans aucune configuration** (le plugin OpenAI intégré enregistre un backend par défaut) :

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
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

C'est tout. Aucune clé, aucune configuration d'auth supplémentaire n'est nécessaire au-delà de la CLI elle-même.

Si vous utilisez un backend CLI fourni (bundled) comme **fournisseur de messages principal** sur un
hôte de passerelle, OpenClaw charge désormais automatiquement le plugin fourni associé lorsque votre configuration
réfère explicitement à ce backend dans une référence de modèle ou sous
CLIOpenClaw`agents.defaults.cliBackends`.

## L'utiliser comme solution de repli

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

- Si vous utilisez `agents.defaults.models`CLI (liste d'autorisation), vous devez également y inclure vos modèles de backend CLI.
- Si le fournisseur principal échoue (auth, limites de débit, dépassements de délai), OpenClaw
  tentera ensuite le backend CLI.

## Vue d'ensemble de la configuration

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
          // Opt in only if this backend may reseed safe invalidated sessions
          // from bounded raw OpenClaw transcript history before compaction.
          reseedFromRawTranscriptWhenUncompacted: true,
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
3. **Exécute la CLI** avec un id de session (si pris en charge) pour que l'historique reste cohérent.
   Le backend CLI`claude-cli`OpenClaw fourni garde un processus stdio Claude en vie par
   session OpenClaw et envoie les tours de suivi via le stdin stream-.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend Anthropic`claude-cli`AnthropicOpenClawCLIOpenClaw Anthropic fourni est à nouveau pris en charge. Le personnel d'Anthropic nous a informés que l'utilisation de la CLI Claude dans le style OpenClaw est à nouveau autorisée, donc OpenClaw considère l'utilisation de `claude -p`Anthropic comme approuvée pour cette intégration, sauf si Anthropic publie une nouvelle politique.</Note>

Le backend OpenAI OpenAI`codex-cli`OpenClaw inclus transmet le système d'OpenClaw via la substitution de configuration `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex n'expose pas de drapeau `--append-system-prompt`OpenClawCLI de style Claude, donc OpenClaw écrit le prompt assemblé dans un fichier temporaire pour chaque nouvelle session CLI Codex.

Le backend Anthropic Anthropic`claude-cli`OpenClawOpenClaw inclus reçoit l'instantané des compétences d'OpenClaw de deux manières : le catalogue compact des compétences d'OpenClaw dans le système prompt ajouté, et un plugin Claude Code temporaire passé avec `--plugin-dir`OpenClawAPIOpenClaw. Le plugin ne contient que les compétences éligibles pour cet agent/session, donc le résolveur de compétences natif de Claude Code voit le même ensemble filtré qu'OpenClaw annoncerait autrement dans le prompt. Les substitutions de clé d'environnement/de compétence/API sont toujours appliquées par OpenClaw à l'environnement du processus enfant pour l'exécution.

Le Claude CLIOpenClaw possède également son propre mode d'autorisation non interactif. OpenClaw le mappe à la stratégie d'exécution existante au lieu d'ajouter une configuration spécifique à Claude : lorsque la stratégie d'exécution demandée effective est YOLO (`tools.exec.security: "full"` et `tools.exec.ask: "off"`OpenClaw), OpenClaw ajoute `--permission-mode bypassPermissions`. Les paramètres `agents.list[].tools.exec` par agent remplacent le `tools.exec` global pour cet agent. Pour forcer un mode Claude différent, définissez des arguments de backend bruts explicites tels que `--permission-mode default` ou `--permission-mode acceptEdits` sous `agents.defaults.cliBackends.claude-cli.args` et le `resumeArgs` correspondant.

Le backend Anthropic `claude-cli` inclus mappe également les niveaux `/think` d'OpenClaw vers l'indicateur natif `--effort` de Claude Code pour les niveaux non désactivés. `minimal` et `low` correspondent à `low`, `adaptive` et `medium` correspondent à `medium`, et `high`, `xhigh` et `max` correspondent directement. Les autres backends CLI ont besoin que leur plugin propriétaire déclare un mappeur argv équivalent avant que `/think` ne puisse affecter le CLI généré.

Avant qu'OpenClaw ne puisse utiliser le backend `claude-cli` inclus, Claude Code lui-même doit déjà être connecté sur le même hôte :

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Utilisez `agents.defaults.cliBackends.claude-cli.command` uniquement lorsque le binaire `claude` n'est pas déjà sur `PATH`.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (par ex. `--session-id`) ou `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré dans plusieurs indicateurs.
- Si le CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput` (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : toujours envoyer un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyer un identifiant de session uniquement si l'un a été stocké précédemment.
  - `none` : n'envoyer jamais d'identifiant de session.
- `claude-cli` est défini par défaut sur `liveSession: "claude-stdio"`, `output: "jsonl"`
  et `input: "stdin"`, de sorte que les tours de suivi réutilisent le processus Claude en cours d'exécution tant
  qu'il est actif. Le stdio à chaud est désormais la valeur par défaut, y compris pour les configurations personnalisées
  qui omettent les champs de transport. Si le Gateway redémarre ou si le processus inactif
  se termine, OpenClaw reprend à partir de l'identifiant de session Claude stocké. Les identifiants de session
  stockés sont vérifiés par rapport à une transcription de projet lisible existante avant
  la reprise, de sorte que les liaisons fantômes sont effacées avec `reason=transcript-missing`
  au lieu de démarrer silencieusement une nouvelle session Claude CLI sous `--resume`.
- Les sessions live de Claude maintiennent des garde-fous de sortie JSONL bornés. Les valeurs par défaut autorisent jusqu'à
  8 MiB et 20 000 lignes JSONL brutes par tour. Les tours de Claude riches en outils peuvent les augmenter
  par backend avec
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  et `maxTurnLines` ; OpenClaw limite ces paramètres à 64 MiB et 100 000
  lignes.
- Les sessions CLI stockées assurent la continuité propriétaire du provider. La réinitialisation quotidienne implicite de la session
  ne les coupe pas ; les stratégies `/reset` et explicite `session.reset` le font
  toujours.
- Les sessions CLI fraîches sont généralement réensemencées uniquement à partir du résumé de compactage de OpenClaw
  ainsi que de la queue post-compactage. Pour récupérer des sessions courtes qui sont invalidées
  avant compactage, un backend peut opter pour
  `reseedFromRawTranscriptWhenUncompacted: true`. OpenClaw maintient tout de même le
  réensemencement de la transcription brute borné et le limite aux invalidations sûres telles que les transcriptions CLI manquantes,
  les modifications de system-prompt/MCP, ou la nouvelle tentative après expiration de session ; les changements de profil d'authentification
  ou d'époque d'informations d'identification ne réensemencent jamais l'historique de la transcription brute.

Notes de sérialisation :

- `serialize: true` maintient les exécutions de même couche (same-lane) ordonnées.
- La plupart des CLIs sérialisent sur une seule couche de provider.
- OpenClaw abandonne la réutilisation des sessions CLI stockées lorsque l'identité d'authentification sélectionnée change, notamment un identifiant de profil d'authentification modifié, une clé API statique, un jeton statique ou une identité de compte OAuth lorsque la CLI en expose une. La rotation des jetons d'accès et de rafraîchissement OAuth n'interrompt pas la session CLI stockée. Si une CLI n'expose pas d'identifiant de compte OAuth stable, OpenClaw laisse cette CLI appliquer les autorisations de reprise.

## Prélude de repli depuis les sessions claude-cli

Lorsqu'une tentative `claude-cli`CLI bascule vers un candidat non-CLI dans [`agents.defaults.model.fallbacks`](/fr/concepts/model-failoverOpenClaw), OpenClaw amorce la tentative suivante avec un préambule de contexte récolté à partir de la transcription JSONL locale de Claude Code à `~/.claude/projects/`OpenClaw. Sans cet amorçage, le provider de repli démarrerait à froid car la transcription de session propre à OpenClaw est vide pour les exécutions `claude-cli`.

- Le préambule privilégie le dernier résumé `/compact` ou le marqueur `compact_boundary`, puis ajoute les tours post-frontière les plus récents jusqu'à une limite de caractères. Les tours pré-frontière sont ignorés car le résumé les représente déjà.
- Les blocs d'outils sont fusionnés pour compacter les indices `(tool call: name)` et `(tool result: …)` afin de maintenir le budget de prompt honnête. Le résumé est étiqueté `(truncated)` s'il déborde.
- Les basculements `claude-cli` vers `claude-cli` d'un même provider s'appuient sur la propre `--resume` de Claude et ignorent le préambule.
- L'amorçage réutilise la validation existante du chemin de fichier de session Claude, afin que des chemins arbitraires ne puissent pas être lus.

## Images (transfert direct)

Si votre CLI accepte des chemins d'image, définissez CLI`imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si OpenClaw`imageArg`CLI est défini, ces chemins sont passés en arguments CLI. Si `imageArg`OpenClaw est manquant, OpenClaw ajoute les chemins des fichiers au prompt (injection de chemin), ce qui suffit pour les CLI qui chargent automatiquement les fichiers locaux à partir de chemins simples.

## Entrées / Sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- Pour la sortie JSON de Gemini CLI, OpenClaw lit le texte de réponse depuis CLIOpenClaw`response` et l'utilisation depuis `stats` lorsque `usage` est manquant ou vide.
- `output: "jsonl"`CLI analyse les flux JSONL (par exemple Codex CLI `--json`) et extrait le message final de l'agent ainsi que les identifiants de session lorsqu'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"`CLI (par défaut) passe le prompt comme dernier argument CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (appartenant au plugin)

Le plugin OpenAI inclus enregistre également une valeur par défaut pour OpenAI`codex-cli` :

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
CLI`gemini` sur `PATH` (`brew install gemini-cli` ou
`npm install -g @google/gemini-cli`).

Notes JSON du CLI Gemini :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw dérive les tokens d'entrée de
  `stats.input_tokens - stats.cached`.

Ne remplacez que si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut détenues par le plugin

Les valeurs par défaut du backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` remplace toujours la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste détenu par le plugin via le hook optionnel
  `normalizeConfig`.

Les plugins qui ont besoin de petits shims de compatibilité de prompt/message peuvent déclarer
des transformations de texte bidirectionnelles sans remplacer un fournisseur ou un backend CLI :

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
réécrit les deltas de l'assistant diffusés et le texte final analysé avant que OpenClaw ne gère
ses propres marqueurs de contrôle et la livraison par channel.

Pour les CLIs qui émettent du JSONL compatible avec le stream- de Claude Code, définissez
`jsonlDialect: "claude-stream-json"` dans la configuration de ce backend.

## Superpositions MCP groupées

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut
opter pour une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `codex-cli` : remplacements de configuration en ligne pour `mcp_servers` ; le serveur de bouclage OpenClaw généré est marqué avec le mode d'approbation des outils par serveur de Codex afin que les appels MCP ne bloquent pas sur les invites d'approbation locales
- `google-gemini-cli` : fichier de paramètres système Gemini généré

Lorsque le bundle MCP est activé, OpenClaw :

- lance un serveur MCP HTTP de bouclage qui expose les outils de passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils au contexte de la session, du compte et du canal actuels
- charge les serveurs bundle-MCP activés pour l'espace de travail actuel
- les fusionne avec toute forme de configuration/paramètres MCP de backend existante
- réécrit la configuration de lancement en utilisant le mode d'intégration détenu par le backend provenant de l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte tout de même une configuration stricte lorsqu'un backend opte pour le bundle MCP afin que les exécutions en arrière-plan restent isolées.

Les runtimes MCP regroupés limités à la session sont mis en cache pour être réutilisés au sein d'une session, puis récupérés après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (10 minutes par défaut ; définissez `0` pour désactiver). Les exécutions intégrées ponctuelles telles que les sondes d'authentification, la génération de slugs et le nettoyage des demandes de rappel de mémoire active à la fin de l'exécution, afin que les enfants stdio et les flux HTTP/SSE diffusables ne survivent pas à l'exécution.

## Limitations

- **Pas d'appels d'outils OpenClaw directs.** OpenClaw n'injecte pas d'appels d'outils dans le protocole de backend CLI. Les backends ne voient les outils de passerelle que lorsqu'ils optent pour `bundleMcp: true`.
- **Le streaming dépend du backend.** Certains backends diffusent du JSONL ; d'autres mettent en tampon jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON du CLI.
- **Les sessions CLI de Codex** reprennent via une sortie textuelle (pas de JSONL), ce qui est moins structuré que l'exécution initiale `--json`. Les sessions OpenClaw fonctionnent toujours normalement.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Nom de model incorrect** : utilisez `modelAliases` pour mapper `provider/model`CLI → model CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas
  `none`CLI (Codex CLI ne peut actuellement pas reprendre avec une sortie JSON).
- **Images ignorées** : définissez `imageArg`CLI (et vérifiez que le CLI prend en charge les chemins de fichiers).

## Connexe

- [Guide du Gateway](Gateway/en/gateway)
- [Modèles locaux](/fr/gateway/local-models)
