---
summary: "Flux de l'application macOS pour contrôler une passerelle OpenClaw distante via SSH"
read_when:
  - Setting up or debugging remote mac control
title: "Contrôle à distance"
---

# OpenClaw distant (macOS ⇄ hôte distant)

Ce flux permet à l'application macOS d'agir comme une télécommande complète pour une passerelle OpenClaw s'exécutant sur un autre hôte (bureau/serveur). C'est la fonctionnalité **Remote over SSH** (exécution à distance) de l'application. Toutes les fonctionnalités—les vérifications de santé, le transfert Voice Wake et Web Chat—réutilisent la même configuration SSH à distance depuis _Paramètres → Général_.

## Modes

- **Local (ce Mac)** : Tout s'exécute sur l'ordinateur portable. Aucun SSH n'est impliqué.
- **Remote over SSH (par défaut)** : Les commandes OpenClaw sont exécutées sur l'hôte distant. L'application mac ouvre une connexion SSH avec `-o BatchMode` plus votre identité/clé choisie et un transfert de port local.
- **Remote direct (ws/wss)** : Pas de tunnel SSH. L'application mac se connecte directement à l'URL de la passerelle (par exemple, via Tailscale Serve ou un proxy inverse HTTPS public).

## Transports distants

Le mode distant prend en charge deux transports :

- **Tunnel SSH** (par défaut) : Utilise `ssh -N -L ...` pour transférer le port de la passerelle vers localhost. La passerelle verra l'IP du nœud comme `127.0.0.1` car le tunnel est une boucle locale.
- **Direct (ws/wss)** : Se connecte directement à l'URL de la passerelle. La passerelle voit la véritable adresse IP du client.

En mode tunnel SSH, les noms d'hôte LAN/tailnet découverts sont enregistrés en tant que
`gateway.remote.sshTarget`. L'application conserve `gateway.remote.url` sur le point de terminaison
du tunnel local, par exemple `ws://127.0.0.1:18789`, afin que le CLI, le Web Chat et
le service de nœud hôte local utilisent tous le même transport de bouclage sécurisé.

L'automatisation du navigateur en mode à distance est gérée par l'hôte de nœud CLI, et non par le
nœud de l'application native macOS. L'application démarre le service d'hôte de nœud installé lorsque
cela est possible ; si vous avez besoin du contrôle du navigateur à partir de ce Mac, installez/démarrez-le avec
`openclaw node install ...` et `openclaw node start` (ou exécutez
`openclaw node run ...` au premier plan), puis ciblez ce nœud capable de naviguer.

## Prérequis sur l'hôte distant

1. Installez Node + pnpm et compilez/installez le OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`).
2. Assurez-vous que `openclaw` est dans le PATH pour les shells non interactifs (créez un lien symbolique vers `/usr/local/bin` ou `/opt/homebrew/bin` si nécessaire).
3. Ouvrez SSH avec une authentification par clé. Nous recommandons les IP **Tailscale** pour une accessibilité stable hors réseau local.

## Configuration de l'application macOS

1. Ouvrez _Settings → General_.
2. Sous **Exécution OpenClaw**, choisissez **Remote over SSH** et définissez :
   - **Transport** : **SSH tunnel** ou **Direct (ws/wss)**.
   - **Cible SSH** : `user@host` (`:port` facultatif).
     - Si la passerelle se trouve sur le même réseau local et annonce Bonjour, sélectionnez-la dans la liste découverte pour remplir automatiquement ce champ.
   - **URL de la Gateway** (Direct uniquement) : `wss://gateway.example.ts.net` (ou `ws://...` pour local/réseau local).
   - **Fichier d'identité** (avancé) : chemin vers votre clé.
   - **Racine du projet** (avancé) : chemin d'extraction distant utilisé pour les commandes.
   - **Chemin CLI** (avancé) : chemin facultatif vers un point d'entrée/binaire `openclaw` exécutable (rempli automatiquement lorsqu'il est annoncé).
3. Cliquez sur **Tester la connexion à distance**. Le succès indique que le `openclaw status --json` distant s'exécute correctement. Les échecs signifient généralement des problèmes de PATH/CLI ; le code de sortie 127 signifie que le CLI n'a pas été trouvé à distance.
4. Les contrôles de santé et le Web Chat s'exécuteront désormais automatiquement via ce tunnel SSH.

## Web Chat

- **Tunnel SSH** : Le Web Chat se connecte à la passerelle via le port de contrôle WebSocket transféré (par défaut 18789).
- **Direct (ws/wss)** : Web Chat se connecte directement à l'URL de la passerelle configurée.
- Il n'y a plus de serveur HTTP WebChat séparé.

## Autorisations

- L'hôte distant a besoin des mêmes approbations TCC qu'en local (Automatisation, Accessibilité, Enregistrement d'écran, Microphone, Reconnaissance vocale, Notifications). Exécutez l'onboarding sur cette machine pour les accorder une fois.
- Les nœuds annoncent leur état d'autorisation via `node.list` / `node.describe` afin que les agents sachent ce qui est disponible.

## Notes de sécurité

- Privilégiez les liaisons de boucle locale (loopback) sur l'hôte distant et connectez-vous via SSH ou Tailscale.
- Le tunneling SSH utilise une vérification stricte de la clé de l'hôte ; faites confiance à la clé de l'hôte au préalable pour qu'elle existe dans `~/.ssh/known_hosts`.
- Si vous liez le Gateway à une interface non boucle locale, exigez une authentification Gateway valide : jeton, mot de passe, ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`.
- Voir [Sécurité](/fr/gateway/security) et [Tailscale](/fr/gateway/tailscale).

## Flux de connexion WhatsApp (à distance)

- Exécutez `openclaw channels login --verbose` **sur l'hôte distant**. Scannez le QR code avec WhatsApp sur votre téléphone.
- Relancez la connexion sur cet hôte si l'authentification expire. Le contrôle de santé signalera les problèmes de lien.

## Dépannage

- **exit 127 / not found** : `openclaw` n'est pas dans le PATH pour les shells non-login. Ajoutez-le à `/etc/paths`, à votre rc de shell, ou créez un lien symbolique dans `/usr/local/bin`/`/opt/homebrew/bin`.
- **Échec de la sonde de santé** : vérifiez l'accessibilité SSH, le PATH, et que Baileys est connecté (`openclaw status --json`).
- **Web Chat bloqué** : confirmez que la passerelle fonctionne sur l'hôte distant et que le port transféré correspond au port WS de la passerelle ; l'interface utilisateur nécessite une connexion WS saine.
- **L'adresse IP du nœud affiche 127.0.0.1** : c'est normal avec le tunnel SSH. Basculez le **Transport** sur **Direct (ws/wss)** si vous souhaitez que la passerelle voie la véritable adresse IP du client.
- **Réveil vocal** : les expressions de déclenchement sont transmises automatiquement en mode distant ; aucun transmetteur distinct n'est nécessaire.

## Sons de notification

Choisissez des sons pour chaque notification à partir de scripts avec `openclaw` et `node.invoke`, par exemple :

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Il n'y a plus d'interrupteur global de « son par défaut » dans l'application ; les appelants choisissent un son (ou aucun) pour chaque requête.

## Connexes

- [application macOS](/fr/platforms/macos)
- [Accès à distance](/fr/gateway/remote)
