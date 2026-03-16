---
summary: "Statut et prochaines étapes pour le découplage des écouteurs de passerelle Discord des tours d'agent à longue exécution avec un worker entrant spécifique à Discord"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord Plan de Worker Entrant Asynchrone"
---

# Discord Plan de Worker Entrant Asynchrone

## Objectif

Supprimer le délai d'attente de l'écouteur Discord comme mode d'échec visible par l'utilisateur en rendant les tours entrants Discord asynchrones :

1. L'écouteur Gateway accepte et normalise rapidement les événements entrants.
2. Une file d'exécution Discord stocke les travaux sérialisés indexés par la même limite de commande que nous utilisons aujourd'hui.
3. Un worker exécute le tour d'agent réel en dehors de la durée de vie de l'écouteur Carbon.
4. Les réponses sont renvoyées au channel ou fil d'origine après l'exécution.

Il s'agit du correctif à long terme pour les exécutions Discord en file d'attente qui expirent au `channels.discord.eventQueue.listenerTimeout` alors que l'exécution de l'agent progresse toujours.

## Statut actuel

Ce plan est partiellement mis en œuvre.

Déjà fait :

- Le délai d'attente de l'écouteur Discord et le délai d'exécution Discord sont désormais des paramètres distincts.
- Les tours entrants Discord acceptés sont mis en file d'attente dans `src/discord/monitor/inbound-worker.ts`.
- Le worker possède désormais le tour à longue exécution au lieu de l'écouteur Carbon.
- La commande existante par itinéraire est préservée par la clé de file d'attente.
- Une couverture de régression de délai d'attente existe pour le chemin du worker Discord.

Ce que cela signifie en langage clair :

- le bug de délai d'attente en production est corrigé
- le tour à longue exécution ne meurt plus simplement parce que le budget de l'écouteur Discord expire
- l'architecture du worker n'est pas encore terminée

Ce qui manque encore :

- `DiscordInboundJob` est encore seulement partiellement normalisé et porte encore des références d'exécution en direct
- la sémantique des commandes (`stop`, `new`, `reset`, futurs contrôles de session) n'est pas encore totalement native au worker
- l'observabilité du worker et le statut de l'opérateur sont encore minimes
- il n'y a toujours pas de durabilité de redémarrage

## Pourquoi cela existe

Le comportement actuel lie le tour complet de l'agent à la durée de vie de l'écouteur :

- `src/discord/monitor/listeners.ts` applique le délai d'expiration et la limite d'abandon.
- `src/discord/monitor/message-handler.ts` maintient l'exécution en file d'attente à l'intérieur de cette limite.
- `src/discord/monitor/message-handler.process.ts` effectue le chargement des médias, le routage, la répartition, la frappe, la diffusion de brouillons et la livraison de la réponse finale en ligne.

Cette architecture a deux mauvaises propriétés :

- les tours longs mais sains peuvent être abandonnés par le chien de garde de l'écouteur
- les utilisateurs peuvent ne voir aucune réponse même lorsque le runtime en aval en aurait produit une

Augmenter le délai d'expiration aide mais ne change pas le mode d'échec.

## Non-objectifs

- Ne pas redessiner les canaux non-Discord lors de cette passe.
- Ne pas élargir ceci en un framework de worker générique pour tous les canaux lors de la première implémentation.
- Ne pas encore extraire une abstraction de worker entrant partagée entre canaux ; ne partager que les primitives de bas niveau lorsque la duplication est évidente.
- Ne pas ajouter de récupération durable après crash lors de la première passe, sauf si nécessaire pour atterrir en toute sécurité.
- Ne pas changer la sélection de route, la sémantique de liaison ou la stratégie ACP dans ce plan.

## Contraintes actuelles

Le chemin de traitement actuel de Discord dépend encore de certains objets runtime vivants qui ne devraient pas rester à l'intérieur de la charge utile de travail à long terme :

- Carbone `Client`
- formes d'événements brutes de Discord
- carte de l'historique de la guilde en mémoire
- rappels du gestionnaire de liaison de thread
- état de frappe et de flux de brouillon en direct

Nous avons déjà déplacé l'exécution sur une file d'attente de workers, mais la limite de normalisation est encore incomplète. Pour l'instant, le worker est « exécuté plus tard dans le même processus avec certains des mêmes objets vivants », et non une limite de travail entièrement basée sur les données.

## Architecture cible

### 1. Phase d'écoute

`DiscordMessageListener` reste le point d'entrée, mais son travail devient :

- exécuter les vérifications préalables et de stratégie
- normaliser l'entrée acceptée en un `DiscordInboundJob` sérialisable
- mettre la tâche en file d'attente dans une file d'attente asynchrone par session ou par channel
- renvoyer immédiatement à Carbon une fois la mise en file d'attente réussie

L'écouteur ne doit plus gérer la durée de vie de bout en bout du tour LLM.

### 2. Payload de tâche normalisé

Introduire un descripteur de tâche sérialisable qui contient uniquement les données nécessaires pour exécuter le tour plus tard.

Forme minimale :

- identité de l'itinéraire
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- identité de livraison
  - identifiant du channel de destination
  - identifiant du message cible de la réponse
  - identifiant du fil de discussion s'il est présent
- identité de l'expéditeur
  - identifiant, libellé, nom d'utilisateur, tag de l'expéditeur
- contexte du channel
  - identifiant de guilde
  - nom ou slug du channel
  - métadonnées du fil de discussion
  - remplacement du prompt système résolu
- corps de message normalisé
  - texte de base
  - texte de message effectif
  - descripteurs de pièce jointe ou références média résolues
- décisions de filtrage
  - résultat de l'exigence de mention
  - résultat de l'autorisation de commande
  - métadonnées de session ou d'agent liées le cas échéant

Le payload de la tâche ne doit pas contenir d'objets Carbon en direct ou de fermetures mutables.

Statut actuel de la mise en œuvre :

- partiellement terminé
- `src/discord/monitor/inbound-job.ts` existe et définit le transfert au worker
- le payload contient toujours le contexte d'exécution Discord en direct et devrait être réduit davantage

### 3. Étape du Worker

Ajouter un runner de worker spécifique à Discord responsable de :

- reconstituer le contexte du tour à partir de `DiscordInboundJob`
- charger les médias et toutes les métadonnées de channel supplémentaires nécessaires pour l'exécution
- répartir le tour de l'agent
- livrer les payloads de réponse finaux
- mettre à jour le statut et les diagnostics

Emplacement recommandé :

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. Modèle de commande

La commande doit rester équivalente à celle d'aujourd'hui pour une limite d'itinéraire donnée.

Clé recommandée :

- utiliser la même logique de clé de file d'attente que `resolveDiscordRunQueueKey(...)`

Cela préserve le comportement existant :

- une conversation d'agent lié ne s'entrelace pas avec elle-même
- différents canaux Discord peuvent toujours progresser indépendamment

### 5. Modèle de délai d'attente

Après le basculement, il existe deux classes distinctes de délais d'attente :

- délai d'attente de l'écouteur
  - couvre uniquement la normalisation et la mise en file d'attente
  - doit être court
- délai d'exécution
  - optionnel, détenu par le worker, explicite et visible par l'utilisateur
  - ne doit pas être hérité accidentellement des paramètres de l'écouteur Carbon

Cela supprime le couplage accidentel actuel entre « l'écouteur de passerelle Discord est resté en vie » et « l'exécution de l'agent est saine ».

## Phases d'implémentation recommandées

### Phase 1 : limite de normalisation

- Statut : partiellement implémenté
- Terminé :
  - extrait `buildDiscordInboundJob(...)`
  - ajouté des tests de transfert de worker
- Restant :
  - rendre `DiscordInboundJob` des données simples uniquement
  - déplacer les dépendances d'exécution en direct vers des services détenus par le worker au lieu de la charge utile par travail
  - arrêter de reconstruire le contexte du processus en raboutant les références d'écouteur en direct dans le travail

### Phase 2 : file d'attente de worker en mémoire

- Statut : implémenté
- Terminé :
  - ajouté `DiscordInboundWorkerQueue` indexé par la clé de file d'attente d'exécution résolue
  - l'écouteur met en file d'attente les travaux au lieu d'attendre directement `processDiscordMessage(...)`
  - le worker exécute les travaux en cours de processus, en mémoire uniquement

C'est le premier basculement fonctionnel.

### Phase 3 : séparation des processus

- Statut : non démarré
- Déplacer la propriété de la livraison, de la frappe et du streaming de brouillons derrière des adaptateurs orientés worker.
- Remplacer l'utilisation directe du contexte de pré-vol en direct par la reconstruction du contexte worker.
- Conserver `processDiscordMessage(...)` temporairement comme une façade si nécessaire, puis le diviser.

### Phase 4 : sémantique de commande

- Statut : non démarré
  Assurez-vous que les commandes natives Discord se comportent toujours correctement lorsque le travail est en file d'attente :

- `stop`
- `new`
- `reset`
- toutes futures commandes de contrôle de session

La file d'attente du worker doit exposer suffisamment d'état d'exécution pour que les commandes ciblent le tour actif ou en file d'attente.

### Phase 5 : observabilité et expérience opérateur

- Statut : non démarré
- émettre la profondeur de la file d'attente et les comptes de workers actifs dans le statut du moniteur
- enregistrer l'heure de mise en file, l'heure de début, l'heure de fin, ainsi que le motif de l'expiration ou de l'annulation
- mettre en évidence clairement les expirations ou les échecs de livraison propriétaires du worker dans les journaux

### Phase 6 : suivi de durabilité optionnel

- État : non démarré
  Uniquement après la stabilisation de la version en mémoire :

- décider si les tâches Discord en file d'attente doivent survivre au redémarrage de la passerelle
- si oui, rendre persistants les descripteurs de tâches et les points de contrôle de livraison
- si non, documenter explicitement la limite en mémoire

Cela devrait faire l'objet d'un suivi distinct, sauf si la récupération après redémarrage est nécessaire à l'intégration.

## Impact sur les fichiers

Fichiers principaux actuels :

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

Fichiers worker actuels :

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

Prochains points de contact probables :

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## Prochaine étape maintenant

La prochaine étape consiste à rendre la frontière du worker réelle plutôt que partielle.

Faites cela ensuite :

1. Déplacer les dépendances d'exécution en direct hors de `DiscordInboundJob`
2. Conserver ces dépendances sur l'instance du worker Discord à la place
3. Réduire les tâches en file d'attente à des données propres à Discord :
   - identité de route
   - cible de livraison
   - infos expéditeur
   - instantané du message normalisé
   - décisions de verrouillage et de liaison
4. Reconstruire le contexte d'exécution du worker à partir de ces données brutes à l'intérieur du worker

En pratique, cela signifie :

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- autres gestionnaires mutables exclusivement à l'exécution

ne devraient plus exister sur chaque tâche en file d'attente et devraient plutôt exister sur le worker lui-même ou derrière des adaptateurs appartenant au worker.

Une fois cela intégré, le suivi suivant devrait être le nettoyage de l'état de commande pour `stop`, `new` et `reset`.

## Plan de test

Conserver la couverture de reproductibilité de l'expiration existante dans :

- `src/discord/monitor/message-handler.queue.test.ts`

Ajouter de nouveaux tests pour :

1. le listener retourne après la mise en file d'attente sans attendre le tour complet
2. l'ordre par route est préservé
3. les différents canaux s'exécutent toujours simultanément
4. les réponses sont livrées à la destination du message d'origine
5. `stop` annule l'exécution active détenue par le worker
6. l'échec du worker produit des diagnostics visibles sans bloquer les tâches ultérieures
7. les canaux Discord liés à l'ACP sont toujours routés correctement lors de l'exécution par le worker

## Risques et atténuations

- Risque : la sémantique des commandes dérive par rapport au comportement synchrone actuel
  Atténuation : intégrer le câblage de l'état des commandes lors de la même bascule, et non plus tard

- Risque : la livraison des réponses perd le contexte du fil ou de la réponse à
  Atténuation : rendre l'identité de livraison de première classe dans `DiscordInboundJob`

- Risque : envois en double lors des nouvelles tentatives ou des redémarrages de la file d'attente
  Atténuation : garder la première passe uniquement en mémoire, ou ajouter une idempotence de livraison explicite avant la persistance

- Risque : `message-handler.process.ts` devient plus difficile à raisonner pendant la migration
  Atténuation : diviser en assistants de normalisation, d'exécution et de livraison avant ou pendant la bascule du worker

## Critères d'acceptation

Le plan est complet lorsque :

1. Le délai d'attente du listener Discord n'interrompt plus les tours longs et sains.
2. La durée de vie du listener et celle du tour de l'agent sont des concepts distincts dans le code.
3. L'ordre existant par session est préservé.
4. Les canaux Discord liés à l'ACP fonctionnent via le même chemin de worker.
5. `stop` cible l'exécution détenue par le worker au lieu de l'ancienne pile d'appels détenue par le listener.
6. Les délais d'attente et les échecs de livraison deviennent des résultats explicites du worker, et non des abandons silencieux du listener.

## Stratégie de livraison restante

Terminer cela dans les PRs suivantes :

1. rendre `DiscordInboundJob` uniquement des données simples et déplacer les références d'exécution en direct vers le worker
2. nettoyer la propriété de l'état des commandes pour `stop`, `new` et `reset`
3. ajouter l'observabilité du worker et le statut de l'opérateur
4. décider si la durabilité est nécessaire ou documenter explicitement la limite en mémoire

Il s'agit toujours d'un suivi délimité s'il est réservé à Discord et si nous continuons à éviter une abstraction prématurée de worker inter-canal.

import fr from "/components/footer/fr.mdx";

<fr />
