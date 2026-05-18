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

Cette page documente le mode code OpenClaw. Ce n'est pas le mode code Codex. Le mode code Codex fait partie du harnais de codage Codex et possède son propre espace de travail projet, son runtime, ses outils et sa sémantique d'exécution. Le mode code Codex et la recherche dynamique d'outils native Codex sont des surfaces stables du harnais Codex. Le mode code OpenClaw est un adaptateur de surface d'outil expérimental possédé par OpenClaw pour les exécutions OpenClaw génériques. Il utilise OpenClawOpenClawOpenClawOpenClaw`quickjs-wasi`OpenClawOpenClaw, un catalogue d'outils caché OpenClaw, et l'exécuteur d'outils OpenClaw normal.

## Qu'est-ce que c'est ?

Le mode code OpenClaw permet au modèle d'écrire un petit programme JavaScript ou TypeScript au lieu de choisir directement parmi une longue liste d'outils.

Lorsque le mode code est actif :

- La liste d'outils visible par le modèle est exactement `exec` et `wait`.
- `exec` évalue du JavaScript ou TypeScript généré par le modèle dans un worker QuickJS-WASI contraint.
- Les outils OpenClaw normaux sont cachés du prompt du modèle et exposés à l'intérieur du programme invité via OpenClaw`ALL_TOOLS` et `tools`.
- Le code invité peut rechercher dans le catalogue caché, décrire un outil et appeler un outil via le même chemin d'exécution OpenClaw utilisé par les tours d'agent normaux.
- `wait` reprend une exécution en mode code suspendue lorsque des appels d'outils imbriqués sont toujours en attente.

La distinction importante : le mode code modifie la surface d'orchestration orientée model. Il ne remplace pas les outils OpenClaw, les outils de plugin, les outils MCP, l'authentification,
la politique d'approbation, le comportement du canal ou la sélection du model.

## Pourquoi est-ce une bonne chose ?

Le mode code facilite l'utilisation de grands catalogues d'outils par les models.

- Surface de prompt plus petite : les providers reçoivent deux outils de contrôle au lieu de dizaines
  ou de centaines de schémas d'outils complets.
- Meilleure orchestration : le model peut utiliser des boucles, des jointures, de petites transformations,
  une logique conditionnelle et des appels d'outils imbriqués parallèles dans une seule cellule de code.
- Neutre vis-à-vis du provider : cela fonctionne pour les outils OpenClaw, de plugin, MCP et client sans
  dépendre de l'exécution de code native du provider.
- Les politiques existantes restent en vigueur : les appels d'outils imbriqués passent toujours par la politique OpenClaw,
  les approbations, les hooks, le contexte de session et les chemins d'audit.
- Mode d'échec clair : lorsque le mode code est explicitement activé et que le runtime est
  indisponible, OpenClaw échoue en mode fermé au lieu de revenir à une exposition directe large des
  outils.

Le mode code est particulièrement utile pour les agents disposant d'un grand catalogue d'outils activé ou
pour les workflows où le model doit rechercher, combiner et appeler
à plusieurs reprises des outils avant de produire une réponse.

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

Pour confirmer la forme de la charge utile du model lors du débogage, exécutez la Gateway avec
une journalisation ciblée :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Avec le mode code actif, les noms d'outils orientés model journalisés doivent être `exec` et
`wait`. Si vous avez besoin de la charge utile du provider expurgée, ajoutez
`OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` pour une courte session de débogage.

## Visite technique

Le reste de cette page décrit le contrat de runtime et les détails de l'implémentation.
Il est destiné aux mainteneurs, aux auteurs de plugins déboguant l'exposition des outils et
aux opérateurs validant les déploiements à haut risque.

## État du runtime

- Runtime : [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- État par défaut : désactivé.
- Stabilité : surface expérimentale OpenClaw ; Codex Code mode est une surface
  stable distincte du harnais Codex.
- Surface cible : exécutions d'agent OpenClaw génériques.
- Posture de sécurité : le code du modèle est hostile.
- Promesse面向utilisateur : l'activation du mode code ne revient jamais silencieusement à une
  exposition directe étendue des outils.

## Portée

Le mode code possède la forme d'orchestration面向model pour une exécution préparée. Il ne
possède pas la sélection du modèle, le comportement du canal, l'authentification, la politique d'outil ou les
implémentations d'outil.

Dans la portée :

- définitions d'outil `exec` et `wait` visibles par le modèle
- construction de catalogue d'outils caché
- exécution invitée JavaScript et TypeScript
- runtime worker QuickJS-WASI
- rappels (callbacks) hôte pour la recherche de catalogue, la description du schéma et l'appel d'outil
- état reproductible pour les programmes invités suspendus
- limites de sortie, de délai d'attente, de mémoire, d'appel en attente et d'instantané
- télémétrie et projection de trajectoire pour les appels d'outil imbriqués

Hors portée :

- exécution de code à distance native du fournisseur
- sémantique d'exécution du shell
- modification de l'autorisation d'outil existante
- scripts persistants créés par l'utilisateur
- accès au gestionnaire de paquets, aux fichiers, au réseau ou aux modules dans le code invité
- réutilisation directe des composants internes du mode Codex Code

Les outils détenus par le fournisseur, tels que les bac à sable Python distants, restent des outils distincts. Voir
[Code execution](/fr/tools/code-execution).

## Termes

Le **mode code** est le mode d'exécution OpenClaw qui masque les outils normaux du modèle et
n'expose que `exec` et `wait`.

Le **runtime invité** est la machine virtuelle JavaScript QuickJS-WASI qui évalue le code du modèle.

Le **pont hôte** est la surface de rappel étroite compatible JSON du code invité
vers OpenClaw.

Le **Catalogue** est la liste effective des outils délimitée à l'exécution, après la résolution normale de la
politique d'outil, des plugins, de MCP et des outils clients.

Un **appel d'outil imbriqué** est un appel d'outil effectué depuis le code invité via le pont hôte.

Un **Instantané** est l'état sérialisé de la VM QuickJS-WASI sauvegardé afin que `wait` puisse continuer une
exécution en mode code suspendue.

## Configuration

`tools.codeMode.enabled` est la porte d'activation. Le paramétrage d'autres champs de mode code
n'active pas la fonctionnalité.

Champs pris en charge :

- `enabled` : booléen. Par défaut `false`. Active le mode code uniquement lorsque `true`.
- `runtime` : `"quickjs-wasi"`. Seul runtime pris en charge.
- `mode` : `"only"`. Expose `exec` et `wait`, masque les outils normaux du model.
- `languages` : tableau de `"javascript"` et `"typescript"`. La valeur par défaut inclut
  les deux.
- `timeoutMs` : limite d'horloge pour un `exec` ou un `wait`. Par défaut `10000`.
  Plage du runtime : `100` à `60000`.
- `memoryLimitBytes` : limite du tas QuickJS. Par défaut `67108864`. Plage du runtime :
  `1048576` à `1073741824`.
- `maxOutputBytes` : limite pour le texte, le JSON et les journaux renvoyés. Par défaut `65536`.
  Plage du runtime : `1024` à `10485760`.
- `maxSnapshotBytes` : limite pour les instantanés sérialisés de la VM. Par défaut `10485760`.
  Plage du runtime : `1024` à `268435456`.
- `maxPendingToolCalls` : limite pour les appels d'outils imbriqués simultanés. Par défaut `16`.
  Plage du runtime : `1` à `128`.
- `snapshotTtlSeconds` : durée pendant laquelle une VM suspendue peut être reprise. Par défaut `900`.
  Plage du runtime : `1` à `86400`.
- `searchDefaultLimit` : nombre par défaut de résultats de recherche dans le catalogue caché. Par défaut `8`.
  Le runtime limite cela à `maxSearchLimit`.
- `maxSearchLimit` : nombre maximum de résultats de recherche dans le catalogue caché. Par défaut `50`.
  Plage du runtime : `1` à `50`.

Si le mode code est activé mais que QuickJS-WASI ne peut pas être chargé, OpenClaw échoue de manière fermée pour cette exécution. Il n'expose pas silencieusement les outils normaux en solution de repli.

## Activation

Le mode code est évalué une fois que la stratégie d'outil effective est connue et avant que la requête finale au modèle ne soit assemblée.

Ordre d'activation :

1. Résoudre l'agent, le modèle, le fournisseur, le bac à sable, le canal, l'expéditeur et la stratégie d'exécution.
2. Construire la liste effective des outils OpenClaw.
3. Ajouter les outils éligibles des plugins, MCP et clients.
4. Appliquer la stratégie d'autorisation et de refus.
5. Si `tools.codeMode.enabled` est faux, continuer avec l'exposition normale des outils.
6. Si activé et que des outils sont actifs pour l'exécution, enregistrer les outils effectifs dans le catalogue du mode code.
7. Supprimer tous les outils normaux de la liste des outils visibles par le modèle.
8. Ajouter le `exec` et le `wait` du mode code.

Les exécutions qui n'ont intentionnellement aucun outil, comme les appels bruts au modèle, `disableTools`, ou une liste d'autorisation vide, n'activent pas la surface du mode code même si la configuration contient `tools.codeMode.enabled: true`.

Le catalogue du mode code est limité à l'exécution. Il ne doit pas faire fuiter des outils provenant d'un autre agent, session, expéditeur ou exécution.

## Outils visibles par le modèle

Lorsque le mode code est actif, le modèle voit exactement ces outils de premier niveau :

- `exec`
- `wait`

Tous les autres outils activés sont masqués de la liste des outils face au modèle et enregistrés dans le catalogue du mode code.

Le modèle doit utiliser `exec` pour l'orchestration d'outils, la jonction de données, les boucles, les appels imbriqués parallèles et les transformations structurées. Le modèle doit utiliser `wait` uniquement lorsque `exec` renvoie un résultat `waiting` reproductible.

## `exec`

`exec` démarre une cellule en mode code et renvoie un résultat. Le code d'entrée est généré par le modèle et doit être traité comme hostile.

Entrée :

```typescript
type CodeModeExecInput = {
  code: string;
  language?: "javascript" | "typescript";
};
```

Règles d'entrée :

- `code` est requis et ne doit pas être vide.
- `language` est `"javascript"` par défaut.
- Si `language` est `"typescript"`, OpenClaw transpile avant l'évaluation.
- `exec` rejette `import`, `require`, l'importation dynamique et les modèles de chargeur de modules
  dans v1.
- `exec` n'expose pas l'implémentation normale du shell `exec` de manière récursive.

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

`exec` renvoie `waiting` lorsque la machine virtuelle QuickJS se suspend avec un état reproductible. Le
résultat inclut un `runId` pour `wait`.

`exec` renvoie `completed` uniquement lorsque la machine virtuelle invitée n'a aucune tâche en attente et que
la valeur finale est compatible JSON après l'exécution de l'adaptateur de sortie d'OpenClaw.

## `wait`

`wait` poursuit une machine virtuelle de mode code suspendue.

Entrée :

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La sortie est la même union `CodeModeResult` renvoyée par `exec`.

`wait` existe car les outils imbriqués d'OpenClaw peuvent être lents, interactifs, soumis à approbation
ou diffuser des mises à jour partielles. Le modèle ne devrait pas avoir besoin de garder un long appel
`exec` ouvert pendant que l'hôte attend un travail externe.

La capture instantanée et la restauration QuickJS-WASI constituent le mécanisme de reprise de la v1 :

1. `exec` évalue le code jusqu'à la fin, l'échec ou la suspension.
2. Lors de la suspension, OpenClaw capture instantanément la machine virtuelle QuickJS et enregistre le travail hôte
   en attente.
3. Lorsque le travail en attente est réglé, `wait` restaure la capture instantanée de la machine virtuelle.
4. OpenClaw réenregistre les rappels de l'hôte par noms stables.
5. OpenClaw transmet les résultats des outils imbriqués dans la machine virtuelle restaurée.
6. OpenClaw vide les tâches en attente de QuickJS.
7. `wait` renvoie `completed`, `failed`, ou un autre résultat `waiting`.

Les captures instantanées sont un état d'exécution, et non des artefacts utilisateur. Elles sont limitées en taille, expirées,
et délimitées à l'exécution et à la session qui les ont créées.

`wait` échoue lorsque :

- le `runId` est inconnu.
- la capture instantanée a expiré.
- la session ou l'exécution parente a été abandonnée.
- l'appelant n'est pas dans la même portée de session ou d'exécution.
- La restauration de QuickJS-WASI échoue.
- la restauration dépasserait les limites configurées.

## API d'exécution invitée

L'exécution invitée expose une petite API globale :

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` est des métadonnées compactes pour le catalogue délimité à l'exécution. Il ne contient pas
par défaut de schémas complets.

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

Les fonctions d'outil pratiques sont installées uniquement pour les noms sécurisés sans ambiguïté :

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

L'exécution invitée ne doit pas exposer directement les objets de l'hôte. Les entrées et les sorties traversent
le pont sous forme de valeurs compatibles JSON avec des limites de taille explicites.

## API de sortie

`text(value)` ajoute une sortie lisible par l'homme au tableau `output`.

`json(value)` ajoute un élément de sortie structuré après une sérialisation
compatible JSON.

La valeur finale renvoyée par le code invité devient `value` dans un résultat `completed`.

Élément de sortie :

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Règles de sortie :

- l'ordre de sortie correspond aux appels de l'invité
- la sortie est plafonnée par `maxOutputBytes`
- les valeurs non sérialisables sont converties en chaînes simples ou en erreurs
- les valeurs binaires ne sont pas prises en charge dans v1
- les images et les fichiers transitent par les outils OpenClaw ordinaires, et non par
  le pont du code-mode

## Catalogue d'outils

Le catalogue caché inclut les outils après filtrage effectif par stratégie :

1. Outils de base OpenClaw.
2. Outils de plug-in regroupés.
3. Outils de plug-in externes.
4. Outils MCP.
5. Outils fournis par le client pour l'exécution en cours.

Les identifiants du catalogue sont stables au sein d'une exécution et déterministes sur des ensembles d'outils équivalents lorsque cela est possible.

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

Le catalogue omet les outils de contrôle du code-mode :

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

Cela empêche la récursion et maintient le contrat orienté modèle étroit.

## Interaction Recherche d'outils

Le code-mode remplace la surface de modèle de recherche d'outils PI pour les exécutions où il est
actif.

Lorsque `tools.codeMode.enabled` est vrai et que le code-mode s'active :

- OpenClaw n'expose pas OpenClaw`tool_search_code`, `tool_search`, `tool_describe`
  ou `tool_call` en tant qu'outils visibles par le modèle.
- La même idée de catalogue se déplace à l'intérieur du runtime invité.
- Le runtime invité reçoit des métadonnées `ALL_TOOLS` compactes et des assistants de recherche, de description et d'appel.
- Les appels imbriqués sont dispatchés via le même chemin d'exécution OpenClaw que celui utilisé par Tool Search.

La page existante [Tool Search](/fr/tools/tool-searchOpenClaw) décrit le pont de catalogue compact PI. Le mode Code est l'alternative générique OpenClaw pour les exécutions qui peuvent
utiliser `exec` et `wait`.

## Noms d'outils et collisions

L'outil `exec`OpenClaw visible par le modèle est l'outil en mode Code. Si l'outil `exec` du shell OpenClaw normal est activé, il est masqué pour le modèle et catalogué comme n'importe quel autre outil.

À l'intérieur du runtime invité :

- `tools.call("openclaw:core:exec", input)` peut appeler l'outil d'exécution du shell si
  la stratégie le permet.
- `tools.exec(...)` n'est installé que si l'entrée de catalogue du shell exec possède un
  nom sécurisé sans ambiguïté.
- l'outil `exec` en mode Code n'est jamais disponible de manière récursive via `tools`.

Si deux outils se normalisent vers le même nom de commodité sécurisé, OpenClaw omet la
fonction de commodité et exige OpenClaw`tools.call(id, input)`.

## Exécution d'outils imbriqués

Chaque appel d'outil imbriqué traverse le pont hôte et réentre dans OpenClaw.

L'exécution imbriquée préserve :

- id de l'agent actif
- id de session et clé de session
- contexte de l'expéditeur et du canal
- stratégie du bac à sable
- stratégie d'approbation
- hooks `before_tool_call` du plugin
- signal d'abandon
- mises à jour en streaming lorsque disponibles
- événements de trajectoire et d'audit

Les appels imbriqués sont projetés dans la transcription en tant que vrais appels d'outils afin que les bundles de support
puissent montrer ce qui s'est passé. La projection identifie l'appel de l'outil parent en mode Code
et l'ID de l'outil imbriqué.

Les appels imbriqués parallèles sont autorisés jusqu'à `maxPendingToolCalls`.

## État d'exécution

Chaque exécution en mode Code possède une machine à états :

- `running` : la VM s'exécute ou des appels imbriqués sont en cours.
- `waiting` : un instantané de la VM existe et peut être repris avec `wait`.
- `completed` : valeur finale retournée ; instantané supprimé.
- `failed` : erreur retournée ; instantané supprimé.
- `expired` : l'instantané ou l'état en attente a dépassé la rétention ; impossible de reprendre.
- `aborted` : l'exécution/session parente a été annulée ; instantané supprimé.

L'état est délimité par l'exécution de l'agent, la session et l'ID d'appel d'outil. Un appel `wait` depuis une
exécution ou une session différente échoue.

Le stockage des instantanés est limité :

- nombre maximum d'octets d'instantané par exécution
- nombre maximum d'instantanés actifs par processus
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
- enregistrer les rappels de l'hôte par des noms stables
- définir les limites de mémoire et d'interruption
- évaluer JavaScript
- vider les tâches en attente
- créer un instantané de l'état de la VM suspendue
- restaurer les instantanés pour `wait`
- supprimer les handles de VM et les instantanés après les états terminaux

Le runtime s'exécute en dehors de la boucle d'événements principale de OpenClaw dans un worker. Une
boucle inférieure invitée ne doit pas bloquer indéfiniment le processus Gateway.

## TypeScript

La prise en charge de TypeScript est uniquement une transformation source :

- entrée acceptée : une chaîne de code TypeScript
- sortie : chaîne JavaScript évaluée par QuickJS-WASI
- pas de vérification de type
- pas de résolution de module
- pas de `import` ou de `require` dans v1
- les diagnostics sont renvoyés sous forme de résultats `failed`

Le compilateur TypeScript est chargé paresseusement uniquement pour les cellules TypeScript. Les
cellules JavaScript simples et le mode code désactivé ne chargent pas le compilateur.

La transformation doit préserver les numéros de ligne utiles lorsque cela est possible.

## Limite de sécurité

Le code du modèle est hostile. Le runtime utilise une défense en profondeur :

- exécuter QuickJS-WASI en dehors de la boucle d'événements principale
- charger `quickjs-wasi` comme dépendance directe, et non via Codex ou un package
  transitif
- pas de système de fichiers, de réseau, de sous-processus, d'importation de module, de variables d'environnement ou
  d'objets globaux de l'hôte chez l'invité
- utiliser les limites de mémoire et d'interruption de QuickJS
- appliquer un délai d'attente temps réel (wall-clock) du processus parent
- appliquer les plafonds de sortie, d'instantané, de journal et d'appels en attente
- sérialiser les valeurs du pont de l'hôte via un adaptateur JSON étroit
- convertir les erreurs de l'hôte en erreurs simples de l'invité, jamais en objets du domaine de l'hôte
- abandonner les instantanés en cas de délai d'attente, d'abandon, de fin de session ou d'expiration
- rejeter l'accès récursif à `exec`, `wait` et aux outils de contrôle de recherche d'outils
- empêcher les collisions de noms de commodité de masquer les assistants du catalogue

Le bac à sable est une couche de sécurité. Les opérateurs peuvent toujours avoir besoin d'un durcissement au niveau du système d'exploitation
pour les déploiements à haut risque.

## Codes d'erreur

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Les erreurs renvoyées à l'invité sont des données simples. Les instances `Error` de l'hôte, les objets
de pile, les prototypes et les fonctions de l'hôte ne traversent pas vers QuickJS.

## Télémétrie

Le mode code signale :

- les noms d'outils visibles envoyés au modèle
- la taille et la répartition par source du catalogue caché
- les comptes de `exec` et `wait`
- les comptes de recherche imbriquée, de description et d'appel
- les ids d'outils imbriqués appelés
- les échecs de délai d'attente, de mémoire, d'instantané et de plafond de sortie
- les événements du cycle de vie des instantanés

La télémétrie ne doit pas inclure de secrets, de valeurs brutes d'environnement ou d'entrées d'outils non expurgées
au-delà de la politique de trajectoire existante d'OpenClaw.

## Débogage

Utilisez la journalisation ciblée du transport de modèle lorsque le mode code se comporte différemment d'une
exécution d'outil normale :

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

Pour le débogage de la forme des charges utiles, utilisez `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`.
Cela enregistre un instantané JSON plafonné et expurgé de la requête du modèle ; il ne doit
être utilisé que pendant le débogage car les invites et le texte des messages peuvent toujours apparaître.

Pour le débogage du flux, utilisez `OPENCLAW_DEBUG_SSE=peek` pour enregistrer les cinq premiers
événements SSE expurgés. Le mode code échoue également en mode fermé si la charge utile finale du fournisseur
ne contient pas exactement `exec` et `wait` après l'activation de la surface du mode code.

## Disposition de l'implémentation

Unités d'implémentation :

- config contract : `tools.codeMode`
- catalog builder : effective tools to compact entries and id map
- model-surface adapter : replace visible tools with `exec` and `wait`
- QuickJS-WASI runtime adapter : load, eval, snapshot, restore, dispose
- worker supervisor : timeout, abort, crash isolation
- bridge adapter : JSON-safe host callbacks and result delivery
- TypeScript transform adapter
- snapshot store : TTL, size caps, run/session scoping
- trajectory projection for nested tool calls
- telemetry counters and diagnostics

The implementation reuses catalog and executor concepts from Tool Search, but
does not use the `node:vm` child as the sandbox.

## Validation checklist

Code mode coverage should prove :

- disabled config leaves existing tool exposure unchanged
- object config without `enabled: true` leaves code mode disabled
- enabled config exposes only `exec` and `wait` to the model when tools are
  active for the run
- raw no-tool runs, `disableTools`, and empty allowlists do not trigger code-mode
  payload enforcement
- all effective tools appear in `ALL_TOOLS`
- denied tools do not appear in `ALL_TOOLS`
- `tools.search`, `tools.describe`, and `tools.call` work for OpenClaw tools
- Tool Search control tools are hidden from both the model surface and the hidden
  catalog
- nested calls preserve approval and hook behavior
- shell `exec` is hidden from the model but callable by catalog id when allowed
- recursive code-mode `exec` and `wait` are not callable from guest code
- TypeScript input is transformed and evaluated without loading TypeScript on
  disabled or JavaScript-only paths
- `import`, `require`, filesystem, network, and environment access fail
- infinite loops time out and cannot block the Gateway
- memory cap failures terminate the guest VM
- les limites de sortie et d'instantané sont appliquées pour les appels terminés et suspendus
- `wait` reprend un instantané suspendu et renvoie la valeur finale
- les valeurs expirées, abandonnées, de mauvaise session et inconnues de `runId` échouent
- la relecture et la persistance de la transcription préservent les appels de contrôle du code-mode
- la transcription et la télémétrie affichent clairement les appels d'outil imbriqués

## Plan de test de bout en bout

Exécutez-les en tant que tests d'intégration ou de bout en bout lors de la modification de l'exécution :

1. Démarrez une Gateway avec `tools.codeMode.enabled: false`.
2. Envoyez un tour d'agent avec un petit ensemble d'outils directs.
3. Vérifiez que les outils visibles par le modèle sont inchangés.
4. Redémarrez avec `tools.codeMode.enabled: true`.
5. Envoyez un tour d'agent avec les outils de test OpenClaw, de plugin, MCP et client.
6. Vérifiez que la liste d'outils visible par le modèle est exactement `exec`, `wait`.
7. Dans `exec`, lisez `ALL_TOOLS` et vérifiez que les outils de test effectifs sont présents.
8. Dans `exec`, appelez `tools.search`, `tools.describe` et `tools.call`.
9. Vérifiez que les outils refusés sont absents et ne peuvent pas être appelés par id deviné.
10. Démarrez un appel d'outil imbriqué qui se résout après le retour de `exec` de `waiting`.
11. Appelez `wait` et vérifiez que la VM restaurée reçoit le résultat de l'outil.
12. Vérifiez que la réponse finale contient la sortie produite après la restauration.
13. Vérifiez que l'expiration du délai d'attente, l'abandon et l'expiration de l'instantané nettoient l'état de l'exécution.
14. Exportez la trajectoire et vérifiez que les appels imbriqués sont visibles sous l'appel parent
    de code-mode.

Les modifications uniquement documentaires sur cette page doivent toujours exécuter `pnpm check:docs`.

## Connexes

- [Recherche d'outils](/fr/tools/tool-search)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Outil Exec](/fr/tools/exec)
- [Exécution de code](/fr/tools/code-execution)
