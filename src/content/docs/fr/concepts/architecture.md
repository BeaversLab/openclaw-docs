---
summary: "Architecture de la passerelle WebSocket, composants et flux des clients"
read_when:
  - Working on gateway protocol, clients, or transports
title: "Gateway Architecture"
---

# Architecture Gateway

## Vue d'ensemble

- Un unique **Gateway** de longue durée possède toutes les surfaces de messagerie (WhatsApp via
  Baileys, Telegram via grammY, Slack, Discord, Signal, iMessage, WebChat).
- Les clients du plan de contrôle (application macOS, CLI, interface Web Web, automatisations) se connectent au
  Gateway via **WebSocket** sur l'hôte de liaison configuré (par défaut
  `127.0.0.1:18789`).
- Les **Nœuds** (macOS/iOS/Android/headless) se connectent également via **WebSocket**, mais
  déclarent `role: node` avec des commandes/capacités explicites.
- Un Gateway par hôte ; c'est le seul endroit qui ouvre une session WhatsApp.
- L'**hôte de canvas** est servi par le serveur HTTP du Gateway sous :
  - `/__openclaw__/canvas/` (HTML/CSS/JS modifiables par l'agent)
  - `/__openclaw__/a2ui/` (hôte A2UI)
    Il utilise le même port que le Gateway (par défaut `18789`).

## Composants et flux

### Gateway (démon)

- Maintient les connexions aux fournisseurs.
- Expose une API WS typée (requêtes, réponses, événements push serveur).
- Valide les trames entrantes par rapport au schéma JSON.
- Émet des événements comme `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`.

### Clients (application Mac / CLI / administrateur Web)

- Une connexion WS par client.
- Envoyer des requêtes (`health`, `status`, `send`, `agent`, `system-presence`).
- S'abonner aux événements (`tick`, `agent`, `presence`, `shutdown`).

### Nœuds (macOS / iOS / Android / headless)

- Se connecter au **même serveur WS** avec `role: node`.
- Fournir une identité d'appareil dans `connect` ; le jumelage est **basé sur l'appareil** (rôle `node`) et
  l'approbation réside dans le magasin de jumelage des appareils.
- Exposer des commandes comme `canvas.*`, `camera.*`, `screen.record`, `location.get`.

Détails du protocole :

- [Protocole Gateway](/fr/gateway/protocol)

### WebChat

- Interface utilisateur statique qui utilise l'API WS du Gateway pour l'historique des discussions et les envois.
- Dans les configurations distantes, se connecte via le même tunnel SSH/Tailscale que les autres clients.

## Cycle de vie de la connexion (client unique)

```mermaid
sequenceDiagram
    participant Client
    participant Gateway

    Client->>Gateway: req:connect
    Gateway-->>Client: res (ok)
    Note right of Gateway: or res error + close
    Note left of Client: payload=hello-ok<br>snapshot: presence + health

    Gateway-->>Client: event:presence
    Gateway-->>Client: event:tick

    Client->>Gateway: req:agent
    Gateway-->>Client: res:agent<br>ack {runId, status:"accepted"}
    Gateway-->>Client: event:agent<br>(streaming)
    Gateway-->>Client: res:agent<br>final {runId, status, summary}
```

## Protocole filaire (résumé)

- Transport : WebSocket, trames textuelles avec payloads JSON.
- La première trame **doit** être `connect`.
- Après la poignée de main :
  - Requêtes : `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Événements : `{type:"event", event, payload, seq?, stateVersion?}`
- Si `OPENCLAW_GATEWAY_TOKEN` (ou `--token`) est défini, `connect.params.auth.token` doit correspondre, sinon la socket se ferme.
- Les clés d'idempotence sont requises pour les méthodes avec effets de bord (`send`, `agent`) pour permettre des tentatives en toute sécurité ; le serveur conserve un cache de déduplication à court terme.
- Les nœuds doivent inclure `role: "node"` ainsi que les capacités/commandes/autorisations dans `connect`.

## Appairage + confiance locale

- Tous les clients WS (opérateurs + nœuds) incluent une **identité d'appareil** sur `connect`.
- Les nouveaux ID d'appareil nécessitent une approbation d'appairage ; le Gateway émet un **jeton d'appareil** pour les connexions ultérieures.
- Les connexions **locales** (boucle locale ou adresse tailnet propre de l'hôte de la passerelle) peuvent être auto-approuvées pour fluidifier l'UX sur le même hôte.
- Toutes les connexions doivent signer le nonce `connect.challenge`.
- Le payload de signature `v3` lie également `platform` + `deviceFamily` ; la passerelle épingle les métadonnées appariées à la reconnexion et exige un réappairage pour les modifications de métadonnées.
- Les connexions **non locales** nécessitent toujours une approbation explicite.
- L'auth Gateway (`gateway.auth.*`) s'applique toujours à **toutes** les connexions, locales ou distantes.

Détails : [Protocole Gateway](/fr/gateway/protocol), [Appairage](/fr/channels/pairing), [Sécurité](/fr/gateway/security).

## Typage du protocole et génération de code

- Les schémas TypeBox définissent le protocole.
- Le schéma JSON est généré à partir de ces schémas.
- Les modèles Swift sont générés à partir du schéma JSON.

## Accès distant

- Préféré : Tailscale ou VPN.
- Alternative : Tunnel SSH

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- La même poignée de main + jeton d'auth s'appliquent via le tunnel.
- TLS + épinglage optionnel peuvent être activés pour WS dans les configurations distantes.

## Instantané des opérations

- Démarrage : `openclaw gateway` (premier plan, journaux vers stdout).
- Santé : `health` sur WS (également inclus dans `hello-ok`).
- Supervision : launchd/systemd pour le redémarrage automatique.

## Invariants

- Exactement un Gateway contrôle une seule session Baileys par hôte.
- Le handshake est obligatoire ; toute première trame non-JSON ou non-connect entraîne une fermeture brutale.
- Les événements ne sont pas rejoués ; les clients doivent actualiser en cas de rupture.
