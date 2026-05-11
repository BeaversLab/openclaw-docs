---
summary: "Runbook pour le service Gateway, le cycle de vie et les opérations"
read_when:
  - Running or debugging the gateway process
title: "Runbook du Gateway"
---

Utilisez cette page pour le démarrage initial (day-1) et les opérations courantes (day-2) du service Gateway.

<CardGroup cols={2}>
  <Card title="Dépannage approfondi" icon="siren" href="/fr/gateway/troubleshooting">
    Diagnostics basés sur les symptômes avec des échelons de commandes exacts et des signatures de journal.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Guide de configuration orienté tâche + référence de configuration complète.
  </Card>
  <Card title="Gestion des secrets" icon="key-round" href="/fr/gateway/secrets">
    Contrat SecretRef, comportement de l'instantané d'exécution et opérations de migration/rechargement.
  </Card>
  <Card title="Contrat de plan de secrets" icon="shield-check" href="/fr/gateway/secrets-plan-contract">
    Règles exactes de `secrets apply` chemin/cible et comportement du profil d'authentification en référence seule.
  </Card>
</CardGroup>

## Démarrage local en 5 minutes

<Steps>
  <Step title="Démarrer le Gateway">

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

Ligne de base saine : `Runtime: running`, `Connectivity probe: ok` et `Capability: ...` correspondant à vos attentes. Utilisez `openclaw gateway status --require-rpc` lorsque vous avez besoin d'une preuve RPC de portée de lecture, et pas seulement d'accessibilité.

  </Step>

  <Step title="Valider la disponibilité du canal">

```bash
openclaw channels status --probe
```

Avec une passerelle accessible, cela exécute des sondes de canal en direct par compte et des audits facultatifs.
Si la passerelle est inaccessible, le CLI revient par défaut à des résumés de canal basés sur la configuration au lieu de la sortie de la sonde en direct.

  </Step>
</Steps>

<Note>
  Le rechargement de la configuration du Gateway surveille le chemin d'accès actif du fichier de configuration (résolu à partir des valeurs par défaut du profil/état, ou `OPENCLAW_CONFIG_PATH` si défini). Le mode par défaut est `gateway.reload.mode="hybrid"`. Après le premier chargement réussi, le processus en cours sert l'instantané actif de la configuration en mémoire ; un rechargement réussi
  échange cet instantané de manière atomique.
</Note>

## Modèle d'exécution

- Un processus toujours actif pour le routage, le plan de contrôle et les connexions de canal.
- Port multiplexé unique pour :
  - Contrôle WebSocket / RPC
  - APIs HTTP, compatibles OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interface de contrôle et crochets (hooks)
- Mode de liaison par défaut : `loopback`.
- L'authentification est requise par défaut. Les configurations à secret partagé utilisent
  `gateway.auth.token` / `gateway.auth.password` (ou
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`), et les configurations de
  proxy inverse non en boucle locale peuvent utiliser `gateway.auth.mode: "trusted-proxy"`.

## Points de terminaison compatibles OpenAI

La surface de compatibilité la plus à fort impact de OpenClaw est désormais :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

Pourquoi cet ensemble est important :

- La plupart des intégrations Open WebUI, LobeChat et LibreChat interrogent d'abord `/v1/models`.
- De nombreux pipelines RAG et de mémoire s'attendent à `/v1/embeddings`.
- Les clients natifs pour agents préfèrent de plus en plus `/v1/responses`.

Note de planification :

- `/v1/models` est centré sur les agents : il renvoie `openclaw`, `openclaw/default` et `openclaw/<agentId>`.
- `openclaw/default` est l'alias stable qui correspond toujours à l'agent par défaut configuré.
- Utilisez `x-openclaw-model` lorsque vous souhaitez un remplacement du fournisseur/de model backend ; sinon, la configuration normale de model et d'intégration de l'agent sélectionné reste en vigueur.

Tous ces éléments s'exécutent sur le port principal du Gateway et utilisent la même limite d'authentification opérateur de confiance que le reste de l'Gateway HTTP du API.

### Priorité du port et de la liaison

| Paramètre       | Ordre de résolution                                           |
| --------------- | ------------------------------------------------------------- |
| Port Gateway    | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Mode de liaison | CLI/remplacement → `gateway.bind` → `loopback`                |

Les services Gateway installés enregistrent le `--port` résolu dans les métadonnées du superviseur. Après avoir modifié `gateway.port`, exécutez `openclaw doctor --fix` ou `openclaw gateway install --force` afin que launchd/systemd/schtasks démarre le processus sur le nouveau port.

Le démarrage de Gateway utilise le même port et la même liaison effectifs lors de l'amorçage des origines de l'interface utilisateur de contrôle locale pour les liaisons non bouclées. Par exemple, `--bind lan --port 3000`
amorce `http://localhost:3000` et `http://127.0.0.1:3000` avant l'exécution de la validation
au moment de l'exécution. Ajoutez explicitement toutes les origines de navigateur distant, telles que les URL de proxy HTTPS, à
`gateway.controlUi.allowedOrigins`.

### Modes de rechargement à chaud

| `gateway.reload.mode` | Comportement                                                   |
| --------------------- | -------------------------------------------------------------- |
| `off`                 | Pas de rechargement de configuration                           |
| `hot`                 | Appliquer uniquement les modifications sécurisées à chaud      |
| `restart`             | Redémarrer en cas de modifications nécessitant un rechargement |
| `hybrid` (par défaut) | Appliquer à chaud si possible, redémarrer si nécessaire        |

## Jeu de commandes de l'opérateur

```bash
openclaw gateway status
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` est destiné à la découverte de services supplémentaire (LaunchDaemons/unités système systemd/schtasks), et non à une sonde de santé RPC plus approfondie.

## Plusieurs passerelles (même hôte)

La plupart des installations doivent exécuter une passerelle par machine. Une passerelle unique peut héberger plusieurs agents et canaux.

Vous n'avez besoin de plusieurs passerelles que si vous souhaitez intentionnellement une isolation ou un robot de secours.

Vérifications utiles :

```bash
openclaw gateway status --deep
openclaw gateway probe
```

À prévoir :

- `gateway status --deep` peut signaler `Other gateway-like services detected (best effort)`
  et imprimer des conseils de nettoyage lorsque des installations launchd/systemd/schtasks périmées sont encore présentes.
- `gateway probe` peut avertir concernant `multiple reachable gateways` lorsque plus d'une cible
  répond.
- Si c'est intentionnel, isolez les ports, la configuration/l'état et les racines de l'espace de travail par passerelle.

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

Configuration détaillée : [/gateway/multiple-gateways](/fr/gateway/multiple-gateways).

## Point de terminaison du cerveau en temps réel VoiceClaw

OpenClaw expose un point de terminaison WebSocket en temps réel compatible VoiceClaw à l'adresse `/voiceclaw/realtime`. Utilisez-le lorsqu'un client de bureau VoiceClaw doit communiquer directement avec un cerveau OpenClaw en temps réel au lieu de passer par un processus de relais séparé.

Le point de terminaison utilise Gemini Live pour l'audio en temps réel et appelle OpenClaw en tant que cerveau en exposant directement les outils OpenClaw à Gemini Live. Les appels d'outils renvoient un résultat `working` immédiat pour garder le tour de parole vocal réactif, puis OpenClaw exécute l'outil réel de manière asynchrone et réinjecte le résultat dans la session en direct. Définissez `GEMINI_API_KEY` dans l'environnement du processus de passerelle. Si l'authentification de la passerelle est activée, le client de bureau envoie le jeton ou le mot de passe de la passerelle dans son premier message `session.config`.

L'accès au cerveau en temps réel exécute des commandes de l'agent OpenClaw autorisées par le propriétaire. Gardez `gateway.auth.mode: "none"` limité aux instances de test en boucle locale uniquement. Les connexions au cerveau en temps réel non locales nécessitent une authentification de la passerelle.

Pour une passerelle de test isolée, exécutez une instance distincte avec son propre port, sa configuration et son état :

```bash
OPENCLAW_CONFIG_PATH=/path/to/openclaw-realtime/openclaw.json \
OPENCLAW_STATE_DIR=/path/to/openclaw-realtime/state \
OPENCLAW_SKIP_CHANNELS=1 \
GEMINI_API_KEY=... \
openclaw gateway --port 19789
```

Configurez ensuite VoiceClaw pour utiliser :

```text
ws://127.0.0.1:19789/voiceclaw/realtime
```

## Accès à distance

Préférence : Tailscale/VPN.
Solution de repli : Tunnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Connectez ensuite les clients localement à `ws://127.0.0.1:18789`.

<Warning>Les tunnels SSH ne contournent pas l'authentification de la passerelle. Pour l'authentification par secret partagé, les clients doivent toujours envoyer `token`/`password` même via le tunnel. Pour les modes portant une identité, la demande doit toujours satisfaire ce chemin d'authentification.</Warning>

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

Utilisez `openclaw gateway restart` pour les redémarrages. Ne chaînez pas `openclaw gateway stop` et `openclaw gateway start` ; sur macOS, `gateway stop` désactive intentionnellement le LaunchAgent avant de l'arrêter.

Les étiquettes LaunchAgent sont `ai.openclaw.gateway` (par défaut) ou `ai.openclaw.<profile>` (profil nommé). `openclaw doctor` audite et répare la dérive de configuration du service.

  </Tab>

  <Tab title="Linux (utilisateur systemd)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

Pour la persistance après la déconnexion, activez le mode persistant (lingering) :

```bash
sudo loginctl enable-linger <user>
```

Exemple manuel d'unité utilisateur lorsque vous avez besoin d'un chemin d'installation personnalisé :

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (natif)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

Le démarrage géré natif Windows utilise une tâche planifiée nommée `OpenClaw Gateway`
(ou `OpenClaw Gateway (<profile>)` pour les profils nommés). Si la création de la tâche planifiée
est refusée, OpenClaw se rabat sur un lanceur de dossier Démarrage par utilisateur
qui pointe vers `gateway.cmd` dans le répertoire d'état.

  </Tab>

  <Tab title="Linux (system service)">

Utilisez une unité système pour les hôtes multi-utilisateurs/toujours actifs.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

Utilisez le même corps de service que l'unité utilisateur, mais installez-le sous
`/etc/systemd/system/openclaw-gateway[-<profile>].service` et ajustez
`ExecStart=` si votre binaire `openclaw` se trouve ailleurs.

N'autorisez pas non plus `openclaw doctor --fix` à installer un service de passerelle au niveau utilisateur pour le même profil/port. Doctor refuse cette installation automatique lorsqu'il détecte un service de passerelle OpenClaw au niveau système ; utilisez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsque l'unité système possède le cycle de vie.

  </Tab>
</Tabs>

## Chemin rapide pour le profil Dev

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Les valeurs par défaut incluent un état/une configuration isolés et le port de passerelle de base `19001`.

## Référence rapide du protocole (vue opérateur)

- La première trame client doit être `connect`.
- Gateway renvoie un `hello-ok` snapshot (`presence`, `health`, `stateVersion`, `uptimeMs`, limites/stratégie).
- `hello-ok.features.methods` / `events` constituent une liste de découverte conservatrice, et non
  une vidange générée de chaque route d'assistant appelable.
- Requêtes : `req(method, params)` → `res(ok/payload|error)`.
- Les événements courants incluent `connect.challenge`, `agent`, `chat`,
  `session.message`, `session.tool`, `sessions.changed`, `presence`, `tick`,
  `health`, `heartbeat`, les événements de cycle de vie d'appariement/approbation, et `shutdown`.

Les exécutions de l'agent se déroulent en deux étapes :

1. Accusé de réception immédiat accepté (`status:"accepted"`)
2. Réponse d'achèvement finale (`status:"ok"|"error"`), avec des événements `agent` diffusés entre les deux.

Voir la documentation complète du protocole : [Protocole Gateway](/fr/gateway/protocol).

## Vérifications opérationnelles

### Disponibilité

- Ouvrez une connexion WS et envoyez `connect`.
- Attendez une réponse `hello-ok` avec un instantané.

### Prêt

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Récupération des écarts

Les événements ne sont pas rejoués. En cas d'écarts de séquence, actualisez l'état (`health`, `system-presence`) avant de continuer.

## Signatures de défaillance courantes

| Signature                                                      | Problème probable                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Liaison non bouclée sans chemin d'authentification passerelle valide                                                |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflit de port                                                                                                     |
| `Gateway start blocked: set gateway.mode=local`                | Configuration définie en mode distant, ou l'horodatage du mode local est manquant dans une configuration endommagée |
| `unauthorized` lors de la connexion                            | Inadéquation de l'authentification entre le client et la passerelle                                                 |

Pour des échelles de diagnostic complètes, utilisez [Gateway Dépannage](/fr/gateway/troubleshooting).

## Garanties de sécurité

- Les clients du protocole Gateway échouent rapidement lorsque Gateway n'est pas disponible (pas de repli implicite sur le canal direct).
- Les premières trames invalides ou non connectées sont rejetées et fermées.
- L'arrêt progressif émet l'événement `shutdown` avant la fermeture du socket.

---

En relation :

- [Dépannage](/fr/gateway/troubleshooting)
- [Processus en arrière-plan](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Santé](/fr/gateway/health)
- [Docteur](/fr/gateway/doctor)
- [Authentification](/fr/gateway/authentication)

## En relation

- [Configuration](/fr/gateway/configuration)
- [Gateway troubleshooting](/fr/gateway/troubleshooting)
- [Accès à distance](/fr/gateway/remote)
- [Gestion des secrets](/fr/gateway/secrets)
