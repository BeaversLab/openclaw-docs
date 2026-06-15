---
summary: "Application nœud iOS : connexion au Gateway, appairage, canvas et dépannage"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "Application iOS"
---

Disponibilité : les builds de l'application iPhone sont distribués via les canaux Apple lorsqu'ils sont activés pour une version. Les builds de développement local peuvent également être exécutés à partir du code source.

## Ce qu'elle fait

- Se connecte à un Gateway via WebSocket (LAN ou tailnet).
- Expose les capacités du nœud : Canvas, capture d'écran, capture d'appareil photo, localisation, mode Talk, réveil vocal.
- Reçoit les commandes `node.invoke` et signale les événements d'état du nœud.

## Conditions requises

- Gateway exécuté sur un autre appareil (macOS, Linux ou Windows via WSL2).
- Chemin réseau :
  - Même LAN via Bonjour, **ou**
  - Tailnet via DNS-SD unicast (exemple de domaine : `openclaw.internal.`), **ou**
  - Hôte/port manuel (solution de repli).

## Démarrage rapide (appairage + connexion)

1. Démarrez le Gateway :

```bash
openclaw gateway --port 18789
```

2. Dans l'application iOS, ouvrez Réglages et choisissez une passerelle découverte (ou activez Hôte manuel et entrez l'hôte/port).

3. Approuvez la demande d'appairage sur l'hôte de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si l'application réessaie l'appairage avec des détails d'authentification modifiés (rôle/portées/clé publique),
l'ancienne demande en attente est remplacée et une nouvelle `requestId` est créée.
Exécutez `openclaw devices list` à nouveau avant l'approbation.

Optionnel : si le nœud iOS se connecte toujours depuis un sous-réseau étroitement contrôlé, vous
pouvez opter pour l'auto-approbation du nœud lors de la première connexion avec des CIDRs explicites ou des IP exactes :

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Ceci est désactivé par défaut. Cela s'applique uniquement à l'appairage `role: node` frais sans
portées demandées. L'appairage par opérateur/navigateur et tout changement de rôle, de portée, de métadonnées ou
de clé publique nécessitent toujours une approbation manuelle.

4. Vérifiez la connexion :

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push relay-based pour les builds officielles

Les builds iOS distribués officiellement utilisent le relais de push externe au lieu de publier le jeton APNs brut
vers la passerelle.

Par défaut, les builds officiels/TestFlight et les passerelles utilisent le relais hébergé sur `https://ios-push-relay.openclaw.ai`.

Les déploiements de relais personnalisés peuvent remplacer l'URL du relais de la passerelle :

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

- L'application iOS s'inscrit auprès du relais à l'aide de l'App Attest et d'une transaction d'application StoreKit JWS.
- Le relais renvoie un handle de relais opaque ainsi qu'une autorisation d'envoi délimitée à l'inscription.
- L'application iOS récupère l'identité de la passerelle associée et l'inclut dans l'inscription au relais, de sorte que l'inscription soutenue par le relais est déléguée à cette passerelle spécifique.
- L'application transmet cette inscription soutenue par le relais à la passerelle associée avec `push.apns.register`.
- La passerelle utilise cet handle de relais stocké pour `push.test`, les réveils en arrière-plan et les incitations au réveil.
- Les URL de relais de passerelle personnalisées doivent correspondre à l'URL du relais intégrée dans le build iOS officiel/TestFlight.
- Si l'application se connecte ultérieurement à une passerelle différente ou à un build avec une URL de base de relais différente, elle actualise l'inscription au relais au lieu de réutiliser l'ancienne liaison.

Ce que la passerelle n'a **pas** besoin pour ce chemin :

- Aucun jeton de relai à l'échelle du déploiement.
- Pas de clé APNs directe pour les envois soutenus par le relai officiel/TestFlight.

Flux de l'opérateur attendu :

1. Installez le build iOS officiel/TestFlight.
2. Optionnel : définissez `gateway.push.apns.relay.baseUrl` sur la passerelle uniquement lors de l'utilisation d'un déploiement de relai personnalisé.
3. Associez l'application à la passerelle et laissez-la terminer la connexion.
4. L'application publie `push.apns.register` automatiquement après avoir obtenu un jeton APNs, que la session de l'opérateur est connectée et que l'inscription au relai a réussi.
5. Ensuite, `push.test`, les réveils de reconnexion et les incitations au réveil peuvent utiliser l'inscription stockée soutenue par le relai.

## Balises de présence en arrière-plan

Lorsque iOS réveille l'application pour une notification silencieuse, une mise à jour en arrière-plan ou un événement de localisation significatif, l'application
tente une courte reconnexion du nœud puis appelle iOS`node.event` avec `event: "node.presence.alive"`.
Le gateway enregistre cela comme `lastSeenAtMs`/`lastSeenReason` sur les métadonnées du nœud/appareil associé uniquement
une fois que l'identité de l'appareil nœud authentifiée est connue.

L'application considère qu'un réveil en arrière-plan est enregistré avec succès uniquement lorsque la réponse du gateway inclut
`handled: true`. Les anciennes gateways peuvent accuser réception de `node.event` avec `{ "ok": true }` ; cette réponse est
compatible mais ne compte pas comme une mise à jour durable de la dernière vue.

Note de compatibilité :

- `OPENCLAW_APNS_RELAY_BASE_URL` fonctionne toujours comme une substitution temporaire de variable d'environnement pour le gateway.
- `OPENCLAW_PUSH_RELAY_BASE_URL`iOS fonctionne toujours comme une substitution temporaire de variable d'environnement pour les versions officielles/TestFlight iOS.

## Flux d'authentification et de confiance

Le relais existe pour faire respecter deux contraintes que l'APNs direct sur le gateway ne peut pas fournir pour
les versions officielles iOS :

- Seules les versions authentiques d'OpenClaw iOS distribuées via Apple peuvent utiliser le relais hébergé.
- Un gateway ne peut envoyer de notifications relayées que pour les appareils iOS qui ont été associés à ce
  gateway spécifique.

Saut par saut :

1. `iOS app -> gateway`
   - L'application s'associe d'abord au gateway via le flux d'authentification normal du Gateway.
   - Cela confère à l'application une session de nœud authentifiée ainsi qu'une session d'opérateur authentifiée.
   - La session d'opérateur est utilisée pour appeler `gateway.identity.get`.

2. `iOS app -> relay`
   - L'application appelle les points de terminaison d'enregistrement du relais via HTTPS.
   - L'enregistrement comprend une preuve App Attest ainsi qu'un JWS de transaction d'application StoreKit.
   - Le relais valide l'ID de bundle, la preuve App Attest et la preuve de distribution Apple, et exige
     le canal de distribution officiel/production.
   - C'est ce qui empêche les versions locales Xcode/dev d'utiliser le relais hébergé. Une version locale peut être
     signée, mais elle ne satisfait pas la preuve de distribution Apple officielle que le relais attend.

3. `gateway identity delegation`
   - Avant l'enregistrement au relais, l'application récupère l'identité de la passerelle associée depuis
     `gateway.identity.get`.
   - L'application inclut cette identité de passerelle dans la charge utile de l'enregistrement au relais.
   - Le relais renvoie un gestionnaire de relais et une autorisation d'envoi limitée à l'enregistrement qui sont délégués à
     cette identité de passerelle.

4. `gateway -> relay`
   - La passerelle stocke le gestionnaire de relais et l'autorisation d'envie provenant de `push.apns.register`.
   - Sur `push.test`, les réveils de reconnexion et les poussées de réveil, la passerelle signe la demande d'envoi avec sa
     propre identité d'appareil.
   - Le relais vérifie à la fois l'autorisation d'envoi stockée et la signature de la passerelle par rapport à l'identité
     de passerelle déléguée lors de l'enregistrement.
   - Une autre passerelle ne peut pas réutiliser cet enregistrement stocké, même si elle parvient à obtenir le gestionnaire.

5. `relay -> APNs`
   - Le relais possède les identifiants APNs de production et le jeton APNs brut pour la version officielle.
   - La passerelle ne stocke jamais le jeton APNs brut pour les versions officielles prises en charge par le relais.
   - Le relais envoie la notification push finale à APNs au nom de la passerelle associée.

Pourquoi cette conception a été créée :

- Pour garder les identifiants APNs de production hors des passerelles des utilisateurs.
- Pour éviter de stocker les jetons APNs bruts des versions officielles sur la passerelle.
- Pour autoriser l'utilisation du relais hébergé uniquement pour les versions officielles/TestFlight OpenClaw.
- Pour empêcher une passerelle d'envoyer des réveils push aux appareils iOS appartenant à une autre passerelle.

Les versions locales/manuelles restent sur APNs directes. Si vous testez ces versions sans le relais, la
passerelle a toujours besoin d'identifiants APNs directs :

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

Ce sont des variables d'environnement d'exécution de l'hôte de passerelle, et non des paramètres Fastlane. `apps/ios/fastlane/.env` ne stocke que
l'authentification App Store Connect / TestFlight telle que `ASC_KEY_ID` et `ASC_ISSUER_ID` ; il ne configure pas
la livraison APNs directe pour les versions iOS locales.

Stockage de l'hôte de passerelle recommandé :

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

L'application iOS parcourt iOS`_openclaw-gw._tcp` sur `local.` et, lorsqu'elle est configurée, le même domaine de découverte DNS-SD étendu. Les passerelles du même réseau local apparaissent automatiquement via `local.` ; la découverte inter-réseaux peut utiliser le domaine étendu configuré sans modifier le type de balise.

### Tailnet (inter-réseaux)

Si mDNS est bloqué, utilisez une zone DNS-SD unicast (choisissez un domaine ; exemple :
`openclaw.internal.`TailscaleBonjour) et le DNS partagé Tailscale.
Voir [Bonjour](/fr/gateway/bonjour) pour l'exemple CoreDNS.

### Hôte/port manuel

Dans Réglages, activez **Hôte manuel** et entrez l'hôte de la passerelle + le port (par défaut `18789`).

## Canvas + A2UI

Le nœud iOS affiche un canvas WKWebView. Utilisez `node.invoke` pour le piloter :

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notes :

- L'hôte de canvas Gateway sert `/__openclaw__/canvas/` et `/__openclaw__/a2ui/`.
- Il est servi par le serveur HTTP Gateway (même port que `gateway.port`, par défaut `18789`).
- Le nœud iOS navigue automatiquement vers A2UI lors de la connexion lorsqu'une URL d'hôte de canvas est annoncée.
- Retournez à l'échafaudage intégré avec `canvas.navigate` et `{"url":""}`.

## Relation Utilisation de l'ordinateur

L'application iOS est une surface de nœud mobile, et non un backend Codex Computer Use. Codex
Computer Use et `cua-driver mcp` contrôlent un bureau macOS local via des outils MCP ; l'application iOS expose les capacités de l'iPhone et de l'iPad via des commandes de nœud OpenClaw
telles que `canvas.*`, `camera.*`, `screen.*`, `location.*` et `talk.*`.

Les agents peuvent toujours utiliser l'application iOS via OpenClaw en invoquant des commandes de nœud, mais ces appels passent par le protocole de nœud Gateway et suivent les limites de premier plan/arrière-plan d'iOS. Utilisez [Codex Computer Use](iOSOpenClawiOS/en/plugins/codex-computer-useiOS) pour le contrôle de bureau local et cette page pour les capacités du nœud iOS.

### Évaluation / instantané Canvas

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Réveil vocal + mode conversation

- Le réveil vocal et le mode conversation sont disponibles dans les paramètres.
- Les nœuds iOS capables de conversation annoncent la capacité iOS`talk` et peuvent déclarer `talk.ptt.start`, `talk.ptt.stop`, `talk.ptt.cancel` et `talk.ptt.once`Gateway ; le Gateway autorise ces commandes push-to-talk par défaut pour les nœuds capables de conversation de confiance.
- iOS peut suspendre l'audio en arrière-plan ; traitez les fonctions vocales comme « best-effort » lorsque l'application n'est pas active.

## Erreurs courantes

- `NODE_BACKGROUND_UNAVAILABLE`iOS : amenez l'application iOS au premier plan (les commandes canvas/caméra/écran l'exigent).
- `A2UI_HOST_NOT_CONFIGURED`GatewayCanvas : le Gateway n'a pas annoncé l'URL de surface du plugin Canvas ; vérifiez `plugins.entries.canvas.config.host`Gateway dans [Configuration du Gateway](/fr/gateway/configuration).
- L'invite de jumelage n'apparaît jamais : exécutez `openclaw devices list` et approuvez manuellement.
- La reconnexion échoue après la réinstallation : le jeton de jumelage du trousseau a été effacé ; jumelez à nouveau le nœud.

## Documentation connexe

- [Jumelage](/fr/channels/pairing)
- [Discovery](/fr/gateway/discovery)
- [Bonjour](Bonjour/en/gateway/bonjour)
