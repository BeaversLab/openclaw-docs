---
title: "Node.js"
summary: "Installer et configurer Node.js pour OpenClaw — exigences de version, options d'installation et résolution des problèmes PATH"
read_when:
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
---

# Node.js

OpenClaw nécessite **Node 22.16 ou une version plus récente**. **Node 24 est l'environnement d'exécution par défaut et recommandé** pour les installations, l'CI et les workflows de publication. Node 22 reste pris en charge via la branche LTS active. Le [script d'installation](/fr/install#install-methods) détectera et installera Node automatiquement — cette page est destinée aux cas où vous souhaitez configurer Node vous-même et vous assurer que tout est correctement relié (versions, PATH, installations globales).

## Vérifiez votre version

```bash
node -v
```

Si cela affiche `v24.x.x` ou supérieur, vous utilisez la version par défaut recommandée. Si cela affiche `v22.16.x` ou supérieur, vous êtes sur la voie de la prise en charge de Node 22 LTS, mais nous recommandons tout de même de passer à Node 24 lorsque cela est possible. Si Node n'est pas installé ou si la version est trop ancienne, choisissez une méthode d'installation ci-dessous.

## Installer Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (recommandé) :

    ```bash
    brew install node
    ```

    Ou téléchargez le programme d'installation macOS depuis [nodejs.org](https://nodejs.org/).

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian :**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL :**

    ```bash
    sudo dnf install nodejs
    ```

    Ou utilisez un gestionnaire de versions (voir ci-dessous).

  </Tab>
  <Tab title="Windows">
    **winget** (recommandé) :

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey :**

    ```powershell
    choco install nodejs-lts
    ```

    Ou téléchargez le programme d'installation Windows depuis [nodejs.org](https://nodejs.org/).

  </Tab>
</Tabs>

<Accordion title="Utilisation d'un gestionnaire de versions (nvm, fnm, mise, asdf)">
  Les gestionnaires de versions vous permettent de basculer facilement entre les versions de Node. Options populaires :

- [**fnm**](https://github.com/Schniz/fnm) — rapide, multiplateforme
- [**nvm**](https://github.com/nvm-sh/nvm) — largement utilisé sur macOS/Linux
- [**mise**](https://mise.jdx.dev/) — polyglotte (Node, Python, Ruby, etc.)

Exemple avec fnm :

```bash
fnm install 24
fnm use 24
```

  <Warning>
  Assurez-vous que votre gestionnaire de versions est initialisé dans votre fichier de démarrage de shell (`~/.zshrc` ou `~/.bashrc`). Sinon, `openclaw` risque de ne pas être trouvé dans les nouvelles sessions de terminal car le PATH n'inclura pas le répertoire bin de Node.
  </Warning>
</Accordion>

## Dépannage

### `openclaw: command not found`

Cela signifie presque toujours que le répertoire bin global de npm n'est pas dans votre PATH.

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="Vérifiez s'il est dans votre PATH">
    ```bash
    echo "$PATH"
    ```

    Recherchez `<npm-prefix>/bin` (macOS/Linux) ou `<npm-prefix>` (Windows) dans la sortie.

  </Step>
  <Step title="Ajoutez-le à votre fichier de démarrage de shell">
    <Tabs>
      <Tab title="macOS / Linux">
        Ajoutez à `~/.zshrc` ou `~/.bashrc` :

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        Ouvrez ensuite un nouveau terminal (ou exécutez `rehash` dans zsh / `hash -r` dans bash).
      </Tab>
      <Tab title="Windows">
        Ajoutez la sortie de `npm prefix -g` à votre variable d'environnement PATH système via Paramètres → Système → Variables d'environnement.
      </Tab>
    </Tabs>

  </Step>
</Steps>

### Erreurs de permission sur `npm install -g` (Linux)

Si vous voyez des erreurs `EACCES`, modifiez le préfixe global de npm pour pointer vers un répertoire accessible en écriture par l'utilisateur :

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

Ajoutez la ligne `export PATH=...` à votre `~/.bashrc` ou `~/.zshrc` pour rendre la modification permanente.

import fr from '/components/footer/fr.mdx';

<fr />
