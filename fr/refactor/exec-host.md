---
summary: "Plan de refactorisation : routage de l'hôte d'exécution, approbations de nœuds et runner sans interface graphique"
read_when:
  - Conception du routage de l'hôte d'exécution ou des approbations d'exécution
  - Implémentation du runner de nœud + IPC UI
  - Ajout de modes de sécurité de l'hôte d'exécution et de commandes slash
title: "Refactorisation de l'hôte d'exécution"
---

# Plan de refactorisation de l'hôte d'exécution

## Objectifs

- Ajouter `exec.host` + `exec.security` pour router l'exécution entre **sandbox**, **gateway** et **node**.
- Garder les paramètres par défaut **sûrs** : aucune exécution inter-hôtes sauf si explicitement activée.
- Diviser l'exécution en un **service runner sans interface graphique** avec une interface utilisateur optionnelle (application macOS) via IPC local.
- Fournir une stratégie **par agent**, une liste d'autorisation, un mode de demande et une liaison de nœud.
- Prendre en charge les **modes de demande** qui fonctionnent _avec_ ou _sans_ listes d'autorisation.
- Multiplateforme : socket Unix + authentification par jeton (parité macOS/Linux/Windows).

## Non-objectifs

- Aucune migration de liste d'autorisation héritée ou de support de schéma hérité.
- Aucun PTY/streaming pour l'exécution de nœud (sortie agrégée uniquement).
- Aucune nouvelle couche réseau au-delà du Bridge et Gateway existants.

## Décisions (verrouillées)

- **Clés de configuration :** `exec.host` + `exec.security` (remplacement par agent autorisé).
- **Élévation :** conserver `/elevated` comme alias pour l'accès complet à la passerelle.
- **Demande par défaut :** `on-miss`.
- **Stockage des approbations :** `~/.openclaw/exec-approvals.json` (JSON, aucune migration héritée).
- **Runner :** service système sans interface graphique ; l'application UI héberge un socket Unix pour les approbations.
- **Identité du nœud :** utiliser `nodeId` existant.
- **Authentification de socket :** socket Unix + jeton (multiplateforme) ; séparation ultérieure si nécessaire.
- **État de l'hôte du nœud :** `~/.openclaw/node.json` (identifiant du nœud + jeton d'appariement).
- **Hôte d'exécution macOS :** exécuter `system.run` dans l'application macOS ; le service d'hôte de nœud transfère les demandes via IPC local.
- **Pas d'assistant XPC :** s'en tenir au socket Unix + jeton + vérifications des pairs.

## Concepts clés

### Hôte

- `sandbox` : exec Docker (comportement actuel).
- `gateway` : exec sur l'hôte de la passerelle.
- `node` : exec sur le runner de nœud via Bridge (`system.run`).

### Mode de sécurité

- `deny` : toujours bloquer.
- `allowlist` : autoriser uniquement les correspondances.
- `full` : tout autoriser (équivalent à elevated).

### Mode Ask

- `off` : ne jamais demander.
- `on-miss` : demander uniquement si la liste d'autorisation ne correspond pas.
- `always` : demander à chaque fois.

Ask est **indépendant** de la liste d'autorisation ; la liste d'autorisation peut être utilisée avec `always` ou `on-miss`.

### Résolution de la stratégie (par exec)

1. Résoudre `exec.host` (paramètre d'outil → remplacement d'agent → valeur par défaut globale).
2. Résoudre `exec.security` et `exec.ask` (même priorité).
3. Si l'hôte est `sandbox`, procéder à l'exécution locale dans un bac à sable.
4. Si l'hôte est `gateway` ou `node`, appliquer la stratégie de sécurité + ask sur cet hôte.

## Sécurité par défaut

- `exec.host = sandbox` par défaut.
- `exec.security = deny` par défaut pour `gateway` et `node`.
- `exec.ask = on-miss` par défaut (pertinent uniquement si la sécurité l'autorise).
- Si aucune liaison de nœud n'est définie, **l'agent peut cibler n'importe quel nœud**, mais uniquement si la stratégie l'autorise.

## Surface de configuration

### Paramètres d'outil

- `exec.host` (optionnel) : `sandbox | gateway | node`.
- `exec.security` (optionnel) : `deny | allowlist | full`.
- `exec.ask` (optionnel) : `off | on-miss | always`.
- `exec.node` (optionnel) : id/nom du nœud à utiliser lorsque `host=node`.

### Clés de configuration (global)

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node` (liaison de nœud par défaut)

### Clés de configuration (par agent)

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### Alias

- `/elevated on` = définir `tools.exec.host=gateway`, `tools.exec.security=full` pour la session de l'agent.
- `/elevated off` = restaurer les paramètres d'exécution précédents pour la session de l'agent.

## Stockage des approbations (JSON)

Chemin : `~/.openclaw/exec-approvals.json`

Objectif :

- Stratégie locale + listes d'autorisation pour l'**hôte d'exécution** (passerelle ou node runner).
- Retour à la demande (Ask) si aucune interface utilisateur n'est disponible.
- Identifiants IPC pour les clients d'interface utilisateur.

Schéma proposé (v1) :

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

Notes :

- Aucun format d'autorisation hérité.
- `askFallback` s'applique uniquement lorsque `ask` est requis et qu'aucune interface utilisateur n'est accessible.
- Autorisations de fichier : `0600`.

## Service Runner (sans interface)

### Rôle

- Appliquer `exec.security` + `exec.ask` localement.
- Exécuter les commandes système et renvoyer la sortie.
- Émettre des événements Bridge pour le cycle de vie de l'exécution (optionnel mais recommandé).

### Cycle de vie du service

- Launchd/démon sur macOS ; service système sur Linux/Windows.
- Le JSON des approbations est local à l'hôte d'exécution.
- L'interface utilisateur héberge un socket Unix local ; les runners se connectent à la demande.

## Intégration de l'interface utilisateur (application macOS)

### IPC

- Socket Unix sur `~/.openclaw/exec-approvals.sock` (0600).
- Jeton stocké dans `exec-approvals.json` (0600).
- Vérifications des pairs : même UID uniquement.
- Défi/réponse : nonce + HMAC(token, request-hash) pour empêcher la relecture.
- TTL court (ex. 10s) + charge utile maximale + limite de débit.

### Flux Ask (hôte d'exécution de l'application macOS)

1. Le service de nœud reçoit `system.run` de la passerelle.
2. Le service de nœud se connecte au socket local et envoie la demande de prompt/d'exécution.
3. L'application valide le pair + le jeton + HMAC + TTL, puis affiche une boîte de dialogue si nécessaire.
4. L'application exécute la commande dans le contexte de l'interface utilisateur et renvoie la sortie.
5. Le service de nœud renvoie la sortie à la passerelle.

Si l'interface utilisateur est manquante :

- Appliquer `askFallback` (`deny|allowlist|full`).

### Diagramme (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Identité du nœud + liaison

- Utiliser l'`nodeId` existant de l'appariement Bridge.
- Modèle de liaison :
  - `tools.exec.node` restreint l'agent à un nœud spécifique.
  - Si non défini, l'agent peut choisir n'importe quel nœud (la stratégie applique toujours les valeurs par défaut).
- Résolution de la sélection du nœud :
  - Correspondance exacte `nodeId`
  - `displayName` (normalisé)
  - `remoteIp`
  - Préfixe `nodeId` (>= 6 caractères)

## Gestion des événements

### Qui voit les événements

- Les événements système sont **par session** et sont affichés à l'agent lors du prochain prompt.
- Stockés dans la file d'attente en mémoire de la passerelle (`enqueueSystemEvent`).

### Texte de l'événement

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + optional output tail
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### Transport

Option A (recommended) :

- Runner sends Bridge `event` frames `exec.started` / `exec.finished`.
- Gateway `handleBridgeEvent` maps these into `enqueueSystemEvent`.

Option B :

- Gateway `exec` tool handles lifecycle directly (synchronous only).

## Exec flows

### Sandbox host

- Existing `exec` behavior (Docker or host when unsandboxed).
- PTY supported in non-sandbox mode only.

### Gateway host

- Gateway process executes on its own machine.
- Enforces local `exec-approvals.json` (security/ask/allowlist).

### Node host

- Gateway calls `node.invoke` with `system.run`.
- Runner enforces local approvals.
- Runner returns aggregated stdout/stderr.
- Optional Bridge events for start/finish/deny.

## Output caps

- Cap combined stdout+stderr at **200k** ; keep **tail 20k** for events.
- Truncate with a clear suffix (e.g., `"… (truncated)"`).

## Slash commands

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- Per-agent, per-session overrides ; non-persistent unless saved via config.
- `/elevated on|off|ask|full` remains a shortcut for `host=gateway security=full` (with `full` skipping approvals).

## Cross-platform story

- The runner service is the portable execution target.
- UI is optional ; if missing, `askFallback` applies.
- Windows/Linux support the same approvals JSON + socket protocol.

## Implementation phases

### Phase 1 : config + exec routing

- Add config schema for `exec.host`, `exec.security`, `exec.ask`, `exec.node`.
- Update tool plumbing to respect `exec.host`.
- Add `/exec` slash command and keep `/elevated` alias.

### Phase 2 : approvals store + gateway enforcement

- Implement `exec-approvals.json` reader/writer.
- Enforce allowlist + ask modes for `gateway` host.
- Add output caps.

### Phase 3 : node runner enforcement

- Mettre à jour le node runner pour appliquer la liste d'autorisation + demander.
- Ajouter un pont de demande via socket Unix à l'interface de l'application macOS.
- Connecter `askFallback`.

### Phase 4 : événements

- Ajouter les événements du pont nœud → passerelle pour le cycle de vie de l'exécution.
- Mapper vers `enqueueSystemEvent` pour les invites de l'agent.

### Phase 5 : finitions de l'interface utilisateur

- Application Mac : éditeur de liste d'autorisation, sélecteur par agent, interface de politique de demande.
- Contrôles de liaison de nœud (en option).

## Plan de test

- Tests unitaires : correspondance de la liste d'autorisation (glob + insensible à la casse).
- Tests unitaires : précédence de résolution de politique (paramètre d'outil → remplacement par agent → global).
- Tests d'intégration : flux de refus/autorisation/demande du node runner.
- Tests d'événements de pont : routage des événements de nœud → événement système.

## Risques ouverts

- Indisponibilité de l'interface utilisateur : s'assurer que `askFallback` est respecté.
- Commandes de longue durée : s'appuyer sur le délai d'expiration et les limites de sortie.
- Ambiguïté multi-nœud : erreur sauf en cas de liaison de nœud ou de paramètre de nœud explicite.

## Documents connexes

- [Outil d'exécution](/fr/tools/exec)
- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Nœuds](/fr/nodes)
- [Mode élevé](/fr/tools/elevated)

import en from "/components/footer/en.mdx";

<en />
