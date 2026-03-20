---
summary: "Plan : isoler l'action navigateur act:evaluate de la file d'attente Playwright en utilisant CDP, avec des délais de bout en bout et une résolution de référence plus sûre"
read_when:
  - Travailler sur les problèmes de `act:evaluate` du navigateur, tels que le délai d'expiration, l'abandon ou le blocage de la file d'attente
  - Planification de l'isolement basé sur CDP pour l'exécution de l'évaluation
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP Refactor"
---

# Plan de refonte CDP de l'évaluation navigateur

## Contexte

`act:evaluate` exécute le JavaScript fourni par l'utilisateur dans la page. Aujourd'hui, il fonctionne via Playwright
(`page.evaluate` ou `locator.evaluate`). Playwright sérialise les commandes CDP par page, donc une
évaluation bloquée ou longue peut bloquer la file de commandes de la page et faire en sorte que chaque action ultérieure
sur cet onglet semble "bloquée".

La PR #13498 ajoute un filet de sécurité pragmatique (évaluation bornée, propagation de l'abandon et récupération
au mieux). Ce document décrit une refonte plus importante qui rend `act:evaluate` intrinsèquement
isolé de Playwright, afin qu'une évaluation bloquée ne puisse pas coincer les opérations normales de Playwright.

## Objectifs

- `act:evaluate` ne peut pas bloquer de manière permanente les actions ultérieures du navigateur sur le même onglet.
- Les délais d'expiration sont la source unique de vérité de bout en bout, afin qu'un appelant puisse s'appuyer sur un budget.
- L'abandon et le délai d'expiration sont traités de la même manière sur HTTP et pour la distribution en processus.
- Le ciblage d'éléments pour l'évaluation est pris en charge sans tout désactiver de Playwright.
- Maintenir la compatibilité descendante pour les appelants et les charges utiles existants.

## Non-objectifs

- Remplacer toutes les actions du navigateur (clic, saisie, attente, etc.) par des implémentations CDP.
- Supprimer le filet de sécurité existant introduit dans la PR #13498 (il reste un repli utile).
- Introduire de nouvelles capacités non sécurisées au-delà de la bascule `browser.evaluateEnabled` existante.
- Ajouter un isolement de processus (processus de travail/thread) pour l'évaluation. Si nous rencontrons encore des états bloqués difficiles à récupérer
  après cette refonte, c'est une idée de suivi.

## Architecture actuelle (pourquoi elle bloque)

À un haut niveau :

- Les appelants envoient `act:evaluate` au service de contrôle du navigateur.
- Le gestionnaire de route appelle Playwright pour exécuter le JavaScript.
- Playwright sérialise les commandes de page, donc une évaluation qui ne se termine jamais bloque la file d'attente.
- Une file d'attente bloquée signifie que les opérations ultérieures de clic/saisie/attente sur l'onglet peuvent sembler bloquées.

## Architecture proposée

### 1. Propagation de la deadline

Introduire un concept de budget unique et tout dériver de celui-ci :

- L'appelant définit `timeoutMs` (ou une deadline dans le futur).
- Le délai d'expiration de la requête externe, la logique du gestionnaire de route et le budget d'exécution dans la page utilisent tous le même budget, avec une petite marge de manœuvre où nécessaire pour la surcharge de sérialisation.
- L'annulation est propagée comme un `AbortSignal` partout pour que l'annulation soit cohérente.

Direction de mise en œuvre :

- Ajouter un petit assistant (par exemple `createBudget({ timeoutMs, signal })`) qui renvoie :
  - `signal` : l'AbortSignal lié
  - `deadlineAtMs` : deadline absolue
  - `remainingMs()` : budget restant pour les opérations enfants
- Utiliser cet assistant dans :
  - `src/browser/client-fetch.ts` (distribution HTTP et in-process)
  - `src/node-host/runner.ts` (chemin proxy)
  - implémentations d'actions de navigateur (Playwright et CDP)

### 2. Moteur d'évaluation séparé (chemin CDP)

Ajouter une implémentation d'évaluation basée sur CDP qui ne partage pas la file de commandes par page de Playwright. La propriété clé est que le transport d'évaluation est une connexion WebSocket distincte et une session CDP distincte attachée à la cible.

Direction de mise en œuvre :

- Nouveau module, par exemple `src/browser/cdp-evaluate.ts`, qui :
  - Se connecte au point de terminaison CDP configuré (socket au niveau du navigateur).
  - Utilise `Target.attachToTarget({ targetId, flatten: true })` pour obtenir un `sessionId`.
  - Exécute soit :
    - `Runtime.evaluate` pour l'évaluation au niveau de la page, ou
    - `DOM.resolveNode` plus `Runtime.callFunctionOn` pour l'évaluation d'élément.
  - En cas de délai d'expiration ou d'annulation :
    - Envoie `Runtime.terminateExecution` au mieux pour la session.
    - Ferme le WebSocket et renvoie une erreur claire.

Notes :

- Cela exécute toujours JavaScript dans la page, donc la résiliation peut avoir des effets secondaires. L'avantage est qu'il ne bloque pas la file Playwright, et qu'il est annulable au niveau de la couche de transport en tuant la session CDP.

### 3. Histoire de Ref (Ciblage d'élément sans réécriture complète)

La partie difficile est le ciblage d'élément. CDP a besoin d'un handle DOM ou `backendDOMNodeId`, alors qu'aujourd'hui la plupart des actions de navigateur utilisent les localisateurs Playwright basés sur les références des instantanés.

Approche recommandée : conserver les références existantes, mais attacher un id résolvable CDP optionnel.

#### 3.1 Étendre les informations de référence stockées

Étendre les métadonnées de référence de rôle stockées pour inclure facultativement un identifiant CDP :

- Aujourd'hui : `{ role, name, nth }`
- Proposé : `{ role, name, nth, backendDOMNodeId?: number }`

Cela permet à toutes les actions existantes basées sur Playwright de continuer à fonctionner et autorise l'évaluation CDP à accepter
la même valeur `ref` lorsque `backendDOMNodeId` est disponible.

#### 3.2 Remplir backendDOMNodeId au moment de l'instantané

Lors de la production d'un instantané de rôle :

1. Générer la carte de référence de rôle existante comme aujourd'hui (rôle, nom, nième).
2. Récupérer l'arbre AX via CDP (`Accessibility.getFullAXTree`) et calculer une carte parallèle de
   `(role, name, nth) -> backendDOMNodeId` en utilisant les mêmes règles de gestion des doublons.
3. Fusionner l'identifiant dans les informations de référence stockées pour l'onglet actuel.

Si le mappage échoue pour une référence, laisser `backendDOMNodeId` non défini. Cela rend la fonctionnalité
au mieux possible et sûre à déployer.

#### 3.3 Comportement de l'évaluation avec référence

Dans `act:evaluate` :

- Si `ref` est présent et possède `backendDOMNodeId`, exécuter l'évaluation d'élément via CDP.
- Si `ref` est présent mais n'a pas `backendDOMNodeId`, revenir au chemin Playwright (avec
  le filet de sécurité).

Échappatoire facultative :

- Étendre la forme de la demande pour accepter `backendDOMNodeId` directement pour les appelants avancés (et
  pour le débogage), tout en gardant `ref` comme interface principale.

### 4. Garder un chemin de récupération en dernier recours

Même avec l'évaluation CDP, il existe d'autres moyens de bloquer un onglet ou une connexion. Conserver les
mécanismes de récupération existants (terminer l'exécution + déconnecter Playwright) en dernier recours
pour :

- appelants hérités
- environnements où l'attachement CDP est bloqué
- cas limites Playwright inattendus

## Plan de mise en œuvre (itération unique)

### Livrables

- Un moteur d'évaluation basé sur CDP qui s'exécute en dehors de la file de commandes par page de Playwright.
- Un budget unique de délai d'expiration/d'abandon de bout en bout utilisé de manière cohérente par les appelants et les gestionnaires.
- Les métadonnées de référence peuvent éventuellement contenir `backendDOMNodeId` pour l'évaluation d'élément.
- `act:evaluate` préfère le moteur CDP lorsque cela est possible et revient à Playwright dans le cas contraire.
- Des tests prouvant qu'une évaluation bloquée ne bloque pas les actions ultérieures.
- Des journaux/métriques qui rendent les échecs et les replis visibles.

### Liste de vérification de l'implémentation

1. Ajouter un assistant partagé « budget » pour lier `timeoutMs` + en amont `AbortSignal` dans :
   - un seul `AbortSignal`
   - une date limite absolue
   - un assistant `remainingMs()` pour les opérations en aval
2. Mettre à jour tous les chemins d'appel pour utiliser cet assistant afin que `timeoutMs` signifie la même chose partout :
   - `src/browser/client-fetch.ts` (répartition HTTP et intra-processus)
   - `src/node-host/runner.ts` (chemin du proxy de nœud)
   - Wrappers CLI qui appellent `/act` (ajouter `--timeout-ms` à `browser evaluate`)
3. Implémenter `src/browser/cdp-evaluate.ts` :
   - se connecter au socket CDP au niveau du navigateur
   - `Target.attachToTarget` pour obtenir un `sessionId`
   - exécuter `Runtime.evaluate` pour l'évaluation de page
   - exécuter `DOM.resolveNode` + `Runtime.callFunctionOn` pour l'évaluation d'élément
   - en cas d'expiration/abandon : `Runtime.terminateExecution` de meilleur effort puis fermer le socket
4. Étendre les métadonnées de référence de rôle stockées pour inclure facultativement `backendDOMNodeId` :
   - conserver le comportement `{ role, name, nth }` existant pour les actions Playwright
   - ajouter `backendDOMNodeId?: number` pour le ciblage d'élément CDP
5. Remplir `backendDOMNodeId` lors de la création de l'instantané (de meilleur effort) :
   - récupérer l'arbre AX via CDP (`Accessibility.getFullAXTree`)
   - calculer `(role, name, nth) -> backendDOMNodeId` et fusionner dans la carte de référence stockée
   - si le mappage est ambigu ou manquant, laisser l'identifiant indéfini
6. Mettre à jour le routage `act:evaluate` :
   - s'il n'y a pas de `ref` : toujours utiliser l'évaluation CDP
   - si `ref` se résout en un `backendDOMNodeId` : utiliser l'évaluation d'élément CDP
   - sinon : revenir à l'évaluation Playwright (toujours délimitée et annulable)
7. Conserver le chemin de récupération de « dernier recours » existant comme solution de repli, et non comme chemin par défaut.
8. Ajouter des tests :
   - l'évaluation bloquée expire dans le budget et le clic/saisie suivant réussit
   - l'abandon annule l'évaluation (déconnexion du client ou expiration) et débloque les actions suivantes
   - les échecs de mappage reviennent proprement à Playwright
9. Ajouter une observabilité :
   - compteurs de durée et d'expiration de l'évaluation
   - utilisation de terminateExecution
   - taux de repli (CDP -> Playwright) et raisons

### Critères d'acceptation

- Un `act:evaluate` délibérément bloqué renvoie dans le délai de l'appelant et ne bloque pas
  l'onglet pour les actions ultérieures.
- `timeoutMs` se comporte de manière cohérente via CLI, agent tool, node proxy et les appels in-process.
- Si `ref` peut être mappé à `backendDOMNodeId`, l'évaluation d'élément utilise CDP ; sinon,
  le chemin de repli reste limité et récupérable.

## Plan de test

- Tests unitaires :
  - `(role, name, nth)` logique de correspondance entre les références de rôle et les nœuds de l'arbre AX.
  - Comportement de l'assistant de budget (marge, calcul du temps restant).
- Tests d'intégration :
  - Le délai d'évaluation CDP renvoie dans le budget et ne bloque pas l'action suivante.
  - L'annulation annule l'évaluation et déclenche la terminaison au mieux.
- Tests contractuels :
  - Assurer que `BrowserActRequest` et `BrowserActResponse` restent compatibles.

## Risques et atténuations

- Le mappage est imparfait :
  - Atténuation : mappage au mieux, repli sur l'évaluation Playwright, et ajout d'outils de débogage.
- `Runtime.terminateExecution` a des effets secondaires :
  - Atténuation : utiliser uniquement en cas de délai/abandon et documenter le comportement dans les erreurs.
- Surcharge supplémentaire :
  - Atténuation : récupérer l'arbre AX uniquement lorsque les instantanés sont demandés, mettre en cache par cible, et maintenir
    la session CDP de courte durée.
- Limitations du relais d'extension :
  - Atténuation : utiliser les API d'attachement au niveau du navigateur lorsque les sockets par page ne sont pas disponibles, et
    conserver le chemin Playwright actuel comme repli.

## Questions ouvertes

- Le nouveau moteur doit-il être configurable comme `playwright`, `cdp` ou `auto` ?
- Voulons-nous exposer un nouveau format "nodeRef" pour les utilisateurs avancés, ou garder uniquement `ref` ?
- Comment les instantanés de frame et les instantanés de portée de sélecteur doivent-ils participer au mappage AX ?

import en from "/components/footer/en.mdx";

<en />
