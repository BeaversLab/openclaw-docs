---
summary: "Plan: isoler l'action du navigateur act:evaluate de la file d'attente Playwright via CDP, avec des délais de bout en bout et une résolution de référence plus sûre"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "brouillon"
last_updated: "2026-02-10"
title: "Refactorisation CDP de l'évaluation navigateur"
---

# Plan de refactorisation CDP de l'évaluation navigateur

## Contexte

`act:evaluate` exécute le JavaScript fourni par l'utilisateur dans la page. Aujourd'hui, il s'exécute via Playwright
(`page.evaluate` ou `locator.evaluate`). Playwright sérialise les commandes CDP par page, donc une
evaluation bloquée ou longue peut bloquer la file de commandes de la page et faire en sorte que chaque action ultérieure
sur cet onglet semble "bloquée".

La PR #13498 ajoute un filet de sécurité pragmatique (évaluation bornée, propagation de l'abandon et récupération
au mieux). Ce document décrit une refactorisation plus importante qui rend `act:evaluate` intrinsèquement
isolé de Playwright, afin qu'une évaluation bloquée ne puisse pas coincer les opérations normales de Playwright.

## Objectifs

- `act:evaluate` ne peut pas bloquer de manière permanente les actions ultérieures du navigateur sur le même onglet.
- Les délais d'attente sont la source unique de vérité de bout en bout, afin qu'un appelant puisse se fier à un budget.
- L'abandon et le délai d'attente sont traités de la même manière sur HTTP et pour la répartition intra-processus.
- Le ciblage d'éléments pour l'évaluation est pris en charge sans tout basculer hors de Playwright.
- Maintenir la compatibilité descendante pour les appelants et les charges utiles existants.

## Non-objectifs

- Remplacer toutes les actions du navigateur (clic, saisie, attente, etc.) par des implémentations CDP.
- Supprimer le filet de sécurité existant introduit dans la PR #13498 (il reste un repli utile).
- Introduire de nouvelles capacités non sécurisées au-delà de la porte `browser.evaluateEnabled` existante.
- Ajouter une isolation de processus (processus de travail/thread) pour l'évaluation. Si nous rencontrons toujours des états bloqués
  difficiles à récupérer après cette refactorisation, c'est une idée de suivi.

## Architecture actuelle (Pourquoi elle se bloque)

À un niveau élevé :

- Les appelants envoient `act:evaluate` au service de contrôle du navigateur.
- Le gestionnaire de route appelle Playwright pour exécuter le JavaScript.
- Playwright sérialise les commandes de page, donc une évaluation qui ne se termine jamais bloque la file d'attente.
- Une file d'attente bloquée signifie que les opérations ultérieures de clic/saisie/attente sur l'onglet peuvent sembler figées.

## Architecture proposée

### 1. Propagation du délai (Deadline)

Introduire un concept unique de budget et tout dériver de celui-ci :

- L'appelant définit `timeoutMs` (ou un délai dans le futur).
- Le délai d'expiration de la requête externe, la logique du gestionnaire de route et le budget d'exécution dans la page
  utilisent tous le même budget, avec une petite marge là où c'est nécessaire pour la surcharge de sérialisation.
- L'annulation est propagée sous forme de `AbortSignal` partout pour que l'annulation soit cohérente.

Direction de mise en œuvre :

- Ajouter un petit assistant (par exemple `createBudget({ timeoutMs, signal })`) qui renvoie :
  - `signal` : le AbortSignal lié
  - `deadlineAtMs` : délai absolu
  - `remainingMs()` : budget restant pour les opérations enfants
- Utiliser cet assistant dans :
  - `src/browser/client-fetch.ts` (distribution HTTP et en processus)
  - `src/node-host/runner.ts` (chemin proxy)
  - implémentations d'actions de navigateur (Playwright et CDP)

### 2. Moteur d'évaluation séparé (Chemin CDP)

Ajouter une implémentation d'évaluation basée sur CDP qui ne partage pas la file d'attente de commandes par page de Playwright. La propriété clé est que le transport d'évaluation est une connexion WebSocket distincte
et une session CDP distincte attachée à la cible.

Direction de mise en œuvre :

- Nouveau module, par exemple `src/browser/cdp-evaluate.ts`, qui :
  - Se connecte au point de terminaison CDP configuré (socket au niveau du navigateur).
  - Utilise `Target.attachToTarget({ targetId, flatten: true })` pour obtenir un `sessionId`.
  - Exécute soit :
    - `Runtime.evaluate` pour une évaluation au niveau de la page, ou
    - `DOM.resolveNode` plus `Runtime.callFunctionOn` pour l'évaluation d'élément.
  - En cas de délai d'expiration ou d'annulation :
    - Envoie `Runtime.terminateExecution` au mieux (best-effort) pour la session.
    - Ferme le WebSocket et renvoie une erreur claire.

Notes :

- Cela exécute toujours du JavaScript dans la page, donc la résiliation peut avoir des effets secondaires. L'avantage
  est que cela ne bloque pas la file d'attente Playwright, et qu'elle est annulable au niveau de la couche de transport
  en tuant la session CDP.

### 3. Histoire de référence (Ciblage d'élément sans réécriture complète)

La partie difficile est le ciblage des éléments. CDP a besoin d'un gestionnaire DOM ou de `backendDOMNodeId`, alors
qu'aujourd'hui la plupart des actions du navigateur utilisent les localisateurs Playwright basés sur les références des instantanés.

Approche recommandée : conserver les références existantes, mais attacher un ID résolvable CDP optionnel.

#### 3.1 Étendre les informations de référence stockées

Étendre les métadonnées de référence de rôle stockées pour inclure optionnellement un ID CDP :

- Aujourd'hui : `{ role, name, nth }`
- Proposé : `{ role, name, nth, backendDOMNodeId?: number }`

Cela permet à toutes les actions existantes basées sur Playwright de continuer à fonctionner et permet à l'évaluation CDP d'accepter
la même valeur `ref` lorsque le `backendDOMNodeId` est disponible.

#### 3.2 Remplir backendDOMNodeId au moment de l'instantané

Lors de la production d'un instantané de rôle :

1. Générer la carte de référence de rôle existante comme aujourd'hui (rôle, nom, nième).
2. Récupérer l'arbre AX via CDP (`Accessibility.getFullAXTree`) et calculer une carte parallèle de
   `(role, name, nth) -> backendDOMNodeId` en utilisant les mêmes règles de gestion des doublons.
3. Fusionner l'ID dans les informations de référence stockées pour l'onglet actuel.

Si le mappage échoue pour une référence, laisser le `backendDOMNodeId` indéfini. Cela rend la fonctionnalité
au mieux (best-effort) et sûre à déployer.

#### 3.3 Comportement de l'évaluation avec référence

Dans `act:evaluate` :

- Si `ref` est présent et possède `backendDOMNodeId`, exécuter l'évaluation d'élément via CDP.
- Si `ref` est présent mais n'a pas de `backendDOMNodeId`, revenir au chemin Playwright (avec
  le filet de sécurité).

Échappatoire optionnelle :

- Étendre la structure de la demande pour accepter `backendDOMNodeId` directement pour les appelants avancés (et
  pour le débogage), tout en conservant `ref` comme interface principale.

### 4. Conserver un chemin de récupération de dernier recours

Même avec l'évaluation CDP, il existe d'autres moyens de bloquer un onglet ou une connexion. Conservez les
mécanismes de récupération existants (terminer l'exécution + déconnecter Playwright) en dernier recours
pour :

- appelants existants
- environnements où la connexion CDP est bloquée
- cas limites inattendus de Playwright

## Plan de mise en œuvre (itération unique)

### Livrables

- Un moteur d'évaluation basé sur CDP qui s'exécute en dehors de la file de commandes par page de Playwright.
- Un budget unique d'expiration/d'abandon de bout en bout utilisé de manière cohérente par les appelants et les gestionnaires.
- Les métadonnées de référence pouvant éventuellement contenir `backendDOMNodeId` pour l'évaluation d'élément.
- `act:evaluate` préfère le moteur CDP lorsque cela est possible et revient à Playwright dans le cas contraire.
- Des tests prouvant qu'une évaluation bloquée ne bloque pas les actions ultérieures.
- Des journaux/métriques qui rendent les échecs et les replis visibles.

### Liste de contrôle de mise en œuvre

1. Ajouter un assistant "budget" partagé pour lier `timeoutMs` + en amont `AbortSignal` dans :
   - un seul `AbortSignal`
   - une date limite absolue
   - un assistant `remainingMs()` pour les opérations en aval
2. Mettre à jour tous les chemins d'appel pour utiliser cet assistant afin que `timeoutMs` signifie la même chose partout :
   - `src/browser/client-fetch.ts` (répartition HTTP et in-process)
   - `src/node-host/runner.ts` (chemin du proxy de nœud)
   - Les wrappers CLI qui appellent `/act` (ajouter `--timeout-ms` à `browser evaluate`)
3. Implémenter `src/browser/cdp-evaluate.ts` :
   - se connecter au socket CDP au niveau du navigateur
   - `Target.attachToTarget` pour obtenir un `sessionId`
   - exécuter `Runtime.evaluate` pour l'évaluation de page
   - exécuter `DOM.resolveNode` + `Runtime.callFunctionOn` pour l'évaluation d'élément
   - en cas d'expiration/d'abandon : `Runtime.terminateExecution` de meilleur effort, puis fermer le socket
4. Étendre les métadonnées de référence de rôle stockées pour inclure facultativement `backendDOMNodeId` :
   - conserver le comportement `{ role, name, nth }` existant pour les actions Playwright
   - ajouter `backendDOMNodeId?: number` pour le ciblage d'éléments CDP
5. Remplir `backendDOMNodeId` lors de la création du snapshot (de meilleur effort) :
   - récupérer l'arbre AX via CDP (`Accessibility.getFullAXTree`)
   - calculer `(role, name, nth) -> backendDOMNodeId` et fusionner dans la carte de référence stockée
   - si le mappage est ambigu ou manquant, laisser l'identifiant non défini
6. Mettre à jour le routage `act:evaluate` :
   - s'il n'y a pas de `ref` : toujours utiliser l'évaluation CDP
   - si `ref` résout vers un `backendDOMNodeId` : utiliser l'évaluation d'élément CDP
   - sinon : revenir à l'évaluation Playwright (toujours bornée et annulable)
7. Conserver le chemin de récupération « dernier recours » existant comme solution de repli, pas comme chemin par défaut.
8. Ajouter des tests :
   - une évaluation bloquée expire dans le budget et le clic/frappe suivant réussit
   - l'abandon annule l'évaluation (déconnexion du client ou expiration) et débloque les actions ultérieures
   - les échecs de mappage reviennent proprement à Playwright
9. Ajouter l'observabilité :
   - compteurs de durée et d'expiration de l'évaluation
   - utilisation de terminateExecution
   - taux de repli (CDP -> Playwright) et raisons

### Critères d'acceptation

- Un `act:evaluate` délibérément bloqué revient dans le budget de l'appelant et ne bloque pas l'onglet pour les actions ultérieures.
- `timeoutMs` se comporte de manière cohérente sur le CLI, l'agent tool, le node proxy et les appels in-process.
- Si `ref` peut être mappé à `backendDOMNodeId`, l'évaluation d'élément utilise CDP ; sinon le chemin de repli reste borné et récupérable.

## Plan de test

- Tests unitaires :
  - Logique de correspondance `(role, name, nth)` entre les références de rôle et les nœuds de l'arbre AX.
  - Comportement de l'assistant de budget (marge de manœuvre, calcul du temps restant).
- Tests d'intégration :
  - Le délai d'attente de l'évaluation CDP retourne dans les limites du budget et ne bloque pas l'action suivante.
  - L'abandon annule l'évaluation et déclenche la terminaison au mieux.
- Tests contractuels :
  - Assurer que `BrowserActRequest` et `BrowserActResponse` restent compatibles.

## Risques et atténuations

- Le mappage est imparfait :
  - Atténuation : mappage au mieux, retour à l'évaluation Playwright, et ajout d'outils de débogage.
- `Runtime.terminateExecution` a des effets secondaires :
  - Atténuation : utiliser uniquement lors d'un délai d'attente ou d'un abandon et documenter le comportement dans les erreurs.
- Surcharge supplémentaire :
  - Atténuation : récupérer l'arbre AX uniquement lorsque les instantanés sont demandés, mettre en cache par cible, et garder
    la session CDP de courte durée.
- Limitations du relais d'extension :
  - Atténuation : utiliser les API d'attachement au niveau du navigateur lorsque les sockets par page ne sont pas disponibles, et
    conserver le chemin actuel de Playwright en secours.

## Questions ouvertes

- Le nouveau moteur doit-il être configurable comme `playwright`, `cdp` ou `auto` ?
- Voulons-nous exposer un nouveau format « nodeRef » pour les utilisateurs avancés, ou garder uniquement `ref` ?
- Comment les instantanés de frame et les instantanés délimités par sélecteur doivent-ils participer au mappage AX ?
