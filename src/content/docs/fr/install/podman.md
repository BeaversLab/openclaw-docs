---
summary: "Exécuter OpenClaw dans un conteneur Podman sans racine"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Exécutez le OpenClaw Gateway dans un conteneur Podman sans racine, géré par votre utilisateur actuel non root.

Le modèle prévu est :

- Podman exécute le conteneur de la passerelle.
- Votre hôte `openclaw` CLI est le plan de contrôle.
- L'état persistant réside sur l'hôte sous `~/.openclaw` par défaut.
- La gestion quotidienne utilise `openclaw --container <name> ...` au lieu de `sudo -u openclaw`, `podman exec` ou un utilisateur de service séparé.

## Prérequis

- **Podman** en mode sans racine
- **OpenClaw CLI** installé sur l'hôte
- **Optionnel :** `systemd --user` si vous souhaitez un démarrage automatique géré par Quadlet
- **Optionnel :** `sudo` uniquement si vous souhaitez `loginctl enable-linger "$(whoami)"` pour une persistance au démarrage sur un hôte sans interface graphique

## Démarrage rapide

<Steps>
  <Step title="Configuration unique">
    À partir de la racine du dépôt, exécutez `./scripts/podman/setup.sh`.
  </Step>

<Step title="Démarrer le conteneur Gateway">Démarrez le conteneur avec `./scripts/run-openclaw-podman.sh launch`.</Step>

<Step title="Exécuter l'intégration dans le conteneur">Exécutez `./scripts/run-openclaw-podman.sh launch setup`, puis ouvrez `http://127.0.0.1:18789/`.</Step>

  <Step title="Gérer le conteneur en cours d'exécution depuis l'hôte CLI">
    Définissez `OPENCLAW_CONTAINER=openclaw`, puis utilisez les commandes normales `openclaw` depuis l'hôte.
  </Step>
</Steps>

Détails de la configuration :

- `./scripts/podman/setup.sh` construit `openclaw:local` dans votre magasin Podman sans racine par défaut, ou utilise `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` si vous en avez défini un.
- Il crée `~/.openclaw/openclaw.json` avec `gateway.mode: "local"` si manquant.
- Il crée `~/.openclaw/.env` avec `OPENCLAW_GATEWAY_TOKEN` si manquant.
- Pour les lancements manuels, l'assistant lit une petite liste blanche de clés liées à Podman depuis `~/.openclaw/.env` et transmet des variables d'environnement d'exécution explicites au conteneur ; il ne transmet pas le fichier d'environnement complet à Podman.

Configuration gérée par Quadlet :

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet est une option réservée à Linux car elle dépend des services utilisateur systemd.

Vous pouvez également définir `OPENCLAW_PODMAN_QUADLET=1`.

Env vars de construction/configuration facultatifs :

- `OPENCLAW_IMAGE` ou `OPENCLAW_PODMAN_IMAGE` -- utiliser une image existante/tirée au lieu de construire `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- installer des paquets apt supplémentaires lors de la construction de l'image
- `OPENCLAW_EXTENSIONS` -- préinstaller les dépendances d'extension au moment de la construction

Démarrage du conteneur :

```bash
./scripts/run-openclaw-podman.sh launch
```

Le script démarre le conteneur en tant que votre uid/gid actuel avec `--userns=keep-id` et monte en liaison l'état de votre OpenClaw dans le conteneur.

Onboarding :

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Ensuite, ouvrez `http://127.0.0.1:18789/` et utilisez le jeton depuis `~/.openclaw/.env`.

Par défaut du CLI hôte :

```bash
export OPENCLAW_CONTAINER=openclaw
```

Ensuite, des commandes comme celles-ci s'exécuteront automatiquement à l'intérieur de ce conteneur :

```bash
openclaw dashboard --no-open
openclaw gateway status --deep
openclaw doctor
openclaw channels login
```

Sur macOS, la machine Podman peut faire apparaître le navigateur comme non-local pour la passerelle.
Si l'interface de contrôle signale des erreurs d'authentification d'appareil après le lancement, préférez le flux du tunnel SSH dans [Tunnel SSH macOS Podman](#macos-podman-ssh-tunnel). Pour
l'accès HTTPS à distance, suivez les instructions Tailscale dans
[Podman + Tailscale](#podman--tailscale).

## Tunnel SSH Podman macOS

Sur macOS, la machine Podman peut faire apparaître le navigateur comme non-local pour la passerelle même lorsque le port publié est uniquement sur `127.0.0.1`.

Pour un accès navigateur local, utilisez un tunnel SSH vers la VM Podman et ouvrez le port localhost tunnellé à la place.

Port de tunnel local recommandé :

- `28889` sur l'hôte Mac
- transféré vers `127.0.0.1:18789` à l'intérieur de la VM Podman

Démarrez le tunnel dans un terminal séparé :

```bash
ssh -N \
  -i ~/.local/share/containers/podman/machine/machine \
  -p <podman-vm-ssh-port> \
  -L 28889:127.0.0.1:18789 \
  core@127.0.0.1
```

Dans cette commande, `<podman-vm-ssh-port>` est le port SSH de la VM Podman sur l'hôte Mac. Vérifiez votre valeur actuelle avec :

```bash
podman system connection list
```

Autorisez l'origine du navigateur tunnélé une fois. Cela est nécessaire la première fois que vous utilisez le tunnel car le lanceur peut amorcer automatiquement le port publié par Podman, mais il ne peut pas déduire le port du tunnel de votre navigateur choisi :

```bash
OPENCLAW_CONTAINER=openclaw openclaw config set gateway.controlUi.allowedOrigins \
  '["http://127.0.0.1:18789","http://localhost:18789","http://127.0.0.1:28889","http://localhost:28889"]' \
  --strict-json
podman restart openclaw
```

C'est une étape unique pour le tunnel `28889` par défaut.

Ensuite, ouvrez :

```text
http://127.0.0.1:28889/
```

Remarques :

- `18789` est généralement déjà occupé sur l'hôte Mac par le port de passerelle publié par Podman, le tunnel utilise donc `28889` comme port de navigateur local.
- Si l'interface utilisateur demande une approbation d'appairage, préférez les commandes explicites ciblées sur le conteneur ou les commandes d'URL explicites afin que le CLI de l'hôte ne revienne pas aux fichiers d'appairage locaux :

```bash
openclaw --container openclaw devices list
openclaw --container openclaw devices approve --latest
```

- Forme équivalente avec URL explicite :

```bash
openclaw devices list \
  --url ws://127.0.0.1:28889 \
  --token "$(sed -n 's/^OPENCLAW_GATEWAY_TOKEN=//p' ~/.openclaw/.env | head -n1)"
```

<a id="podman--tailscale"></a>

## Podman + Tailscale

Pour un accès HTTPS ou navigateur distant, suivez la documentation principale Tailscale.

Remarque spécifique à Podman :

- Gardez l'hôte de publication Podman sur `127.0.0.1`.
- Préférez `tailscale serve` géré par l'hôte plutôt que `openclaw gateway --tailscale serve`.
- Pour un accès navigateur local macOS sans HTTPS, préférez la section de tunnel SSH ci-dessus.

Voir :

- [Tailscale](/en/gateway/tailscale)
- [Interface de contrôle](/en/web/control-ui)

## Systemd (Quadlet, optionnel)

Si vous avez exécuté `./scripts/podman/setup.sh --quadlet`, l'installation installe un fichier Quadlet à :

```bash
~/.config/containers/systemd/openclaw.container
```

Commandes utiles :

- **Démarrer :** `systemctl --user start openclaw.service`
- **Arrêter :** `systemctl --user stop openclaw.service`
- **État :** `systemctl --user status openclaw.service`
- **Journaux :** `journalctl --user -u openclaw.service -f`

Après avoir modifié le fichier Quadlet :

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

Pour une persistance au démarrage sur les hôtes SSH/tête sans interface, activez la persistance (lingering) pour votre utilisateur actuel :

```bash
sudo loginctl enable-linger "$(whoami)"
```

## Configuration, variables d'environnement et stockage

- **Répertoire de configuration :** `~/.openclaw`
- **Répertoire de travail :** `~/.openclaw/workspace`
- **Fichier de jeton :** `~/.openclaw/.env`
- **Assistant de lancement :** `./scripts/run-openclaw-podman.sh`

Le script de lancement et Quadlet montent l'état de l'hôte dans le conteneur par bind-mount :

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

Par défaut, il s'agit de répertoires de l'hôte et non d'un état anonyme du conteneur, la configuration et l'espace de travail survivent donc au remplacement du conteneur.
La configuration Podman initialise également `gateway.controlUi.allowedOrigins` pour `127.0.0.1` et `localhost` sur le port de passerelle publié, afin que le tableau de bord local fonctionne avec la liaison non bouclée (non-loopback) du conteneur.

Variables d'environnement utiles pour le lanceur manuel :

- `OPENCLAW_PODMAN_CONTAINER` -- nom du conteneur (`openclaw` par défaut)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- image à exécuter
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- port hôte mappé vers le conteneur `18789`
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- port hôte mappé vers le conteneur `18790`
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- interface hôte pour les ports publiés ; la valeur par défaut est `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- mode de liaison de la passerelle à l'intérieur du conteneur ; la valeur par défaut est `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (par défaut), `auto` ou `host`

Le lanceur manuel lit `~/.openclaw/.env` avant de finaliser les valeurs par défaut du conteneur/de l'image, vous pouvez donc les y rendre persistants.

Si vous utilisez un `OPENCLAW_CONFIG_DIR` ou un `OPENCLAW_WORKSPACE_DIR` non défini par défaut, définissez les mêmes variables pour les commandes `./scripts/podman/setup.sh` et `./scripts/run-openclaw-podman.sh launch` ultérieures. Le lanceur local au dépôt ne rend pas persistantes les substitutions de chemin personnalisées d'un shell à l'autre.

Note Quadlet :

- Le service Quadlet généré conserve intentionnellement une forme par défaut fixe et durcie : ports publiés `127.0.0.1`, `--bind lan` à l'intérieur du conteneur et espace de noms utilisateur `keep-id`.
- Il lit toujours `~/.openclaw/.env` pour les variables d'exécution de la passerelle telles que `OPENCLAW_GATEWAY_TOKEN`, mais il ne consomme pas la liste d'autorisation de remplacement spécifique à Podman du lanceur manuel.
- Si vous avez besoin de ports de publication personnalisés, d'un hôte de publication ou d'autres indicateurs d'exécution de conteneur, utilisez le lanceur manuel ou modifiez directement `~/.config/containers/systemd/openclaw.container`, puis rechargez et redémarrez le service.

## Commandes utiles

- **Journaux du conteneur :** `podman logs -f openclaw`
- **Arrêter le conteneur :** `podman stop openclaw`
- **Supprimer le conteneur :** `podman rm -f openclaw`
- **Ouvrir l'URL du tableau de bord depuis le CLI de l'hôte :** `openclaw dashboard --no-open`
- **Santé/état via le CLI de l'hôte :** `openclaw gateway status --deep`

## Troubleshooting

- **Permission refusée (EACCES) sur la configuration ou l'espace de travail :** Le conteneur s'exécute avec `--userns=keep-id` et `--user <your uid>:<your gid>` par défaut. Assurez-vous que les chemins de configuration/espace de travail de l'hôte sont détenus par votre utilisateur actuel.
- **Démarrage de la Gateway bloqué (manquant `gateway.mode=local`) :** Assurez-vous que `~/.openclaw/openclaw.json` existe et définit `gateway.mode="local"`. `scripts/podman/setup.sh` le crée s'il est manquant.
- **Les commandes CLI du conteneur atteignent la mauvaise cible :** Utilisez `openclaw --container <name> ...` explicitement, ou exportez `OPENCLAW_CONTAINER=<name>` dans votre shell.
- **`openclaw update` échoue avec `--container` :** Attendu. Reconstruisez/tirez l'image, puis redémarrez le conteneur ou le service Quadlet.
- **Le service Quadlet ne démarre pas :** Exécutez `systemctl --user daemon-reload`, puis `systemctl --user start openclaw.service`. Sur les systèmes sans interface graphique, vous pourriez également avoir besoin de `sudo loginctl enable-linger "$(whoami)"`.
- **SELinux bloque les montages bind :** Laissez le comportement de montage par défaut tranquille ; le lanceur ajoute automatiquement `:Z` sur Linux lorsque SELinux est en mode d'application ou permissif.

## Connexes

- [Docker](/en/install/docker)
- [Processus en arrière-plan de la Gateway](/en/gateway/background-process)
- [Troubleshooting de la Gateway](/en/gateway/troubleshooting)
