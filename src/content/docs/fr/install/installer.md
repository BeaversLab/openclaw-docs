---
summary: "Fonctionnement des scripts d'installation (install.sh, install-cli.sh, install.ps1), indicateurs et automatisation"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Fonctionnement interne de l'installateur"
---

OpenClaw fournit trois scripts d'installation, disponibles depuis `openclaw.ai`.

| Script                             | Plateforme           | Ce qu'il fait                                                                                                                |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.                   |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installe Node + OpenClaw dans un préfixe local (`~/.openclaw`npm) avec les modes npm ou git checkout. Pas de racine requise. |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.                   |

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

<Note>Si l'installation réussit mais que `openclaw` n'est pas trouvé dans un nouveau terminal, consultez la page de Node.js troubleshooting](/fr/install/node#troubleshooting).</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recommandé pour la plupart des installations interactives sur macOS/Linux/WSL.</Tip>

### Flow (install.sh)

<Steps>
  <Step title="Detect OS">
    Prend en charge macOS et Linux (y compris WSL).
  </Step>
  <Step title="Ensure Node.js 24 by default">
    Vérifie la version de Node et installe Node 24 si nécessaire (Homebrew sur macOS, scripts de configuration NodeSource sur Linux apt/dnf/yum). Sur macOS, Homebrew n'est installé que lorsque l'installateur en a besoin pour Node ou Git. OpenClaw prend toujours en charge Node 22 LTS, actuellement `22.19+`, pour la compatibilité.
    Sur Alpine/musl Linux, l'installateur utilise les paquets apk au lieu de NodeSource ; les dépôts Alpine configurés doivent fournir Node `22.19+` (Alpine 3.21 ou plus récent au moment de la rédaction).
  </Step>
  <Step title="Ensure Git">
    Installe Git s'il est manquant en utilisant le gestionnaire de paquets détecté, y compris Homebrew sur macOS et apk sur Alpine.
  </Step>
  <Step title="Installer OpenClaw">
    - méthode `npm` (par défaut) : installation npm globale
    - méthode `git` : cloner/mettre à jour le dépôt, installer les dépendances avec pnpm, construire, puis installer le wrapper à `~/.local/bin/openclaw`

  </Step>
  <Step title="Tâches post-installation">
    - Actualise le service de passerelle chargé au mieux (`openclaw gateway install --force`, puis redémarre)
    - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux)
    - Tente l'onboarding lorsque cela est approprié (TTY disponible, onboarding non désactivé, et les vérifications bootstrap/config réussissent)

  </Step>
</Steps>

### Source checkout detection

S'il est exécuté dans un checkout OpenClaw (`package.json` + `pnpm-workspace.yaml`), le script propose :

- utiliser le checkout (`git`), ou
- utiliser l'installation globale (`npm`)

Si aucune TTY n'est disponible et qu'aucune méthode d'installation n'est définie, la valeur par défaut est `npm` et un avertissement est émis.

Le script se termine avec le code `2` pour une sélection de méthode invalide ou des valeurs `--install-method` invalides.

### Exemples (install.sh)

<Tabs>
  <Tab title="Par défaut">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Ignorer l'onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Installation Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="Checkout GitHub main">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --version main ```</Tab>
  <Tab title="Dry run">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des options">

| Option                                   | Description                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `--install-method npm\|git`              | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method` |
| `--npm`npm                               | Raccourci pour la méthode npm                                              |
| `--git`                                  | Raccourci pour la méthode git. Alias : `--github`                          |
| `--version <version\|dist-tag\|spec>`npm | Version npm, dist-tag ou spécification de paquet (par défaut : `latest`)   |
| `--beta`                                 | Utiliser le dist-tag beta si disponible, sinon revenir à `latest`          |
| `--git-dir <path>`                       | Répertoire de checkout (par défaut : `~/openclaw`). Alias : `--dir`        |
| `--no-git-update`                        | Ignorer `git pull` pour un checkout existant                               |
| `--no-prompt`                            | Désactiver les invites                                                     |
| `--no-onboard`                           | Ignorer l'onboarding                                                       |
| `--onboard`                              | Activer l'onboarding                                                       |
| `--dry-run`                              | Afficher les actions sans appliquer les modifications                      |
| `--verbose`                              | Activer la sortie de débogage (`set -x`npm, journaux de niveau notice npm) |
| `--help`                                 | Afficher l'utilisation (`-h`)                                              |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                          | Description                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                | Méthode d'installation                                                           |
| `OPENCLAW_VERSION=latest\|next\|<semver>\|<spec>` | version npm, dist-tag ou spécification de paquet                                 |
| `OPENCLAW_BETA=0\|1`                              | Utiliser la version bêta si disponible                                           |
| `OPENCLAW_HOME=<path>`                            | Répertoire de base pour l'état OpenClaw et les chemins git/onboarding par défaut |
| `OPENCLAW_GIT_DIR=<path>`                         | Répertoire de checkout                                                           |
| `OPENCLAW_GIT_UPDATE=0\|1`                        | Activer/Désactiver les mises à jour git                                          |
| `OPENCLAW_NO_PROMPT=1`                            | Désactiver les invites                                                           |
| `OPENCLAW_NO_ONBOARD=1`                           | Ignorer l'onboarding                                                             |
| `OPENCLAW_DRY_RUN=1`                              | Mode simulation                                                                  |
| `OPENCLAW_VERBOSE=1`                              | Mode de débogage                                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`       | niveau de log npm                                                                |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Conçu pour les environnements où vous souhaitez tout sous un préfixe local (par défaut `~/.openclaw`) et sans dépendance système Node. Prend en charge les installations npm par défaut, ainsi que les installations par git-checkout selon le même flux de préfixe.</Info>

### Flux (install-cli.sh)

<Steps>
  <Step title="Installer le runtime Node local">
    Télécharge une archive tarball Node LTS prise en charge épinglée (la version est intégrée dans le script et mise à jour indépendamment) vers `<prefix>/tools/node-v<version>` et vérifie le SHA-256.
    Sur Alpine/musl Linux, où Node ne publie pas d'archives tarball compatibles pour le runtime épinglé, installe `nodejs` et `npm` avec `apk` et lie ce runtime dans le chemin du wrapper de préfixe. Les dépôts Alpine doivent fournir Node `22.19+` ; utilisez Alpine 3.21 ou plus récent si les anciens dépôts ne fournissent que Node 20 ou 21.
  </Step>
  <Step title="Ensure Git">
    Si Git est manquant, tente l'installation via apt/dnf/yum/apk sur Linux ou Homebrew sur macOS.
  </Step>
  <Step title="Install OpenClaw under prefix">
    - Méthode `npm` (par défaut) : installe sous le préfixe avec npm, puis écrit un wrapper vers `<prefix>/bin/openclaw`
    - Méthode `git` : clone/met à jour une extraction (par défaut `~/openclaw`) et écrit toujours le wrapper vers `<prefix>/bin/openclaw`

  </Step>
  <Step title="Refresh loaded gateway service">
    Si un service passerelle est déjà chargé depuis ce même préfixe, le script exécute
    `openclaw gateway install --force`, puis `openclaw gateway restart`, et
    sonde l'état de santé de la passerelle au mieux.
  </Step>
</Steps>

### Exemples (install-cli.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Custom prefix + version">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Git install">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Automation JSON output">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Run onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des indicateurs">

| Indicateur                  | Description                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `--prefix <path>`           | Préfixe d'installation (par défaut : `~/.openclaw`)                                            |
| `--install-method npm\|git` | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method`                     |
| `--npm`npm                  | Raccourci pour la méthode npm                                                                  |
| `--git`, `--github`         | Raccourci pour la méthode git                                                                  |
| `--git-dir <path>`          | Répertoire de checkout Git (par défaut : `~/openclaw`). Alias : `--dir`                        |
| `--version <ver>`OpenClaw   | Version ou balise de distribution d'OpenClaw (par défaut : `latest`)                           |
| `--node-version <ver>`      | Version de Node (par défaut : `22.22.0`)                                                       |
| `--json`                    | Émettre des événements NDJSON                                                                  |
| `--onboard`                 | Exécuter `openclaw onboard` après l'installation                                               |
| `--no-onboard`              | Ignorer l'onboarding (par défaut)                                                              |
| `--set-npm-prefix`Linuxnpm  | Sur Linux, forcer le préfixe npm à `~/.npm-global` si le préfixe actuel n'est pas inscriptible |
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
| `OPENCLAW_GIT_UPDATE=0\|1`                     | Activer/Désactiver les mises à jour git pour les checkouts existants             |
| `OPENCLAW_NO_ONBOARD=1`                        | Ignorer l'onboarding                                                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`npm | Niveau de log npm                                                                |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flux (install.ps1)

<Steps>
  <Step title="WindowsS'assurer de l'environnement PowerShell + Windows">
    Nécessite PowerShell 5+.
  </Step>
  <Step title="Node.jsS'assurer de Node.js 24 par défaut"Node.jsWindows>
    S'il est manquant, tente l'installation via winget, puis Chocolatey, puis Scoop. Si aucun gestionnaire de paquets n'est disponible, le script télécharge le zip Windows officiel de Node.js dans `%LOCALAPPDATA%\OpenClaw\deps\portable-node` et l'ajoute au PATH de l'utilisateur et du processus actuel. Node 22 LTS, actuellement `22.19+`, reste pris en charge pour la compatibilité.
  </Step>
  <Step title="Installer OpenClaw">
    - méthode `npm` (par défaut) : installation globale npm en utilisant le `-Tag` sélectionné, lancée à partir d'un répertoire temporaire de l'installateur inscriptible afin que les shells ouverts dans des dossiers protégés tels que `C:\` fonctionnent toujours
    - méthode `git` : clone/met à jour le dépôt, installe/construit avec pnpm, et installe un wrapper à `%USERPROFILE%\.local\bin\openclaw.cmd`. Si Git est manquant, le script amorce MinGit local utilisateur sous `%LOCALAPPDATA%\OpenClaw\deps\portable-git` et l'ajoute au PATH utilisateur et du processus actuel.

  </Step>
  <Step title="Tâches post-installation">
    - Ajoute le répertoire bin nécessaire au PATH utilisateur lorsque cela est possible
    - Actualise un service de passerelle chargé au mieux (`openclaw gateway install --force`, puis redémarre)
    - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux)

  </Step>
  <Step title="Gérer les échecs">
    Les installations `iwr ... | iex` et de blocs de script signalent une erreur fatale sans fermer la session PowerShell actuelle. Les installations directes `powershell -File` / `pwsh -File` quittent toujours avec un code non nul pour l'automatisation.
  </Step>
</Steps>

### Exemples (install.ps1)

<Tabs>
  <Tab title="Par défaut">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Installation Git">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="Checkout main GitHub">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -Tag main ```</Tab>
  <Tab title="Répertoire git personnalisé">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Essai à blanc">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Trace de débogage">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                        | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `-InstallMethod npm\|git`      | Méthode d'installation (par défaut : `npm`)                              |
| `-Tag <tag\|version\|spec>`npm | npm dist-tag, version ou spécification de paquet (par défaut : `latest`) |
| `-GitDir <path>`               | Répertoire de checkout (par défaut : `%USERPROFILE%\openclaw`)           |
| `-NoOnboard`                   | Ignorer l'onboarding                                                     |
| `-NoGitUpdate`                 | Ignorer `git pull`                                                       |
| `-DryRun`                      | Afficher uniquement les actions                                          |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                           | Description            |
| ---------------------------------- | ---------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Méthode d'installation |
| `OPENCLAW_GIT_DIR=<path>`          | Répertoire de checkout |
| `OPENCLAW_NO_ONBOARD=1`            | Ignorer l'onboarding   |
| `OPENCLAW_GIT_UPDATE=0`            | Désactiver git pull    |
| `OPENCLAW_DRY_RUN=1`               | Mode test à blanc      |

  </Accordion>
</AccordionGroup>

<Note>Si `-InstallMethod git`Windows est utilisé et que Git est manquant, le script tente un amorçage MinGit local pour l'utilisateur avant d'afficher le lien Git pour Windows.</Note>

---

## CI et automatisation

Utilisez les drapeaux/variables d'environnement non interactifs pour des exécutions prévisibles.

<Tabs>
  <Tab title="npminstall.sh (npm non-interactif)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (git non-interactif)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (ignorer l'onboarding)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## Dépannage

<AccordionGroup>
  <Accordion title="Pourquoi Git est-il requis ?">
    Git est requis pour la méthode d'installation `git`. Pour les installations `npm`, Git est toujours vérifié/installé pour éviter les échecs `spawn git ENOENT` lorsque les dépendances utilisent des URL git.
  </Accordion>

<Accordion title="Pourquoi npm rencontre-t-il EACCES sur Linux ?">Certaines configurations Linux pointent le préfixe global npm vers des chemins détenus par root. `install.sh` peut changer le préfixe vers `~/.npm-global` et ajouter les exports PATH aux fichiers rc du shell (lorsque ces fichiers existent).</Accordion>

<Accordion title="Windows : « npm error spawn git / ENOENT »">Relancez le programme d'installation pour qu'il puisse amorcer MinGit local à l'utilisateur, ou installez Git pour Windows et rouvrez PowerShell.</Accordion>

  <Accordion title='Windows : « openclaw n'est pas reconnu »'>
    Exécutez `npm config get prefix` et ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows), puis rouvrez PowerShell.
  </Accordion>

  <Accordion title="Windows : comment obtenir une sortie détaillée de l'installateur">
    `install.ps1` n'expose actuellement pas de commutateur `-Verbose`.
    Utilisez le suivi PowerShell pour les diagnostics au niveau du script :

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw introuvable après l'installation">
    Généralement un problème de PATH. Voir [Node.js troubleshooting](/fr/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Mise à jour](/fr/install/updating)
- [Désinstallation](/fr/install/uninstall)
