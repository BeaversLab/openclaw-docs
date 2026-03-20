---
summary: "Application de nœud iOS : connexion à la passerelle, appairage, Canvas et dépannage"
read_when:
  - Appairage ou reconnexion du nœud iOS
  - Exécution de l'application iOS à partir du code source
  - Débogage de la découverte de passerelle ou des commandes Canvas
title: "Application iOS"
---

# Application iOS (nœud)

Disponibilité : preview interne. L'application iOS n'est pas encore distribuée publiquement.

## Fonctionnalités

- Se connecte à une Gateway via WebSocket (LAN ou Tailnet).
- Expose les capacités du nœud : Canvas, capture d'écran, capture caméra, localisation, mode Talk, réveil vocal.
- Reçoit les commandes `node.invoke` et signale les événements d'état du nœud.

## Conditions requises

- Gateway exécutée sur un autre appareil (macOS, Linux ou Windows via WSL2).
- Chemin réseau :
  - Même réseau local via Bonjour, **ou**
  - Tailnet via DNS-SD unicast (exemple de domaine : `openclaw.internal.`), **ou**
  - Hôte/port manuel (secours).

## Démarrage rapide (appairage + connexion)

1. Démarrez la Gateway :

```bash
openclaw gateway --port 18789
```

2. Dans l'application iOS, ouvrez Réglages et choisissez une passerelle découverte (ou activez Hôte manuel et saisissez l'hôte/le port).

3. Approuvez la demande d'appairage sur l'hôte de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. Vérifiez la connexion :

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push relayé pour les versions officielles

Les versions officielles distribuées de iOS utilisent le relais de push externe au lieu de publier le jeton APNs brut vers la passerelle.

Condition requise côté Gateway :

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

Fonctionnement du flux :

- L'application iOS s'inscrit auprès du relais à l'aide de l'attestation d'application et du reçu de l'application.
- Le relais renvoie un identifiant de relais opaque ainsi qu'une autorisation d'envoi limitée à l'inscription.
- L'application iOS récupère l'identité de la passerelle appariée et l'inclut dans l'inscription au relais, de sorte que l'inscription relayée est déléguée à cette passerelle spécifique.
- L'application transfère cette inscription relayée à la passerelle appariée avec `push.apns.register`.
- La passerelle utilise cet identifiant de relais stocké pour `push.test`, les réveils en arrière-plan et les sollicitations de réveil.
- L'URL de base du relais de la passerelle doit correspondre à l'URL du relais intégrée à la version officielle/TestFlight de iOS.
- Si l'application se connecte ultérieurement à une autre passerelle ou à une version avec une URL de base de relais différente, elle actualise l'inscription au relais au lieu de réutiliser l'ancienne liaison.

Ce dont la passerelle n'a **pas** besoin pour ce chemin :

- Aucun jeton de relais à l'échelle du déploiement.
- Aucune clé APNs directe pour les envois relayés officiel/TestFlight.

Flux de l'opérateur attendu :

1. Installez la version officielle/TestFlight de iOS.
2. Définissez `gateway.push.apns.relay.baseUrl` sur la passerelle.
3. Associez l'application à la passerelle et laissez-la finir la connexion.
4. L'application publie `push.apns.register` automatiquement après avoir obtenu un jeton APNs, que la session de l'opérateur est connectée et que l'enregistrement du relais a réussi.
5. Après cela, `push.test`, les reconnexions réveillent, et les signaux de réveil peuvent utiliser l'enregistrement sauvegardé via relais.

Remarque de compatibilité :

- `OPENCLAW_APNS_RELAY_BASE_URL` fonctionne toujours comme une substitution temporaire d'environnement pour la passerelle.

## Flux d'authentification et de confiance

Le relais existe pour faire respecter deux contraintes que l'APNs direct sur la passerelle ne peut pas fournir pour les versions officielles iOS :

- Seules les versions authentiques OpenClaw iOS distribuées par Apple peuvent utiliser le relais hébergé.
- Une passerelle ne peut envoyer des notifications relayées que pour les appareils iOS qui ont été associés à cette passerelle spécifique.

Saut par saut :

1. `iOS app -> gateway`
   - L'application s'associe d'abord à la passerelle via le flux d'authentification normal de Gateway.
   - Cela donne à l'application une session de nœud authentifiée ainsi qu'une session d'opérateur authentifiée.
   - La session de l'opérateur est utilisée pour appeler `gateway.identity.get`.

2. `iOS app -> relay`
   - L'application appelle les points de terminaison d'enregistrement du relais via HTTPS.
   - L'enregistrement inclut une preuve App Attest ainsi que le reçu de l'application.
   - Le relais valide l'identifiant du bundle, la preuve App Attest et le reçu Apple, et exige le chemin de distribution officiel/production.
   - C'est ce qui empêche les versions locales Xcode/dev d'utiliser le relais hébergé. Une version locale peut être signée, mais elle ne satisfait pas la preuve de distribution Apple officielle que le relais attend.

3. `gateway identity delegation`
   - Avant l'enregistrement du relais, l'application récupère l'identité de la passerelle associée depuis `gateway.identity.get`.
   - L'application inclut cette identité de passerelle dans la charge utile d'enregistrement du relais.
   - Le relais renvoie un identifiant de relais et une autorisation d'envoi délimitée à l'enregistrement qui sont délégués à cette identité de passerelle.

4. `gateway -> relay`
   - La passerelle stocke l'identifiant de relais et l'autorisation d'envoi provenant de `push.apns.register`.
   - Sur `push.test`, les réveils par reconnexion et les signaux de réveil, la passerelle signe la demande d'envoi avec sa propre identité d'appareil.
   - Le relais vérifie à la fois la subvention d'envoi stockée et la signature de la passerelle par rapport à l'identité de passerelle déléguée lors de l'enregistrement.
   - Une autre passerelle ne peut pas réutiliser cet enregistrement stocké, même si elle obtient d'une manière ou d'une autre le descripteur.

5. `relay -> APNs`
   - Le relais possède les identifiants APNs de production et le jeton APNs brut pour la version officielle.
   - La passerelle ne stocke jamais le jeton APNs brut pour les versions officielles prises en charge par le relais.
   - Le relais envoie la notification push finale à APNs au nom de la passerelle appariée.

Pourquoi cette conception a été créée :

- Pour éviter que les identifiants APNs de production ne se retrouvent dans les passerelles des utilisateurs.
- Pour éviter de stocker les jetons APNs bruts de la version officielle sur la passerelle.
- Pour autoriser l'utilisation du relais hébergé uniquement pour les versions officielles/TestFlight d'OpenClaw.
- Pour empêcher une passerelle d'envoyer des notifications de réveil aux appareils iOS appartenant à une autre passerelle.

Les versions locales/manuelles restent sur APNs direct. Si vous testez ces versions sans le relais, la passerelle a toujours besoin d'identifiants APNs directs :

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## Discovery paths

### Bonjour (LAN)

Le Gateway annonce `_openclaw-gw._tcp` sur `local.`. L'application iOS les répertorie automatiquement.

### Tailnet (cross-network)

Si mDNS est bloqué, utilisez une zone DNS-SD unicast (choisissez un domaine ; exemple : `openclaw.internal.`) et le DNS fractionné Tailscale.
Voir [Bonjour](/fr/gateway/bonjour) pour l'exemple CoreDNS.

### Manual host/port

Dans Réglages, activez **Hôte manuel** et entrez l'hôte de la passerelle + le port (par défaut `18789`).

## Canvas + A2UI

Le nœud iOS affiche une toile WKWebView. Utilisez `node.invoke` pour la piloter :

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Remarques :

- L'hôte de la toile du Gateway sert `/__openclaw__/canvas/` et `/__openclaw__/a2ui/`.
- Il est servi par le serveur HTTP du Gateway (même port que `gateway.port`, par défaut `18789`).
- Le nœud iOS navigue automatiquement vers A2UI lors de la connexion lorsqu'une URL d'hôte de toile est annoncée.
- Revenez à l'échafaudage intégré avec `canvas.navigate` et `{"url":""}`.

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Voice wake + talk mode

- Le mode réveil vocal et conversation est disponible dans les réglages.
- iOS peut suspendre l'audio en arrière-plan ; considérez les fonctionnalités vocales comme étant au mieux lorsque l'application n'est pas active.

## Common errors

- `NODE_BACKGROUND_UNAVAILABLE` : amener l'application iOS au premier plan (les commandes canvas/camera/écran l'exigent).
- `A2UI_HOST_NOT_CONFIGURED` : la Gateway n'a pas annoncé d'URL d'hôte canvas ; vérifiez `canvasHost` dans la [configuration de la Gateway](/fr/gateway/configuration).
- L'invite d'appairage n'apparaît jamais : exécutez `openclaw devices list` et approuvez manuellement.
- La reconnexion échoue après réinstallation : le jeton d'appairage du trousseau a été effacé ; ré-appariez le nœud.

## Documentation connexe

- [Appairage](/fr/channels/pairing)
- [Discovery](/fr/gateway/discovery)
- [Bonjour](/fr/gateway/bonjour)

import fr from "/components/footer/fr.mdx";

<fr />
