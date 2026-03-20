---
summary: "Corriger les problèmes de démarrage du CDP Chrome/Brave/Edge/Chromium pour le contrôle du navigateur OpenClaw sur Linux"
read_when: "Le contrôle du navigateur échoue sur Linux, en particulier avec snap Chromium"
title: "Dépannage du navigateur"
---

# Dépannage du navigateur (Linux)

## Problème : "Échec du démarrage du CDP Chrome sur le port 18800"

Le serveur de contrôle du navigateur de OpenClaw échoue à lancer Chrome/Brave/Edge/Chromium avec l'erreur :

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### Cause racine

Sur Ubuntu (et de nombreuses distributions Linux), l'installation par défaut de Chromium est un **paquet snap**. Le confinement AppArmor de Snap interfère avec la façon dont OpenClaw génère et surveille le processus du navigateur.

La commande `apt install chromium` installe un paquet stub qui redirige vers snap :

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

Ceci n'est PAS un vrai navigateur - ce n'est qu'un enveloppeur.

### Solution 1 : Installer Google Chrome (Recommandé)

Installez le paquet officiel `.deb` de Google Chrome, qui n'est pas mis en bac à sable (sandboxed) par snap :

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

Mettez ensuite à jour votre configuration OpenClaw (`~/.openclaw/openclaw.json`) :

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### Solution 2 : Utiliser Snap Chromium en mode Attach-Only

Si vous devez utiliser snap Chromium, configurez OpenClaw pour se connecter à un navigateur démarré manuellement :

1. Mettez à jour la configuration :

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. Démarrez Chromium manuellement :

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. Créez éventuellement un service utilisateur systemd pour démarrer Chrome automatiquement :

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Activez avec : `systemctl --user enable --now openclaw-browser.service`

### Vérification du fonctionnement du navigateur

Vérifier l'état :

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

Test de navigation :

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### Référence de configuration

| Option                   | Description                                                                           | Par défaut                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `browser.enabled`        | Activer le contrôle du navigateur                                                     | `true`                                                                                     |
| `browser.executablePath` | Chemin vers le binaire d'un navigateur basé sur Chromium (Chrome/Brave/Edge/Chromium) | détecté automatiquement (préfère le navigateur par défaut lorsqu'il est basé sur Chromium) |
| `browser.headless`       | Exécuter sans interface graphique                                                     | `false`                                                                                    |
| `browser.noSandbox`      | Ajouter le drapeau `--no-sandbox` (nécessaire pour certaines configurations Linux)    | `false`                                                                                    |
| `browser.attachOnly`     | Ne pas lancer le navigateur, se connecter uniquement à un existant                    | `false`                                                                                    |
| `browser.cdpPort`        | Port du protocole Chrome DevTools                                                     | `18800`                                                                                    |

### Problème : "Aucun onglet Chrome trouvé pour profile=\"user\""

Vous utilisez un profil `existing-session` / Chrome MCP. OpenClaw peut voir le Chrome local,
mais il n'y a aucun onglet ouvert auquel s'attacher.

Options de correction :

1. **Utiliser le navigateur géré :** `openclaw browser start --browser-profile openclaw`
   (ou définissez `browser.defaultProfile: "openclaw"`).
2. **Utiliser Chrome MCP :** assurez-vous que le Chrome local est en cours d'exécution avec au moins un onglet ouvert, puis réessayez avec `--browser-profile user`.

Notes :

- `user` est uniquement accessible en local. Pour les serveurs Linux, les conteneurs ou les hôtes distants, préférez les profils CDP.
- Les profils `openclaw` locaux attribuent automatiquement `cdpPort`/`cdpUrl` ; ne définissez ces valeurs que pour le CDP distant.

import fr from "/components/footer/fr.mdx";

<fr />
