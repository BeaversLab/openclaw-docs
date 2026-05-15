---
summary: "Flux de l'application macOS pour contrôler une passerelle OpenClaw distante via SSH"
read_when:
  - Setting up or debugging remote mac control
title: "Contrôle à distance"
---

Ce flux permet à l'application macOS d'agir comme une télécommande complète pour une passerelle OpenClaw s'exécutant sur un autre hôte (bureau/serveur). C'est la fonctionnalité **Remote over SSH** (exécution distante) de l'application. Toutes les fonctionnalités — les vérifications de santé, le transfert Voice Wake et Web Chat — réutilisent la même configuration SSH à distance depuis _Settings → General_.

## Modes

- **Local (ce Mac)** : Tout s'exécute sur l'ordinateur portable. Aucun SSH impliqué.
- **Remote over SSH (par défaut)** : Les commandes OpenClaw sont exécutées sur l'hôte distant. L'application Mac ouvre une connexion SSH avec OpenClaw`-o BatchMode` ainsi que votre identité/clé choisie et un transfert de port local.
- **Remote direct (ws/wss)** : Pas de tunnel SSH. L'application Mac se connecte directement à l'URL de la passerelle (par exemple, via Tailscale Serve ou un proxy inverse HTTPS public).

## Transports distants

Le mode distant prend en charge deux transports :

- **Tunnel SSH** (par défaut) : Utilise `ssh -N -L ...` pour transférer le port de la passerelle vers localhost. La passerelle verra l'IP du nœud comme `127.0.0.1` car le tunnel est une boucle locale.
- **Direct (ws/wss)** : Se connecte directement à l'URL de la passerelle. La passerelle voit l'IP réelle du client.

En mode tunnel SSH, les noms d'hôte LAN/tailnet découverts sont enregistrés en tant que
`gateway.remote.sshTarget`. L'application maintient `gateway.remote.url` sur le point de terminaison du
tunnel local, par exemple `ws://127.0.0.1:18789`CLI, afin que le CLI, Web Chat et
le service local d'hôte de nœud utilisent tous le même transport de boucle locale sécurisé.

L'automatisation du navigateur en mode distant est gérée par l'hôte de nœud CLI, et non par le
nœud de l'application macOS native. L'application démarre le service d'hôte de nœud installé lorsque
cela est possible ; si vous avez besoin du contrôle du navigateur à partir de ce Mac, installez/démarrez-le avec
CLImacOS`openclaw node install ...` et `openclaw node start` (ou exécutez
`openclaw node run ...` au premier plan), puis ciblez ce nœud capable de naviguer.

## Prérequis sur l'hôte distant

1. Installez Node + pnpm et compilez/installez le CLI OpenClaw (OpenClawCLI`pnpm install && pnpm build && pnpm link --global`).
2. Assurez-vous que `openclaw` est dans le PATH pour les shells non interactifs (créez un lien symbolique vers `/usr/local/bin` ou `/opt/homebrew/bin` si nécessaire).
3. SSH ouvert avec authentification par clé. Nous recommandons les adresses IP **Tailscale** pour une accessibilité stable hors réseau local.

## Configuration de l'application macOS

1. Ouvrez _Paramètres → Général_.
2. Sous **Exécution d'OpenClaw**, choisissez **À distance via SSH** et définissez :
   - **Transport** : **Tunnel SSH** ou **Direct (ws/wss)**.
   - **Cible SSH** : `user@host` (optionnel `:port`).
     - Si la passerelle est sur le même réseau local et annonce Bonjour, sélectionnez-la dans la liste découverte pour remplir automatiquement ce champ.
   - **URL de la passerelle** (Direct uniquement) : Gateway`wss://gateway.example.ts.net` (ou `ws://...` pour local/réseau local).
   - **Fichier d'identité** (avancé) : chemin vers votre clé.
   - **Racine du projet** (avancé) : chemin de checkout distant utilisé pour les commandes.
   - **Chemin CLI** (avancé) : chemin optionnel vers un point d'entrée/binaire CLI`openclaw` exécutable (rempli automatiquement si annoncé).
3. Cliquez sur **Tester la connexion à distance**. Le succès indique que le `openclaw status --json`CLICLI distant s'exécute correctement. Les échecs signifient généralement des problèmes de PATH/CLI ; le code de sortie 127 signifie que la CLI n'a pas été trouvée à distance.
4. Les contrôles de santé et Web Chat s'exécuteront désormais automatiquement via ce tunnel SSH.

## Web Chat

- **Tunnel SSH** : Web Chat se connecte à la passerelle via le port de contrôle WebSocket transféré (par défaut 18789).
- **Direct (ws/wss)** : Web Chat se connecte directement à l'URL de la passerelle configurée.
- Il n'y a plus de serveur HTTP WebChat séparé.

## Autorisations

- L'hôte distant a besoin des mêmes approbations TCC qu'en local (Automatisation, Accessibilité, Enregistrement d'écran, Microphone, Reconnaissance vocale, Notifications). Exécutez l'onboarding sur cette machine pour les accorder une seule fois.
- Les nœuds annoncent leur état d'autorisation via `node.list` / `node.describe` afin que les agents sachent ce qui est disponible.

## Notes de sécurité

- Préférez les liaisons loopback sur l'hôte distant et connectez-vous via SSH ou Tailscale.
- Le tunneling SSH utilise une vérification stricte de la clé de l'hôte ; faites confiance à la clé de l'hôte au préalable pour qu'elle existe dans `~/.ssh/known_hosts`.
- Si vous liez le Gateway à une interface non bouclée, exigez une authentification Gateway valide : jeton, mot de passe ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`.
- Voir [Sécurité](/fr/gateway/security) et [Tailscale](/fr/gateway/tailscale).

## Flux de connexion WhatsApp (à distance)

- Exécutez `openclaw channels login --verbose` **sur l'hôte distant**. Scannez le QR code avec WhatsApp sur votre téléphone.
- Relancez la connexion sur cet hôte si l'authentification expire. Le contrôle de santé signalera les problèmes de lien.

## Dépannage

- **exit 127 / not found** : `openclaw` n'est pas dans le PATH pour les shells non interactifs. Ajoutez-le à `/etc/paths`, votre rc de shell, ou créez un lien symbolique vers `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed** : vérifiez l'accessibilité SSH, le PATH, et que Baileys est connecté (`openclaw status --json`).
- **Web Chat stuck** : confirmez que la passerelle fonctionne sur l'hôte distant et que le port transféré correspond au port WS de la passerelle ; l'interface utilisateur nécessite une connexion WS saine.
- **Node IP shows 127.0.0.1** : attendu avec le tunnel SSH. Passez **Transport** à **Direct (ws/wss)** si vous souhaitez que la passerelle voie la véritable adresse IP du client.
- **Dashboard works but Mac capabilities are offline** : cela signifie que la connexion opérateur/contrôle de l'application est saine, mais que la connexion du nœud compagnon n'est pas connectée ou manque de surface de commande. Ouvrez la section des appareils de la barre de menu et vérifiez si le Mac est `paired · disconnected`. Pour les points de terminaison Tailscale Serve `wss://*.ts.net`, l'application détecte les épingles de feuilles TLS héritées obsolètes après la rotation des certificats, efface l'épingle obsolète lorsque macOS fait confiance au nouveau certificat, et réessaie automatiquement. Si le certificat n'est pas approuvé par le système ou si l'hôte n'est pas un nom Tailscale Serve, examinez le certificat ou passez à **Remote over SSH**.
- **Réveil vocal** : les expressions de déclenchement sont transmises automatiquement en mode distant ; aucun transmetteur distinct n'est nécessaire.

## Sons de notification

Choisissez des sons par notification depuis des scripts avec `openclaw` et `node.invoke`, par exemple :

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Il n'y a plus de bouton global "son par défaut" dans l'application ; les appelants choisissent un son (ou aucun) pour chaque demande.

## Connexes

- [application macOS](/fr/platforms/macos)
- [Accès à distance](/fr/gateway/remote)
