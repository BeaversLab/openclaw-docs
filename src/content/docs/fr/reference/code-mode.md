---
summary: "OpenClawOpenClaw mode code : une surface d'outil exec/wait optionnelle soutenue par QuickJS-WASI et un catalogue d'outils délimité à l'exécution"
title: "Mode code"
sidebarTitle: "Mode code"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
---

Le mode code est une fonctionnalité expérimentale de l'agent-runtime OpenClaw. Il est désactivé par défaut. Lorsque vous l'activez, OpenClaw modifie ce que le modèle voit pour une exécution : au lieu d'exposer directement chaque schéma d'outil activé, le modèle ne voit que OpenClawOpenClaw`exec` et `wait`.

Cette page documente le mode de code OpenClaw. Ce n'est pas le mode de code Codex. Les deux fonctionnalités partagent un nom, mais elles sont implémentées par différents runtimes et exposent différents OpenClaw`exec` contrats :

- Le mode de code Codex est activé pour les threads du serveur d'application Codex, sauf si une stratégie d'outil restreinte désactive le mode de code natif. Il s'exécute dans le harnais de codage Codex, où le modèle écrit des commandes shell via un contrat `exec.command`.
- Le mode de code OpenClaw est désactivé sauf si OpenClaw`tools.codeMode.enabled: true`OpenClaw est configuré. Il s'exécute dans le runtime d'agent générique OpenClaw, où le modèle écrit des programmes JavaScript ou TypeScript via un contrat `exec.code`.

Le mode de code Codex et la recherche dynamique d'outils native Codex sont des surfaces stables du harnais Codex. Le mode de code OpenClaw est un adaptateur de surface d'outil expérimental propriétaire d'OpenClaw pour les exécutions génériques OpenClaw. Il utilise OpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw, un catalogue d'outils caché OpenClaw, et l'exécuteur d'outils OpenClaw normal.

## Qu'est-ce que c'est ?

Le mode de code OpenClaw permet au modèle d'écrire un petit programme JavaScript ou TypeScript au lieu de choisir directement parmi une longue liste d'outils.

Lorsque le mode de code est actif :

- La liste d'outils visible par le modèle est exactement `exec` et `wait`.
- `exec` évalue le JavaScript ou TypeScript généré par le modèle dans un worker QuickJS-WASI contraint.
- Les outils OpenClaw normaux sont masqués du prompt du modèle et exposés à l'intérieur du programme invité via OpenClaw`ALL_TOOLS` et `tools`.
- Le code invité peut rechercher le catalogue caché, décrire un outil et appeler un outil via le même chemin d'exécution OpenClaw utilisé par les tours d'agent normaux.
- `wait` reprend une exécution en mode de code suspendue lorsque des appels d'outils imbriqués sont toujours en attente.

La distinction importante : le mode code modifie la surface d'orchestration orientée modèle. Il ne remplace pas les outils OpenClaw, les outils de plugin, les outils MCP, l'authentification, la politique d'approbation, le comportement du canal ou la sélection du modèle.

## Pourquoi est-ce bénéfique ?

Le mode code facilite l'utilisation de grands catalogues d'outils par les modèles.

- Surface de prompt réduite : les fournisseurs reçoivent deux outils de contrôle au lieu de dizaines ou de centaines de schémas d'outils complets.
- Meilleure orchestration : le modèle peut utiliser des boucles, des jointures, des petites transformations, une logique conditionnelle et des appels d'outils imbriqués parallèles à l'intérieur d'une seule cellule de code.
- Neutre vis-à-vis du fournisseur : cela fonctionne pour les outils OpenClaw, de plugin, MCP et client sans dépendre de l'exécution de code natif du fournisseur.
- Les politiques existantes restent en vigueur : les appels d'outils imbriqués passent toujours par la politique OpenClaw, les approbations, les hooks, le contexte de session et les chemins d'audit.
- Mode d'échec clair : lorsque le mode code est explicitement activé et que le runtime n'est pas disponible, OpenClaw échoue de manière fermée au lieu de revenir à une exposition directe large des outils.

Le mode code est particulièrement utile pour les agents ayant un grand catalogue d'outils activé ou pour les workflows où le modèle doit rechercher, combiner et appeler des outils de manière répétée avant de produire une réponse.

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

Le mode code reste désactivé lorsque `tools.codeMode` est omis, `false`, ou un objet sans `enabled: true`.

Utilisez des limites explicites si vous souhaitez des contraintes plus strictes :

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

Pour confirmer la forme de la charge utile du modèle lors du débogage, exécutez le Gateway avec une journalisation ciblée :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Avec le mode code actif, les noms d'outils orientés modèle journalisés doivent être `exec` et `wait`. Si vous avez besoin de la charge utile du fournisseur expurgée, ajoutez `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` pour une courte session de débogage.

## Visite technique

Le reste de cette page décrit le contrat de runtime et les détails de mise en œuvre. Il est destiné aux mainteneurs, aux auteurs de plugins déboguant l'exposition des outils et aux opérateurs validant les déploiements à haut risque.

## État du runtime

- Runtime : [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- État par défaut : désactivé.
- Stabilité : surface expérimentale OpenClaw ; Codex Code mode est une surface stable séparée du harnais Codex.
- Surface cible : exécutions d'agent OpenClaw génériques.
- Posture de sécurité : le code du model est hostile.
- Promesse面向utilisateur : l'activation du mode code ne revient jamais silencieusement à une exposition directe et large des tools.

## Portée

Le mode code possède la forme d'orchestration orientée model pour une exécution préparée. Il ne possède pas la sélection du model, le comportement du channel, l'auth, la politique de tool, ou les implémentations de tool.

Dans la portée :

- définitions de tool `exec` et `wait` visibles par le model
- construction de catalogue de tools masqué
- exécution invitée JavaScript et TypeScript
- runtime worker QuickJS-WASI
- rappels (callbacks) d'hôte pour la recherche dans le catalogue, la description du schéma et l'appel de tool
- état reproductible pour les programmes invités suspendus
- limites de sortie, de délai d'attente, de mémoire, d'appels en attente et d'instantanés
- télémétrie et projection de trajectoire pour les appels de tools imbriqués

Hors portée :

- exécution de code distant natif au provider
- sémantique d'exécution de shell
- modification de l'autorisation existante des tools
- scripts persistants créés par l'utilisateur
- accès au gestionnaire de packages, aux fichiers, au réseau ou aux modules dans le code invité
- réutilisation directe des éléments internes de Codex Code mode

Les tools possédés par le provider, tels que les bac à sable Python distants, restent des tools séparés. Voir [Exécution de code](/fr/tools/code-execution).

## Termes

**Code mode** est le mode d'exécution OpenClaw qui masque les tools normaux du model et n'expose que `exec` et `wait`.

**Guest runtime** est la VM JavaScript QuickJS-WASI qui évalue le code du model.

**Host bridge** est l'étroite surface de rappel compatible JSON du code invité vers OpenClaw.

**Catalog** est la liste des tools effectifs limitée à l'exécution, après la résolution normale de la politique de tool, des plugins, de MCP et des tools client.

**Nested tool call** est un appel de tool effectué depuis le code invité via le pont hôte.

**Snapshot** est l'état sérialisé de la VM QuickJS-WASI enregistré pour que `wait` puisse continuer une exécution en mode code suspendue.

## Configuration

`tools.codeMode.enabled` est la porte d'activation. Définir d'autres champs de mode de code n'active pas la fonctionnalité.

Champs pris en charge :

- `enabled` : booléen. Par défaut `false`. Active le code mode uniquement lorsque `true`.
- `runtime` : `"quickjs-wasi"`. Seul runtime pris en charge.
- `mode` : `"only"`. Expose `exec` et `wait`, masque les outils normaux du model.
- `languages` : tableau de `"javascript"` et `"typescript"`. La valeur par défaut inclut
  les deux.
- `timeoutMs` : limite d'horloge pour un `exec` ou `wait`. Par défaut `10000`.
  Limitation du runtime : `100` à `60000`.
- `memoryLimitBytes` : limite de tas QuickJS. Par défaut `67108864`. Limitation du runtime :
  `1048576` à `1073741824`.
- `maxOutputBytes` : limite pour le texte, JSON et les journaux renvoyés. Par défaut `65536`.
  Limitation du runtime : `1024` à `10485760`.
- `maxSnapshotBytes` : limite pour les instantanés sérialisés de la VM. Par défaut `10485760`.
  Limitation du runtime : `1024` à `268435456`.
- `maxPendingToolCalls` : limite pour les appels d'outil imbriqués simultanés. Par défaut `16`.
  Limitation du runtime : `1` à `128`.
- `snapshotTtlSeconds` : durée pendant laquelle une VM suspendue peut être reprise. Par défaut `900`.
  Limitation du runtime : `1` à `86400`.
- `searchDefaultLimit` : nombre de résultats de recherche par défaut du catalogue masqué. Par défaut `8`.
  Le runtime limite cela à `maxSearchLimit`.
- `maxSearchLimit` : nombre maximal de résultats de recherche du catalogue masqué. Par défaut `50`.
  Limitation du runtime : `1` à `50`.

Si le mode code est activé mais que QuickJS-WASI ne peut pas être chargé, OpenClaw échoue de manière sécurisée pour cette exécution. Il n'expose pas silencieusement les outils normaux en solution de repli.

## Activation

Le mode code est évalué une fois la stratégie d'outil effective connue et avant que la demande finale au modèle ne soit assemblée.

Ordre d'activation :

1. Résoudre l'agent, le modèle, le fournisseur, le bac à sable (sandbox), le canal, l'expéditeur et la stratégie d'exécution.
2. Construire la liste effective des outils OpenClaw.
3. Ajouter les plugins éligibles, MCP et les outils client.
4. Appliquer la stratégie d'autorisation et de refus.
5. Si `tools.codeMode.enabled` est faux, continuer avec l'exposition normale des outils.
6. Si activé et que des outils sont actifs pour l'exécution, enregistrer les outils effectifs dans le catalogue du mode code.
7. Supprimer tous les outils normaux de la liste des outils visibles par le modèle.
8. Ajouter le `exec` et le `wait` du mode code.

Les exécutions qui n'ont intentionnellement pas d'outils, comme les appels bruts au modèle, `disableTools`, ou une liste d'autorisation vide, n'activent pas la surface du mode code même si la configuration contient `tools.codeMode.enabled: true`.

Le catalogue du mode code est limité à l'exécution. Il ne doit pas faire fuiter d'outils provenant d'un autre agent, session, expéditeur ou exécution.

## Outils visibles par le modèle

Lorsque le mode code est actif, le modèle voit exactement ces outils de premier niveau :

- `exec`
- `wait`

Tous les autres outils activés sont masqués de la liste des outils face au modèle et enregistrés dans le catalogue du mode code.

Le modèle doit utiliser `exec` pour l'orchestration des outils, la jointure de données, les boucles, les appels imbriqués parallèles et les transformations structurées. Le modèle doit utiliser `wait` uniquement lorsque `exec` renvoie un résultat `waiting` reproductible.

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

- L'un ou l'autre de `code` ou `command` doit être non vide.
- `code` est le champ documenté face au modèle.
- `command` est accepté comme un alias compatible exec pour les stratégies de hook et
  les réécritures approuvées ; lorsque les deux sont présents, les valeurs doivent correspondre.
- Les événements de hook `exec` du mode code externe incluent `toolKind: "code_mode_exec"` et
  incluent `toolInputKind: "javascript" | "typescript"` lorsque la langue d'entrée
  est connue, afin que les stratégies puissent distinguer les cellules du mode code des appels `exec`
  de style shell qui partagent le même nom d'outil.
- `language` est défini par défaut sur `"javascript"`.
- Si `language` est `"typescript"`OpenClaw, OpenClaw transpile avant l'évaluation.
- `exec` rejette `import`, `require`, l'import dynamique et les motifs de chargeur de module
  dans v1.
- `exec` n'expose pas récursivement l'implémentation normale du shell `exec`.

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

`exec` renvoie `waiting` lorsque la VM QuickJS se suspend avec un état reproductible. Le
résultat inclut un `runId` pour `wait`.

`exec` renvoie `completed`OpenClaw uniquement lorsque la VM invitée n'a pas de travail en attente et que
la valeur finale est compatible JSON après l'exécution de l'adaptateur de sortie d'OpenClaw.

## `wait`

`wait` poursuit une VM en mode code suspendue.

Entrée :

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La sortie est la même union `CodeModeResult` renvoyée par `exec`.

`wait`OpenClaw existe car les outils OpenClaw imbriqués peuvent être lents, interactifs, soumis à approbation
ou diffuser des mises à jour partielles. Le modèle ne devrait pas avoir besoin de garder un long
appel `exec` ouvert pendant que l'hôte attend un travail externe.

La capture instantanée et la restauration QuickJS-WASI constituent le mécanisme de reprise v1 :

1. `exec` évalue le code jusqu'à l'achèvement, l'échec ou la suspension.
2. En cas de suspension, OpenClaw capture une instantanée de la VM QuickJS et enregistre le travail hôte
   en attente.
3. Une fois le travail en attente réglé, `wait` restaure l'instantané de la VM.
4. OpenClaw réinscrit les rappels de l'hôte par des noms stables.
5. OpenClaw transmet les résultats d'outils imbriqués dans la VM restaurée.
6. OpenClaw vide les tâches en attente QuickJS.
7. `wait` renvoie `completed`, `failed`, ou un autre résultat `waiting`.

Les instantanés sont un état d'exécution, et non des artefacts utilisateur. Ils sont limités en taille, expirés, et limités à l'exécution et à la session qui les ont créés.

`wait` échoue lorsque :

- `runId` est inconnu.
- l'instantané a expiré.
- l'exécution parente ou la session a été abandonnée.
- l'appelant n'est pas dans la même portée d'exécution/session.
- La restauration QuickJS-WASI échoue.
- la restauration dépasserait les limites configurées.

## API du runtime invité

Le runtime invité expose une petite API globale :

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` est des métadonnées compactes pour le catalogue limité à l'exécution. Il ne contient pas de schémas complets par défaut.

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

Le schéma complet est chargé uniquement à la demande :

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

Les fonctions d'outil pratiques sont installées uniquement pour les noms sécurisés sans ambiguïté :

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

Le runtime invité ne doit pas exposer directement les objets de l'hôte. Les entrées et les sorties traversent le pont sous forme de valeurs compatibles JSON avec des limites de taille explicites.

## API de sortie

`text(value)` ajoute une sortie lisible par l'humain au tableau `output`.

`json(value)` ajoute un élément de sortie structuré après une sérialisation compatible JSON.

La valeur finale renvoyée par le code invité devient `value` dans un résultat `completed`.

Élément de sortie :

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Règles de sortie :

- l'ordre de sortie correspond aux appels de l'invité
- la sortie est limitée par `maxOutputBytes`
- les valeurs non sérialisables sont converties en chaînes simples ou en erreurs
- les valeurs binaires ne sont pas prises en charge dans v1
- les images et les fichiers transitent par les outils OpenClaw ordinaires, et non par
  le pont du mode code

## Catalogue d'outils

Le catalogue caché inclut les outils après le filtrage effectif par la stratégie :

1. Outils principaux OpenClaw.
2. Outils de plugin regroupés.
3. Outils de plugin externes.
4. Outils MCP.
5. Outils fournis par le client pour l'exécution actuelle.

Les identifiants du catalogue sont stables au cours d'une exécution et déterministes pour des ensembles d'outils équivalents lorsque cela est possible.

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

## Interaction avec la recherche d'outils

Le mode code remplace la surface du modèle de recherche d'outils OpenClaw pour les exécutions où il est actif.

Lorsque `tools.codeMode.enabled` est vrai et que le mode code s'active :

- OpenClaw n'expose pas OpenClaw`tool_search_code`, `tool_search`, `tool_describe`,
  ou `tool_call` en tant qu'outils visibles par le modèle.
- La même idée de catalogue se déplace à l'intérieur du runtime invité.
- Le runtime invité reçoit des métadonnées `ALL_TOOLS` compactes ainsi que des aides de recherche, de description et d'appel.
- Les appels imbriqués sont distribués via le même chemin d'exécution OpenClaw que Tool Search utilise.

La page existante [Tool Search](/fr/tools/tool-search) décrit le pont de catalogue compact OpenClaw. Le mode code est l'alternative générique OpenClaw pour les exécutions qui peuvent utiliser `exec` et `wait`.

## Noms d'outils et collisions

L'outil `exec`OpenClaw visible par le modèle est l'outil du mode code. Si l'outil `exec` du shell OpenClaw normal est activé, il est masqué pour le modèle et catalogué comme tout autre outil.

À l'intérieur du runtime invité :

- `tools.call("openclaw:core:exec", input)` peut appeler l'outil d'exécution de shell si
  la stratégie l'autorise.
- `tools.exec(...)` n'est installé que si l'entrée du catalogue d'exécution de shell possède un
  nom sans équivoque et sûr.
- l'outil `exec` du mode code n'est jamais disponible de manière récursive via `tools`.

Si deux outils se normalisent vers le même nom de fonction sûr, OpenClaw omet la
fonction de commodité et nécessite OpenClaw`tools.call(id, input)`.

## Exécution d'outil imbriquée

Chaque appel d'outil imbriqué traverse le pont hôte et ré-entre dans OpenClaw.

L'exécution imbriquée préserve :

- id de l'agent actif
- id de session et clé de session
- expéditeur et contexte de channel
- stratégie de bac à sable (sandbox)
- stratégie d'approbation
- hooks de plugin `before_tool_call`
- signal d'abandon
- mises à jour en streaming lorsque disponible
- trajectoire et événements d'audit

Les appels imbriqués sont projetés dans la transcription comme de véritables appels d'outils afin que les bundles de support
puissent montrer ce qui s'est passé. La projection identifie l'appel d'outil parent en mode code
et l'id de l'outil imbriqué.

Les appels imbriqués parallèles sont autorisés jusqu'à `maxPendingToolCalls`.

## État d'exécution

Chaque exécution en mode code possède une machine à états :

- `running` : la VM est en cours d'exécution ou des appels imbriqués sont en cours.
- `waiting` : l'instantané de la VM existe et peut être repris avec `wait`.
- `completed` : valeur finale retournée ; instantané supprimé.
- `failed` : erreur retournée ; instantané supprimé.
- `expired` : l'instantané ou l'état en attente a dépassé la rétention ; impossible de reprendre.
- `aborted` : exécution/session parente annulée ; instantané supprimé.

L'état est délimité par l'exécution de l'agent, la session et l'id de l'appel d'outil. Un appel `wait` depuis une
exécution ou une session différente échoue.

Le stockage des instantanés est limité :

- octets d'instantané maximum par exécution
- instantanés en direct maximum par processus
- TTL de l'instantané
- nettoyage à la fin de l'exécution
- nettoyage à l'arrêt du Gateway lorsque la persistance n'est pas prise en charge

## Runtime QuickJS-WASI

OpenClaw charge `quickjs-wasi` en tant que dépendance directe dans le package propriétaire. Le
runtime ne repose pas sur une copie transitive installée pour le proxy, le PAC ou d'autres
dépendances sans rapport.

Responsabilités du runtime :

- compiler ou charger le module WebAssembly QuickJS-WASI
- créer une VM isolée par exécution en mode code ou par reprise
- enregistrer les rappels hôte par noms stables
- définir les limites de mémoire et d'interruption
- évaluer JavaScript
- vider les tâches en attente
- instantané de l'état de la VM suspendue
- restaurer les instantanés pour `wait`
- supprimer les handles de VM et les instantanés après les états terminaux

Le runtime s'exécute en dehors de la boucle d'événements principale d'OpenClaw dans un worker. Une boucle infinie invitée ne doit pas bloquer indéfiniment le processus Gateway.

## TypeScript

La prise en charge de TypeScript est uniquement une transformation de source :

- entrée acceptée : une chaîne de code TypeScript
- sortie : chaîne JavaScript évaluée par QuickJS-WASI
- pas de vérification de type
- pas de résolution de module
- pas de `import` ni de `require` dans v1
- les diagnostics sont renvoyés sous forme de résultats `failed`

Le compilateur TypeScript est chargé paresseusement uniquement pour les cellules TypeScript. Les cellules JavaScript simples et le mode code désactivé ne chargent pas le compilateur.

La transformation doit préserver les numéros de ligne utiles lorsque cela est possible.

## Limite de sécurité

Le code du modèle est hostile. Le runtime utilise la défense en profondeur :

- exécuter QuickJS-WASI en dehors de la boucle d'événements principale
- charger `quickjs-wasi` comme dépendance directe, et non via Codex ou un package transitif
- pas de système de fichiers, de réseau, de sous-processus, d'importation de module, de variables d'environnement ou d'objets globaux de l'hôte dans l'invité
- utiliser les limites de mémoire et d'interruption de QuickJS
- appliquer le délai d'attente temps réel du processus parent
- appliquer les limites de sortie, d'instantané, de journal et d'appel en attente
- sérialiser les valeurs du pont de l'hôte via un adaptateur JSON étroit
- convertir les erreurs de l'hôte en erreurs simples de l'invité, jamais en objets du domaine de l'hôte
- abandonner les instantanés en cas de délai d'attente, d'abandon, de fin de session ou d'expiration
- rejeter l'accès récursif à `exec`, `wait` et aux outils de contrôle de recherche d'outils
- empêcher les collisions de noms pratiques de masquer les assistants du catalogue

Le bac à sable est une couche de sécurité. Les opérateurs peuvent toujours avoir besoin d'un durcissement au niveau du système d'exploitation pour les déploiements à haut risque.

## Codes d'erreur

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Les erreurs renvoyées à l'invité sont des données simples. Les instances d'`Error` de l'hôte, les objets de pile, les prototypes et les fonctions de l'hôte ne traversent pas vers QuickJS.

## Télémétrie

Le mode code rapporte :

- les noms d'outils visibles envoyés au modèle
- la taille et la répartition par source du catalogue caché
- les comptes de `exec` et de `wait`
- les comptes de recherche, de description et d'appel imbriqués
- les ids d'outils imbriqués appelés
- délai d'expiration, mémoire, instantané et échecs de limite de sortie
- événements du cycle de vie des instantanés

La télémétrie ne doit pas inclure de secrets, de valeurs brutes d'environnement ou d'entrées de tool non masquées au-delà de la politique de trajectoire OpenClaw existante.

## Débogage

Utilisez la journalisation ciblée du transport de model lorsque le mode code se comporte différemment d'une exécution de tool normale :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

Pour le débogage de la forme de la charge utile, utilisez `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`.
Cela enregistre un instantané JSON limité et masqué de la requête du model ; il ne doit être utilisé que pendant le débogage car les invites et le texte des messages peuvent toujours apparaître.

Pour le débogage du flux, utilisez `OPENCLAW_DEBUG_SSE=peek` pour enregistrer les cinq premiers événements SSE masqués. Le mode code échoue également de manière fermée si la charge utile finale du provider ne contient pas exactement `exec` et `wait` après activation de la surface du mode code.

## Disposition de l'implémentation

Unités d'implémentation :

- contrat de configuration : `tools.codeMode`
- générateur de catalogue : tools effectifs vers entrées compactes et carte d'ID
- adaptateur de surface de model : remplacer les tools visibles par `exec` et `wait`
- adaptateur d'exécution QuickJS-WASI : chargement, évaluation, instantané, restauration, suppression
- superviseur de worker : délai d'expiration, abandon, isolation des plantages
- adaptateur de pont : rappels d'hôte sûrs pour JSON et livraison des résultats
- adaptateur de transformation TypeScript
- magasin d'instantanés : TTL, limites de taille, portée exécution/session
- projection de trajectoire pour les appels de tool imbriqués
- compteurs de télémétrie et diagnostics

L'implémentation réutilise les concepts de catalogue et d'exécuteur de Tool Search, mais n'utilise pas l'enfant `node:vm` comme bac à sable.

## Liste de vérification de validation

La couverture du mode code doit prouver :

- la configuration désactivée laisse l'exposition des tools existante inchangée
- la configuration d'objet sans `enabled: true` laisse le mode code désactivé
- la configuration activée expose uniquement `exec` et `wait` au model lorsque les tools sont
  actifs pour l'exécution
- les exécutions brutes sans tool, `disableTools`, et les listes d'autorisation vides ne déclenchent pas l'application de la charge utile du mode code
- tous les tools effectifs apparaissent dans `ALL_TOOLS`
- les tools refusés n'apparaissent pas dans `ALL_TOOLS`
- `tools.search`, `tools.describe` et `tools.call`OpenClaw fonctionnent pour les outils OpenClaw
- Les outils de contrôle Tool Search sont cachés à la fois de la surface du modèle et du catalogue caché
- les appels imbriqués préservent le comportement d'approbation et de hook
- le shell `exec` est caché du modèle mais appelable par id de catalogue lorsque autorisé
- le mode code récursif `exec` et `wait` ne sont pas appelables depuis le code invité
- l'entrée TypeScript est transformée et évaluée sans charger TypeScript sur les chemins désactivés ou JavaScript uniquement
- `import`, `require`, le système de fichiers, le réseau et l'accès à l'environnement échouent
- les boucles infinies expirent et ne peuvent pas bloquer la passerelle
- les échecs de limite de mémoire terminent la VM invitée
- les limites de sortie et de capture sont appliquées pour les appels terminés et suspendus
- `wait` reprend une capture suspendue et renvoie la valeur finale
- les valeurs expirées, annulées, wrong-session et inconnues de `runId` échouent
- la relecture et la persistance de la transcription préservent les appels de contrôle du mode code
- la transcription et la télémétrie affichent clairement les appels d'outils imbriqués

## Plan de test de bout en bout

Exécutez-les en tant que tests d'intégration ou de bout en bout lors de la modification du runtime :

1. Démarrez une passerelle avec Gateway`tools.codeMode.enabled: false`.
2. Envoyez un tour d'agent avec un petit ensemble d'outils directs.
3. Vérifiez que les outils visibles par le modèle sont inchangés.
4. Redémarrez avec `tools.codeMode.enabled: true`.
5. Envoyez un tour d'agent avec les outils de test OpenClaw, plugin, MCP et client.
6. Vérifiez que la liste des outils visibles par le modèle est exactement `exec`, `wait`.
7. Dans `exec`, lisez `ALL_TOOLS` et vérifiez que les outils de test effectifs sont présents.
8. Dans `exec`, appelez `tools.search`, `tools.describe` et `tools.call`.
9. Vérifiez que les outils refusés sont absents et ne peuvent pas être appelés par id deviné.
10. Démarrez un appel d'outil imbriqué qui se résout après que `exec` renvoie `waiting`.
11. Appelez `wait` et vérifiez que la VM restaurée reçoit le résultat du tool.
12. Vérifiez que la réponse finale contient la sortie produite après la restauration.
13. Vérifiez que l'expiration du délai, l'annulation et l'expiration de l'instantané nettoient l'état de l'exécution.
14. Exportez la trajectoire et vérifiez que les appels imbriqués sont visibles sous l'appel
    code-mode parent.

Les modifications purement documentaires sur cette page doivent toujours exécuter `pnpm check:docs`.

## Connexes

- [Recherche de tool](/fr/tools/tool-search)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Tool Exec](/fr/tools/exec)
- [Exécution de code](/fr/tools/code-execution)
