---
summary: "application nœud iOS : se connecter à la Gateway, appairage, canvas et dépannage"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "App iOS"
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

4. Vérifiez la connexion :

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push relayé pour les versions officielles

Les versions distribuées officielles d'iOS utilisent le relais de push externe au lieu de publier le jeton APNs brut vers la gateway.

Prérequis côté Gateway :

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

- L'application iOS s'inscrit auprès du relais à l'aide d'App Attest et du reçu de l'application.
- Le relais renvoie un descripteur de relais opaque ainsi qu'une autorisation d'envoi limitée à l'inscription.
- L'application iOS récupère l'identité de la gateway appariée et l'inclut dans l'inscription au relais, de sorte que l'inscription relayée est déléguée à cette gateway spécifique.
- L'application transfère cette inscription relayée à la gateway appariée avec `push.apns.register`.
- La gateway utilise ce descripteur de relais stocké pour `push.test`, les réveils en arrière-plan et les incitations au réveil.
- L'URL de base du relais de la gateway doit correspondre à l'URL du relais intégrée dans la version iOS officielle/TestFlight.
- Si l'application se connecte ultérieurement à une autre gateway ou à une version avec une autre URL de base de relais, elle actualise l'inscription au relais au lieu de réutiliser l'ancienne liaison.

Ce dont le gateway n'a **pas** besoin pour ce chemin :

- Aucun jeton de relais (relay token) à l'échelle du déploiement.
- Aucune clé APNs directe pour les envois basés sur le relais pour les versions officielles/TestFlight.

Flux de l'opérateur attendu :

1. Installez la version iOS officielle/TestFlight.
2. Définissez `gateway.push.apns.relay.baseUrl` sur le gateway.
3. Associez l'application au gateway et laissez-la terminer la connexion.
4. L'application publie `push.apns.register` automatiquement après avoir obtenu un jeton APNs, que la session de l'opérateur est connectée et que l'enregistrement du relais réussit.
5. Ensuite, `push.test`, les réveils de reconnexion et les incitations au réveil peuvent utiliser l'enregistrement basé sur le relais stocké.

Note de compatibilité :

- `OPENCLAW_APNS_RELAY_BASE_URL` fonctionne toujours comme une substitution temporaire de variable d'environnement pour le gateway.

## Flux d'authentification et de confiance

Le relai existe pour faire respecter deux contraintes que l'APNs direct sur le gateway ne peut pas fournir pour
les versions officielles iOS :

- Seules les versions authentiques OpenClaw iOS distribuées via Apple peuvent utiliser le relai hébergé.
- Un gateway ne peut envoyer des notifications basées sur le relai que pour les appareils iOS qui ont été associés à ce
  gateway spécifique.

Saut par saut :

1. `iOS app -> gateway`
   - L'application s'associe d'abord au gateway via le flux d'authentification normal du Gateway.
   - Cela donne à l'application une session de nœud authentifiée ainsi qu'une session d'opérateur authentifiée.
   - La session de l'opérateur est utilisée pour appeler `gateway.identity.get`.

2. `iOS app -> relay`
   - L'application appelle les points de terminaison d'enregistrement du relai via HTTPS.
   - L'enregistrement inclut une preuve App Attest ainsi que le reçu de l'application.
   - Le relai valide l'identifiant du bundle, la preuve App Attest et le reçu Apple, et exige
     le chemin de distribution officiel/de production.
   - C'est ce qui empêche les versions locales Xcode/dev d'utiliser le relai hébergé. Une version locale peut être
     signée, mais elle ne satisfait pas la preuve de distribution Apple officielle que le relai attend.

3. `gateway identity delegation`
   - Avant l'enregistrement du relai, l'application récupère l'identité du gateway associé depuis
     `gateway.identity.get`.
   - L'application inclut cette identité de passerelle dans la charge utile d'enregistrement du relais.
   - Le relais renvoie un descripteur de relais et une autorisation d'envoi délimitée à l'enregistrement qui sont délégués à
     cette identité de passerelle.

4. `gateway -> relay`
   - La passerelle stocke le descripteur de relais et l'autorisation d'envoi provenant de `push.apns.register`.
   - Sur `push.test`, les réveils de reconnexion et les incitations de réveil, la passerelle signe la demande d'envoi avec sa
     propre identité d'appareil.
   - Le relais vérifie à la fois l'autorisation d'envoi stockée et la signature de la passerelle par rapport à l'identité
     de passerelle déléguée lors de l'enregistrement.
   - Une autre passerelle ne peut pas réutiliser cet enregistrement stocké, même si elle obtient d'une manière ou d'une autre le descripteur.

5. `relay -> APNs`
   - Le relais possède les identifiants APNs de production et le jeton APNs brut pour la version officielle.
   - La passerelle ne stocke jamais le jeton APNs brut pour les versions officielles prises en charge par le relais.
   - Le relais envoie la notification push finale à APNs au nom de la passerelle associée.

Pourquoi cette conception a été créée :

- Pour garder les identifiants APNs de production hors des passerelles des utilisateurs.
- Pour éviter de stocker des jetons APNs bruts de version officielle sur la passerelle.
- Pour autoriser l'utilisation du relais hébergé uniquement pour les versions officielles/TestFlight d'OpenClaw.
- Pour empêcher une passerelle d'envoyer des notifications de réveil aux appareils iOS appartenant à une autre passerelle.

Les versions locales/manuelles restent sur APNs direct. Si vous testez ces versions sans le relais, la
passerelle a toujours besoin d'identifiants APNs directs :

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## Chemins de découverte

### Bonjour (LAN)

Le Gateway annonce `_openclaw-gw._tcp` sur `local.`. L'application iOS les répertorie automatiquement.

### Tailnet (inter-réseau)

Si mDNS est bloqué, utilisez une zone DNS-SD monodiffusion (choisissez un domaine ; exemple : `openclaw.internal.`) et le DNS divisé Tailscale.
Voir [Bonjour](/fr/gateway/bonjour) pour l'exemple CoreDNS.

### Hôte/port manuel

Dans les paramètres, activez **Hôte manuel** et entrez l'hôte de la passerelle + le port (par défaut `18789`).

## Canvas + A2UI

Le nœud iOS affiche une vue Canvas WKWebView. Utilisez `node.invoke` pour le contrôler :

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notes :

- L'hôte de canvas Gateway sert `/__openclaw__/canvas/` et `/__openclaw__/a2ui/`.
- Il est servi par le serveur HTTP Gateway (même port que `gateway.port`, par défaut `18789`).
- Le nœud iOS navigue automatiquement vers A2UI lors de la connexion lorsqu'une URL d'hôte de canvas est annoncée.
- Revenez à l'échafaudage intégré avec `canvas.navigate` et `{"url":""}`.

### Évaluation / instantané Canvas

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Réveil vocal + mode talk

- Le réveil vocal et le mode talk sont disponibles dans les paramètres.
- iOS peut suspendre l'audio en arrière-plan ; considérez les fonctions vocales comme « best-effort » (au mieux) lorsque l'application n'est pas active.

## Erreurs courantes

- `NODE_BACKGROUND_UNAVAILABLE` : amenez l'application iOS au premier plan (les commandes canvas/caméra/écran le nécessitent).
- `A2UI_HOST_NOT_CONFIGURED` : la Gateway n'a pas annoncé d'URL d'hôte de canvas ; vérifiez `canvasHost` dans la [configuration Gateway](/fr/gateway/configuration).
- L'invite d'appairage n'apparaît jamais : exécutez `openclaw devices list` et approuvez manuellement.
- La reconnexion échoue après réinstallation : le jeton d'appairage du trousseau a été effacé ; ré-appariez le nœud.

## Documentation connexe

- [Appairage](/fr/channels/pairing)
- [Discovery](/fr/gateway/discovery)
- [Bonjour](/fr/gateway/bonjour)

import fr from '/components/footer/fr.mdx';

<fr />
