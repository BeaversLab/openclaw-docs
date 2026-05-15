---
summary: Modèles de sécurité vérifiés par machine pour les chemins les plus à risque d'OpenClaw.
title: Vérification formelle (modèles de sécurité)
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

Cette page suit les **modèles de sécurité formels** d'OpenClaw (TLA+/TLC aujourd'hui ; plus si nécessaire).

> Remarque : certains anciens liens peuvent faire référence au nom précédent du projet.

**Objectif (étoile du Nord) :** fournir un argument vérifié par machine que OpenClaw applique sa
stratégie de sécurité prévue (autorisation, isolement de session, contrôle des outils et
sécurité contre la mauvaise configuration), sous des hypothèses explicites.

**Ce que c'est (aujourd'hui) :** une suite de régression de sécurité exécutable, pilotée par un attaquant :

- Chaque revendication dispose d'une vérification de modèle exécutable sur un espace d'états fini.
- De nombreuses revendications disposent d'un **modèle négatif** associé qui produit une trace de contre-exemple pour une classe de bugs réaliste.

**Ce que ce n'est pas (encore) :** une preuve qu'« OpenClaw est sécurisé sous tous les aspects » ou que l'implémentation TypeScript complète est correcte.

## Où se trouvent les modèles

Les modèles sont maintenus dans un dépôt séparé : [vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models).

## Avertissements importants

- Ce sont des **modèles**, et non l'implémentation TypeScript complète. Une dérive entre le modèle et le code est possible.
- Les résultats sont bornés par l'espace d'états exploré par TLC ; « vert » n'implique pas la sécurité au-delà des hypothèses et limites modélisées.
- Certaines revendications reposent sur des hypothèses environnementales explicites (par exemple, déploiement correct, entrées de configuration correctes).

## Reproduction des résultats

Aujourd'hui, les résultats sont reproduits en clonant localement le dépôt des modèles et en exécutant TLC (voir ci-dessous). Une future itération pourrait offrir :

- des modèles exécutés par CI avec des artefacts publics (traces de contre-exemples, journaux d'exécution)
- un workflow hébergé « exécuter ce modèle » pour de petites vérifications bornées

Getting started :

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Exposition de la Gateway et mauvaise configuration de la passerelle ouverte

**Revendication :** la liaison au-delà de loopback sans authentification peut rendre la compromission à distance possible / augmente l'exposition ; le jeton/mot de passe bloque les attaquants non authentifiés (selon les hypothèses du modèle).

- Exécutions vertes :
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- Rouge (attendu) :
  - `make gateway-exposure-v2-negative`

Voir aussi : `docs/gateway-exposure-matrix.md` dans le dépôt des modèles.

### Pipeline d'exécution de nœud (capacité à plus haut risque)

**Revendication :** `exec host=node` nécessite (a) une liste blanche de commandes de nœud plus des commandes déclarées et (b) une approbation en direct lorsque configuré ; les approbations sont tokenisées pour empêcher la réexécution (dans le modèle).

- Exécutions vertes :
  - `make nodes-pipeline`
  - `make approvals-token`
- Rouge (attendu) :
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### Store de couplage (filtrage DM)

**Revendication :** les demandes de couplage respectent le TTL et les plafonds de demandes en attente.

- Exécutions vertes :
  - `make pairing`
  - `make pairing-cap`
- Rouge (attendu) :
  - `make pairing-negative`
  - `make pairing-cap-negative`

### Filtrage d'entrée (mentions + contournement des commandes de contrôle)

**Revendication :** dans les contextes de groupe nécessitant une mention, une « commande de contrôle » non autorisée ne peut pas contourner le filtrage par mention.

- Vert :
  - `make ingress-gating`
- Rouge (attendu) :
  - `make ingress-gating-negative`

### Isolement de routage/clé de session

**Revendication :** les DMs provenant de pairs distincts ne fusionnent pas dans la même session sauf s'ils sont explicitement liés/configurés.

- Vert :
  - `make routing-isolation`
- Rouge (attendu) :
  - `make routing-isolation-negative`

## v1++ : modèles limités supplémentaires (concurrence, nouvelles tentatives, exactitude de la trace)

Il s'agit de modèles de suivi qui renforcent la fidélité autour des modes de défaillance réels (mises à jour non atomiques, nouvelles tentatives et diffusion de messages).

### Concurrence / idempotence du store de couplage

**Revendication :** un magasin d'appariement doit appliquer `MaxPending` et l'idempotence même sous les entrelacements (c'est-à-dire que « vérifier puis écrire » doit être atomique/verrouillé ; le rafraîchissement ne doit pas créer de doublons).

Ce que cela signifie :

- Sous les requêtes simultanées, vous ne pouvez pas dépasser `MaxPending` pour un channel.
- Les demandes/rafraîchissements répétés pour le même `(channel, sender)` ne doivent pas créer de lignes en attente actives en double.

- Exécutions vertes :
  - `make pairing-race` (vérification de limite atomique/verrouillée)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Rouge (attendu) :
  - `make pairing-race-negative` (course de limites begin/commit non atomiques)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### Corrélation de trace d'entrée / idempotence

**Revendication :** l'ingestion doit préserver la corrélation des traces sur l'éclatement (fan-out) et être idempotente lors des tentatives du fournisseur.

Ce que cela signifie :

- Lorsqu'un événement externe devient plusieurs messages internes, chaque partie conserve la même identité de trace/événement.
- Les nouvelles tentatives ne doivent pas entraîner de double traitement.
- Si les ID d'événements du fournisseur sont manquants, la déduplication revient à une clé sécurisée (par exemple, ID de trace) pour éviter de supprimer des événements distincts.

- Vert :
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- Rouge (attendu) :
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### Priorité dmScope de routage + identityLinks

**Revendication :** le routage doit garder les sessions DM isolées par défaut, et ne fusionner les sessions que lorsqu'elles sont explicitement configurées (priorité des canaux + liens d'identité).

Ce que cela signifie :

- Les remplacements dmScope spécifiques au canal doivent l'emporter sur les paramètres globaux par défaut.
- identityLinks ne doit fusionner qu'au sein de groupes explicitement liés, et non entre des pairs non liés.

- Vert :
  - `make routing-precedence`
  - `make routing-identitylinks`
- Rouge (attendu) :
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

## Connexes

- [Modèle de menace](/fr/security/THREAT-MODEL-ATLAS)
- [Contribuer au modèle de menace](/fr/security/CONTRIBUTING-THREAT-MODEL)
