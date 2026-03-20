---
summary: "Run OpenClaw in a rootless Podman container"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Run the OpenClaw gateway in a **rootless** Podman container. Uses the same image as Docker (build from the repo [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile)).

## Prérequis

- Podman (sans privilèges root)
- Sudo pour la configuration unique (créer l'utilisateur, construire l'image)

## Démarrage rapide

**1. Configuration unique** (à partir de la racine du dépôt ; crée l'utilisateur, construit l'image, installe le script de lancement) :

```bash
./setup-podman.sh
```

This also creates a minimal `~openclaw/.openclaw/openclaw.json` (sets `gateway.mode="local"`) so the gateway can start without running the wizard.

Par défaut, le conteneur n'est **pas** installé en tant que service systemd, vous le démarrez manuellement (voir ci-dessous). Pour une configuration de type production avec démarrage et redémarrage automatiques, installez-le plutôt en tant que service utilisateur Quadlet systemd :

```bash
./setup-podman.sh --quadlet
```

(Or set `OPENCLAW_PODMAN_QUADLET=1`; use `--container` to install only the container and launch script.)

Optional build-time env vars (set before running `setup-podman.sh`):

- `OPENCLAW_DOCKER_APT_PACKAGES` — install extra apt packages during image build
- `OPENCLAW_EXTENSIONS` — pre-install extension dependencies (space-separated extension names, e.g. `diagnostics-otel matrix`)

**2. Démarrer la passerelle** (manuel, pour un test rapide) :

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. Assistant d'intégration (Onboarding wizard)** (ex. pour ajouter des canaux ou des fournisseurs) :

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Ensuite, ouvrez `http://127.0.0.1:18789/` et utilisez le jeton depuis `~openclaw/.openclaw/.env` (ou la valeur affichée par le programme d'installation).

## Systemd (Quadlet, optionnel)

Si vous avez exécuté `./setup-podman.sh --quadlet` (ou `OPENCLAW_PODMAN_QUADLET=1`), une unité [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) est installée pour que la passerelle s'exécute en tant que service utilisateur systemd pour l'utilisateur openclaw. Le service est activé et démarré à la fin de la configuration.

- **Démarrer :** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **Arrêter :** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **État :** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **Journaux :** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

Le fichier quadlet se trouve à `~openclaw/.config/containers/systemd/openclaw.container`. Pour modifier les ports ou les variables d'environnement, éditez ce fichier (ou le `.env` qu'il source), puis `sudo systemctl --machine openclaw@ --user daemon-reload` et redémarrez le service. Au démarrage, le service se lance automatiquement si la persistance est activée pour openclaw (l'installation le fait lorsque loginctl est disponible).

Pour ajouter quadlet **après** une installation initiale qui ne l'utilisait pas, relancez : `./setup-podman.sh --quadlet`.

## L'utilisateur openclaw (non-login)

`setup-podman.sh` crée un utilisateur système dédié `openclaw` :

- **Shell :** `nologin` — pas de connexion interactive ; réduit la surface d'attaque.
- **Home :** par ex. `/home/openclaw` — contient `~/.openclaw` (config, espace de travail) et le script de lancement `run-openclaw-podman.sh`.
- **Podman sans racine :** L'utilisateur doit disposer d'une plage **subuid** et **subgid**. De nombreuses distributions les attribuent automatiquement lors de la création de l'utilisateur. Si l'installation affiche un avertissement, ajoutez des lignes à `/etc/subuid` et `/etc/subgid` :

  ```text
  openclaw:100000:65536
  ```

  Démarrez ensuite la passerelle en tant que cet utilisateur (par exemple depuis cron ou systemd) :

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **Configuration :** Seul `openclaw` et root peuvent accéder à `/home/openclaw/.openclaw`. Pour modifier la configuration : utilisez l'interface de contrôle une fois que la passerelle est en cours d'exécution, ou `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`.

## Environnement et configuration

- **Jeton :** Stocké dans `~openclaw/.openclaw/.env` sous `OPENCLAW_GATEWAY_TOKEN`. `setup-podman.sh` et `run-openclaw-podman.sh` le génèrent s'il est manquant (utilise `openssl`, `python3` ou `od`).
- **Optionnel :** Dans ce `.env`, vous pouvez définir des clés de provider (p. ex. `GROQ_API_KEY`, `OLLAMA_API_KEY`) et d'autres env vars OpenClaw.
- **Ports hôtes :** Par défaut, le script mappe `18789` (gateway) et `18790` (bridge). Remplacez le mappage de port **hôte** par `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` et `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` lors du lancement.
- **Liaison Gateway :** Par défaut, `run-openclaw-podman.sh` démarre la gateway avec `--bind loopback` pour un accès local sécurisé. Pour exposer sur le réseau local, définissez `OPENCLAW_GATEWAY_BIND=lan` et configurez `gateway.controlUi.allowedOrigins` (ou activez explicitement le repli de l'en-tête hôte) dans `openclaw.json`.
- **Chemins :** La configuration et l'espace de travail de l'hôte sont définis par défaut sur `~openclaw/.openclaw` et `~openclaw/.openclaw/workspace`. Remplacez les chemins de l'hôte utilisés par le script de lancement par `OPENCLAW_CONFIG_DIR` et `OPENCLAW_WORKSPACE_DIR`.

## Modèle de stockage

- **Données persistantes de l'hôte :** `OPENCLAW_CONFIG_DIR` et `OPENCLAW_WORKSPACE_DIR` sont montés par liaison dans le conteneur et conservent leur état sur l'hôte.
- **tmpfs de bac à sable éphémère :** si vous activez `agents.defaults.sandbox`, les conteneurs du bac à sable de l'outil montent `tmpfs` sur `/tmp`, `/var/tmp` et `/run`. Ces chemins sont basés sur la mémoire et disparaissent avec le conteneur du bac à sable ; la configuration du conteneur Podman de niveau supérieur n'ajoute pas ses propres montages tmpfs.
- **Points chauds de croissance du disque :** les principaux chemins à surveiller sont `media/`, `agents/<agentId>/sessions/sessions.json`, les fichiers JSONL de transcription, `cron/runs/*.jsonl`, et les fichiers journaux tournants sous `/tmp/openclaw/` (ou votre `logging.file` configuré).

`setup-podman.sh` met maintenant en scène l'archive de l'image dans un répertoire temporaire privé et imprime le répertoire de base choisi lors de la configuration. Pour les exécutions non root, il accepte `TMPDIR` uniquement lorsque cette base est sûre à utiliser ; sinon, il revient à `/var/tmp`, puis `/tmp`. L'archive sauvegardée reste réservée au propriétaire et est diffusée dans le `podman load` de l'utilisateur cible, donc les répertoires temporaires privés de l'appelant ne bloquent pas la configuration.

## Commandes utiles

- **Journaux :** Avec quadlet : `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`. Avec un script : `sudo -u openclaw podman logs -f openclaw`
- **Arrêter :** Avec quadlet : `sudo systemctl --machine openclaw@ --user stop openclaw.service`. Avec le script : `sudo -u openclaw podman stop openclaw`
- **Redémarrer :** Avec quadlet : `sudo systemctl --machine openclaw@ --user start openclaw.service`. Avec le script : relancez le script de lancement ou `podman start openclaw`
- **Supprimer le conteneur :** `sudo -u openclaw podman rm -f openclaw` — la configuration et l'espace de travail sur l'hôte sont conservés

## Dépannage

- **Permission refusée (EACCES) sur la config ou les profils d'auth :** Le conteneur utilise par défaut `--userns=keep-id` et s'exécute avec le même uid/gid que l'utilisateur hôte exécutant le script. Assurez-vous que vos `OPENCLAW_CONFIG_DIR` et `OPENCLAW_WORKSPACE_DIR` hôte sont détenus par cet utilisateur.
- **Gateway démarrage bloqué (manque `gateway.mode=local`) :** Assurez-vous que `~openclaw/.openclaw/openclaw.json` existe et définit `gateway.mode="local"`. `setup-podman.sh` crée ce fichier s'il manque.
- **Échec du Podman sans root pour l'utilisateur openclaw :** Vérifiez que `/etc/subuid` et `/etc/subgid` contiennent une ligne pour `openclaw` (par ex. `openclaw:100000:65536`). Ajoutez-la si elle manque et redémarrez.
- **Nom de conteneur déjà utilisé :** Le script de lancement utilise `podman run --replace`, le conteneur existant est donc remplacé lorsque vous redémarrez. Pour nettoyer manuellement : `podman rm -f openclaw`.
- **Script introuvable lors de l'exécution en tant qu'openclaw :** Assurez-vous que `setup-podman.sh` a été exécuté pour que `run-openclaw-podman.sh` soit copié dans le répertoire personnel d'openclaw (par ex. `/home/openclaw/run-openclaw-podman.sh`).
- **Service Quadlet introuvable ou échec du démarrage :** Exécutez `sudo systemctl --machine openclaw@ --user daemon-reload` après avoir modifié le fichier `.container`. Quadlet nécessite cgroups v2 : `podman info --format '{{.Host.CgroupsVersion}}'` doit afficher `2`.

## Optionnel : exécuter en tant que votre propre utilisateur

Pour exécuter la passerelle en tant qu'utilisateur normal (pas d'utilisateur openclaw dédié) : construisez l'image, créez `~/.openclaw/.env` avec `OPENCLAW_GATEWAY_TOKEN`, et exécutez le conteneur avec `--userns=keep-id` et des montages vers votre `~/.openclaw`. Le script de lancement est conçu pour le flux utilisateur openclaw ; pour une configuration mono-utilisateur, vous pouvez plutôt exécuter manuellement la commande `podman run` du script, en pointant la configuration et l'espace de travail vers votre répertoire personnel. Recommandé pour la plupart des utilisateurs : utilisez `setup-podman.sh` et exécutez en tant qu'utilisateur openclaw afin que la configuration et le processus soient isolés.

import en from "/components/footer/en.mdx";

<en />
