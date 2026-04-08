---
summary: "Assistants de shell ClawDock pour les installations OpenClaw basées sur Docker"
read_when:
  - You run OpenClaw with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

# ClawDock

ClawDock est une petite couche d'assistance shell pour les installations OpenClaw basées sur Docker.

Il vous fournit des commandes courtes comme `clawdock-start`, `clawdock-dashboard` et `clawdock-fix-token` au lieu des appels plus longs `docker compose ...`.

Si vous n'avez pas encore configuré Docker, commencez par [Docker](/en/install/docker).

## Installer

Utilisez le chemin d'assistant canonique :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si vous avez précédemment installé ClawDock depuis `scripts/shell-helpers/clawdock-helpers.sh`, réinstallez-le depuis le nouveau chemin `scripts/clawdock/clawdock-helpers.sh`. L'ancien chemin brut GitHub a été supprimé.

## Ce que vous obtenez

### Opérations de base

| Commande           | Description                          |
| ------------------ | ------------------------------------ |
| `clawdock-start`   | Démarrer la passerelle               |
| `clawdock-stop`    | Arrêter la passerelle                |
| `clawdock-restart` | Redémarrer la passerelle             |
| `clawdock-status`  | Vérifier l'état du conteneur         |
| `clawdock-logs`    | Suivre les journaux de la passerelle |

### Accès au conteneur

| Commande                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `clawdock-shell`          | Ouvrir un shell dans le conteneur de la passerelle |
| `clawdock-cli <command>`  | Exécuter les commandes CLI OpenClaw dans Docker    |
| `clawdock-exec <command>` | Exécuter une commande arbitraire dans le conteneur |

### Interface Web et appariement

| Commande                | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `clawdock-dashboard`    | Ouvrir l'URL de l'interface de contrôle        |
| `clawdock-devices`      | Lister les appariements d'appareils en attente |
| `clawdock-approve <id>` | Approuver une demande d'appariement            |

### Configuration et maintenance

| Commande             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `clawdock-fix-token` | Configurer le jeton de la passerelle dans le conteneur |
| `clawdock-update`    | Tirer, reconstruire et redémarrer                      |
| `clawdock-rebuild`   | Reconstruire uniquement l'image Docker                 |
| `clawdock-clean`     | Supprimer les conteneurs et les volumes                |

### Utilitaires

| Commande               | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `clawdock-health`      | Exécuter une vérification de santé de la passerelle              |
| `clawdock-token`       | Afficher le jeton de la passerelle                               |
| `clawdock-cd`          | Aller au répertoire du projet OpenClaw                           |
| `clawdock-config`      | Ouvrir `~/.openclaw`                                             |
| `clawdock-show-config` | Imprimer les fichiers de configuration avec les valeurs masquées |
| `clawdock-workspace`   | Ouvrir le répertoire de l'espace de travail                      |

## Première utilisation

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

Si le navigateur indique qu'un appariement est requis :

```bash
clawdock-devices
clawdock-approve <request-id>
```

## Configuration et secrets

ClawDock fonctionne avec le même découpage de configuration Docker que celui décrit dans [Docker](/en/install/docker) :

- `<project>/.env` pour les valeurs spécifiques à Docker telles que le nom de l'image, les ports et le jeton de passerelle
- `~/.openclaw/.env` pour les clés de provider et les jetons de bot basés sur des variables d'environnement
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` pour l'authentification par clé OAuth/API du provider stockée
- `~/.openclaw/openclaw.json` pour la configuration du comportement

Utilisez `clawdock-show-config` lorsque vous souhaitez inspecter rapidement les fichiers `.env` et `openclaw.json`. Il masque les valeurs `.env` dans sa sortie imprimée.

## Pages connexes

- [Docker](/en/install/docker)
- [Runtime VM Docker](/en/install/docker-vm-runtime)
- [Mise à jour](/en/install/updating)
