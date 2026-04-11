---
summary: "Application de nœud iOS : se connecter au Gateway, appairage, canvas et troubleshooting"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "Application iOS"
---

# App iOS (Node)

Disponibilité : prévisualisation interne. L'application iOS n'est pas encore distribuée publiquement.

## Ce qu'elle fait

- Se connecte à une Gateway via WebSocket (LAN ou tailnet).
- Expose les capacités du nœud : Canvas, capture d'écran, capture de caméra, localisation, mode Talk, réveil vocal.
- Reçoit les commandes `node.invoke` et signale les événements d'état du nœud.

## Prérequis

- Gateway exécutée sur un autre appareil (macOS, Linux ou Windows via WSL2).
- Réseau :
  - Même LAN via Bonjour, **ou**
  - Tailnet via DNS-SD unicast (exemple de domaine : `openclaw.internal.`), **ou**
  - Hôte/port manuel (solution de repli).

## Démarrage rapide (appairage + connexion)

1. Démarrez la Gateway :

```bash
openclaw gateway --port 18789
```

2. Dans l'application iOS, ouvrez les Réglages et choisissez une gateway détectée (ou activez Hôte manuel et entrez l'hôte/port).

3. Approuvez la demande d'appairage sur l'hôte de la gateway :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si l'application réessaie l'appairage avec des détails d'authentification modifiés (rôle/portées/clé publique),
la demande en attente précédente est remplacée et un nouveau `requestId` est créé.
Exécutez `openclaw devices list` à nouveau avant approbation.

4. Vérifiez la connexion :

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push relayé pour les builds officiels

Les versions iOS distribuées officiellement utilisent le relais de push externe au lieu de publier le jeton APNs brut sur le gateway.

Exigence côté Gateway :

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

- L'application iOS s'inscrit auprès du relais à l'aide de l'App Attest et du reçu de l'application.
- Le relais renvoie un descripteur de relais opaque ainsi qu'une autorisation d'envoi limitée à l'inscription.
- L'application iOS récupère l'identité du gateway apparié et l'inclut dans l'inscription au relais, de sorte que l'inscription relayée est déléguée à ce gateway spécifique.
- L'application transmet cette inscription basée sur le relai à la passerelle appariée avec `push.apns.register`.
- La passerelle utilise ce gestionnaire de relai stocké pour `push.test`, les réveils en arrière-plan et les incitations au réveil.
- L'URL de base du relais du gateway doit correspondre à l'URL du relais intégrée dans le build iOS officiel/TestFlight.
- Si l'application se connecte ultérieurement à un gateway différent ou à un build avec une URL de base de relais différente, elle actualise l'inscription au relais au lieu de réutiliser l'ancienne liaison.

Ce dont le gateway n'a **pas** besoin pour ce chemin :

- Aucun jeton de relais à l'échelle du déploiement.
- Aucune clé APNs directe pour les envois relayés officiels/TestFlight.

Flux de l'opérateur attendu :

1. Installez le build iOS officiel/TestFlight.
2. Définissez `gateway.push.apns.relay.baseUrl` sur la passerelle.
3. Associez l'application au gateway et laissez-la terminer la connexion.
4. L'application publie `push.apns.register` automatiquement après avoir obtenu un jeton APNs, lorsque la session de l'opérateur est connectée et que l'inscription au relai réussit.
5. Ensuite, `push.test`, les réveils de reconnexion et les incitations au réveil peuvent utiliser l'inscription basée sur le relai stockée.

Note de compatibilité :

- `OPENCLAW_APNS_RELAY_BASE_URL` fonctionne toujours comme une substitution temporaire de variable d'environnement pour la passerelle.

## Flux d'authentification et de confiance

Le relais existe pour faire respecter deux contraintes que l'APNs direct sur le gateway ne peut pas fournir pour les builds iOS officiels :

- Seuls les builds OpenClaw iOS authentiques distribués par Apple peuvent utiliser le relais hébergé.
- Une passerelle ne peut envoyer des notifications relais que pour les appareils iOS qui ont été appariés avec cette passerelle spécifique.

Saut par saut :

1. `iOS app -> gateway`
   - L'application s'apparie d'abord avec la passerelle via le flux d'authentification normal de Gateway.
   - Cela donne à l'application une session de nœud authentifiée ainsi qu'une session d'opérateur authentifiée.
   - La session de l'opérateur est utilisée pour appeler `gateway.identity.get`.

2. `iOS app -> relay`
   - L'application appelle les points de terminaison d'enregistrement du relais via HTTPS.
   - L'enregistrement inclut une preuve App Attest ainsi que le reçu de l'application.
   - Le relais valide l'ID de bundle, la preuve App Attest et le reçu Apple, et exige le chemin de distribution officiel/production.
   - C'est ce qui empêche les versions de développement Xcode locales d'utiliser le relais hébergé. Une version locale peut être signée, mais elle ne satisfait pas la preuve de distribution Apple officiale attendue par le relais.

3. `gateway identity delegation`
   - Avant l'inscription au relai, l'application récupère l'identité de la passerelle appariée depuis
     `gateway.identity.get`.
   - L'application inclut cette identité de passerelle dans la charge utile d'enregistrement au relais.
   - Le relais renvoie un descripteur de relais et une autorisation d'envoi délimitée à l'enregistrement qui sont délégués à cette identité de passerelle.

4. `gateway -> relay`
   - La passerelle stocke le gestionnaire de relai et l'autorisation d'envoi provenant de `push.apns.register`.
   - Sur `push.test`, les réveils de reconnexion et les incitations au réveil, la passerelle signe la demande d'envoi avec sa
     propre identité d'appareil.
   - Le relais vérifie à la fois l'autorisation d'envoi stockée et la signature de la passerelle par rapport à l'identité de passerelle déléguée issue de l'enregistrement.
   - Une autre passerelle ne peut pas réutiliser cet enregistrement stocké, même si elle parvient à obtenir le descripteur.

5. `relay -> APNs`
   - Le relais possède les identifiants APNs de production et le jeton APNs brut pour la version officielle.
   - La passerelle ne stocke jamais le jeton APNs brut pour les versions officielles utilisant le relais.
   - Le relais envoie la notification finale à APNs au nom de la passerelle appariée.

Pourquoi cette conception a été créée :

- Pour garder les identifiants APNs de production hors des passerelles des utilisateurs.
- Pour éviter de stocker les jetons APNs bruts des versions officielles sur la passerelle.
- Pour n'autoriser l'utilisation du relais hébergé que pour les versions officielles/TestFlight de OpenClaw.
- Pour empêcher une passerelle d'envoyer des notifications de réveil aux appareils iOS appartenant à une autre passerelle.

Les versions locales/manuelles restent sur les APNs directs. Si vous testez ces versions sans le relais, la passerelle a toujours besoin des identifiants APNs directs :

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

Il s'agit de variables d'environnement d'exécution de l'hôte de passerelle, et non des paramètres Fastlane. `apps/ios/fastlane/.env` ne stocke que
l'authentification App Store Connect / TestFlight telle que `ASC_KEY_ID` et `ASC_ISSUER_ID` ; il ne configure pas
la livraison APNs directe pour les builds iOS locales.

Stockage recommandé pour l'hôte de la passerelle :

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

Ne commitez pas le fichier `.p8` et ne le placez pas sous l'extraction du dépôt.

## Discovery paths

### Bonjour (LAN)

L'application iOS parcourt `_openclaw-gw._tcp` sur `local.` et, si configuré, le même domaine de découverte DNS-SD de zone étendue. Les passerelles du même réseau local apparaissent automatiquement depuis `local.` ; la découverte inter-réseaux peut utiliser le domaine de zone étendue configuré sans modifier le type de balise.

### Tailnet (inter-réseaux)

Si mDNS est bloqué, utilisez une zone DNS-SD unicast (choisissez un domaine ; exemple :
`openclaw.internal.`) et le DNS divisé Tailscale.
Voir [Bonjour](/en/gateway/bonjour) pour l'exemple CoreDNS.

### Hôte/port manuel

Dans Réglages, activez **Hôte manuel** et entrez l'hôte + le port de la passerelle (par défaut `18789`).

## Canvas + A2UI

Le nœud iOS affiche une toile WKWebView. Utilisez `node.invoke` pour la piloter :

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notes :

- L'hôte de la passerelle Gateway sert `/__openclaw__/canvas/` et `/__openclaw__/a2ui/`.
- Il est servi par le serveur HTTP de la Gateway (même port que `gateway.port`, par défaut `18789`).
- Le nœud iOS navigue automatiquement vers A2UI lors de la connexion lorsqu'une URL d'hôte de toile est annoncée.
- Revenez à l'échafaudage intégré avec `canvas.navigate` et `{"url":""}`.

### Évaluation/instantané Canvas

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Réveil vocal + mode discussion

- Le réveil vocal et le mode discussion sont disponibles dans Réglages.
- iOS peut suspendre l'audio en arrière-plan ; traitez les fonctionnalités vocales comme « au mieux » lorsque l'application n'est pas active.

## Erreurs courantes

- `NODE_BACKGROUND_UNAVAILABLE` : amenez l'application iOS au premier plan (les commandes de toile/caméra/écran le nécessitent).
- `A2UI_HOST_NOT_CONFIGURED` : la Gateway n'a pas annoncé d'URL d'hôte de toile ; vérifiez `canvasHost` dans [Configuration de la Gateway](/en/gateway/configuration).
- L'invite de jumelage n'apparaît jamais : exécutez `openclaw devices list` et approuvez manuellement.
- La reconnexion échoue après la réinstallation : le jeton de jumelage du trousseau a été effacé ; jumelez à nouveau le nœud.

## Documentation connexe

- [Jumelage](/en/channels/pairing)
- [Discovery](/en/gateway/discovery)
- [Bonjour](/en/gateway/bonjour)
