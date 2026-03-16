---
summary: "Dépanner les configurations WSL2 Gateway + Chrome Windows CDP distant et extension-relais par couches"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between raw remote CDP and the Chrome extension relay in split-host setups
title: "WSL2 + Windows + dépannage Chrome CDP distant"
---

# WSL2 + Windows + dépannage Chrome CDP distant

Ce guide couvre la configuration commune en hôtes séparés où :

- OpenClaw Gateway s'exécute à l'intérieur de WSL2
- Chrome s'exécute sur Windows
- le contrôle du navigateur doit franchir la limite WSL2/Windows

Il couvre également le modèle d'échec en couches issu du [problème #39369](https://github.com/openclaw/openclaw/issues/39369) : plusieurs problèmes indépendants peuvent survenir simultanément, ce qui fait que la mauvaise couche semble être en panne en premier.

## Choisissez d'abord le bon mode de navigateur

Vous avez deux modèles valides :

### Option 1 : CDP distant brut

Utilisez un profil de navigateur distant qui pointe de WSL2 vers un point de terminaison CDP Chrome Windows.

Choisissez cette option lorsque :

- vous avez seulement besoin du contrôle du navigateur
- vous êtes à l'aise pour exposer le débogage distant Chrome à WSL2
- vous n'avez pas besoin du relais de l'extension Chrome

### Option 2 : Relais de l'extension Chrome

Utilisez le profil intégré `chrome-relay` ainsi que l'extension Chrome OpenClaw.

Choisissez cette option lorsque :

- vous souhaitez vous attacher à un onglet Chrome Windows existant avec le bouton de la barre d'outils
- vous souhaitez un contrôle basé sur une extension au lieu du `--remote-debugging-port` brut
- le relais lui-même doit être accessible à travers la limite WSL2/Windows

Si vous utilisez le relais de l'extension à travers des espaces de noms, `browser.relayBindHost` est le paramètre important introduit dans [Navigateur](/fr/tools/browser) et [Extension Chrome](/fr/tools/chrome-extension).

## Architecture de fonctionnement

Forme de référence :

- WSL2 exécute le Gateway sur `127.0.0.1:18789`
- Windows ouvre l'interface de contrôle dans un navigateur normal sur `http://127.0.0.1:18789/`
- Le Chrome Windows expose un point de terminaison CDP sur le port `9222`
- WSL2 peut atteindre ce point de terminaison CDP Windows
- OpenClaw fait pointer un profil de navigateur vers l'adresse qui est accessible depuis WSL2

## Pourquoi cette configuration est déroutante

Plusieurs échecs peuvent se chevaucher :

- WSL2 ne peut pas atteindre le point de terminaison CDP de Windows
- l'interface de contrôle est ouverte à partir d'une origine non sécurisée
- `gateway.controlUi.allowedOrigins` ne correspond pas à l'origine de la page
- le jeton ou le jumelage est manquant
- le profil du navigateur pointe vers la mauvaise adresse
- le relais de l'extension est toujours en boucle locale uniquement alors que vous avez besoin d'un accès inter-espace de noms

Pour cette raison, la correction d'une couche peut encore laisser visible une erreur différente.

## Règle critique pour l'interface de contrôle

Lorsque l'interface est ouverte depuis Windows, utilisez localhost de Windows sauf si vous avez une configuration HTTPS délibérée.

Utilisez :

`http://127.0.0.1:18789/`

N'utilisez pas par défaut une IP de réseau local pour l'interface de contrôle. Le HTTP simple sur une adresse de réseau local ou de tailnet peut déclencher un comportement d'origine non sécurisée/d'authentification d'appareil qui n'est pas lié au CDP lui-même. Voir [Control UI](/fr/web/control-ui).

## Valider par couches

Travaillez de haut en bas. Ne sautez pas les étapes.

### Couche 1 : Vérifier que Chrome diffuse le CDP sur Windows

Démarrez Chrome sur Windows avec le débogage à distance activé :

```powershell
chrome.exe --remote-debugging-port=9222
```

Depuis Windows, vérifiez d'abord Chrome lui-même :

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

Si cela échoue sur Windows, OpenClaw n'est pas encore le problème.

### Couche 2 : Vérifier que WSL2 peut atteindre ce point de terminaison Windows

Depuis WSL2, testez l'adresse exacte que vous prévoyez d'utiliser dans `cdpUrl` :

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

Bon résultat :

- `/json/version` renvoie du JSON avec les métadonnées Browser / Protocol-Version
- `/json/list` renvoie du JSON (un tableau vide est acceptable si aucune page n'est ouverte)

Si cela échoue :

- Windows n'expose pas encore le port à WSL2
- l'adresse est incorrecte pour le côté WSL2
- le pare-feu / le transfert de port / le proxy local est toujours manquant

Résolvez ce problème avant de toucher à la configuration de OpenClaw.

### Couche 3 : Configurer le bon profil de navigateur

Pour le CDP distant brut, pointez OpenClaw vers l'adresse accessible depuis WSL2 :

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

Remarques :

- utilisez l'adresse accessible depuis WSL2, pas ce qui ne fonctionne que sur Windows
- gardez `attachOnly: true` pour les navigateurs gérés de manière externe
- testez la même URL avec `curl` avant d'attendre la réussite de OpenClaw

### Couche 4 : Si vous utilisez plutôt le relais de l'extension Chrome

Si la machine du navigateur et le Gateway sont séparés par une limite d'espace de noms, le relais peut avoir besoin d'une adresse de liaison non bouclée.

Exemple :

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "chrome-relay",
    relayBindHost: "0.0.0.0",
  },
}
```

Utilisez ceci uniquement si nécessaire :

- le comportement par défaut est plus sûr car le relais reste en boucle locale uniquement
- `0.0.0.0` étend la surface d'exposition
- gardez l'auth Gateway, le jumelage de nœuds et le réseau environnant privés

Si vous n'avez pas besoin du relais d'extension, préférez le profil CDP distant brut ci-dessus.

### Couche 5 : Vérifiez la couche de l'interface de contrôle séparément

Ouvrez l'interface utilisateur depuis Windows :

`http://127.0.0.1:18789/`

Ensuite, vérifiez :

- l'origine de la page correspond à ce que `gateway.controlUi.allowedOrigins` attend
- l'auth par jeton ou le jumelage est configuré correctement
- vous ne déboguez pas un problème d'auth de l'interface de contrôle comme s'il s'agissait d'un problème de navigateur

Page utile :

- [Interface de contrôle](/fr/web/control-ui)

### Couche 6 : Vérifiez le contrôle de bout en bout du navigateur

Depuis WSL2 :

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Pour le relais d'extension :

```bash
openclaw browser tabs --browser-profile chrome-relay
```

Bon résultat :

- l'onglet s'ouvre dans Windows Chrome
- `openclaw browser tabs` renvoie la cible
- les actions ultérieures (`snapshot`, `screenshot`, `navigate`) fonctionnent à partir du même profil

## Erreurs trompeuses courantes

Traitez chaque message comme un indice spécifique à la couche :

- `control-ui-insecure-auth`
  - problème d'origine de l'interface / de contexte sécurisé, pas un problème de transport CDP
- `token_missing`
  - problème de configuration d'auth
- `pairing required`
  - problème d'approbation de l'appareil
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 ne peut pas atteindre le `cdpUrl` configuré
- `gateway timeout after 1500ms`
  - souvent encore un problème d'accessibilité CDP ou un point de terminaison distant lent/inaccessible
- `Chrome extension relay is running, but no tab is connected`
  - profil de relais d'extension sélectionné, mais aucun onglet attaché n'existe encore

## Liste de contrôle de tri rapide

1. Windows : est-ce que `curl http://127.0.0.1:9222/json/version` fonctionne ?
2. WSL2 : est-ce que `curl http://WINDOWS_HOST_OR_IP:9222/json/version` fonctionne ?
3. Configuration OpenClaw : est-ce que `browser.profiles.<name>.cdpUrl` utilise cette adresse exactement accessible par WSL2 ?
4. Interface de contrôle : ouvrez-vous `http://127.0.0.1:18789/` au lieu d'une IP LAN ?
5. Relais d'extension uniquement : avez-vous réellement besoin de `browser.relayBindHost`, et si oui, est-il défini explicitement ?

## Conclusion pratique

La configuration est généralement viable. La partie difficile réside dans le fait que le transport du navigateur, la sécurité de l'origine de l'interface de contrôle, le jeton/appariement et la topologie du relais d'extension peuvent chacun échouer indépendamment tout en paraissant similaires du point de vue de l'utilisateur.

En cas de doute :

- vérifiez d'abord le point de terminaison Chrome Windows localement
- vérifiez le même point de terminaison depuis WSL2 ensuite
- et seulement ensuite déboguez la configuration OpenClaw ou l'authentification de l'interface de contrôle

import fr from "/components/footer/fr.mdx";

<fr />
