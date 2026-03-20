---
summary: "Runbook pour le service Gateway, son cycle de vie et ses opérations"
read_when:
  - Exécution ou débogage du processus gateway
title: "Runbook Gateway"
---

# Gateway runbook

Utilisez cette page pour le démarrage initial (jour-1) et les opérations courantes (jour-2) du service Gateway.

<CardGroup cols={2}>
  <Card title="Dépannage approfondi" icon="siren" href="/fr/gateway/troubleshooting">
    Diagnostic basé sur les symptômes avec des échelles de commandes exactes et des signatures de
    journal.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Guide de configuration orienté tâche + référence complète.
  </Card>
  <Card title="Gestion des secrets" icon="key-round" href="/fr/gateway/secrets">
    Contrat SecretRef, comportement d'instantané d'exécution et opérations de
    migration/rechargement.
  </Card>
  <Card
    title="Contrat de plan de secrets"
    icon="shield-check"
    href="/fr/gateway/secrets-plan-contract"
  >
    Règles exactes de cible/chemin `secrets apply` et comportement de profil d'auth ref-only.
  </Card>
</CardGroup>

## Démarrage local en 5 minutes

<Steps>
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="Vérifier l'état du service">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

Référence saine : `Runtime: running` et `RPC probe: ok`.

  </Step>

  <Step title="Valider la disponibilité du channel">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>
  Le rechargement de la configuration du Gateway surveille le chemin du fichier de configuration
  actif (résolu à partir des valeurs par défaut du profil/état, ou `OPENCLAW_CONFIG_PATH` si
  défini). Le mode par défaut est `gateway.reload.mode="hybrid"`.
</Note>

## Modèle d'exécution

- Un processus toujours actif pour le routage, le plan de contrôle et les connexions de canal.
- Port multiplexé unique pour :
  - Contrôle WebSocket / RPC
  - API HTTP (compatibles OpenAI, Réponses, appel d'outils)
  - Interface de contrôle et crochets (hooks)
- Mode de liaison par défaut : `loopback`.
- L'authentification est requise par défaut (`gateway.auth.token` / `gateway.auth.password`, ou `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

### Priorité de port et de liaison

| Paramètre       | Ordre de résolution                                           |
| --------------- | ------------------------------------------------------------- |
| Port Gateway    | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Mode de liaison | CLI/override → `gateway.bind` → `loopback`                    |

### Modes de rechargement à chaud

| `gateway.reload.mode` | Comportement                                                   |
| --------------------- | -------------------------------------------------------------- |
| `off`                 | Pas de rechargement de config                                  |
| `hot`                 | Appliquer uniquement les modifications sécurisées à chaud      |
| `restart`             | Redémarrer en cas de modifications nécessitant un rechargement |
| `hybrid` (par défaut) | Appliquer à chaud si sécurisé, redémarrer si nécessaire        |

## Ensemble de commandes de l'opérateur

```bash
openclaw gateway status
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

## Accès à distance

Préféré : Tailscale/VPN.
Alternative : Tunnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Connectez ensuite les clients localement à `ws://127.0.0.1:18789`.

<Warning>
  Si l'authentification de la passerelle est configurée, les clients doivent toujours envoyer
  l'authentification (`token`/`password`) même via des tunnels SSH.
</Warning>

Voir : [Remote Gateway](/fr/gateway/remote), [Authentication](/fr/gateway/authentication), [Tailscale](/fr/gateway/tailscale).

## Supervision et cycle de vie du service

Utilisez des exécutions supervisées pour une fiabilité de type production.

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

Les labels LaunchAgent sont `ai.openclaw.gateway` (par défaut) ou `ai.openclaw.<profile>` (profil nommé). `openclaw doctor` audit et répare les dérives de configuration du service.

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

Pour la persistance après la déconnexion, activez le mode persistant (lingering) :

```bash
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (system service)">

Utilisez une unité système pour les hôtes multi-utilisateurs/toujours actifs.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## Plusieurs passerelles sur un seul hôte

La plupart des configurations devraient exécuter **un seul** Gateway.
Utilisez-en plusieurs uniquement pour une isolation/redondance stricte (par exemple, un profil de secours).

Liste de contrôle par instance :

- `gateway.port` unique
- `OPENCLAW_CONFIG_PATH` unique
- `OPENCLAW_STATE_DIR` unique
- `agents.defaults.workspace` unique

Exemple :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

Voir : [Multiple gateways](/fr/gateway/multiple-gateways).

### Accès rapide au profil Dev

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Les valeurs par défaut incluent un état/une configuration isolés et le port de passerelle de base `19001`.

## Référence rapide du protocole (vue opérateur)

- La première trame client doit être `connect`.
- Le Gateway renvoie un instantané `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, limites/stratégie).
- Requêtes : `req(method, params)` → `res(ok/payload|error)`.
- Événements courants : `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Les exécutions de l'agent se déroulent en deux étapes :

1. Accusé de réception immédiat accepté (`status:"accepted"`)
2. Réponse d'achèvement finale (`status:"ok"|"error"`), avec des événements `agent` diffusés entre les deux.

Voir la documentation complète du protocole : [Gateway Protocol](/fr/gateway/protocol).

## Vérifications opérationnelles

### Vivacité

- Ouvrir WS et envoyer `connect`.
- Attendre une réponse `hello-ok` avec un instantané.

### Préparation

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Récupération des lacunes

Les événements ne sont pas rejoués. En cas d'écarts de séquence, rafraîchir l'état (`health`, `system-presence`) avant de continuer.

## Signatures de défaillance courantes

| Signature                                                      | Problème probable                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Liaison non bouclée sans jeton/mot de passe                         |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflit de port                                                     |
| `Gateway start blocked: set gateway.mode=local`                | Configuration définie sur le mode distant                           |
| `unauthorized` lors de la connexion                            | Inadéquation de l'authentification entre le client et la passerelle |

Pour les échelles de diagnostic complètes, utilisez [Gateway Troubleshooting](/fr/gateway/troubleshooting).

## Garanties de sécurité

- Les clients du protocole Gateway échouent rapidement lorsque Gateway n'est pas disponible (pas de repli implicite sur le canal direct).
- Les premières trames non valides ou non connectées sont rejetées et fermées.
- L'arrêt progressif émet un événement `shutdown` avant la fermeture du socket.

---

En relation :

- [Dépannage](/fr/gateway/troubleshooting)
- [Processus en arrière-plan](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Santé](/fr/gateway/health)
- [Docteur](/fr/gateway/doctor)
- [Authentification](/fr/gateway/authentication)

import fr from "/components/footer/fr.mdx";

<fr />
