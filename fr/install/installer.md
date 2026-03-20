---
summary: "Fonctionnement des scripts d'installation (install.sh, install-cli.sh, install.ps1), indicateurs et automatisation"
read_when:
  - Vous souhaitez comprendre `openclaw.ai/install.sh`
  - Vous souhaitez automatiser les installations (CI / sans interface)
  - Vous souhaitez installer à partir d'un checkout GitHub
title: "Détails de l'installateur"
---

# Détails de l'installateur

OpenClaw fournit trois scripts d'installation, disponibles depuis `openclaw.ai`.

| Script                             | Plateforme           | Ce qu'il fait                                                                                              |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installe Node si nécessaire, installe OpenClaw via npm (par défaut) ou git, et peut exécuter l'onboarding. |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installe Node + OpenClaw dans un préfixe local (`~/.openclaw`). Aucun accès root requis.                   |
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

<Note>
  Si l'installation réussit mais que `openclaw` n'est pas trouvé dans un nouveau terminal, consultez
  le dépannage Node.js](/fr/install/node#troubleshooting).
</Note>

---

## install.sh

<Tip>Recommandé pour la plupart des installations interactives sur macOS/Linux/WSL.</Tip>

### Flux (install.sh)

<Steps>
  <Step title="Détection de l'OS">
    Prend en charge macOS et Linux (y compris WSL). Si macOS est détecté, installe Homebrew si
    manquant.
  </Step>
  <Step title="S'assurer que Node.js 24 est utilisé par défaut">
    Vérifie la version de Node et installe Node 24 si nécessaire (Homebrew sur macOS, scripts de
    configuration NodeSource sur Linux apt/dnf/yum). OpenClaw prend toujours en charge Node 22 LTS,
    actuellement `22.16+`, pour la compatibilité.
  </Step>
  <Step title="S'assurer que Git est installé">Installe Git si manquant.</Step>
  <Step title="Installer OpenClaw">
    - Méthode `npm` (par défaut) : installation globale npm - Méthode `git` : clone/mise à jour du
    dépôt, installation des dépendances avec pnpm, build, puis installation du wrapper à
    `~/.local/bin/openclaw`
  </Step>
  <Step title="Tâches post-installation">
    - Exécute `openclaw doctor --non-interactive` lors des mises à niveau et des installations git
    (au mieux) - Tente l'onboarding lorsque cela est approprié (TTY disponible, onboarding non
    désactivé, et les vérifications bootstrap/config réussissent) - Valeurs par défaut
    `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### Détection de l'extraction du code source

S'il est exécuté dans un extrait de OpenClaw (`package.json` + `pnpm-workspace.yaml`), le script offre :

- utiliser l'extrait (`git`), ou
- utiliser l'installation globale (`npm`)

Si aucun TTY n'est disponible et qu'aucune méthode d'installation n'est définie, il utilise par défaut `npm` et avertit.

Le script se termine avec le code `2` pour une sélection de méthode non valide ou des valeurs `--install-method` non valides.

### Exemples (install.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="Skip onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-onboard ```
  </Tab>
  <Tab title="Git install">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --install-method git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --version main ```
  </Tab>
  <Tab title="Dry run">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --dry-run ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des drapeaux">

| Drapeau                               | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Choisir la méthode d'installation (par défaut : `npm`). Alias : `--method` |
| `--npm`                               | Raccourci pour la méthode npm                                              |
| `--git`                               | Raccourci pour la méthode git. Alias : `--github`                          |
| `--version <version\|dist-tag\|spec>` | version npm, dist-tag ou spécification de package (par défaut : `latest`)  |
| `--beta`                              | Utiliser le dist-tag beta si disponible, sinon revenir à `latest`          |
| `--git-dir <path>`                    | Répertoire de checkout (par défaut : `~/openclaw`). Alias : `--dir`        |
| `--no-git-update`                     | Ignorer `git pull` pour un checkout existant                               |
| `--no-prompt`                         | Désactiver les invites                                                     |
| `--no-onboard`                        | Ignorer l'intégration                                                      |
| `--onboard`                           | Activer l'intégration                                                      |
| `--dry-run`                           | Imprimer les actions sans appliquer les modifications                      |
| `--verbose`                           | Activer la sortie de débogage (`set -x`, journaux de niveau notice npm)    |
| `--help`                              | Afficher l'utilisation (`-h`)                                              |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                                | Description                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Méthode d'installation                                        |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | version npm, dist-tag ou spécification de paquet              |
| `OPENCLAW_BETA=0\|1`                                    | Utiliser la version bêta si disponible                        |
| `OPENCLAW_GIT_DIR=<path>`                               | Répertoire de checkout                                        |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Activer/désactiver les mises à jour git                       |
| `OPENCLAW_NO_PROMPT=1`                                  | Désactiver les invites                                        |
| `OPENCLAW_NO_ONBOARD=1`                                 | Ignorer l'onboarding                                          |
| `OPENCLAW_DRY_RUN=1`                                    | Mode simulation (dry run)                                     |
| `OPENCLAW_VERBOSE=1`                                    | Mode débogage                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | niveau de log npm                                             |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Contrôler le comportement de sharp/libvips (par défaut : `1`) |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>
  Conçu pour les environnements où vous souhaitez tout sous un préfixe local (par défaut
  `~/.openclaw`) et sans dépendance système Node.
</Info>

### Flux (install-cli.sh)

<Steps>
  <Step title="Installer l'exécution Node locale">
    Télécharge une archive Node supportée épinglée (par défaut actuel `22.22.0`) vers `<prefix>/tools/node-v<version>` et vérifie le SHA-256.
  </Step>
  <Step title="S'assurer de la présence de Git">
    Si Git est manquant, tente une installation via apt/dnf/yum sur Linux ou Homebrew sur macOS.
  </Step>
  <Step title="Installer OpenClaw sous le préfixe">
    Installe avec npm en utilisant `--prefix <prefix>`, puis écrit un wrapper vers `<prefix>/bin/openclaw`.
  </Step>
</Steps>

### Exemples (install-cli.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```
  </Tab>
  <Tab title="Custom prefix + version">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --prefix /opt/openclaw --version latest ```
  </Tab>
  <Tab title="Automation JSON output">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="Run onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --onboard ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des indicateurs">

| Indicateur             | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--prefix <path>`      | Préfixe d'installation (par défaut : `~/.openclaw`)                                           |
| `--version <ver>`      | Version ou dist-tag OpenClaw (par défaut : `latest`)                                          |
| `--node-version <ver>` | Version de Node (par défaut : `22.22.0`)                                                      |
| `--json`               | Émettre des événements NDJSON                                                                 |
| `--onboard`            | Exécuter `openclaw onboard` après l'installation                                              |
| `--no-onboard`         | Ignorer l'onboarding (par défaut)                                                             |
| `--set-npm-prefix`     | Sur Linux, force le préfixe npm à `~/.npm-global` si le préfixe actuel n'est pas inscriptible |
| `--help`               | Afficher l'utilisation (`-h`)                                                                 |

  </Accordion>

  <Accordion title="Référence des variables d'environnement">

| Variable                                    | Description                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Préfixe d'installation                                                                                                  |
| `OPENCLAW_VERSION=<ver>`                    | Version ou dist-tag OpenClaw                                                                                            |
| `OPENCLAW_NODE_VERSION=<ver>`               | Version de Node                                                                                                         |
| `OPENCLAW_NO_ONBOARD=1`                     | Ignorer l'onboarding                                                                                                    |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | Niveau de journalisation npm                                                                                            |
| `OPENCLAW_GIT_DIR=<path>`                   | Chemin de recherche de nettoyage hérité (utilisé lors de la suppression de l'ancien checkout du sous-module `Peekaboo`) |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Contrôler le comportement de sharp/libvips (par défaut : `1`)                                                           |

  </Accordion>
</AccordionGroup>

---

## install.ps1

### Flux (install.ps1)

<Steps>
  <Step title="S'assurer de l'environnement PowerShell + Windows">Nécessite PowerShell 5+.</Step>
  <Step title="S'assurer de Node.js 24 par défaut">
    S'il est manquant, tente l'installation via winget, puis Chocolatey, puis Scoop. Node 22 LTS,
    actuellement `22.16+`, reste pris en charge pour la compatibilité.
  </Step>
  <Step title="Installer OpenClaw">
    - Méthode `npm` (par défaut) : installation npm globale en utilisant `-Tag` - Méthode `git` :
    clone/mise à jour du dépôt, installation/build avec pnpm, et installation du wrapper à
    `%USERPROFILE%\.local\bin\openclaw.cmd`
  </Step>
  <Step title="Tâches post-installation">
    Ajoute le répertoire bin nécessaire au PATH utilisateur lorsque c'est possible, puis exécute
    `openclaw doctor --non-interactive` lors des mises à jour et des installations git (au mieux).
  </Step>
</Steps>

### Exemples (install.ps1)

<Tabs>
  <Tab title="Default">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git install">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git -GitDir "C:\openclaw" ```
  </Tab>
  <Tab title="Dry run">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```
  </Tab>
  <Tab title="Debug trace">
    ```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 &
    ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug
    -Trace 0 ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Référence des indicateurs">

| Indicateur                  | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Méthode d'installation (par défaut : `npm`)                               |
| `-Tag <tag\|version\|spec>` | dist-tag npm, version ou spécification de package (par défaut : `latest`) |
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
| `OPENCLAW_DRY_RUN=1`               | Mode Dry run           |

  </Accordion>
</AccordionGroup>

<Note>
  Si `-InstallMethod git` est utilisé et que Git est manquant, le script s'arrête et affiche le lien
  Git for Windows.
</Note>

---

## CI et automatisation

Utilisez des indicateurs/variables d'environnement non interactifs pour des exécutions prévisibles.

<Tabs>
  <Tab title="install.sh (non-interactive npm)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-prompt --no-onboard ```
  </Tab>
  <Tab title="install.sh (non-interactive git)">
    ```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2
    https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="install-cli.sh (JSON)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="install.ps1 (skip onboarding)">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## Dépannage

<AccordionGroup>
  <Accordion title="Pourquoi Git est-il requis ?">
    Git est requis pour la méthode d'installation `git`. Pour les installations `npm`, Git est tout de même vérifié/installé pour éviter les échecs `spawn git ENOENT` lorsque les dépendances utilisent des URL git.
  </Accordion>

<Accordion title="Pourquoi npm renvoie-t-il EACCES sur Linux ?">
  Certaines configurations Linux définissent le préfixe global npm sur des chemins détenus par root.
  `install.sh` peut changer le préfixe vers `~/.npm-global` et ajouter des exports PATH aux fichiers
  rc du shell (lorsque ces fichiers existent).
</Accordion>

  <Accordion title="problèmes sharp/libvips">
    Les scripts définissent `SHARP_IGNORE_GLOBAL_LIBVIPS=1` par défaut pour éviter que sharp ne soit construit avec le libvips du système. Pour outrepasser :

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title="Windows : « erreur npm spawn git / ENOENT »">
  Installez Git pour Windows, rouvrez PowerShell, relancez le programme d'installation.
</Accordion>

<Accordion title="Windows : « openclaw n'est pas reconnu »">
  Exécutez `npm config get prefix` et ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe
  `\bin` nécessaire sur Windows), puis rouvrez PowerShell.
</Accordion>

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
    Généralement un problème de PATH. Voir [Node.js troubleshooting](/fr/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>

import fr from "/components/footer/fr.mdx";

<fr />
