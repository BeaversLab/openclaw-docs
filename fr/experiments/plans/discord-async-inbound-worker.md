---
summary: "État et prochaines étapes pour découpler les écouteurs de passerelle Discord des tours d'agent longs avec un worker d'entrée spécifique à Discord"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Plan de worker d'entrée asynchrone Discord"
---

# Plan de worker d'entrée asynchrone Discord

## Objectif

Supprimer le délai d'attente de l'écouteur Discord comme mode d'échec pour l'utilisateur en rendant les tours d'entrée Discord asynchrones :

1. L'écouteur Gateway accepte et normalise rapidement les événements entrants.
2. Une file d'exécution Discord stocke les travaux sérialisés indexés par la même limite de classement que nous utilisons aujourd'hui.
3. Un worker exécute le tour d'agent réel en dehors de la durée de vie de l'écouteur Carbon.
4. Les réponses sont renvoyées au channel ou au fil d'origine une fois l'exécution terminée.

Il s'agit du correctif à long terme pour les exécutions Discord mises en file d'attente qui expirent à `channels.discord.eventQueue.listenerTimeout` alors que l'exécution de l'agent est toujours en cours.

## État actuel

Ce plan est partiellement mis en œuvre.

Déjà fait :

- Le délai d'attente de l'écouteur Discord et le délai d'attente d'exécution Discord sont désormais des paramètres distincts.
- Les tours d'entrée Discord acceptés sont mis en file d'attente dans `src/discord/monitor/inbound-worker.ts`.
- Le worker possède désormais le tour long au lieu de l'écouteur Carbon.
- Le classement existant par itinéraire est préservé par la clé de file d'attente.
- Une couverture de régression pour le délai d'attente existe pour le chemin du worker Discord.

Ce que cela signifie en langage clair :

- le bug de délai d'attente en production est corrigé
- le tour long ne meurt plus simplement parce que le budget de l'écouteur Discord expire
- l'architecture du worker n'est pas encore terminée

Ce qui manque encore :

- `DiscordInboundJob` est encore seulement partiellement normalisé et transporte encore des références d'exécution en direct
- la sémantique des commandes (`stop`, `new`, `reset`, futurs contrôles de session) n'est pas encore entièrement native au worker
- l'observabilité du worker et le statut de l'opérateur sont encore minimes
- il n'y a toujours pas de durabilité de redémarrage

## Pourquoi cela existe

Le comportement actuel lie le tour complet de l'agent à la durée de vie de l'écouteur :

- `src/discord/monitor/listeners.ts` applique le délai d'attente et la limite d'abandon.
- `src/discord/monitor/message-handler.ts` maintient l'exécution en file d'attente à l'intérieur de cette limite.
- `src/discord/monitor/message-handler.process.ts` effectue le chargement des médias, le routage, la distribution, la frappe, la diffusion de brouillons et la livraison de la réponse finale en ligne.

Cette architecture présente deux propriétés indésirables :

- les tours longs mais sains peuvent être interrompus par le chien de garde de l'écouteur
- les utilisateurs peuvent ne voir aucune réponse même lorsque le runtime en aval en aurait produit une

Augmenter le délai d'attente aide mais ne change pas le mode d'échec.

## Hors périmètre

- Ne redessinez pas les canaux non Discord dans cette phase.
- N'élargissez pas ceci à un framework de worker générique pour tous les canaux lors de la première implémentation.
- N'extrayez pas encore une abstraction de worker entrante partagée multi-canal ; ne partagez que les primitives de bas niveau lorsque la duplication est évidente.
- N'ajoutez pas de récupération robuste après crash lors de la première phase, sauf si nécessaire pour atterrir en toute sécurité.
- Ne modifiez pas la sélection de route, la sémantique de liaison ou la politique ACP dans ce plan.

## Contraintes actuelles

Le chemin de traitement Discord actuel dépend encore de certains objets runtime actifs qui ne devraient pas rester dans la charge utile de travail à long terme :

- Carbone `Client`
- formes d'événement brutes Discord
- carte de l'historique de la guilde en mémoire
- rappels du gestionnaire de liaison de fil
- état de frappe et de flux de brouillon en direct

Nous avons déjà déplacé l'exécution sur une file d'attente de workers, mais la frontière de normalisation est encore incomplète. Pour l'instant, le worker est « exécuté plus tard dans le même processus avec certains des mêmes objets actifs », et non une frontière de travail entièrement basée sur les données.

## Architecture cible

### 1. Phase d'écoute

`DiscordMessageListener` reste le point d'entrée, mais son travail devient :

- exécuter les vérifications préalables et de politique
- normaliser l'entrée acceptée en un `DiscordInboundJob` sérialisable
- mettre le travail en file d'attente dans une file asynchrone par session ou par canal
- retourner immédiatement à Carbon une fois la mise en file réussie

L'écouteur ne doit plus être propriétaire de la durée de vie du tour LLM de bout en bout.

### 2. Charge utile de travail normalisée

Introduisez un descripteur de travail sérialisable qui ne contient que les données nécessaires pour exécuter le tour plus tard.

Forme minimale :

- identité de la route
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- identité de livraison
  - id du canal de destination
  - id du message cible de réponse
  - id du fil si présent
- identité de l'expéditeur
  - id de l'expéditeur, label, nom d'utilisateur, tag
- contexte du canal
  - id de la guilde
  - nom ou slug du canal
  - métadonnées du thread
  - remplacement du système de prompt résolu
- corps de message normalisé
  - texte de base
  - texte de message effectif
  - descripteurs de pièce jointe ou références média résolues
- décisions de filtrage
  - résultat de l'exigence de mention
  - résultat de l'autorisation de commande
  - métadonnées de session ou d'agent liées, si applicable

La charge utile de la tâche ne doit pas contenir d'objets Carbon actifs ou de fermetures mutables.

Statut actuel de la mise en œuvre :

- partiellement fait
- `src/discord/monitor/inbound-job.ts` existe et définit le transfert vers le worker
- la charge utile contient toujours le contexte d'exécution Discord actif et doit être réduite davantage

### 3. Étape du worker

Ajouter un exécuteur de worker spécifique à Discord responsable de :

- reconstruire le contexte du tour à partir de `DiscordInboundJob`
- chargement des médias et de toute métadonnée de canal supplémentaire nécessaire pour l'exécution
- répartition du tour d'agent
- livraison des charges utiles de réponse finales
- mise à jour du statut et des diagnostics

Emplacement recommandé :

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. Modèle de classement

Le classement doit rester équivalent à celui d'aujourd'hui pour une limite de route donnée.

Clé recommandée :

- utiliser la même logique de clé de file que `resolveDiscordRunQueueKey(...)`

Cela préserve le comportement existant :

- une conversation d'agent liée ne s'entrelace pas avec elle-même
- différents canaux Discord peuvent toujours progresser indépendamment

### 5. Modèle d'expiration

Après le basculement, il existe deux classes d'expiration distinctes :

- expiration de l'écouteur
  - couvre uniquement la normalisation et la mise en file
  - doit être court
- expiration d'exécution
  - optionnel, propriétaire du worker, explicite et visible par l'utilisateur
  - ne doit pas être hérité accidentellement des paramètres de l'écouteur Carbon

Cela supprime le couplage accidentel actuel entre "l'écouteur de passerelle Discord est resté en vie" et "l'exécution de l'agent est saine".

## Phases de mise en œuvre recommandées

### Phase 1 : limite de normalisation

- Statut : partiellement implémenté
- Fait :
  - extrait `buildDiscordInboundJob(...)`
  - ajouté des tests de transfert vers le worker
- Restant :
  - rendre `DiscordInboundJob` données brutes uniquement
  - déplacer les dépendances d'exécution actives vers des services détenus par le worker au lieu de la charge utile par tâche
  - arrêter de reconstruire le contexte de processus en rattachant des références d'écouteur actives à la tâche

### Phase 2 : file d'attente de worker en mémoire

- Statut : implémenté
- Fait :
  - ajouté `DiscordInboundWorkerQueue` indexé par la clé de file d'exécution résolue
  - l'écouteur met les tâches en file d'attente au lieu d'attendre directement `processDiscordMessage(...)`
  - le worker exécute les tâches en cours de processus, en mémoire uniquement

C'est la première transition fonctionnelle.

### Phase 3 : séparation des processus

- Statut : non démarré
- Déplacez la propriété de la livraison, de la frappe et du streaming de brouillons derrière des adaptateurs orientés worker.
- Remplacez l'utilisation directe du contexte de pré-vol en direct par la reconstruction du contexte worker.
- Conservez `processDiscordMessage(...)` temporairement comme une façade si nécessaire, puis séparez-le.

### Phase 4 : sémantique de commande

- Statut : non démarré
  Assurez-vous que les commandes natives Discord se comportent toujours correctement lorsque le travail est en file d'attente :

- `stop`
- `new`
- `reset`
- toutes futures commandes de contrôle de session

La file d'attente des workers doit exposer suffisamment d'état d'exécution pour que les commandes puissent cibler le tour actif ou mis en file d'attente.

### Phase 5 : observabilité et expérience opérateur

- Statut : non démarré
- émettre la profondeur de la file d'attente et le nombre de workers actifs dans le statut du moniteur
- enregistrer l'heure de mise en file d'attente, l'heure de début, l'heure de fin, ainsi que le motif d'expiration ou d'annulation
- faire apparaître clairement les délais d'expiration ou les échecs de livraison dont le worker est responsable dans les journaux

### Phase 6 : suivi optionnel de durabilité

- Statut : non démarré
  Uniquement après la stabilisation de la version en mémoire :

- décider si les tâches Discord en file d'attente doivent survivre au redémarrage de la passerelle
- si oui, conserver les descripteurs de tâches et les points de contrôle de livraison
- si non, documenter explicitement la limite en mémoire

Cela devrait faire l'objet d'un suivi distinct, sauf si la récupération après redémarrage est nécessaire pour le déploiement.

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

La prochaine étape consiste à rendre la limite du worker réelle au lieu de partielle.

Faites cela ensuite :

1. Déplacez les dépendances d'exécution en direct hors de `DiscordInboundJob`
2. Conservez plutôt ces dépendances sur l'instance de worker Discord
3. Réduire les tâches en file d'attente à des données simples spécifiques à Discord :
   - identité de routage
   - cible de livraison
   - infos de l'expéditeur
   - instantané du message normalisé
   - décisions de gating et de binding
4. Reconstruire le contexte d'exécution du worker à partir de ces données simples à l'intérieur du worker

En pratique, cela signifie :

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- autres handles mutables uniquement au moment de l'exécution

devrait cesser d'exister sur chaque tâche en file d'attente et vivre à la place sur le worker lui-même ou derrière des adaptateurs détenus par le worker.

Une fois cela en place, la prochaine étape devrait être le nettoyage de l'état des commandes pour `stop`, `new` et `reset`.

## Plan de test

Conserver la couverture de reproductibilité du délai d'attente existante dans :

- `src/discord/monitor/message-handler.queue.test.ts`

Ajouter de nouveaux tests pour :

1. le listener retourne après la mise en file d'attente sans attendre la fin du tour complet
2. l'ordre par route est préservé
3. différents canaux s'exécutent toujours simultanément
4. les réponses sont livrées à la destination du message d'origine
5. `stop` annule l'exécution active détenue par le worker
6. l'échec du worker produit des diagnostics visibles sans bloquer les tâches ultérieures
7. les canaux Discord liés à l'ACP sont toujours routés correctement sous l'exécution du worker

## Risques et atténuations

- Risque : la sémantique des commandes dérive par rapport au comportement synchrone actuel
  Atténuation : intégrer le plomberie de l'état des commandes dans la même bascule, et non plus tard

- Risque : la livraison des réponses perd le contexte du fil de discussion ou de réponse à
  Atténuation : rendre l'identité de livraison de première classe dans `DiscordInboundJob`

- Risque : envois en double lors des nouvelles tentatives ou des redémarrages de la file d'attente
  Atténuation : garder la première passe uniquement en mémoire, ou ajouter une idempotence de livraison explicite avant la persistance

- Risque : `message-handler.process.ts` devient plus difficile à raisonner pendant la migration
  Atténuation : diviser en assistants de normalisation, d'exécution et de livraison avant ou pendant la bascule du worker

## Critères d'acceptation

Le plan est complet quand :

1. Le délai d'attente du listener Discord n'interrompt plus les tours longs en cours sains.
2. La durée de vie du listener et la durée de vie du tour de l'agent sont des concepts distincts dans le code.
3. L'ordre existant par session est préservé.
4. Les canaux Discord liés à l'ACP fonctionnent via le même chemin de worker.
5. `stop` cible l'exécution appartenant au worker au lieu de l'ancienne pile d'appels appartenant à l'écouteur.
6. Les délais d'attente et les échecs de livraison deviennent des résultats explicites du worker, et non des abandons silencieux de l'écouteur.

## Stratégie de finalisation restante

Finaliser ceci dans des PRs de suivi :

1. rendre `DiscordInboundJob` des données brutes uniquement et déplacer les références d'exécution en direct sur le worker
2. nettoyer la propriété de l'état de commande pour `stop`, `new` et `reset`
3. ajouter l'observabilité du worker et le statut de l'opérateur
4. décider si la durabilité est nécessaire ou documenter explicitement la limite en mémoire

Cela reste un suivi limité si l'on reste exclusivement sur Discord et si nous continuons à éviter une abstraction de worker inter-canal prématurée.

import en from "/components/footer/en.mdx";

<en />
