---
summary: "Plan de refonte : routage de l'hôte d'exécution, approbations de nœud et runner sans interface"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "Refonte de l'hôte d'exécution"
---

# Plan de refonte de l'hôte d'exécution

## Objectifs

- Ajouter `exec.host` + `exec.security` pour router l'exécution sur le **bac à sable (sandbox)**, la **passerelle (gateway)** et le **nœud**.
- Garder les valeurs par défaut **sûres** : pas d'exécution entre hôtes sauf si explicitement activée.
- Séparer l'exécution en un **service runner sans interface** avec une UI optionnelle (application macOS) via IPC local.
- Fournir une politique **par agent**, une liste d'autorisation, un mode de demande et une liaison de nœud.
- Prendre en charge les **modes de demande** qui fonctionnent _avec_ ou _sans_ listes d'autorisation.
- Multiplateforme : socket Unix + auth par jeton (parité macOS/Linux/Windows).

## Hors objectifs

- Pas de migration de liste d'autorisation héritée ni de prise en charge de schéma hérité.
- Pas de PTY/streaming pour l'exécution de nœud (sortie agrégée uniquement).
- Pas de nouvelle couche réseau au-delà du Bridge et de la Gateway existants.

## Décisions (verrouillées)

- **Clés de configuration :** `exec.host` + `exec.security` (remplacement par agent autorisé).
- **Élévation :** conserver `/elevated` comme alias pour l'accès complet à la passerelle.
- **Demande par défaut :** `on-miss`.
- **Stockage des approbations :** `~/.openclaw/exec-approvals.json` (JSON, aucune migration héritée).
- **Runner :** service système sans interface ; l'application UI héberge un socket Unix pour les approbations.
- **Identité du nœud :** utiliser `nodeId` existant.
- **Auth socket :** socket Unix + jeton (multiplateforme) ; séparation ultérieure si nécessaire.
- **État de l'hôte du nœud :** `~/.openclaw/node.json` (id de nœud + jeton d'appairage).
- **Hôte d'exécution macOS :** exécuter `system.run` à l'intérieur de l'application macOS ; le service d'hôte de nœud transmet les requêtes via IPC local.
- **Pas d'assistant XPC :** s'en tenir au socket Unix + jeton + vérifications des pairs.

## Concepts clés

### Hôte

- `sandbox` : exec Docker (comportement actuel).
- `gateway` : exec sur l'hôte de la passerelle.
- `node` : exec sur le runner de nœud via Bridge (`system.run`).

### Mode de sécurité

- `deny` : toujours bloquer.
- `allowlist` : autoriser uniquement les correspondances.
- `full` : tout autoriser (équivalent à élevé).

### Mode de demande

- `off` : ne jamais demander.
- `on-miss` : demander uniquement lorsque la liste d'autorisation ne correspond pas.
- `always` : demander à chaque fois.

La demande est **indépendante** de la liste d'autorisation ; la liste d'autorisation peut être utilisée avec `always` ou `on-miss`.

### Résolution de stratégie (par exécution)

1. Résoudre `exec.host` (paramètre de l'outil → substitution de l'agent → valeur par défaut globale).
2. Résoudre `exec.security` et `exec.ask` (même priorité).
3. Si l'hôte est `sandbox`, procéder à l'exécution dans le bac à sable local.
4. Si l'hôte est `gateway` ou `node`, appliquer la stratégie de sécurité + de demande sur cet hôte.

## Sécurité par défaut

- `exec.host = sandbox` par défaut.
- `exec.security = deny` par défaut pour `gateway` et `node`.
- `exec.ask = on-miss` par défaut (pertinent uniquement si la sécurité l'autorise).
- Si aucune liaison de nœud n'est définie, **l'agent peut cibler n'importe quel nœud**, mais uniquement si la stratégie l'autorise.

## Surface de configuration

### Paramètres de l'outil

- `exec.host` (facultatif) : `sandbox | gateway | node`.
- `exec.security` (facultatif) : `deny | allowlist | full`.
- `exec.ask` (facultatif) : `off | on-miss | always`.
- `exec.node` (facultatif) : id/nom du nœud à utiliser lorsque `host=node`.

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

## Magasin d'approbations (JSON)

Chemin : `~/.openclaw/exec-approvals.json`

Objectif :

- Stratégie locale + listes d'autorisation pour l'**hôte d'exécution** (passerelle ou node runner).
- Repli (fallback) Ask (Demander) lorsque aucune interface utilisateur n'est disponible.
- Identifiants IPC pour les clients de l'interface utilisateur.

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

- Aucun format de liste d'autorisation hérité.
- `askFallback` s'applique uniquement lorsque `ask` est requis et qu'aucune interface utilisateur n'est joignable.
- Autorisations de fichier : `0600`.

## Service d'exécution (headless)

### Rôle

- Appliquer `exec.security` + `exec.ask` localement.
- Exécuter les commandes système et renvoyer la sortie.
- Émettre des événements Bridge pour le cycle de vie de l'exécution (facultatif mais recommandé).

### Cycle de vie du service

- Launchd/démon sur macOS ; service système sur Linux/Windows.
- Le JSON d'approbations est local à l'hôte d'exécution.
- L'interface utilisateur héberge un socket Unix local ; les exécuteurs se connectent à la demande.

## Intégration de l'interface utilisateur (application macOS)

### IPC

- Socket Unix à `~/.openclaw/exec-approvals.sock` (0600).
- Jeton stocké dans `exec-approvals.json` (0600).
- Vérifications des pairs : même UID uniquement.
- Défi/réponse : nonce + HMAC(jeton, hash de requête) pour empêcher la relecture.
- TTL court (ex. : 10 s) + charge utile maximale + limite de débit.

### Flux Ask (Demander) (hôte d'exécution de l'application macOS)

1. Le service de nœud reçoit `system.run` de la passerelle.
2. Le service de nœud se connecte au socket local et envoie la requête d'invite/de commande.
3. L'application valide le pair + le jeton + HMAC + TTL, puis affiche la boîte de dialogue si nécessaire.
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

- Utiliser l'`nodeId` existant issu du jumelage Bridge.
- Modèle de liaison :
  - `tools.exec.node` limite l'agent à un nœud spécifique.
  - Si non défini, l'agent peut choisir n'importe quel nœud (la stratégie applique toujours les valeurs par défaut).
- Résolution de la sélection de nœud :
  - `nodeId` correspondance exacte
  - `displayName` (normalisé)
  - `remoteIp`
  - préfixe `nodeId` (>= 6 caractères)

## Gestion d'événements

### Qui voit les événements

- Les événements système sont **par session** et sont affichés à l'agent lors de la prochaine invite.
- Stockés dans la file d'attente en mémoire du Gateway (`enqueueSystemEvent`).

### Texte de l'événement

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + fin de sortie facultative
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### Transport

Option A (recommandée) :

- Le Runner envoie des trames Bridge `event` `exec.started` / `exec.finished`.
- Le Gateway `handleBridgeEvent` les mappe vers `enqueueSystemEvent`.

Option B :

- Le tool Gateway `exec` gère le cycle de vie directement (synchrone uniquement).

## Flux d'exécution

### Hôte Sandbox

- Comportement existant de `exec` (Docker ou hôte lorsqu'il n'est pas dans un bac à sable).
- PTY pris en charge en mode non-bac à sable uniquement.

### Hôte Gateway

- Le processus Gateway s'exécute sur sa propre machine.
- Applique le `exec-approvals.json` local (sécurité/demande/liste blanche).

### Hôte Node

- Le Gateway appelle `node.invoke` avec `system.run`.
- Le Runner applique les approbations locales.
- Le Runner renvoie le stdout/stderr agrégé.
- Événements Bridge facultatifs pour début/fin/refus.

## Limites de sortie

- Limiter le stdout+stderr combiné à **200k** ; conserver les **derniers 20k** pour les événements.
- Tronquer avec un suffixe clair (par exemple, `"… (truncated)"`).

## Commandes slash

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- Remplacements par agent, par session ; non persistants sauf s'ils sont sauvegardés via la configuration.
- `/elevated on|off|ask|full` reste un raccourci pour `host=gateway security=full` (avec `full` ignorant les approbations).

## Histoire multiplateforme

- Le service Runner est la cible d'exécution portable.
- L'interface utilisateur est facultative ; si elle est manquante, `askFallback` s'applique.
- Windows/Linux prennent en charge le même protocole JSON d'approbations + socket.

## Phases de mise en œuvre

### Phase 1 : configuration + routage exec

- Ajouter le schéma de configuration pour `exec.host`, `exec.security`, `exec.ask`, `exec.node`.
- Mettre à jour la plomberie de l'outil pour respecter `exec.host`.
- Ajouter la commande slash `/exec` et conserver l'alias `/elevated`.

### Phase 2 : magasin d'approbations + application de la passerelle

- Implémenter le lecteur/rédacteur `exec-approvals.json`.
- Appliquer les modes liste verte (allowlist) + demander pour l'hôte `gateway`.
- Ajouter des limites de sortie.

### Phase 3 : application du node runner

- Mettre à jour le node runner pour appliquer la liste verte + demander.
- Ajouter le pont de prompt de socket Unix à l'interface utilisateur de l'application macOS.
- Câbler `askFallback`.

### Phase 4 : événements

- Ajouter des événements Bridge node → passerelle pour le cycle de vie de l'exécution.
- Mapper vers `enqueueSystemEvent` pour les invites de l'agent.

### Phase 5 : finition de l'interface utilisateur

- Application Mac : éditeur de liste verte, sélecteur par agent, interface utilisateur de stratégie de demande.
- Contrôles de liaison de nœud (en option).

## Plan de test

- Tests unitaires : correspondance de liste verte (glob + insensible à la casse).
- Tests unitaires : précédence de résolution de stratégie (paramètre d'outil → remplacement par l'agent → global).
- Tests d'intégration : flux de refus/autorisation/demande du node runner.
- Tests d'événements Bridge : routage des événements de nœud → événement système.

## Risques ouverts

- Indisponibilité de l'interface utilisateur : veiller à ce que `askFallback` soit respecté.
- Commandes de longue durée : s'appuyer sur le délai d'expiration + les limites de sortie.
- Ambiguïté multi-nœud : erreur sauf en cas de liaison de nœud ou de paramètre de nœud explicite.

## Documentation connexe

- [Outil Exec](/fr/tools/exec)
- [Approbations Exec](/fr/tools/exec-approvals)
- [Nœuds](/fr/nodes)
- [Mode élevé](/fr/tools/elevated)
