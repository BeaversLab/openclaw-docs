---
summary: "Résoudre les problèmes WSL2 Gateway + Windows Chrome CDP à distance par couches"
read_when:
  - Exécution de OpenClaw Gateway dans WSL2 alors que Chrome vit sur Windows
  - Observation d'erreurs de navigateur/interface de contrôle qui se chevauchent entre WSL2 et Windows
  - Décider entre le MCP Chrome local à l'hôte et le CDP distant brut dans les configurations à hôtes séparés
title: "WSL2 + Windows + remote Chrome CDP troubleshooting"
---

# WSL2 + Windows + dépannage du Chrome CDP distant

Ce guide couvre la configuration courante à hôtes séparés où :

- OpenClaw Gateway s'exécute dans WSL2
- Chrome s'exécute sur Windows
- le contrôle du navigateur doit franchir la limite WSL2/Windows

Il couvre également le modèle de défaillance en couches de [issue #39369](https://github.com/openclaw/openclaw/issues/39369) : plusieurs problèmes indépendants peuvent survenir simultanément, ce qui fait que la mauvaise couche semble rompue en premier.

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

Pour WSL2 Gateway + Windows Chrome, préférez le CDP distant brut. Chrome MCP est local à l'hôte, pas un pont WSL2-vers-Windows.

## Architecture de travail

Forme de référence :

- WSL2 exécute le Gateway sur `127.0.0.1:18789`
- Windows ouvre l'interface de contrôle dans un navigateur normal à `http://127.0.0.1:18789/`
- Chrome Windows expose un point de terminaison CDP sur le port `9222`
- WSL2 peut atteindre ce point de terminaison CDP Windows
- OpenClaw pointe un profil de navigateur vers l'adresse accessible depuis WSL2

## Pourquoi cette configuration est déroutante

Plusieurs défaillances peuvent se chevaucher :

- WSL2 ne peut pas atteindre le point de terminaison CDP Windows
- l'interface de contrôle est ouverte à partir d'une origine non sécurisée
- `gateway.controlUi.allowedOrigins` ne correspond pas à l'origine de la page
- le jeton ou l'appariement est manquant
- le profil de navigateur pointe vers la mauvaise adresse

Pour cette raison, la correction d'une couche peut laisser visible une erreur différente.

## Règle critique pour l'interface de contrôle

Lorsque l'interface utilisateur est ouverte à partir de Windows, utilisez localhost Windows sauf si vous avez une configuration HTTPS délibérée.

Utilisez :

`http://127.0.0.1:18789/`

N'utilisez pas par défaut une IP de réseau local (LAN) pour l'interface utilisateur de contrôle. Le HTTP simple sur une adresse LAN ou tailnet peut déclencher un comportement d'origine non sécurisée/authentification d'appareil qui n'est pas lié au CDP lui-même. Voir [Control UI](/fr/web/control-ui).

## Validez par couches

Travaillez de haut en bas. Ne sautez pas d'étapes.

### Couche 1 : Vérifiez que Chrome diffuse le CDP sur Windows

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

Bon résultat :

- `/json/version` renvoie du JSON avec les métadonnées Browser / Protocol-Version
- `/json/list` renvoie du JSON (un tableau vide est correct si aucune page n'est ouverte)

Si cela échoue :

- Windows n'expose pas encore le port vers WSL2
- l'adresse est incorrecte pour le côté WSL2
- le pare-feu / le transfert de port / le proxy local est toujours manquant

Corrigez cela avant de toucher à la configuration OpenClaw.

### Couche 3 : Configurez le bon profil de navigateur

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
- conservez `attachOnly: true` pour les navigateurs gérés en externe
- testez la même URL avec `curl` avant de vous attendre à ce que OpenClaw fonctionne

### Couche 4 : Vérifiez séparément la couche de l'interface utilisateur de contrôle

Ouvrez l'interface utilisateur depuis Windows :

`http://127.0.0.1:18789/`

Ensuite, vérifiez :

- l'origine de la page correspond à ce que `gateway.controlUi.allowedOrigins` attend
- l'authentification par jeton ou le couplage est correctement configuré
- vous ne déboguez pas un problème d'authentification de l'interface utilisateur de contrôle comme s'il s'agissait d'un problème de navigateur

Page utile :

- [Control UI](/fr/web/control-ui)

### Couche 5 : Vérifiez le contrôle du navigateur de bout en bout

Depuis WSL2 :

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Bon résultat :

- l'onglet s'ouvre dans Chrome Windows
- `openclaw browser tabs` renvoie la cible
- les actions ultérieures (`snapshot`, `screenshot`, `navigate`) fonctionnent à partir du même profil

## Erreurs trompeuses courantes

Traitez chaque message comme un indice spécifique à une couche :

- `control-ui-insecure-auth`
  - problème d'origine UI / de contexte sécurisé, et non un problème de transport CDP
- `token_missing`
  - problème de configuration d'authentification
- `pairing required`
  - problème d'approbation de l'appareil
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 ne peut pas atteindre le `cdpUrl` configuré
- `gateway timeout after 1500ms`
  - souvent encore un problème d'accessibilité CDP ou un point de terminaison distant lent/inaccessible
- `No Chrome tabs found for profile="user"`
  - profil MCP Chrome local sélectionné alors qu'aucun onglet local à l'hôte n'est disponible

## Liste de contrôle de triage rapide

1. Windows : `curl http://127.0.0.1:9222/json/version` fonctionne-t-il ?
2. WSL2 : `curl http://WINDOWS_HOST_OR_IP:9222/json/version` fonctionne-t-il ?
3. Configuration OpenClaw : `browser.profiles.<name>.cdpUrl` utilise-t-il cette adresse exactement accessible par WSL2 ?
4. Interface de contrôle : ouvrez-vous `http://127.0.0.1:18789/` au lieu d'une IP LAN ?
5. Essayez-vous d'utiliser `existing-session` entre WSL2 et Windows au lieu du CDP distant brut ?

## Conclusion pratique

La configuration est généralement viable. La partie difficile est que le transport du navigateur, la sécurité de l'origine de l'interface de contrôle et le jeton/le jumelage peuvent échouer indépendamment tout en paraissant similaires du côté de l'utilisateur.

En cas de doute :

- vérifiez d'abord le point de terminaison Chrome Windows localement
- vérifiez ensuite le même point de terminaison depuis WSL2
- ensuite seulement, déboguez la configuration OpenClaw ou l'authentification de l'interface de contrôle

import fr from "/components/footer/fr.mdx";

<fr />
