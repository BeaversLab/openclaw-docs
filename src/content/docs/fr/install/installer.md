---
summary: "Fonctionnement des scripts d'installation (install.sh, install-cli.sh, install.ps1), indicateurs et automatisation"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Fonctionnement interne de l'installateur"
---

# Fonctionnement interne de l'installateur

OpenClaw fournit trois scripts d'installation, servis depuis `openclaw.ai`.

| Script                             | Plateforme           | Ce qu'il fait                                                                                              |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding. |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installe Node + OpenClaw dans un préfixe local (`~/.openclaw`). Pas de droits root requis.                 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding. |

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

<Note>Si l'installation réussit mais que `openclaw` n'est pas trouvé dans un nouveau terminal, consultez le [Node.js troubleshooting](/en/install/node#troubleshooting).</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recommandé pour la plupart des installations interactives sur macOS/Linux/WSL.</Tip>

### Flow (install.sh)

<Steps>
  <Step title="Detect OS">Prend en charge macOS et Linux (y compris WSL). Si macOS est détecté, installe Homebrew s'il est manquant.</Step>
  <Step title="Ensure Node.js 24 by default">Vérifie la version de Node et installe Node 24 si nécessaire (Homebrew sur macOS, scripts de configuration NodeSource sur Linux apt/dnf/yum). OpenClaw prend toujours en charge Node 22 LTS, actuellement `22.14+`, pour la compatibilité.</Step>
  <Step title="Ensure Git">Installe Git s'il est manquant.</Step>
  <Step title="Install OpenClaw">- méthode `npm` (par défaut) : installation npm globale - méthode `git` : clone/mise à jour du dépôt, installation des dépendances avec pnpm, build, puis installation du wrapper à `~/.local/bin/openclaw`</Step>
  <Step title="Post-install tasks">- Exécute `openclaw doctor --non-interactive` lors des mises à jour et installations git (au mieux) - Tente l'onboarding lorsque cela est approprié (TTY disponible, onboarding non désactivé, et les vérifications bootstrap/config passent) - Définit `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut</Step>
</Steps>

### Source checkout detection

Si exécuté à l'intérieur d'un checkout OpenClaw (`package.json` + `pnpm-workspace.yaml`), le script propose :

- utiliser le checkout (`git`), ou
- utiliser l'installation globale (`npm`)

Si aucun TTY n'est disponible et qu'aucune méthode d'installation n'est définie, la valeur par défaut est `npm` et un avertissement est émis.

Le script se termine avec le code `2` pour une sélection de méthode non valide ou des valeurs `--install-method` non valides.

### Exemples (install.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Skip onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git install">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main via npm">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Dry run">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des indicateurs">

| Indicateur                            | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method` |
| `--npm`                               | Raccourci pour la méthode npm                                              |
| `--git`                               | Raccourci pour la méthode git. Alias : `--github`                          |
| `--version <version\|dist-tag\|spec>` | Version npm, dist-tag ou spécification de package (par défaut : `latest`)  |
| `--beta`                              | Utiliser le dist-tag bêta si disponible, sinon revenir à `latest`          |
| `--git-dir <path>`                    | Répertoire de checkout (par défaut : `~/openclaw`). Alias : `--dir`        |
| `--no-git-update`                     | Ignorer `git pull` pour un checkout existant                               |
| `--no-prompt`                         | Désactiver les invites                                                     |
| `--no-onboard`                        | Ignorer l'onboarding                                                       |
| `--onboard`                           | Activer l'onboarding                                                       |
| `--dry-run`                           | Afficher les actions sans appliquer les modifications                      |
| `--verbose`                           | Activer la sortie de débogage (`set -x`, logs de niveau notice npm)        |
| `--help`                              | Afficher l'utilisation (`-h`)                                              |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                                | Description                                               |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Méthode d'installation                                    |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | Version npm, dist-tag ou spécification de package         |
| `OPENCLAW_BETA=0\|1`                                    | Utiliser la bêta si disponible                            |
| `OPENCLAW_GIT_DIR=<path>`                               | Répertoire de checkout                                    |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Activer/désactiver les mises à jour git                   |
| `OPENCLAW_NO_PROMPT=1`                                  | Désactiver les invites                                    |
| `OPENCLAW_NO_ONBOARD=1`                                 | Ignorer l'onboarding                                      |
| `OPENCLAW_DRY_RUN=1`                                    | Mode simulation                                           |
| `OPENCLAW_VERBOSE=1`                                    | Mode débogage                                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | Niveau de log npm                                         |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Contrôler le comportement de sharp/libvips (défaut : `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Conçu pour les environnements où vous souhaitez tout sous un préfixe local (défaut `~/.openclaw`) et sans dépendance système Node.</Info>

### Flux (install-cli.sh)

<Steps>
  <Step title="Installer l'exécution Node locale">
    Télécharge une archive tar Node LTS prise en charge et figée (la version est intégrée dans le script et mise à jour indépendamment) vers `<prefix>/tools/node-v<version>` et vérifie le SHA-256.
  </Step>
  <Step title="Assurer la présence de Git">
    Si Git est manquant, tente une installation via apt/dnf/yum sur Linux ou Homebrew sur macOS.
  </Step>
  <Step title="Installer OpenClaw sous le préfixe">
    Installe avec npm en utilisant `--prefix <prefix>`, puis écrit un wrapper vers `<prefix>/bin/openclaw`.
  </Step>
</Steps>

### Exemples (install-cli.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Custom prefix + version">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Automation JSON output">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Run onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Flag                   | Description                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `--prefix <path>`      | Préfixe d'installation (par défaut : `~/.openclaw`)                                            |
| `--version <ver>`      | Version ou dist-tag OpenClaw (par défaut : `latest`)                                           |
| `--node-version <ver>` | Version de Node (par défaut : `22.22.0`)                                                       |
| `--json`               | Émettre des événements NDJSON                                                                  |
| `--onboard`            | Exécuter `openclaw onboard` après l'installation                                               |
| `--no-onboard`         | Ignorer l'onboarding (par défaut)                                                              |
| `--set-npm-prefix`     | Sur Linux, forcer le préfixe npm à `~/.npm-global` si le préfixe actuel n'est pas inscriptible |
| `--help`               | Afficher l'utilisation (`-h`)                                                                  |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                    | Description                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Préfixe d'installation                                                                                                  |
| `OPENCLAW_VERSION=<ver>`                    | Version ou dist-tag OpenClaw                                                                                            |
| `OPENCLAW_NODE_VERSION=<ver>`               | Version de Node                                                                                                         |
| `OPENCLAW_NO_ONBOARD=1`                     | Ignorer l'onboarding                                                                                                    |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | Niveau de log npm                                                                                                       |
| `OPENCLAW_GIT_DIR=<path>`                   | Chemin de recherche de nettoyage hérité (utilisé lors de la suppression de l'ancien checkout de sous-module `Peekaboo`) |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Contrôler le comportement de sharp/libvips (par défaut : `1`)                                                           |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flux (install.ps1)

<Steps>
  <Step title="S'assurer de l'environnement PowerShell + Windows">Nécessite PowerShell 5+.</Step>
  <Step title="Garantir Node.js 24 par défaut">Si absent, tente l'installation via winget, puis Chocolatey, puis Scoop. Node 22 LTS, actuellement `22.14+`, reste pris en charge pour la compatibilité.</Step>
  <Step title="Installer OpenClaw">- méthode `npm` (par défaut) : installation npm globale utilisant le `-Tag` sélectionné - méthode `git` : clone/mise à jour du dépôt, installation/construction avec pnpm, et installation du wrapper à `%USERPROFILE%\.local\bin\openclaw.cmd`</Step>
  <Step title="Tâches post-installation">Ajoute le répertoire bin nécessaire au PATH utilisateur lorsque c'est possible, puis exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux).</Step>
</Steps>

### Exemples (install.ps1)

<Tabs>
  <Tab title="Default">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git install">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHub main via npm">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="Custom git directory">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Dry run">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Debug trace">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                     | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Méthode d'installation (par défaut : `npm`)                               |
| `-Tag <tag\|version\|spec>` | npm dist-tag, version, ou spécification de paquet (par défaut : `latest`) |
| `-GitDir <path>`            | Répertoire de checkout (par défaut : `%USERPROFILE%\openclaw`)            |
| `-NoOnboard`                | Ignorer l'onboarding                                                      |
| `-NoGitUpdate`              | Ignorer `git pull`                                                        |
| `-DryRun`                   | Afficher uniquement les actions                                           |

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

<Note>Si `-InstallMethod git` est utilisé et que Git est absent, le script s'arrête et affiche le lien Git for Windows.</Note>

---

## CI et automatisation

Utilisez des indicateurs/env vars non interactifs pour des exécutions prévisibles.

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

<Accordion title="Pourquoi npm rencontre-t-il EACCES sur Linux ?">Certaines configurations Linux pointent le préfixe global npm vers des chemins détenus par root. `install.sh` peut modifier le préfixe vers `~/.npm-global` et ajouter des exportations PATH aux fichiers rc du shell (lorsque ces fichiers existent).</Accordion>

  <Accordion title="problèmes sharp/libvips">
    Les scripts définissent `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut pour éviter que sharp ne soit construit avec la libvips du système. Pour remplacer :

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title="Windows : « npm error spawn git / ENOENT »">Installez Git pour Windows, rouvrez PowerShell, relancez l'installateur.</Accordion>

<Accordion title="Windows : « openclaw is not recognized »">Exécutez `npm config get prefix` et ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows), puis rouvrez PowerShell.</Accordion>

  <Accordion title="Windows : comment obtenir une sortie détaillée de l'installateur">
    `install.ps1` n'expose pas actuellement de commutateur `-Verbose`.
    Utilisez le traçage PowerShell pour les diagnostics au niveau du script :

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw introuvable après l'installation">
    Généralement un problème de PATH. Voir [Dépannage Node.js](/en/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>
