---
summary: "Flux de l'application macOS pour contrôler une passerelle OpenClaw distante"
read_when:
  - Setting up or debugging remote mac control
title: "Contrôle à distance"
---

Ce flux permet à l'application macOS d'agir comme un télécommande complète pour une passerelle OpenClaw s'exécutant sur un autre hôte (bureau/serveur). L'application peut se connecter directement aux URL de passerelle LAN/Tailnet de confiance ou gérer un tunnel SSH lorsque la passerelle distante est en boucle locale (loopback-only). Les contrôles de santé, le transfert Voice Wake et Web Chat réutilisent la même configuration distante issue de _Paramètres → Général_.

## Modes

- **Local (ce Mac)** : Tout s'exécute sur l'ordinateur portable. Aucun SSH impliqué.
- **À distance via SSH (par défaut)** : Les commandes OpenClaw sont exécutées sur l'hôte distant. L'application Mac ouvre une connexion SSH avec `-o BatchMode` plus votre identité/clé choisie et un transfert de port local.
- **À distance direct (ws/wss)** : Pas de tunnel SSH. L'application Mac se connecte directement à l'URL de la passerelle (par exemple, via LAN, Tailscale, Tailscale Serve, ou un proxy inverse HTTPS public).

## Transports distants

Le mode distant prend en charge deux transports :

- **Tunnel SSH** (par défaut) : Utilise `ssh -N -L ...` pour transférer le port de la passerelle vers localhost. La passerelle verra l'IP du nœud comme `127.0.0.1` car le tunnel est en boucle locale.
- **Direct (ws/wss)** : Se connecte directement à l'URL de la passerelle. La passerelle voit l'IP réelle du client.

En mode tunnel SSH, les noms d'hôte LAN/tailnet découverts sont enregistrés sous
`gateway.remote.sshTarget`. L'application conserve `gateway.remote.url` sur le point de terminaison
du tunnel local, par exemple `ws://127.0.0.1:18789`, afin que le CLI, Web Chat et
le service de nœud hôte local utilisent tous le même transport de boucle locale sécurisé.
Si le port du tunnel local diffère du port de la passerelle distante, définissez
`gateway.remote.remotePort` sur le port de l'hôte distant.

L'automatisation du navigateur en mode distant est gérée par l'hôte de nœud CLI, et non par
le nœud de l'application native macOS. L'application démarre le service d'hôte de nœud installé lorsque
cela est possible ; si vous avez besoin du contrôle du navigateur depuis ce Mac, installez/démarrez-le avec
`openclaw node install ...` et `openclaw node start` (ou exécutez
`openclaw node run ...` au premier plan), puis ciblez ce nœud compatible navigateur.

## Prérequis sur l'hôte distant

1. Installez Node + pnpm et compilez/installez le OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`).
2. Assurez-vous que `openclaw` est dans le PATH pour les shells non interactifs (créez un lien symbolique vers `/usr/local/bin` ou `/opt/homebrew/bin` si nécessaire).
3. Pour le transport SSH uniquement : ouvrez SSH avec une authentification par clé. Nous recommandons les IP **Tailscale** pour une accessibilité stable hors réseau local.

## Configuration de l'application macOS

Pour préconfigurer l'application sans passer par le flux de bienvenue :

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway.local \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

Pour une passerelle déjà accessible sur un réseau local de confiance ou un Tailnet, ignorez entièrement SSH :

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

Cela écrit la configuration distante, marque l'onboarding comme terminé et permet à l'application de posséder
le transport sélectionné lors de son démarrage.

1. Ouvrez _Settings → General_.
2. Sous **OpenClaw runs**, choisissez **Remote** et définissez :
   - **Transport** : **SSH tunnel** ou **Direct (ws/wss)**.
   - **SSH target** : `user@host` (optionnel `:port`).
     - Si la passerelle est sur le même réseau local et annonce Bonjour, sélectionnez-la dans la liste découverte pour remplir automatiquement ce champ.
   - **Gateway URL** (Direct uniquement) : `wss://gateway.example.ts.net` (ou `ws://...` pour local/réseau local).
   - **Identity file** (avancé) : chemin vers votre clé.
   - **Project root** (avancé) : chemin d'extraction distant utilisé pour les commandes.
   - **CLI path** (avancé) : chemin optionnel vers un point d'entrée/binaire `openclaw` exécutable (rempli automatiquement lorsqu'il est annoncé).
3. Cliquez sur **Test remote**. Le succès indique que le `openclaw status --json` distant s'exécute correctement. Les échecs signifient généralement des problèmes de PATH/CLI ; le code de sortie 127 signifie que le CLI n'a pas été trouvé à distance.
4. Les contrôles de santé et le Web Chat s'exécuteront désormais automatiquement via le transport sélectionné.

## Web Chat

- **SSH tunnel** : Web Chat se connecte à la passerelle via le port de contrôle WebSocket transféré (par défaut 18789).
- **Direct (ws/wss)** : Web Chat se connecte directement à l'URL de la passerelle configurée.
- Il n'y a plus de serveur HTTP WebChat séparé.

## Permissions

- L'hôte distant a besoin des mêmes approbations TCC qu'en local (Automatisation, Accessibilité, Enregistrement d'écran, Microphone, Reconnaissance vocale, Notifications). Exécutez l'onboarding sur cette machine pour les accorder une fois pour toutes.
- Les nœuds annoncent leur état d'autorisation via `node.list` / `node.describe` afin que les agents sachent ce qui est disponible.

## Notes de sécurité

- Privilégiez les liaisons loopback sur l'hôte distant et connectez-vous via SSH, Tailscale Serve, ou une URL directe de confiance sur un Tailnet/LAN.
- Le tunneling SSH utilise une vérification stricte de la clé de l'hôte ; faites confiance à la clé de l'hôte au préalable pour qu'elle existe dans `~/.ssh/known_hosts`.
- Si vous liez le Gateway à une interface non-loopback, exigez une authentification Gateway valide : jeton, mot de passe, ou un proxy inverse identitaire avec `gateway.auth.mode: "trusted-proxy"`.
- Voir [Sécurité](/fr/gateway/security) et [Tailscale](/fr/gateway/tailscale).

## Flux de connexion WhatsApp (à distance)

- Exécutez `openclaw channels login --verbose` **sur l'hôte distant**. Scannez le QR avec WhatsApp sur votre téléphone.
- Relancez la connexion sur cet hôte si l'authentification expire. Le contrôle de santé signalera les problèmes de lien.

## Dépannage

- **exit 127 / not found** : `openclaw` n'est pas dans le PATH pour les shells non-login. Ajoutez-le à `/etc/paths`, votre fichier rc de shell, ou faites un lien symbolique dans `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed** : vérifiez l'accessibilité SSH, le PATH, et que Baileys est connecté (`openclaw status --json`).
- **Web Chat bloqué** : confirmez que la passerelle tourne sur l'hôte distant et que le port transmis correspond au port WS de la passerelle ; l'interface nécessite une connexion WS saine.
- **L'IP du nœud affiche 127.0.0.1** : c'est attendu avec le tunnel SSH. Basculez le **Transport** sur **Direct (ws/wss)** si vous voulez que la passerelle voie la véritable IP du client.
- **Le tableau de bord fonctionne mais les fonctionnalités Mac sont hors ligne** : cela signifie que la connexion opérateur/contrôle de l'application est saine, mais que la connexion du nœud compagnon n'est pas connectée ou qu'il lui manque sa surface de commande. Ouvrez la section de l'appareil dans la barre de menu et vérifiez si le Mac est `paired · disconnected`. Pour les points de terminaison `wss://*.ts.net` Tailscale Serve, l'application détecte les épingles de feuilles TLS héritées périmées après la rotation des certificats, efface l'épingles périmée lorsque macOS fait confiance au nouveau certificat, et réessaie automatiquement. Si le certificat n'est pas approuvé par le système ou si l'hôte n'est pas un nom Tailscale Serve, définissez `gateway.remote.tlsFingerprint` sur l'empreinte du certificat attendue, examinez le certificat, ou passez en **Remote over SSH**.
- **Voice Wake** : les phrases de déclenchement sont transférées automatiquement en mode distant ; aucun transmetteur séparé n'est nécessaire.

## Sons de notification

Choisissez des sons pour chaque notification à partir de scripts avec `openclaw` et `node.invoke`, par exemple :

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Il n'y a plus de bouton global "son par défaut" dans l'application ; les appelants choisissent un son (ou aucun) pour chaque demande.

## Connexes

- [Application macOS](/fr/platforms/macos)
- [Accès à distance](/fr/gateway/remote)
