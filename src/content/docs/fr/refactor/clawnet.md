---
summary: "Refactorisation de Clawnet : unifier le protocole réseau, les rôles, l'authentification, les approbations, l'identité"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Refactorisation de Clawnet"
---

# Refactorisation de Clawnet (unification du protocole et de l'auth)

## Bonjour

Bonjour Peter — excellente direction ; cela permet une UX plus simple et une sécurité renforcée.

## Objectif

Document unique et rigoureux pour :

- État actuel : protocoles, flux, limites de confiance.
- Points de douleur : approbations, routage multi-saut, duplication de l'interface.
- Nouvel état proposé : un seul protocole, rôles délimités, auth/appariement unifié, épinglage TLS.
- Modèle d'identité : IDs stables + slugs mignons.
- Plan de migration, risques, questions ouvertes.

## Objectifs (issus de la discussion)

- Un seul protocole pour tous les clients (app Mac, CLI, iOS, Android, nœud headless).
- Chaque participant au réseau authentifié et apparié.
- Clarté des rôles : nœuds vs opérateurs.
- Approbations centrales acheminées vers là où se trouve l'utilisateur.
- Chiffrement TLS + épinglage optionnel pour tout le trafic distant.
- Duplication de code minimale.
- Une seule machine doit apparaître une fois (pas de doublon interface/nœud).

## Non-objectifs (explicite)

- Supprimer la séparation des capacités (le principe du moindre privilège est toujours nécessaire).
- Exposer le plan de contrôle complet de la passerelle sans vérification de portée.
- Faire dépendre l'auth des étiquettes humaines (les slugs restent non-sécurisés).

---

# État actuel (tel quel)

## Deux protocoles

### 1) Gateway WebSocket (plan de contrôle)

- Surface complète de l'API : config, canaux, modèles, sessions, exécutions d'agents, journaux, nœuds, etc.
- Liaison par défaut : boucle locale (loopback). Accès distant via SSH/Tailscale.
- Auth : jeton/mot de passe via `connect`.
- Pas d'épinglage TLS (s'appuie sur la boucle locale/le tunnel).
- Code :
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge (transport de nœud)

- Surface restreinte de liste blanche, identité de nœud + appariement.
- JSONL sur TCP ; TLS optionnel + épinglage de l'empreinte du certificat.
- Le TLS annonce l'empreinte dans le TXT de découverte.
- Code :
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## Clients du plan de contrôle aujourd'hui

- CLI → Gateway WS via `callGateway` (`src/gateway/call.ts`).
- macOS app UI → Gateway WS (`GatewayConnection`).
- Web Control UI → Gateway WS.
- ACP → Gateway WS.
- Browser control uses its own HTTP control server.

## Nodes today

- macOS app in node mode connects to Gateway bridge (`MacNodeBridgeSession`).
- iOS/Android apps connect to Gateway bridge.
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
- Peut envoyer des événements : `voice.transcript`, `agent.request`, `chat.subscribe`.
- Ne peut pas appeler les API du plan de contrôle config/models/channels/sessions/agent.

**Opérateur**

- API complète du plan de contrôle, limitée par la portée.
- Reçoit toutes les approbations.
- N'exécute pas directement les actions du système d'exploitation ; route vers les nœuds.

### Règle clé

Le rôle est par connexion, et non par appareil. Un appareil peut ouvrir les deux rôles, séparément.

---

# Authentification unifiée + jumelage

## Identité du client

Chaque client fournit :

- `deviceId` (stable, dérivé de la clé de l'appareil).
- `displayName` (nom humain).
- `role` + `scope` + `caps` + `commands`.

## Flux de jumelage (unifié)

- Le client se connecte sans authentification.
- La passerelle crée une **demande de jumelage** pour ce `deviceId`.
- L'opérateur reçoit une invite ; approuve/refuse.
- La passerelle émet des informations d'identification liées à :
  - clé publique de l'appareil
  - rôle(s)
  - portée(s)
  - capacités/commandes
- Le client conserve le jeton, se reconnecte de manière authentifiée.

## Authentification liée à l'appareil (éviter la réutilisation du jeton porteur)

Préféré : paires de clés d'appareil.

- L'appareil génère une paire de clés une seule fois.
- `deviceId = fingerprint(publicKey)`.
- La passerelle envoie un nonce ; l'appareil signe ; la passerelle vérifie.
- Les jetons sont émis pour une clé publique (preuve de possession), et non pour une chaîne.

Alternatives :

- mTLS (certificats client) : le plus fort, plus de complexité opérationnelle.
- Jetons porteurs à courte durée de vie uniquement comme phase temporaire (rotation + révocation anticipée).

## Approbation silencieuse (heuristique SSH)

Définissez-la précisément pour éviter un maillon faible. Préférez l'une des options suivantes :

- **Local uniquement** : jumelage automatique lorsque le client se connecte via bouclage/socket Unix.
- **Défi via SSH** : la passerelle émet un nonce ; le client prouve l'accès SSH en le récupérant.
- **Fenêtre de présence physique** : après une approbation locale sur l'interface utilisateur de l'hôte de la passerelle, autoriser le jumelage automatique pour une courte fenêtre (par exemple 10 minutes).

Toujours journaliser et enregistrer les approbations automatiques.

---

# TLS partout (dev + prod)

## Réutiliser le TLS du pont existant

Utiliser le runtime TLS actuel + épinglage de l'empreinte digitale :

- `src/infra/bridge/server/tls.ts`
- logique de vérification de l'empreinte dans `src/node-host/bridge-client.ts`

## Appliquer à WS

- Le serveur WS prend en charge TLS avec le même certificat/clé + empreinte.
- Les clients WS peuvent épingler l'empreinte (en option).
- Discovery annonce TLS + empreinte pour tous les points de terminaison.
  - Discovery n'est que des indicateurs de localisation ; jamais une ancre de confiance.

## Pourquoi

- Réduire la dépendance à SSH/Tailscale pour la confidentialité.
- Rendre les connexions mobiles distantes sûres par défaut.

---

# Refonte des approbations (centralisée)

## Actuel

L'approbation a lieu sur l'hôte du nœud (runtime du nœud de l'application Mac). L'invite apparaît là où le nœud s'exécute.

## Proposé

L'approbation est **hébergée par la passerelle**, l'UI est délivrée aux clients de l'opérateur.

### Nouveau flux

1. La passerelle reçoit l'intention `system.run` (agent).
2. La passerelle crée un enregistrement d'approbation : `approval.requested`.
3. La ou les UI de l'opérateur affichent l'invite.
4. La décision d'approbation est envoyée à la passerelle : `approval.resolve`.
5. La passerelle invoque la commande du nœud si approuvé.
6. Le nœud s'exécute, retourne `invoke-res`.

### Sémantique d'approbation (renforcement)

- Diffusion à tous les opérateurs ; seule l'UI active affiche une modale (les autres reçoivent une notification toast).
- La première résolution l'emporte ; la passerelle rejette les résolutions ultérieures comme déjà réglées.
- Délai d'expiration par défaut : refus après N secondes (par ex. 60 s), journaliser la raison.
- La résolution nécessite la portée `operator.approvals`.

## Avantages

- L'invite apparaît là où se trouve l'utilisateur (Mac/téléphone).
- Approbations cohérentes pour les nœuds distants.
- Le runtime du nœud reste sans interface (headless) ; aucune dépendance à l'UI.

---

# Exemples de clarté des rôles

## application iPhone

- **Rôle de nœud** pour : micro, caméra, chat vocal, localisation, appuyer pour parler.
- **operator.read** facultatif pour la vue de statut et de chat.
- **operator.write/admin** facultatif uniquement lorsqu'explicitement activé.

## application macOS

- Rôle d'opérateur par défaut (UI de contrôle).
- Rôle de nœud lorsque « Nœud Mac » est activé (system.run, écran, caméra).
- Même deviceId pour les deux connexions → entrée UI fusionnée.

## CLI

- Rôle d'opérateur toujours.
- Portée dérivée par la sous-commande :
  - `status`, `logs` → lecture
  - `agent`, `message` → écriture
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# Identity + slugs

## Stable ID

Required for auth; never changes.
Preferred:

- Keypair fingerprint (public key hash).

## Cute slug (lobster‑themed)

Human label only.

- Example: `scarlet-claw`, `saltwave`, `mantis-pinch`.
- Stored in gateway registry, editable.
- Collision handling: `-2`, `-3`.

## UI grouping

Same `deviceId` across roles → single “Instance” row:

- Badge: `operator`, `node`.
- Shows capabilities + last seen.

---

# Migration strategy

## Phase 0: Document + align

- Publish this doc.
- Inventory all protocol calls + approval flows.

## Phase 1: Add roles/scopes to WS

- Extend `connect` params with `role`, `scope`, `deviceId`.
- Add allowlist gating for node role.

## Phase 2: Bridge compatibility

- Keep bridge running.
- Add WS node support in parallel.
- Gate features behind config flag.

## Phase 3: Central approvals

- Add approval request + resolve events in WS.
- Update mac app UI to prompt + respond.
- Node runtime stops prompting UI.

## Phase 4: TLS unification

- Add TLS config for WS using bridge TLS runtime.
- Add pinning to clients.

## Phase 5: Deprecate bridge

- Migrate iOS/Android/mac node to WS.
- Keep bridge as fallback; remove once stable.

## Phase 6: Device‑bound auth

- Require key‑based identity for all non‑local connections.
- Add revocation + rotation UI.

---

# Security notes

- Role/allowlist enforced at gateway boundary.
- No client gets “full” API without operator scope.
- Pairing required for _all_ connections.
- TLS + pinning reduces MITM risk for mobile.
- SSH silent approval is a convenience; still recorded + revocable.
- Discovery is never a trust anchor.
- Les revendications de capacités sont vérifiées par rapport aux listes d'autorisation du serveur par plate-forme/type.

# Streaming + grandes charges utiles (média des nœuds)

Le plan de contrôle WS convient aux petits messages, mais les nœuds effectuent également :

- clips de caméra
- enregistrements d'écran
- flux audio

Options :

1. Trames binaires WS + découpage + règles de contre-pression.
2. Point de terminaison de streaming distinct (toujours TLS + auth).
3. Conserver le pont plus longtemps pour les commandes gourmandes en média, migrer en dernier.

Choisir une option avant la mise en œuvre pour éviter toute dérive.

# Stratégie de capacités + commandes

- Les capacités/commandes signalées par le nœud sont traitées comme des **revendications**.
- Gateway applique les listes d'autorisation par plate-forme.
- Toute nouvelle commande nécessite l'approbation de l'opérateur ou une modification explicite de la liste d'autorisation.
- Auditer les modifications avec des horodatages.

# Audit + limitation de débit

- Journal : demandes d'appairage, approbations/refus, émission/rotation/révocation de jetons.
- Limiter le débit du spam d'appairage et des invites d'approbation.

# Hygiène du protocole

- Version explicite du protocole + codes d'erreur.
- Règles de reconnexion + stratégie de pulsation (heartbeat).
- TTL de présence et sémantique de dernière vue.

---

# Questions ouvertes

1. Appareil unique exécutant les deux rôles : model de jeton
   - Recommander des jetons distincts par rôle (nœud vs opérateur).
   - Même deviceId ; différentes portées ; révocation plus claire.

2. Granularité de la portée de l'opérateur
   - lecture/écriture/admin + approbations + appairage (minimum viable).
   - Envisager des portées par fonctionnalité plus tard.

3. Rotation des jetons + UX de révocation
   - Rotation automatique lors du changement de rôle.
   - Interface utilisateur pour révoquer par deviceId + rôle.

4. Discovery
   - Étendre le TXT Bonjour actuel pour inclure l'empreinte TLS WS + indices de rôle.
   - Traiter uniquement comme des indices de localisation.

5. Approbation inter-réseau
   - Diffuser vers tous les clients opérateurs ; l'interface utilisateur active affiche une modale.
   - La première réponse gagne ; la passerelle applique l'atomicité.

---

# Résumé (TL;DR)

- Aujourd'hui : plan de contrôle WS + transport de nœud Bridge.
- Douleur : approbations + duplication + deux piles.
- Proposition : un protocole WS avec des rôles + portées explicites, appairage unifié + épinglage TLS, approbations hébergées par la passerelle, IDs d'appareil stables + slugs mignons.
- Résultat : UX plus simple, sécurité renforcée, moins de duplication, meilleur routage mobile.
