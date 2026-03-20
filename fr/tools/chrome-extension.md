---
summary: "Extension Chrome : laisser OpenClaw piloter votre onglet Chrome existant"
read_when:
  - Vous voulez que l'agent pilote un onglet Chrome existant (bouton de la barre d'outils)
  - Vous avez besoin d'un Gateway distant + une automatisation locale du navigateur via Tailscale
  - Vous souhaitez comprendre les implications de sécurité de la prise de contrôle du navigateur
title: "Extension Chrome"
---

# Extension Chrome (relais navigateur)

L'extension Chrome OpenClaw permet à l'agent de contrôler vos **onglets Chrome existants** (votre fenêtre Chrome normale) au lieu de lancer un profil Chrome géré séparément par openclaw.

L'attachement/détachement se fait via un **bouton unique dans la barre d'outils Chrome**.

Si vous préférez le flux d'attachement MCP DevTools officiel de Chrome au lieu du relais de l'extension OpenClaw, utilisez plutôt un profil de navigateur `existing-session`. Voir
[Browser](/fr/tools/browser#chrome-existing-session-via-mcp). Pour la documentation de configuration propre à Chrome, voir [Chrome for Developers: Use Chrome DevTools MCP with your
browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
et le [README Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp).

## Ce que c'est (concept)

Il y a trois parties :

- **Service de contrôle du navigateur** (Gateway ou nœud) : l'API que l'agent/tool appelle (via le Gateway)
- **Serveur de relai local** (CDP bouclage) : fait le pont entre le serveur de contrôle et l'extension (`http://127.0.0.1:18792` par défaut)
- **Extension MV3 Chrome** : s'attache à l'onglet actif en utilisant `chrome.debugger` et canalise les messages CDP vers le relai

OpenClaw contrôle ensuite l'onglet attaché via la surface normale de l'`browser` tool (en sélectionnant le bon profil).

## Installer / charger (décompressée)

1. Installez l'extension vers un chemin local stable :

```bash
openclaw browser extension install
```

2. Imprimez le chemin du répertoire de l'extension installée :

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- Activez « Mode développeur »
- « Charger l'extraction » → sélectionnez le répertoire imprimé ci-dessus

4. Épinglez l'extension.

## Mises à jour (pas d'étape de build)

L'extension est livrée dans la version OpenClaw (paquet OpenClaw) sous forme de fichiers statiques. Il n'y a pas d'étape de « build » séparée.

Après avoir mis à niveau OpenClaw :

- Réexécutez `openclaw browser extension install` pour rafraîchir les fichiers installés sous votre répertoire d'état OpenClaw.
- Chrome → `chrome://extensions` → cliquez sur « Recharger » sur l'extension.

## Utilisez-la (définir le jeton gateway une fois)

Pour utiliser le relai de l'extension, créez un profil de navigateur pour celui-ci :

Avant la première attache, ouvrez les options de l'extension et définissez :

- `Port` (par défaut `18792`)
- `Gateway token` (doit correspondre à `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`)

Créez ensuite un profil :

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Utilisez-le :

- CLI : `openclaw browser --browser-profile my-chrome tabs`
- Outil de l'agent : `browser` avec `profile="my-chrome"`

### Ports personnalisés du Gateway

Si vous utilisez un port de passerelle personnalisé, le port de relais de l'extension est dérivé automatiquement :

**Port de relais de l'extension = Port du Gateway + 3**

Exemple : si `gateway.port: 19001`, alors :

- Port de relais de l'extension : `19004` (passerelle + 3)

Configurez l'extension pour utiliser le port de relais dérivé dans la page des options de l'extension.

## Attacher / détacher (bouton de la barre d'outils)

- Ouvrez l'onglet que vous souhaitez que OpenClaw contrôle.
- Cliquez sur l'icône de l'extension.
  - Le badge affiche `ON` lorsqu'il est attaché.
- Cliquez à nouveau pour détacher.

## Quel onglet contrôle-t-il ?

- Il ne contrôle **pas** automatiquement « l'onglet que vous regardez ».
- Il contrôle **uniquement le(s) onglet(s) que vous avez explicitement attaché(s)** en cliquant sur le bouton de la barre d'outils.
- Pour changer : ouvrez l'autre onglet et cliquez sur l'icône de l'extension à cet endroit.

## Badge + erreurs courantes

- `ON` : attaché ; OpenClaw peut piloter cet onglet.
- `…` : connexion au relais local.
- `!` : relais inaccessible/non authentifié (le plus courant : serveur de relais non démarré, ou jeton de passerelle manquant/incorrect).

Si vous voyez `!` :

- Assurez-vous que la Gateway s'exécute localement (configuration par défaut), ou exécutez un hôte de nœud sur cette machine si la Gateway s'exécute ailleurs.
- Ouvrez la page des options de l'extension ; elle valide l'accessibilité du relais + l'authentification par jeton de passerelle.

## Gateway distant (utiliser un hôte de nœud)

### Gateway local (même machine que Chrome) — généralement **aucune étape supplémentaire**

Si le Gateway s'exécute sur la même machine que Chrome, il démarre le service de contrôle du navigateur en boucle locale et démarre automatiquement le serveur de relais. L'extension parle au relais local ; les appels CLI/tool vont vers la Gateway.

### Gateway distant (la Gateway s'exécute ailleurs) — **exécuter un hôte de nœud**

Si votre Gateway s'exécute sur une autre machine, démarrez un nœud hôte sur la machine qui exécute Chrome.
Le Gateway proxera les actions du navigateur vers ce nœud ; l'extension + le relais restent locaux à la machine du navigateur.

Si plusieurs nœuds sont connectés, épinglez-en un avec `gateway.nodes.browser.node` ou définissez `gateway.nodes.browser.mode`.

## Sandboxing (conteneurs d'outils)

Si votre session d'agent est sandboxée (`agents.defaults.sandbox.mode != "off"`), l'outil `browser` peut être restreint :

- Par défaut, les sessions sandboxées ciblent souvent le **sandbox browser** (`target="sandbox"`), et non votre Chrome hôte.
- La prise de contrôle du relais de l'extension Chrome nécessite de contrôler le serveur de contrôle du navigateur **hôte**.

Options :

- Le plus simple : utilisez l'extension à partir d'une session/agent **non sandboxé**.
- Ou autorisez le contrôle du navigateur hôte pour les sessions sandboxées :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

Assurez-vous ensuite que l'outil n'est pas refusé par la stratégie d'outils, et (si nécessaire) appelez `browser` avec `target="host"`.

Débogage : `openclaw sandbox explain`

## Conseils d'accès à distance

- Gardez le Gateway et le nœud hôte sur le même tailnet ; évitez d'exposer les ports du relais au réseau local ou à l'Internet public.
- Associez les nœuds intentionnellement ; désactivez le routage du proxy du navigateur si vous ne souhaitez pas de contrôle à distance (`gateway.nodes.browser.mode="off"`).
- Laissez le relais en boucle locale (loopback) sauf si vous avez un réel besoin inter-espaces de noms. Pour WSL2 ou des configurations d'hôte divisé similaires, définissez `browser.relayBindHost` sur une adresse de liaison explicite telle que `0.0.0.0`, puis limitez l'accès avec l'auth Gateway, l'association de nœuds et un réseau privé.

## Fonctionnement du « chemin de l'extension »

`openclaw browser extension path` affiche le répertoire sur disque **installé** contenant les fichiers de l'extension.

La CLI n'affiche intentionnellement **pas** un chemin `node_modules`. Exécutez toujours `openclaw browser extension install` d'abord pour copier l'extension vers un emplacement stable sous votre répertoire d'état OpenClaw.

Si vous déplacez ou supprimez ce répertoire d'installation, Chrome marquera l'extension comme cassée jusqu'à ce que vous la rechargiez depuis un chemin valide.

## Implications de sécurité (à lire)

C'est puissant et risqué. Traitez cela comme si vous donniez au model « les mains sur votre navigateur ».

- L'extension utilise l'API du débogueur de Chrome (`chrome.debugger`). Lorsqu'elle est attachée, le model peut :
  - cliquer/taper/naviguer dans cet onglet
  - lire le contenu de la page
  - accéder à tout ce à quoi la session connectée de l'onglet a accès
- **Ce n'est pas isolé** comme le profil dédié géré par openclaw.
  - Si vous l'attachez à votre profil/onglet principal, vous autorisez l'accès à l'état de ce compte.

Recommandations :

- Privilégiez un profil Chrome dédié (séparé de votre navigation personnelle) pour l'utilisation du relais de l'extension.
- Gardez le Gateway et tous les hôtes de nœuds uniquement sur le tailnet ; comptez sur l'authentification Gateway et l'appairage de nœuds.
- Évitez d'exposer les ports de relais sur le réseau local (`0.0.0.0`) et évitez Funnel (public).
- Le relais bloque les origines non issues de l'extension et nécessite une authentification par jeton de passerelle à la fois pour `/cdp` et `/extension`.

Connexes :

- Aperçu de l'outil de navigation : [Browser](/fr/tools/browser)
- Audit de sécurité : [Security](/fr/gateway/security)
- Configuration Tailscale : [Tailscale](/fr/gateway/tailscale)

import en from "/components/footer/en.mdx";

<en />
