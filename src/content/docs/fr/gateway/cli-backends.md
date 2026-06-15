---
summary: "CLICLIBackends CLI : secours CLI IA local avec pont d'outils MCP optionnel"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLIBackends CLI"
---

OpenClaw peut exécuter des **CLIs IA locaux** en tant que **repli texte uniquement** lorsque les fournisseurs d'API sont en panne,
limités par débit ou temporairement défaillants. C'est intentionnellement conservateur :

- **Les outils OpenClaw ne sont pas injectés directement**, mais les backends avec OpenClaw`bundleMcp: true`
  peuvent recevoir les outils de la passerelle via un pont MCP de bouclage.
- **Streaming JSONL** pour les CLIs qui le prennent en charge.
- **Les sessions sont prises en charge** (afin que les tours de suite restent cohérents).
- **Les images peuvent être transmises** si le CLI accepte les chemins d'accès aux images.

Ceci est conçu comme un **filet de sécurité** plutôt que comme un chemin principal. Utilisez-le lorsque vous
voulez des réponses textuelles « qui fonctionnent toujours » sans dépendre d'API externes.

Si vous souhaitez un runtime de harnais complet avec des contrôles de session ACP, des tâches d'arrière-plan,
une liaison fil/discussion et des sessions de codage externes persistantes, utilisez
[ACP Agents](/fr/tools/acp-agentsCLI) à la place. Les backends CLI ne sont pas de l'ACP.

<Tip>Vous créez un nouveau plugin de backend ? Utilisez [les plugins de backend CLI](CLI/en/plugins/cli-backend-plugins). Cette page est destinée aux utilisateurs qui configurent et exploitent un backend déjà enregistré.</Tip>

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
CLIOpenClaw`agents.defaults.cliBackends`.

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

- Si vous utilisez `agents.defaults.models`CLI (liste d'autorisation), vous devez y inclure également vos modèles de backend CLI.
- Si le fournisseur principal échoue (auth, limites de débit, dépassements de délai), OpenClaw
  tentera ensuite le backend CLI.

## Vue d'ensemble de la configuration

Tous les backends CLI se trouvent sous :

```
agents.defaults.cliBackends
```

Chaque entrée est indexée par un **id de fournisseur** (ex. `claude-cli`, `my-cli`).
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
3. **Exécute le CLI** avec un id de session (si pris en charge) pour que l'historique reste cohérent.
   Le backend CLI`claude-cli`OpenClaw groupé maintient un processus stdio Claude en vie par
   session OpenClaw et envoie les tours de suivi via le stdin stream-.
4. **Analyse la sortie** (JSON ou texte brut) et renvoie le texte final.
5. **Persiste les identifiants de session** par backend, afin que les relances réutilisent la même session CLI.

<Note>Le backend Anthropic `claude-cli` inclus est à nouveau pris en charge. Le personnel de Anthropic nous a indiqué que l'utilisation du Claude OpenClaw de style CLI est à nouveau autorisée, donc OpenClaw considère l'utilisation de `claude -p` comme approuvée pour cette intégration, à moins que Anthropic ne publie une nouvelle politique.</Note>

Le backend Anthropic `claude-cli` inclus préfère le résolveur de compétences natif de Claude Code
pour les compétences OpenClaw. Lorsque l'instantané des compétences actuelles inclut au moins
une compétence sélectionnée avec un chemin matérialisé, OpenClaw passe un plugin Claude Code
temporaire avec `--plugin-dir` et omet le catalogue de compétences OpenClaw en double
du invite système ajoutée. Si l'instantané n'a aucune compétence de plugin
matérialisée, OpenClaw conserve le catalogue d'invite en solution de repli. Les remplacements de clé env/API
de compétence sont toujours appliqués par OpenClaw à l'environnement du processus enfant pour
l'exécution.

Le Claude CLI possède également son propre mode d'autorisation non interactif. OpenClaw mappe cela
à la stratégie d'exécution existante au lieu d'ajouter une configuration de stratégie spécifique à Claude.
Pour les sessions Claude en direct gérées par OpenClaw, la stratégie d'exécution OpenClaw effective est
autorisative : YOLO (`tools.exec.security: "full"` et
`tools.exec.ask: "off"`) lance Claude avec
`--permission-mode bypassPermissions`, tandis qu'une stratégie d'exécution effective
restrictive lance Claude avec `--permission-mode default`. Les paramètres
`agents.list[].tools.exec` par agent remplacent le `tools.exec` global pour cet
agent. Les arguments de backend Claude bruts peuvent toujours inclure `--permission-mode`, mais les lancements
Claude en direct normalisent cet indicateur pour correspondre à la stratégie d'exécution OpenClaw effective.

Le backend Anthropic `claude-cli` inclus mappe également les niveaux OpenClaw `/think` vers l'indicateur natif `--effort` de Claude Code pour les niveaux non désactivés. `minimal` et `low` correspondent à `low`, `adaptive` et `medium` correspondent à `medium`, et `high`, `xhigh` et `max` correspondent directement. Les autres backends CLI nécessitent que leur plugin propriétaire déclare un mappeur argv équivalent avant que `/think` puisse affecter le CLI généré.

Avant que OpenClaw puisse utiliser le backend `claude-cli` inclus, Claude Code lui-même doit déjà être connecté sur le même hôte :

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Utilisez `agents.defaults.cliBackends.claude-cli.command` uniquement lorsque le binaire `claude` n'est pas déjà sur `PATH`.

## Sessions

- Si le CLI prend en charge les sessions, définissez `sessionArg` (par ex. `--session-id`) ou `sessionArgs` (espace réservé `{sessionId}`) lorsque l'ID doit être inséré dans plusieurs indicateurs.
- Si le CLI utilise une **sous-commande de reprise** avec des indicateurs différents, définissez `resumeArgs` (remplace `args` lors de la reprise) et facultativement `resumeOutput` (pour les reprises non JSON).
- `sessionMode` :
  - `always` : toujours envoyer un id de session (nouvel UUID si aucun n'est stocké).
  - `existing` : envoyer un id de session uniquement si l'un a été stocké précédemment.
  - `none` : n'envoyer jamais d'id de session.
- `claude-cli` est réglé par défaut sur `liveSession: "claude-stdio"`, `output: "jsonl"`
  et `input: "stdin"`, afin que les tours suivants réutilisent le processus Claude en cours tant
  qu'il est actif. Le stdio chaud est désormais la valeur par défaut, y compris pour les configurations personnalisées
  qui omettent les champs de transport. Si le Gateway redémarre ou si le processus inactif
  se termine, OpenClaw reprend à partir de l'identifiant de session Claude stocké. Les identifiants de session
  stockés sont vérifiés par rapport à une transcription de projet lisible existante avant
  la reprise, de sorte que les liaisons fantômes sont effacées avec `reason=transcript-missing`
  au lieu de démarrer silencieusement une nouvelle session Claude CLI sous `--resume`.
- Les sessions live Claude maintiennent des gardes de sortie JSONL bornées. Les valeurs par défaut autorisent jusqu'à
  8 MiB et 20 000 lignes JSONL brutes par tour. Les tours de Claude intensifs en outils peuvent les augmenter
  par backend avec
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  et `maxTurnLines` ; OpenClaw limite ces réglages à 64 MiB et 100 000
  lignes.
- Les sessions CLI stockées constituent une continuité détenue par le provider. La réinitialisation implicite quotidienne de la
  session ne les interrompt pas ; les stratégies `/reset` et `session.reset` explicites le
  font toujours.
- Les sessions CLI fraîches se réensemencent normalement uniquement à partir du résumé de compactage de OpenClaw
  ainsi que de la queue post-compactage. Pour récupérer des sessions courtes qui sont invalidées
  avant le compactage, un backend peut choisir d'opter pour cela avec
  `reseedFromRawTranscriptWhenUncompacted: true`. OpenClaw maintient tout de même le réensemencement
  de la transcription brute borné et le limite aux invalidations sûres telles que les transcriptions
  CLI manquantes, les modifications de system-prompt/MCP, ou les tentatives après expiration de session ; les modifications
  du profil d'authentification ou de l'époque des informations d'identification ne réensemencent jamais l'historique de la transcription brute.

Notes de sérialisation :

- `serialize: true` maintient les exécutions de la même voie ordonnées.
- La plupart des CLI sérialisent sur une voie de fournisseur.
- OpenClaw abandonne la réutilisation de la session CLI stockée lorsque l'identité d'authentification sélectionnée change, y compris un changement d'identifiant de profil d'authentification, de clé API statique, de jeton statique, ou d'identité de compte OAuth lorsque la CLI en expose une. La rotation des jetons d'accès et de rafraîchissement OAuth ne coupe pas la session CLI stockée. Si une CLI n'expose pas un identifiant de compte OAuth stable, OpenClaw laisse cette CLI appliquer les autorisations de reprise.

## Prélude de repli depuis les sessions claude-cli

Lorsqu'une tentative `claude-cli` bascule vers un candidat non-CLI dans
[`agents.defaults.model.fallbacks`](/fr/concepts/model-failover), OpenClaw amorce
la tentative suivante avec un prélude de contexte récolté à partir du transcript
JSONL local de Claude Code à `~/.claude/projects/`. Sans cet amorçage, le provider de
tombe démarrerait à froid car le transcript de session propre à OpenClaw est vide
pour les exécutions `claude-cli`.

- Le prélude privilégie le dernier résumé `/compact` ou le marqueur `compact_boundary`,
  puis ajoute les tours post-frontière les plus récents dans la limite d'un budget
  de caractères. Les tours pré-frontière sont supprimés car le résumé les représente déjà.
- Les blocs d'outils sont fusionnés en indices `(tool call: name)` et `(tool result: …)` compacts
  pour respecter honnêtement le budget de prompt. Le résumé est étiqueté
  `(truncated)` s'il déborde.
- Les bascules `claude-cli` vers `claude-cli` de même provider reposent sur le
  `--resume` propre à Claude et ignorent le prélude.
- La graine réutilise la validation existante du chemin de fichier de session Claude, donc
  des chemins arbitraires ne peuvent pas être lus.

## Images (pass-through)

Si votre CLI accepte des chemins d'images, définissez `imageArg` :

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw écrira les images base64 dans des fichiers temporaires. Si `imageArg` est défini,
ces chemins sont passés en arguments de CLI. Si `imageArg` est manquant,
OpenClaw ajoute les chemins de fichiers au prompt (injection de chemin), ce qui suffit pour les CLI
qui chargent automatiquement les fichiers locaux à partir de chemins simples.

## Entrées / sorties

- `output: "json"` (par défaut) essaie d'analyser le JSON et d'extraire le texte + l'identifiant de session.
- Pour la sortie JSON du CLI Gemini, OpenClaw lit le texte de réponse à partir de
  `response` et l'utilisation à partir de `stats` lorsque `usage` est
  manquant ou vide.
- `output: "jsonl"` analyse les flux JSONL et extrait le message final de l'agent ainsi que les
  identifiants de session lorsqu'ils sont présents.
- `output: "text"` traite stdout comme la réponse finale.

Modes d'entrée :

- `input: "arg"` (par défaut) transmet l'invite en tant que dernier argument du CLI.
- `input: "stdin"` envoie l'invite via stdin.
- Si l'invite est très longue et que `maxPromptArgChars` est défini, stdin est utilisé.

## Valeurs par défaut (détenues par le plugin)

Les valeurs par défaut des backends CLI regroupés résident avec leur plugin propriétaire. Par exemple,
Anthropic possède `claude-cli` et Google possède `google-gemini-cli`. Les exécutions d'agent Codex OpenAI
utilisent le harnais app-server Codex via `openai/*` ; OpenClaw n'enregistre
plus de backend `codex-cli` regroupé.

Le plugin Anthropic regroupé enregistre une valeur par défaut pour `claude-cli` :

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

Le plugin Google regroupé enregistre également une valeur par défaut pour `google-gemini-cli` :

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

Notes sur le JSON de la Gemini CLI :

- Le texte de la réponse est lu depuis le champ JSON `response`.
- L'utilisation revient à `stats` lorsque `usage` est absent ou vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw déduit les jetons d'entrée à partir de
  `stats.input_tokens - stats.cached`.

Remplacez uniquement si nécessaire (courant : chemin absolu `command`).

## Valeurs par défaut détenues par le plugin

Les valeurs par défaut des backend CLI font désormais partie de la surface du plugin :

- Les plugins les enregistrent avec `api.registerCliBackend(...)`.
- Le backend `id` devient le préfixe du provider dans les références de modèle.
- La configuration utilisateur dans `agents.defaults.cliBackends.<id>` remplace toujours la valeur par défaut du plugin.
- Le nettoyage de la configuration spécifique au backend reste la propriété du plugin via le hook optionnel `normalizeConfig`.

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

`input` réécrit le système de prompt et le prompt utilisateur passés au CLI. `output` réécrit les deltas de l'assistant diffusés et le texte final analysé avant que OpenClaw ne gère ses propres marqueurs de contrôle et la diffusion par canal.

Pour les CLI qui émettent du JSONL compatible avec le flux stream- de Claude Code, définissez `jsonlDialect: "claude-stream-json"` dans la configuration de ce backend.

## Propriété de la compactage native

Certains backends CLI exécutent un agent qui compacte sa **propre** transcription, donc OpenClaw ne doit pas exécuter son résumé de sauvegarde contre eux - le faire contrecarre le propre compactage du backend et peut faire échouer définitivement le tour.

`claude-cli` n'a pas de point de terminaison de harnais - Claude Code compacte en interne - il déclare donc `ownsNativeCompaction: true`, et OpenClaw renvoie une opération vide à partir du chemin de compactage. Les sessions avec harnais natif telles que Codex continuent de router vers leur point de terminaison de compactage de harnais.

Parce que le backend possède le compactage, l'ancienne solution de contournement consistant à définir `contextTokens: 1_000_000` uniquement pour empêcher la sauvegarde de OpenClaw de se déclencher sur une session claude-cli n'est **plus nécessaire** - le désabonnement la remplace.

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

Ne déclarez `ownsNativeCompaction` que pour un backend qui possède véritablement son compactage : il doit délimiter de manière fiable sa propre transcription lorsqu'il approche de sa fenêtre de contexte et conserver une session reprise (par exemple `--resume` / `--session-id`) ; sinon, une session différée peut rester au-delà du budget. Les sessions `agentHarnessId` correspondantes continuent de router vers le point de terminaison du harnais.

## Superpositions MCP groupées

Les backends CLI ne reçoivent **pas** directement les appels d'outil OpenClaw, mais un backend peut opter pour une superposition de configuration MCP générée avec `bundleMcp: true`.

Comportement groupé actuel :

- `claude-cli` : fichier de configuration MCP strict généré
- `google-gemini-cli` : fichier des paramètres système Gemini généré

Lorsque le bundle MCP est activé, OpenClaw :

- lance un serveur MCP HTTP de boucle locale qui expose les outils de passerelle au processus CLI
- authentifie le pont avec un jeton par session (`OPENCLAW_MCP_TOKEN`)
- limite l'accès aux outils au contexte de la session, du compte et du channel actuels
- charge les serveurs bundle-MCP activés pour l'espace de travail actuel
- les fusionne avec toute forme de configuration/paramètres MCP de backend existante
- réécrit la configuration de lancement en utilisant le mode d'intégration détenu par le backend depuis l'extension propriétaire

Si aucun serveur MCP n'est activé, OpenClaw injecte toujours une configuration stricte lorsqu'un backend opte pour le bundle MCP afin que les exécutions en arrière-plan restent isolées.

Les runtimes MCP groupés délimités à la session sont mis en cache pour être réutilisés au sein d'une session, puis nettoyés après `mcp.sessionIdleTtlMs` millisecondes d'inactivité (10 minutes par défaut ; définissez `0` pour désactiver). Les exécutions intégrées ponctuelles telles que les sondes d'authentification, la génération de slugs et le nettoyage des demandes de rappel de mémoire active à la fin de l'exécution garantissent que les processus enfants stdio et les flux HTTP/SSE diffusables ne survivent pas à l'exécution.

## Limite de l'historique de réensemencement

Lorsqu'une session CLI fraîche est ensemencée à partir d'une transcription OpenClaw antérieure (par exemple après une nouvelle tentative `session_expired`), le bloc `<conversation_history>` rendu est limité pour empêcher les invites de réensemencement d'exploser. La valeur par défaut est `12288` caractères (environ 3000 jetons).

Les backends CLI Claude utilisent automatiquement une limite plus grande dérivée du niveau de contexte Claude résolu. Les exécutions Claude standard à 200K jetons conservent une plus grande tranche de transcription, et les exécutions Claude à 1M jetons en conservent une encore plus grande, tandis que les autres backends CLI conservent la valeur par défaut conservatrice.

- La limite ne régit que le bloc d'historique antérieur de l'invite de réensemencement. Les limites de sortie de session en direct sont ajustées séparément sous `reliability.outputLimits` (voir [Sessions](#sessions)).

## Limitations

- **Pas d'appels directs aux outils OpenClaw.** OpenClaw n'injecte pas d'appels d'outils dans
  le protocole du backend CLI. Les backends ne voient les outils Gateway que s'ils optent pour
  OpenClawOpenClawCLI`bundleMcp: true`.
- **Le streaming est spécifique au backend.** Certains backends diffusent du JSONL ; d'autres mettent en tampon
  jusqu'à la sortie.
- **Les sorties structurées** dépendent du format JSON du CLI.

## Dépannage

- **CLI introuvable** : définissez CLI`command` sur un chemin complet.
- **Mauvais nom de modèle** : utilisez `modelAliases` pour mapper `provider/model`CLI → modèle CLI.
- **Pas de continuité de session** : assurez-vous que `sessionArg` est défini et que `sessionMode` n'est pas
  `none`.
- **Images ignorées** : définissez `imageArg`CLI (et vérifiez que le CLI prend en charge les chemins de fichiers).

## Connexes

- [Gateway runbook](Gateway/en/gateway)
- [Local models](/fr/gateway/local-models)
