---
summary: "Exécuter OpenClaw dans un conteneur Podman sans racine"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

Exécutez le OpenClaw Gateway dans un conteneur Podman sans privilèges racine (rootless), géré par votre utilisateur non root actuel.

Le modèle prévu est le suivant :

- Podman exécute le conteneur de la passerelle.
- Votre `openclaw` hôte CLI est le plan de contrôle.
- L'état persistant réside sur l'hôte sous `~/.openclaw` par défaut.
- La gestion quotidienne utilise `openclaw --container <name> ...` au lieu de `sudo -u openclaw`, `podman exec` ou un utilisateur de service distinct.

## Prérequis

- **Podman** en mode sans privilèges (rootless)
- **OpenClaw CLI** installé sur l'hôte
- **Optionnel :** `systemd --user` si vous souhaitez un démarrage automatique géré par Quadlet
- **Optionnel :** `sudo` uniquement si vous souhaitez `loginctl enable-linger "$(whoami)"` pour la persistance au démarrage sur un hôte sans interface graphique

## Démarrage rapide

<Steps>
  <Step title="Configuration unique">
    À partir de la racine du dépôt, exécutez `./scripts/podman/setup.sh`.
  </Step>

<Step title="Démarrer le conteneur Gateway">Démarrez le conteneur avec `./scripts/run-openclaw-podman.sh launch`.</Step>

<Step title="Exécuter l'intégration (onboarding) dans le conteneur">Exécutez `./scripts/run-openclaw-podman.sh launch setup`, puis ouvrez `http://127.0.0.1:18789/`.</Step>

  <Step title="Gérer le conteneur en cours d'exécution depuis le CLI de l'hôte">
    Définissez `OPENCLAW_CONTAINER=openclaw`, puis utilisez les commandes normales `openclaw` depuis l'hôte.
  </Step>
</Steps>

Détails de la configuration :

- `./scripts/podman/setup.sh` construit `openclaw:local` dans votre magasin Podman sans privilèges par défaut, ou utilise `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` si vous en avez défini un.
- Il crée `~/.openclaw/openclaw.json` avec `gateway.mode: "local"` s'il est manquant.
- Il crée `~/.openclaw/.env` avec `OPENCLAW_GATEWAY_TOKEN` s'il est manquant.
- Pour les lancements manuels, l'assistant lit une petite liste d'autorisation de clés liées à Podman à partir de `~/.openclaw/.env` et transmet des variables d'environnement d'exécution explicites au conteneur ; il ne transmet pas le fichier d'environnement complet à Podman.

Configuration gérée par Quadlet :

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet est une option uniquement disponible sur Linux car elle dépend des services utilisateur systemd.

Vous pouvez également définir `OPENCLAW_PODMAN_QUADLET=1`.

Variables d'environnement de construction/configuration facultatives :

- `OPENCLAW_IMAGE` ou `OPENCLAW_PODMAN_IMAGE` -- utiliser une image existante/tirée au lieu de construire `openclaw:local`
- `OPENCLAW_IMAGE_APT_PACKAGES` -- install extra apt packages during image build (also accepts legacy `OPENCLAW_DOCKER_APT_PACKAGES`)
- `OPENCLAW_EXTENSIONS` -- pre-install plugin dependencies at build time
- `OPENCLAW_INSTALL_BROWSER` -- pre-install Chromium and Xvfb for browser automation (set to `1` to enable)

Démarrage du conteneur :

```bash
./scripts/run-openclaw-podman.sh launch
```

The script starts the container as your current uid/gid with `--userns=keep-id` and bind-mounts your OpenClaw state into the container.

Onboarding :

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Then open `http://127.0.0.1:18789/` and use the token from `~/.openclaw/.env`.

Par défaut du CLI hôte :

```bash
export OPENCLAW_CONTAINER=openclaw
```

Ensuite, des commandes comme celles-ci s'exécuteront automatiquement à l'intérieur de ce conteneur :

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

On macOS, Podman machine may make the browser appear non-local to the gateway.
If the Control UI reports device-auth errors after launch, use the Tailscale guidance in
[Podman and Tailscale](#podman--tailscale).

<a id="podman--tailscale"></a>

## Podman et Tailscale

Pour un accès HTTPS ou via un navigateur distant, suivez la documentation principale Tailscale.

Note spécifique à Podman :

- Keep the Podman publish host at `127.0.0.1`.
- Prefer host-managed `tailscale serve` over `openclaw gateway --tailscale serve`.
- Sur macOS, si le contexte d'authentification d'appareil du navigateur local n'est pas fiable, utilisez l'accès Tailscale au lieu des contournements ad hoc du tunnel local.

Voir :

- [Tailscale](/fr/gateway/tailscale)
- [Control UI](/fr/web/control-ui)

## Systemd (Quadlet, optionnel)

If you ran `./scripts/podman/setup.sh --quadlet`, setup installs a Quadlet file at:

```bash
~/.config/containers/systemd/openclaw.container
```

Commandes utiles :

- **Start:** `systemctl --user start openclaw.service`
- **Stop:** `systemctl --user stop openclaw.service`
- **Status:** `systemctl --user status openclaw.service`
- **Logs:** `journalctl --user -u openclaw.service -f`

Après avoir modifié le fichier Quadlet :

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

Pour la persistance au démarrage sur les hôtes SSH/sans interface graphique, activez la persistance (lingering) pour votre utilisateur actuel :

```bash
sudo loginctl enable-linger "$(whoami)"
```

## Config, env, et stockage

- **Config dir:** `~/.openclaw`
- **Workspace dir:** `~/.openclaw/workspace`
- **Token file:** `~/.openclaw/.env`
- **Launch helper:** `./scripts/run-openclaw-podman.sh`

Le script de lancement et Quadlet montent en liaison l'état de l'hôte dans le conteneur :

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

Par défaut, il s'agit de répertoires de l'hôte et non d'un état de conteneur anonyme, donc `openclaw.json`, l'état par agent `auth-profiles.json`, l'état du canal/fournisseur,
les sessions et l'espace de travail survivent au remplacement du conteneur.
La configuration Podman alimente également `gateway.controlUi.allowedOrigins` pour `127.0.0.1` et `localhost` sur le port de passerelle publié, afin que le tableau de bord local fonctionne avec la liaison non de bouclage (non-loopback) du conteneur.

Variables d'environnement (env vars) utiles pour le lanceur manuel :

- `OPENCLAW_PODMAN_CONTAINER` -- nom du conteneur (`openclaw` par défaut)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- image à exécuter
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- port de l'hôte mappé au port `18789` du conteneur
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- port de l'hôte mappé au port `18790` du conteneur
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- interface hôte pour les ports publiés ; la valeur par défaut est `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- mode de liaison de la passerelle à l'intérieur du conteneur ; la valeur par défaut est `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (par défaut), `auto` ou `host`

Le lanceur manuel lit `~/.openclaw/.env` avant de finaliser les valeurs par défaut du conteneur/de l'image, vous pouvez donc les y rendre persistants.

Si vous utilisez un `OPENCLAW_CONFIG_DIR` ou un `OPENCLAW_WORKSPACE_DIR` non défini par défaut, définissez les mêmes variables pour les commandes `./scripts/podman/setup.sh` et `./scripts/run-openclaw-podman.sh launch` ultérieures. Le lanceur local au dépôt ne rend pas persistantes les substitutions de chemins personnalisés d'un shell à l'autre.

Note sur Quadlet :

- Le service Quadlet généré conserve intentionnellement une forme par défaut fixe et durcie : ports publiés `127.0.0.1`, `--bind lan` à l'intérieur du conteneur et espace de noms utilisateur `keep-id`.
- Il fige `OPENCLAW_NO_RESPAWN=1`, `Restart=on-failure` et `TimeoutStartSec=300`.
- Il publie à la fois `127.0.0.1:18789:18789` (passerelle) et `127.0.0.1:18790:18790` (pont).
- Il lit `~/.openclaw/.env` comme un `EnvironmentFile` d'exécution pour des valeurs telles que `OPENCLAW_GATEWAY_TOKEN`, mais il ne consomme pas la liste d'autorisation de remplacement spécifique à Podman du lanceur manuel.
- Si vous avez besoin de ports de publication personnalisés, d'un hôte de publication ou d'autres indicateurs d'exécution de conteneur, utilisez le lanceur manuel ou modifiez directement `~/.config/containers/systemd/openclaw.container`, puis rechargez et redémarrez le service.

## Commandes utiles

- **Journaux du conteneur :** `podman logs -f openclaw`
- **Arrêter le conteneur :** `podman stop openclaw`
- **Supprimer le conteneur :** `podman rm -f openclaw`
- **Ouvrir l'URL du tableau de bord depuis le CLI de l'hôte :** `openclaw dashboard --no-open`
- **Santé/état via le CLI de l'hôte :** `openclaw gateway status --deep` (sonde RPC + scan
  de service supplémentaire)

## Troubleshooting

- **Permission refusée (EACCES) sur la configuration ou l'espace de travail :** Le conteneur s'exécute avec `--userns=keep-id` et `--user <your uid>:<your gid>` par défaut. Assurez-vous que les chemins de configuration/d'espace de travail de l'hôte appartiennent à votre utilisateur actuel.
- **Démarrage du Gateway bloqué (`gateway.mode=local` manquant) :** Assurez-vous que `~/.openclaw/openclaw.json` existe et définit `gateway.mode="local"`. `scripts/podman/setup.sh` le crée s'il est manquant.
- **Les commandes CLI du conteneur atteignent la mauvaise cible :** Utilisez `openclaw --container <name> ...` explicitement, ou exportez `OPENCLAW_CONTAINER=<name>` dans votre shell.
- **`openclaw update` échoue avec `--container` :** Attendu. Reconstruisez/tirez l'image, puis redémarrez le conteneur ou le service Quadlet.
- **Le service Quadlet ne démarre pas :** Exécutez `systemctl --user daemon-reload`, puis `systemctl --user start openclaw.service`. Sur les systèmes sans interface utilisateur, vous pouvez également avoir besoin de `sudo loginctl enable-linger "$(whoami)"`.
- **SELinux bloque les montages de liaison :** Laissez le comportement de montage par défaut tranquille ; le lanceur ajoute automatiquement `:Z` sur Linux lorsque SELinux est en mode d'application ou permissif.

## Connexes

- [Docker](/fr/install/docker)
- [Processus d'arrière-plan du Gateway](/fr/gateway/background-process)
- [Gateway troubleshooting](Gateway/en/gateway/troubleshooting)
