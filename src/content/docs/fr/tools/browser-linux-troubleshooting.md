---
summary: "Résoudre les problèmes de démarrage du CDP Chrome/Brave/Edge/Chromium pour le contrôle du navigateur OpenClaw sur Linux"
read_when: "Le contrôle du navigateur échoue sur Linux, en particulier avec snap Chromium"
title: "Dépannage du navigateur"
---

## Problème : « Échec du démarrage de Chrome CDP sur le port 18800 »

Le serveur de contrôle de navigateur d'OpenClaw échoue à lancer Chrome/Brave/Edge/Chromium avec l'erreur :

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

Ceci n'est PAS un vrai navigateur - ce n'est qu'un enveloppeur (wrapper).

Autres échecs de lancement courants sur Linux :

- `The profile appears to be in use by another Chromium process` signifie que Chrome
  a trouvé des fichiers verrou `Singleton*` obsolètes dans le répertoire du profil géré. OpenClaw
  supprime ces verrous et réessaie une fois lorsque le verrou pointe vers un processus
  mort ou sur un hôte différent.
- `Missing X server or $DISPLAY` signifie qu'un navigateur visible a été explicitement
  demandé sur un hôte sans session de bureau. Par défaut, les profils gérés localement
  reviennent désormais en mode headless sur Linux lorsque `DISPLAY` et
  `WAYLAND_DISPLAY` ne sont pas définis. Si vous définissez `OPENCLAW_BROWSER_HEADLESS=0`,
  `browser.headless: false` ou `browser.profiles.<name>.headless: false`,
  supprimez ce redressement headed, définissez `OPENCLAW_BROWSER_HEADLESS=1`, démarrez `Xvfb`,
  exécutez `openclaw browser start --headless` pour un lancement géré ponctuel, ou exécutez
  OpenClaw dans une vraie session de bureau.

### Solution 1 : Installer Google Chrome (Recommandé)

Installez le paquet officiel `.deb` de Google Chrome, qui n'est pas isolé (sandboxed) par snap :

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

### Solution 2 : Utiliser Snap Chromium en mode attachement uniquement

Si vous devez utiliser le snap Chromium, configurez OpenClaw pour s'attacher à un navigateur démarré manuellement :

1. Mettre à jour la configuration :

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

2. Démarrer Chromium manuellement :

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. Créez facultativement un service utilisateur systemd pour démarrer Chrome automatiquement :

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

Activer avec : `systemctl --user enable --now openclaw-browser.service`

### Vérifier que le navigateur fonctionne

Vérifier l'état :

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

Tester la navigation :

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### Référence de configuration

| Option                           | Description                                                                                    | Par défaut                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `browser.enabled`                | Activer le contrôle du navigateur                                                              | `true`                                                                                     |
| `browser.executablePath`         | Chemin vers le binaire d'un navigateur basé sur Chromium (Chrome/Brave/Edge/Chromium)          | détecté automatiquement (préfère le navigateur par défaut lorsqu'il est basé sur Chromium) |
| `browser.headless`               | Exécuter sans interface graphique                                                              | `false`                                                                                    |
| `OPENCLAW_BROWSER_HEADLESS`      | Remplacement par processus pour le mode sans interface graphique du navigateur géré localement | non défini                                                                                 |
| `browser.noSandbox`              | Ajouter le paramètre `--no-sandbox` (nécessaire pour certaines configurations Linux)           | `false`                                                                                    |
| `browser.attachOnly`             | Ne pas lancer le navigateur, s'attacher uniquement à l'existant                                | `false`                                                                                    |
| `browser.cdpPort`                | Port du protocole Chrome DevTools                                                              | `18800`                                                                                    |
| `browser.localLaunchTimeoutMs`   | Délai d'expiration de la détection Chrome gérée localement                                     | `15000`                                                                                    |
| `browser.localCdpReadyTimeoutMs` | Délai d'expiration de préparation CDP post-lancement géré localement                           | `8000`                                                                                     |

Sur Raspberry Pi, les anciens hébergeurs VPS ou les stockages lents, augmentez
`browser.localLaunchTimeoutMs` lorsque Chrome a besoin de plus de temps pour exposer son point de
terminaison HTTP CDP. Augmentez `browser.localCdpReadyTimeoutMs` lorsque le lancement réussit mais que
`openclaw browser start` signale encore `not reachable after start`. Les valeurs doivent
être des entiers positifs jusqu'à `120000` ms ; les valeurs de configuration non valides sont rejetées.

### Problème : « Aucun onglet Chrome trouvé pour profile=\"user\" »

Vous utilisez un profil `existing-session` / Chrome MCP. OpenClaw peut voir le Chrome local,
mais il n'y a aucun onglet ouvert auquel s'attacher.

Options de correction :

1. **Utiliser le navigateur géré :** `openclaw browser start --browser-profile openclaw`
   (ou définissez `browser.defaultProfile: "openclaw"`).
2. **Utiliser Chrome MCP :** assurez-vous que le Chrome local est en cours d'exécution avec au moins un onglet ouvert, puis réessayez avec `--browser-profile user`.

Remarques :

- `user` est uniquement accessible sur l'hôte. Pour les serveurs Linux, les conteneurs ou les hôtes distants, préférez les profils CDP.
- `user` / autres profils `existing-session` conservent les limites actuelles de Chrome MCP :
  actions basées sur des références, hooks de téléchargement de fichiers uniques, aucune substitution de délai d'expiration de boîte de dialogue, aucun
  `wait --load networkidle`, et aucun `responsebody`, export PDF, interception de
  téléchargement ou actions par lots.
- Les profils `openclaw` locaux attribuent automatiquement `cdpPort`/`cdpUrl` ; ne définissez ceux-ci que pour le CDP distant.
- Les profils CDP distants acceptent `http://`, `https://`, `ws://` et `wss://`.
  Utilisez HTTP(S) pour la découverte `/json/version`, ou WS(S) lorsque votre service
  de navigateur vous fournit une URL de socket DevTools directe.

## Connexes

- [Navigateur](/fr/tools/browser)
- [Connexion au navigateur](/fr/tools/browser-login)
- [Dépannage navigateur WSL2](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
