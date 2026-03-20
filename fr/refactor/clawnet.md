---
summary: "Refonte de Clawnet : unifier le protocole réseau, les rôles, l'auth, les approbations, l'identité"
read_when:
  - Planification d'un protocole réseau unifié pour les nœuds + les clients opérateurs
  - Refonte des approbations, de l'appairage, du TLS et de la présence sur les appareils
title: "Refonte de Clawnet"
---

# Refonte de Clawnet (unification du protocole + de l'auth)

## Salut

Salut Peter — excellente direction ; cela permet une UX plus simple et une sécurité renforcée.

## Objectif

Document unique et rigoureux pour :

- État actuel : protocoles, flux, limites de confiance.
- Points de douleur : approbations, routage multi-sauts, duplication de l'interface utilisateur.
- Nouvel état proposé : un seul protocole, rôles délimités, auth/appairage unifié, épinglage TLS.
- Modèle d'identité : IDs stables + slugs mignons.
- Plan de migration, risques, questions ouvertes.

## Objectifs (issus de la discussion)

- Un seul protocole pour tous les clients (application Mac, CLI, iOS, Android, nœud sans interface).
- Chaque participant au réseau authentifié + apparié.
- Clarté des rôles : nœuds contre opérateurs.
- Approbations centrales acheminées vers où se trouve l'utilisateur.
- Chiffrement TLS + épinglage optionnel pour tout le trafic distant.
- Duplication de code minimale.
- Une seule machine doit apparaître une seule fois (pas de doublon UI/nœud).

## Non-objectifs (explicite)

- Supprimer la séparation des capacités (le principe du moindre privilège est toujours nécessaire).
- Exposer le plan de contrôle complet de la passerelle sans vérification de la portée.
- Rendre l'auth dépendante des étiquettes humaines (les slugs restent non sécuritaires).

---

# État actuel (tel quel)

## Deux protocoles

### 1) Gateway WebSocket (plan de contrôle)

- Surface API complète : config, canaux, modèles, sessions, exécutions d'agent, journaux, nœuds, etc.
- Liaison par défaut : boucle locale. Accès à distance via SSH/Tailscale.
- Auth : jeton/mot de passe via `connect`.
- Pas d'épinglage TLS (s'appuie sur la boucle locale/tunnel).
- Code :
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge (transport de nœud)

- Surface de liste d'autorisation étroite, identité du nœud + appairage.
- JSONL sur TCP ; TLS optionnel + épinglage de l'empreinte du certificat.
- Le TLS annonce l'empreinte dans le TXT de découverte.
- Code :
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## Clients du plan de contrôle aujourd'hui

- CLI → Gateway WS via `callGateway` (`src/gateway/call.ts`).
- Interface utilisateur de l'application macOS → Gateway WS (`GatewayConnection`).
- Interface utilisateur de contrôle Web → Gateway WS.
- ACP → Gateway WS.
- Browser control uses its own HTTP control server.

## Nodes today

- L'application macOS en mode nœud se connecte au pont Gateway (`MacNodeBridgeSession`).
- Les applications iOS/Android se connectent au pont Gateway.
- Pairing + per‑node token stored on gateway.

## Current approval flow (exec)

- Agent uses `system.run` via Gateway.
- Gateway invokes node over bridge.
- Node runtime decides approval.
- UI prompt shown by mac app (when node == mac app).
- Node returns `invoke-res` to Gateway.
- Multi‑hop, UI tied to node host.

## Presence + identity today

- Gateway presence entries from WS clients.
- Node presence entries from bridge.
- mac app can show two entries for same machine (UI + node).
- Node identity stored in pairing store; UI identity separate.

---

# Problems / pain points

- Two protocol stacks to maintain (WS + Bridge).
- Approvals on remote nodes: prompt appears on node host, not where user is.
- TLS pinning only exists for bridge; WS depends on SSH/Tailscale.
- Identity duplication: same machine shows as multiple instances.
- Ambiguous roles: UI + node + CLI capabilities not clearly separated.

---

# Proposed new state (Clawnet)

## One protocol, two roles

Single WS protocol with role + scope.

- **Role: node** (capability host)
- **Role: operator** (control plane)
- Optional **scope** for operator:
  - `operator.read` (status + viewing)
  - `operator.write` (agent run, sends)
  - `operator.admin` (config, channels, models)

### Role behaviors

**Node**

- Can register capabilities (`caps`, `commands`, permissions).
- Can receive `invoke` commands (`system.run`, `camera.*`, `canvas.*`, `screen.record`, etc).
- Can send events: `voice.transcript`, `agent.request`, `chat.subscribe`.
- Cannot call config/models/channels/sessions/agent control plane APIs.

**Operator**

- Full control plane API, gated by scope.
- Receives all approvals.
- Does not directly execute OS actions; routes to nodes.

### Key rule

Role is per‑connection, not per device. A device may open both roles, separately.

---

# Authentification unifiée + appairage

## Identité du client

Chaque client fournit :

- `deviceId` (stable, dérivé de la clé de l'appareil).
- `displayName` (nom humain).
- `role` + `scope` + `caps` + `commands`.

## Flux d'appairage (unifié)

- Le client se connecte sans authentification.
- La passerelle crée une **demande d'appairage** pour ce `deviceId`.
- L'opérateur reçoit une invite ; approuve/refuse.
- La passerelle émet des informations d'identification liées à :
  - clé publique de l'appareil
  - rôle(s)
  - portée(s)
  - capacités/commandes
- Le client conserve le jeton, se reconnecte de manière authentifiée.

## Authentification liée à l'appareil (éviter la relecture du jeton porteur)

Préféré : paires de clés d'appareil.

- L'appareil génère une paire de clés une seule fois.
- `deviceId = fingerprint(publicKey)`.
- La passerelle envoie un nonce ; l'appareil signe ; la passerelle vérifie.
- Les jetons sont émis pour une clé publique (preuve de possession), et non pour une chaîne.

Alternatives :

- mTLS (certificats client) : le plus fort, plus de complexité opérationnelle.
- Jeton porteur à courte durée de vie uniquement comme phase temporaire (rotation + révocation anticipée).

## Approbation silencieuse (heuristique SSH)

Définissez-la précisément pour éviter un maillon faible. Préférez l'une des options suivantes :

- **Local uniquement** : appairage automatique lorsque le client se connecte via bouclage/socket Unix.
- **Défi via SSH** : la passerelle émet un nonce ; le client prouve le SSH en le récupérant.
- **Fenêtre de présence physique** : après une approbation locale sur l'interface utilisateur de l'hôte de la passerelle, autoriser l'appairage automatique pendant une courte fenêtre (par exemple, 10 minutes).

Toujours journaliser et enregistrer les approbations automatiques.

---

# TLS partout (dev + prod)

## Réutiliser le TLS de pont existant

Utiliser le runtime TLS actuel + épinglage des empreintes digitales :

- `src/infra/bridge/server/tls.ts`
- logique de vérification de l'empreinte digitale dans `src/node-host/bridge-client.ts`

## Appliquer à WS

- Le serveur WS prend en charge TLS avec le même cert/clé + empreinte digitale.
- Les clients WS peuvent épingler l'empreinte digitale (en option).
- La découverte annonce TLS + empreinte digitale pour tous les points de terminaison.
  - La découverte fournit uniquement des indications de localisation ; jamais une ancre de confiance.

## Pourquoi

- Réduire la dépendance à SSH/Tailscale pour la confidentialité.
- Rendre les connexions mobiles distantes sécurisées par défaut.

---

# Refonte des approbations (centralisée)

## Actuel

L'approbation a lieu sur l'hôte du nœud (runtime du nœud de l'application Mac). L'invite apparaît là où le nœud s'exécute.

## Proposé

L'approbation est **hébergée par la passerelle**, l'interface utilisateur étant transmise aux clients opérateurs.

### Nouveau flux

1. Le Gateway reçoit l'intention `system.run` (agent).
2. Le Gateway crée un enregistrement d'approbation : `approval.requested`.
3. Les interfaces opérateur affichent une invite.
4. La décision d'approbation est envoyée à la passerelle : `approval.resolve`.
5. Le Gateway invoque la commande du nœud si approuvé.
6. Le nœud s'exécute et renvoie `invoke-res`.

### Sémantique d'approbation (renforcement)

- Diffusion vers tous les opérateurs ; seule l'interface active affiche une modale (les autres reçoivent une notification toast).
- La première résolution l'emporte ; la passerelle rejette les résolutions ultérieures comme déjà réglées.
- Délai d'expiration par défaut : refus après N secondes (ex. 60 s), consigner la raison.
- La résolution nécessite la portée `operator.approvals`.

## Avantages

- L'invite apparaît là où se trouve l'utilisateur (Mac/téléphone).
- Approbations cohérentes pour les nœuds distants.
- Le runtime du nœud reste sans tête (headless) ; aucune dépendance à l'interface utilisateur.

---

# Exemples de clarté des rôles

## Application iPhone

- **Rôle de nœud** pour : micro, caméra, chat vocal, localisation, appuyer-pour-parler.
- **operator.read** en option pour la vue de statut et de chat.
- **operator.write/admin** en option uniquement lorsqu'activé explicitement.

## Application macOS

- Rôle d'opérateur par défaut (interface de contrôle).
- Rôle de nœud lorsque « Mac node » est activé (system.run, écran, caméra).
- Même deviceId pour les deux connexions → entrée d'interface fusionnée.

## CLI

- Toujours le rôle d'opérateur.
- Portée dérivée par la sous-commande :
  - `status`, `logs` → lecture
  - `agent`, `message` → écriture
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# Identité + slugs

## ID stable

Requis pour l'authentification ; ne change jamais.
Préféré :

- Empreinte de paire de clés (hachage de clé publique).

## Slug mignon (thème homard)

Libellé humain uniquement.

- Exemple : `scarlet-claw`, `saltwave`, `mantis-pinch`.
- Stocké dans le registre de la passerelle, modifiable.
- Gestion des collisions : `-2`, `-3`.

## Groupement d'interface

Même `deviceId` pour tous les rôles → seule ligne « Instance » :

- Badge : `operator`, `node`.
- Affiche les capacités + dernière vue.

---

# Stratégie de migration

## Phase 0 : Documenter et aligner

- Publier ce document.
- Inventorier tous les appels de protocole + flux d'approbation.

## Phase 1 : Ajouter rôles/portées au WS

- Étendre les paramètres `connect` avec `role`, `scope`, `deviceId`.
- Ajouter une liste blanche de verrouillage pour le rôle de nœud.

## Phase 2 : Compatibilité du pont

- Garder le pont en cours d'exécution.
- Ajouter la prise en charge du nœud WS en parallèle.
- Verrouiller les fonctionnalités derrière un indicateur de configuration.

## Phase 3 : Approbations centrales

- Ajouter les événements de demande d'approbation + résolution dans WS.
- Mettre à jour l'interface utilisateur de l'application Mac pour demander + répondre.
- Le runtime du nœud cesse de demander l'interface utilisateur.

## Phase 4 : Unification TLS

- Ajouter la configuration TLS pour WS en utilisant le runtime TLS du pont.
- Ajouter l'épinglage aux clients.

## Phase 5 : Abandonner le pont

- Migrer le nœud iOS/Android/mac vers WS.
- Garder le pont comme solution de secours ; supprimer une fois stable.

## Phase 6 : Authentification liée à l'appareil

- Exiger une identité basée sur une clé pour toutes les connexions non locales.
- Ajouter l'interface utilisateur de révocation + rotation.

---

# Notes de sécurité

- Rôle/liste blanche appliqué à la limite de la passerelle.
- Aucun client n'obtient l'API « complet » sans la portée d'opérateur.
- Jumelage requis pour _toutes_ les connexions.
- TLS + épinglage réduit le risque MITM pour les mobiles.
- L'approbation silencieuse SSH est une commodité ; toujours enregistrée + révocable.
- La découverte n'est jamais une ancre de confiance.
- Les revendications de capacité sont vérifiées par rapport aux listes blanches du serveur par plate-forme/type.

# Streaming + grandes charges utiles (média de nœud)

Le plan de contrôle WS convient aux petits messages, mais les nœuds font aussi :

- clips caméra
- enregistrements d'écran
- flux audio

Options :

1. Trames binaires WS + découpage + règles de contre-pression.
2. Point de terminaison de streaming séparé (toujours TLS + auth).
3. Garder le pont plus longtemps pour les commandes lourdes en média, migrer en dernier.

Choisir une option avant la mise en œuvre pour éviter la dérive.

# Stratégie de capacité + commande

- Les capacités/commandes signalées par le nœud sont traitées comme des **revendications**.
- Gateway applique les listes blanches par plate-forme.
- Toute nouvelle commande nécessite l'approbation de l'opérateur ou un changement explicite de la liste blanche.
- Auditer les modifications avec horodatages.

# Audit + limitation de débit

- Journal : demandes de jumelage, approbations/refus, émission/rotation/révocation de jetons.
- Limiter le débit du spam de jumelage et des invites d'approbation.

# Hygiène du protocole

- Version explicite du protocole + codes d'erreur.
- Règles de reconnexion + stratégie de heartbeat.
- TTL de présence et sémantique de dernière vue.

---

# Questions ouvertes

1. Appareil unique exécutant les deux rôles : modèle de jeton
   - Recommander des jetons séparés par rôle (nœud vs opérateur).
   - Même deviceId ; différentes portées ; révocation plus claire.

2. Granularité de la portée de l'opérateur
   - lecture/écriture/admin + approbations + appariement (minimum viable).
   - Envisager des portées par fonctionnalité plus tard.

3. UX de rotation et de révocation des jetons
   - Rotation automatique lors du changement de rôle.
   - Interface utilisateur pour révoquer par deviceId + rôle.

4. Discovery
   - Étendre le TXT Bonjour actuel pour inclure l'empreinte TLS WS + indications de rôle.
   - Considérer uniquement comme des indications de localisation.

5. Approbation inter-réseau
   - Diffuser vers tous les clients opérateurs ; l'interface utilisateur active affiche une fenêtre modale.
   - La première réponse gagne ; la passerelle applique l'atomicité.

---

# Résumé (TL;DR)

- Aujourd'hui : plan de contrôle WS + transport de nœud Bridge.
- Problème : approbations + duplication + deux piles.
- Proposition : un protocole WS avec des rôles et portées explicites, appariement unifié + épinglage TLS, approbations hébergées par la passerelle, IDs d'appareil stables + jolis slugs.
- Résultat : UX plus simple, sécurité renforcée, moins de duplication, meilleur routage mobile.

import en from "/components/footer/en.mdx";

<en />
