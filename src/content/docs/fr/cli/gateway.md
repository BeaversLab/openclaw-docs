---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — exécuter, interroger et découvrir les gateways"
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

- [/gateway/bonjour](/fr/gateway/bonjour)
- [/gateway/discovery](/fr/gateway/discovery)
- [/gateway/configuration](/fr/gateway/configuration)

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

- Par défaut, le Gateway refuse de démarrer sauf si `gateway.mode=local` est défini dans `~/.openclaw/openclaw.json`. Utilisez `--allow-unconfigured` pour les exécutions ad-hoc/dev.
- `openclaw onboard --mode local` et `openclaw setup` sont censés écrire `gateway.mode=local`. Si le fichier existe mais que `gateway.mode` est manquant, considérez cela comme une configuration cassée ou corrompue et réparez-la au lieu d'assumer implicitement le mode local.
- Si le fichier existe et que `gateway.mode` est manquant, le Gateway considère cela comme un dommage suspect de la configuration et refuse de « deviner local » pour vous.
- La liaison au-delà du loopback sans authentification est bloquée (garde de sécurité).
- `SIGUSR1` déclenche un redémarrage en processus lorsqu'il est autorisé (`commands.restart` est activé par défaut ; définissez `commands.restart: false` pour bloquer le redémarrage manuel, tandis que gateway tool/config apply/update restent autorisés).
- Les gestionnaires `SIGINT`/`SIGTERM` arrêtent le processus gateway, mais ils ne restaurent aucun état de terminal personnalisé. Si vous encapsulez le CLI avec une TUI ou une entrée en mode brut, restaurez le terminal avant de quitter.

### Options

- `--port <port>` : port WebSocket (la valeur par défaut provient de la config/env ; généralement `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>` : mode de liaison de l'écouteur.
- `--auth <token|password>` : substitution du mode d'auth.
- `--token <token>` : substitution du jeton (définit également `OPENCLAW_GATEWAY_TOKEN` pour le processus).
- `--password <password>` : substitution du mot de passe. Avertissement : les mots de passe en ligne peuvent être exposés dans les listages de processus locaux.
- `--password-file <path>` : lire le mot de passe de la passerelle depuis un fichier.
- `--tailscale <off|serve|funnel>` : exposer le Gateway via Tailscale.
- `--tailscale-reset-on-exit` : réinitialiser la configuration de service/tunnel Tailscale à l'arrêt.
- `--allow-unconfigured` : autoriser le démarrage de la passerelle sans `gateway.mode=local` dans la configuration. Cela contourne la garde de démarrage uniquement pour l'amorçage ad-hoc/dév ; il n'écrit ni ne répare le fichier de configuration.
- `--dev` : créer une configuration de développement + un espace de travail s'ils sont manquants (ignore BOOTSTRAP.md).
- `--reset` : réinitialiser la configuration de développement + les identifiants + les sessions + l'espace de travail (nécessite `--dev`).
- `--force` : tuer tout écouteur existant sur le port sélectionné avant de démarrer.
- `--verbose` : journaux détaillés.
- `--cli-backend-logs` : n'afficher que les journaux du backend CLI dans la console (et activer stdout/stderr).
- `--ws-log <auto|full|compact>` : style de journal websocket (par défaut `auto`).
- `--compact` : alias pour `--ws-log compact`.
- `--raw-stream` : enregistrer les événements bruts du flux de modèle dans l.
- `--raw-stream-path <path>` : chemin du l de flux brut.

Profilage du démarrage :

- Définissez `OPENCLAW_GATEWAY_STARTUP_TRACE=1` pour enregistrer les timings des phases pendant le démarrage de la passerelle.
- Exécutez `pnpm test:startup:gateway -- --runs 5 --warmup 1` pour comparer le démarrage de la passerelle. Le benchmark enregistre la première sortie de processus, `/healthz`, `/readyz` et les timings de trace de démarrage.

## Interroger un Gateway en cours d'exécution

Toutes les commandes de requête utilisent RPC WebSocket.

Modes de sortie :

- Par défaut : lisible par l'homme (coloré dans un TTY).
- `--json` : JSON lisible par machine (sans style/spinner).
- `--no-color` (ou `NO_COLOR=1`) : désactiver ANSI tout en gardant une disposition humaine.

Options partagées (lorsqu'elles sont prises en charge) :

- `--url <url>` : URL WebSocket de la passerelle.
- `--token <token>` : jeton de la passerelle.
- `--password <password>` : mot de passe de la passerelle.
- `--timeout <ms>` : délai/budget (varie par commande).
- `--expect-final` : attendre une réponse « finale » (appels d'agent).

Remarque : lorsque vous définissez `--url`, la CLI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

Le point de terminaison HTTP `/healthz` est une sonde de vivacité : il renvoie une réponse une fois que le serveur peut répondre en HTTP. Le point de terminaison HTTP `/readyz` est plus strict et reste rouge tant que les sidecars de démarrage, les channels ou les hooks configurés sont encore en cours de stabilisation.

### `gateway usage-cost`

Récupérer les résumés des coûts d'utilisation à partir des journaux de session.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

Options :

- `--days <days>` : nombre de jours à inclure (par défaut `30`).

### `gateway stability`

Récupérer l'enregistreur de stabilité de diagnostic récent auprès d'un Gateway en cours d'exécution.

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

Options :

- `--limit <limit>` : nombre maximum d'événements récents à inclure (par défaut `25`, max `1000`).
- `--type <type>` : filtrer par type d'événement de diagnostic, tel que `payload.large` ou `diagnostic.memory.pressure`.
- `--since-seq <seq>` : inclure uniquement les événements après un numéro de séquence de diagnostic.
- `--bundle [path]` : lire un bundle de stabilité persistant au lieu d'appeler le Gateway en cours d'exécution. Utilisez `--bundle latest` (ou simplement `--bundle`) pour le bundle le plus récent dans le répertoire d'état, ou passez directement un chemin de bundle JSON.
- `--export` : écrire un zip de diagnostics de support partageable au lieu d'imprimer les détails de stabilité.
- `--output <path>` : chemin de sortie pour `--export`.

Notes :

- L'enregistreur est actif par défaut et sans payload : il capture uniquement les métadonnées opérationnelles, et non le texte de chat, les sorties des tools, ou les corps de requête ou de réponse bruts. Définissez `diagnostics.enabled: false` uniquement lorsque vous devez désactiver entièrement la collecte du battement de diagnostic du Gateway.
- Les enregistrements conservent les métadonnées opérationnelles : noms d'événements, comptages, tailles en octets, lectures de mémoire, état de file/session, noms de channel/plugin et résumés de session expurgés. Ils ne conservent pas le texte de chat, les corps de webhook, les sorties des tools, les corps de requête ou de réponse bruts, les jetons, les cookies, les valeurs secrètes, les noms d'hôte ou les identifiants de session bruts.
- Lors de fermetures fatales du Gateway, de délais d'arrêt et d'échecs de démarrage au redémarrage, OpenClaw écrit le même instantané de diagnostic dans `~/.openclaw/logs/stability/openclaw-stability-*.json` lorsque l'enregistreur contient des événements. Inspectez le bundle le plus récent avec `openclaw gateway stability --bundle latest` ; `--limit`, `--type` et `--since-seq` s'appliquent également à la sortie du bundle.

### `gateway diagnostics export`

Écrit un zip de diagnostic local conçu pour être joint aux rapports de bugs.

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

Options :

- `--output <path>` : chemin de sortie du zip. Par défaut, il s'agit d'un export de support sous le répertoire d'état.
- `--log-lines <count>` : nombre maximum de lignes de journal nettoyées à inclure (par défaut `5000`).
- `--log-bytes <bytes>` : nombre maximum d'octets de journal à inspecter (par défaut `1000000`).
- `--url <url>` : URL WebSocket du Gateway pour l'instantané d'état.
- `--token <token>` : jeton du Gateway pour l'instantané d'état.
- `--password <password>` : mot de passe du Gateway pour l'instantané d'état.
- `--timeout <ms>` : délai d'attente de l'instantané d'état/de santé (par défaut `3000`).
- `--no-stability-bundle` : ignorer la recherche du bundle de stabilité persisté.
- `--json` : afficher le chemin écrit, la taille et le manifeste au format JSON.

L'export contient un manifeste, un résumé Markdown, la forme de la configuration, les détails de configuration nettoyés, les résumés des journaux nettoyés, les instantanés d'état/de santé du Gateway nettoyés, et le bundle de stabilité le plus récent lorsqu'il existe.

Il est destiné à être partagé. Il conserve les détails opérationnels qui aident au débogage, tels que les champs de journal sécurisés d'OpenClaw, les noms des sous-systèmes, les codes d'état, les durées, les modes configurés, les ports, les identifiants des plugins, les identifiants des fournisseurs, les paramètres de fonctionnalité non secrets et les messages de journal opérationnels expurgés. Il omet ou expurge le texte des discussions, les corps des webhooks, les sorties des outils, les identifiants, les cookies, les identifiants de compte/message, le texte des invites/instructions, les noms d'hôte et les valeurs secrètes. Lorsqu'un message de style LogTape ressemble au texte de la charge utile utilisateur/discussion/outils, l'export conserve uniquement le fait qu'un message a été omis ainsi que son nombre d'octets.

### `gateway status`

`gateway status` affiche le service Gateway (launchd/systemd/schtasks) plus une sonde facultative de la connectivité/de la capacité d'authentification.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Options :

- `--url <url>` : ajoute une cible de sonde explicite. Les distants configurés + localhost sont toujours sondés.
- `--token <token>` : authentification par jeton pour la sonde.
- `--password <password>` : authentification par mot de passe pour la sonde.
- `--timeout <ms>` : délai d'attente de la sonde (par défaut `10000`).
- `--no-probe` : ignorer la sonde de connectivité (vue service uniquement).
- `--deep` : analyser également les services de niveau système.
- `--require-rpc` : mettre à niveau la sonde de connectivité par défaut vers une sonde de lecture et sortir avec un code non nul lorsque cette sonde de lecture échoue. Ne peut pas être combiné avec `--no-probe`.

Notes :

- `gateway status` reste disponible pour le diagnostic même lorsque la configuration locale de la CLI est manquante ou non valide.
- Le `gateway status` par défaut prouve l'état du service, la connexion WebSocket et la capacité d'authentification visible au moment de la poignée de main. Il ne prouve pas les opérations de lecture/écriture/administration.
- `gateway status` résout les SecretRefs d'authentification configurés pour l'authentification de la sonde lorsque cela est possible.
- Si une SecretRef d'authentification requise n'est pas résolue dans ce chemin de commande, `gateway status --json` signale `rpc.authWarning` lorsque la connectivité/l'authentification de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
- Si la sonde réussit, les avertissements d'auth-ref non résolus sont supprimés pour éviter les faux positifs.
- Utilisez `--require-rpc` dans les scripts et l'automatisation lorsqu'un service d'écoute ne suffit pas et que vous avez besoin que les appels RPC de portée lecture soient également en bonne santé.
- `--deep` ajoute une analyse de meilleure effort pour les installations launchd/systemd/schtasks supplémentaires. Lorsque plusieurs services de type passerelle sont détectés, la sortie humaine imprime des conseils de nettoyage et avertit que la plupart des configurations devraient exécuter une passerelle par machine.
- La sortie humaine inclut le chemin du journal de fichiers résolu ainsi que l'instantané des chemins/validité de la configuration CLI vs service pour aider à diagnostiquer la dérive du profil ou du répertoire d'état.
- Sur les installations systemd Linux, les contrôles de dérive d'authentification de service lisent les valeurs `Environment=` et `EnvironmentFile=` de l'unité (y compris `%h`, chemins entre guillemets, fichiers multiples et fichiers `-` optionnels).
- Les contrôles de dérive résolvent les `gateway.auth.token` SecretRefs à l'aide de l'environnement d'exécution fusionné (environnement de commande de service en premier, puis repli sur l'environnement de processus).
- Si l'authentification par jeton n'est pas effectivement active (`gateway.auth.mode` explicite de `password`/`none`/`trusted-proxy`, ou mode non défini où le mot de passe peut l'emporter et aucun candidat jeton ne peut l'emporter), les contrôles de dérive de jeton ignorent la résolution du jeton de configuration.

### `gateway probe`

`gateway probe` est la commande « tout déboguer ». Sonde toujours :

- votre passerelle distante configurée (si définie), et
- localhost (bouclage) **même si le distant est configuré**.

Si vous passez `--url`, cette cible explicite est ajoutée avant les deux. La sortie humaine étiquette les cibles comme suit :

- `URL (explicit)`
- `Remote (configured)` ou `Remote (configured, inactive)`
- `Local loopback`

Si plusieurs passerelles sont accessibles, elles sont toutes imprimées. Plusieurs passerelles sont prises en charge lorsque vous utilisez des profils/ports isolés (par exemple, un bot de secours), mais la plupart des installations exécutent toujours une seule passerelle.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interprétation :

- `Reachable: yes` signifie qu'au moins une cible a accepté une connexion WebSocket.
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` indique ce que la sonde a pu prouver concernant l'authentification. Cela est distinct de l'accessibilité.
- `Read probe: ok` signifie que les appels RPC de détail de portée de lecture (`health`/`status`/`system-presence`/`config.get`) ont également réussi.
- `Read probe: limited - missing scope: operator.read` signifie que la connexion a réussi mais que le RPC de portée de lecture est limité. Cela est signalé comme une accessibilité **dégradée**, et non comme un échec total.
- Le code de sortie est non nul uniquement lorsqu'aucune cible sondée n'est accessible.

Notes JSON (`--json`) :

- Niveau supérieur :
  - `ok` : au moins une cible est accessible.
  - `degraded` : au moins une cible avait un RPC de détail limité par la portée.
  - `capability` : meilleure capacité observée sur les cibles accessibles (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` ou `unknown`).
  - `primaryTargetId` : meilleure cible à traiter comme le gagnant actuel dans cet ordre : URL explicite, tunnel SSH, distant configuré, puis local loopback.
  - `warnings[]` : enregistrements d'avertissement de meilleure tentative avec `code`, `message`, et `targetIds` facultatif.
  - `network` : indices d'URL local loopback/tailnet dérivés de la configuration actuelle et du réseau hôte.
  - `discovery.timeoutMs` et `discovery.count` : le budget de découverte/le nombre de résultats réel utilisé pour ce passage de sonde.
- Par cible (`targets[].connect`) :
  - `ok` : accessibilité après connexion + classification dégradée.
  - `rpcOk` : succès du RPC de détail complet.
  - `scopeLimited` : échec du RPC de détail en raison d'une portée d'opérateur manquante.
- Par cible (`targets[].auth`) :
  - `role` : rôle d'authentification signalé dans `hello-ok` lorsqu'il est disponible.
  - `scopes` : portées accordées signalées dans `hello-ok` lorsqu'elles sont disponibles.
  - `capability` : la classification des capacités d'authentification mise en évidence pour cette cible.

Codes d'avertissement courants :

- `ssh_tunnel_failed` : échec de la configuration du tunnel SSH ; la commande est revenue à des sondes directes.
- `multiple_gateways` : plus d'une cible était accessible ; c'est inhabituel à moins que vous ne exécutiez intentionnellement des profils isolés, comme un robot de secours.
- `auth_secretref_unresolved` : une SecretRef d'authentification configurée n'a pas pu être résolue pour une cible ayant échoué.
- `probe_scope_limited` : la connexion WebSocket a réussi, mais la sonde de lecture était limitée par `operator.read` manquant.

#### Distant via SSH (parité avec l'application Mac)

Le mode « Remote over SSH » de l’application macOS utilise un transfert de port local afin que la passerelle distante (qui peut être liée uniquement à la boucle locale) soit accessible sur `ws://127.0.0.1:<port>`.

Équivalent en CLI :

```bash
openclaw gateway probe --ssh user@gateway-host
```

Options :

- `--ssh <target>` : `user@host` ou `user@host:port` (le port par défaut est `22`).
- `--ssh-identity <path>` : fichier d’identité.
- `--ssh-auto` : choisir le premier hôte de passerelle découvert comme cible SSH à partir du point de terminaison de découverte résolu (`local.` plus le domaine étendu configuré, le cas échéant). Les indices TXT uniquement sont ignorés.

Configuration (facultatif, utilisé par défaut) :

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Assistant RPC de bas niveau.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

Options :

- `--params <json>` : chaîne d’objet JSON pour les paramètres (par défaut `{}`)
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

Remarques :

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
- Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `gateway install` valide que le SecretRef peut être résolu, mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement de service.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré n'est pas résolu, l'installation échoue de manière fermée au lieu de persister le texte en clair de repli.
- Pour l'authentification par mot de passe sur `gateway run`, privilégiez `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, ou un `gateway.auth.password` basé sur SecretRef plutôt qu'un `--password` en ligne.
- En mode d'authentification déduit, `OPENCLAW_GATEWAY_PASSWORD` limité au shell ne relâche pas les exigences de jeton d'installation ; utilisez une configuration durable (`gateway.auth.password` ou config `env`) lors de l'installation d'un service géré.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.
- Les commandes de cycle de vie acceptent `--json` pour les scripts.

## Découvrir les passerelles (Bonjour)

`gateway discover` recherche les balises Gateway (`_openclaw-gw._tcp`).

- DNS-SD multidiffusion : `local.`
- DNS-SD monodiffusion (Bonjour grande portée) : choisissez un domaine (exemple : `openclaw.internal.`) et configurez un DNS fractionné + un serveur DNS ; voir [/gateway/bonjour](/fr/gateway/bonjour)

Seules les passerelles avec la découverte Bonjour activée (par défaut) annoncent la balise.

Les enregistrements de découverte grande portée incluent (TXT) :

- `role` (indication de rôle de passerelle)
- `transport` (indication de transport, par ex. `gateway`)
- `gatewayPort` (port WebSocket, généralement `18789`)
- `sshPort` (facultatif ; les clients définissent par défaut les cibles SSH sur `22` en son absence)
- `tailnetDns` (nom d'hôte MagicDNS, si disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS activé + empreinte du certificat)
- `cliPath` (indication d'installation à distance écrite dans la zone étendue)

### `gateway discover`

```bash
openclaw gateway discover
```

Options :

- `--timeout <ms>` : délai d'expiration par commande (parcours/résolution) ; défaut `2000`.
- `--json` : sortie lisible par machine (désactive également le style/le spinner).

Exemples :

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

Notes :

- La CLI analyse `local.` ainsi que le domaine étendu configuré lorsqu'un est activé.
- `wsUrl` dans la sortie JSON est dérivé du point de terminaison de service résolu, et non des indications TXT uniquement
  telles que `lanHost` ou `tailnetDns`.
- Sur mDNS `local.`, `sshPort` et `cliPath` sont uniquement diffusés lorsque
  `discovery.mdns.mode` est `full`. Le DNS-SD étendu écrit toujours `cliPath` ; `sshPort`
  reste également facultatif.
