---
summary: "Accès distant utilisant des tunnels SSH (Gateway WS) et des tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Accès distant"
---

# Accès distant (SSH, tunnels et tailnets)

Ce dépôt prend en charge « l'accès distant via SSH » en maintenant un seul Gateway (le maître) en cours d'exécution sur un hôte dédié (bureau/serveur) et en connectant les clients à celui-ci.

- Pour **les opérateurs (vous / l'application macOS)** : le tunneling SSH est le repli universel.
- Pour **les nœuds (iOS/Android et les futurs appareils)** : connectez-vous au Gateway **WebSocket** (LAN/tailnet ou tunnel SSH selon les besoins).

## L'idée principale

- Le Gateway WebSocket se lie à **loopback** sur votre port configuré (par défaut 18789).
- Pour une utilisation à distance, vous transférez ce port loopback via SSH (ou vous utilisez un tailnet/VPN et réduisez le tunneling).

## Configurations courantes de VPN/tailnet (où réside l'agent)

Considérez l'**hôte Gateway** comme « l'endroit où réside l'agent ». Il possède les sessions, les profils d'authentification, les canaux et l'état.
Votre ordinateur portable/de bureau (et les nœuds) se connectent à cet hôte.

### 1) Gateway toujours actif dans votre tailnet (VPS ou serveur domestique)

Exécutez le Gateway sur un hôte persistant et accédez-y via **Tailscale** ou SSH.

- **Meilleure UX :** gardez `gateway.bind: "loopback"` et utilisez **Tailscale Serve** pour l'interface de contrôle.
- **Repli :** conservez loopback + tunnel SSH à partir de n'importe quelle machine nécessitant un accès.
- **Exemples :** [exe.dev](/en/install/exe-dev) (VM facile) ou [Hetzner](/en/install/hetzner) (VPS de production).

C'est idéal lorsque votre ordinateur portable se met souvent en veille mais que vous souhaitez que l'agent soit toujours actif.

### 2) Le bureau domestique exécute le Gateway, l'ordinateur portable est une télécommande

L'ordinateur portable n'exécute **pas** l'agent. Il se connecte à distance :

- Utilisez le mode **Remote over SSH** de l'application macOS (Paramètres → Général → « OpenClaw runs »).
- L'application ouvre et gère le tunnel, donc WebChat + les contrôles de santé « fonctionnent tout seuls ».

Runbook : [accès distant macOS](/en/platforms/mac/remote).

### 3) L'ordinateur portable exécute le Gateway, accès distant à partir d'autres machines

Gardez le Gateway en local mais exposez-le en toute sécurité :

- Tunnel SSH vers l'ordinateur portable depuis d'autres machines, ou
- Tailscale Serve l'interface de contrôle et garde le Gateway en boucle locale uniquement (loopback-only).

Guide : [Tailscale](/en/gateway/tailscale) et [Vue d'ensemble Web](/en/web).

## Flux de commandes (ce qui s'exécute où)

Un service de gateway possède l'état + les canaux. Les nœuds sont des périphériques.

Exemple de flux (Telegram → nœud) :

- Le message Telegram arrive à la **Gateway**.
- La Gateway exécute l'**agent** et décide d'appeler ou non un outil de nœud.
- Le Gateway appelle le **nœud** via le WebSocket du Gateway (`node.*` RPC).
- Le nœud renvoie le résultat ; la Gateway répond à Telegram.

Remarques :

- **Les nœuds n'exécutent pas le service de passerelle.** Une seule passerelle doit s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Passerelles multiples](/en/gateway/multiple-gateways)).
- L'application macOS en « mode nœud » est simplement un client nœud via le WebSocket de la Gateway.

## Tunnel SSH (CLI + outils)

Créez un tunnel local vers le WS de la Gateway distante :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Une fois le tunnel établi :

- `openclaw health` et `openclaw status --deep` atteignent désormais la passerelle distante via `ws://127.0.0.1:18789`.
- `openclaw gateway {status,health,send,agent,call}` peut également cibler l'URL transférée via `--url` si nécessaire.

Note : remplacez `18789` par votre `gateway.port` configuré (ou `--port`/`OPENCLAW_GATEWAY_PORT`).
Note : lorsque vous passez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement.
Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

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

Lorsque la passerelle est en boucle locale uniquement, conservez l'URL sur `ws://127.0.0.1:18789` et ouvrez d'abord le tunnel SSH.

## Priorité des identifiants

La résolution des identifiants du Gateway suit un contrat partagé sur les chemins d'appel/probe/status et la surveillance d'approbation d'exécution Discord. Node-host utilise le même contrat de base avec une exception en mode local (il ignore intentionnellement `gateway.remote.*`) :

- Les identifiants explicites (`--token`, `--password`, ou outil `gatewayToken`) l'emportent toujours sur les chemins d'appel qui acceptent une authentification explicite.
- Sécurité de la substitution de l'URL :
  - Les remplacements d'URL du CLI (`--url`) ne réutilisent jamais les identifiants implicites de config/env.
  - Les remplacements d'URL d'environnement (`OPENCLAW_GATEWAY_URL`) peuvent utiliser uniquement les identifiants d'environnement (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valeurs par défaut du mode local :
  - jeton : `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (le repli distant s'applique uniquement lorsque l'entrée du jeton d'authentification locale n'est pas définie)
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (le repli distant s'applique uniquement lorsque l'entrée du mot de passe d'authentification locale n'est pas définie)
- Valeurs par défaut du mode distant :
  - jeton : `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Exception du mode local pour l'hôte du nœud : `gateway.remote.token` / `gateway.remote.password` sont ignorés.
- Les vérifications de jeton de sonde/d'état distantes sont strictes par défaut : elles utilisent `gateway.remote.token` uniquement (pas de repli de jeton local) lors du ciblage du mode distant.
- Les remplacements d'environnement du Gateway utilisent uniquement `OPENCLAW_GATEWAY_*`.

## Interface utilisateur de chat sur SSH

WebChat n'utilise plus de port HTTP distinct. L'interface utilisateur de chat SwiftUI se connecte directement au WebSocket Gateway.

- Transférer `18789` via SSH (voir ci-dessus), puis connecter les clients à `ws://127.0.0.1:18789`.
- Sur macOS, privilégiez le mode « Remote over SSH » de l'application, qui gère le tunnel automatiquement.

## application macOS "Remote over SSH"

L'application de la barre de menus macOS peut gérer le même configuration de bout en bout (vérifications de l'état distant, WebChat et transfert Voice Wake).

Manuel d'exécution : [accès distant macOS](/en/platforms/mac/remote).

## Règles de sécurité (accès distant/VPN)

Version courte : **gardez le Gateway en loopback uniquement** sauf si vous êtes sûr de devoir faire un bind.

- **Loopback + SSH/Tailscale Serve** est le réglage par défaut le plus sûr (aucune exposition publique).
- Le `ws://` en texte brut est limité à la boucle locale par défaut. Pour les réseaux privés de confiance,
  définissez `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` sur le processus client en tant que secours.
- Les **liaisons non boucle locale** (`lan`/`tailnet`/`custom`, ou `auto` lorsque la boucle locale n'est pas disponible) doivent utiliser des jetons/mots de passe d'authentification.
- `gateway.remote.token` / `.password` sont des sources d'identifiants client. Ils ne configurent **pas** l'authentification serveur par eux-mêmes.
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de repli distant).
- `gateway.remote.tlsFingerprint` épingle le certificat TLS distant lors de l'utilisation de `wss://`.
- **Tailscale Serve** peut authentifier le trafic de l'interface de contrôle/WebSocket via des en-têtes d'identité lorsque `gateway.auth.allowTailscale: true` ; les points de terminaison de l'API HTTP nécessitent toujours une authentification par jeton/mot de passe. Ce flux sans jeton suppose que l'hôte de la passerelle est de confiance. Réglez-le sur `false` si vous souhaitez des jetons/mots de passe partout.
- Traitez le contrôle navigateur comme un accès opérateur : uniquement tailnet + appariement délibéré des nœuds.

Pour approfondir : [Sécurité](/en/gateway/security).

### macOS : tunnel SSH persistant via LaunchAgent

Pour les clients macOS se connectant à une passerelle distante, la configuration persistante la plus simple utilise une entrée de configuration SSH `LocalForward` ainsi qu'un LaunchAgent pour garder le tunnel actif après les redémarrages et les plantages.

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

Le tunnel démarrera automatiquement à la connexion, redémarrera en cas de plantage et gardera le port transféré actif.

Remarque : si vous avez un LaunchAgent `com.openclaw.ssh-tunnel` restant d'une ancienne configuration, déchargez-le et supprimez-le.

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
