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

- **Meilleure UX :** conservez `gateway.bind: "loopback"` et utilisez **Tailscale Serve** pour l'interface de contrôle.
- **Repli :** conservez loopback + tunnel SSH à partir de n'importe quelle machine nécessitant un accès.
- **Exemples :** [exe.dev](/fr/install/exe-dev) (VM facile) ou [Hetzner](/fr/install/hetzner) (VPS de production).

C'est idéal lorsque votre ordinateur portable se met souvent en veille mais que vous souhaitez que l'agent soit toujours actif.

### 2) Le bureau domestique exécute le Gateway, l'ordinateur portable est une télécommande

L'ordinateur portable n'exécute **pas** l'agent. Il se connecte à distance :

- Utilisez le mode **Remote over SSH** de l'application macOS (Paramètres → Général → « OpenClaw runs »).
- L'application ouvre et gère le tunnel, donc WebChat + les contrôles de santé « fonctionnent tout seuls ».

Runbook : [Accès distant macOS](/fr/platforms/mac/remote).

### 3) L'ordinateur portable exécute le Gateway, accès distant à partir d'autres machines

Gardez le Gateway en local mais exposez-le en toute sécurité :

- Tunnel SSH vers l'ordinateur portable depuis d'autres machines, ou
- Tailscale Serve l'interface de contrôle et garde le Gateway en boucle locale uniquement (loopback-only).

Guide : [Tailscale](/fr/gateway/tailscale) et [Vue d'ensemble Web](/fr/web).

## Flux de commandes (ce qui s'exécute où)

Un service de gateway possède l'état + les canaux. Les nœuds sont des périphériques.

Exemple de flux (Telegram → nœud) :

- Le message Telegram arrive à la **Gateway**.
- La Gateway exécute l'**agent** et décide d'appeler ou non un outil de nœud.
- La Gateway appelle le **nœud** via le WebSocket de la Gateway (`node.*` RPC).
- Le nœud renvoie le résultat ; la Gateway répond à Telegram.

Remarques :

- **Les nœuds n'exécutent pas le service de gateway.** Une seule gateway doit s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)).
- L'application macOS en « mode nœud » est simplement un client nœud via le WebSocket de la Gateway.

## Tunnel SSH (CLI + outils)

Créez un tunnel local vers le WS de la Gateway distante :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Une fois le tunnel établi :

- `openclaw health` et `openclaw status --deep` atteignent désormais la gateway distante via `ws://127.0.0.1:18789`.
- `openclaw gateway {status,health,send,agent,call}` peut également cibler l'URL transférée via `--url` si nécessaire.

Remarque : remplacez `18789` par votre `gateway.port` configuré (ou `--port`/`OPENCLAW_GATEWAY_PORT`).
Remarque : lorsque vous passez `--url`, la CLI n'utilise pas les identifiants de configuration ou d'environnement par défaut.
Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.

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

Lorsque la gateway est en boucle locale uniquement (loopback-only), gardez l'URL sur `ws://127.0.0.1:18789` et ouvrez d'abord le tunnel SSH.

## Priorité des identifiants

La résolution des informations d'identification du Gateway suit un contrat partagé sur les chemins d'appel/de sonde/d'état et la surveillance d'approbation d'exécution Discord. Node-host utilise le même contrat de base avec une exception de mode local (il ignore intentionnellement `gateway.remote.*`) :

- Les informations d'identification explicites (`--token`, `--password` ou outil `gatewayToken`) l'emportent toujours sur les chemins d'appel qui acceptent une auth explicite.
- Sécurité de la substitution de l'URL :
  - Les substitutions d'URL de la CLI (`--url`) ne réutilisent jamais les informations d'identification implicites de config/env.
  - Les substitutions d'URL Env (`OPENCLAW_GATEWAY_URL`) peuvent utiliser uniquement les informations d'identification env (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valeurs par défaut du mode local :
  - token : `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (le repli distant s'applique uniquement lorsque l'entrée du jeton d'auth locale n'est pas définie)
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (le repli distant s'applique uniquement lorsque l'entrée du mot de passe d'auth locale n'est pas définie)
- Valeurs par défaut du mode distant :
  - token : `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - mot de passe : `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Exception du mode local Node-host : `gateway.remote.token` / `gateway.remote.password` sont ignorés.
- Les vérifications de jeton de sonde/d'état distantes sont strictes par défaut : elles utilisent `gateway.remote.token` uniquement (pas de repli de jeton local) lors du ciblage du mode distant.
- Les variables d'env `CLAWDBOT_GATEWAY_*` héritées sont uniquement utilisées par les chemins d'appel de compatibilité ; la résolution sonde/état/auth utilise `OPENCLAW_GATEWAY_*` uniquement.

## Interface utilisateur de chat sur SSH

WebChat n'utilise plus de port HTTP distinct. L'interface utilisateur de chat SwiftUI se connecte directement au WebSocket Gateway.

- Transférez `18789` via SSH (voir ci-dessus), puis connectez les clients à `ws://127.0.0.1:18789`.
- Sur macOS, privilégiez le mode « Remote over SSH » de l'application, qui gère le tunnel automatiquement.

## Application macOS « Remote over SSH »

L'application de la barre de menus macOS peut gérer le même configuration de bout en bout (vérifications de l'état distant, WebChat et transfert Voice Wake).

Runbook : [accès distant macOS](/fr/platforms/mac/remote).

## Règles de sécurité (accès distant/VPN)

Version courte : **gardez le Gateway en loopback uniquement** sauf si vous êtes sûr de devoir faire un bind.

- **Loopback + SSH/Tailscale Serve** est le réglage par défaut le plus sûr (aucune exposition publique).
- Le texte brut `ws://` est en loopback uniquement par défaut. Pour les réseaux privés de confiance,
  définissez `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` sur le processus client en guise de bris de glace.
- Les **binds non-loopback** (`lan`/`tailnet`/`custom`, ou `auto` lorsque le loopback n'est pas disponible) doivent utiliser des jetons d'authentification/mots de passe.
- `gateway.remote.token` / `.password` sont des sources d'identifiants clients. Ils ne configurent **pas** l'authentification serveur par eux-mêmes.
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue en mode fermé (aucun masquage de repli distant).
- `gateway.remote.tlsFingerprint` épingle le certificat TLS distant lors de l'utilisation de `wss://`.
- **Tailscale Serve** peut authentifier le trafic Control UI/WebSocket via des en-têtes d'identité
  lorsque `gateway.auth.allowTailscale: true` ; les points de terminaison HTTP API nécessitent toujours une authentification par jeton/mot de passe. Ce flux sans jeton suppose que l'hôte de la passerelle est
  fiable. Définissez-le sur `false` si vous voulez des jetons/mots de passe partout.
- Traitez le contrôle navigateur comme un accès opérateur : uniquement tailnet + appariement délibéré des nœuds.

Approfondissement : [Sécurité](/fr/gateway/security).

import fr from "/components/footer/fr.mdx";

<fr />
