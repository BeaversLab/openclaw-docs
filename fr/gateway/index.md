---
summary: "Runbook pour le service Gateway, le cycle de vie et les opérations"
read_when:
  - Running or debugging the gateway process
title: "Gateway Runbook"
---

# Gateway runbook

Utilisez cette page pour le démarrage initial (jour-1) et les opérations courantes (jour-2) du service Gateway.

<CardGroup cols={2}>
  <Card title="Deep troubleshooting" icon="siren" href="/fr/gateway/troubleshooting">
    Diagnostics basés sur les symptômes avec des échelles de commandes exactes et des signatures de
    journal.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Guide de configuration orienté tâche + référence complète de la configuration.
  </Card>
  <Card title="Secrets management" icon="key-round" href="/fr/gateway/secrets">
    Contrat SecretRef, comportement de l'instantané d'exécution et opérations de
    migration/rechargement.
  </Card>
  <Card title="Secrets plan contract" icon="shield-check" href="/fr/gateway/secrets-plan-contract">
    Règles exactes de `secrets apply` cible/chemin et comportement de profil d'authentification
    référence uniquement.
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

  <Step title="Verify service health">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

Ligne de base saine : `Runtime: running` et `RPC probe: ok`.

  </Step>

  <Step title="Validate channel readiness">

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
  - API HTTP, compatibles OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interface de contrôle et crochets (hooks)
- Mode de liaison par défaut : `loopback`.
- L'authentification est requise par défaut (`gateway.auth.token` / `gateway.auth.password`, ou `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

## Points de terminaison compatibles OpenAI

La surface de compatibilité la plus à fort impact de OpenClaw est désormais :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

Pourquoi cet ensemble est important :

- La plupart des intégrations Open WebUI, LobeChat et LibreChatt interrogent d'abord `/v1/models`.
- De nombreux pipelines RAG et de mémoire s'attendent à `/v1/embeddings`.
- Les clients natifs pour les agents préfèrent de plus en plus `/v1/responses`.

Note de planification :

- `/v1/models` est prioritaire aux agents : il renvoie `openclaw`, `openclaw/default` et `openclaw/<agentId>`.
- `openclaw/default` est l'alias stable qui correspond toujours à l'agent par défaut configuré.
- Utilisez `x-openclaw-model` lorsque vous souhaitez un remplacement du fournisseur/model backend ; sinon, le model et la configuration d'intégration normaux de l'agent sélectionné restent en vigueur.

Tous ces éléments s'exécutent sur le port principal du Gateway et utilisent la même limite d'authentification opérateur de confiance que le reste de l'Gateway HTTP du API.

### Priorité du port et de la liaison

| Paramètre       | Ordre de résolution                                           |
| --------------- | ------------------------------------------------------------- |
| Port Gateway    | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Mode de liaison | CLI/remplacement → `gateway.bind` → `loopback`                |

### Modes de rechargement à chaud

| `gateway.reload.mode` | Comportement                                                   |
| --------------------- | -------------------------------------------------------------- |
| `off`                 | Aucun rechargement de la configuration                         |
| `hot`                 | Appliquer uniquement les modifications sécurisées à chaud      |
| `restart`             | Redémarrer en cas de modifications nécessitant un rechargement |
| `hybrid` (par défaut) | Application à chaud si sécurisé, redémarrage si nécessaire     |

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
  l'authentification (`token`/`password`), même via des tunnels SSH.
</Warning>

Voir : [Passerelle distante](/fr/gateway/remote), [Authentification](/fr/gateway/authentication), [Gateway](/fr/gateway/tailscale).

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

Les étiquettes LaunchAgent sont `ai.openclaw.gateway` (par défaut) ou `ai.openclaw.<profile>` (profil nommé). `openclaw doctor` audit et répare la dérive de configuration du service.

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

## Plusieurs passerelles sur un même hôte

La plupart des configurations devraient exécuter **une seule** Gateway.
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

Voir : [Plusieurs passerelles](/fr/gateway/multiple-gateways).

### Chemin rapide pour le profil Dev

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Les valeurs par défaut incluent un état/une configuration isolés et le port de passerelle de base `19001`.

## Référence rapide du protocole (vue opérateur)

- La première trame du client doit être `connect`.
- La Gateway renvoie un instantané `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, limites/stratégie).
- Requêtes : `req(method, params)` → `res(ok/payload|error)`.
- Événements courants : `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Les exécutions de l'agent se font en deux étapes :

1. Accusé de réception accepté immédiat (`status:"accepted"`)
2. Réponse d'achèvement finale (`status:"ok"|"error"`), avec des événements `agent` diffusés entre les deux.

Voir la documentation complète du protocole : [Gateway Protocol](/fr/gateway/protocol).

## Vérifications opérationnelles

### Liveness

- Ouvrez une WS et envoyez `connect`.
- Attendez une réponse `hello-ok` avec un instantané.

### Readiness

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Récupération des lacunes

Les événements ne sont pas rejoués. En cas de lacunes dans la séquence, actualisez l'état (`health`, `system-presence`) avant de continuer.

## Signatures de défaillance courantes

| Signature                                                      | Problème probable                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Liaison non-bouclée sans jeton/mot de passe                         |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflit de port                                                     |
| `Gateway start blocked: set gateway.mode=local`                | Configuration définie en mode distant                               |
| `unauthorized` lors de la connexion                            | Incompatibilité d'authentification entre le client et la passerelle |

Pour les échelles de diagnostic complètes, utilisez [Gateway Troubleshooting](/fr/gateway/troubleshooting).

## Garanties de sécurité

- Les clients du protocole Gateway échouent rapidement lorsque Gateway n'est pas disponible (pas de repli implicite sur le direct-channel).
- Les premières trames invalides/non-connect sont rejetées et fermées.
- L'arrêt gracieux émet un événement `shutdown` avant la fermeture du socket.

---

Connexes :

- [Troubleshooting](/fr/gateway/troubleshooting)
- [Background Process](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Health](/fr/gateway/health)
- [Doctor](/fr/gateway/doctor)
- [Authentication](/fr/gateway/authentication)

import fr from "/components/footer/fr.mdx";

<fr />
