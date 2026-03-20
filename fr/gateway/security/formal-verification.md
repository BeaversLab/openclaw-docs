---
title: Vérification formelle (Modèles de sécurité)
summary: Modèles de sécurité vérifiés par machine pour les chemins les plus à risque d'OpenClaw.
permalink: /security/formal-verification/
---

# Vérification formelle (Modèles de sécurité)

Cette page suit les **modèles de sécurité formels** d'OpenClaw (TLA+/TLC aujourd'hui ; plus si nécessaire).

> Remarque : certains liens plus anciens peuvent faire référence au nom précédent du projet.

**Objectif (étoile polaire) :** fournir un argument vérifié par machine qu'OpenClaw applique sa
politique de sécurité prévue (autorisation, isolation de session, filtrage d'outils et
sécurité contre la mauvaise configuration), sous des hypothèses explicites.

**Ce que c'est (aujourd'hui) :** une **suite de régression de sécurité** exécutable, pilotée par l'attaquant :

- Chaque revendication fait l'objet d'une vérification de modèle exécutable sur un espace d'états fini.
- De nombreuses revendications disposent d'un **modèle négatif** associé qui produit une trace de contre-exemple pour une classe de bogues réaliste.

**Ce que ce n'est pas (encore) :** une preuve qu'« OpenClaw est sécurisé à tous égards » ou que l'implémentation TypeScript complète est correcte.

## Où se trouvent les modèles

Les modèles sont maintenus dans un dépôt séparé : [vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models).

## Mises en garde importantes

- Il s'agit de **modèles**, et non de l'implémentation TypeScript complète. Une dérive entre le modèle et le code est possible.
- Les résultats sont limités par l'espace d'états exploré par TLC ; « vert » n'implique pas la sécurité au-delà des hypothèses et limites modélisées.
- Certaines revendications reposent sur des hypothèses environnementales explicites (par exemple, déploiement correct, entrées de configuration correctes).

## Reproduction des résultats

Aujourd'hui, les résultats sont reproduits en clonant le dépôt des modèles localement et en exécutant TLC (voir ci-dessous). Une future itération pourrait offrir :

- Des modèles exécutés par CI avec des artefacts publics (traces de contre-exemples, journaux d'exécution)
- un workflow hébergé « exécuter ce modèle » pour de petites vérifications bornées

Getting started :

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Exposition du Gateway et mauvaise configuration de la passerelle ouverte

**Revendication :** la liaison au-delà du bouclage sans authentification peut rendre la compromission à distance possible / augmenter l'exposition ; le jeton/mot de passe bloque les attaquants non authentifiés (selon les hypothèses du modèle).

- Exécutions vertes :
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- Rouge (attendu) :
  - `make gateway-exposure-v2-negative`

Voir aussi : `docs/gateway-exposure-matrix.md` dans le dépôt des modèles.

### Pipeline Nodes.run (capacité la plus risquée)

**Claim :** `nodes.run` nécessite (a) une liste blanche de commandes de nœud plus des commandes déclarées et (b) une approbation en direct lorsqu'il est configuré ; les approbations sont tokenisées pour empêcher la réexécution (dans le modèle).

- Exécutions réussies :
  - `make nodes-pipeline`
  - `make approvals-token`
- Rouge (attendu) :
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### Magasin de couplage (blocage DM)

**Claim :** les demandes de couplage respectent le TTL et les limites de demandes en attente.

- Exécutions réussies :
  - `make pairing`
  - `make pairing-cap`
- Rouge (attendu) :
  - `make pairing-negative`
  - `make pairing-cap-negative`

### Blocage d'entrée (mentions + contournement des commandes de contrôle)

**Claim :** dans les contextes de groupe nécessitant une mention, une « commande de contrôle » non autorisée ne peut pas contourner le blocage par mention.

- Réussi :
  - `make ingress-gating`
- Rouge (attendu) :
  - `make ingress-gating-negative`

### Isolement de routage/clé de session

**Claim :** les DMs provenant de pairs distincts ne fusionnent pas dans la même session sauf s'ils sont explicitement liés/configurés.

- Réussi :
  - `make routing-isolation`
- Rouge (attendu) :
  - `make routing-isolation-negative`

## v1++ : modèles bornés supplémentaires (concurrence, nouvelles tentatives, correction de trace)

Il s'agit de modèles de suivi qui resserrent la fidélité autour des modes de défaillance réels (mises à jour non atomiques, nouvelles tentatives et diffusion de messages).

### Concurrence du magasin de couplage / idempotence

**Claim :** un magasin de couplage doit appliquer `MaxPending` et l'idempotence même sous les entrelacements (c'est-à-dire que « vérifier puis écrire » doit être atomique/verrouillé ; l'actualisation ne doit pas créer de doublons).

Ce que cela signifie :

- Sous des requêtes simultanées, vous ne pouvez pas dépasser `MaxPending` pour un channel.
- Les demandes/actualisations répétées pour le même `(channel, sender)` ne doivent pas créer de lignes en attente en double.

- Exécutions réussies :
  - `make pairing-race` (vérification de limite atomique/verrouillée)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Rouge (attendu) :
  - `make pairing-race-negative` (course de limites begin/commit non atomique)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### Corrélation de traces d'entrée / idempotence

**Affirmation :** l'ingestion doit préserver la corrélation des traces lors de l'éclatement (fan-out) et être idempotente face aux nouvelles tentatives du provider.

Signification :

- Lorsqu'un événement externe devient plusieurs messages internes, chaque partie conserve la même identité de trace/d'événement.
- Les nouvelles tentatives n'entraînent pas de double traitement.
- Si les ID d'événements du provider sont manquants, la déduplication revient à une clé sûre (par exemple, ID de trace) pour éviter de supprimer des événements distincts.

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

### Routage de la priorité dmScope + identityLinks

**Affirmation :** le routage doit garder les sessions DM isolées par défaut, et ne fusionner les sessions que lorsqu'elles sont explicitement configurées (priorité du channel + identity links).

Signification :

- Les remplacements spécifiques au channel de dmScope doivent primer sur les valeurs par défaut globales.
- Les identityLinks ne doivent fusionner qu'au sein de groupes liés explicitement, et non entre pairs non liés.

- Vert :
  - `make routing-precedence`
  - `make routing-identitylinks`
- Rouge (attendu) :
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

import fr from "/components/footer/fr.mdx";

<fr />
