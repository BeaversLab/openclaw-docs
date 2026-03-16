---
summary: "Installation automatisée et sécurisée d'OpenClaw avec Ansible, Tailscale VPN et isolement par pare-feu"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Installation Ansible

La méthode recommandée pour déployer OpenClaw sur des serveurs de production passe par **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** — un programme d'installation automatisé avec une architecture axée sur la sécurité.

## Démarrage rapide

Installation en une seule commande :

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 Guide complet : [github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> Le dépôt openclaw-ansible est la source de vérité pour le déploiement Ansible. Cette page offre un aperçu rapide.

## Ce que vous obtenez

- 🔒 **Sécurité avant tout par pare-feu** : UFW + isolement Docker (seul SSH + Tailscale accessible)
- 🔐 **VPN Tailscale** : Accès distant sécurisé sans exposer publiquement les services
- 🐳 **Docker** : Conteneurs de bac à sable isolés, liaisons localhost uniquement
- 🛡️ **Défense en profondeur** : Architecture de sécurité à 4 couches
- 🚀 **Configuration en une commande** : Déploiement complet en quelques minutes
- 🔧 **Intégration Systemd** : Démarrage automatique au démarrage avec durcissement

## Prérequis

- **OS** : Debian 11+ ou Ubuntu 20.04+
- **Accès** : Privilèges root ou sudo
- **Réseau** : Connexion Internet pour l'installation des paquets
- **Ansible** : 2.14+ (installé automatiquement par le script de démarrage rapide)

## Ce qui est installé

Le playbook Ansible installe et configure :

1. **Tailscale** (VPN maillé pour un accès distant sécurisé)
2. **Pare-feu UFW** (Ports SSH + Tailscale uniquement)
3. **Docker CE + Compose V2** (pour les bacs à sable de l'agent)
4. **Node.js 24 + pnpm** (dépendances d'exécution ; Node 22 LTS, actuellement `22.16+`, reste pris en charge pour la compatibilité)
5. **OpenClaw** (basé sur l'hôte, non conteneurisé)
6. **Service Systemd** (démarrage automatique avec durcissement de la sécurité)

Remarque : La passerelle s'exécute **directement sur l'hôte** (pas dans Docker), mais les bacs à sable de l'agent utilisent Docker pour l'isolement. Voir [Bac à sable (Sandboxing)](/fr/gateway/sandboxing) pour plus de détails.

## Configuration post-installation

Une fois l'installation terminée, basculez vers l'utilisateur openclaw :

```bash
sudo -i -u openclaw
```

Le script post-installation vous guidera à travers :

1. **Assistant de configuration** : Configurer les paramètres OpenClaw
2. **Connexion au fournisseur** : Connecter WhatsApp/Telegram/Discord/Signal
3. **Test de passerelle** : Vérifier l'installation
4. **Configuration Tailscale** : Connecter à votre maillage VPN

### Commandes rapides

```bash
# Check service status
sudo systemctl status openclaw

# View live logs
sudo journalctl -u openclaw -f

# Restart gateway
sudo systemctl restart openclaw

# Provider login (run as openclaw user)
sudo -i -u openclaw
openclaw channels login
```

## Architecture de sécurité

### Défense à 4 couches

1. **Pare-feu (UFW)** : Seul SSH (22) + Tailscale (41641/udp) sont exposés publiquement
2. **VPN (Tailscale)** : La Gateway n'est accessible que via le maillage VPN
3. **Isolation Docker** : La chaîne iptables DOCKER-USER empêche l'exposition des ports externes
4. **Durcissement Systemd** : NoNewPrivileges, PrivateTmp, utilisateur non privilégié

### Vérification

Testez la surface d'attaque externe :

```bash
nmap -p- YOUR_SERVER_IP
```

Devrait afficher **uniquement le port 22** (SSH) ouvert. Tous les autres services (passerelle, Docker) sont verrouillés.

### Disponibilité de Docker

Docker est installé pour les **sandbox d'agents** (exécution isolée d'outils), et non pour exécuter la passerelle elle-même. La passerelle se lie uniquement à localhost et est accessible via le VPN Tailscale.

Voir [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour la configuration du sandbox.

## Installation manuelle

Si vous préférez un contrôle manuel sur l'automatisation :

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y ansible git

# 2. Clone repository
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. Install Ansible collections
ansible-galaxy collection install -r requirements.yml

# 4. Run playbook
./run-playbook.sh

# Or run directly (then manually execute /tmp/openclaw-setup.sh after)
# ansible-playbook playbook.yml --ask-become-pass
```

## Mise à jour de OpenClaw

L'installateur Ansible configure OpenClaw pour les mises à jour manuelles. Voir [Updating](/fr/install/updating) pour le flux de mise à jour standard.

Pour relancer le playbook Ansible (par exemple, pour les changements de configuration) :

```bash
cd openclaw-ansible
./run-playbook.sh
```

Remarque : C'est idempotent et sans risque d'exécution multiple.

## Dépannage

### Le pare-feu bloque ma connexion

Si vous êtes bloqué :

- Assurez-vous que vous pouvez accéder d'abord via le VPN Tailscale
- L'accès SSH (port 22) est toujours autorisé
- La passerelle n'est accessible **que** via Tailscale par conception

### Le service ne démarre pas

```bash
# Check logs
sudo journalctl -u openclaw -n 100

# Verify permissions
sudo ls -la /opt/openclaw

# Test manual start
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Problèmes de sandbox Docker

```bash
# Verify Docker is running
sudo systemctl status docker

# Check sandbox image
sudo docker images | grep openclaw-sandbox

# Build sandbox image if missing
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### Échec de la connexion au fournisseur

Assurez-vous d'exécuter en tant qu'utilisateur `openclaw` :

```bash
sudo -i -u openclaw
openclaw channels login
```

## Configuration avancée

Pour une architecture de sécurité détaillée et le dépannage :

- [Architecture de sécurité](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Détails techniques](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Guide de dépannage](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## Connexe

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — guide complet de déploiement
- [Docker](/fr/install/docker) — configuration de la passerelle conteneurisée
- [Sandboxing](/fr/gateway/sandboxing) — configuration du bac à sable de l'agent
- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) — isolation par agent

import fr from "/components/footer/fr.mdx";

<fr />
