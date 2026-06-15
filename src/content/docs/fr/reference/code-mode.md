---
summary: "OpenClawOpenClaw code mode : une surface d'outil exec/wait facultative soutenue par QuickJS-WASI et un catalogue d'outils délimité par une exécution"
title: "Code mode"
sidebarTitle: "Code mode"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

Le mode code est une fonctionnalité expérimentale du runtime d'agent OpenClaw. Il est désactivé par défaut. Lorsque vous l'activez, OpenClaw modifie ce que le modèle voit pour une exécution : au lieu d'exposer directement chaque schéma d'outil activé, le modèle voit uniquement OpenClawOpenClaw`exec` et `wait`.

Cette page documente le mode code OpenClaw. Ce n'est pas le mode code Codex. Les deux fonctionnalités partagent un nom, mais elles sont implémentées par des runtimes différents et exposent des contrats OpenClaw`exec` différents :

- Le mode code Codex est activé pour les threads du serveur d'application Codex, sauf si une stratégie d'outil restreinte désactive le mode code natif. Il s'exécute dans le harnais de codage Codex, où le modèle écrit des commandes shell via un contrat `exec.command`.
- Le mode code OpenClaw est désactivé à moins que OpenClaw`tools.codeMode.enabled: true`OpenClaw ne soit configuré. Il s'exécute dans le runtime d'agent générique OpenClaw, où le modèle écrit des programmes JavaScript ou TypeScript via un contrat `exec.code`.

Le mode code Codex et la recherche dynamique d'outils native Codex sont des surfaces stables du harnais Codex. Le mode code OpenClaw est un adaptateur de surface d'outil expérimental propriétaire d'OpenClaw pour les exécutions génériques OpenClaw. Il utilise OpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw, un catalogue d'outils caché OpenClaw, et l'exécuteur d'outils OpenClaw normal.

## Qu'est-ce que c'est ?

Le mode de code OpenClaw permet au modèle d'écrire un petit programme JavaScript ou TypeScript au lieu de choisir directement parmi une longue liste d'outils.

Lorsque le mode de code est actif :

- La liste d'outils visible par le modèle est exactement `exec` et `wait`.
- `exec` évalue le JavaScript ou TypeScript généré par le modèle dans un worker QuickJS-WASI contraint.
- Les outils OpenClaw normaux sont masqués du prompt du modèle et exposés dans le programme invité via OpenClaw`ALL_TOOLS` et `tools`.
- Le code invité peut rechercher le catalogue caché, décrire un outil et appeler un outil via le même chemin d'exécution OpenClaw utilisé par les tours d'agent normaux.
- Les outils MCP sont regroupés sous l'espace de noms `MCP`. En mode code, cet espace de noms
  est la seule méthode prise en charge pour appeler des outils MCP.
- `wait` reprend une exécution en mode code suspendue lorsque des appels d'outils imbriqués sont
  encore en attente.

La distinction importante : le mode code modifie la surface d'orchestration orientée modèle.
Il ne remplace pas les outils OpenClaw, les outils de plugin, les outils MCP, l'authentification,
la politique d'approbation, le comportement du canal ou la sélection du modèle.

## Pourquoi est-ce une bonne chose ?

Le mode code facilite l'utilisation de grands catalogues d'outils par les modèles.

- Surface de prompt réduite : les fournisseurs reçoivent deux outils de contrôle au lieu de dizaines
  ou de centaines de schémas d'outils complets.
- Meilleure orchestration : le modèle peut utiliser des boucles, des jointures, de petites transformations,
  une logique conditionnelle et des appels d'outils imbriqués parallèles à l'intérieur d'une seule cellule de code.
- Neutre vis-à-vis du fournisseur : cela fonctionne pour les outils OpenClaw, de plugin, MCP et client sans
  dépendre de l'exécution de code native du fournisseur.
- Les stratégies existantes restent en vigueur : les appels d'outils imbriqués passent toujours par la stratégie OpenClaw,
  les approbations, les crochets (hooks), le contexte de session et les chemins d'audit.
- Mode d'échec clair : lorsque le mode code est explicitement activé et que le runtime est
  indisponible, OpenClaw échoue de manière fermée au lieu de revenir à une exposition directe large des
  outils.

Le mode code est particulièrement utile pour les agents disposant d'un grand catalogue d'outils activé ou
pour les workflows où le modèle doit régulièrement rechercher, combiner et appeler
des outils avant de produire une réponse.

## Comment l'activer

Ajoutez `tools.codeMode.enabled: true` à la configuration de l'agent ou du runtime :

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

La forme abrégée est également acceptée :

```json5
{
  tools: {
    codeMode: true,
  },
}
```

Le mode code reste désactivé lorsque `tools.codeMode` est omis, `false`, ou un objet
sans `enabled: true`.

Lorsque vous utilisez des agents sandboxés avec des serveurs MCP configurés, assurez-vous également que la
stratégie d'outils du sandbox autorise le plugin MCP intégré, par exemple avec
`tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`. Voir
[Configuration - outils et fournisseurs personnalisés](/fr/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy).

Utilisez des limites explicites lorsque vous souhaitez des contraintes plus strictes :

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

Pour confirmer la forme de la charge utile du modèle lors du débogage, exécutez le Gateway avec
une journalisation ciblée :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Avec le mode code activé, les noms d'outils orientés modèle journalisés doivent être `exec` et `wait`. Si vous avez besoin de la charge utile du fournisseur expurgée, ajoutez `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` pour une courte session de débogage.

## Visite technique

Le reste de cette page décrit le contrat d'exécution et les détails de l'implémentation. Il est destiné aux mainteneurs, aux auteurs de plugins déboguant l'exposition des outils et aux opérateurs validant les déploiements à haut risque.

## Statut de l'exécution

- Exécution : [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- État par défaut : désactivé.
- Stabilité : surface expérimentale OpenClaw ; le mode Code Codex est une surface de harnais Codex stable et séparée.
- Surface cible : exécutions d'agent OpenClaw génériques.
- Posture de sécurité : le code du modèle est hostile.
- Promesse orientée utilisateur : l'activation du mode code ne revient jamais silencieusement à une exposition directe large des outils.

## Portée

Le mode code possède la forme d'orchestration orientée modèle pour une exécution préparée. Il ne possède pas la sélection du modèle, le comportement du canal, l'authentification, la stratégie d'outil ou les implémentations d'outil.

Dans la portée :

- définitions d'outils `exec` et `wait` visibles par le modèle
- construction du catalogue d'outils caché
- exécution d'invité JavaScript et TypeScript
- exécution de worker QuickJS-WASI
- rappels d'hôte pour la recherche de catalogue, la description de schéma et l'appel d'outil
- état reproductible pour les programmes invités suspendus
- limites de sortie, de délai d'attente, de mémoire, d'appel en attente et d'instantané
- télémétrie et projection de trajectoire pour les appels d'outils imbriqués

Hors portée :

- exécution de code à distance native du fournisseur
- sémantique d'exécution de shell
- modification de l'autorisation d'outil existante
- scripts persistants créés par l'utilisateur
- accès au gestionnaire de packages, aux fichiers, au réseau ou aux modules dans le code invité
- réutilisation directe des composants internes du mode Code Codex

Les outils détenus par le fournisseur, tels que les bac à sable Python distants, restent des outils séparés. Voir [Exécution de code](/fr/tools/code-execution).

## Termes

Le **mode code** est le mode d'exécution OpenClaw qui masque les outils normaux du modèle et n'expose que `exec` et `wait`.

L'**exécution invitée** est la VM JavaScript QuickJS-WASI qui évalue le code du modèle.

**Host bridge** est l'interface de rappel étroite compatible JSON du code invité vers OpenClaw.

**Catalog** est la liste des outils effectifs pour l'exécution, après la résolution normale de la stratégie d'outil, du plugin, du MCP et de l'outil client.

**Nested tool call** est un appel d'outil effectué depuis le code invité via le pont hôte.

**Snapshot** est l'état sérialisé de la VM QuickJS-WASI enregistré afin que `wait` puisse poursuivre une exécution en mode code suspendue.

## Configuration

`tools.codeMode.enabled` est la porte d'activation. Définir d'autres champs de mode code n'active pas la fonctionnalité.

Champs pris en charge :

- `enabled` : booléen. Valeur par défaut `false`. Active le mode code uniquement lorsque `true`.
- `runtime` : `"quickjs-wasi"`. Seul runtime pris en charge.
- `mode` : `"only"`. Expose `exec` et `wait`, masque les outils normaux du modèle.
- `languages` : tableau de `"javascript"` et `"typescript"`. La valeur par défaut inclut les deux.
- `timeoutMs` : limite d'horloge pour un `exec` ou un `wait`. Valeur par défaut `10000`. Limitation du runtime : `100` à `60000`.
- `memoryLimitBytes` : limite de tas QuickJS. Valeur par défaut `67108864`. Limitation du runtime : `1048576` à `1073741824`.
- `maxOutputBytes` : limite pour le texte renvoyé, le JSON et les journaux. Valeur par défaut `65536`. Limitation du runtime : `1024` à `10485760`.
- `maxSnapshotBytes` : limite pour les instantanés sérialisés de la VM. Valeur par défaut `10485760`. Limitation du runtime : `1024` à `268435456`.
- `maxPendingToolCalls` : limite pour les appels d'outil imbriqués simultanés. Valeur par défaut `16`. Limitation du runtime : `1` à `128`.
- `snapshotTtlSeconds` : durée pendant laquelle une machine virtuelle suspendue peut être reprise. Par défaut `900`.
  Clamp d'exécution : `1` à `86400`.
- `searchDefaultLimit` : nombre de résultats de recherche du catalogue caché par défaut. Par défaut `8`.
  L'exécution limite ceci à `maxSearchLimit`.
- `maxSearchLimit` : nombre maximum de résultats de recherche du catalogue caché. Par défaut `50`.
  Clamp d'exécution : `1` à `50`.

Si le mode code est activé mais que QuickJS-WASI ne peut pas être chargé, OpenClaw échoue de manière fermée pour
cette exécution. Il n'expose pas silencieusement les outils normaux en repli.

## Activation

Le mode code est évalué une fois que la stratégie d'outil effective est connue et avant que
la requête finale au modèle ne soit assemblée.

Ordre d'activation :

1. Résoudre l'agent, le modèle, le fournisseur, le bac à sable, le canal, l'expéditeur et la stratégie d'exécution.
2. Construire la liste effective des outils OpenClaw.
3. Ajouter les outils éligibles des plugins, MCP et clients.
4. Appliquer la stratégie d'autorisation et de refus.
5. Si `tools.codeMode.enabled` est faux, continuer avec l'exposition normale des outils.
6. Si activé et que des outils sont actifs pour l'exécution, enregistrer les outils effectifs dans
   le catalogue du mode code.
7. Supprimer tous les outils normaux de la liste des outils visibles par le modèle.
8. Ajouter les `exec` et `wait` du mode code.

Les exécutions qui n'ont intentionnellement aucun outil, comme les appels bruts au modèle, `disableTools`,
ou une liste d'autorisation vide, n'activent pas la surface du mode code même si la configuration
contient `tools.codeMode.enabled: true`.

Le catalogue du mode code est limité à l'exécution. Il ne doit pas fuiter d'outils d'un autre agent,
session, expéditeur ou exécution.

## Outils visibles par le modèle

Lorsque le mode code est actif, le modèle voit exactement ces outils de niveau supérieur :

- `exec`
- `wait`

Tous les autres outils activés sont masqués de la liste des outils orientés modèle et enregistrés
dans le catalogue du mode code.

Le modèle doit utiliser `exec` pour l'orchestration de tool, la jonction de données, les boucles, les appels parallèles imbriqués et les transformations structurées. Le modèle doit utiliser `wait` uniquement lorsque `exec` renvoie un résultat `waiting` reproductible.

## `exec`

`exec` démarre une cellule en mode code et renvoie un résultat. Le code d'entrée est généré par le modèle et doit être traité comme hostile.

Entrée :

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

Règles d'entrée :

- L'un des éléments `code` ou `command` doit être non vide.
- `code` est le champ documenté orienté modèle.
- `command` est accepté comme un alias compatible exec pour les politiques de hook et les réécritures de confiance ; lorsque les deux sont présents, les valeurs doivent correspondre.
- Les événements de hook `exec` du mode code externe incluent `toolKind: "code_mode_exec"` et incluent `toolInputKind: "javascript" | "typescript"` lorsque le langage d'entrée est connu, afin que les politiques puissent distinguer les cellules en mode code des appels `exec` de type shell qui partagent le même nom de tool.
- `language` est `"javascript"` par défaut.
- Si `language` est `"typescript"`, OpenClaw effectue une transpilation avant l'évaluation.
- `exec` rejette `import`, `require`, l'importation dynamique et les modèles de chargeur de modules dans la v1.
- `exec` n'expose pas récursivement l'implémentation normale de shell `exec`.

Résultat :

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeWaitingResult = {
  status: "waiting";
  runId: string;
  reason: "pending_tools" | "yield";
  pendingToolCalls?: CodeModePendingToolCall[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeFailedResult = {
  status: "failed";
  error: string;
  code?: CodeModeErrorCode;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};
```

`exec` renvoie `waiting` lorsque la VM QuickJS est suspendue avec un état reprisable qui nécessite encore une continuation visible par le modèle. Le résultat inclut un `runId` pour `wait`. Les appels au pont d'espace de noms, y compris les appels à l'espace de noms MCP, sont vidés automatiquement dans le même appel `exec`/`wait` tant qu'ils sont prêts, afin qu'un bloc de code compact puisse inspecter `$api()` et appeler un outil MCP sans forcer un appel d'outil de modèle par attente d'espace de noms.

`exec` renvoie `completed` uniquement lorsque la VM invitée n'a pas de travail en attente et que la valeur finale est compatible JSON après l'exécution de l'adaptateur de sortie d'OpenClaw.

## `wait`

`wait` poursuit une VM en mode code suspendue.

Entrée :

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La sortie est la même union `CodeModeResult` que celle renvoyée par `exec`.

`wait` existe car les outils imbriqués d'OpenClaw peuvent être lents, interactifs, soumis à approbation ou diffuser des mises à jour partielles. Le modèle ne devrait pas avoir besoin de garder un long appel `exec` ouvert pendant que l'hôte attend un travail externe.

La capture et la restauration de l'instantané QuickJS-WASI est le mécanisme de reprise v1 :

1. `exec` évalue le code jusqu'à son achèvement, son échec ou sa suspension.
2. Lors de la suspension, OpenClaw capture un instantané de la VM QuickJS et enregistre le travail hôte en attente.
3. Lorsque le travail en attente est résolu, `wait` restaure l'instantané de la VM.
4. OpenClaw réenregistre les rappels de l'hôte par des noms stables.
5. OpenClaw transmet les résultats des outils imbriqués dans la VM restaurée.
6. OpenClaw vide les tâches en attente de QuickJS.
7. `wait` renvoie `completed`, `failed`, ou un autre résultat `waiting`.

Les instantanés sont des états d'exécution, et non des artefacts utilisateur. Ils sont limités en taille, expirent, et sont délimités à l'exécution et à la session qui les ont créés.

`wait` échoue lorsque :

- `runId` est inconnu.
- le snapshot a expiré.
- l'exécution ou la session parente a été abandonnée.
- l'appelant n'est pas dans la même portée d'exécution/session.
- La restauration QuickJS-WASI a échoué.
- la restauration dépasserait les limites configurées.

## Guest runtime API

Le runtime invité expose une petite API globale :

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` est des métadonnées compactes pour le catalogue délimité à l'exécution. Il ne contient pas de schémas complets par défaut.

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "plugin" | "mcp" | "client";
  sourceName?: string;
};
```

Le schéma complet n'est chargé qu'à la demande :

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

Assistants de catalogue :

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

Les fonctions d'outil pratiques ne sont installées que pour les noms sécurisés non ambigus :

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

Les entrées du catalogue MCP ne sont pas appelables via `tools.call(...)` ou des fonctions pratiques en mode code. Elles sont exposées uniquement via l'espace de noms `MCP` généré. Les fichiers de déclaration de style TypeScript sont disponibles via la surface de fichier virtuel en lecture seule `API`, afin que les agents puissent inspecter les signatures MCP sans ajouter de schémas MCP au prompt :

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "Investigate gateway logs",
});

const snapshot = await MCP.chromeDevtools.takeSnapshot({ output: "markdown" });
const resource = await MCP.docs.resources.read({ uri: "memo://one" });
const prompt = await MCP.docs.prompts.get({
  name: "brief",
  arguments: { topic: "release" },
});
```

`API.read("mcp/<server>.d.ts")` renvoie des déclarations compactes déduites des métadonnées de l'outil MCP :

```typescript
type McpToolResult = {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

declare namespace MCP.github {
  /** Return this TypeScript-style API header. */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * Create a GitHub issue.
   * @param owner Repository owner
   * @param repo Repository name
   * @param title Issue title
   */
  function createIssue(input: { owner: string; repo: string; title: string; body?: string }): Promise<McpToolResult>;
}
```

Les fichiers de déclaration sont virtuels, et non des fichiers écrits dans l'espace de travail ou le répertoire d'état. Pour chaque appel en mode code `exec`, OpenClaw construit le catalogue d'outils délimité à l'exécution, conserve les entrées MCP visibles, génère `mcp/index.d.ts` plus une déclaration `mcp/<server>.d.ts` par serveur visible, et injecte cette petite table en lecture seule dans le worker QuickJS. Le code invité ne voit que l'objet `API` : `API.list(prefix?)` renvoie les métadonnées du fichier et `API.read(path)` renvoie le contenu de déclaration sélectionné. Les chemins inconnus et les segments `.` / `..` sont rejetés.

Cela permet d'empêcher que les grands schémas MCP n'encombrent le prompt du modèle. L'agent apprend que l'API virtuel existe grâce à la description de l'outil `exec`, lit uniquement le fichier de déclaration nécessaire, puis appelle `MCP.<server>.<tool>()` avec un argument de type objet. `MCP.<server>.$api()` reste disponible en tant que solution de repli en ligne lorsque l'agent a besoin d'une réponse de schéma à outil unique à l'intérieur du programme.

Le runtime invité ne doit pas exposer directement les objets hôtes. Les entrées et les sorties traversent le pont sous forme de valeurs compatibles JSON avec des limites de taille explicites.

## Espaces de noms internes

Les espaces de noms internes fournissent au mode code une API de domaine concise sans ajouter plus d'outils visibles par le modèle. Une intégration détenue par le loader peut enregistrer un espace de noms tel que `Issues`, `Fictions` ou `Calendar` ; le code invité appelle ensuite cet espace de noms à l'intérieur du programme QuickJS, tandis que OpenClaw affiche uniquement `exec` et `wait` au modèle.

Les espaces de noms sont internes pour l'instant. Il n'y a pas d'API d'espace de noms public pour le SDK de plugin : les espaces de noms des plugins externes ont besoin d'un contrat détenu par le loader pour que l'identité du plugin, les manifests installés, l'état d'authentification et les descripteurs de catalogue mis en cache ne puissent pas diverger des outils plugin qui soutiennent l'espace de noms. Le mode code de base ne possède que le bac à sable, la sérialisation, le filtrage du catalogue et la répartition du pont.

Le code invité peut ensuite utiliser soit le global direct, soit la carte `namespaces` :

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### Cycle de vie du registre

Le registre des espaces de noms est local au processus et indexé par l'ID de l'espace de noms. Un exécution typique suit ce chemin :

1. Un loader de confiance appelle `registerCodeModeNamespaceForPlugin(pluginId, registration)`.
2. Le mode code crée le `ToolSearchRuntime` caché pour l'exécution et lit son catalogue limité à l'exécution.
3. `createCodeModeNamespaceRuntime(ctx, catalog)` ne conserve que les enregistrements dont les `requiredToolNames` sont tous visibles et détenus par le même `pluginId`.
4. Chaque espace de noms visible appelle `createScope(ctx)` pour l'exécution actuelle. La
   portée reçoit le contexte d'exécution tel que `agentId`, `sessionKey`, `sessionId`,
   `runId`, la configuration et l'état d'abandon.
5. Les données de la portée sont sérialisées dans un descripteur simple et injectées dans QuickJS en tant que
   globales directes et `namespaces.<globalName>`.
6. Les appels invités sont suspendus via le pont du worker, résolvent le chemin de l'espace de noms sur
   l'hôte, mappent l'appel à un tool de catalogue détenu par un plugin déclaré, et exécutent
   ce tool via `ToolSearchRuntime.call`.
7. OpenClaw vide automatiquement les appels du pont d'espace de noms prêts à l'intérieur de l'appel d'tool
   actif `exec`/`wait`. Si le travail de l'espace de noms est toujours en attente au moment du délai d'expiration ou
   que l'invité cède explicitement, `wait` reprend le même runtime d'espace de noms plus tard.
8. Le retour en arrière ou la désinstallation du plugin appelle `clearCodeModeNamespacesForPlugin(pluginId)`
   afin que les globales obsolètes ne survivent pas à un échec de chargement de plugin.

L'invariant important : les appels d'espace de noms sont des appels d'tools de catalogue. Ils utilisent les
mêmes crochets de stratégie, approbations, gestion des abandons, télémétrie, projection de transcription
et comportements de suspension/reprise que `tools.call(...)`.

### Forme d'enregistrement

Enregistrez les espaces de noms à partir de l'intégration qui possède les outils sous-jacents. Gardez la
portée petite et n'exposez que les verbes de domaine qui correspondent aux outils de catalogue déclarés.

```typescript
import { createCodeModeNamespaceTool, registerCodeModeNamespaceForPlugin } from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "GitHub issue helpers for the current repository.",
  requiredToolNames: ["github_list_issues", "github_update_issue"],
  prompt: "Use Issues.list(params) and Issues.update(number, patch).",
  createScope: (ctx) => ({
    repository: ctx.config,
    list: createCodeModeNamespaceTool("github_list_issues", ([params]) => params ?? {}),
    update: createCodeModeNamespaceTool("github_update_issue", ([number, patch]) => ({
      number,
      patch,
    })),
  }),
});
```

`createCodeModeNamespaceTool(toolName, inputMapper)` marque un membre de la portée comme une
fonction d'espace de noms appelable. Le `inputMapper` facultatif reçoit les
arguments de l'invité et renvoie l'objet d'entrée pour l'tool de catalogue sous-jacent. Sans mappeur
d'entrée, le premier argument de l'invité est utilisé, ou `{}` s'il est omis.

Les fonctions brutes de l'hôte sont rejetées avant l'exécution du code invité :

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### Propriété et visibilité

La propriété de l'espace de noms est liée au `pluginId` de l'appelant de l'enregistrement.
`requiredToolNames` est à la fois une porte de visibilité et une vérification de propriété :

- chaque tool requis doit exister dans le catalogue de l'exécution
- chaque tool requis doit avoir `sourceName === pluginId`
- l'espace de noms est masqué lorsqu'un tool requis est absent ou détenu par un
  autre plugin
- chaque chemin pouvant être appelé ne peut cibler qu'un outil nommé dans `requiredToolNames`

Cela empêche un autre plugin d'exposer un espace de noms en enregistrant un outil du même nom. Cela permet également de garder les espaces de noms alignés avec la stratégie ordinaire de l'agent : si l'exécution ne peut pas voir les outils sous-jacents, elle ne peut pas voir l'espace de noms.

Par exemple, un espace de noms GitHub devrait résider derrière une extension détenue par GitHub qui possède l'authentification GitHub, les clients REST ou GraphQL, les limites de débit, les approbations d'écriture et les tests. Le mode code principal ne devrait pas intégrer d'API spécifiques à GitHub, la gestion des jetons ou la stratégie du fournisseur.

### Règles de sérialisation de la portée

`createScope(ctx)` peut renvoyer un objet simple contenant des valeurs compatibles JSON, des tableaux, des objets imbriqués et des marqueurs d'appel `createCodeModeNamespaceTool(...)`. Les objets hôtes n'entrent jamais directement dans QuickJS.

Le sérialiseur rejette :

- les fonctions brutes
- les graphes d'objets circulaires
- segments de chemin non sécurisés : `__proto__`, `constructor`, `prototype`, des clés vides, ou des clés contenant le séparateur de chemin interne
- les valeurs `globalName` qui ne sont pas des identifiants JavaScript
- les collisions `globalName` avec les globales intégrées du mode code telles que `tools`, `namespaces`, `text`, `json`, `yield_control` ou `__openclaw*`

Les valeurs qui ne peuvent pas être sérialisées en JSON sont converties en valeurs de repli sûres pour JSON avant de traverser le pont. Les données binaires, les handles, les sockets, les clients et les instances de classe doivent rester derrière les outils de catalogue ordinaires.

### Prompts

L'espace de noms `description` et l'option `prompt` sont ajoutés au schéma `exec` visible par le modèle uniquement lorsque l'espace de noms est visible pour cette exécution. Utilisez-les pour enseigner la plus petite surface utile :

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

Gardez les prompts axés sur le contrat de l'espace de noms, et non sur la configuration de l'authentification, l'historique de l'implémentation ou le comportement non lié du plugin.

### Nettoyage

Les espaces de noms sont des enregistrements locaux au processus. Supprimez-les lorsque le plugin propriétaire est désactivé, désinstallé ou restauré :

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

Utilisez `unregisterCodeModeNamespace(namespaceId)` uniquement lors de la suppression d'un espace de noms connu. Les tests peuvent appeler `clearCodeModeNamespacesForTest()` pour éviter les fuites d'enregistrements entre les cas.

### Liste de contrôle des tests

Les modifications d'espace de noms doivent couvrir la limite de sécurité et le comportement de l'invité :

- le texte d'invite de l'espace de noms n'apparaît que lorsque les outils de sauvegarde sont visibles
- les outils du même nom provenant d'un autre `sourceName` n'exposent pas l'espace de noms
- les fonctions de portée brutes sont rejetées
- les identifiants d'espace de noms falsifiés et les chemins falsifiés sont rejetés
- les chemins appelables ne peuvent pas cibler des outils non déclarés
- les objets imbriqués et les références partagées sont sérialisés correctement
- les appels d'espace de noms s'exécutent via les outils du catalogue et renvoient des détails sécurisés pour JSON
- les échecs peuvent être capturés par le code invité
- les appels d'espace de noms suspendus reprennent via `wait`
- le retour en arrière du plugin efface les enregistrements de l'espace de noms propriétaire

Les espaces de noms complètent le catalogue générique `tools.search` / `tools.call`. Utilisez le catalogue pour les outils OpenClaw, de plugin et client activés arbitraires ; utilisez `MCP` pour les outils MCP ; utilisez d'autres espaces de noms pour les API de domaine documentées et appartenant au plugin, où un code concis est plus fiable que des recherches de schéma répétées.

## API de sortie

`text(value)` ajoute une sortie lisible par l'homme au tableau `output`.

`json(value)` ajoute un élément de sortie structuré après sérialisation compatible JSON.

La valeur finale renvoyée par le code invité devient `value` dans un résultat `completed`.

Élément de sortie :

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Règles de sortie :

- l'ordre de sortie correspond aux appels invités
- la sortie est plafonnée par `maxOutputBytes`
- les valeurs non sérialisables sont converties en chaînes simples ou en erreurs
- les valeurs binaires ne sont pas prises en charge dans v1
- les images et les fichiers transitent par les outils OpenClaw ordinaires, et non par le pont du mode code

## Catalogue d'outils

Le catalogue masqué inclut les outils après filtrage effectif par stratégie :

1. Outils de base OpenClaw.
2. Outils de plugin groupés.
3. Outils de plugin externes.
4. Outils MCP.
5. Outils fournis par le client pour l'exécution actuelle.

Les identifiants du catalogue sont stables au sein d'une même exécution et déterministes sur des ensembles d'outils équivalents lorsque cela est possible.

Forme d'identifiant recommandée :

```text
<source>:<owner>:<tool-name>
```

Exemples :

```text
openclaw:core:message
plugin:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

Le catalogue omet les outils de contrôle du mode code :

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

Cela évite la récursion et maintient le contrat orienté modèle étroit.

Les entrées MCP restent dans le catalogue limité à l'exécution afin que les stratégies, les approbations, les crochets (hooks), la télémétrie, la projection de transcription et les identifiants exacts des outils restent partagés avec l'exécution normale des outils. Les vues orientées invité `ALL_TOOLS`, `tools.search(...)`, `tools.describe(...)` et `tools.call(...)` omettent les entrées MCP. L'espace de noms `MCP.<server>.<tool>({ ...input })` généré résout vers l'identifiant exact du catalogue, puis distribue via le même chemin d'exécution.

## Interaction avec la recherche d'outils

Le mode code remplace la surface de modèle de recherche d'outils OpenClaw pour les exécutions où il est actif.

Lorsque `tools.codeMode.enabled` est vrai et que le mode code s'active :

- OpenClaw n'expose pas `tool_search_code`, `tool_search`, `tool_describe` ou `tool_call` en tant qu'outils visibles par le modèle.
- La même idée de catalogage se déplace à l'intérieur du runtime invité.
- Le runtime invité reçoit des métadonnées `ALL_TOOLS` compactes ainsi que des aides de recherche, de description et d'appel pour les outils non MCP.
- Les appels MCP utilisent l'espace de noms `MCP` généré et ses en-têtes `$api()` au lieu de `tools.call(...)`.
- Les appels imbriqués sont distribués via le même chemin d'exécution OpenClaw que celui utilisé par la recherche d'outils.

La page existante [Recherche d'outils](/fr/tools/tool-search) décrit le pont de catalogue compact OpenClaw. Le mode code est l'alternative générique OpenClaw pour les exécutions qui peuvent utiliser `exec` et `wait`.

## Noms d'outils et collisions

L'outil `exec`OpenClaw visible par le modèle est l'outil de code-mode. Si l'outil normal de shell `exec` d'OpenClaw est activé, il est masqué pour le modèle et catalogué comme n'importe quel autre outil.

Dans le runtime invité :

- `tools.call("openclaw:core:exec", input)` peut appeler l'outil d'exécution de shell si la stratégie le permet.
- `tools.exec(...)` est installé uniquement si l'entrée du catalogue d'exécution de shell possède un nom sécurisé non ambigu.
- l'outil `exec` de code-mode n'est jamais disponible de manière récursive via `tools`.

Si deux outils se normalisent vers le même nom sécurisé de commodité, OpenClaw omet la fonction de commodité et exige OpenClaw`tools.call(id, input)`.

## Exécution d'outil imbriquée

Chaque appel d'outil imbriqué traverse le pont hôte et ré-entre dans OpenClaw.

L'exécution imbriquée préserve :

- id de l'agent actif
- id de session et clé de session
- contexte de l'expéditeur et du canal
- stratégie de bac à sable
- stratégie d'approbation
- hooks `before_tool_call` du plugin
- signal d'abandon
- mises à jour en streaming lorsque disponible
- événements de trajectoire et d'audit

Les appels imbriqués sont projetés dans la transcription sous forme d'appels d'outil réels afin que les bundles de support puissent montrer ce qui s'est passé. La projection identifie l'appel de l'outil code-mode parent et l'identifiant de l'outil imbriqué.

Les appels imbriqués parallèles sont autorisés jusqu'à `maxPendingToolCalls`.

## État d'exécution

Chaque exécution en code-mode possède une machine à états :

- `running` : la VM est en cours d'exécution ou des appels imbriqués sont en vol.
- `waiting` : un instantané de la VM existe et peut être repris avec `wait`.
- `completed` : valeur finale renvoyée ; instantané supprimé.
- `failed` : erreur renvoyée ; instantané supprimé.
- `expired` : l'instantané ou l'état en attente a dépassé la rétention ; impossible de reprendre.
- `aborted` : l'exécution/session parente a été annulée ; instantané supprimé.

L'état est délimité par l'exécution de l'agent, la session et l'identifiant de l'appel d'outil. Un appel `wait` depuis une exécution ou une session différente échoue.

Le stockage des instantanés est limité :

- nombre maximal d'octets d'instantané par exécution
- nombre maximal d'instantanés en direct par processus
- TTL de l'instantané
- nettoyage à la fin de l'exécution
- nettoyage lors de l'arrêt du Gateway lorsque la persistance n'est pas prise en charge

## Runtime QuickJS-WASI

OpenClaw charge `quickjs-wasi` comme dépendance directe dans le package propriétaire. Le runtime ne s'appuie pas sur une copie transitive installée pour le proxy, le PAC ou d'autres dépendances non liées.

Responsabilités du runtime :

- compiler ou charger le module WebAssembly QuickJS-WASI
- créer une VM isolée par exécution ou reprise en mode code
- enregistrer les rappels de l'hôte par des noms stables
- définir les limites de mémoire et d'interruption
- évaluer JavaScript
- vider les tâches en attente
- capturer l'état de la VM suspendue
- restaurer les captures pour `wait`
- supprimer les handles de VM et les captures après les états terminaux

Le runtime s'exécute en dehors de la boucle d'événements principale de OpenClaw dans un worker. Une boucle infinie invitée ne doit pas bloquer indéfiniment le processus Gateway.

## TypeScript

La prise en charge de TypeScript est uniquement une transformation source :

- entrée acceptée : une chaîne de code TypeScript
- sortie : chaîne JavaScript évaluée par QuickJS-WASI
- pas de vérification de type
- pas de résolution de module
- pas de `import` ou de `require` dans la v1
- les diagnostics sont renvoyés sous forme de résultats `failed`

Le compilateur TypeScript est chargé paresseusement uniquement pour les cellules TypeScript. Les cellules JavaScript simples et le mode code désactivé ne chargent pas le compilateur.

La transformation doit préserver les numéros de ligne utiles lorsque cela est possible.

## Limite de sécurité

Le code du modèle est hostile. Le runtime utilise la défense en profondeur :

- exécuter QuickJS-WASI en dehors de la boucle d'événements principale
- charger `quickjs-wasi` comme dépendance directe, et non via Codex ou un package transitif
- pas de système de fichiers, de réseau, de sous-processus, d'importation de module, de variables d'environnement ou d'objets globaux de l'hôte dans l'invité
- utiliser les limites de mémoire et d'interruption de QuickJS
- appliquer le délai d'attente horloge murale du processus parent
- appliquer les limites de sortie, de capture, de journal et d'appel en attente
- sérialiser les valeurs du pont de l'hôte via un adaptateur JSON étroit
- convertir les erreurs de l'hôte en erreurs simples de l'invité, jamais en objets du domaine de l'hôte
- abandonner les captures en cas de délai d'attente, d'abandon, de fin de session ou d'expiration
- rejeter l'accès récursif à `exec`, `wait` et aux outils de contrôle de recherche d'outils
- empêcher les collisions de noms pratiques de masquer les assistants du catalogue

Le bac à sable est une couche de sécurité. Les opérateurs peuvent toujours avoir besoin d'un durcissement au niveau du système d'exploitation pour les déploiements à haut risque.

## Codes d'erreur

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Les erreurs renvoyées à l'invité sont des données simples. Les instances hôtes `Error`, les objets de pile, les prototypes et les fonctions hôtes ne traversent pas vers QuickJS.

## Télémétrie

Le mode de code signale :

- noms d'outils visibles envoyés au model
- taille du catalogue caché et ventilation de la source
- comptes `exec` et `wait`
- comptes de recherche imbriquée, de description et d'appel
- ids d'outils imbriqués appelés
- échecs de délai d'attente, de mémoire, d'instantané et de plafond de sortie
- événements du cycle de vie des instantanés

La télémétrie ne doit pas inclure de secrets, de valeurs d'environnement brutes ou d'entrées d'outil non masquées au-delà de la stratégie de trajectoire OpenClaw existante.

## Débogage

Utilisez la journalisation du transport du model ciblée lorsque le mode de code se comporte différemment d'une exécution d'outil normale :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

Pour le débogage de la forme de la charge utile, utilisez `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`. Cela enregistre un instantané JSON plafonné et masqué de la demande du model ; il ne doit être utilisé que pendant le débogage car les invites et le texte des messages peuvent toujours apparaître.

Pour le débogage du flux, utilisez `OPENCLAW_DEBUG_SSE=peek` pour enregistrer les cinq premiers événements SSE masqués. Le mode de code échoue également de manière fermée si la charge utile finale du provider ne contient pas exactement `exec` et `wait` après l'activation de la surface du mode de code.

## Disposition de l'implémentation

Unités d'implémentation :

- contrat de configuration : `tools.codeMode`
- générateur de catalogue : outils effectifs vers entrées compactes et carte d'ID
- adaptateur de surface du model : remplacer les outils visibles par `exec` et `wait`
- adaptateur d'exécution QuickJS-WASI : charger, évaluer, instantané, restaurer, disposer
- superviseur de travailleur : délai d'attente, abandon, isolement des crashs
- adaptateur de pont : rappels hôtes sécurisés JSON et livraison des résultats
- adaptateur de transformation TypeScript
- magasin d'instantanés : TTL, plafonds de taille, portée d'exécution/session
- projection de trajectoire pour les appels d'outils imbriqués
- compteurs de télémétrie et diagnostics

L'implémentation réutilise les concepts de catalogue et d'exécuteur de la recherche d'outils, mais n'utilise pas l'enfant `node:vm` comme bac à sable.

## Liste de contrôle de validation

La couverture du mode code doit prouver :

- la configuration désactivée laisse l'exposition existante des outils inchangée
- la configuration d'objet sans `enabled: true` laisse le mode code désactivé
- la configuration activée n'expose que `exec` et `wait` au modèle lorsque les outils sont
  actifs pour l'exécution
- les exécutions brutes sans outil, `disableTools`, et les listes d'autorisation vides ne déclenchent pas l'application de la charge utile
  du mode code
- tous les outils non MCP effectifs apparaissent dans `ALL_TOOLS`
- les outils refusés n'apparaissent pas dans `ALL_TOOLS`
- `tools.search`, `tools.describe` et `tools.call` fonctionnent pour les outils OpenClaw
- `API.list("mcp")` et `API.read("mcp/<server>.d.ts")` exposent les déclarations MCP de style TypeScript
  sans pont/appel d'outil
- l'espace de noms MCP `$api()` reste disponible en tant que solution de repli en ligne pour les schémas
- les appels d'espace de noms MCP fonctionnent pour les outils MCP visibles avec une entrée d'objet unique, tandis que
  les entrées directes du catalogue MCP sont absentes de `tools.*`
- les outils de contrôle de recherche d'outils sont masqués à la fois pour la surface du modèle et le catalogue
  masqué
- les appels imbriqués préservent le comportement d'approbation et de hook
- le `exec` du shell est masqué pour le modèle mais appelable par id de catalogue lorsque autorisé
- `exec` et `wait` du mode code récursif ne sont pas appelables depuis le code invité
- l'entrée TypeScript est transformée et évaluée sans charger TypeScript sur
  les chemins désactivés ou JavaScript uniquement
- `import`, `require`, l'accès au système de fichiers, au réseau et à l'environnement échouent
- les boucles infinies expirent et ne peuvent pas bloquer le Gateway
- les échecs de limite de mémoire terminent la machine virtuelle invitée
- les limites de sortie et d'instantané sont appliquées pour les appels terminés et suspendus
- `wait` reprend un instantané suspendu et renvoie la valeur finale
- les valeurs `runId` expirées, abandonnées, de mauvaise session et inconnues échouent
- la relecture et la persistance de la transcription préservent les appels de contrôle du mode code
- la transcription et la télémétrie affichent clairement les appels d'outils imbriqués

## Plan de test de bout en bout

Exécutez-les en tant que tests d'intégration ou de bout en bout lors de la modification de l'exécution (runtime) :

1. Démarrez un Gateway avec Gateway`tools.codeMode.enabled: false`.
2. Envoyez un tour d'agent avec un petit ensemble d'outils directs.
3. Vérifiez que les outils visibles par le modèle sont inchangés.
4. Redémarrez avec `tools.codeMode.enabled: true`.
5. Envoyez un tour d'agent avec OpenClaw, des plugins, MCP, et des outils de test client.
6. Vérifiez que la liste des outils visibles par le modèle est exactement `exec`, `wait`.
7. Dans `exec`, lisez `ALL_TOOLS` et vérifiez que les outils de test effectifs sont présents.
8. Dans `exec`OpenClaw, appelez les outils OpenClaw/plugin/client via `tools.search`,
   `tools.describe`, et `tools.call`.
9. Dans `exec`, appelez `API.list("mcp")` et `API.read("mcp/<server>.d.ts")` et
   vérifiez que les fichiers de déclaration décrivent les outils MCP visibles.
10. Dans `exec`, appelez les outils MCP via `MCP.<server>.<tool>({ ...input })` et
    vérifiez que les entrées directes du catalogue MCP sont absentes de `ALL_TOOLS` et `tools.*`.
11. Vérifiez que les outils refusés sont absents et ne peuvent pas être appelés par un ID deviné.
12. Démarrez un appel d'outil imbriqué qui se résout après que `exec` renvoie `waiting`.
13. Appelez `wait` et vérifiez que la VM restaurée reçoit le résultat de l'outil.
14. Vérifiez que la réponse finale contient la sortie produite après la restauration.
15. Vérifiez que l'expiration du délai d'attente, l'annulation et l'expiration du instantané nettoient l'état de l'exécution (runtime).
16. Exportez la trajectoire et vérifiez que les appels imbriqués sont visibles sous l'appel
    parent en mode code.

Les modifications de documentation uniquement sur cette page doivent toujours exécuter `pnpm check:docs`.

## Connexes

- [Recherche d'outils](/fr/tools/tool-search)
- [Runtimes d'agents](/fr/concepts/agent-runtimes)
- [Outil Exec](/fr/tools/exec)
- [Exécution de code](/fr/tools/code-execution)
