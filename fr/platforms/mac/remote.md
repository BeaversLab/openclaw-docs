---
summary: "flux de l'application macOS pour contrôler une passerelle OpenClaw à distance via SSH"
read_when:
  - Configuration ou débogage du contrôle Mac à distance
title: "Contrôle à distance"
---

# OpenClaw distant (macOS ⇄ hôte distant)

Ce flux permet à l'application macOS d'agir comme un contrôle à distance complet pour une passerelle OpenClaw s'exécutant sur un autre hôte (bureau/serveur). C'est la fonctionnalité **Remote over SSH** (exécution à distance) de l'application. Toutes les fonctionnalités — les vérifications de santé, le transfert Voice Wake et le Web Chat — réutilisent la même configuration SSH à distance depuis _Settings → General_.

## Modes

- **Local (ce Mac)** : Tout s'exécute sur l'ordinateur portable. Aucun SSH n'est impliqué.
- **Remote over SSH (par défaut)** : les commandes OpenClaw sont exécutées sur l'hôte distant. L'application Mac ouvre une connexion SSH avec `-o BatchMode` ainsi que votre identité/clé choisie et un transfert de port local.
- **Remote direct (ws/wss)** : Pas de tunnel SSH. L'application mac se connecte directement à l'URL de la passerelle (par exemple, via Tailscale Serve ou un proxy inverse HTTPS public).

## Transports distants

Le mode distant prend en charge deux transports :

- **SSH tunnel** (par défaut) : utilise `ssh -N -L ...` pour transférer le port de la passerelle vers localhost. La passerelle verra l'IP du nœud comme `127.0.0.1` car le tunnel est une boucle locale.
- **Direct (ws/wss)** : Se connecte directement à l'URL de la passerelle. La passerelle voit la véritable adresse IP du client.

## Prérequis sur l'hôte distant

1. Installez Node + pnpm et compilez/installez la OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`).
2. Assurez-vous que `openclaw` est dans le PATH pour les shells non interactifs (créez un lien symbolique dans `/usr/local/bin` ou `/opt/homebrew/bin` si nécessaire).
3. Ouvrez SSH avec authentification par clé. Nous recommandons les IP **Tailscale** pour une accessibilité stable hors LAN.

## Configuration de l'application macOS

1. Ouvrez _Settings → General_.
2. Sous **OpenClaw runs**, choisissez **Remote over SSH** et définissez :
   - **Transport** : **SSH tunnel** ou **Direct (ws/wss)**.
   - **Cible SSH** : `user@host` (`:port` en option).
     - Si la passerelle est sur le même réseau local et annonce le Bonjour, sélectionnez-la dans la liste découverte pour remplir automatiquement ce champ.
   - **URL de la Gateway** (Direct uniquement) : `wss://gateway.example.ts.net` (ou `ws://...` pour local/LAN).
   - **Fichier d'identité** (avancé) : chemin vers votre clé.
   - **Racine du projet** (avancé) : chemin de extraction distant utilisé pour les commandes.
   - **Chemin de la CLI** (avancé) : chemin optionnel vers un point d'entrée/binaire `openclaw` exécutable (rempli automatiquement lorsqu'il est annoncé).
3. Cliquez sur **Test remote**. Le succès indique que le `openclaw status --json` distant fonctionne correctement. Les échecs signifient généralement des problèmes de PATH/CLI ; le code de sortie 127 signifie que la CLI n'est pas trouvée à distance.
4. Les contrôles de santé et Web Chat s'exécuteront désormais automatiquement via ce tunnel SSH.

## Web Chat

- **Tunnel SSH** : Web Chat se connecte à la passerelle via le port de contrôle WebSocket transféré (par défaut 18789).
- **Direct (ws/wss)** : Web Chat se connecte directement à l'URL de la passerelle configurée.
- Il n'y a plus de serveur HTTP WebChat séparé.

## Autorisations

- L'hôte distant a besoin des mêmes approbations TCC que localement (Automatisation, Accessibilité, Enregistrement d'écran, Microphone, Reconnaissance vocale, Notifications). Exécutez l'onboarding sur cette machine pour les accorder une fois.
- Les nœuds annoncent leur état d'autorisation via `node.list` / `node.describe` afin que les agents sachent ce qui est disponible.

## Notes de sécurité

- Privilégiez les liaisons loopback sur l'hôte distant et connectez-vous via SSH ou Tailscale.
- Le tunneling SSH utilise une vérification stricte de la clé d'hôte ; faites confiance à la clé d'hôte au préalable pour qu'elle existe dans `~/.ssh/known_hosts`.
- Si vous liez la Gateway à une interface non loopback, exigez une authentification par jeton/mot de passe.
- Voir [Sécurité](/fr/gateway/security) et [Tailscale](/fr/gateway/tailscale).

## Flux de connexion WhatsApp (distant)

- Exécutez `openclaw channels login --verbose` **sur l'hôte distant**. Scannez le QR avec WhatsApp sur votre téléphone.
- Relancez la connexion sur cet hôte si l'authentification expire. Le contrôle de santé signalera les problèmes de liaison.

## Dépannage

- **exit 127 / not found** : `openclaw` n'est pas dans le PATH pour les shells non-login. Ajoutez-le à `/etc/paths`, votre rc de shell, ou créez un lien symbolique vers `/usr/local/bin`/`/opt/homebrew/bin`.
- **Échec de la sonde de santé** : vérifiez l'accessibilité SSH, le PATH, et que Baileys est connecté (`openclaw status --json`).
- **Web Chat stuck** : confirmez que la passerelle fonctionne sur l'hôte distant et que le port transféré correspond au port WS de la passerelle ; l'interface nécessite une connexion WS saine.
- **Node IP shows 127.0.0.1** : comportement attendu avec le tunnel SSH. Basculez le **Transport** sur **Direct (ws/wss)** si vous souhaitez que la passerelle voie la véritable adresse IP du client.
- **Voice Wake** : les phrases de déclenchement sont transférées automatiquement en mode distant ; aucun transmetteur séparé n'est nécessaire.

## Sons de notification

Choisissez des sons par notification à partir de scripts avec `openclaw` et `node.invoke`, par exemple :

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Il n'y a plus de bouton global « son par défaut » dans l'application ; les appelants choisissent un son (ou aucun) pour chaque requête.

import en from "/components/footer/en.mdx";

<en />
