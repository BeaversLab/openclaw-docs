---
title: "Port du moteur de contexte du harnais Codex"
summary: "Spécification permettant au harnais du serveur d'application Codex inclus de respecter les plugins du moteur de contexte OpenClaw"
read_when:
  - You are wiring context-engine lifecycle behavior into the Codex harness
  - You need lossless-claw or another context-engine plugin to work with codex/* embedded harness sessions
  - You are comparing embedded PI and Codex app-server context behavior
---

## Statut

Spécification de mise en œuvre de l'ébauche.

## Objectif

Faire en sorte que le harnais du serveur d'application Codex inclus respecte le même contrat de cycle de vie du moteur de contexte OpenClaw que les tours PI intégrés respectent déjà.

Une session utilisant `agents.defaults.embeddedHarness.runtime: "codex"` ou un modèle `codex/*` doit toujours permettre au plugin de moteur de contexte sélectionné, tel que `lossless-claw`, de contrôler l'assemblage du contexte, l'ingestion post-tour, la maintenance et la politique de compaction au niveau OpenClaw, dans la limite de ce qu'autorise la frontière du Codex app-server.

## Non-objectifs

- Ne pas réimplémenter les internes du Codex app-server.
- Ne pas faire en sorte que la compaction du thread natif Codex produise un résumé lossless-claw.
- Ne pas exiger que les modèles non-Codex utilisent le harnais Codex.
- Ne pas modifier le comportement de session ACP/acpx. Cette spécification concerne uniquement
  le chemin du harnais d'agent intégré non-ACP.
- Ne pas faire en sorte que les plugins tiers enregistrent des fabriques d'extensions du serveur d'application Codex ;
  la limite de confiance des plugins groupés existants reste inchangée.

## Architecture actuelle

La boucle d'exécution intégrée résout le moteur de contexte configuré une fois par exécution avant
sélectionner un harnais de bas niveau concret :

- `src/agents/pi-embedded-runner/run.ts`
  - initialise les plugins du moteur de contexte
  - appelle `resolveContextEngine(params.config)`
  - passe `contextEngine` et `contextTokenBudget` dans
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` délègue au harnais d'agent sélectionné :

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Le harnais Codex app-server est enregistré par le plugin Codex groupé :

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

L'implémentation du harnais Codex reçoit le même `EmbeddedRunAttemptParams`
que les tentatives basées sur PI :

- `extensions/codex/src/app-server/run-attempt.ts`

Cela signifie que le point d'accroche requis se trouve dans le code contrôlé par OpenClaw. La frontière externe est le protocole du Codex app-server lui-même : OpenClaw peut contrôler ce qu'il envoie à `thread/start`, `thread/resume` et `turn/start`, et peut observer les notifications, mais il ne peut pas modifier le magasin de threads interne de Codex ni le compacteur natif.

## Écart actuel

Les tentatives du PE intégré appellent directement le cycle de vie du moteur de contexte :

- amorçage/maintenance avant la tentative
- assembler avant l'appel au model
- afterTurn ou ingest après la tentative
- maintenance après un tour réussi
- compactage du context-engine pour les moteurs qui possèdent le compactage

Code PI pertinent :

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Les tentatives du Codex app-server exécutent actuellement des hooks génériques de agent-harness et reflètent la transcription, mais n'appellent pas `params.contextEngine.bootstrap`, `params.contextEngine.assemble`, `params.contextEngine.afterTurn`, `params.contextEngine.ingestBatch`, `params.contextEngine.ingest` ou `params.contextEngine.maintain`.

Code Codex pertinent :

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## Comportement souhaité

Pour les tours de harnais Codex, OpenClaw doit préserver ce cycle de vie :

1. Lire la transcription de session OpenClaw en miroir.
2. Initialiser le moteur de contexte actif lorsqu'un fichier de session précédent existe.
3. Exécuter la maintenance de l'amorçage lorsque disponible.
4. Assembler le contexte en utilisant le moteur de contexte actif.
5. Convertir le contexte assemblé en entrées compatibles Codex.
6. Démarrez ou reprenez le fil Codex avec des instructions de développeur incluant tout
   `systemPromptAddition` du moteur de contexte.
7. Démarrez le tour Codex avec l'invite utilisateur assemblée.
8. Réfléchissez le résultat Codex dans la transcription OpenClaw.
9. Appelez `afterTurn` si implémenté, sinon `ingestBatch`/`ingest`, en utilisant
   l'instantané de la transcription reflétée.
10. Exécuter la maintenance du tour après les tours réussis non abandonnés.
11. Conserver les signaux de compactage natifs de Codex et les crochets de compactage OpenClaw.

## Contraintes de conception

### Le serveur d'application Codex reste la référence pour l'état du thread natif

Codex possède son thread natif et tout historique interne étendu. OpenClaw ne doit
pas essayer de modifier l'historique interne du serveur d'application, sauf via des appels
de protocole pris en charge.

Le miroir de transcription de OpenClaw reste la source pour les fonctionnalités OpenClaw :

- historique des discussions
- recherche
- tenue de livres `/new` et `/reset`
- changements futurs de modèle ou de harnais
- état du plugin context-engine

### L'assemblage du moteur de contexte doit être projeté dans les entrées Codex

L'interface du moteur de contexte renvoie OpenClaw `AgentMessage[]`, et non un correctif de fil Codex. Le `turn/start` du serveur d'application Codex accepte une entrée utilisateur actuelle, tandis que `thread/start` et `thread/resume` acceptent des instructions de développeur.

Par conséquent, la mise en œuvre nécessite une couche de projection. La première version sûre devrait éviter de prétendre qu'elle peut remplacer l'historique interne de Codex. Elle devrait injecter le contexte assemblé sous forme de matériel de prompt/d'instruction de développeur déterministe autour du tour actuel.

### La stabilité du cache de prompt compte

Pour les moteurs tels que lossless-claw, le contexte assemblé doit être déterministe pour des entrées inchangées. N'ajoutez pas d'horodatages, d'identifiants aléatoires ou d'ordre non déterministe au texte de contexte généré.

### La sémantique de sélection à l'exécution ne change pas

La sélection du harnais reste telle quelle :

- `runtime: "pi"` force PI
- `runtime: "codex"` sélectionne le harnais Codex enregistré
- `runtime: "auto"` permet aux harnais de plugins de revendiquer les fournisseurs pris en charge
- les exécutions `auto` sans correspondance utilisent PI

Ce travail modifie ce qui se passe après la sélection du harnais Codex.

## Plan de mise en œuvre

### 1. Exporter ou déplacer les assistants de tentative de moteur de contexte réutilisables

Aujourd'hui, les assistants de cycle de vie réutilisables se trouvent sous le runner PI :

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Codex ne devrait pas importer depuis un chemin d'implémentation dont le nom implique PI si nous pouvons l'éviter.

Créez un module neutre par rapport au harnais, par exemple :

- `src/agents/harness/context-engine-lifecycle.ts`

Déplacez ou ré-exportez :

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- un petit wrapper autour de `runContextEngineMaintenance`

Maintenir les imports PI fonctionnels soit en réexportant depuis les anciens fichiers, soit en mettant à jour les sites d'appel PI dans la même PR.

Les noms des helpers neutres ne doivent pas mentionner PI.

Noms suggérés :

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. Ajouter un helper de projection de contexte Codex

Ajouter un nouveau module :

- `extensions/codex/src/app-server/context-engine-projection.ts`

Responsabilités :

- Accepter le `AgentMessage[]` assemblé, l'historique miroir original et le prompt actuel.
- Déterminer quel contexte appartient aux instructions du développeur par rapport à la saisie de l'utilisateur actuel.
- Conserver le prompt utilisateur actuel en tant que demande actionnable finale.
- Rendre les messages précédents dans un format stable et explicite.
- Éviter les métadonnées volatiles.

API proposée API :

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: { assembledMessages: AgentMessage[]; originalHistoryMessages: AgentMessage[]; prompt: string; systemPromptAddition?: string }): CodexContextProjection;
```

Première projection recommandée :

- Mettre `systemPromptAddition` dans les instructions du développeur.
- Mettre le contexte de la transcription assemblé avant l'invite actuelle dans `promptText`.
- L'étiqueter clairement comme contexte assemblé par OpenClaw.
- Garder l'invite actuelle en dernier.
- Exclure l'invite utilisateur actuelle en double si elle apparaît déjà à la fin.

Exemple de forme d'invite :

```text
OpenClaw assembled context for this turn:

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

Current user request:
...
```

C'est moins élégant que la chirurgie de l'historique Codex native, mais c'est réalisable
à l'intérieur de OpenClaw et préserve la sémantique du moteur de contexte.

Amélioration future : si Codex app-server expose un protocole pour remplacer ou
compléter l'historique des fils, échanger cette couche de projection pour utiliser cette API.

### 3. Connecter l'amorçage avant le démarrage du fil Codex

Dans `extensions/codex/src/app-server/run-attempt.ts` :

- Lire l'historique de la session en miroir comme aujourd'hui.
- Déterminez si le fichier de session existait avant cette exécution. Préférez une aide
  qui vérifie `fs.stat(params.sessionFile)` avant de répercuter les écritures.
- Ouvrez un `SessionManager` ou utilisez un adaptateur étroit de gestionnaire de session si l'aide
  le requiert.
- Appelez l'aide neutre d'amorçage lorsque `params.contextEngine` existe.

Pseudo-flux :

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

Utilisez la même convention `sessionKey` que le pont d'outil Codex et le miroir de
transcription. Aujourd'hui, Codex calcule `sandboxSessionKey` à partir de `params.sessionKey` ou
`params.sessionId` ; utilisez cela de manière cohérente, sauf s'il y a une raison de préserver
le `params.sessionKey` brut.

### 4. Connectez l'assemblage avant `thread/start` / `thread/resume` et `turn/start`

Dans `runCodexAppServerAttempt` :

1. Créez d'abord des outils dynamiques, afin que le moteur de contexte puisse voir les noms d'outils réellement disponibles.
2. Lisez l'historique de la session mise en miroir.
3. Exécutez `assemble(...)` du moteur de contexte lorsque `params.contextEngine` existe.
4. Projetez le résultat assemblé dans :
   - ajout d'instructions au développeur
   - texte d'invite pour `turn/start`

L'appel de hook existant :

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

doit devenir contextuel :

1. calculer les instructions de base du développeur avec `buildDeveloperInstructions(params)`
2. appliquer l'assemblage/projection du moteur de contexte
3. exécuter `before_prompt_build` avec l'invite/instructions du développeur projetées

Cet ordre permet aux hooks de prompt génériques de voir le même prompt que Codex recevra. Si nous avons besoin d'une stricte parité PI, exécutez l'assemblage du contexte-engine avant la composition des hooks, car PI applique le contexte-engine `systemPromptAddition` au prompt système final après son pipeline de prompt. L'invariant important est que le contexte-engine et les hooks obtiennent tous deux un ordre déterministe et documenté.

Ordre recommandé pour la première implémentation :

1. `buildDeveloperInstructions(params)`
2. context-engine `assemble()`
3. ajouter/préfixer `systemPromptAddition` aux instructions développeur
4. projeter les messages assemblés dans le texte du prompt
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. passer les instructions développeur finales à `startOrResumeThread(...)`
7. passer le texte de prompt final à `buildTurnStartParams(...)`

La spécification doit être encodée dans des tests afin que les modifications futures ne la réordonnent pas par accident.

### 5. Conserver un formatage stable pour le cache de prompt

L'assistant de projection doit produire une sortie stable en octets pour des entrées identiques :

- ordre des messages stable
- étiquettes de rôle stables
- pas d'horodatages générés
- pas de fuite de l'ordre des clés d'objet
- pas de délimiteurs aléatoires
- pas d'identifiants par exécution

Utilisez des délimiteurs fixes et des sections explicites.

### 6. Câbler post-turn après la mise en miroir de la transcription

Le `CodexAppServerEventProjector` de Codex construit un `messagesSnapshot` local pour
le tour actuel. `mirrorTranscriptBestEffort(...)` écrit cet instantané dans le
miroir de transcription OpenClaw.

Après que la mise en miroir a réussi ou échoué, appelez le finaliseur du moteur de contexte avec le
meilleur instantané de message disponible :

- Privilégiez le contexte complet de la session mise en miroir après l'écriture, car `afterTurn`
  attend l'instantané de la session, et pas seulement le tour actuel.
- Revenez à `historyMessages + result.messagesSnapshot` si le fichier de session
  ne peut pas être rouvert.

Pseudo-flux :

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

Si la mise en miroir échoue, appelez tout de même `afterTurn` avec l'instantané de repli, mais journalisez
le fait que le moteur de contexte ingère des données de tour de repli.

### 7. Normaliser l'utilisation et le contexte d'exécution du cache de prompt

Les résultats Codex incluent une utilisation normalisée issue des notifications de jetons du serveur d'application lorsque
celles-ci sont disponibles. Transmettez cette utilisation dans le contexte d'exécution du moteur de contexte.

Si le serveur d'application Codex expose éventuellement les détails de lecture/écriture du cache, mappez-les dans
`ContextEnginePromptCacheInfo`. D'ici là, omettez `promptCache` plutôt que
d'inventer des zéros.

### 8. Politique de compactage

Il existe deux systèmes de compactage :

1. OpenClaw du moteur de contexte `compact()`
2. `thread/compact/start` natif du serveur d'application Codex

Ne les confondez pas silencieusement.

#### `/compact` et compactage explicite OpenClaw

Lorsque le moteur de contexte sélectionné a `info.ownsCompaction === true`, la compactage explicite OpenClaw devrait privilégier le résultat `compact()` du moteur de contexte pour
le miroir de transcription OpenClaw et l'état du plugin.

Lorsque le harnais Codex sélectionné a une liaison de thread native, nous pouvons également
demander une compactage native Codex pour maintenir le thread app-server en bonne santé, mais cela
doit être signalé comme une action backend distincte dans les détails.

Comportement recommandé :

- Si `contextEngine.info.ownsCompaction === true` :
  - appeler d'abord le `compact()` du moteur de contexte
  - puis appeler au mieux la compactage native Codex lorsqu'une liaison de thread existe
  - renvoyer le résultat du moteur de contexte comme résultat principal
  - inclure le statut de la compactage native Codex dans `details.codexNativeCompaction`
- Si le moteur de contexte actif ne possède pas la compaction :
  - préserver le comportement de compaction natif actuel de Codex

Cela nécessite probablement de modifier `extensions/codex/src/app-server/compact.ts` ou
de l'envelopper à partir du chemin de compaction générique, en fonction de l'endroit où
`maybeCompactAgentHarnessSession(...)` est appelé.

#### Événements de contexteCompaction natif Codex en cascade

Codex peut émettre des événements d'élément `contextCompaction` au cours d'un tour. Conservez l'émission du hook actuel avant/après compactage dans `event-projector.ts`, mais ne traitez pas cela comme un compactage du moteur de contexte terminé.

Pour les moteurs qui possèdent le compactage, émettez un diagnostic explicite lorsque Codex effectue tout de même un compactage natif :

- nom du flux/de l'événement : le flux `compaction` existant est acceptable
- details: `{ backend: "codex-app-server", ownsCompaction: true }`

Cela rend la division vérifiable.

### 9. Réinitialisation de session et comportement de liaison

Le harnais Codex existant `reset(...)` efface la liaison du serveur d'application Codex du
fichier de session OpenClaw. Conservez ce comportement.

Assurez-vous également que le nettoyage de l'état du moteur de contexte continue de se produire via les chemons de cycle de vie de session OpenClaw existants. N'ajoutez pas de nettoyage spécifique à Codex à moins que le cycle de vie du moteur de contexte ne manque actuellement des événements de réinitialisation/suppression pour tous les harnais.

### 10. Gestion des erreurs

Suivre la sémantique PI :

- les échecs de l'amorçage (bootstrap) avertissent et continuent
- les échecs de l'assemblage avertissent et reviennent aux messages/invites de pipeline non assemblés
- les échecs afterTurn/ingest avertissent et marquent la finalisation post-tour comme échouée
- la maintenance s'exécute uniquement après les tours réussis, non abandonnés et non cédés
- les erreurs de compactage ne doivent pas être réessayées comme de nouveaux invites

ajouts spécifiques à Codex :

- Si la projection du contexte échoue, avertir et revenir à l'invite originale.
- Si le miroir de transcription échoue, tenter quand même la finalisation du moteur de contexte avec
  des messages de repli.
- Si la compactage native Codex échoue après la réussite de la compactage du moteur de contexte,
  ne pas échouer toute la compactage OpenClaw lorsque le moteur de contexte est primaire.

## Plan de test

### Tests unitaires

Ajouter des tests sous `extensions/codex/src/app-server` :

1. `run-attempt.context-engine.test.ts`
   - Codex appelle `bootstrap` lorsqu'un fichier de session existe.
   - Codex appelle `assemble` avec des messages en miroir, le budget de jetons, les noms d'outils,
     le mode de citations, l'identifiant du modèle et le prompt.
   - `systemPromptAddition` est inclus dans les instructions du développeur.
   - Les messages assemblés sont projetés dans le prompt avant la requête actuelle.
   - Codex appelle `afterTurn` après la mise en miroir de la transcription.
   - Sans `afterTurn`, Codex appelle `ingestBatch` ou `ingest` par message.
   - La maintenance de tour s'exécute après les tours réussis.
   - La maintenance de tour ne s'exécute pas en cas d'erreur de prompt, d'abandon ou d'abandon de cession.

2. `context-engine-projection.test.ts`
   - sortie stable pour des entrées identiques
   - pas de prompt actuel en double lorsque l'historique assemblé l'inclut
   - gère l'historique vide
   - préserve l'ordre des rôles
   - inclut l'ajout de l'invite système uniquement dans les instructions du développeur

3. `compact.context-engine.test.ts`
   - le résultat principal du moteur de contexte propriétaire l'emporte
   - l'état de compactage natif de Codex apparaît dans les détails lorsqu'il est également tenté
   - l'échec natif de Codex ne fait pas échouer le compactage du moteur de contexte propriétaire
   - le moteur de contexte non propriétaire préserve le comportement actuel de compactage natif

### Tests existants à mettre à jour

- `extensions/codex/src/app-server/run-attempt.test.ts` si présent, sinon
  tests d'exécution Codex app-server les plus proches.
- `extensions/codex/src/app-server/event-projector.test.ts` uniquement si les détails de l'événement
  de compactage changent.
- `src/agents/harness/selection.test.ts` ne devrait pas nécessiter de modifications sauf si le comportement
  de la configuration change ; il doit rester stable.
- Les tests du moteur de contexte PI doivent continuer à réussir sans modification.

### Tests d'intégration / en direct

Ajouter ou étendre les tests de fumaison du harnais Codex en direct :

- configure `plugins.slots.contextEngine` to a test engine
- configure `agents.defaults.model` to a `codex/*` model
- configure `agents.defaults.embeddedHarness.runtime = "codex"`
- assert test engine observed:
  - bootstrap
  - assemble
  - afterTurn or ingest
  - maintenance

Avoid requiring lossless-claw in OpenClaw core tests. Use a small in-repo fake
context engine plugin.

## Observability

Ajoutez des journaux de débogage autour des appels du cycle de vie du moteur de contexte Codex :

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` avec motif
- `codex native compaction completed alongside context-engine compaction`

Évitez de consigner les invites complètes ou le contenu des transcriptions.

Ajoutez des champs structurés lorsque cela est utile :

- `sessionId`
- `sessionKey` rédigé ou omis conformément aux pratiques de journalisation existantes
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## Migration / compatibilité

Cela devrait être rétrocompatible :

- Si aucun moteur de contexte n'est configuré, le comportement du moteur de contexte hérité doit être équivalent au comportement actuel du harnais Codex.
- Si le `assemble` du moteur de contexte échoue, Codex doit continuer avec le chemin d'invite d'origine.
- Les liaisons de thread Codex existantes doivent rester valides.
- L'empreinte dynamique des outils ne doit pas inclure la sortie du moteur de contexte ; sinon, chaque changement de contexte pourrait forcer la création d'un nouveau fil Codex. Seul le catalogue d'outils doit affecter l'empreinte dynamique des outils.

## Questions ouvertes

1. Le contexte assemblé doit-il être injecté entièrement dans l'invite utilisateur, entièrement dans les instructions du développeur, ou être partagé ?

   Recommandation : diviser. Placer `systemPromptAddition` dans les instructions du développeur ; placer le contexte de la transcription assemblée dans le wrapper de l'invite utilisateur. Cela correspond le mieux au protocole Codex actuel sans modifier l'historique des fils natifs.

2. La compaction native Codex doit-elle être désactivée lorsqu'un moteur de contexte possède la compaction ?

   Recommandation : non, pas initialement. La compaction native de Codex peut encore être
   nécessaire pour garder le thread du serveur d'application en vie. Mais elle doit être signalée comme
   une compaction native de Codex, et non comme une compaction du moteur de contexte.

3. Est-ce que `before_prompt_build` doit s'exécuter avant ou après l'assemblage du moteur de contexte ?

   Recommandation : après la projection du contexte-engine pour Codex, afin que les crochets génériques du harnais voient l'invite/instructions du développeur réelles que Codex recevra. Si la parité PI exige l'inverse, encodez l'ordre choisi dans les tests et documentez-le ici.

4. Le serveur d'application Codex peut-il accepter une future substitution structurée de contexte/historique ?

   Inconnu. Si c'est possible, remplacez la couche de projection de texte par ce protocole et gardez les appels de cycle de vie inchangés.

## Critères d'acceptation

- Un tour de `codex/*` harness intégré invoque le cycle de vie d'assemblage du moteur de contexte sélectionné.
- Un `systemPromptAddition` de moteur de contexte affecte les instructions développeur de Codex.
- Le contexte assemblé affecte l'entrée du tour Codex de manière déterministe.
- Les tours Codex réussis appellent `afterTurn` ou ingèrent le repli.
- Les tours Codex réussis exécutent la maintenance de tour du moteur de contexte.
- Les tours échoués/avortés/abandonnés-yield n'exécutent pas la maintenance de tour.
- La compactage appartenant au moteur de contexte reste principal pour l'état OpenClaw/du plugin.
- Le compactage natif Codex reste auditable en tant que comportement natif de Codex.
- Le comportement existant du moteur de contexte PI est inchangé.
- Le comportement existant du harnais Codex est inchangé lorsqu'aucun moteur de contexte non hérité n'est sélectionné ou lorsque l'assemblage échoue.
