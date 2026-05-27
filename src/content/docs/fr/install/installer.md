---
summary: "Fonctionnement des scripts d'installation (install.sh, install-cli.sh, install.ps1), indicateurs et automatisation"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Installer internals"
---

OpenClaw est fourni avec trois scripts d'installation, accessibles via `openclaw.ai`.

| Script                             | Plateforme           | Ce qu'il fait                                                                                                               |
| ---------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.                  |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installe Node + OpenClaw dans un préfixe local (`~/.openclaw`) avec les modes npm ou git checkout. Aucun accès root requis. |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.                  |

## Commandes rapides

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>Si l'installation réussit mais que `openclaw` n'est pas trouvé dans un nouveau terminal, consultez le Node.js/en/install/node#troubleshooting troubleshooting.</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recommandé pour la plupart des installations interactives sur macOS/Linux/WSL.</Tip>

### Flow (install.sh)

<Steps>
  <Step title="Détecter le système d'exploitation">
    Prend en charge macOS et Linux (y compris WSL). Si macOS est détecté, installe Homebrew s'il est manquant.
  </Step>
  <Step title="Node.jsGarantir Node.js 24 par défaut"macOSLinuxOpenClaw>
    Vérifie la version de Node et installe Node 24 si nécessaire (Homebrew sur macOS, scripts de configuration NodeSource sur Linux apt/dnf/yum). OpenClaw prend toujours en charge Node 22 LTS, actuellement `22.19+`, pour la compatibilité.
  </Step>
  <Step title="Assurer Git">
    Installe Git s'il est manquant.
  </Step>
  <Step title="Installer OpenClaw">
    - Méthode `npm` (par défaut) : installation globale npm
    - Méthode `git` : cloner/mettre à jour le dépôt, installer les dépendances avec pnpm, construire, puis installer le wrapper dans `~/.local/bin/openclaw`

  </Step>
  <Step title="Tâches post-installation">
    - Actualise un service de passerelle chargé au mieux (`openclaw gateway install --force`, puis redémarre)
    - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux)
    - Tente l'onboarding lorsque cela est approprié (TTY disponible, onboarding non désactivé, et les vérifications bootstrap/config réussissent)
    - Définit `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut

  </Step>
</Steps>

### Source checkout detection

S'il est exécuté dans un checkout OpenClaw (`package.json` + `pnpm-workspace.yaml`), le script propose :

- utiliser le checkout (`git`), ou
- utiliser l'installation globale (`npm`)

Si aucun TTY n'est disponible et qu'aucune méthode d'installation n'est définie, il par défaut sur `npm` et avertit.

Le script se termine avec le code `2` pour une sélection de méthode invalide ou des valeurs `--install-method` invalides.

### Exemples (install.sh)

<Tabs>
  <Tab title="Par défaut">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Ignorer l'onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Install. Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="Checkout main GitHub">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main ```</Tab>
  <Tab title="Dry run">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des options">

| Option                                | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method` |
| `--npm`                               | Raccourci pour la méthode npm                                              |
| `--git`                               | Raccourci pour la méthode git. Alias : `--github`                          |
| `--version <version\|dist-tag\|spec>` | Version npm, dist-tag ou spécification de paquet (par défaut : `latest`)   |
| `--beta`                              | Utiliser le dist-tag beta si disponible, sinon revenir à `latest`          |
| `--git-dir <path>`                    | Répertoire de checkout (par défaut : `~/openclaw`). Alias : `--dir`        |
| `--no-git-update`                     | Ignorer `git pull` pour un checkout existant                               |
| `--no-prompt`                         | Désactiver les invites                                                     |
| `--no-onboard`                        | Ignorer l'onboarding                                                       |
| `--onboard`                           | Activer l'onboarding                                                       |
| `--dry-run`                           | Afficher les actions sans appliquer les modifications                      |
| `--verbose`                           | Activer la sortie de débogage (`set -x`, logs de niveau notice npm)        |
| `--help`                              | Afficher l'utilisation (`-h`)                                              |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                          | Description                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                | Méthode d'installation                                                           |
| `OPENCLAW_VERSION=latest\|next\|<semver>\|<spec>` | version npm, dist-tag ou spécification de paquet                                 |
| `OPENCLAW_BETA=0\|1`                              | Utiliser la version bêta si disponible                                           |
| `OPENCLAW_HOME=<path>`                            | Répertoire de base pour l'état OpenClaw et les chemins git/onboarding par défaut |
| `OPENCLAW_GIT_DIR=<path>`                         | Répertoire de checkout                                                           |
| `OPENCLAW_GIT_UPDATE=0\|1`                        | Activer/désactiver les mises à jour git                                          |
| `OPENCLAW_NO_PROMPT=1`                            | Désactiver les invites                                                           |
| `OPENCLAW_NO_ONBOARD=1`                           | Ignorer l'onboarding                                                             |
| `OPENCLAW_DRY_RUN=1`                              | Mode dry run                                                                     |
| `OPENCLAW_VERBOSE=1`                              | Mode de débogage                                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`       | niveau de log npm                                                                |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                | Contrôler le comportement de sharp/libvips (par défaut : `1`)                    |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Conçu pour les environnements où vous souhaitez tout sous un préfixe local (par défaut `~/.openclaw`) et aucune dépendance système Node. Prend en charge les installations npm par défaut, ainsi que les installations par git-checkout sous le même flux de préfixe.</Info>

### Flux (install-cli.sh)

<Steps>
  <Step title="Installer le runtime Node local">
    Télécharge une archive tarball LTS Node prise en charge et épinglée (la version est intégrée dans le script et mise à jour indépendamment) vers `<prefix>/tools/node-v<version>` et vérifie le SHA-256.
  </Step>
  <Step title="S'assurer de la présence de Git">
    Si Git est manquant, tente une installation via apt/dnf/yum sur Linux ou Homebrew sur macOS.
  </Step>
  <Step title="Installer OpenClaw sous le préfixe">
    - méthode `npm` (par défaut) : installe sous le préfixe avec npm, puis écrit un wrapper vers `<prefix>/bin/openclaw`
    - méthode `git` : clone/met à jour une extraction (par défaut `~/openclaw`) et écrit toujours le wrapper vers `<prefix>/bin/openclaw`

  </Step>
  <Step title="Actualiser le service de passerelle chargé">
    Si un service de passerelle est déjà chargé à partir du même préfixe, le script exécute
    `openclaw gateway install --force`, puis `openclaw gateway restart`, et
    sonde la santé de la passerelle au mieux.
  </Step>
</Steps>

### Exemples (install-cli.sh)

<Tabs>
  <Tab title="Par défaut">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Préfixe personnalisé + version">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Installation Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Sortie JSON d'automatisation">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Exécuter l'onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des indicateurs">

| Indicateur                  | Description                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `--prefix <path>`           | Préfixe d'installation (par défaut : `~/.openclaw`)                                            |
| `--install-method npm\|git` | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method`                     |
| `--npm`                     | Raccourci pour la méthode npm                                                                  |
| `--git`, `--github`         | Raccourci pour la méthode git                                                                  |
| `--git-dir <path>`          | Répertoire de checkout Git (par défaut : `~/openclaw`). Alias : `--dir`                        |
| `--version <ver>`           | Version OpenClaw ou dist-tag (par défaut : `latest`)                                           |
| `--node-version <ver>`      | Version Node (par défaut : `22.22.0`)                                                          |
| `--json`                    | Émettre des événements NDJSON                                                                  |
| `--onboard`                 | Exécuter `openclaw onboard` après l'installation                                               |
| `--no-onboard`              | Ignorer l'onboarding (par défaut)                                                              |
| `--set-npm-prefix`          | Sur Linux, forcer le préfixe npm à `~/.npm-global` si le préfixe actuel n'est pas inscriptible |
| `--help`                    | Afficher l'utilisation (`-h`)                                                                  |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                       | Description                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                       | Préfixe d'installation                                                           |
| `OPENCLAW_INSTALL_METHOD=git\|npm`             | Méthode d'installation                                                           |
| `OPENCLAW_VERSION=<ver>`OpenClaw               | Version OpenClaw ou dist-tag                                                     |
| `OPENCLAW_NODE_VERSION=<ver>`                  | Version Node                                                                     |
| `OPENCLAW_HOME=<path>`OpenClaw                 | Répertoire de base pour l'état OpenClaw et les chemins git/onboarding par défaut |
| `OPENCLAW_GIT_DIR=<path>`                      | Répertoire de checkout Git pour les installations git                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                     | Activer les mises à jour git pour les checkouts existants                        |
| `OPENCLAW_NO_ONBOARD=1`                        | Ignorer l'onboarding                                                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`npm | Niveau de log npm                                                                |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`             | Contrôler le comportement de sharp/libvips (par défaut : `1`)                    |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flux (install.ps1)

<Steps>
  <Step title="S'assurer de l'environnement PowerShell + Windows">
    Nécessite PowerShell 5+.
  </Step>
  <Step title="Node.jsS'assurer que Node.js 24 est utilisé par défaut"Node.jsWindows>
    S'il est manquant, tente l'installation via winget, puis Chocolatey, puis Scoop. Si aucun gestionnaire de paquets n'est disponible, le script télécharge le zip officiel Node.js pour Windows dans `%LOCALAPPDATA%\OpenClaw\deps\portable-node` et l'ajoute au PATH de l'utilisateur et du processus actuel. Node 22 LTS, actuellement `22.19+`, reste pris en charge pour la compatibilité.
  </Step>
  <Step title="OpenClawInstaller OpenClaw">
    - Méthode `npm`npm (par défaut) : installation npm globale utilisant `-Tag` sélectionné, lancée à partir d'un répertoire temporaire de l'installeur accessible en écriture afin que les shells ouverts dans des dossiers protégés tels que `C:\` fonctionnent toujours
    - Méthode `git` : clone/mise à jour du dépôt, installation/construction avec pnpm, et installation du wrapper dans `%USERPROFILE%\.local\bin\openclaw.cmd`. Si Git est manquant, le script initialise MinGit localement pour l'utilisateur sous `%LOCALAPPDATA%\OpenClaw\deps\portable-git` et l'ajoute au PATH de l'utilisateur et du processus actuel.

  </Step>
  <Step title="Tâches post-installation">
    - Ajoute le répertoire bin nécessaire au PATH utilisateur lorsque cela est possible
    - Actualise un service de passerelle chargé de manière optimale (`openclaw gateway install --force`, puis redémarre)
    - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (de manière optimale)

  </Step>
  <Step title="Gérer les échecs">
    `iwr ... | iex` et les installations de blocs de script signalent une erreur d'arrêt sans fermer la session PowerShell actuelle. Les installations directes `powershell -File` / `pwsh -File` sortent toujours avec un code non nul pour l'automatisation.
  </Step>
</Steps>

### Exemples (install.ps1)

<Tabs>
  <Tab title="Par défaut">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Installation Git">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHubCheckout GitHub main">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -Tag main ```</Tab>
  <Tab title="Répertoire git personnalisé">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Essai à blanc">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Trace de débogage">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                        | Description                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`      | Méthode d'installation (par défaut : `npm`)                               |
| `-Tag <tag\|version\|spec>`npm | dist-tag npm, version ou spécification de package (par défaut : `latest`) |
| `-GitDir <path>`               | Répertoire de checkout (par défaut : `%USERPROFILE%\openclaw`)            |
| `-NoOnboard`                   | Ignorer l'onboarding                                                      |
| `-NoGitUpdate`                 | Ignorer `git pull`                                                        |
| `-DryRun`                      | Afficher uniquement les actions                                           |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                           | Description            |
| ---------------------------------- | ---------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Méthode d'installation |
| `OPENCLAW_GIT_DIR=<path>`          | Répertoire de checkout |
| `OPENCLAW_NO_ONBOARD=1`            | Ignorer l'onboarding   |
| `OPENCLAW_GIT_UPDATE=0`            | Désactiver git pull    |
| `OPENCLAW_DRY_RUN=1`               | Mode simulation        |

  </Accordion>
</AccordionGroup>

<Note>Si `-InstallMethod git` est utilisé et que Git est manquant, le script tente d'amorcer MinGit localement pour l'utilisateur avant d'afficher le lien Git for Windows.</Note>

---

## CI et automatisation

Utilisez les drapeaux/variables d'environnement non interactifs pour des exécutions prévisibles.

<Tabs>
  <Tab title="install.sh (non-interactive npm)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (non-interactive git)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (skip onboarding)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## Dépannage

<AccordionGroup>
  <Accordion title="Pourquoi Git est-il requis ?">
    Git est requis pour la méthode d'installation `git`. Pour les installations `npm`, Git est toujours vérifié/installé pour éviter les échecs `spawn git ENOENT` lorsque les dépendances utilisent des URL git.
  </Accordion>

<Accordion title="Pourquoi npm rencontre-t-il EACCES sur Linux ?">Certaines configurations Linux pointent le préfixe global npm vers des chemins détenus par root. `install.sh` peut changer le préfixe vers `~/.npm-global` et ajouter des exports PATH aux fichiers rc du shell (lorsque ces fichiers existent).</Accordion>

  <Accordion title="Problèmes sharp/libvips">
    Les scripts définissent `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut pour éviter que sharp ne soit construit contre libvips du système. Pour modifier :

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows : "npm error spawn git / ENOENT"'>Réexécutez le programme d'installation afin qu'il puisse amorcer MinGit localement pour l'utilisateur, ou installez Git for Windows et rouvrez PowerShell.</Accordion>

  <Accordion title='WindowsWindows : « openclaw n'est pas reconnu »'>
    Exécutez `npm config get prefix` et ajoutez ce répertoire à votre PATH utilisateur (pas besoin du suffixe `\bin`Windows sur Windows), puis rouvrez PowerShell.
  </Accordion>

  <Accordion title="WindowsWindows : comment obtenir la sortie détaillée de l'installateur">
    `install.ps1` n'expose pas actuellement de commutateur `-Verbose`.
    Utilisez le traçage PowerShell pour les diagnostics au niveau du script :

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw introuvable après l'installation"Node.js>
    Généralement un problème de PATH. Voir [dépannage Node.js](/fr/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Mise à jour](/fr/install/updating)
- [Désinstallation](/fr/install/uninstall)
