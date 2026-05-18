---
summary: "Accès distant via Gateway WS, tunnels SSH et tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Accès distant"
---

Ce dépôt prend en charge l'accès distant à la passerelle en maintenant un seul Gateway (le maître) en cours d'exécution sur un hôte dédié (bureau/serveur) et en connectant les clients à celui-ci.

- Pour **les opérateurs (vous / l'application macOS)** : le WebSocket LAN/Tailnet direct est le plus simple lorsque la passerelle est joignable ; le tunnel SSH est la solution de repli universelle.
- Pour **les nœuds (iOS/Android et les futurs appareils)** : connectez-vous au **WebSocket** du Gateway (LAN/tailnet ou tunnel SSH selon les besoins).

## L'idée principale

- Le WebSocket Gateway se lie généralement à **loopback** sur votre port configuré (par défaut 18789).
- Pour une utilisation à distance, exposez-le via Tailscale Serve ou une liaison LAN/Tailnet de confiance, ou transférez le port loopback via SSH.

## Configurations courantes de VPN et de tailnet

Considérez l'**hôte du Gateway** comme l'endroit où réside l'agent. Il possède les sessions, les profils d'authentification, les canaux et l'état. Votre ordinateur portable, votre bureau et vos nœuds se connectent à cet hôte.

### Gateway toujours actif dans votre tailnet

Exécutez le Gateway sur un hôte persistant (VPS ou serveur domestique) et accédez-y via **Tailscale** ou SSH.

- **Meilleure UX :** conservez `gateway.bind: "loopback"` et utilisez **Tailscale Serve** pour l'interface de contrôle.
- **LAN/Tailnet de confiance :** liez la passerelle à une interface privée et connectez-vous directement avec `gateway.remote.transport: "direct"`.
- **Solution de repli :** conservez loopback plus un tunnel SSH depuis n'importe quelle machine nécessitant un accès.
- **Exemples :** [exe.dev](/fr/install/exe-dev) (VM facile) ou [Hetzner](/fr/install/hetzner) (VPS de production).

Idéal lorsque votre ordinateur portable est souvent en veille mais que vous souhaitez que l'agent soit toujours actif.

### Le bureau de maison exécute le Gateway

L'ordinateur portable n'exécute **pas** l'agent. Il se connecte à distance :

- Utilisez le mode distant de l'application macOS (Paramètres → Général → OpenClaw exécute).
- L'application se connecte directement lorsque la passerelle est joignable sur LAN/Tailnet, ou ouvre et gère un tunnel SSH lorsque vous choisissez SSH.

Runbook : [Accès distant macOS](/fr/platforms/mac/remote).

### L'ordinateur portable exécute le Gateway

Gardez le Gateway en local mais exposez-le en toute sécurité :

- Tunnel SSH vers l'ordinateur portable depuis d'autres machines, ou
- Tailscale Serve l'interface de contrôle et garde le Gateway en boucle locale uniquement (loopback-only).

Guides : [Tailscale](/fr/gateway/tailscale) et [Vue d'ensemble Web](/fr/web).

## Flux de commandes (ce qui s'exécute où)

Un service de gateway possède l'état + les canaux. Les nœuds sont des périphériques.

Exemple de flux (Telegram → nœud) :

- Le message Telegram arrive à la **Gateway**.
- La Gateway exécute l'**agent** et décide d'appeler ou non un outil de nœud.
- Le Gateway appelle le **nœud** via le WebSocket Gateway (`node.*` RPC).
- Le nœud renvoie le résultat ; la Gateway répond à Telegram.

Remarques :

- **Les nœuds n'exécutent pas le service Gateway.** Un seul Gateway doit s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)).
- Le mode « nœud » de l'application macOS n'est qu'un client nœud via le WebSocket Gateway.

## Tunnel SSH (CLI + outils)

Créez un tunnel local vers le WS de la Gateway distante :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Une fois le tunnel établi :

- `openclaw health` et `openclaw status --deep` atteignent désormais le Gateway distant via `ws://127.0.0.1:18789`.
- `openclaw gateway status`, `openclaw gateway health`, `openclaw gateway probe` et `openclaw gateway call` peuvent également cibler l'URL transférée via `--url` si nécessaire.

<Note>Remplacez `18789` par votre `gateway.port` configuré (ou `--port` ou `OPENCLAW_GATEWAY_PORT`).</Note>

<Warning>Lorsque vous transmettez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement. Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.</Warning>

## CLI distant par défaut

Vous rendre persistant une cible distante afin que les commandes CLI l'utilisent par défaut :

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

Lorsque le Gateway est en boucle locale uniquement, conservez l'URL à `ws://127.0.0.1:18789` et ouvrez d'abord le tunnel SSH.
Dans le transport de tunnel SSH de l'application macOS, les noms d'hôte Gateway découverts appartiennent à
`gateway.remote.sshTarget` ; `gateway.remote.url` reste l'URL du tunnel local.
Si ces ports diffèrent, définissez `gateway.remote.remotePort` sur le port Gateway sur
l'hôte SSH.

Pour un Gateway déjà accessible sur un LAN de confiance ou un Tailnet, utilisez le mode direct :

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "ws://192.168.0.202:18789",
      token: "your-token",
    },
  },
}
```

## Priorité des identifiants

La résolution des identifiants Gateway suit un contrat partagé sur les chemins d'appel/probe/status et la surveillance d'approbation d'exécution Discord. Node-host utilise le même contrat de base avec une exception en mode local (il ignore intentionnellement `gateway.remote.*`) :

- Les identifiants explicites (`--token`, `--password` ou tool `gatewayToken`) l'emportent toujours sur les chemins d'appel acceptant une authentification explicite.
- Sécurité de la priorité de l'URL :
  - Les priorités d'URL de la CLI (`--url`) ne réutilisent jamais les identifiants implicites de config/env.
  - Les priorités d'URL d'env (`OPENCLAW_GATEWAY_URL`) peuvent utiliser uniquement les identifiants d'env (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valeurs par défaut du mode local :
  - jeton : `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (le repli distant ne s'applique que lorsque l'entrée du jeton d'authentification locale n'est pas définie)
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (le repli distant ne s'applique que lorsque l'entrée du mot de passe d'authentification locale n'est pas définie)
- Valeurs par défaut du mode distant :
  - jeton : `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Exception du mode local de l'hôte de nœud : `gateway.remote.token` / `gateway.remote.password` sont ignorés.
- Les vérifications de jeton de sonde/état distant sont strictes par défaut : elles utilisent uniquement `gateway.remote.token` (sans repli de jeton local) lors du ciblage du mode distant.
- Les priorités d'env de la Gateway utilisent uniquement `OPENCLAW_GATEWAY_*`.

## Accès distant de l'interface de chat

La WebChat n'utilise plus un port HTTP séparé. L'interface de chat SwiftUI se connecte directement au WebSocket de la Gateway.

- Transférez `18789` via SSH (voir ci-dessus), puis connectez les clients à `ws://127.0.0.1:18789`.
- Pour le mode direct LAN/Tailnet, connectez les clients à l'URL privée configurée `ws://` ou sécurisée `wss://`.
- Sur macOS, préférez le mode distant de l'application, qui gère automatiquement le transport sélectionné.

## Mode distant de l'application macOS

L'application de la barre de menus macOS peut piloter la même configuration de bout en bout (vérifications de l'état à distance, WebChat et transfert Voice Wake).

Runbook : [accès distant macOS](macOS/en/platforms/mac/remote).

## Règles de sécurité (distante/VPN)

Version courte : **gardez la Gateway en loopback uniquement**, sauf si vous êtes sûr de devoir faire une liaison (bind).

- **Loopback + SSH/Tailscale Serve** est le paramètre par défaut le plus sûr (aucune exposition publique).
- Le texte en clair `ws://` est accepté pour le loopback, le LAN, le lien local, `.local`, `.ts.net`Tailscale et les hôtes Tailscale CGNAT. Les hôtes distants publics doivent utiliser `wss://`.
- **Les liaisons non-loopback** (`lan`/`tailnet`/`custom`, ou `auto` lorsque le loopback n'est pas disponible) doivent utiliser l'authentification de passerelle : jeton, mot de passe, ou un proxy inverse identitaire avec `gateway.auth.mode: "trusted-proxy"`.
- `gateway.remote.token` / `.password` sont des sources d'identifiants clients. Ils ne configurent **pas** par eux-mêmes l'authentification serveur.
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de repli distant).
- `gateway.remote.tlsFingerprint` épingle le certificat TLS distant lors de l'utilisation de `wss://`macOSmacOSmacOS, y compris en mode direct macOS. Sans une épingle configurée ou stockée précédemment, macOS n'épingle un certificat de première utilisation qu'après la vérification de la confiance système normale ; les passerelles auto-signées ou à autorité de certification privée que macOS ne fait pas déjà confiance nécessitent une empreinte explicite ou un accès distant via SSH.
- **Tailscale Serve** peut authentifier le trafic de l'interface de contrôle/WebSocket via des en-têtes d'identité lorsque `gateway.auth.allowTailscale: true` ; les points de terminaison de l'HTTP API n'utilisent pas cette authentification par en-tête Tailscale et suivent plutôt le mode d'authentification HTTP normal de la passerelle. Ce flux sans jeton suppose que l'hôte de la passerelle est approuvé. Réglez-le sur `false` si vous souhaitez une authentification par secret partagé partout.
- L'authentification **Trusted-proxy** s'attend par défaut à des configurations de proxy conscients de l'identité et non en boucle locale (non-loopback). Les proxies inversés en boucle locale sur le même hôte nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite.
- Traitez le contrôle du navigateur comme un accès d'opérateur : exclusivement via tailnet + appariement délibéré des nœuds.

Pour approfondir : [Sécurité](/fr/gateway/security).

### macOS : tunnel SSH persistant via LaunchAgent

Pour les clients macOS se connectant à une passerelle distante, la configuration persistante la plus simple utilise une entrée de configuration SSH `LocalForward` ainsi qu'un LaunchAgent pour maintenir le tunnel actif après les redémarrages et les plantages.

#### Étape 1 : ajouter la configuration SSH

Modifiez `~/.ssh/config` :

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

Remplacez `<REMOTE_IP>` et `<REMOTE_USER>` par vos valeurs.

#### Étape 2 : copier la clé SSH (une seule fois)

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### Étape 3 : configurer le jeton de la passerelle

Stockez le jeton dans la configuration afin qu'il persiste après les redémarrages :

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### Étape 4 : créer le LaunchAgent

Enregistrez ceci sous `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### Étape 5 : charger le LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

Le tunnel démarrera automatiquement à la connexion, redémarrera en cas de plantage et maintiendra le port transféré actif.

<Note>Si vous avez un LaunchAgent `com.openclaw.ssh-tunnel` résiduel d'une ancienne configuration, déchargez-le et supprimez-le.</Note>

#### Dépannage

Vérifiez si le tunnel est en cours d'exécution :

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

Redémarrez le tunnel :

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

Arrêtez le tunnel :

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| Entrée de configuration              | Ce qu'il fait                                                           |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | Transfère le port local 18789 vers le port distant 18789                |
| `ssh -N`                             | SSH sans exécuter de commandes distantes (uniquement transfert de port) |
| `KeepAlive`                          | Redémarre automatiquement le tunnel s'il plante                         |
| `RunAtLoad`                          | Démarre le tunnel lorsque le LaunchAgent se charge à la connexion       |

## Connexes

- [Tailscale](/fr/gateway/tailscale)
- [Authentification](/fr/gateway/authentication)
- [Configuration de la passerelle distante](/fr/gateway/remote-gateway-readme)
