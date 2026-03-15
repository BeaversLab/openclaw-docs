---
summary: "Installer OpenClaw — script d'installation, npm/pnpm, depuis la source, Docker, et plus"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Installer"
---

# Installer

Vous avez déjà suivi [Getting Started](/fr/start/getting-started) ? Vous êtes prêt — cette page est destinée aux méthodes d'installation alternatives, aux instructions spécifiques à la plate-forme et à la maintenance.

## Configuration requise

- **[Node 24 (recommandé)](/fr/install/node)** (Node 22 LTS, actuellement `22.16+`, est encore pris en charge pour compatibilité ; le [script d'installation](#install-methods) installera Node 24 s'il est manquant)
- macOS, Linux ou Windows
- `pnpm` uniquement si vous compilez depuis la source

<Note>
  Sur Windows, nous recommandons vivement d'exécuter OpenClaw sous
  [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install).
</Note>

## Méthodes d'installation

<Tip>
  Le **script d'installation** est la méthode recommandée pour installer OpenClaw. Il gère la
  détection de Node, l'installation et l'onboarding en une seule étape.
</Tip>

<Warning>
  Pour les hôtes VPS/cloud, évitez si possible les images tierces du marché « en un clic ». Préférez
  une image de base OS propre (par exemple Ubuntu LTS), puis installez OpenClaw vous-même avec le
  script d'installation.
</Warning>

<AccordionGroup>
  <Accordion title="Script d'installation" icon="rocket" defaultOpen>
    Télécharge le CLI, l'installe globalement via npm et lance l'assistant de démarrage.

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    C'est tout — le script gère la détection de Node, l'installation et le démarrage.

    Pour ignorer le démarrage et simplement installer le binaire :

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
        ```
      </Tab>
    </Tabs>

    Pour tous les indicateurs, env vars et options d'automatisation CI, consultez [Installer internals](/fr/install/installer).

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    Si vous gérez déjà Node vous-même, nous recommandons Node 24. OpenClaw prend toujours en charge Node 22 LTS, actuellement `22.16+`, pour la compatibilité :

    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```

        <Accordion title="erreurs de build sharp ?">
          Si vous avez libvips installé globalement (courant sur macOS via Homebrew) et que `sharp` échoue, forcez les binaires préconstruits :

          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```

          Si vous voyez `sharp: Please add node-gyp to your dependencies`, installez soit les outils de build (macOS : Xcode CLT + `npm install -g node-gyp`) soit utilisez la env var ci-dessus.
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # approve openclaw, node-llama-cpp, sharp, etc.
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm nécessite une approbation explicite pour les packages avec des scripts de build. Après la première installation qui affiche l'avertissement "Ignored build scripts", exécutez `pnpm approve-builds -g` et sélectionnez les packages listés.
        </Note>
      </Tab>
    </Tabs>

  </Accordion>

  <Accordion title="Depuis la source" icon="github">
    Pour les contributeurs ou toute personne souhaitant exécuter depuis une copie locale.

    <Steps>
      <Step title="Cloner et construire">
        Clonez le [dépôt OpenClaw](https://github.com/openclaw/openclaw) et construisez :

        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="Lier la CLI">
        Rendez la commande `openclaw` disponible globalement :

        ```bash
        pnpm link --global
        ```

        Alternativement, ignorez le lien et exécutez les commandes via `pnpm openclaw ...` depuis l'intérieur du dépôt.
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    Pour des workflows de développement plus approfondis, consultez [Configuration](/fr/start/setup).

  </Accordion>
</AccordionGroup>

## Autres méthodes d'installation

<CardGroup cols={2}>
  <Card title="Docker" href="/fr/install/docker" icon="container">
    Déploiements conteneurisés ou sans tête.
  </Card>
  <Card title="Podman" href="/fr/install/podman" icon="container">
    Conteneur sans privilèges root : exécutez `setup-podman.sh` une fois, puis le script de
    lancement.
  </Card>
  <Card title="Nix" href="/fr/install/nix" icon="snowflake">
    Installation déclarative via Nix.
  </Card>
  <Card title="Ansible" href="/fr/install/ansible" icon="server">
    Provisionnement automatisé de flotte.
  </Card>
  <Card title="Bun" href="/fr/install/bun" icon="zap">
    Usage exclusivement en CLI via le runtime Bun.
  </Card>
</CardGroup>

## Après l'installation

Vérifiez que tout fonctionne :

```bash
openclaw doctor         # check for config issues
openclaw status         # gateway status
openclaw dashboard      # open the browser UI
```

Si vous avez besoin de chemins d'exécution personnalisés, utilisez :

- `OPENCLAW_HOME` pour les chemins internes basés sur le répertoire personnel
- `OPENCLAW_STATE_DIR` pour l'emplacement de l'état modifiable
- `OPENCLAW_CONFIG_PATH` pour l'emplacement du fichier de configuration

Voir [Variables d'environnement](/fr/help/environment) pour la priorité et tous les détails.

## Dépannage : `openclaw` introuvable

<Accordion title="Diagnostic et réparation du PATH">
  Diagnostic rapide :

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

Si `$(npm prefix -g)/bin` (macOS/Linux) ou `$(npm prefix -g)` (Windows) n'est **pas** dans votre `$PATH`, votre shell ne peut pas trouver les binaires globaux npm (y compris `openclaw`).

Correction — ajoutez-le à votre fichier de démarrage de shell (`~/.zshrc` ou `~/.bashrc`) :

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Sur Windows, ajoutez la sortie de `npm prefix -g` à votre PATH.

Ensuite, ouvrez un nouveau terminal (ou `rehash` dans zsh / `hash -r` dans bash).

</Accordion>

## Mise à jour / désinstallation

<CardGroup cols={3}>
  <Card title="Mise à jour" href="/fr/install/updating" icon="refresh-cw">
    Gardez OpenClaw à jour.
  </Card>
  <Card title="Migration" href="/fr/install/migrating" icon="arrow-right">
    Passer à une nouvelle machine.
  </Card>
  <Card title="Désinstallation" href="/fr/install/uninstall" icon="trash-2">
    Supprimez complètement OpenClaw.
  </Card>
</CardGroup>

import fr from '/components/footer/fr.mdx';

<fr />
