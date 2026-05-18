---
summary: "Backends CLI : repli CLI IA local avec pont d'outils MCP optionnel"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "Backends CLI"
---

OpenClaw peut exécuter des **CLIs IA locaux** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limités par débit ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils OpenClaw ne sont pas injectés directement**, mais les backends avec OpenClaw`bundleMcp: true`
  peuvent recevoir les outils de la passerelle via un pont MCP de boucle de retour.
- **Streaming JSONL** pour les CLIs qui le prennent en charge.
- **Les sessions sont prises en charge** (afin que les tours de suite restent cohérents).
- **Les images peuvent être transmises** si le CLI accepte les chemins d'accès aux images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
voulez des réponses textuelles « qui fonctionnent toujours » sans dépendre d'API externes.

Si vous souhaitez un runtime de harnais complet avec des contrôles de session ACP, des tâches d'arrière-plan,
une liaison thread/conversation et des sessions de codage externes persistantes, utilisez
[ACP Agents](/fr/tools/acp-agentsCLI) à la place. Les backends CLI ne sont pas des ACP.

<Tip>Vous créez un nouveau plugin de backend ? Utilisez [plugins de backend CLI](CLI/en/plugins/cli-backend-plugins). Cette page est destinée aux utilisateurs qui configurent et exploitent un backend déjà enregistré.</Tip>

## Démarrage rapide pour débutants

Vous pouvez utiliser le CLI Claude Code **sans aucune configuration** (le plugin Anthropic inclus
enregistre un backend par défaut) :

```bash
openclaw agent --message "hi" --model claude-cli/claude-sonnet-4-6
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
        fallbacks: ["claude-cli/claude-sonnet-4-6"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/claude-sonnet-4-6": {},
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

Chaque entrée est indexée par un **id de fournisseur** (ex. `claude-cli`, `my-cli`).
L'id du fournisseur devient la partie gauche de votre référence de modèle :

```
<provider>/<model>
```

### Exemple de configuration

```json5
{
  agents: {
    defaults: {
      cliBackends: {
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

1. **Sélectionne un backend** basé sur le préfixe du fournisseur (`claude-cli/...`).
2. **Construit un prompt système** en utilisant le même prompt OpenClaw + le contexte de l'espace de travail.
3. **Exécute le CLI** avec un identifiant de session (si pris en charge) afin que l'historique reste cohérent.
   Le backend `claude-cli` inclus maintient un processus stdio Claude en vie par
   session OpenClaw et envoie les tours suivants via stdin stream-.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend Anthropic `claude-cli` inclus est à nouveau pris en charge. L'équipe Anthropic nous a indiqué que l'utilisation du CLI Claude style OpenClaw est à nouveau autorisée, donc CLI considère l'utilisation de `claude -p` comme approuvée pour cette intégration, sauf si OpenClaw publie une nouvelle politique.</Note>

Le backend Anthropic Anthropic`claude-cli`OpenClawOpenClaw inclus reçoit l'instantané des compétences OpenClaw
de deux manières : le catalogue compact des compétences OpenClaw dans le système prompt ajouté, et
un plugin Claude Code temporaire passé avec `--plugin-dir`OpenClawAPIOpenClaw. Le plugin contient
uniquement les compétences éligibles pour cet agent/session, de sorte que le résolveur de compétences natif de Claude Code
voit le même ensemble filtré qu'OpenClaw annoncerait sinon dans
le prompt. Les substitutions de clé d'environnement/de compétences API sont toujours appliquées par OpenClaw à l'
environnement du processus enfant pour l'exécution.

Le CLI Claude possède également son propre mode de permission non interactif. OpenClaw mappe cela
à la stratégie d'exécution existante au lieu d'ajouter une configuration spécifique à Claude : lorsque la
stratégie d'exécution effectivement demandée est YOLO (`tools.exec.security: "full"` et
`tools.exec.ask: "off"`), OpenClaw ajoute `--permission-mode bypassPermissions`.
Les paramètres `agents.list[].tools.exec` par agent remplacent le `tools.exec` global pour
cet agent. Pour forcer un mode Claude différent, définissez des arguments bruts explicites du backend
tels que `--permission-mode default` ou `--permission-mode acceptEdits` sous
`agents.defaults.cliBackends.claude-cli.args` et `resumeArgs` correspondants.

Le backend `claude-cli` Anthropic inclus mappe également les niveaux `/think` de OpenClaw
au drapeau natif `--effort` de Claude Code pour les niveaux non désactivés. `minimal` et
`low` mappent vers `low`, `adaptive` et `medium` mappent vers `medium`, et `high`,
`xhigh`, et `max` mappent directement. D'autres backends CLI ont besoin que leur plugin propriétaire déclare un mappeur argv équivalent avant que `/think` ne puisse affecter le CLI généré.

Avant que OpenClaw puisse utiliser le backend `claude-cli` inclus, Claude Code lui-même
doit déjà être connecté sur le même hôte :

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Utilisez `agents.defaults.cliBackends.claude-cli.command` uniquement lorsque le binaire `claude`
n'est pas déjà sur `PATH`.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (ex. `--session-id`) ou
  `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré
  dans plusieurs indicateurs.
- Si la CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez
  `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput`
  (pour les reprises non-JSON).
- `sessionMode` :
  - `always` : envoyer toujours un identifiant de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyer un identifiant de session uniquement si l'un a été stocké précédemment.
  - `none` : n'envoyer jamais un identifiant de session.
- `claude-cli` est défini par défaut sur `liveSession: "claude-stdio"`, `output: "jsonl"`,
  et `input: "stdin"`, de sorte que les tours de suivi réutilisent le processus Claude en direct tant
  qu'il est actif. Le stdio chaud est la valeur par défaut maintenant, y compris pour les configurations personnalisées
  qui omettent les champs de transport. Si le Gateway redémarre ou si le processus inactif
  se termine, OpenClaw reprend à partir de l'identifiant de session Claude stocké. Les identifiants de session
  stockés sont vérifiés par rapport à une transcription de projet lisible existante avant
  la reprise, donc les liaisons fantômes sont effacées avec `reason=transcript-missing`
  au lieu de démarrer silencieusement une nouvelle session Claude CLI sous `--resume`.
- Les sessions Claude en direct conservent des garde-fous de sortie JSONL bornés. Les valeurs par défaut permettent jusqu'à
  8 MiB et 20 000 lignes JSONL brutes par tour. Les tours Claude lourds en outils peuvent les augmenter
  par backend avec
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  et `maxTurnLines` ; OpenClaw limite ces paramètres à 64 MiB et 100 000
  lignes.
- Les sessions CLI stockées sont une continuité appartenant au provider. La réinitialisation quotidienne implicite de session
  ne les coupe pas ; `/reset` et les stratégies explicites `session.reset` le font
  toujours.
- Les sessions CLI fraîches sont normalement réensemencées uniquement à partir du résumé de compactage d'OpenClaw ainsi que de la queue post-compactage. Pour récupérer de courtes sessions qui sont invalidées avant le compactage, un backend peut opter pour CLIOpenClaw`reseedFromRawTranscriptWhenUncompacted: true`OpenClawCLI. OpenClaw maintient tout de même le réensemencement de la transcription brute borné et le limite aux invalidations sûres telles que les transcriptions CLI manquantes, les modifications du prompt système/MCP, ou les tentatives de réessai après expiration de session ; les modifications du profil d'authentification ou de l'époque des informations d'identification ne réensemencent jamais l'historique de la transcription brute.

Notes de sérialisation :

- `serialize: true` maintient les exécutions de même voie ordonnées.
- La plupart des CLI sérialisent sur une voie de fournisseur.
- OpenClaw abandonne la réutilisation de la session CLI stockée lorsque l'identité d'authentification sélectionnée change, y compris un changement d'identifiant de profil d'authentification, de clé API statique, de jeton statique, ou d'identité de compte OAuth lorsque la CLI en expose une. La rotation des jetons d'accès et de rafraîchissement OAuth ne coupe pas la session CLI stockée. Si une CLI n'expose pas un identifiant de compte OAuth stable, OpenClaw laisse cette CLI appliquer les autorisations de reprise.

## Prélude de repli depuis les sessions claude-cli

Lorsqu'une tentative `claude-cli`CLI bascule vers un candidat non-CLI dans [`agents.defaults.model.fallbacks`](/fr/concepts/model-failoverOpenClaw), OpenClaw ensemence la tentative suivante avec un prélude de contexte récolté à partir de la transcription JSONL locale de Claude Code à `~/.claude/projects/`OpenClaw. Sans cet amorçage, le fournisseur de repli démarrerait à froid car la propre transcription de session d'OpenClaw est vide pour les exécutions `claude-cli`.

- Le prélude privilégie le dernier résumé `/compact` ou le marqueur `compact_boundary`, puis ajoute les tours post-frontière les plus récents jusqu'à un budget de caractères. Les tours pré-frontière sont abandonnés car le résumé les représente déjà.
- Les blocs d'outils sont fusionnés en des indications `(tool call: name)` et
  `(tool result: …)` compactes pour respecter le budget du prompt. Le résumé est
  étiqueté `(truncated)` s'il déborde.
- Les basculements `claude-cli` vers `claude-cli` du même provider s'appuient sur le propre `--resume` de Claude et sautent le prélude.
- La graine réutilise la validation existante du chemin de fichier de session Claude, donc
  des chemins arbitraires ne peuvent pas être lus.

## Images (pass-through)

Si votre CLI accepte des chemins d'image, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini, ces
chemins sont passés comme arguments de CLI. Si `imageArg` est manquant, OpenClaw ajoute les
chemins de fichiers au prompt (injection de chemin), ce qui suffit pour les CLIs qui chargent
automatiquement les fichiers locaux depuis des chemins simples.

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- Pour la sortie JSON du CLI Gemini, OpenClaw lit le texte de réponse depuis `response` et
  l'utilisation depuis `stats` lorsque `usage` est manquant ou vide.
- `output: "jsonl"` analyse les flux JSONL et extrait le message final de l'agent ainsi que les
  identifiants de session lorsqu'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) passe le prompt comme le dernier argument de CLI.
- `input: "stdin"` envoie le prompt via stdin.
- Si le prompt est très long et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (détenues par le plugin)

Les valeurs par défaut des backend CLI fournis résident avec leur plugin propriétaire. Par exemple,
Anthropic possède CLIAnthropic`claude-cli` et Google possède `google-gemini-cli`OpenAI. Les exécutions de l'agent OpenAI Codex
utilisent le harnais app-server Codex via `openai/*`OpenClaw ; OpenClaw n'
enregistre plus de backend `codex-cli` fourni.

Le plugin Anthropic fourni enregistre une valeur par défaut pour Anthropic`claude-cli` :

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

Le plugin Google fourni enregistre également une valeur par défaut pour `google-gemini-cli` :

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Prérequis : la locale Gemini CLI doit être installée et disponible en tant que
CLI`gemini` sur `PATH` (`brew install gemini-cli` ou
`npm install -g @google/gemini-cli`).

Notes sur le JSON de la Gemini CLI :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached`OpenClaw est normalisé en OpenClaw `cacheRead`.
- Si `stats.input`OpenClaw est manquant, OpenClaw déduit les jetons d'entrée à partir de
  `stats.input_tokens - stats.cached`.

Ne remplacez que si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut détenues par le plugin

Les valeurs par défaut des backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` prime toujours sur la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste géré par le plugin via le hook optionnel
  `normalizeConfig`.

Les plugins qui ont besoin de petits adaptateurs de compatibilité de prompt/message peuvent déclarer
des transformations de texte bidirectionnelles sans remplacer un provider ou un backend CLI :

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
réécrit les deltas de l'assistant diffusés et le texte final analysé avant que OpenClaw ne traite
ses propres marqueurs de contrôle et la livraison de channel.

Pour les CLI qui émettent du JSONL compatible avec le flux- Claude Code, définissez
`jsonlDialect: "claude-stream-json"` dans la configuration de ce backend.

## Regrouper les superpositions MCP

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut
opter pour une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `google-gemini-cli` : fichier des paramètres système Gemini généré

Lorsque le bundle MCP est activé, OpenClaw :

- lance un serveur MCP HTTP de boucle locale qui expose les outils de la passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils à la session, au compte et au contexte de channel actuels
- charge les serveurs bundle-MCP activés pour l'espace de travail actuel
- les fusionne avec toute forme de configuration/paramètres MCP de backend existante
- réécrit la configuration de lancement en utilisant le mode d'intégré détenu par le backend à partir de l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte toujours une configuration stricte lorsqu'un
backend opte pour le bundle MCP afin que les exécutions en arrière-plan restent isolées.

Les runtimes MCP regroupés avec une portée de session sont mis en cache pour être réutilisés au sein d'une session, puis récupérés après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (10 minutes par défaut ; définissez `0` pour désactiver). Les exécutions intégrées ponctuelles telles que les sondages d'authentification, la génération de slugs et le nettoyage des demandes de rappel de mémoire active se produisent à la fin de l'exécution afin que les processus stdio et les flux HTTP/SSE diffusable ne survivent pas à l'exécution.

## Limitations

- **Pas d'appels d'outil OpenClaw directs.** OpenClaw n'injecte pas d'appels d'outil dans le protocole backend CLI. Les backends ne voient les outils de la passerelle que lorsqu'ils activent `bundleMcp: true`.
- **Le streaming est spécifique au backend.** Certains backends diffusent en continu du JSONL ; d'autres mettent en mémoire tampon jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON du CLI.

## Dépannage

- **CLI introuvable** : définissez `command` sur un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model` → modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas `none`.
- **Images ignorées** : définissez `imageArg` (et vérifiez que le CLI prend en charge les chemins de fichiers).

## Connexes

- [Runbook Gateway](/fr/gateway)
- [Modèles locaux](/fr/gateway/local-models)
