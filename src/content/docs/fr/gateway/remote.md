---
summary: "Accès distant utilisant des tunnels SSH (Gateway WS) et des tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Accès à distance"
---

Ce dépôt prend en charge « le mode distant sur SSH » en maintenant un seul Gateway (le maître) en fonctionnement sur un hôte dédié (bureau/serveur) et en y connectant les clients.

- Pour **les opérateurs (vous / l'application macOS)** : le tunneling SSH est le repli universel.
- Pour **les nœuds (iOS/Android et les futurs appareils)** : connectez-vous au **WebSocket** du Gateway (LAN/tailnet ou tunnel SSH selon les besoins).

## L'idée principale

- Le WebSocket du Gateway se lie à **loopback** sur votre port configuré (par défaut 18789).
- Pour une utilisation à distance, vous transférez ce port loopback via SSH (ou utilisez un tailnet/VPN et réduisez le tunneling).

## Configurations courantes de VPN et de tailnet

Considérez l'**hôte du Gateway** comme l'endroit où réside l'agent. Il possède les sessions, les profils d'authentification, les canaux et l'état. Votre ordinateur portable, votre bureau et vos nœuds se connectent à cet hôte.

### Gateway toujours actif dans votre tailnet

Exécutez le Gateway sur un hôte persistant (VPS ou serveur domestique) et accédez-y via **Tailscale** ou SSH.

- **Meilleure UX :** conservez `gateway.bind: "loopback"` et utilisez **Tailscale Serve** pour l'interface de contrôle.
- **Repli :** conservez loopback plus un tunnel SSH depuis n'importe quelle machine nécessitant un accès.
- **Exemples :** [exe.dev](/fr/install/exe-dev) (VM facile) ou [Hetzner](/fr/install/hetzner) (VPS de production).

Idéal lorsque votre ordinateur portable se met souvent en veille mais que vous voulez que l'agent soit toujours actif.

### Le bureau domestique exécute le Gateway

L'ordinateur portable **n'exécute pas** l'agent. Il se connecte à distance :

- Utilisez le mode **Remote over SSH** de l'application macOS (Paramètres → Général → Exécutions OpenClaw).
- L'application ouvre et gère le tunnel, donc WebChat et les contrôles de santé fonctionnent simplement.

Runbook : [Accès distant macOS](/fr/platforms/mac/remote).

### L'ordinateur portable exécute le Gateway

Gardez le Gateway en local mais exposez-le en toute sécurité :

- Tunnel SSH vers l'ordinateur portable depuis d'autres machines, ou
- Tailscale Servez l'interface de contrôle et gardez le Gateway en loopback uniquement.

Guides : [Tailscale](/fr/gateway/tailscale) et [Aperçu Web](/fr/web).

## Flux de commandes (ce qui s'exécute où)

Un service de passerelle possède l'état + les canaux. Les nœuds sont des périphériques.

Exemple de flux (Telegram → nœud) :

- Le message Telegram arrive sur la **Gateway**.
- Le Gateway exécute l'**agent** et décide d'appeler ou non un outil de nœud.
- Le Gateway appelle le **nœud** via le WebSocket du Gateway (`node.*` RPC).
- Le nœud renvoie le résultat ; la Gateway répond à son tour à Telegram.

Notes :

- **Les nœuds n'exécutent pas le service de passerelle.** Une seule passerelle doit s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)).
- Le « mode nœud » de l'application macOS est simplement un client nœud via le WebSocket de la Gateway.

## Tunnel SSH (CLI + outils)

Créer un tunnel local vers le WS de la Gateway distante :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Avec le tunnel actif :

- `openclaw health` et `openclaw status --deep` atteignent désormais la passerelle distante via `ws://127.0.0.1:18789`.
- `openclaw gateway status`, `openclaw gateway health`, `openclaw gateway probe` et `openclaw gateway call` peuvent également cibler l'URL transférée via `--url` si nécessaire.

<Note>Remplacez `18789` par votre `gateway.port` configuré (ou `--port` ou `OPENCLAW_GATEWAY_PORT`).</Note>

<Warning>Lorsque vous passez `--url`, la CLI ne revient pas aux identifiants de configuration ou d'environnement. Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.</Warning>

## CLI valeurs par défaut distantes

Vous pouvez rendre une cible distante persistante pour que les commandes CLI l'utilisent par défaut :

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

Lorsque la passerelle est en boucle locale uniquement, conservez l'URL à `ws://127.0.0.1:18789` et ouvrez d'abord le tunnel SSH.
Dans le transport de tunnel SSH de l'application macOS, les noms d'hôte de passerelle découverts appartiennent à
`gateway.remote.sshTarget` ; `gateway.remote.url` reste l'URL du tunnel local.

## Priorité des identifiants

La résolution des identifiants de la Gateway suit un contrat unique partagé entre les chemins d'appel/probe/statut et la surveillance d'approbation d'exécution Discord. Node-host utilise le même contrat de base avec une exception en mode local (il ignore intentionnellement `gateway.remote.*`) :

- Les identifiants explicites (`--token`, `--password` ou outil `gatewayToken`) priment toujours sur les chemins d'appel acceptant une auth explicite.
- Sécurité de la substitution de l'URL :
  - Les redéfinitions d'URL de la CLI (`--url`) ne réutilisent jamais les identifiants implicites de config/env.
  - Les redéfinitions d'URL d'env (`OPENCLAW_GATEWAY_URL`) ne peuvent utiliser que les identifiants d'env (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valeurs par défaut du mode local :
  - token : `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (le repli distant ne s'applique que lorsque la saisie du jeton d'authentification locale n'est pas définie)
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (le repli distant ne s'applique que lorsque la saisie du mot de passe d'authentification locale n'est pas définie)
- Valeurs par défaut du mode distant :
  - token : `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Exception du mode local sur l'hôte du nœud : `gateway.remote.token` / `gateway.remote.password` sont ignorés.
- Les vérifications de jeton de sonde/état distant sont strictes par défaut : elles utilisent `gateway.remote.token` uniquement (pas de repli de jeton local) lors du ciblage du mode distant.
- Les remplacements d'environnement du Gateway utilisent uniquement `OPENCLAW_GATEWAY_*`.

## Interface utilisateur de chat sur SSH

WebChat n'utilise plus de port HTTP distinct. L'interface utilisateur de chat SwiftUI se connecte directement au WebSocket Gateway.

- Transférer `18789` via SSH (voir ci-dessus), puis connecter les clients à `ws://127.0.0.1:18789`.
- Sur macOS, privilégiez le mode « Remote over SSH » de l'application, qui gère le tunnel automatiquement.

## Application macOS Accès distant via SSH

L'application de la barre de menus macOS peut gérer le même configuration de bout en bout (vérifications de l'état distant, WebChat et transfert Voice Wake).

Manuel de procédures : [accès distant macOS](/fr/platforms/mac/remote).

## Règles de sécurité (accès distant/VPN)

Version courte : **gardez le Gateway en loopback uniquement** sauf si vous êtes sûr de devoir faire un bind.

- **Loopback + SSH/Tailscale Serve** est le réglage par défaut le plus sûr (aucune exposition publique).
- Par défaut, `ws://` en texte clair est limité à la boucle locale. Pour les réseaux privés de confiance,
  définissez `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` sur le processus client comme
  solution de secours. Il n'y a pas d'équivalent `openclaw.json` ; cela doit être l'environnement
  du processus pour le client établissant la connexion WebSocket.
- Les liaisons **non-boucle locale** (`lan`/`tailnet`/`custom`, ou `auto` lorsque la boucle locale n'est pas disponible) doivent utiliser l'authentification de la passerelle : jeton, mot de passe ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`.
- `gateway.remote.token` / `.password` sont des sources d'identification client. Ils ne configurent **pas** l'authentification du serveur par eux-mêmes.
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de repli distant).
- `gateway.remote.tlsFingerprint` épingle le certificat TLS distant lors de l'utilisation de `wss://`.
- **Tailscale Serve** peut authentifier le trafic de l'interface de contrôle/WebSocket via des en-têtes d'identité lorsque `gateway.auth.allowTailscale: true` ; les points de terminaison de l'API HTTP n'utilisent pas cette authentification par en-tête Tailscale et suivent plutôt le mode d'authentification HTTP normal de la passerelle. Ce flux sans jeton suppose que l'hôte de la passerelle est approuvé. Réglez-le sur `false` si vous souhaitez une authentification par secret partagé partout.
- L'authentification **Trusted-proxy** est uniquement destinée aux configurations de proxy avec sensibilisation à l'identité non en boucle locale (non-loopback). Les proxies inverses en boucle locale sur le même hôte ne satisfont pas `gateway.auth.mode: "trusted-proxy"`.
- Traitez le contrôle via le navigateur comme un accès opérateur : uniquement sur le tailnet + jumelage délibéré des nœuds.

Approfondissement : [Sécurité](/fr/gateway/security).

### macOS : tunnel SSH persistant via LaunchAgent

Pour les clients macOS se connectant à une passerelle distante, la configuration persistante la plus simple utilise une entrée de configuration SSH `LocalForward` ainsi qu'un LaunchAgent pour maintenir le tunnel actif après les redémarrages et plantages.

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

Le tunnel démarrera automatiquement à la connexion, redémarrera après un plantage et gardera le port transféré actif.

<Note>Si vous avez un LaunchAgent `com.openclaw.ssh-tunnel` restant d'une ancienne configuration, déchargez-le et supprimez-le.</Note>

#### Dépannage

Vérifiez si le tunnel fonctionne :

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
| `ssh -N`                             | SSH sans exécuter de commandes distantes (transfert de port uniquement) |
| `KeepAlive`                          | Redémarre automatiquement le tunnel s'il plante                         |
| `RunAtLoad`                          | Démarre le tunnel lorsque le LaunchAgent se charge à la connexion       |

## Connexes

- [Tailscale](/fr/gateway/tailscale)
- [Authentification](/fr/gateway/authentication)
- [Configuration de la passerelle distante](/fr/gateway/remote-gateway-readme)
