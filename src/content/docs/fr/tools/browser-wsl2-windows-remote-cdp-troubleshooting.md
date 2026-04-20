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

Il couvre également le modèle de défaillance en couches du [problème #39369](https://github.com/openclaw/openclaw/issues/39369) : plusieurs problèmes indépendants peuvent survenir simultanément, ce qui fait que la mauvaise couche semble cassée en premier.

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
- vous n'avez pas besoin de routes gérées avancées/raw-CDP-only comme `responsebody`, l'export
  PDF, l'interception de téléchargement ou les actions par lots

Pour WSL2 Gateway + Windows Chrome, préférez le CDP distant brut. Chrome MCP est local à l'hôte, et non un pont WSL2-vers-Windows.

## Architecture de travail

Forme de référence :

- WSL2 exécute le Gateway sur `127.0.0.1:18789`
- Windows ouvre l'interface de contrôle dans un navigateur normal sur `http://127.0.0.1:18789/`
- Windows Chrome expose un point de terminaison CDP sur le port `9222`
- WSL2 peut atteindre ce point de terminaison CDP Windows
- OpenClaw pointe un profil de navigateur vers l'adresse accessible depuis WSL2

## Pourquoi cette configuration est déroutante

Plusieurs défaillances peuvent se chevaucher :

- WSL2 ne peut pas atteindre le point de terminaison CDP Windows
- l'interface de contrôle est ouverte depuis une origine non sécurisée
- `gateway.controlUi.allowedOrigins` ne correspond pas à l'origine de la page
- le jeton ou l'appariement est manquant
- le profil du navigateur pointe vers la mauvaise adresse

Pour cette raison, corriger une couche peut laisser visible une erreur différente.

## Règle critique pour l'interface de contrôle

Lorsque l'interface est ouverte depuis Windows, utilisez localhost Windows sauf si vous avez une configuration HTTPS délibérée.

Utilisez :

`http://127.0.0.1:18789/`

N'utilisez pas par défaut une IP LAN pour l'interface de contrôle. Le HTTP simple sur une adresse LAN ou de réseau de périphérique peut déclencher un comportement d'origine non sécurisée/d'authentification d'appareil sans rapport avec le CDP lui-même. Voir [Control UI](/fr/web/control-ui).

## Valider par couches

Travaillez de haut en bas. Ne sautez pas d'étapes.

### Couche 1 : Vérifiez que Chrome sert le CDP sur Windows

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

### Couche 2 : Vérifiez que WSL2 peut atteindre ce point de terminaison Windows

Depuis WSL2, testez l'adresse exacte que vous prévoyez d'utiliser dans `cdpUrl` :

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

Résultat positif :

- `/json/version` renvoie du JSON avec des métadonnées Browser / Protocol-Version
- `/json/list` renvoie du JSON (un tableau vide est acceptable si aucune page n'est ouverte)

Si cela échoue :

- Windows n'expose pas encore le port à WSL2
- l'adresse est incorrecte pour le côté WSL2
- le pare-feu / le transfert de port / le proxy local est toujours manquant

Réglez ce problème avant de toucher à la configuration OpenClaw.

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

- utilisez l'adresse accessible depuis WSL2, et non celle qui fonctionne uniquement sous Windows
- gardez `attachOnly: true` pour les navigateurs gérés de manière externe
- `cdpUrl` peut être `http://`, `https://`, `ws://` ou `wss://`
- utilisez HTTP(S) lorsque vous voulez que OpenClaw découvre `/json/version`
- utilisez WS(S) uniquement lorsque le provider de navigateur vous fournit une URL directe vers le socket DevTools
- testez la même URL avec `curl` avant d'attendre la réussite de OpenClaw

### Couche 4 : Vérifier la couche de l'UI de contrôle séparément

Ouvrez l'UI depuis Windows :

`http://127.0.0.1:18789/`

Ensuite, vérifiez :

- l'origine de la page correspond à ce que `gateway.controlUi.allowedOrigins` attend
- l'auth par jeton ou l'appairage est correctement configuré
- vous ne déboguez pas un problème d'auth de l'UI de contrôle comme s'il s'agissait d'un problème de navigateur

Page utile :

- [Control UI](/fr/web/control-ui)

### Couche 5 : Vérifier le contrôle de bout en bout du navigateur

Depuis WSL2 :

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Bon résultat :

- l'onglet s'ouvre dans le Chrome de Windows
- `openclaw browser tabs` renvoie la cible
- les actions ultérieures (`snapshot`, `screenshot`, `navigate`) fonctionnent à partir du même profil

## Erreurs trompeuses courantes

Traitez chaque message comme un indice spécifique à une couche :

- `control-ui-insecure-auth`
  - problème d'origine d'UI / de contexte sécurisé, pas un problème de transport CDP
- `token_missing`
  - problème de configuration d'authentification
- `pairing required`
  - problème d'approbation de l'appareil
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 ne peut pas atteindre le `cdpUrl` configuré
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - le point de terminaison HTTP a répondu, mais le WebSocket DevTools n'a toujours pas pu être ouvert
- remplacements obsolètes de la viewport / du mode sombre / de la langue / du mode hors ligne après une session à distance
  - exécutez `openclaw browser stop --browser-profile remote`
  - cela ferme la session de contrôle active et libère l'état d'émulation Playwright/CDP sans redémarrer la passerelle ou le navigateur externe
- `gateway timeout after 1500ms`
  - souvent encore un problème d'accessibilité CDP ou un point de terminaison distant lent ou inaccessible
- `No Chrome tabs found for profile="user"`
  - profil Chrome MCP local sélectionné alors qu'aucun onglet hôte-local n'est disponible

## Liste de contrôle rapide de triage

1. Windows : est-ce que `curl http://127.0.0.1:9222/json/version` fonctionne ?
2. WSL2 : est-ce que `curl http://WINDOWS_HOST_OR_IP:9222/json/version` fonctionne ?
3. Config OpenClaw : est-ce que `browser.profiles.<name>.cdpUrl` utilise cette adresse exacte accessible depuis %%PH:GLOSSARY:119:54f4daa%% ?
4. Control UI : ouvrez-vous `http://127.0.0.1:18789/` au lieu d'une adresse IP LAN ?
5. Essayez-vous d'utiliser `existing-session` à travers WSL2 et Windows au lieu du CDP distant brut ?

## Conclusion pratique

La configuration est généralement viable. La partie difficile est que le transport du navigateur, la sécurité de l'origine de l'interface de contrôle et le jeton/appariement peuvent échouer indépendamment tout en paraissant similaires du côté de l'utilisateur.

En cas de doute :

- vérifiez d'abord localement le point de terminaison Chrome Windows
- vérifiez ensuite le même point de terminaison depuis WSL2
- débuguez ensuite uniquement la config OpenClaw ou l'authentification de l'interface de contrôle
