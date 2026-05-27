---
summary: "OpenClawGatewayCLIOpenClaw Gateway CLI (`openclaw gateway`) — exécuter, interroger et découvrir des gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "GatewayGateway"
sidebarTitle: "GatewayGateway"
---

Le Gateway est le serveur WebSocket d'OpenClaw (canaux, nœuds, sessions, hooks). Les sous-commandes de cette page se trouvent sous GatewayOpenClaw`openclaw gateway …`.

<CardGroup cols={3}>
  <Card title="BonjourDécouverte Bonjour" href="/fr/gateway/bonjour">
    Configuration mDNS locale + DNS-SD étendu.
  </Card>
  <Card title="Aperçu de la découverte" href="/fr/gateway/discovery" OpenClaw>
    Comment OpenClaw annonce et trouve les gateways.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration">
    Clés de configuration de premier niveau du gateway.
  </Card>
</CardGroup>

## Exécuter le Gateway

Exécuter un processus Gateway local :

```bash
openclaw gateway
```

Alias pour le premier plan :

```bash
openclaw gateway run
```

<AccordionGroup>
  <Accordion title="Comportement au démarrage"Gateway>
    - Par défaut, le Gateway refuse de démarrer sauf si `gateway.mode=local` est défini dans `~/.openclaw/openclaw.json`. Utilisez `--allow-unconfigured` pour les exécutions ad-hoc/dev.
    - `openclaw onboard --mode local` et `openclaw setup` sont censés écrire `gateway.mode=local`. Si le fichier existe mais que `gateway.mode` est manquant, considérez cela comme une configuration cassée ou corrompue et réparez-la au lieu d'assumer implicitement le mode local.
    - Si le fichier existe et que `gateway.mode`Gateway est manquant, le Gateway considère cela comme une suspicion de dommage sur la configuration et refuse de "deviner local" pour vous.
    - La liaison au-delà du loopback sans authentification est bloquée (garde-fou de sécurité).
    - `lan`, `tailnet` et `custom` résolvent actuellement sur les chemins BYOH IPv4 uniquement.
    - Le BYOH IPv6 uniquement n'est pas pris en charge nativement sur ce chemin aujourd'hui. Utilisez un sidecar ou un proxy IPv4 si l'hôte lui-même est en IPv6 uniquement.
    - `SIGUSR1` déclenche un redémarrage en processus lorsqu'il est autorisé (`commands.restart` est activé par défaut ; définissez `commands.restart: false` pour bloquer le redémarrage manuel, tandis que gateway tool/config apply/update restent autorisés).
    - Les gestionnaires `SIGINT`/`SIGTERM`CLITUI arrêtent le processus de gateway, mais ils ne restaurent aucun état de terminal personnalisé. Si vous enveloppez le CLI avec une TUI ou une saisie en mode brut, restaurez le terminal avant la sortie.

  </Accordion>
</AccordionGroup>

### Options

<ParamField path="--port <port>" type="number">
  Port WebSocket (la valeur par défaut provient de la configuration/de l'environnement ; généralement `18789`).
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  Mode de liaison de l'écouteur. `lan`, `tailnet` et `custom` résolvent actuellement uniquement via des chemins IPv4.
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  Remplacement du mode d'authentification.
</ParamField>
<ParamField path="--token <token>" type="string">
  Remplacement du jeton (définit également `OPENCLAW_GATEWAY_TOKEN` pour le processus).
</ParamField>
<ParamField path="--password <password>" type="string">
  Remplacement du mot de passe.
</ParamField>
<ParamField path="--password-file <path>" type="string">
  Lire le mot de passe de la passerelle depuis un fichier.
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  Exposer le Gateway via Tailscale.
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  Réinitialiser la configuration serveur/entonoir de Tailscale à l'arrêt.
</ParamField>
<ParamField path="--bind custom + gateway.customBindHost" type="string">
  Attend une adresse IPv4 aujourd'hui. Pour le BYOH IPv6 uniquement, placez un sidecar ou proxy IPv4 devant le Gateway et pointez OpenClaw vers ce point de terminaison IPv4.
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  Autoriser le démarrage de la passerelle sans `gateway.mode=local` dans la configuration. Contourne la garde de démarrage uniquement pour l'amorçage ad-hoc/dev ; n'écrit pas et ne répare pas le fichier de configuration.
</ParamField>
<ParamField path="--dev" type="boolean">
  Créer une configuration de développement + un espace de travail s'ils sont manquants (saute BOOTSTRAP.md).
</ParamField>
<ParamField path="--reset" type="boolean">
  Réinitialiser la configuration dev + les identifiants + les sessions + l'espace de travail (nécessite `--dev`).
</ParamField>
<ParamField path="--force" type="boolean">
  Tuer tout écouteur existant sur le port sélectionné avant de démarrer.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Journaux verbeux.
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  Afficher uniquement les journaux backend CLI dans la console (et activer stdout/stderr).
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  Style de journal WebSocket.
</ParamField>
<ParamField path="--compact" type="boolean">
  Alias pour `--ws-log compact`.
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  Enregistrer les événements bruts du flux de modèle dans l.
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  Chemin l du flux brut.
</ParamField>

## Redémarrer le Gateway

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
```

`openclaw gateway restart --safe` demande au Gateway en cours d'exécution d'effectuer un contrôle préliminaire du travail OpenClaw actif avant le redémarrage. Si des opérations en file d'attente, la livraison de réponses, les exécutions intégrées ou les exécutions de tâches sont actives, le Gateway signale les bloquants, fusionne les demandes de redémarrage sécurisé en double et redémarre une fois le travail actif écoulé. Le simple `restart` conserve le comportement existant du gestionnaire de services pour la compatibilité. Utilisez `--force` uniquement lorsque vous souhaitez explicitement le chemin de substitution immédiat.

`openclaw gateway restart --safe --skip-deferral` exécute le même redémarrage coordonné sensible à OpenClaw que `--safe`, mais contourne la porte de report du travail actif afin que le Gateway émette le redémarrage immédiatement, même lorsque des bloquants sont signalés. Utilisez-le comme l'échappatoire de l'opérateur lorsqu'un report a été épinglé par une exécution de tâche bloquée et que `--safe` seul attendrait indéfiniment. `--skip-deferral` nécessite `--safe`.

<Warning>Le `--password` en ligne peut être exposé dans les listes de processus locaux. Privilégiez `--password-file`, env, ou un `gateway.auth.password` soutenu par SecretRef.</Warning>

### Profilage du Gateway

- Définissez `OPENCLAW_GATEWAY_STARTUP_TRACE=1` pour consigner les minutages des phases lors du démarrage du Gateway, y compris le délai `eventLoopMax` par phase et les minutages de la table de recherche des plugins pour l'index installé, le registre de manifeste, la planification du démarrage et le travail de la carte des propriétaires.
- Définissez `OPENCLAW_GATEWAY_RESTART_TRACE=1` pour consigner les lignes `restart trace:` limitées au redémarrage pour la gestion des signaux de redémarrage, l'évacuation du travail actif, les phases d'arrêt, le prochain démarrage, le minutage de préparation et les métriques de mémoire.
- Définissez `OPENCLAW_DIAGNOSTICS=timeline` avec `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` pour écrire une chronologie de diagnostic de démarrage JSONL au mieux pour les harnais de QA externes. Vous pouvez également activer l'indicateur avec `diagnostics.flags: ["timeline"]` dans la configuration ; le chemin est toujours fourni par env. Ajoutez `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` pour inclure les échantillons de la boucle d'événements.
- Exécutez d'abord `pnpm build`, puis `pnpm test:startup:gateway -- --runs 5 --warmup 1`GatewayCLI pour comparer les performances de démarrage du Gateway par rapport à l'entrée CLI intégrée. Le benchmark enregistre la première sortie du processus, `/healthz`, `/readyz`, les timings de trace de démarrage, le délai de la boucle d'événements et les détails de timing de la table de recherche des plugins.
- Exécutez d'abord `pnpm build`, puis `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`GatewayCLImacOSLinux pour comparer les performances de redémarrage du Gateway en cours de processus par rapport à l'entrée CLI intégrée sur macOS ou Linux. Le benchmark de redémarrage utilise SIGUSR1, active à la fois les traces de démarrage et de redémarrage dans le processus enfant, et enregistre le prochain `/healthz`, le prochain `/readyz`, le temps d'arrêt, le temps de disponibilité, le CPU, le RSS et les métriques de trace de redémarrage.
- Traitez `/healthz` comme une indication de vivacité et `/readyz` comme une indication de disponibilité utilisable. Les lignes de trace et la sortie du benchmark sont destinées à l'attribution de responsabilité ; ne traitez pas une span de trace ou un échantillon comme une conclusion de performance complète.

## Interroger un Gateway en cours d'exécution

Toutes les commandes de requête utilisent le RPC WebSocket.

<Tabs>
  <Tab title="Modes de sortie">
    - Par défaut : lisible par l'homme (coloré en TTY).
    - `--json` : JSON lisible par machine (sans style/spinner).
    - `--no-color` (ou `NO_COLOR=1`) : désactive ANSI tout en conservant la mise en page humaine.

  </Tab>
  <Tab title="Options partagées">
    - `--url <url>`Gateway : URL WebSocket du Gateway.
    - `--token <token>`Gateway : Jeton du Gateway.
    - `--password <password>`Gateway : Mot de passe du Gateway.
    - `--timeout <ms>` : délai/budget (varie par commande).
    - `--expect-final` : attendre une réponse « finale » (appels d'agent).

  </Tab>
</Tabs>

<Note>Lorsque vous définissez `--url`CLI, la CLI ne revient pas aux identifiants de configuration ou d'environnement. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

Le point de terminaison HTTP `/healthz` est une sonde de vivacité : il retourne une réponse dès que le serveur peut répondre aux requêtes HTTP. Le point de terminaison HTTP `/readyz` est plus strict et reste rouge tant que les sidecars de plugins de démarrage, les canaux ou les hooks configurés sont encore en cours de stabilisation. Les réponses de readiness détaillées locales ou authentifiées incluent un bloc de diagnostic `eventLoop` avec le délai de la boucle d'événements, l'utilisation de la boucle d'événements, le ratio de cœurs CPU et un indicateur `degraded`.

### `gateway usage-cost`

Récupérer les résumés des coûts d'utilisation à partir des journaux de session.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  Nombre de jours à inclure.
</ParamField>

### `gateway stability`

Récupérer l'enregistreur de stabilité de diagnostic récent à partir d'un Gateway en cours d'exécution.

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  Nombre maximum d'événements récents à inclure (max `1000`).
</ParamField>
<ParamField path="--type <type>" type="string">
  Filtrer par type d'événement de diagnostic, tel que `payload.large` ou `diagnostic.memory.pressure`.
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  Inclure uniquement les événements après un numéro de séquence de diagnostic.
</ParamField>
<ParamField path="--bundle [path]" type="string">
  Lire un bundle de stabilité persisté au lieu d'appeler le Gateway en cours d'exécution. Utilisez `--bundle latest` (ou simplement `--bundle`) pour le bundle le plus récent sous le répertoire d'état, ou passez directement un chemin JSON de bundle.
</ParamField>
<ParamField path="--export" type="boolean">
  Écrire un zip de diagnostics de support partageable au lieu d'imprimer les détails de stabilité.
</ParamField>
<ParamField path="--output <path>" type="string">
  Chemin de sortie pour `--export`.
</ParamField>

<AccordionGroup>
  <Accordion title="Confidentialité et comportement du bundle">
    - Les enregistrements conservent les métadonnées opérationnelles : noms d'événements, comptages, tailles en octets, lectures de mémoire, état de la file/session, noms de channel/plugin et résumés de session expurgés. Ils ne conservent pas le texte des discussions, les corps de webhook, les sorties d'outils, les corps de requête ou de réponse bruts, les jetons, les cookies, les valeurs secrètes, les noms d'hôte ou les identifiants de session bruts. Définissez `diagnostics.enabled: false` pour désactiver complètement l'enregistreur.
    - En cas de sortie fatale du Gateway, de délais d'arrêt et d'échecs de démarrage au redémarrage, OpenClaw écrit le même instantané de diagnostic dans `~/.openclaw/logs/stability/openclaw-stability-*.json` lorsque l'enregistreur contient des événements. Inspectez le bundle le plus récent avec `openclaw gateway stability --bundle latest` ; `--limit`, `--type` et `--since-seq` s'appliquent également à la sortie du bundle.

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

Écrivez un fichier zip de diagnostic local conçu pour être joint aux rapports de bugs. Pour le modèle de confidentialité et le contenu du bundle, consultez [Exportation des diagnostics](/fr/gateway/diagnostics).

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  Chemin de sortie du fichier zip. Par défaut, une exportation de support sous le répertoire d'état.
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  Nombre maximum de lignes de journal nettoyées à inclure.
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  Nombre maximum d'octets de journal à inspecter.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL WebSocket du Gateway pour l'instantané d'état.
</ParamField>
<ParamField path="--token <token>" type="string">
  Jeton du Gateway pour l'instantané d'état.
</ParamField>
<ParamField path="--password <password>" type="string">
  Mot de passe du Gateway pour l'instantané d'état.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  Délai d'attente de l'instantané d'état/de santé.
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  Ignorer la recherche du bundle de stabilité persisté.
</ParamField>
<ParamField path="--json" type="boolean">
  Afficher le chemin écrit, la taille et le manifeste au format JSON.
</ParamField>

L'export contient un manifeste, un résumé Markdown, la forme de la configuration, les détails nettoyés de la configuration, les résumés des journaux nettoyés, les instantanés d'état/health du Gateway nettoyés et le bundle de stabilité le plus récent s'il en existe un.

Il est destiné à être partagé. Il conserve des détails opérationnels qui aident au débogage, tels que les champs de journal OpenClaw sûrs, les noms de sous-systèmes, les codes d'état, les durées, les modes configurés, les ports, les identifiants de plugins, les identifiants de fournisseur, les paramètres de fonctionnalités non secrets et les messages de journal opérationnels expurgés. Il omet ou expurge le texte de chat, les corps de webhook, les sorties d'outils, les identifiants, les cookies, les identifiants de compte/message, le texte d'instruction/invite, les noms d'hôte et les valeurs secrètes. Lorsqu'un message de style LogTape ressemble au texte de la charge utile utilisateur/chat/outils, l'exportation conserve uniquement le fait qu'un message a été omis ainsi que son nombre d'octets.

### `gateway status`

`gateway status` affiche le service Gateway (launchd/systemd/schtasks) ainsi qu'une sonde optionnelle de la capacité de connexion/authentification.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  Ajouter une cible de sonde explicite. Les hôtes distants configurés + localhost sont toujours sondés.
</ParamField>
<ParamField path="--token <token>" type="string">
  Authentification par jeton pour la sonde.
</ParamField>
<ParamField path="--password <password>" type="string">
  Authentification par mot de passe pour la sonde.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  Délai d'expiration de la sonde.
</ParamField>
<ParamField path="--no-probe" type="boolean">
  Ignorer la sonde de connectivité (vue services uniquement).
</ParamField>
<ParamField path="--deep" type="boolean">
  Analyser également les services de niveau système.
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  Passer la sonde de connectivité par défaut à une sonde de lecture et quitter avec un code non nul lorsque cette sonde de lecture échoue. Ne peut pas être combiné avec `--no-probe`.
</ParamField>

<AccordionGroup>
  <Accordion title="Sémantique de l'état">
    - `gateway status` reste disponible pour le diagnostic même lorsque la configuration locale de la CLI est manquante ou non valide.
    - `gateway status` par défaut prouve l'état du service, la connexion WebSocket et la capacité d'auth visible au moment de la poignée de main. Cela ne prouve pas les opérations de lecture/écriture/administration.
    - Les sondes de diagnostic sont non mutantes pour la première authentification de l'appareil : elles réutilisent un jeton d'appareil existant en cache lorsqu'il en existe un, mais elles ne créent pas une nouvelle identité d'appareil CLI ni un enregistrement d'appareil en lecture seule juste pour vérifier l'état.
    - `gateway status` résout les SecretRefs d'auth configurés pour l'auth de sonde si possible.
    - Si un SecretRef d'auth requis n'est pas résolu dans ce chemin de commande, `gateway status --json` signale `rpc.authWarning` lorsque la connectivité/l'auth de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
    - Si la sonde réussit, les avertissements d'auth-ref non résolus sont supprimés pour éviter les faux positifs.
    - Lorsque les sondes sont activées, la sortie JSON inclut `gateway.version` lorsque le Gateway en cours d'exécution le signale ; `--require-rpc` peut revenir à la charge utile RPC `status.runtimeVersion` si la sonde de poignée de main de suivi ne peut pas fournir les métadonnées de version.
    - Utilisez `--require-rpc` dans les scripts et l'automatisation lorsqu'un service d'écoute ne suffit pas et que vous avez besoin que les appels RPC de portée lecture soient également en bonne santé.
    - `--deep` ajoute une analyse au mieux pour les installations launchd/systemd/schtasks supplémentaires. Lorsque plusieurs services de type passerelle sont détectés, la sortie humaine imprime des conseils de nettoyage et avertit que la plupart des configurations doivent exécuter une passerelle par machine.
    - `--deep` signale également un transfert de redémarrage récent du superviseur Gateway lorsque le processus du service s'est terminé proprement pour un redémarrage du superviseur externe.
    - `--deep` exécute la validation de la configuration en mode compatible avec les plugins (`pluginValidation: "full"`) et affiche les avertissements configurés du manifeste de plugin (par exemple métadonnées de configuration de channel manquantes) afin que les tests de fumée d'installation et de mise à jour les détectent. `gateway status` par défaut conserve le chemin rapide en lecture seule qui ignore la validation des plugins.
    - La sortie humaine inclut le chemin du fichier journal résolu ainsi que l'instantané des chemins/validité de la configuration CLI-vs-service pour aider à diagnostiquer la dérive du profil ou du répertoire d'état.

  </Accordion>
  <Accordion title="LinuxVérifications de dérive d'auth systemd Linux"Linux>
    - Sur les installations Linux systemd, les vérifications de dérive d'auth du service lisent les valeurs `Environment=` et `EnvironmentFile=` à partir de l'unité (y compris `%h`, chemins entre guillemets, fichiers multiples et fichiers `-` facultatifs).
    - Les vérifications de dérive résolvent les SecretRefs `gateway.auth.token` en utilisant l'environnement d'exécution fusionné (environnement de commande du service en premier, puis repli vers l'environnement du processus).
    - Si l'auth par jeton n'est pas effectivement active (`gateway.auth.mode` explicite de `password`/`none`/`trusted-proxy`, ou mode non défini où le mot de passe peut l'emporter et aucun candidat de jeton ne peut l'emporter), les vérifications de dérive de jeton ignorent la résolution du jeton de configuration.

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` est la commande « tout déboguer ». Elle sonde toujours :

- votre passerelle distante configurée (si définie), et
- localhost (boucle locale) **même si une passerelle distante est configurée**.

Si vous passez `--url`, cette cible explicite est ajoutée avant les deux. La sortie humaine étiquette les cibles comme suit :

- `URL (explicit)`
- `Remote (configured)` ou `Remote (configured, inactive)`
- `Local loopback`

<Note>Si plusieurs passerelles sont accessibles, elle les imprime toutes. Plusieurs passerelles sont prises en charge lorsque vous utilisez des profils/ports isolés (par exemple, un bot de secours), mais la plupart des installations exécutent toujours une seule passerelle.</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="Interprétation">
    - `Reachable: yes` signifie qu'au moins une cible a accepté une connexion WebSocket.
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` rapporte ce que la sonde a pu prouver concernant l'authentification. C'est distinct de l'accessibilité.
    - `Read probe: ok` signifie que les appels RPC de détail de portée de lecture (`health`/`status`/`system-presence`/`config.get`) ont également réussi.
    - `Read probe: limited - missing scope: operator.read` signifie que la connexion a réussi mais que le RPC de portée de lecture est limité. Cela est signalé comme une accessibilité **dégradée**, et non comme un échec total.
    - `Read probe: failed` après `Connect: ok` signifie que le Gateway a accepté la connexion WebSocket, mais que les diagnostics de lecture de suivi ont expiré ou échoué. Il s'agit également d'une accessibilité **dégradée**, et non d'un Gateway inaccessible.
    - Comme `gateway status`, la sonde réutilise l'authentification d'appareil existante en cache mais ne crée pas d'identité d'appareil ou d'état d'appariement pour la première fois.
    - Le code de sortie est non nul uniquement lorsqu'aucune cible sondée n'est accessible.

  </Accordion>
  <Accordion title="Sortie JSON">
    Niveau supérieur :

    - `ok` : au moins une cible est joignable.
    - `degraded` : au moins une cible a accepté une connexion mais n'a pas terminé les diagnostics complets de RPC.
    - `capability` : meilleure capacité observée sur les cibles joignables (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` ou `unknown`).
    - `primaryTargetId` : meilleure cible à traiter comme le gagnant actif dans cet ordre : URL explicite, tunnel SSH, distant configuré, puis local loopback.
    - `warnings[]` : enregistrements d'avertissement de meilleur effort avec `code`, `message`, et facultatif `targetIds`.
    - `network` : indications d'URL local loopback/tailnet dérivées de la configuration actuelle et du réseau hôte.
    - `discovery.timeoutMs` et `discovery.count` : le budget de découverte/résultat réel utilisé pour ce passage de sonde.

    Par cible (`targets[].connect`) :

    - `ok` : joignabilité après connexion + classification dégradée.
    - `rpcOk` : succès du RPC complet.
    - `scopeLimited` : échec du RPC dû à une portée d'opérateur manquante.

    Par cible (`targets[].auth`) :

    - `role` : rôle d'authentification signalé dans `hello-ok` si disponible.
    - `scopes` : portées accordées signalées dans `hello-ok` si disponible.
    - `capability` : la classification de capacité d'authentification remontée pour cette cible.

  </Accordion>
  <Accordion title="Codes d'avertissement courants">
    - `ssh_tunnel_failed` : échec de la configuration du tunnel SSH ; la commande est revenue à des sondes directes.
    - `multiple_gateways` : plus d'une cible était accessible ; c'est inhabituel sauf si vous exécutez intentionnellement des profils isolés, tels qu'un robot de secours.
    - `auth_secretref_unresolved` : une auth SecretRef configurée n'a pas pu être résolue pour une cible ayant échoué.
    - `probe_scope_limited` : la connexion WebSocket a réussi, mais la sonde de lecture a été limitée par l'absence de `operator.read`.

  </Accordion>
</AccordionGroup>

#### À distance via SSH (parité avec l'app Mac)

Le mode "Remote over SSH" de l'application macOS utilise un transfert de port local pour que la passerelle distante (qui peut être liée uniquement à boucle locale) devienne accessible sur `ws://127.0.0.1:<port>`.

Équivalent CLI :

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` ou `user@host:port` (le port par défaut est `22`).
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  Fichier d'identité.
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  Choisir le premier hôte de passerelle découvert comme cible SSH à partir du point de terminaison de découverte résolu (`local.` plus le domaine étendu configuré, le cas échéant). Les indications TXT uniquement sont ignorées.
</ParamField>

Configuration (facultatif, utilisé par défaut) :

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Assistant RPC de bas niveau.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

<ParamField path="--params <json>" type="string" default="{}">
  Chaîne d'objet JSON pour les paramètres.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL WebSocket du Gateway.
</ParamField>
<ParamField path="--token <token>" type="string">
  Jeton du Gateway.
</ParamField>
<ParamField path="--password <password>" type="string">
  Mot de passe du Gateway.
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  Budget de délai d'attente.
</ParamField>
<ParamField path="--expect-final" type="boolean">
  Principalement pour les RPC de type agent qui diffusent des événements intermédiaires avant une charge utile finale.
</ParamField>
<ParamField path="--json" type="boolean">
  Sortie JSON lisible par machine.
</ParamField>

<Note>`--params` doit être du JSON valide.</Note>

## Gérer le service Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### Installer avec un wrapper

Utilisez `--wrapper` lorsque le service géré doit démarrer via un autre exécutable, par exemple un
shim de gestionnaire de secrets ou une aide d'exécution. Le wrapper reçoit les arguments normaux du Gateway et est
responsable de lancer finalement `openclaw` ou Node avec ces arguments.

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

Vous pouvez également définir le wrapper via l'environnement. `gateway install` valide que le chemin est
un fichier exécutable, écrit le wrapper dans le fichier `ProgramArguments` du service, et rend persistant
`OPENCLAW_WRAPPER` dans l'environnement du service pour les réinstallations forcées ultérieures, les mises à jour et les réparations
doctor.

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

Pour supprimer un wrapper persistant, effacez `OPENCLAW_WRAPPER` lors de la réinstallation :

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="Options de commande">
    - `gateway status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install` : `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway restart` : `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
    - `gateway uninstall|start` : `--json`
    - `gateway stop` : `--disable`, `--json`

  </Accordion>
  <Accordion title="Comportement du cycle de vie">
    - Utilisez `gateway restart` pour redémarrer un service géré. Ne chaînez pas `gateway stop` et `gateway start` en remplacement d'un redémarrage.
    - Sur macOS, `gateway stop` utilise `launchctl bootout` par défaut, ce qui supprime le LaunchAgent de la session de démarrage actuelle sans rendre la désactivation persistante — La récupération automatique KeepAlive reste active pour les futurs plantages et `gateway start` réactive proprement sans `launchctl enable` manuel. Passez `--disable` pour supprimer de manière persistante KeepAlive et RunAtLoad afin que la passerelle ne redémarre pas jusqu'au prochain `gateway start` explicite ; utilisez ceci lorsqu'un arrêt manuel doit survivre aux redémarrages ou aux redémarrages système.
    - `gateway restart --safe` demande au Gateway en cours d'exécution de pré-vérifier le travail OpenClaw actif et de reporter le redémarrage jusqu'à ce que la livraison des réponses, les exécutions intégrées et les exécutions de tâches soient écoulées. `--safe` ne peut pas être combiné avec `--force` ou `--wait`.
    - `gateway restart --wait 30s` remplace le budget de drainage de redémarrage configuré pour ce redémarrage. Les nombres nus sont en millisecondes ; des unités telles que `s`, `m` et `h` sont acceptées. `--wait 0` attend indéfiniment.
    - `gateway restart --safe --skip-deferral` exécute le redémarrage sécurisé compatible OpenClaw mais contourne la porte de report, de sorte que le Gateway émet le redémarrage immédiatement même lorsque des bloquants sont signalés. Porte de sortie de secours pour l'opérateur pour les reports d'exécutions de tâches bloquées ; nécessite `--safe`.
    - `gateway restart --force` ignore le drainage du travail actif et redémarre immédiatement. Utilisez-le lorsqu'un opérateur a déjà inspecté les bloquants de tâches répertoriés et souhaite récupérer la passerne immédiatement.
    - Les commandes de cycle de vie acceptent `--json` pour les scripts.

  </Accordion>
  <Accordion title="Authentification et SecretRefs lors de l'installation">
    - Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `gateway install` vérifie que le SecretRef peut être résolu, mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement du service.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'installation échoue de manière sécurisée au lieu de persister un texte brut de repli.
    - Pour l'authentification par mot de passe sur `gateway run`, privilégiez `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` ou un `gateway.auth.password` soutenu par un SecretRef plutôt qu'un `--password` en ligne.
    - En mode d'authentification déduit, `OPENCLAW_GATEWAY_PASSWORD` limité au shell ne relâche pas les exigences de jeton d'installation ; utilisez une configuration durable (`gateway.auth.password` ou config `env`) lors de l'installation d'un service géré.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.

  </Accordion>
</AccordionGroup>

## Découvrir les passerelles (Bonjour)

`gateway discover` recherche des balises Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD : `local.`
- Unicast DNS-SD (Wide-Area Bonjour) : choisissez un domaine (exemple : `openclaw.internal.`) et configurez un DNS fractionné + un serveur DNS ; voir [Bonjour](/fr/gateway/bonjour).

Seules les passerelles avec la découverte Bonjour activée (par défaut) annoncent la balise.

Les enregistrements de découverte grande portée peuvent inclure ces indices TXT :

- `role` (indication de rôle du Gateway)
- `transport` (indication de transport, par ex. `gateway`)
- `gatewayPort` (port WebSocket, généralement `18789`)
- `sshPort` (mode de découverte complète uniquement ; les clients définissent par défaut les cibles SSH sur `22` lorsqu'il est absent)
- `tailnetDns` (nom d'hôte MagicDNS, si disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS activé + empreinte du certificat)
- `cliPath` (mode de découverte complète uniquement)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  Délai d'expiration par commande (browse/resolve).
</ParamField>
<ParamField path="--json" type="boolean">
  Sortie lisible par machine (désactive également le style/le spinner).
</ParamField>

Exemples :

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- La CLI analyse `local.` ainsi que le domaine étendu configuré lorsque celui-ci est activé.
- `wsUrl` dans la sortie JSON est dérivé du point de terminaison du service résolu, et non des indices TXT uniquement tels que `lanHost` ou `tailnetDns`.
- Sur `local.` mDNS et DNS-SD étendu, `sshPort` et `cliPath` sont uniquement publiés lorsque `discovery.mdns.mode` est `full`.

</Note>

## Connexes

- [Référence de la CLI](/fr/cli)
- [Manuel opérationnel du Gateway](/fr/gateway)
