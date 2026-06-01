---
summary: "OpenClawGitHubExécuter les tours d'agent intégré OpenClaw via le harnais SDK Copilot intégré"
title: "Harnais SDK Copilot"
read_when:
  - You want to use the bundled GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

L'extension `copilot`OpenClawGitHubCLI intégrée permet à OpenClaw d'exécuter des tours d'agent
abonné Copilot intégrés via le GitHub Copilot CLI (`@github/copilot-sdk`)
au lieu du harnais PI intégré.

Utilisez le harnais SDK Copilot lorsque vous voulez que la session Copilot CLI possède la
boucle d'agent de bas niveau : exécution native des outils, compactage natif
(CLI`infiniteSessions`CLI) et état du fil géré par le CLI sous `copilotHome`OpenClawOpenClaw.
OpenClaw possède toujours les canaux de discussion, les fichiers de session, la sélection du modèle, les outils dynamiques OpenClaw
(bridgés), les approbations, la livraison des médias, le miroir de transcription visible,
les questions secondaires `/btw` (gérées par le repli PI in-tree — voir
[Side questions (`/btw`)](#side-questions-btw)) et `openclaw doctor`.

Pour la division plus large modèle/fournisseur/runtime, commencez par
[Agent runtimes](/fr/concepts/agent-runtimes).

## Conditions requises

- OpenClaw avec l'extension OpenClaw`copilot` intégrée disponible.
- Si votre configuration utilise `plugins.allow`, incluez `copilot` (l'id
  du manifeste dans `extensions/copilot/openclaw.plugin.json`npm). Une liste d'autorisation
  restrictive qui utilise le nom de package de style npm `@openclaw/copilot`
  laissera le plugin intégré bloqué et le runtime ne se chargera pas
  même avec `agentRuntime.id: "copilot"`.
- Un abonnement GitHub Copilot capable de piloter le Copilot CLI (ou une
  entrée env / auth-profile GitHubCLI`gitHubToken` pour les exécutions headless / cron).
- Un répertoire `copilotHome` accessible en écriture. Le harnais utilise par défaut
  `~/.openclaw/agents/<agentId>/copilot` pour une isolation complète par agent. La valeur par défaut
  de la plateforme (`%APPDATA%\copilot` sur Windows, `$XDG_CONFIG_HOME/copilot`
  ou `~/.config/copilot` ailleurs) est utilisée comme solution de repli pour la
  sonde du médecin (doctor probe) lorsqu'aucun répertoire home explicite n'est défini.

`openclaw doctor` exécute le [contrat de médecin](#doctor-and-probes) (doctor contract) fourni
pour l'extension ; les échecs à ce niveau constituent la méthode canonique pour
confirmer que l'environnement est prêt avant d'activer un agent.

## Installation du SDK à la demande

Le runtime de l'agent Copilot est livré avec son petit code TypeScript regroupé à
l'intérieur du tarball openclaw, mais le package sous-jacent `@github/copilot-sdk``@github/copilot-<platform>-<arch>`
(et son binaire CLI spécifique à la plateforme)
n'est **pas** installé par défaut — ensemble, ils ajoutent environ 260 Mo à
l'empreinte d'installation d'openclaw, et la plupart des utilisateurs d'openclaw ne sélectionnent pas
de modèle Copilot.

L'assistant propose d'installer le SDK la première fois que vous sélectionnez un
modèle `github-copilot/*` **et** que votre configuration active le modèle (ou son
fournisseur) pour le runtime de l'agent Copilot via
`agentRuntime: { id: "copilot" }` (voir [Démarrage rapide](#quickstart) ci-dessous).
Sans cette activation, openclaw utilise son fournisseur GitHub Copilot intégré
et ne demande jamais l'installation du SDK :

```
The Copilot agent runtime needs @github/copilot-sdk (~260 MB on first
install, downloads the @github/copilot CLI binary for your platform).
Install now? [Y/n]
```

Si vous acceptez, le SDK est installé dans
`~/.openclaw/npm-runtime/copilot/` et détecté lors des exécutions suivantes. L'installation
exécute `npm ci` par rapport à un `package-lock.json` archivé
livré avec openclaw à
`src/commands/copilot-sdk-install-manifest/package-lock.json`, de sorte que
le graphe transitif exact examiné pour cette version soit écrit sur le disque de chaque
machine utilisateur.

Si vous refusez, le runtime échouera lors de la première invocation avec un
message d'installation exploitable ; réexécutez `openclaw setup` pour réessayer l'installation
(ou copiez le manifeste épinglé dans `~/.openclaw/npm-runtime/copilot/` et
exécutez `npm ci` vous-même si vous devez installer hors ligne).

Le runtime résout le SDK dans cet ordre :

1. `import("@github/copilot-sdk")` par rapport à l'installation openclaw de l'hôte
   (couvre les checkouts source/dev et tout environnement qui pré-installe
   le SDK aux côtés d'openclaw).
2. Le répertoire de repli bien connu `~/.openclaw/npm-runtime/copilot/` (la
   cible d'installation de l'assistant).

Un SDK manquant génère une erreur unique avec le code `COPILOT_SDK_MISSING`
et la commande d'installation manuelle ci-dessus.

## Démarrage rapide

Épinglez un model (ou un provider) au harnais :

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

Les deux méthodes sont équivalentes. Utilisez `agentRuntime.id` sur une entrée de model unique
lorsque seul ce model doit être acheminé via le harnais ; définissez
`agentRuntime.id` sur un provider lorsque chaque model sous ce provider doit
l'utiliser.

## Providers pris en charge

Le harnais annonce la prise en charge du provider canonique `github-copilot`
(le même id détenu par `extensions/github-copilot`) :

- `github-copilot`

Tout élément en dehors de cet ensemble passe par la branche `auto_pi` de `selection.ts`
retour vers PI.

## Auth

Priorité par agent, appliquée pendant `runCopilotAttempt` :

1. `useLoggedInUser: true` explicite sur l'entrée de tentative. Utilise l'utilisateur connecté du Copilot
   CLI résolu sous le `copilotHome` de l'agent.
2. `gitHubToken` explicite sur l'entrée de tentative (avec `profileId` +
   `profileVersion`). Utile pour les appels directs au CLI et les tests où l'
   appelant souhaite contourner la résolution du profil d'auth.
3. `resolvedApiKey` + `authProfileId` résolus par contrat à partir de la
   forme `EmbeddedRunAttemptParams`. C'est le **chemin principal de production** :
   le core résout le profil d'auth `github-copilot` configuré de l'agent
   (via `src/infra/provider-usage.auth.ts:resolveProviderAuths`) avant
   d'invoquer le harnais, et le harnais consomme directement les deux champs.
   Cela permet à un profil d'auth `github-copilot:<profile>` de fonctionner de bout en bout
   pour les configurations sans tête / cron / multi-profil sans env vars.
4. **Env-var fallback** pour les exécutions directes CLI / dogfood lorsqu'aucun profil
   d'authentification n'est configuré. Le runtime vérifie les variables suivantes
   par ordre de priorité, en miroir du provider `github-copilot` livré
   (`extensions/github-copilot/auth.ts`) et de la configuration documentée du Copilot SDK :
   1. `OPENCLAW_GITHUB_TOKEN` -- override spécifique au harnais ; définissez ceci
      pour épingler un jeton pour le harnais OpenClaw sans perturber
      la configuration `gh`CLI / Copilot CLI à l'échelle du système.
   2. `COPILOT_GITHUB_TOKEN` -- env var standard Copilot SDK / CLI.
   3. `GH_TOKEN` -- env var standard CLI `gh` (correspond à la priorité
      existante du provider `github-copilot`).
   4. `GITHUB_TOKEN` -- fallback de jeton générique GitHub.

   La première valeur non vide gagne ; les chaînes vides sont considérées comme
   absentes. L'identifiant de profil de pool synthétisé est `env:<NAME>` et la
   profileVersion est une empreinte sha256 non réversible du
   jeton, donc la rotation de la valeur d'env nettoie correctement le pool client.

5. **`useLoggedInUser` par défaut** lorsqu'aucun signal de jeton n'est disponible.

Chaque agent obtient un `copilotHome` dédié, de sorte que les jetons, sessions
et configurations Copilot CLI ne fuient pas entre les agents sur la même machine. La valeur par défaut est
`<agentDir>/copilot` lorsque l'hôte fournit au harnais un répertoire d'agent
(isolant l'état du SDK du `models.json` / `auth-profiles.json` d'OpenClaw
dans le même répertoire), ou `~/.openclaw/agents/<agentId>/copilot` sinon.
Remplacez avec `copilotHome: <path>` sur l'entrée de tentative lorsque vous avez besoin d'un
emplacement personnalisé (par exemple, un montage partagé pour la migration).

`probeCopilotAuthShape` (voir [Doctor and probes](#doctor-and-probes)) est la
vérification de forme pure qui valide lequel des modes ci-dessus sera utilisé.
Il n'effectue pas de poignée de main SDK en direct.

## Configuration surface

Le harnais lit sa configuration à partir de l'entrée par tentative
(`runCopilotAttempt({...})`) plus un petit ensemble de valeurs par défaut d'environnement dans
`extensions/copilot/src/` :

- `copilotHome` — répertoire d'état CLI par agent (valeurs par défaut documentées ci-dessus).
- `model` — chaîne ou `{ provider, id, api? }`. Si omis, OpenClaw utilise
  la sélection de modèle normale de l'agent et le harnais vérifie que le
  provider résolu fait partie de l'ensemble pris en charge.
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`. Correspondances de
  la résolution `ThinkLevel` / `ReasoningLevel` de
  OpenClaw dans
  `auto-reply/thinking.ts`.
- `infiniteSessionConfig` — substitution facultative pour le bloc
  `infiniteSessions` du SDK piloté par `harness.compact`. Il est sûr de
  laisser les valeurs par défaut telles quelles.
- `hooksConfig` — configuration de pont facultative exposant les crochets
  avant/après-écriture-de-message de OpenClaw à la boucle du SDK.
- `permissionPolicy` — substitution facultative pour le gestionnaire
  `onPermissionRequest` du SDK utilisé pour les types d'outils SDK intégrés
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`). Par défaut
  à `rejectAllPolicy` comme filet de sécurité ; en pratique, le SDK n'invoque
  jamais aucun de ces types car chaque outil OpenClaw ponté est
  enregistré avec `overridesBuiltInTool: true` et
  `skipPermission: true`, donc 100 % des appels d'outils passent par le
  `execute()` encapsulé de OpenClaw. Voir [Permissions and ask_user](#permissions-and-ask_user).
- `enableSessionTelemetry` — routage OpenTelemetry optionnel via
  `telemetry-bridge.ts`.

Rien dans le reste de OpenClaw n'a besoin de connaître ces champs. Les
autres plugins, canaux et code principal ne voient que la forme standard
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult`.

## Compaction

Lorsque `harness.compact` s'exécute, le harnais Copilot SDK :

1. Active `infiniteSessions` sur la session SDK.
2. Permet au SDK d'effectuer sa compactage natif.
3. Écrit un marqueur de forme OpenClaw à
   `workspacePath/files/openclaw-compaction-<ts>.json` afin que les lecteurs de
   transcriptions OpenClaw existants voient toujours un artefact familier.

Le miroir de transcription côté OpenClaw (voir ci-dessous) continue de recevoir les
messages post-compaction, de sorte que l'historique de chat visible par l'utilisateur reste cohérent.

## Miroir de transcription

`runCopilotAttempt` effectue une double écriture des messages pouvant être miroirés de chaque tour dans la
transcription d'audit OpenClaw via
`extensions/copilot/src/dual-write-transcripts.ts`. Le miroir est
délimité par session (`copilot:${sessionId}`) et utilise une identité
par message (`${role}:${sha256_16(role,content)}`) afin que les réémissions d'entrées de tours précédents
entrent en collision avec les clés existantes sur le disque et ne soient pas dupliquées.

Le miroir est enveloppé de deux couches de confinement des défaillances pour qu'une défaillance
d'écriture de transcription ne puisse pas faire échouer la tentative : un enveloppeur interne de meilleure tentative et une
défense en profondeur `.catch(...)` au niveau de la tentative. Les défaillances sont enregistrées mais
ne sont pas affichées.

## Questions secondaires (`/btw`)

`/btw` n'est **pas** natif sur ce harnais. `createCopilotAgentHarness()`
laisse volontairement `harness.runSideQuestion` indéfini, de sorte que le répartiteur `/btw`
de OpenClaw (`src/agents/btw.ts`) revient au même chemin de repli PI interne qu'il utilise pour chaque runtime non-Codex : le fournisseur de modèle configuré est
appelé directement avec une courte invite de question secondaire et diffusé en retour via
`streamSimple` (aucune session CLI, aucun emplacement de pool supplémentaire).

Cela permet de garder les sessions Copilot CLI réservées à la boucle de tour principale de l'agent, et
maintient le comportement `/btw` identique aux autres runtimes pris en charge par PI. Le contrat est
affirmé dans
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
sous `describe("runSideQuestion")`.

## Doctor et sondes

`extensions/copilot/doctor-contract-api.ts` est automatiquement chargé par
`src/plugins/doctor-contract-registry.ts`. Il fournit :

- Un `legacyConfigRules` vide (aucun champ retiré au MVP).
- Un `normalizeCompatibilityConfig` sans effet (conservé pour que les futurs retraits de champs
  aient un emplacement stable dans l'arborescence).
- Une entrée `sessionRouteStateOwners` réclamant le provider `github-copilot` ;
  runtime `copilot` ; clé de session CLI `copilot` ; préfixe de profil
  d'authentification `github-copilot:`.

`extensions/copilot/src/doctor-probes.ts` exporte trois sondes impératives
que les hôtes (y compris `openclaw doctor`) peuvent appeler pour vérifier l'environnement :

| Sonde                      | Ce qu'elle vérifie                                                                                     | Raisons possibles de l'échec                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` renvoie 0 avec une chaîne de version non vide                                      | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout`   |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + écriture + rm d'un fichier marqueur                                           | `copilothome-not-writable` (avec l'erreur fs sous-jacente dans `details.rawError`) |
| `probeCopilotAuthShape`    | Au moins l'un des éléments suivants : `useLoggedInUser`, `gitHubToken` ou `profileId`+`profileVersion` | `no-auth-source`                                                                   |

Chaque sonde accepte une couture DI (`spawnFn`, `fsApi`) afin que les tests ne lancent pas le
vrai Copilot CLI ni ne touchent au fs de l'hôte.

## Limitations

- Le harnais ne réclame que le provider canonique `github-copilot` au MVP.
  Des providers supplémentaires (BYOK ou autres) devraient être intégrés dans des PR ultérieurs qui
  livrent l'adaptateur en même temps que le câblage.
- Le harnais ne fournit pas de TUI ; le TUI de PI n'est pas affecté et reste le
  solution de repli pour les runtimes qui n'ont pas de surface homologue.
- L'état de session PI n'est pas migré lorsqu'un agent bascule vers `copilot`.
  La sélection s'effectue par tentative ; les sessions PI existantes restent valides.
- **L'`ask_user` interactif n'est pas encore connecté.** Le gestionnaire
  `onUserInputRequest` du SDK n'est intentionnellement pas enregistré, ce qui,
  conformément au contrat du SDK, masque totalement l'outil `ask_user` au
  modèle. Les agents exécutés sous ce harnais prennent des décisions
  basées sur leur meilleur jugement à partir de l'invite initiale, plutôt que de poser des
  questions de clarification en cours de tour. Une suite portera le modèle codex situé à
  `extensions/codex/src/app-server/user-input-bridge.ts` pour acheminer les
  `UserInputRequest`s du SDK via le chemin d'invite channel/TUI OpenClaw/TUI ; l'échafaudage
  dormant dans `extensions/copilot/src/user-input-bridge.ts`
  est la surface que cette suite connectera.

## Permissions et ask_user

L'application des permissions pour les outils OpenClaw relais se produit **à l'intérieur de
l'enveloppe de l'outil**, et non via le rappel `onPermissionRequest` du SDK. Le
même `wrapToolWithBeforeToolCallHook` que celui utilisé par PI
(`src/agents/pi-tools.before-tool-call.ts`) est appliqué par
`createOpenClawCodingTools` à chaque outil de codage : la détection de boucle,
les stratégies de plug-in de confiance, les crochets avant appel d'outil et les approbations
de plug-in en deux phases via la passerelle (`plugin.approval.request`) s'exécutent tous avec le
même chemin de code exact que les tentatives PI natives.

Pour permettre à cette enveloppe de prendre la décision, l'outil SDK renvoyé par
`convertOpenClawToolToSdkTool` est marqué avec :

- `overridesBuiltInTool: true` — remplace l'outil intégré du même nom du Copilot CLI
  (edit, read, write, bash, …) afin que chaque invocation
  d'outil soit redirigée vers OpenClaw.
- `skipPermission: true` — indique au SDK de ne pas déclencher
  `onPermissionRequest({kind: "custom-tool"})` avant d'invoquer l'outil.
  Le `execute()` enveloppé effectue en interne le contrôle de politique OpenClaw plus riche ;
  une invite au niveau du SDK soit court-circuiterait l'application
  de OpenClaw (si nous autorisons tout), soit bloquerait chaque appel d'outil (si nous
  rejetons tout) — aucun des deux ne correspond à la parité avec PI.

Le harnais codex intégré utilise la même séparation : les outils OpenClaw pontés sont encapsulés (`extensions/codex/src/app-server/dynamic-tools.ts`) et les propres types d'approbation natifs du codex-app-server (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`) sont acheminés via `plugin.approval.request` (`extensions/codex/src/app-server/approval-bridge.ts`). L'équivalent du Copilot SDK — échec fermé `rejectAllPolicy` pour tout type non-`custom-tool` qui atteint `onPermissionRequest` — constitue le même filet de sécurité, et il ne se déclenche pas en pratique car `overridesBuiltInTool: true` remplace chaque élément intégré.

Pour que la couche d'outils encapsulés prenne des décisions de stratégie équivalentes à celles de PI,
le harnais transmet le contexte complet de tentative d'outil PI à
`createOpenClawCodingTools` — identité (`senderIsOwner`,
`memberRoleIds`, `ownerOnlyToolAllowlist`, …), canal/routage
(`groupId`, `currentChannelId`, `replyToMode`, bascules message-tool),
authentification (`authProfileStore`), identité d'exécution
(`sessionKey`/`runSessionKey` dérivé de `sandboxSessionKey`,
`runId`), contexte du modèle (`modelApi`, `modelContextWindowTokens`,
`modelCompat`, `modelHasVision`) et hooks d'exécution (`onToolOutcome`,
`onYield`). Sans ces champs, les listes d'autorisation propriétaires uniquement se comportent silencieusement
comme un refus par défaut, les stratégies de confiance des plugins ne peuvent pas être résolues vers la
bonne portée, et `session_status: "current"` se résout en une clé de
sandbox obsolète. Le constructeur de pont se trouve dans
`extensions/copilot/src/tool-bridge.ts` et reflète l'appel
autorisatif de PI à
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`. Deux champs PI
ne sont intentionnellement **pas** transmis dans le cadre de la MVP et sont suivis en tant que suites :
`sandbox` (le harnais ne transite pas encore par `resolveSandboxContext`)
et la mécanique de recherche d'outil/code de PI
(`toolSearchCatalogRef`, `includeCoreTools`,
`includeToolSearchControls`, `toolSearchCatalogExecutor`,
`toolConstructionPlan`), qui n'a pas d'analogue à la frontière du SDK.

### Jeton GitHub au niveau de la session

Le contrat du SDK Copilot distingue le jeton GitHub au **niveau client** (GitHub`CopilotClientOptions.gitHubToken`, utilisé pour authentifier le processus CLI lui-même) du jeton au **niveau session** (`SessionConfig.gitHubToken`, qui détermine l'exclusion de contenu, le routage du modèle et le quota pour cette session et est honoré à la fois sur `createSession` et `resumeSession`). Le harnais résout l'authentification une fois via `resolveCopilotAuth` et définit les deux champs lorsque le mode d'authentification est `gitHubToken` (un `auth.gitHubToken` explicite ou un `resolvedApiKey` résolu par contrat à partir d'un profil d'authentification `github-copilot` configuré). Lorsque le mode résolu est `useLoggedInUser`, le champ au niveau session est omis afin que le SDK continue à dériver l'identité à partir de l'identité connectée.

`ask_user` est intentionnellement masqué — voir les Limitations ci-dessus.

## Connexes

- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Plugins de harnais d'agent (référence SDK)](/fr/plugins/sdk-agent-harness)
