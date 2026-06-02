---
summary: "OpenClawGitHubExécuter les tours d'agent intégré d'OpenClaw via le harnais du SDK GitHub Copilot externe"
title: "Harnais SDK Copilot"
read_when:
  - You want to use the GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

Le plugin externe `@openclaw/copilot`OpenClawGitHubCLI permet à OpenClaw d'exécuter des tours d'agent Copilot intégrés par le biais de l'abonnement
via le CLI GitHub Copilot (`@github/copilot-sdk`)
au lieu du harnais PI intégré.

Utilisez le harnais Copilot SDK lorsque vous voulez que la session Copilot CLI possède la
boucle d'agent de bas niveau : exécution native d'outil, compactage natif
(CLI`infiniteSessions`CLI), et état du thread géré par CLI sous `copilotHome`OpenClawOpenClaw.
OpenClaw possède toujours les canaux de chat, les fichiers de session, la sélection de modèle, les outils dynamiques
OpenClaw (pontés), les approbations, la livraison des médias, le miroir de transcription visible,
les questions secondaires `/btw` (gérées par le repli PI en-arbre — voir
[Side questions (`/btw`)](#side-questions-btw)), et `openclaw doctor`.

Pour la séparation plus large modèle/fournisseur/runtime, commencez par
[Agent runtimes](/fr/concepts/agent-runtimes).

## Conditions requises

- OpenClaw avec le plugin OpenClaw`@openclaw/copilot` installé.
- Si votre configuration utilise `plugins.allow`, incluez `copilot`npm (l'id de manifeste
  déclaré par le plugin). Une liste d'autorisation
  restrictive qui utilise le nom de package de style npm `@openclaw/copilot`
  laissera le plugin bloqué et le runtime ne se chargera pas
  même avec `agentRuntime.id: "copilot"`.
- Un abonnement GitHub Copilot qui peut piloter le CLI Copilot (ou une
  entrée env / auth-profile GitHubCLI`gitHubToken` pour les exécutions headless / cron).
- Un répertoire `copilotHome` accessible en écriture. Le harnais utilise par défaut
  `~/.openclaw/agents/<agentId>/copilot` pour une isolation complète par agent. La valeur par
  défaut de la plateforme (`%APPDATA%\copilot` sur Windows, `$XDG_CONFIG_HOME/copilot`
  ou `~/.config/copilot` ailleurs) est utilisée comme solution de repli de la sonde doctor
  lorsqu aucun home explicite n'est défini.

`openclaw doctor` exécute le
[doctor contract](#doctor-and-probes) pour l'extension ; les échecs constituent
le moyen canonique de confirmer que l'environnement est prêt avant d'activer
un agent.

## Installation du plugin

Le runtime Copilot est un plugin externe, le package principal `openclaw` ne contient donc
pas la dépendance `@github/copilot-sdk``@github/copilot-<platform>-<arch>` ni son binaire CLI spécifique à la plateforme.
Ensemble, ils ajoutent environ
260 Mo, installez-les donc uniquement pour les agents qui optent pour ce runtime :

```bash
openclaw plugins install @openclaw/copilot
```

L'assistant installe le plugin la première fois que vous sélectionnez un
modèle `github-copilot/*` **et** que votre configuration active le modèle (ou son
provider) dans le runtime de l'agent Copilot via
`agentRuntime: { id: "copilot" }` (voir [Quickstart](#quickstart) ci-dessous).
Sans cette activation, openclaw utilise son provider GitHub Copilot intégré
et n'installe jamais le plugin de runtime.

Le runtime résout le SDK dans cet ordre :

1. `import("@github/copilot-sdk")` à partir du package `@openclaw/copilot`
   installé.
2. Le répertoire de repli bien connu `~/.openclaw/npm-runtime/copilot/` (la
   cible de l'installation à la demande héritée).

Un SDK manquant génère une seule erreur avec le code `COPILOT_SDK_MISSING`
et la commande de réinstallation du plugin ci-dessus.

## Démarrage rapide

Épinglez un modèle (ou un provider) au harnais :

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

Les deux méthodes sont équivalentes. Utilisez `agentRuntime.id` sur une entrée de modèle unique
lorsque seul ce modèle doit être routé via le harnais ; définissez
`agentRuntime.id` sur un provider lorsque chaque modèle sous ce provider doit
l'utiliser.

## Providers pris en charge

Le harnais annonce la prise en charge du provider canonique `github-copilot`
(le même id possédé par `extensions/github-copilot`) :

- `github-copilot`

Tout ce qui est en dehors de cet ensemble traverse la branche `auto_pi` de `selection.ts`
pour revenir à PI.

## Auth

Priorité par agent, appliquée pendant `runCopilotAttempt` :

1. **`useLoggedInUser: true` explicite** sur l'entrée de la tentative. Utilise l'utilisateur connecté du Copilot
   CLI résolu sous le `copilotHome` de l'agent.
2. **`gitHubToken` explicite** sur l'entrée de la tentative (avec `profileId` +
   `profileVersion`). Utile pour les invocations directes du CLI et les tests où l'appelant
   souhaite contourner la résolution du profil d'authentification.
3. **`resolvedApiKey` + `authProfileId` résolu par contrat** à partir de la
   forme `EmbeddedRunAttemptParams`. Il s'agit du **chemin principal de production** :
   le cœur résout le profil d'authentification `github-copilot` configuré de l'agent
   (via `src/infra/provider-usage.auth.ts:resolveProviderAuths`) avant
   d'invoquer le harnais, et le harnais consomme directement les deux champs.
   Cela permet à un profil d'authentification `github-copilot:<profile>` de fonctionner de bout en bout
   pour les configurations sans interface graphique / cron / multi-profils sans env vars.
4. **Secours via env-var** pour les exécutions directes du CLI / dogfood où aucun profil
   d'authentification n'est configuré. Le runtime vérifie les vars suivants dans
   l'ordre de priorité, en miroir avec le provider `github-copilot` livré
   (`extensions/github-copilot/auth.ts`) et la configuration documentée du Copilot SDK :
   1. `OPENCLAW_GITHUB_TOKEN` -- remplacement spécifique au harnais ; définissez ceci
      pour épingler un jeton pour le harnais OpenClaw sans perturber
      la configuration `gh` / Copilot CLI à l'échelle du système.
   2. `COPILOT_GITHUB_TOKEN` -- env var standard pour Copilot SDK / CLI.
   3. `GH_TOKEN` -- env var standard pour le CLI `gh` (correspond à la priorité
      existante du provider `github-copilot`).
   4. `GITHUB_TOKEN` -- secours générique pour jeton GitHub.

   La première valeur non vide l'emporte ; les chaînes vides sont considérées comme
   absentes. L'identifiant du profil de pool synthétisé est `env:<NAME>` et le
   profileVersion est une empreinte sha256 non réversible du
   jeton, de sorte que la rotation de la valeur d'environnement invalide proprement le pool client.

5. **`useLoggedInUser` par défaut** lorsqu'aucun signal de jeton n'est disponible.

Chaque agent obtient un `copilotHome` dédié afin que les jetons, sessions et
configurations du CLI ne fuient pas entre les agents sur la même machine. La valeur par défaut est
`<agentDir>/copilot` lorsque l'hôte fournit au harnais un répertoire d'agent
(isolant l'état du SDK des `models.json` / `auth-profiles.json` d'OpenClaw dans
le même répertoire), ou `~/.openclaw/agents/<agentId>/copilot` sinon.
Remplacez par `copilotHome: <path>` dans l'entrée de tentative lorsque vous avez besoin d'un
emplacement personnalisé (par exemple, un montage partagé pour la migration).

`probeCopilotAuthShape` (voir [Doctor and probes](#doctor-and-probes)) est la
vérification de forme pure qui valide lequel des modes ci-dessus sera utilisé.
Elle n'effectue pas de poignée de main SDK en direct.

## Surface de configuration

Le harnais lit sa configuration à partir de l'entrée par tentative
(`runCopilotAttempt({...})`) ainsi qu'un petit ensemble de valeurs par défaut d'environnement dans
`extensions/copilot/src/` :

- `copilotHome` — répertoire d'état CLI par agent (valeurs par défaut documentées ci-dessus).
- `model` — chaîne ou `{ provider, id, api? }`. Si omis, OpenClaw utilise
  la sélection normale de modèle de l'agent et le harnais vérifie que le fournisseur
  résolu fait partie de l'ensemble pris en charge.
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`. Correspondances à partir de
  la résolution `ThinkLevel` / `ReasoningLevel` d'OpenClaw dans
  `auto-reply/thinking.ts`.
- `infiniteSessionConfig` — substitution facultative pour le bloc
  `infiniteSessions` du SDK piloté par `harness.compact`. Les valeurs par défaut sont sûres à
  laisser telles quelles.
- `hooksConfig` — configuration de pont facultative exposant les hooks OpenClaw
  avant/après-écriture-de-message à la boucle du SDK.
- `permissionPolicy` — substitution facultative pour le gestionnaire
  `onPermissionRequest` du SDK utilisé pour les types d'outils SDK intégrés
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`). Par défaut,
  `rejectAllPolicy` est utilisé comme filet de sécurité ; en pratique, le SDK n'invoque
  jamais aucun de ces types car chaque outil OpenClaw ponté est
  enregistré avec `overridesBuiltInTool: true` et
  `skipPermission: true`, donc 100 % des appels d'outils passent par le
  `execute()` encapsulé de OpenClaw. Voir [Permissions and ask_user](#permissions-and-ask_user).
- `enableSessionTelemetry` — routage OpenTelemetry optionnel via
  `telemetry-bridge.ts`.

Rien dans le reste de OpenClaw n'a besoin de connaître ces champs. Les autres
plugins, canaux et code central ne voient que la forme standard
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult`.

## Compactage

Lorsque `harness.compact` s'exécute, le harnais Copilot SDK :

1. Active `infiniteSessions` sur la session SDK.
2. Laisse le SDK effectuer son compactage natif.
3. Écrit un marqueur en forme OpenClaw à
   `workspacePath/files/openclaw-compaction-<ts>.json` afin que les lecteurs de transcription OpenClaw
   existants voient toujours un artefact familier.

Le miroir de transcription côté OpenClaw (voir ci-dessous) continue de recevoir les
messages post-compactage, afin que l'historique de chat visible par l'utilisateur reste cohérent.

## Mirage de transcription

`runCopilotAttempt` effectue une double écriture des messages miroirables de chaque tour dans le journal d'audit OpenClaw via `extensions/copilot/src/dual-write-transcripts.ts`. Le miroir est limité à la session (`copilot:${sessionId}`) et utilise une identité par message (`${role}:${sha256_16(role,content)}`) de sorte que les réémissions d'entrées des tours précédents entrent en collision avec les clés existantes sur le disque et ne soient pas dupliquées.

Le miroir est enveloppé dans deux couches de confinement d'échec afin qu'une défaillance d'écriture dans le journal ne puisse pas faire échouer la tentative : un wrapper interne de meilleure tentative et une défense en profondeur `.catch(...)` au niveau de la tentative. Les échecs sont enregistrés mais n'apparaissent pas.

## Questions annexes (`/btw`)

`/btw` n'est **pas** natif dans ce harnais. `createCopilotAgentHarness()` laisse délibérément `harness.runSideQuestion` indéfini, de sorte que le répartiteur `/btw` de OpenClaw (`src/agents/btw.ts`) revient au même chemin de repli PI interne qu'il utilise pour chaque environnement d'exécution non-Codex : le fournisseur de modèle configuré est appelé directement avec une invite courte de question annexe et renvoyé via `streamSimple` (pas de session CLI, pas d'emplacement de pool supplémentaire).

Cela permet de garder les sessions Copilot CLI réservées à la boucle principale de l'agent, et de garder le comportement `/btw` identique aux autres environnements d'exécution pris en charge par PI. Le contrat est affirmé dans [`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts) sous `describe("runSideQuestion")`.

## Docteur et sondes

`extensions/copilot/doctor-contract-api.ts` est chargé automatiquement par `src/plugins/doctor-contract-registry.ts`. Il contribue :

- Un `legacyConfigRules` vide (aucun champ retiré au MVP).
- Un `normalizeCompatibilityConfig` sans effet (conservé pour que les futurs retraits de champs aient un foyer stable dans l'arborescence).
- Une entrée `sessionRouteStateOwners` réclamant le fournisseur `github-copilot` ; l'environnement d'exécution `copilot` ; la clé de session CLI `copilot` ; le préfixe de profil d'authentification `github-copilot:`.

`extensions/copilot/src/doctor-probes.ts` exporte trois sondes impératives
que les hôtes (y compris `openclaw doctor`) peuvent appeler pour vérifier l'environnement :

| Sonde                      | Ce qu'elle vérifie                                                                                      | Raisons possibles de l'échec                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` quitte avec le code 0 et une chaîne de version non vide                             | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout`   |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + écriture + rm d'un fichier marqueur                                            | `copilothome-not-writable` (avec l'erreur fs sous-jacente dans `details.rawError`) |
| `probeCopilotAuthShape`    | Au moins l'un des éléments suivants : `useLoggedInUser`, `gitHubToken`, ou `profileId`+`profileVersion` | `no-auth-source`                                                                   |

Chaque sonde accepte une couture DI (`spawnFn`, `fsApi`) afin que les tests ne génèrent pas le
vrai Copilot CLI ni ne touchent au fs de l'hôte.

## Limitations

- Le harnais ne revendique que le provider `github-copilot` canonique lors de la MVP.
  Des providers supplémentaires (BYOK ou autres) devraient être intégrés dans des PR ultérieurs qui
  livrent l'adaptateur alongside le wire-up.
- Le harnais ne fournit pas de TUI ; le TUI de PI n'est pas affecté et reste le
  fallback pour les runtimes qui n'ont pas de surface homologue.
- L'état de la session PI n'est pas migré lorsqu'un agent bascule vers `copilot`.
  La sélection s'effectue par tentative ; les sessions PI existantes restent valides.
- **L'`ask_user` interactif n'est pas encore connecté.** Le gestionnaire
  `onUserInputRequest` du SDK n'est pas intentionnellement enregistré, ce qui,
  selon le contrat du SDK, masque entièrement l'`ask_user` tool du
  model. Les agents exécutés avec ce harnais prennent des décisions
  éclairées à partir du prompt initial plutôt que de poser des questions
  de clarification en cours de tour. Une suite portera le modèle de codex à
  `extensions/codex/src/app-server/user-input-bridge.ts` pour acheminer les
  `UserInputRequest`s du SDK via le chemin de prompt OpenClaw channel/TUI TUI ; l'échafaudage
  dormant dans `extensions/copilot/src/user-input-bridge.ts`
  est la surface que cette suite connectera.

## Autorisations et ask_user

L'application des autorisations pour les outils OpenClaw pontés se produit **à l'intérieur du
wrapper d'outil**, et non via le rappel `onPermissionRequest` du SDK. Le même
`wrapToolWithBeforeToolCallHook` que celui utilisé par PI
(`src/agents/pi-tools.before-tool-call.ts`) est appliqué par
`createOpenClawCodingTools` à chaque outil de codage : détection de boucle,
stratégies de plugins approuvés, crochets avant appel d'outil, et approbations
de plugins en deux phases via la passerelle (`plugin.approval.request`) s'exécutent tous avec
le même chemin de code exact que les tentatives natives de PI.

Pour permettre à ce wrapper de posséder la décision, l'outil SDK renvoyé par
`convertOpenClawToolToSdkTool` est marqué avec :

- `overridesBuiltInTool: true` — remplace l'outil intégré du même nom du Copilot CLI
  (edit, read, write, bash, …) afin que chaque invocation d'outil
  soit renvoyée vers OpenClaw.
- `skipPermission: true` — indique au SDK de ne pas déclencher
  `onPermissionRequest({kind: "custom-tool"})` avant d'invoquer l'outil.
  Le `execute()` encapsulé effectue en interne la vérification de stratégie OpenClaw plus riche ;
  un prompt au niveau du SDK soit court-circuiterait l'application OpenClaw
  (si nous autorisons tout) soit bloquerait chaque appel d'outil (si nous
  rejetons tout) — aucun des deux ne correspond à la parité avec PI.

Le harnais codex intégré utilise la même séparation : les outils OpenClaw pontés sont encapsulés (`extensions/codex/src/app-server/dynamic-tools.ts`) et les propres types d'approbation natifs du codex-app-server (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`) sont acheminés via `plugin.approval.request` (`extensions/codex/src/app-server/approval-bridge.ts`). L'équivalent du SDK Copilot — `rejectAllPolicy` en échec fermé pour tout type non `custom-tool` qui atteint `onPermissionRequest` — constitue le même filet de sécurité, et il ne se déclenche pas en pratique car `overridesBuiltInTool: true` remplace chaque élément intégré.

Pour que la couche d'outil encapsulé prenne des décisions de stratégie équivalentes à PI,
le harnais transfère le contexte complet de tentative d'outil PI vers
`createOpenClawCodingTools` — identité (`senderIsOwner`,
`memberRoleIds`, `ownerOnlyToolAllowlist`, …), channel/routage
(`groupId`, `currentChannelId`, `replyToMode`, bascules d'outil de message),
authentification (`authProfileStore`), identité d'exécution
(`sessionKey`/`runSessionKey` dérivée de `sandboxSessionKey`,
`runId`), contexte du model (`modelApi`, `modelContextWindowTokens`,
`modelCompat`, `modelHasVision`) et crochets d'exécution (`onToolOutcome`,
`onYield`). Sans ces champs, les listes d'autorisation propriétaire uniquement se comportent silencieusement
comme des refus par défaut, les stratégies de confiance de plugin ne peuvent pas être résolues vers la
bonne portée, et `session_status: "current"` se résout en une clé de
sandbox obsolète. Le constructeur de pont se trouve dans
`extensions/copilot/src/tool-bridge.ts` et reflète l'appel
autorisatif de PI à
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`. Deux champs PI
ne sont intentionnellement **pas** transférés lors du MVP et suivis en tant que suites :
`sandbox` (le harnais ne route pas encore via `resolveSandboxContext`)
et la machinerie de recherche d'outil/mode de code PI
(`toolSearchCatalogRef`, `includeCoreTools`,
`includeToolSearchControls`, `toolSearchCatalogExecutor`,
`toolConstructionPlan`), qui n'a pas d'analogue à la limite du SDK.

### Jeton GitHub au niveau de la session

Le contrat du SDK Copilot fait la distinction entre le jeton GitHub de **niveau client** (GitHub`CopilotClientOptions.gitHubToken`, utilisé pour authentifier le processus CLI lui-même) et le jeton de **niveau session** (`SessionConfig.gitHubToken`, qui détermine l'exclusion de contenu, le routage de modèle et le quota pour cette session, et est honoré à la fois sur `createSession` et `resumeSession`). Le harnais résout l'authentification une fois via `resolveCopilotAuth` et définit les deux champs lorsque le mode d'authentification est `gitHubToken` (un `auth.gitHubToken` explicite ou un `resolvedApiKey` résolu par contrat à partir d'un profil d'authentification `github-copilot` configuré). Lorsque le mode résolu est `useLoggedInUser`, le champ de niveau session est omis afin que le SDK continue à dériver l'identité à partir de l'identité connectée.

`ask_user` est intentionnellement masqué — voir Limitations ci-dessus.

## Connexes

- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Plugins de harnais d'agent (référence SDK)](/fr/plugins/sdk-agent-harness)
