---
summary: "Installation automatisée et durcie d'OpenClaw avec Ansible, le VPN Tailscale et l'isolation par pare-feu"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Installation Ansible

Déployez OpenClaw sur des serveurs de production avec **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** -- un installateur automatisé avec une architecture axée sur la sécurité.

<Info>Le dépôt [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) est la source de vérité pour le déploiement Ansible. Cette page est un aperçu rapide.</Info>

## Prérequis

| Exigence    | Détails                                                            |
| ----------- | ------------------------------------------------------------------ |
| **SE**      | Debian 11+ ou Ubuntu 20.04+                                        |
| **Accès**   | Privilèges root ou sudo                                            |
| **Réseau**  | Connexion Internet pour l'installation des paquets                 |
| **Ansible** | 2.14+ (installé automatiquement par le script de démarrage rapide) |

## Ce que vous obtenez

- **Sécurité axée sur le pare-feu** -- UFW + isolation Docker (seul SSH + Tailscale accessible)
- **VPN Tailscale** -- accès à distance sécurisé sans exposer publiquement les services
- **Docker** -- conteneurs de bac à sable (sandbox) isolés, liaisons localhost uniquement
- **Défense en profondeur** -- architecture de sécurité à 4 couches
- **Intégration Systemd** -- démarrage automatique au boot avec durcissement
- **Installation en une seule commande** -- déploiement complet en quelques minutes

## Démarrage rapide

Installation en une seule commande :

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## Ce qui est installé

Le playbook Ansible installe et configure :

1. **Tailscale** -- VPN maillé pour un accès à distance sécurisé
2. **Pare-feu UFW** -- uniquement les ports SSH + Tailscale
3. **Docker CE + Compose V2** -- pour les bac à sable (sandboxes) d'agents
4. **Node.js 24 + pnpm** -- dépendances d'exécution (Node 22 LTS, actuellement `22.14+`, reste pris en charge)
5. **OpenClaw** -- basé sur l'hôte, non conteneurisé
6. **Service Systemd** -- démarrage automatique avec durcissement de la sécurité

<Note>La passerelle s'exécute directement sur l'hôte (pas dans Docker), mais les sandboxs d'agent utilisent Docker pour l'isolation. Voir [Sandboxing](/fr/gateway/sandboxing) pour les détails.</Note>

## Configuration post-installation

<Steps>
  <Step title="Switch to the openclaw user">```bash sudo -i -u openclaw ```</Step>
  <Step title="Exécuter l'assistant de configuration">Le script post-installation vous guide dans la configuration des paramètres OpenClaw.</Step>
  <Step title="Connecter les fournisseurs de messagerie">Connectez-vous à WhatsApp, Telegram, Discord ou Signal : ```bash openclaw channels login ```</Step>
  <Step title="Vérifier l'installation">```bash sudo systemctl status openclaw sudo journalctl -u openclaw -f ```</Step>
  <Step title="Connecter à Tailscale">Rejoignez votre maillage VPN pour un accès distant sécurisé.</Step>
</Steps>

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

Le déploiement utilise un modèle de défense à 4 couches :

1. **Pare-feu (UFW)** -- seuls SSH (22) + Tailscale (41641/udp) sont exposés publiquement
2. **VPN (Tailscale)** -- passerelle accessible uniquement via le maillage VPN
3. **Isolation Docker** -- la chaîne iptables DOCKER-USER empêche l'exposition des ports externes
4. **Durcissement Systemd** -- NoNewPrivileges, PrivateTmp, utilisateur non privilégié

Pour vérifier votre surface d'attaque externe :

```bash
nmap -p- YOUR_SERVER_IP
```

Seul le port 22 (SSH) doit être ouvert. Tous les autres services (passerelle, Docker) sont verrouillés.

Docker est installé pour les sandbox d'agents (exécution d'outil isolée), et non pour exécuter la passerelle elle-même. Voir [Multi-Agent Sandbox and Tools](/fr/tools/multi-agent-sandbox-tools) pour la configuration des sandbox.

## Installation manuelle

Si vous préférez un contrôle manuel plutôt que l'automatisation :

<Steps>
  <Step title="Install prerequisites">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="Clone the repository">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="Install Ansible collections">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="Exécutez le playbook">
    ```bash
    ./run-playbook.sh
    ```

    Alternativement, exécutez directement puis exécutez manuellement le script de configuration par la suite :
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # Then run: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## Mise à jour

Le programme d'installation Ansible configure OpenClaw pour les mises à jour manuelles. Voir [Updating](/fr/install/updating) pour le flux de mise à jour standard.

Pour réexécuter le playbook Ansible (par exemple, pour les changements de configuration) :

```bash
cd openclaw-ansible
./run-playbook.sh
```

Ceci est idempotent et sûr à exécuter plusieurs fois.

## Dépannage

<AccordionGroup>
  <Accordion title="Le pare-feu bloque ma connexion">
    - Assurez-vous que vous pouvez accéder via le VPN Tailscale d'abord
    - L'accès SSH (port 22) est toujours autorisé
    - La passerelle est uniquement accessible via Tailscale par conception
  </Accordion>
  <Accordion title="Le service ne démarre pas">
    ```bash
    # Check logs
    sudo journalctl -u openclaw -n 100

    # Verify permissions
    sudo ls -la /opt/openclaw

    # Test manual start
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker sandbox issues">
    ```bash
    # Verify Docker is running
    sudo systemctl status docker

    # Check sandbox image
    sudo docker images | grep openclaw-sandbox

    # Build sandbox image if missing
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    ```

  </Accordion>
  <Accordion title="La connexion au fournisseur échoue">
    Assurez-vous que vous exécutez en tant qu'utilisateur `openclaw` :
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## Configuration avancée

Pour une architecture de sécurité détaillée et le dépannage, consultez le dépôt openclaw-ansible :

- [Architecture de sécurité](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Détails techniques](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Guide de dépannage](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## Connexes

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- guide complet de déploiement
- [Docker](/fr/install/docker) -- configuration de passerelle conteneurisée
- [Sandboxing](/fr/gateway/sandboxing) -- configuration du bac à sable de l'agent
- [Multi-Agent Sandbox and Tools](/fr/tools/multi-agent-sandbox-tools) -- isolement par agent
