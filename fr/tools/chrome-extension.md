---
summary: "Extension Chrome : laisser OpenClaw piloter votre onglet Chrome existant"
read_when:
  - You want the agent to drive an existing Chrome tab (toolbar button)
  - You need remote Gateway + local browser automation via Tailscale
  - You want to understand the security implications of browser takeover
title: "Extension Chrome"
---

# Extension Chrome (relais du navigateur)

L'extension Chrome OpenClaw permet à l'agent de contrôler vos **onglets Chrome existants** (votre fenêtre Chrome normale) au lieu de lancer un profil Chrome distinct géré par OpenClaw.

L'attachement/détachement s'effectue via un **bouton unique de la barre d'outils Chrome**.

Si vous préférez le flux officiel d'attachement MCP DevTools de Chrome plutôt que le relais de l'extension OpenClaw, utilisez plutôt un `existing-session` profil de navigateur. Voir
[Browser](/fr/tools/browser#chrome-existing-session-via-mcp). Pour la documentation de configuration de Chrome, voir [Chrome for Developers: Use Chrome DevTools MCP with your
browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
et le [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp).

## Ce que c'est (concept)

Il y a trois parties :

- **Service de contrôle du navigateur** (Gateway ou nœud) : l'API que l'agent/tool appelle (via le Gateway)
- **Serveur de relais local** (CDP de bouclage) : fait le pont entre le serveur de contrôle et l'extension (`http://127.0.0.1:18792` par défaut)
- **Extension Chrome MV3** : s'attache à l'onglet actif en utilisant `chrome.debugger` et redirige les messages CDP vers le relais

OpenClaw contrôle ensuite l'onglet attaché via l'interface `browser` tool normale (en sélectionnant le bon profil).

## Installer / charger (décompressée)

1. Installez l'extension dans un chemin local stable :

```bash
openclaw browser extension install
```

2. Affichez le chemin du répertoire de l'extension installée :

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- Activer « Mode développeur »
- « Charger l'extension non extraite » → sélectionner le répertoire affiché ci-dessus

4. Épinglez l'extension.

## Mises à jour (pas d'étape de build)

L'extension est fournie dans la version OpenClaw (package npm) sous forme de fichiers statiques. Il n'y a pas d'étape de « build » distincte.

Après la mise à niveau d'OpenClaw :

- Réexécutez `openclaw browser extension install` pour actualiser les fichiers installés dans votre répertoire d'état OpenClaw.
- Chrome → `chrome://extensions` → cliquez sur "Recharger" sur l'extension.

## Utilisation (définir le jeton Gateway une seule fois)

OpenClaw est fourni avec un profil de navigateur intégré nommé `chrome` qui cible le relais de l'extension sur le port par défaut.

Avant la première connexion, ouvrez les Options de l'extension et définissez :

- `Port` (par défaut `18792`)
- `Gateway token` (doit correspondre à `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`)

Utilisation :

- CLI : `openclaw browser --browser-profile chrome tabs`
- Agent tool : `browser` avec `profile="chrome"`

Si vous souhaitez un nom différent ou un port de relais différent, créez votre propre profil :

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

### Ports Gateway personnalisés

Si vous utilisez un port Gateway personnalisé, le port du relais de l'extension est automatiquement dérivé :

**Port du relais de l'extension = Port Gateway + 3**

Exemple : si `gateway.port: 19001`, alors :

- Port du relais de l'extension : `19004` (gateway + 3)

Configurez l'extension pour utiliser le port de relais dérivé dans la page des Options de l'extension.

## Attacher / détacher (bouton de la barre d'outils)

- Ouvrez l'onglet que vous souhaitez que OpenClaw contrôle.
- Cliquez sur l'icône de l'extension.
  - Le badge affiche `ON` lorsqu'il est attaché.
- Cliquez à nouveau pour détacher.

## Quel onglet contrôle-t-il ?

- Il ne contrôle **pas** automatiquement "l'onglet que vous regardez".
- Il contrôle **uniquement le(s) onglet(s) que vous avez explicitement attaché(s)** en cliquant sur le bouton de la barre d'outils.
- Pour changer : ouvrez l'autre onglet et cliquez sur l'icône de l'extension à cet endroit.

## Badge + erreurs courantes

- `ON` : attaché ; OpenClaw peut piloter cet onglet.
- `…` : connexion au relais local.
- `!` : relais inaccessible/non authentifié (le plus fréquent : serveur de relais non démarré, ou jeton gateway manquant/incorrect).

Si vous voyez `!` :

- Assurez-vous que le Gateway fonctionne localement (configuration par défaut), ou exécutez un hôte de nœud sur cette machine si le Gateway fonctionne ailleurs.
- Ouvrez la page des options de l'extension ; elle vérifie l'accessibilité du relais et l'authentification par jeton du Gateway.

## Gateway distant (utiliser un hôte nœud)

### Gateway local (même machine que Chrome) — généralement **aucune étape supplémentaire**

Si le Gateway s'exécute sur la même machine que Chrome, il démarre le service de contrôle du navigateur en boucle locale
et démarre automatiquement le serveur de relais. L'extension communique avec le relais local ; les appels CLI/outils vont vers le Gateway.

### Gateway distant (le Gateway s'exécute ailleurs) — **exécuter un hôte nœud**

Si votre Gateway s'exécute sur une autre machine, démarrez un hôte nœud sur la machine qui exécute Chrome.
Le Gateway proxera les actions du navigateur vers ce nœud ; l'extension + le relais restent locaux à la machine du navigateur.

Si plusieurs nœuds sont connectés, épinglez-en un avec `gateway.nodes.browser.node` ou définissez `gateway.nodes.browser.mode`.

## Sandboxing (conteneurs d'outils)

Si votre session d'agent est sandboxée (`agents.defaults.sandbox.mode != "off"`), l'outil `browser` peut être restreint :

- Par défaut, les sessions sandboxées ciblent souvent le **navigateur sandbox** (`target="sandbox"`), et non votre Chrome hôte.
- La prise de contrôle par relais de l'extension Chrome nécessite de contrôler le serveur de contrôle du navigateur **hôte**.

Options :

- Le plus simple : utiliser l'extension à partir d'une session/agent **non sandboxé**.
- Ou autoriser le contrôle du navigateur hôte pour les sessions sandboxées :

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

- Gardez le Gateway et l'hôte nœud sur le même tailnet ; évitez d'exposer les ports de relais au LAN ou à l'Internet public.
- Associez les nœuds intentionnellement ; désactivez le routage du proxy navigateur si vous ne voulez pas de contrôle à distance (`gateway.nodes.browser.mode="off"`).
- Laissez le relais en loopback à moins que vous n'ayez un véritable besoin inter-espaces de noms. Pour WSL2 ou des configurations similaires d'hôte fractionné, définissez `browser.relayBindHost` sur une adresse de liaison explicite telle que `0.0.0.0`, puis restreignez l'accès avec l'authentification Gateway, le jumelage de nœuds et un réseau privé.

## Fonctionnement du « chemin de l'extension »

`openclaw browser extension path` affiche le répertoire sur disque **installé** contenant les fichiers de l'extension.

La CLI n'affiche volontairement **pas** un chemin `node_modules`. Exécutez toujours d'abord `openclaw browser extension install` pour copier l'extension vers un emplacement stable dans votre répertoire d'état OpenClaw.

Si vous déplacez ou supprimez ce répertoire d'installation, Chrome marquera l'extension comme cassée jusqu'à ce que vous la rechargiez à partir d'un chemin valide.

## Implications de sécurité (lisez ceci)

C'est puissant et risqué. Traitez cela comme si vous donniez au modèle « les mains sur votre navigateur ».

- L'extension utilise l'API du débogueur de Chrome (`chrome.debugger`). Lorsqu'elle est attachée, le modèle peut :
  - cliquer/taper/naviguer dans cet onglet
  - lire le contenu de la page
  - accéder à tout ce à quoi la session connectée de l'onglet peut accéder
- **Ce n'est pas isolé** comme le profil dédié géré par openclaw.
  - Si vous vous attachez à votre profil/onglet principal, vous accordez l'accès à cet état de compte.

Recommandations :

- Préférez un profil Chrome dédié (séparé de votre navigation personnelle) pour l'utilisation du relais d'extension.
- Gardez le Gateway et tous les hôtes de nœuds uniquement sur le tailnet ; comptez sur l'authentification Gateway + le jumelage de nœuds.
- Évitez d'exposer les ports de relais sur le LAN (`0.0.0.0`) et évitez Funnel (public).
- Le relais bloque les origines non-extension et nécessite une authentification par jeton de passerelle pour `/cdp` et `/extension`.

Connexes :

- Aperçu de l'outil de navigateur : [Navigateur](/fr/tools/browser)
- Audit de sécurité : [Sécurité](/fr/gateway/security)
- Configuration Tailscale : [Tailscale](/fr/gateway/tailscale)

import fr from '/components/footer/fr.mdx';

<fr />
