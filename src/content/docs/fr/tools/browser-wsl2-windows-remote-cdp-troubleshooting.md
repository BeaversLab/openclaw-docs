---
summary: "Dépanner le WSL2 Gateway + Chrome CDP distant Windows par couches"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + dépannage Chrome CDP distant"
---

# WSL2 + Windows + dépannage Chrome CDP distant

Ce guide couvre la configuration commune en hôtes séparés où :

- OpenClaw Gateway s'exécute à l'intérieur de WSL2
- Chrome s'exécute sur Windows
- le contrôle du navigateur doit franchir la limite WSL2/Windows

Il traite également du modèle de panne en couches lié à [l'issue #39369](https://github.com/openclaw/openclaw/issues/39369) : plusieurs problèmes indépendants peuvent survenir simultanément, ce qui fait que la mauvaise couche semble en être la cause première.

## Choisissez d'abord le bon mode de navigateur

Vous avez deux modèles valides :

### Option 1 : CDP distant brut de WSL2 vers Windows

Utilisez un profil de navigateur distant qui pointe de WSL2 vers un point de terminaison CDP Chrome Windows.

Choisissez cette option lorsque :

- le Gateway reste à l'intérieur de WSL2
- Chrome s'exécute sur Windows
- vous avez besoin que le contrôle du navigateur franchisse la limite WSL2/Windows

### Option 2 : MCP Chrome local à l'hôte

Utilisez `existing-session` / `user` uniquement lorsque le Gateway lui-même s'exécute sur le même hôte que Chrome.

Choisissez cette option lorsque :

- OpenClaw et Chrome sont sur la même machine
- vous voulez l'état du navigateur connecté localement
- vous n'avez pas besoin de transport de navigateur multi-hôte

Pour le WSL2 Gateway + Chrome Windows, préférez le CDP distant brut. Le MCP Chrome est local à l'hôte, et non un pont WSL2-vers-Windows.

## Architecture de fonctionnement

Forme de référence :

- WSL2 exécute le Gateway sur `127.0.0.1:18789`
- Windows ouvre l'interface de contrôle (Control UI) dans un navigateur normal à `http://127.0.0.1:18789/`
- Chrome Windows expose un point de terminaison CDP sur le port `9222`
- WSL2 peut atteindre ce point de terminaison CDP Windows
- OpenClaw fait pointer un profil de navigateur vers l'adresse qui est accessible depuis WSL2

## Pourquoi cette configuration est déroutante

Plusieurs échecs peuvent se chevaucher :

- WSL2 ne peut pas atteindre le point de terminaison CDP de Windows
- l'interface de contrôle est ouverte à partir d'une origine non sécurisée
- `gateway.controlUi.allowedOrigins` ne correspond pas à l'origine de la page
- le jeton ou le jumelage est manquant
- le profil du navigateur pointe vers la mauvaise adresse

De ce fait, la correction d'une couche peut toujours laisser une erreur différente visible.

## Règle critique pour l'interface de contrôle (Control UI)

Lorsque l'interface est ouverte depuis Windows, utilisez le localhost Windows sauf si vous disposez d'une configuration HTTPS délibérée.

Utilisez :

`http://127.0.0.1:18789/`

N'utilisez pas par défaut une IP de réseau local (LAN) pour l'interface de contrôle. Le HTTP non sécurisé sur une adresse de réseau local ou de tailnet peut déclencher un comportement d'origine non sécurisée/d'authentification d'appareil qui n'est pas lié au CDP lui-même. Voir [Control UI](/en/web/control-ui).

## Valider par couches

Procédez de haut en bas. Ne sautez pas d'étapes.

### Couche 1 : Vérifier que Chrome diffuse le CDP sur Windows

Démarrez Chrome sur Windows avec le débogage distant activé :

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

Corrigez cela avant de toucher à la configuration de OpenClaw.

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

Notes :

- utilisez l'adresse accessible depuis WSL2, et non ce qui ne fonctionne que sur Windows
- gardez `attachOnly: true` pour les navigateurs gérés de manière externe
- testez la même URL avec `curl` avant de vous attendre à ce que OpenClaw réussisse

### Couche 4 : Vérifier séparément la couche de l'interface de contrôle

Ouvrez l'interface utilisateur depuis Windows :

`http://127.0.0.1:18789/`

Vérifiez ensuite :

- l'origine de la page correspond à ce que `gateway.controlUi.allowedOrigins` attend
- l'authentification par jeton ou l'appairage est correctement configuré
- vous ne déboguez pas un problème d'authentification de l'interface de contrôle comme s'il s'agissait d'un problème de navigateur

Page utile :

- [Interface de contrôle](/en/web/control-ui)

### Couche 5 : Vérifier le contrôle du navigateur de bout en bout

Depuis WSL2 :

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Bon résultat :

- l'onglet s'ouvre dans Windows Chrome
- `openclaw browser tabs` renvoie la cible
- les actions ultérieures (`snapshot`, `screenshot`, `navigate`) fonctionnent depuis le même profil

## Erreurs trompeuses courantes

Traitez chaque message comme un indice spécifique à une couche :

- `control-ui-insecure-auth`
  - problème d'origine de l'interface / de contexte sécurisé, et non un problème de transport CDP
- `token_missing`
  - problème de configuration de l'authentification
- `pairing required`
  - problème d'approbation de l'appareil
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 ne peut pas atteindre le `cdpUrl` configuré
- `gateway timeout after 1500ms`
  - souvent encore un problème d'accessibilité CDP ou un point de terminaison distant lent/inaccessible
- `No Chrome tabs found for profile="user"`
  - profil Chrome MCP local sélectionné alors qu'aucun onglet local à l'hôte n'est disponible

## Liste de contrôle rapide de triage

1. Windows : est-ce que `curl http://127.0.0.1:9222/json/version` fonctionne ?
2. WSL2 : est-ce que `curl http://WINDOWS_HOST_OR_IP:9222/json/version` fonctionne ?
3. Configuration de OpenClaw : est-ce que `browser.profiles.<name>.cdpUrl` utilise cette adresse exacte accessible depuis WSL2 ?
4. Interface de contrôle : ouvrez-vous `http://127.0.0.1:18789/` au lieu d'une IP LAN ?
5. Essayez-vous d'utiliser `existing-session` entre WSL2 et Windows au lieu du CDP distant brut ?

## Point pratique à retenir

La configuration est généralement viable. La partie difficile est que le transport du navigateur, la sécurité de l'origine de l'interface de contrôle et le jeton/appariement peuvent chacun échouer indépendamment tout en paraissant similaires du point de vue de l'utilisateur.

En cas de doute :

- vérifiez d'abord le point de terminaison Chrome de Windows localement
- vérifiez ensuite le même point de terminaison depuis WSL2
- ne déboguez ensuite la configuration OpenClaw ou l'authentification de l'interface de contrôle
