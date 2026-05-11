---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — exécuter, interroger et découvrir des gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway"
sidebarTitle: "Gateway"
---

Le Gateway est le serveur WebSocket d'OpenClaw (canaux, nœuds, sessions, hooks). Les sous-commandes de cette page se trouvent sous `openclaw gateway …`.

<CardGroup cols={3}>
  <Card title="Bonjour discovery" href="/fr/gateway/bonjour">
    Configuration mDNS local + DNS-SD étendu.
  </Card>
  <Card title="Discovery overview" href="/fr/gateway/discovery">
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
  <Accordion title="Comportement au démarrage">
    - Par défaut, le Gateway refuse de démarrer à moins que `gateway.mode=local` ne soit défini dans `~/.openclaw/openclaw.json`. Utilisez `--allow-unconfigured` pour les exécutions ad hoc/dev. - `openclaw onboard --mode local` et `openclaw setup` sont censés écrire `gateway.mode=local`. Si le fichier existe mais que `gateway.mode` est manquant, considérez cela comme une configuration cassée ou
    corrompue et réparez-la au lieu de supposer implicitement le mode local. - Si le fichier existe et que `gateway.mode` est manquant, le Gateway considère cela comme une suspicion de dommage sur la configuration et refuse de "deviner local" pour vous. - La liaison au-delà du bouclage sans authentification est bloquée (barrière de sécurité). - `SIGUSR1` déclenche un redémarrage en processus
    lorsqu'il est autorisé (`commands.restart` est activé par défaut ; définissez `commands.restart: false` pour bloquer le redémarrage manuel, tandis que l'outil de passerelle/config apply/update restent autorisés). - Les gestionnaires `SIGINT`/`SIGTERM` arrêtent le processus de passerelle, mais ils ne restaurent aucun état de terminal personnalisé. Si vous enveloppez le CLI avec un TUI ou une
    entrée en mode brut, restaurez le terminal avant de quitter.
  </Accordion>
</AccordionGroup>

### Options

<ParamField path="--port <port>" type="number">
  Port WebSocket (la valeur par défaut provient de la config/env ; généralement `18789`).
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  Mode de liaison d'écoute (bind mode).
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
  Exposer la Gateway via Tailscale.
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  Réinitialiser la configuration serveur/funnel de Tailscale à l'arrêt.
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  Autoriser le démarrage de la passerelle sans `gateway.mode=local` dans la configuration. Contourne la garde de démarrage uniquement pour l'amorçage ad-hoc/dev ; n'écrit pas et ne répare pas le fichier de configuration.
</ParamField>
<ParamField path="--dev" type="boolean">
  Créer une config de dev + espace de travail si manquant (saute BOOTSTRAP.md).
</ParamField>
<ParamField path="--reset" type="boolean">
  Réinitialiser la config de dev + identifiants + sessions + espace de travail (nécessite `--dev`).
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
  Enregistrer les événements bruts du flux de modèle dans un fichier l.
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  Chemin du fichier l du flux brut.
</ParamField>

<Warning>Les `--password` en ligne peuvent être exposés dans les listes de processus locaux. Privilégiez `--password-file`, env, ou un `gateway.auth.password` soutenu par SecretRef.</Warning>

### Profilage au démarrage

- Définissez `OPENCLAW_GATEWAY_STARTUP_TRACE=1` pour consigner les minutages de phase lors du démarrage du Gateway, y compris le délai `eventLoopMax` par phase et les minutages de la table de recherche des plugins pour l'index installé, le registre de manifeste, la planification du démarrage et le travail de la carte des propriétaires.
- Exécutez `pnpm test:startup:gateway -- --runs 5 --warmup 1` pour évaluer le démarrage du Gateway. Le benchmark enregistre la première sortie du processus, `/healthz`, `/readyz`, les minutages de trace de démarrage, le délai de la boucle d'événements et les détails de la minutage de la table de recherche des plugins.

## Interroger un Gateway en cours d'exécution

Toutes les commandes de requête utilisent le WebSocket RPC.

<Tabs>
  <Tab title="Modes de sortie">
    - Par défaut : lisible par l'homme (coloré dans un TTY).
    - `--json` : JSON lisible par machine (sans style/indicateur d'activité).
    - `--no-color` (ou `NO_COLOR=1`) : désactiver ANSI tout en gardant la disposition humaine.
  </Tab>
  <Tab title="Options partagées">
    - `--url <url>` : URL WebSocket du Gateway.
    - `--token <token>` : jeton du Gateway.
    - `--password <password>` : mot de passe du Gateway.
    - `--timeout <ms>` : délai/budget (varie selon la commande).
    - `--expect-final` : attendre une réponse « finale » (appels d'agent).
  </Tab>
</Tabs>

<Note>Lorsque vous définissez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement. Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

Le point de terminaison HTTP `/healthz` est une sonde de vivacité : il retourne une fois que le serveur peut répondre HTTP. Le point de terminaison HTTP `/readyz` est plus strict et reste rouge tant que les sidecars de démarrage, les canaux ou les crochets configurés sont encore en cours de stabilisation.

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

Récupérer l'enregistreur récent de stabilité de diagnostic à partir d'un Gateway en cours d'exécution.

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
  Lire un bundle de stabilité persistant au lieu d'appeler le Gateway en cours d'exécution. Utilisez `--bundle latest` (ou simplement `--bundle`) pour le bundle le plus récent dans le répertoire d'état, ou passez directement un chemin JSON de bundle.
</ParamField>
<ParamField path="--export" type="boolean">
  Écrire un zip de diagnostics de support partageable au lieu d'imprimer les détails de stabilité.
</ParamField>
<ParamField path="--output <path>" type="string">
  Chemin de sortie pour `--export`.
</ParamField>

<AccordionGroup>
  <Accordion title="Confidentialité et comportement des bundles">
    - Les enregistrements conservent les métadonnées opérationnelles : noms des événements, comptages, tailles en octets, lectures de la mémoire, état de la file d'attente/session, noms des canaux/plugins et résumés de session expurgés. Ils ne conservent pas le texte des discussions, les corps des webhooks, les sorties des outils, les corps bruts des requêtes ou réponses, les jetons, les cookies,
    les valeurs secrètes, les noms d'hôte ou les identifiants de session bruts. Définissez `diagnostics.enabled: false` pour désactiver complètement l'enregistreur. - Lors des sorties fatales du Gateway, des délais d'arrêt et des échecs de démarrage au redémarrage, OpenClaw écrit le même instantané de diagnostic dans `~/.openclaw/logs/stability/openclaw-stability-*.json` lorsque l'enregistreur
    dispose d'événements. Inspectez le bundle le plus récent avec `openclaw gateway stability --bundle latest` ; `--limit`, `--type` et `--since-seq` s'appliquent également à la sortie du bundle.
  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

Créez un fichier zip de diagnostic local conçu pour être joint aux rapports de bugs. Pour le modèle de confidentialité et le contenu du bundle, voir [Exportation des diagnostics](/fr/gateway/diagnostics).

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  Chemin de sortie zip. Par défaut, une exportation de support sous le répertoire d'état.
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  Nombre maximum de lignes de journal nettoyées à inclure.
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  Nombre maximum d'octets de journal à inspecter.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL WebSocket du Gateway pour la capture instantanée d'état.
</ParamField>
<ParamField path="--token <token>" type="string">
  Jeton du Gateway pour la capture instantanée d'état.
</ParamField>
<ParamField path="--password <password>" type="string">
  Mot de passe du Gateway pour la capture instantanée d'état.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  Délai d'attente de la capture instantanée de statut/d'état.
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  Ignorer la recherche de bundle de stabilité persisté.
</ParamField>
<ParamField path="--json" type="boolean">
  Afficher le chemin écrit, la taille et le manifeste au format JSON.
</ParamField>

L'exportation contient un manifeste, un résumé Markdown, la forme de la configuration, les détails nettoyés de la configuration, les résumés de journaux nettoyés, les captures instantanées de statut/d'état nettoyées du Gateway et le bundle de stabilité le plus récent lorsqu'il existe.

Il est destiné à être partagé. Il conserve des détails opérationnels qui aident au débogage, tels que les champs de journal sûrs de OpenClaw, les noms de sous-systèmes, les codes de statut, les durées, les modes configurés, les ports, les identifiants de plugins, les identifiants de providers, les paramètres de fonctionnalités non secrets et les messages de journal opérationnels expurgés. Il omet ou expurge le texte de chat, les corps de webhooks, les sorties d'outils, les identifiants, les cookies, les identifiants de compte/message, le texte d'invite/instruction, les noms d'hôte et les valeurs secrètes. Lorsqu'un message de style LogTape ressemble à du texte de charge utile utilisateur/chat/tool, l'exportation conserve uniquement le fait qu'un message a été omis ainsi que son nombre d'octets.

### `gateway status`

`gateway status` affiche le service Gateway (launchd/systemd/schtasks) ainsi qu'une sonde facultative de la capacité de connexion/d'authentification.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  Ajouter une cible de sonde explicite. Les distants configurés + localhost sont toujours sondés.
</ParamField>
<ParamField path="--token <token>" type="string">
  Auth par jeton pour la sonde.
</ParamField>
<ParamField path="--password <password>" type="string">
  Auth par mot de passe pour la sonde.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  Délai d'attente de la sonde.
</ParamField>
<ParamField path="--no-probe" type="boolean">
  Ignorer la sonde de connectivité (vue services uniquement).
</ParamField>
<ParamField path="--deep" type="boolean">
  Scanner également les services de niveau système.
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  Passer de la sonde de connectivité par défaut à une sonde en lecture et quitter avec un code non nul si cette sonde en lecture échoue. Ne peut pas être combiné avec `--no-probe`.
</ParamField>

<AccordionGroup>
  <Accordion title="Sémantique de l'état">
    - `gateway status` reste disponible pour le diagnostic, même lorsque la configuration locale de la CLI est manquante ou non valide. - L'`gateway status` par défaut vérifie l'état du service, la connexion WebSocket et la capacité d'auth visible au moment de la poignée de main. Il ne prouve pas les opérations de lecture/écriture/administration. - Les sondes de diagnostic ne sont pas mutatrices
    pour l'authentification initiale de l'appareil : elles réutilisent un jeton d'appareil existant en cache lorsqu'un tel jeton existe, mais elles ne créent pas une nouvelle identité d'appareil CLI ni d'enregistrement d'appareil en lecture seule uniquement pour vérifier l'état. - `gateway status` résout les SecretRefs d'authentification configurés pour l'authentification de la sonde lorsque cela
    est possible. - Si un SecretRef d'authentification requis n'est pas résolu dans ce chemin de commande, `gateway status --json` signale `rpc.authWarning` lorsque la connectivité/l'authentification de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret. - Si la sonde réussit, les avertissements de référence d'authentification non résolus sont
    supprimés pour éviter les faux positifs. - Utilisez `--require-rpc` dans les scripts et l'automatisation lorsqu'un service d'écoute ne suffit pas et que vous avez également besoin que les appels RPC avec une portée de lecture soient en bonne santé. - `--deep` ajoute une analyse au mieux pour les installations launchd/systemd/schtasks supplémentaires. Lorsque plusieurs services de type
    passerelle sont détectés, la sortie humaine imprime des conseils de nettoyage et avertit que la plupart des configurations devraient exécuter une seule passerelle par machine. - La sortie humaine inclut le chemin du fichier journal résolu ainsi que l'instantané des chemins/validité de la configuration CLI-vs-service pour aider à diagnostiquer la dérive du profil ou du répertoire d'état.
  </Accordion>
  <Accordion title="Vérifications de dérive d'authentification Linux systemd">
    - Sur les installations Linux systemd, les vérifications de dérive d'authentification du service lisent les valeurs `Environment=` et `EnvironmentFile=` depuis l'unité (y compris `%h`, chemins entre guillemets, fichiers multiples et fichiers `-` facultatifs). - Les vérifications de dérive résolvent les SecretRefs `gateway.auth.token` en utilisant l'environnement d'exécution fusionné
    (environnement de commande du service en premier, puis repli vers l'environnement du processus). - Si l'authentification par jeton n'est pas effectivement active (`gateway.auth.mode` explicite de `password`/`none`/`trusted-proxy`, ou mode non défini où le mot de passe peut l'emporter et qu'aucun candidat jeton ne peut l'emporter), les vérifications de dérive de jeton ignorent la résolution du
    jeton de configuration.
  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` est la commande "tout déboguer". Elle sonde toujours :

- votre passerelle distante configurée (si définie), et
- localhost (boucle locale) **même si une passerelle distante est configurée**.

Si vous passez `--url`, cette cible explicite est ajoutée avant les deux. La sortie humaine étiquette les cibles comme suit :

- `URL (explicit)`
- `Remote (configured)` ou `Remote (configured, inactive)`
- `Local loopback`

<Note>Si plusieurs passerelles sont accessibles, elle les imprime toutes. Plusieurs passerelles sont prises en charge lorsque vous utilisez des profils/ports isolés (par exemple, un robot de secours), mais la plupart des installations exécutent toujours une seule passerelle.</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="Interprétation">
    - `Reachable: yes` signifie qu'au moins une cible a accepté une connexion WebSocket.
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` rapporte ce que la sonde a pu prouver concernant l'authentification. C'est distinct de l'accessibilité.
    - `Read probe: ok` signifie que les appels RPC de détail de portée de lecture (`health`/`status`/`system-presence`/`config.get`) ont également réussi.
    - `Read probe: limited - missing scope: operator.read` signifie que la connexion a réussi mais que le RPC de portée de lecture est limité. Ceci est signalé comme une accessibilité **dégradée**, et non comme un échec total.
    - Comme `gateway status`, la sonde réutilise l'authentification d'appareil existante en cache mais ne crée pas d'identité d'appareil ou d'état d'appariement pour la première fois.
    - Le code de sortie est non nul uniquement lorsqu'aucune cible sondée n'est accessible.
  </Accordion>
  <Accordion title="Sortie JSON">
    Niveau supérieur :

    - `ok` : au moins une cible est joignable.
    - `degraded` : au moins une cible avait des détails RPC limités par la portée.
    - `capability` : meilleure capacité observée sur les cibles joignables (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope`, ou `unknown`).
    - `primaryTargetId` : meilleure cible à traiter comme le vainqueur actif dans cet ordre : URL explicite, tunnel SSH, distant configuré, puis local loopback.
    - `warnings[]` : enregistrements d'avertissement de meilleure qualité avec `code`, `message` et `targetIds` facultatif.
    - `network` : indices d'URL local loopback/tailnet dérivés de la configuration actuelle et du réseau hôte.
    - `discovery.timeoutMs` et `discovery.count` : le budget de découverte / le nombre de résultats réel utilisé pour ce passage de sonde.

    Par cible (`targets[].connect`) :

    - `ok` : accessibilité après connexion + classification dégradée.
    - `rpcOk` : succès du RPC détaillé complet.
    - `scopeLimited` : échec du RPC détaillé dû à une portée d'opérateur manquante.

    Par cible (`targets[].auth`) :

    - `role` : rôle d'authentification signalé dans `hello-ok` si disponible.
    - `scopes` : portées accordées signalées dans `hello-ok` si disponible.
    - `capability` : la classification des capacités d'authentification exposée pour cette cible.

  </Accordion>
  <Accordion title="Codes d'avertissement courants">
    - `ssh_tunnel_failed` : la configuration du tunnel SSH a échoué ; la commande est revenue aux sondes directes.
    - `multiple_gateways` : plus d'une cible était accessible ; c'est inhabituel sauf si vous exécutez intentionnellement des profils isolés, comme un robot de secours.
    - `auth_secretref_unresolved` : une SecretRef d'authentification configurée n'a pas pu être résolue pour une cible en échec.
    - `probe_scope_limited` : la connexion WebSocket a réussi, mais la sonde de lecture était limitée par l'absence de `operator.read`.
  </Accordion>
</AccordionGroup>

#### Distant via SSH (parité avec l'application Mac)

Le mode « Distant via SSH » de l'application macOS utilise un transfert de port local afin que la passerelle distante (qui peut être liée uniquement à la boucle locale) devienne accessible sur `ws://127.0.0.1:<port>`.

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
  Choisir le premier hôte de passerelle découvert comme cible SSH à partir du point de terminaison de découverte résolu (`local.` plus le domaine étendu configuré, le cas échéant). Les indices TXT uniquement sont ignorés.
</ParamField>

Configuration (optionnelle, utilisée comme valeurs par défaut) :

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
  Gateway URL WebSocket.
</ParamField>
<ParamField path="--token <token>" type="string">
  Gateway jeton.
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway mot de passe.
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
intergiciel (shim) de gestionnaire de secrets ou une aide d'exécution. Le wrapper reçoit les arguments normaux du Gateway et est
responsable de l'exécution finale de `openclaw` ou de Node avec ces arguments.

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
un fichier exécutable, écrit le wrapper dans les `ProgramArguments` du service et persiste
`OPENCLAW_WRAPPER` dans l'environnement du service pour les réinstallations forcées ultérieures, les mises à jour et les
réparations du doctor.

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
    - `gateway uninstall|start|stop|restart` : `--json`
  </Accordion>
  <Accordion title="Comportement du cycle de vie">
    - Utilisez `gateway restart` pour redémarrer un service géré. Ne chaînez pas `gateway stop` et `gateway start` en remplacement d'un redémarrage ; sur macOS, `gateway stop` désactive intentionnellement le LaunchAgent avant de l'arrêter.
    - Les commandes de cycle de vie acceptent `--json` pour les scripts.
  </Accordion>
  <Accordion title="Auth et SecretRefs lors de l'installation">
    - Lorsque l'auth par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `gateway install` valide que le SecretRef peut être résolu, mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement du service.
    - Si l'auth par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, l'installation échoue en mode fermé au lieu de persister le texte de repli en clair.
    - Pour l'auth par mot de passe sur `gateway run`, préférez `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, ou un `gateway.auth.password` soutenu par un SecretRef plutôt qu'un `--password` en ligne.
    - En mode d'auth déduit, `OPENCLAW_GATEWAY_PASSWORD` limité au shell ne relâche pas les exigences de jeton d'installation ; utilisez une configuration durable (`gateway.auth.password` ou config `env`) lors de l'installation d'un service géré.
    - Si à la fois `gateway.auth.token` et `gateway.auth.password` sont configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée tant que le mode n'est pas défini explicitement.
  </Accordion>
</AccordionGroup>

## Découvrir les passerelles (Bonjour)

`gateway discover` recherche les balises Gateway (`_openclaw-gw._tcp`).

- DNS-SD multidiffusion : `local.`
- DNS-SD unidiffusion (Bonjour étendu) : choisissez un domaine (exemple : `openclaw.internal.`) et configurez un DNS divisé + un serveur DNS ; voir [Bonjour](/fr/gateway/bonjour).

Seules les passerelles avec la découverte Bonjour activée (par défaut) diffusent la balise.

Les enregistrements de découverte étendue incluent (TXT) :

- `role` (indication de rôle de passerelle)
- `transport` (indication de transport, ex. `gateway`)
- `gatewayPort` (port WebSocket, généralement `18789`)
- `sshPort` (optionnel ; les clients définissent par défaut les cibles SSH sur `22` lorsqu'il est absent)
- `tailnetDns` (nom d'hôte MagicDNS, si disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS activé + empreinte du certificat)
- `cliPath` (indicateur d'installation à distance écrit dans la zone étendue)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  Délai d'attente par commande (parcourir/résoudre).
</ParamField>
<ParamField path="--json" type="boolean">
  Sortie lisible par machine (désactive également le style/le indicateur d'activité).
</ParamField>

Exemples :

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
  - Le CLI analyse `local.` ainsi que le domaine étendu configuré lorsque celui-ci est activé. - `wsUrl` dans la sortie JSON est dérivé du point de terminaison de service résolu, et non des indicateurs TXT uniquement tels que `lanHost` ou `tailnetDns`. - Sur le mDNS `local.`, `sshPort` et `cliPath` sont diffusés uniquement lorsque `discovery.mdns.mode` est `full`. Le DNS-SD étendu écrit toujours
  `cliPath` ; `sshPort` reste également facultatif.
</Note>

## Connexes

- [Référence CLI](/fr/cli)
- [Guide de fonctionnement Gateway](/fr/gateway)
