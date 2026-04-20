---
summary: "Installez OpenClaw et lancez votre premier chat en quelques minutes."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Getting Started"
---

# Getting Started

Installez OpenClaw, lancez l'onboarding et discutez avec votre assistant IA — le tout en
environ 5 minutes. À la fin, vous aurez un Gateway opérationnel, une auth configurée,
et une session de chat fonctionnelle.

## Ce dont vous avez besoin

- **Node.js** — Node 24 recommandé (Node 22.14+ également pris en charge)
- **Une clé API** d'un fournisseur de modèle (Anthropic, OpenAI, Google, etc.) — l'onboarding vous invitera à la saisir

<Tip>Vérifiez votre version de Node avec `node --version`. **Utilisateurs Windows :** Windows natif et WSL2 sont pris en charge. WSL2 est plus stable et recommandé pour une expérience complète. Voir [Windows](/fr/platforms/windows). Besoin d'installer Node ? Voir [Configuration de Node](/fr/install/node).</Tip>

## Configuration rapide

<Steps>
  <Step title="Installer OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Processus du script d'installation"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    Autres méthodes d'installation (Docker, Nix, npm) : [Install](/fr/install).
    </Note>

  </Step>
  <Step title="Lancer l'intégration">
    ```bash
    openclaw onboard --install-daemon
    ```

    L'assistant vous guide dans le choix d'un fournisseur de modèle, la définition d'une clé API,
    et la configuration du Gateway. Cela prend environ 2 minutes.

    Voir [Intégration (CLI)](/fr/start/wizard) pour la référence complète.

  </Step>
  <Step title="Vérifier que le Gateway fonctionne">
    ```bash
    openclaw gateway status
    ```

    Vous devriez voir le Gateway écouter sur le port 18789.

  </Step>
  <Step title="Ouvrir le tableau de bord">
    ```bash
    openclaw dashboard
    ```

    Cela ouvre l'interface de contrôle dans votre navigateur. Si elle se charge, tout fonctionne.

  </Step>
  <Step title="Envoyez votre premier message">
    Tapez un message dans le chat de l'interface de contrôle et vous devriez recevoir une réponse de l'IA.

    Vous préférez chatter depuis votre téléphone ? Le canal le plus rapide à configurer est
    [Telegram](/fr/channels/telegram) (juste un jeton de bot). Voir [Canaux](/fr/channels)
    pour toutes les options.

  </Step>
</Steps>

<Accordion title="Avancé : monter une build personnalisée de l'interface de contrôle">
  Si vous maintenez une version localisée ou personnalisée du tableau de bord, pointez
  `gateway.controlUi.root` vers un répertoire contenant vos ressources
  statiques construites et `index.html`.

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# Copy your built static files into that directory.
```

Puis définissez :

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
    }
  }
}
```

Redémarrez la passerelle et rouvrez le tableau de bord :

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## Que faire ensuite

<Columns>
  <Card title="Connecter un canal" href="/fr/channels" icon="message-square">
    Discord, Feishu, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo, et plus encore.
  </Card>
  <Card title="Jumelage et sécurité" href="/fr/channels/pairing" icon="shield">
    Contrôlez qui peut envoyer des messages à votre agent.
  </Card>
  <Card title="Configurer la passerelle" href="/fr/gateway/configuration" icon="settings">
    Modèles, outils, bac à sable, et paramètres avancés.
  </Card>
  <Card title="Parcourir les outils" href="/fr/tools" icon="wrench">
    Navigateur, exécution, recherche web, compétences, et plugins.
  </Card>
</Columns>

<Accordion title="Avancé : variables d'environnement">
  Si vous exécutez OpenClaw en tant que compte de service ou si vous souhaitez des chemins personnalisés :

- `OPENCLAW_HOME` — répertoire personnel pour la résolution des chemins internes
- `OPENCLAW_STATE_DIR` — remplacer le répertoire d'état
- `OPENCLAW_CONFIG_PATH` — remplacer le chemin du fichier de configuration

Référence complète : [Variables d'environnement](/fr/help/environment).

</Accordion>
