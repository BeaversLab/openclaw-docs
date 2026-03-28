---
summary: "Exécuter OpenClaw dans un conteneur Podman sans privilèges root"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Exécutez le OpenClaw Gateway dans un conteneur Podman **sans racine**. Utilise la même image que Docker (construite à partir du [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) du dépôt).

## Prérequis

- **Podman** (mode sans racine)
- Accès **sudo** pour la configuration unique (création de l'utilisateur dédié et construction de l'image)

## Démarrage rapide

<Steps>
  <Step title="Configuration unique">
    À partir de la racine du dépôt, exécutez le script de configuration. Il crée un utilisateur `openclaw` dédié, construit l'image du conteneur et installe le script de lancement :

    ```bash
    ./scripts/podman/setup.sh
    ```

    Cela crée également une configuration minimale dans `~openclaw/.openclaw/openclaw.json` (définit `gateway.mode` à `"local"`) pour que le Gateway puisse démarrer sans exécuter l'assistant.

    Par défaut, le conteneur n'est **pas** installé en tant que service systemd -- vous le démarrez manuellement à l'étape suivante. Pour une configuration de type production avec démarrage et redémarrage automatiques, passez plutôt `--quadlet` :

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    (Ou définissez `OPENCLAW_PODMAN_QUADLET=1`. Utilisez `--container` pour installer uniquement le conteneur et le script de lancement.)

    **Variables d'environnement de build optionnelles** (à définir avant d'exécuter `scripts/podman/setup.sh`) :

    - `OPENCLAW_DOCKER_APT_PACKAGES` -- installe des paquets apt supplémentaires lors de la construction de l'image.
    - `OPENCLAW_EXTENSIONS` -- pré-installe les dépendances des extensions (noms séparés par des espaces, ex. `diagnostics-otel matrix`).

  </Step>

  <Step title="Démarrer le Gateway">
    Pour un lancement manuel rapide :

    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

  </Step>

  <Step title="Exécuter l'assistant d'intégration">
    Pour ajouter des chaînes ou des fournisseurs de manière interactive :

    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    Ensuite, ouvrez `http://127.0.0.1:18789/` et utilisez le jeton depuis `~openclaw/.openclaw/.env` (ou la valeur affichée par la configuration).

  </Step>
</Steps>

## Systemd (Quadlet, optionnel)

Si vous avez exécuté `./scripts/podman/setup.sh --quadlet` (ou `OPENCLAW_PODMAN_QUADLET=1`), une unité [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) est installée pour que la passerelle s'exécute en tant que service utilisateur systemd pour l'utilisateur openclaw. Le service est activé et démarré à la fin de la configuration.

- **Démarrer :** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **Arrêt :** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **Statut :** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **Journaux :** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

Le fichier quadlet se trouve à `~openclaw/.config/containers/systemd/openclaw.container`. Pour changer les ports ou les variables d'environnement, modifiez ce fichier (ou le `.env` qu'il source), puis `sudo systemctl --machine openclaw@ --user daemon-reload` et redémarrez le service. Au démarrage, le service se lance automatiquement si la persistance est activée pour openclaw (l'installation le fait si loginctl est disponible).

Pour ajouter quadlet **après** une installation initiale qui ne l'utilisait pas, relancez : `./scripts/podman/setup.sh --quadlet`.

## L'utilisateur openclaw (non-login)

`scripts/podman/setup.sh` crée un utilisateur système dédié `openclaw` :

- **Shell :** `nologin` — pas de login interactif ; réduit la surface d'attaque.
- **Home :** par ex. `/home/openclaw` — contient `~/.openclaw` (config, workspace) et le script de lancement `run-openclaw-podman.sh`.
- **Podman rootless :** L'utilisateur doit disposer d'une plage **subuid** et **subgid**. De nombreuses distributions les assignent automatiquement lors de la création de l'utilisateur. Si l'installation affiche un avertissement, ajoutez des lignes à `/etc/subuid` et `/etc/subgid` :

  ```text
  openclaw:100000:65536
  ```

  Démarrez ensuite la passerelle en tant que cet utilisateur (par exemple depuis cron ou systemd) :

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **Config :** Seuls `openclaw` et root peuvent accéder à `/home/openclaw/.openclaw`. Pour modifier la configuration : utilisez l'interface de contrôle une fois la passerelle démarrée, ou `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`.

## Environnement et configuration

- **Jeton :** Stocké dans `~openclaw/.openclaw/.env` sous le nom `OPENCLAW_GATEWAY_TOKEN`. `scripts/podman/setup.sh` et `run-openclaw-podman.sh` le génèrent s'il est manquant (utilise `openssl`, `python3`, ou `od`).
- **Optionnel :** Dans ce `.env`, vous pouvez définir les clés de fournisseur (par ex. `GROQ_API_KEY`, `OLLAMA_API_KEY`) et autres OpenClaw env vars.
- **Ports hôtes :** Par défaut, le script mappe `18789` (passerelle) et `18790` (pont). Redéfinissez le mappage de port **hôte** avec `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` et `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` lors du lancement.
- **Liaison de la passerelle :** Par défaut, `run-openclaw-podman.sh` démarre la passerelle avec `--bind loopback` pour un accès local sécurisé. Pour exposer sur le réseau local, définissez `OPENCLAW_GATEWAY_BIND=lan` et configurez `gateway.controlUi.allowedOrigins` (ou activez explicitement le repli de l'en-tête d'hôte) dans `openclaw.json`.
- **Chemins :** La configuration et l'espace de travail de l'hôte sont par défaut `~openclaw/.openclaw` et `~openclaw/.openclaw/workspace`. Remplacez les chemins de l'hôte utilisés par le script de lancement avec `OPENCLAW_CONFIG_DIR` et `OPENCLAW_WORKSPACE_DIR`.

## Modèle de stockage

- **Données persistantes de l'hôte :** `OPENCLAW_CONFIG_DIR` et `OPENCLAW_WORKSPACE_DIR` sont montés en liaison dans le conteneur et conservent l'état sur l'hôte.
- **Tmpfs de bac à sable éphémère :** si vous activez `agents.defaults.sandbox`, les conteneurs de bac à sable de l'outil montent `tmpfs` à `/tmp`, `/var/tmp` et `/run`. Ces chemins sont sauvegardés en mémoire et disparaissent avec le conteneur de bac à sable ; la configuration du conteneur Podman de premier niveau n'ajoute pas ses propres montages tmpfs.
- **Points chauds de croissance du disque :** les principaux chemins à surveiller sont `media/`, `agents/<agentId>/sessions/sessions.json`, les fichiers JSONL de transcription, `cron/runs/*.jsonl`, et les journaux de fichiers déroulants sous `/tmp/openclaw/` (ou votre `logging.file` configuré).

`scripts/podman/setup.sh` prépare désormais l'archive de l'image dans un répertoire temporaire privé et imprime le répertoire de base choisi lors de la configuration. Pour les exécutions non root, il n'accepte `TMPDIR` que lorsque cette base est sûre à utiliser ; sinon, il revient à `/var/tmp`, puis à `/tmp`. L'archive sauvegardée reste réservée au propriétaire et est diffusée dans le `podman load` de l'utilisateur cible, de sorte que les répertoires temporaires privés de l'appelant ne bloquent pas la configuration.

## Commandes utiles

- **Journaux :** Avec quadlet : `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`. Avec script : `sudo -u openclaw podman logs -f openclaw`
- **Arrêt :** Avec quadlet : `sudo systemctl --machine openclaw@ --user stop openclaw.service`. Avec script : `sudo -u openclaw podman stop openclaw`
- **Redémarrer :** Avec quadlet : `sudo systemctl --machine openclaw@ --user start openclaw.service`. Avec le script : relancez le script de lancement ou `podman start openclaw`
- **Supprimer le conteneur :** `sudo -u openclaw podman rm -f openclaw` — la configuration et l'espace de travail sur l'hôte sont conservés

## Dépannage

- **Permission refusée (EACCES) sur la configuration ou les profils d'authentification :** Le conteneur utilise par défaut `--userns=keep-id` et s'exécute avec le même uid/gid que l'utilisateur hôte exécutant le script. Assurez-vous que votre `OPENCLAW_CONFIG_DIR` et votre `OPENCLAW_WORKSPACE_DIR` sur l'hôte appartiennent à cet utilisateur.
- **Démarrage du Gateway bloqué (`gateway.mode=local` manquant) :** Assurez-vous que `~openclaw/.openclaw/openclaw.json` existe et définit `gateway.mode="local"`. `scripts/podman/setup.sh` crée ce fichier s'il est manquant.
- **Rootless Podman échoue pour l'utilisateur openclaw :** Vérifiez que `/etc/subuid` et `/etc/subgid` contiennent une ligne pour `openclaw` (ex. `openclaw:100000:65536`). Ajoutez-la si elle manque et redémarrez.
- **Nom de conteneur déjà utilisé :** Le script de lancement utilise `podman run --replace`, donc le conteneur existant est remplacé lorsque vous redémarrez. Pour nettoyer manuellement : `podman rm -f openclaw`.
- **Script introuvable lors de l'exécution en tant qu'openclaw :** Assurez-vous que `scripts/podman/setup.sh` a été exécuté pour que `run-openclaw-podman.sh` soit copié dans le répertoire personnel d'openclaw (ex. `/home/openclaw/run-openclaw-podman.sh`).
- **Service Quadlet introuvable ou échec du démarrage :** Exécutez `sudo systemctl --machine openclaw@ --user daemon-reload` après avoir modifié le fichier `.container`. Quadlet nécessite cgroups v2 : `podman info --format '{{.Host.CgroupsVersion}}'` devrait afficher `2`.

## Optionnel : exécuter en tant que votre propre utilisateur

Pour exécuter la passerelle en tant qu'utilisateur normal (pas d'utilisateur openclaw dédié) : construisez l'image, créez `~/.openclaw/.env` avec `OPENCLAW_GATEWAY_TOKEN`, et lancez le conteneur avec `--userns=keep-id` et des montages vers votre `~/.openclaw`. Le script de lancement est conçu pour le flux de l'utilisateur openclaw ; pour une configuration mono-utilisateur, vous pouvez plutôt exécuter manuellement la commande `podman run` du script, en pointant la configuration et l'espace de travail vers votre répertoire personnel. Recommandé pour la plupart des utilisateurs : utilisez `scripts/podman/setup.sh` et exécutez en tant qu'utilisateur openclaw afin que la configuration et le processus soient isolés.
