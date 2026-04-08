---
summary: "CLI OpenClaw du Gateway CLI (`openclaw gateway`) — exécuter, interroger et découvrir les passerelles"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "gateway"
---

# Gateway CLI

Le Gateway est le serveur WebSocket d'OpenClaw (canaux, nœuds, sessions, hooks).

Les sous-commandes de cette page se trouvent sous `openclaw gateway …`.

Documentation connexe :

- [/gateway/bonjour](/en/gateway/bonjour)
- [/gateway/discovery](/en/gateway/discovery)
- [/gateway/configuration](/en/gateway/configuration)

## Exécuter le Gateway

Exécuter un processus Gateway local :

```bash
openclaw gateway
```

Alias de premier plan :

```bash
openclaw gateway run
```

Remarques :

- Par défaut, la Gateway refuse de démarrer sauf si `gateway.mode=local` est défini dans `~/.openclaw/openclaw.json`. Utilisez `--allow-unconfigured` pour les exécutions ad hoc/dev.
- `openclaw onboard --mode local` et `openclaw setup` sont censés écrire `gateway.mode=local`. Si le fichier existe mais que `gateway.mode` est manquant, considérez cela comme une configuration endommagée ou corrompue et réparez-la au lieu d'assumer implicitement le mode local.
- Si le fichier existe et que `gateway.mode` est manquant, la Gateway considère cela comme un dommage suspect de la configuration et refuse de « deviner local » pour vous.
- La liaison au-delà du loopback sans authentification est bloquée (garde de sécurité).
- `SIGUSR1` déclenche un redémarrage en cours de processus lorsqu'il est autorisé (`commands.restart` est activé par défaut ; définissez `commands.restart: false` pour bloquer le redémarrage manuel, tandis que gateway tool/config apply/update restent autorisés).
- Les gestionnaires `SIGINT`/`SIGTERM` arrêtent le processus de passerelle, mais ils ne restaurent aucun état de terminal personnalisé. Si vous enveloppez la CLI avec une TUI ou une entrée en mode brut, restaurez le terminal avant de quitter.

### Options

- `--port <port>` : port WebSocket (la valeur par défaut provient de la config/env ; généralement `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>` : mode de liaison de l'écouteur.
- `--auth <token|password>` : remplacement du mode d'authentification.
- `--token <token>` : remplacement du jeton (définit également `OPENCLAW_GATEWAY_TOKEN` pour le processus).
- `--password <password>` : remplacement du mot de passe. Avertissement : les mots de passe en ligne peuvent être exposés dans les listages de processus locaux.
- `--password-file <path>` : lire le mot de passe de la passerelle depuis un fichier.
- `--tailscale <off|serve|funnel>` : exposer le Gateway via Tailscale.
- `--tailscale-reset-on-exit` : réinitialiser la configuration serveur/funnel de Tailscale à l'arrêt.
- `--allow-unconfigured` : autoriser le démarrage du gateway sans `gateway.mode=local` dans la configuration. Cela contourne la garde de démarrage uniquement pour l'amorçage ad-hoc/dev ; cela n'écrit pas et ne répare pas le fichier de configuration.
- `--dev` : créer une configuration de dev + un espace de travail s'ils sont manquants (ignore BOOTSTRAP.md).
- `--reset` : réinitialiser la configuration de dev + les identifiants + les sessions + l'espace de travail (nécessite `--dev`).
- `--force` : tuer tout écouteur existant sur le port sélectionné avant de démarrer.
- `--verbose` : journaux détaillés.
- `--ws-log <auto|full|compact>` : style de journal websocket (par défaut `auto`).
- `--compact` : alias pour `--ws-log compact`.
- `--raw-stream` : enregistrer les événements bruts du flux de modèle dans un fichier l.
- `--raw-stream-path <path>` : chemin du l du flux brut.

## Interroger un Gateway en cours d'exécution

Toutes les commandes de requête utilisent RPC WebSocket.

Modes de sortie :

- Par défaut : lisible par l'homme (coloré dans un TTY).
- `--json` : JSON lisible par machine (sans style/indicateur d'activité).
- `--no-color` (ou `NO_COLOR=1`) : désactiver l'ANSI tout en conservant la mise en page humaine.

Options partagées (lorsque prises en charge) :

- `--url <url>` : URL WebSocket du Gateway.
- `--token <token>` : jeton du Gateway.
- `--password <password>` : mot de passe du Gateway.
- `--timeout <ms>` : délai/budget (varie par commande).
- `--expect-final` : attendre une réponse « finale » (appels d'agent).

Remarque : lorsque vous définissez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway usage-cost`

Récupérer les résumés des coûts d'utilisation à partir des journaux de session.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

Options :

- `--days <days>` : nombre de jours à inclure (par défaut `30`).

### `gateway status`

`gateway status` affiche le service Gateway (launchd/systemd/schtasks) ainsi qu'une sonde RPC facultative.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Options :

- `--url <url>` : ajoute une cible de sonde explicite. Les distants configurés + localhost sont toujours sondés.
- `--token <token>` : auth par jeton pour la sonde.
- `--password <password>` : auth par mot de passe pour la sonde.
- `--timeout <ms>` : délai d'expiration de la sonde (par défaut `10000`).
- `--no-probe` : ignore la sonde RPC (vue service uniquement).
- `--deep` : analyse également les services de niveau système.
- `--require-rpc` : renvoie une valeur non nulle lorsque la sonde RPC échoue. Ne peut pas être combiné avec `--no-probe`.

Remarques :

- `gateway status` reste disponible pour le diagnostic même lorsque la config locale CLI est manquante ou non valide.
- `gateway status` résout les SecretRefs d'auth configurés pour l'auth de la sonde lorsque cela est possible.
- Si un SecretRef d'auth requis n'est pas résolu dans ce chemin de commande, `gateway status --json` signale `rpc.authWarning` lorsque la connectivité/l'auth de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
- Si la sonde réussit, les avertissements de auth-ref non résolus sont supprimés pour éviter les faux positifs.
- Utilisez `--require-rpc` dans les scripts et l'automatisation lorsqu'un service d'écoute ne suffit pas et que vous avez besoin que le Gateway RPC lui-même soit en bonne santé.
- `--deep` ajoute une analyse au mieux (best-effort) pour les installations launchd/systemd/schtasks supplémentaires. Lorsque plusieurs services de type passerelle sont détectés, la sortie humaine affiche des conseils de nettoyage et avertit que la plupart des configurations doivent exécuter une passerelle par machine.
- La sortie humaine inclut le chemin du fichier journal résolu ainsi que l'instantané des chemins/validité de la config CLI-vs-service pour aider à diagnostiquer la dérive du profil ou du state-dir.
- Sur les installations systemd Linux, les vérifications de dérive d'auth de service lisent les valeurs `Environment=` et `EnvironmentFile=` de l'unité (y compris `%h`, les chemins entre guillemets, les fichiers multiples et les fichiers `-` facultatifs).
- Les vérifications de dérive résolvent les SecretRefs `gateway.auth.token` en utilisant l'environnement d'exécution fusionné (environnement de commande de service en premier, puis repli vers l'environnement de processus).
- Si l'authentification par jeton n'est pas effectivement active (valeur explicite `gateway.auth.mode` de `password`/`none`/`trusted-proxy`, ou mode non défini où le mot de passe peut l'emporter et aucun candidat jeton ne peut l'emporter), les vérifications de dérive de jeton ignorent la résolution du jeton de configuration.

### `gateway probe`

`gateway probe` est la commande « tout déboguer ». Elle sonde toujours :

- votre passerelle distante configurée (si définie), et
- localhost (boucle locale) **même si une passerelle distante est configurée**.

Si vous passez `--url`, cette cible explicite est ajoutée avant les deux. La sortie humaine étiquette les cibles comme :

- `URL (explicit)`
- `Remote (configured)` ou `Remote (configured, inactive)`
- `Local loopback`

Si plusieurs passerelles sont accessibles, elle les imprime toutes. Plusieurs passerelles sont prises en charge lorsque vous utilisez des profils/ports isolés (par exemple, un robot de secours), mais la plupart des installations exécutent encore une seule passerelle.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interprétation :

- `Reachable: yes` signifie qu'au moins une cible a accepté une connexion WebSocket.
- `RPC: ok` signifie que les appels RPC détaillés (`health`/`status`/`system-presence`/`config.get`) ont également réussi.
- `RPC: limited - missing scope: operator.read` signifie que la connexion a réussi mais que le RPC détaillé est limité en portée. Ceci est signalé comme une accessibilité **dégradée**, et non comme un échec total.
- Le code de sortie est non nul uniquement lorsqu'aucune cible sondée n'est accessible.

Notes JSON (`--json`) :

- Niveau supérieur :
  - `ok` : au moins une cible est accessible.
  - `degraded` : au moins une cible avait un RPC détaillé limité en portée.
  - `primaryTargetId` : meilleure cible à traiter comme le gagnant actuel dans cet ordre : URL explicite, tunnel SSH, distant configuré, puis boucle locale.
  - `warnings[]` : enregistrements d'avertissement de meilleure tentative avec `code`, `message` et `targetIds` optionnel.
  - `network` : indices d'URL de boucle locale/tailnet dérivés de la configuration actuelle et du réseau de l'hôte.
  - `discovery.timeoutMs` et `discovery.count` : le budget de découverte/nombre de résultats réel utilisé pour ce passage de sonde.
- Par cible (`targets[].connect`) :
  - `ok` : accessibilité après connexion + classification dégradée.
  - `rpcOk` : succès du RPC avec tous les détails.
  - `scopeLimited` : échec du RPC de détail en raison d'une portée d'opérateur manquante.

Codes d'avertissement courants :

- `ssh_tunnel_failed` : la configuration du tunnel SSH a échoué ; la commande est revenue à des sondes directes.
- `multiple_gateways` : plus d'une cible était accessible ; c'est inhabituel sauf si vous exécutez intentionnellement des profils isolés, comme un robot de secours.
- `auth_secretref_unresolved` : un SecretRef d'authentification configuré n'a pas pu être résolu pour une cible ayant échoué.
- `probe_scope_limited` : la connexion WebSocket a réussi, mais le RPC de détail a été limité par un `operator.read` manquant.

#### À distance via SSH (parité avec l'application Mac)

Le mode « À distance via SSH » de l'application macOS utilise un transfert de port local afin que la passerelle distante (qui peut être liée uniquement à la boucle locale) devienne accessible à `ws://127.0.0.1:<port>`.

Équivalent CLI :

```bash
openclaw gateway probe --ssh user@gateway-host
```

Options :

- `--ssh <target>` : `user@host` ou `user@host:port` (le port par défaut est `22`).
- `--ssh-identity <path>` : fichier d'identité.
- `--ssh-auto` : choisir le premier hôte de passerelle découvert comme cible SSH à partir du point de terminaison de découverte résolu (`local.` plus le domaine étendu configuré, le cas échéant). Les indices TXT uniquement sont ignorés.

Configuration (facultatif, utilisé comme valeurs par défaut) :

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Assistant RPC de bas niveau.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

Options :

- `--params <json>` : chaîne d'objet JSON pour les paramètres (par défaut `{}`)
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

Notes :

- `--params` doit être un JSON valide.
- `--expect-final` est principalement destiné aux RPC de type agent qui diffusent des événements intermédiaires avant une charge utile finale.

## Gérer le service Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

Options de commande :

- `gateway status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `gateway install` : `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `gateway uninstall|start|stop|restart` : `--json`

Remarques :

- `gateway install` prend en charge `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `gateway install` vérifie que le SecretRef est résoluble mais ne conserve pas le jeton résolu dans les métadonnées de l'environnement du service.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'installation échoue de manière fermée au lieu de conserver un texte en clair de secours.
- Pour l'authentification par mot de passe sur `gateway run`, préférez `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` ou un `gateway.auth.password` basé sur SecretRef plutôt que le `--password` en ligne.
- En mode d'authentification déduit, le `OPENCLAW_GATEWAY_PASSWORD` uniquement pour le shell ne relâche pas les exigences du jeton d'installation ; utilisez une configuration durable (`gateway.auth.password` ou fichier de configuration `env`) lors de l'installation d'un service géré.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.
- Les commandes de cycle de vie acceptent `--json` pour les scripts.

## Découvrir les passerelles (Bonjour)

`gateway discover` recherche les balises Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD : `local.`
- Unicast DNS-SD (Wide-Area Bonjour) : choisissez un domaine (exemple : `openclaw.internal.`) et configurez un DNS fractionné + un serveur DNS ; voir [/gateway/bonjour](/en/gateway/bonjour)

Seules les passerelles avec la découverte Bonjour activée (par défaut) annoncent la balise.

Les enregistrements de découverte Wide-Area incluent (TXT) :

- `role` (indication de rôle de passerelle)
- `transport` (indication de transport, par ex. `gateway`)
- `gatewayPort` (port WebSocket, généralement `18789`)
- `sshPort` (optionnel ; les clients définissent par défaut les cibles SSH sur `22` en son absence)
- `tailnetDns` (nom d'hôte MagicDNS, si disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS activé + empreinte de certificat)
- `cliPath` (indication d'installation à distance écrite dans la zone Wide-Area)

### `gateway discover`

```bash
openclaw gateway discover
```

Options :

- `--timeout <ms>` : délai d'expiration par commande (parcourir/résoudre) ; par défaut `2000`.
- `--json` : sortie lisible par machine (désactive également le style/la barre de progression).

Exemples :

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

Notes :

- Le CLI analyse `local.` ainsi que le domaine Wide-Area configuré lorsqu'un est activé.
- `wsUrl` dans la sortie JSON est dérivé du point de terminaison de service résolu, et non des indications
  TXT uniquement telles que `lanHost` ou `tailnetDns`.
- Sur mDNS `local.`, `sshPort` et `cliPath` sont diffusés uniquement lorsque
  `discovery.mdns.mode` est `full`. Le DNS-SD Wide-Area écrit toujours `cliPath` ; `sshPort`
  reste également facultatif.
