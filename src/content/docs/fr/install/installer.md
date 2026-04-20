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

| Script                             | Plateforme           | Ce qu'il fait                                                                                                          |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.             |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installe Node + OpenClaw dans un préfixe local (`~/.openclaw`) avec les modes npm ou git checkout. Pas de root requis. |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding.             |

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

<Note>Si l'installation réussit mais que `openclaw` n'est pas trouvé dans un nouveau terminal, consultez le Node.js troubleshooting](/fr/install/node#troubleshooting).</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recommandé pour la plupart des installations interactives sur macOS/Linux/WSL.</Tip>

### Flux (install.sh)

<Steps>
  <Step title="Détecter le système d'exploitation">Prend en charge macOS et Linux (y compris WSL). Si macOS est détecté, installe Homebrew s'il est manquant.</Step>
  <Step title="Assurer Node.js 24 par défaut">Vérifie la version de Node et installe Node 24 si nécessaire (Homebrew sur macOS, scripts de configuration NodeSource sur Linux apt/dnf/yum). OpenClaw prend toujours en charge Node 22 LTS, actuellement `22.14+`, pour la compatibilité.</Step>
  <Step title="Assurer Git">Installe Git s'il est manquant.</Step>
  <Step title="Installer OpenClaw">- Méthode `npm` (par défaut) : installation globale npm - Méthode `git` : clone/mise à jour du dépôt, installation des dépendances avec pnpm, build, puis installation du wrapper à `~/.local/bin/openclaw`</Step>
  <Step title="Tâches post-installation">
    - Actualise un service de passerelle chargé au mieux (`openclaw gateway install --force`, puis redémarre) - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux) - Tente l'onboarding lorsque cela est approprié (TTY disponible, onboarding non désactivé, et vérifications bootstrap/config réussies) - Définit `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par
    défaut
  </Step>
</Steps>

### Détection de l'extraction de source

S'il est exécuté dans un extrait OpenClaw (`package.json` + `pnpm-workspace.yaml`), le script propose :

- utiliser l'extraction (`git`), ou
- utiliser l'installation globale (`npm`)

Si aucun TTY n'est disponible et qu'aucune méthode d'installation n'est définie, il utilise `npm` par défaut et avertit.

Le script se termine avec le code `2` pour une sélection de méthode invalide ou des valeurs `--install-method` invalides.

### Exemples (install.sh)

<Tabs>
  <Tab title="Par défaut">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Ignorer l'onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Installation Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main via GitHub">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Test à blanc">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                               | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method` |
| `--npm`                               | Raccourci pour la méthode npm                                              |
| `--git`                               | Raccourci pour la méthode git. Alias : `--github`                          |
| `--version <version\|dist-tag\|spec>` | version npm, dist-tag ou spécification de paquet (par défaut : `latest`)   |
| `--beta`                              | Utiliser le dist-tag beta si disponible, sinon repli sur `latest`          |
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

| Variable                                                | Description                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Méthode d'installation                                        |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | version npm, dist-tag ou spécification de package             |
| `OPENCLAW_BETA=0\|1`                                    | Utiliser la version bêta si disponible                        |
| `OPENCLAW_GIT_DIR=<path>`                               | Répertoire de checkout                                        |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Activer/désactiver les mises à jour git                       |
| `OPENCLAW_NO_PROMPT=1`                                  | Désactiver les invites                                        |
| `OPENCLAW_NO_ONBOARD=1`                                 | Ignorer l'onboarding                                          |
| `OPENCLAW_DRY_RUN=1`                                    | Mode simulation                                               |
| `OPENCLAW_VERBOSE=1`                                    | Mode débogage                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | niveau de log npm                                             |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Contrôler le comportement de sharp/libvips (par défaut : `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Conçu pour les environnements où vous souhaitez tout sous un préfixe local (par défaut `~/.openclaw`) et sans dépendance Node système. Prend en charge les installations npm par défaut, ainsi que les installations par git-checkout sous le même flux de préfixe.</Info>

### Flux (install-cli.sh)

<Steps>
  <Step title="Installer l'exécution Node locale">
    Télécharge une archive tarball Node LTS prise en charge et épinglée (la version est intégrée dans le script et mise à jour indépendamment) vers `<prefix>/tools/node-v<version>` et vérifie le SHA-256.
  </Step>
  <Step title="Assurer la présence de Git">
    Si Git est manquant, tente une installation via apt/dnf/yum sur Linux ou Homebrew sur macOS.
  </Step>
  <Step title="Installer OpenClaw sous le préfixe">
    - méthode `npm` (par défaut) : installe sous le préfixe avec npm, puis écrit un wrapper vers `<prefix>/bin/openclaw`
    - méthode `git` : clone/met à jour un checkout (par défaut `~/openclaw`) et écrit toujours le wrapper vers `<prefix>/bin/openclaw`
  </Step>
  <Step title="Actualiser le service de passerelle chargé">
    Si un service de passerelle est déjà chargé à partir du même préfixe, le script exécute
    `openclaw gateway install --force`, puis `openclaw gateway restart`, et
    sonde la santé de la passerelle de manière opportuniste.
  </Step>
</Steps>

### Exemples (install-cli.sh)

<Tabs>
  <Tab title="Par défaut">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Préfixe + version personnalisés">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Installation Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Sortie JSON d'automatisation">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Exécuter l'onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                     | Description                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `--prefix <path>`           | Préfixe d'installation (par défaut : `~/.openclaw`)                                            |
| `--install-method npm\|git` | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method`                     |
| `--npm`                     | Raccourci pour la méthode npm                                                                  |
| `--git`, `--github`         | Raccourci pour la méthode git                                                                  |
| `--git-dir <path>`          | Répertoire de checkout Git (par défaut : `~/openclaw`). Alias : `--dir`                        |
| `--version <ver>`           | Version ou dist-tag OpenClaw (par défaut : `latest`)                                           |
| `--node-version <ver>`      | Version de Node (par défaut : `22.22.0`)                                                       |
| `--json`                    | Émettre des événements NDJSON                                                                  |
| `--onboard`                 | Exécuter `openclaw onboard` après l'installation                                               |
| `--no-onboard`              | Ignorer l'onboarding (par défaut)                                                              |
| `--set-npm-prefix`          | Sur Linux, forcer le préfixe npm à `~/.npm-global` si le préfixe actuel n'est pas inscriptible |
| `--help`                    | Afficher l'utilisation (`-h`)                                                                  |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                    | Description                                                    |
| ------------------------------------------- | -------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Préfixe d'installation                                         |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | Méthode d'installation                                         |
| `OPENCLAW_VERSION=<ver>`                    | Version OpenClaw ou dist-tag                                   |
| `OPENCLAW_NODE_VERSION=<ver>`               | Version Node                                                   |
| `OPENCLAW_GIT_DIR=<path>`                   | Répertoire de récupération Git pour les installations git      |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | Activer les mises à jour git pour les récupérations existantes |
| `OPENCLAW_NO_ONBOARD=1`                     | Ignorer l'onboarding                                           |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | Niveau de journalisation npm                                   |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Contrôler le comportement de sharp/libvips (par défaut : `1`)  |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flux (install.ps1)

<Steps>
  <Step title="S'assurer de l'environnement PowerShell + Windows">Nécessite PowerShell 5+.</Step>
  <Step title="S'assurer de Node.js 24 par défaut">Si manquant, tente l'installation via winget, puis Chocolatey, puis Scoop. Node 22 LTS, actuellement `22.14+`, reste pris en charge pour la compatibilité.</Step>
  <Step title="Installer OpenClaw">- Méthode `npm` (par défaut) : installation npm globale utilisant le `-Tag` sélectionné - Méthode `git` : clone/mise à jour du dépôt, installation/construction avec pnpm, et installation du wrapper à `%USERPROFILE%\.local\bin\openclaw.cmd`</Step>
  <Step title="Tâches post-installation">- Ajoute le répertoire bin nécessaire au PATH utilisateur lorsque possible - Actualise un service de passerelle chargé au mieux (`openclaw gateway install --force`, puis redémarrage) - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git (au mieux)</Step>
</Steps>

### Exemples (install.ps1)

<Tabs>
  <Tab title="Par défaut">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Installation Git">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHub main via npm">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="Répertoire git personnalisé">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Essai à blanc (Dry run)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Trace de débogage">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux (Flags)">

| Flag                        | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Méthode d'installation (défaut : `npm`)                              |
| `-Tag <tag\|version\|spec>` | npm dist-tag, version ou spécification de paquet (défaut : `latest`) |
| `-GitDir <path>`            | Répertoire de checkout (défaut : `%USERPROFILE%\openclaw`)           |
| `-NoOnboard`                | Ignorer l'intégration (onboarding)                                   |
| `-NoGitUpdate`              | Ignorer `git pull`                                                   |
| `-DryRun`                   | Afficher uniquement les actions                                      |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                           | Description                        |
| ---------------------------------- | ---------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Méthode d'installation             |
| `OPENCLAW_GIT_DIR=<path>`          | Répertoire de checkout             |
| `OPENCLAW_NO_ONBOARD=1`            | Ignorer l'intégration (onboarding) |
| `OPENCLAW_GIT_UPDATE=0`            | Désactiver git pull                |
| `OPENCLAW_DRY_RUN=1`               | Mode essai à blanc (Dry run)       |

  </Accordion>
</AccordionGroup>

<Note>Si `-InstallMethod git` est utilisé et que Git est manquant, le script s'arrête et affiche le lien Git pour Windows.</Note>

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
    Git est requis pour la méthode d'installation `git`. Pour les installations `npm`, Git est tout de même vérifié/installé pour éviter les échecs `spawn git ENOENT` lorsque les dépendances utilisent des URLs git.
  </Accordion>

<Accordion title="Pourquoi npm rencontre-t-il EACCES sur Linux ?">Certaines configurations Linux pointent le préfixe global npm vers des chemins détenus par root. `install.sh` peut changer le préfixe vers `~/.npm-global` et ajouter des exports PATH aux fichiers rc du shell (lorsque ces fichiers existent).</Accordion>

  <Accordion title="Problèmes sharp/libvips">
    Les scripts définissent `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut pour éviter que sharp ne soit construit contre libvips du système. Pour outrepasser :

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows : "npm error spawn git / ENOENT"'>Installez Git pour npm, rouvrez PowerShell, relancez l'installateur.</Accordion>

<Accordion title='Windows : "openclaw is not recognized"'>Exécutez `npm config get prefix` et ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows), puis rouvrez PowerShell.</Accordion>

  <Accordion title="Windows : comment obtenir une sortie détaillée de l'installateur">
    `install.ps1` n'expose actuellement pas de commutateur `-Verbose`.
    Utilisez le traçage PowerShell pour les diagnostics au niveau du script :

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw introuvable après l'installation">
    Généralement un problème de PATH. Voir [Résolution des problèmes Node.js](/fr/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>
