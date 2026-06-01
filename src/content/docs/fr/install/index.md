---
summary: "OpenClawnpmDockerInstaller OpenClaw - script d'installation, npm/pnpm/bun, à partir des sources, Docker, et plus encore"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Installer"
---

## Configuration système requise

- **Node 24** (recommandé) ou Node 22.19+ - le script d'installation gère cela automatiquement
- **macOS, Linux ou Windows** - Windows natif et WSL2 sont tous deux pris en charge ; WSL2 est plus stable. Voir [Windows](macOSLinuxWindowsWindowsWSL2WSL2Windows/en/platforms/windows).
- `pnpm` n'est nécessaire que si vous compilez à partir des sources

## Recommandé : script d'installation

Le moyen le plus rapide d'installer. Il détecte votre système d'exploitation, installe Node si nécessaire, installe OpenClaw et lance l'intégration.

<Tabs>
  <Tab title="macOSLinuxWSL2macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="WindowsWindows (PowerShell)">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
</Tabs>

Pour installer sans lancer l'intégration :

<Tabs>
  <Tab title="macOSLinuxWSL2macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="WindowsWindows (PowerShell)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

Pour tous les indicateurs et options d'automatisation CI, voir [Fonctionnement interne de l'installateur](/fr/install/installer).

## Méthodes d'installation alternatives

### Installateur de préfixe local (`install-cli.sh`)

Utilisez cette méthode lorsque vous souhaitez garder OpenClaw et Node sous un préfixe local tel que
OpenClaw`~/.openclaw`, sans dépendre d'une installation Node à l'échelle du système :

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

Il prend en charge les installations npm par défaut, ainsi que les installations git-checkout dans le même
flux de préfixe. Référence complète : [Fonctionnement interne de l'installateur](npm/en/install/installer#install-clish).

Déjà installé ? Basculez entre les installations de package et git avec
`openclaw update --channel dev` et `openclaw update --channel stable`. Voir
[Mise à jour](/fr/install/updating#switch-between-npm-and-git-installs).

### npm, pnpm ou bun

Si vous gérez déjà Node vous-même :

<Tabs>
  <Tab title="npmnpm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```npm

    <Note>
    L'installateur hébergé efface les filtres de fraîcheur npm tels que `min-release-age`OpenClawnpmnpm
    pour l'installation du package OpenClaw. Si vous installez manuellement avec npm, votre propre
    politique npm s'applique toujours.
    </Note>

  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm nécessite une approbation explicite pour les packages avec des scripts de build. Exécutez `pnpm approve-builds -g` après la première installation.
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```BunCLIGateway

    <Note>
    Bun est pris en charge pour le chemin d'installation global du CLI. Pour le runtime Gateway, Node reste le runtime de démon recommandé.
    </Note>

  </Tab>
</Tabs>

### Depuis la source

Pour les contributeurs ou toute personne souhaitant exécuter depuis une extraction locale :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
openclaw onboard --install-daemon
```

Ou ignorez le lien et utilisez `pnpm openclaw ...` depuis l'intérieur du dépôt. Voir [Configuration](/fr/start/setup) pour les flux de travail de développement complets.

### Installer depuis l'extraction principale de GitHub

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main
```

### Conteneurs et gestionnaires de packages

<CardGroup cols={2}>
  <Card title="DockerDocker" href="/fr/install/docker" icon="container">
    Déploiements conteneurisés ou sans interface.
  </Card>
  <Card title="Podman" href="/fr/install/podman" icon="container" Docker>
    Alternative de conteneur sans privilèges root à Docker.
  </Card>
  <Card title="NixNix" href="/fr/install/nix" icon="snowflake" Nix>
    Installation déclarative via le flake Nix.
  </Card>
  <Card title="AnsibleAnsible" href="/fr/install/ansible" icon="server">
    Approvisionnement automatisé de flotte.
  </Card>
  <Card title="BunBun" href="/fr/install/bun" icon="zap" CLIBun>
    Utilisation en CLI uniquement via l'environnement d'exécution Bun.
  </Card>
</CardGroup>

## Vérifier l'installation

```bash
openclaw --version      # confirm the CLI is available
openclaw doctor         # check for config issues
openclaw gateway status # verify the Gateway is running
```

Si vous souhaitez un démarrage géré après l'installation :

- macOS : LaunchAgent via macOS`openclaw onboard --install-daemon` ou `openclaw gateway install`
- Linux/WSL2 : service utilisateur systemd via les mêmes commandes
- Windows natif : Tâche planifiée d'abord, avec un élément de connexion de dossier de démarrage par utilisateur en repli si la création de la tâche est refusée

## Hébergement et déploiement

Déployer OpenClaw sur un serveur cloud ou un VPS :

<CardGroup cols={3}>
  <Card title="VPS" href="/fr/vps"Linux>
    N'importe quel VPS Linux.
  </Card>
  <Card title="DockerDocker VM" href="/fr/install/docker-vm-runtime"Docker>
    Étapes Docker partagées.
  </Card>
  <Card title="Kubernetes" href="/fr/install/kubernetes">
    Déploiement K8s.
  </Card>
  <Card title="Fly.ioFly.io" href="/fr/install/fly"Fly.io>
    Déployer sur Fly.io.
  </Card>
  <Card title="HetznerHetzner" href="/fr/install/hetzner"Hetzner>
    Déploiement Hetzner.
  </Card>
  <Card title="GCPGCP" href="/fr/install/gcp">
    Déploiement Google Cloud.
  </Card>
  <Card title="Azure" href="/fr/install/azure">
    Déploiement Azure.
  </Card>
  <Card title="Railway" href="/fr/install/railway">
    Déploiement Railway.
  </Card>
  <Card title="Render" href="/fr/install/render">
    Déploiement Render.
  </Card>
  <Card title="Northflank" href="/fr/install/northflank">
    Déploiement Northflank.
  </Card>
</CardGroup>

## Mise à jour, migration ou désinstallation

<CardGroup cols={3}>
  <Card title="Updating" href="/fr/install/updating" icon="refresh-cw">
    Garder OpenClaw à jour.
  </Card>
  <Card title="Migrating" href="/fr/install/migrating" icon="arrow-right">
    Passer à une nouvelle machine.
  </Card>
  <Card title="Uninstall" href="/fr/install/uninstall" icon="trash-2">
    Supprimer OpenClaw complètement.
  </Card>
</CardGroup>

## Dépannage : `openclaw` introuvable

Si l'installation a réussi mais que `openclaw` est introuvable dans votre terminal :

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

Si `$(npm prefix -g)/bin` n'est pas dans votre `$PATH`, ajoutez-le à votre fichier de démarrage de shell (`~/.zshrc` ou `~/.bashrc`) :

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Ouvrez ensuite un nouveau terminal. Consultez la [configuration de Node](/fr/install/node) pour plus de détails.
