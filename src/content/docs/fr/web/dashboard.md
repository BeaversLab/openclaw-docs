---
summary: "Accès et authentification au tableau de bord du Gateway (Interface de contrôle)"
read_when:
  - Changing dashboard authentication or exposure modes
title: "Tableau de bord"
---

Le tableau de bord Gateway est l'interface de contrôle du navigateur servie à `/` par défaut
(remplaçable par `gateway.controlUi.basePath`).

Ouverture rapide (Gateway local) :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))
- Avec `gateway.tls.enabled: true`, utilisez `https://127.0.0.1:18789/` et
  `wss://127.0.0.1:18789` pour le point de terminaison WebSocket.

Références clés :

- [Control UI](/fr/web/control-ui) pour l'utilisation et les fonctionnalités de l'interface utilisateur.
- [Tailscale](Tailscale/en/gateway/tailscale) pour l'automatisation Serve/Funnel.
- [Web surfaces](/fr/web) pour les modes de liaison et les notes de sécurité.

L'authentification est appliquée lors de la poignée de main WebSocket via le chemin d'authentification de la passerelle configuré :

- `connect.params.auth.token`
- `connect.params.auth.password`
- En-têtes d'identité Tailscale Serve lorsque `gateway.auth.allowTailscale: true`
- en-têtes d'identité de proxy de confiance lorsque `gateway.auth.mode: "trusted-proxy"`

Voir `gateway.auth`Gateway dans [Gateway configuration](/fr/gateway/configuration).

Note de sécurité : l'interface de contrôle est une **surface d'administration** (chat, configuration, approbations d'exécution).
Ne l'exposez pas publiquement. L'interface conserve les jetons de l'URL du tableau de bord dans sessionStorage
pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée, et les supprime de l'URL après le chargement.
Privilégiez localhost, Tailscale Serve, ou un tunnel SSH.

## Accès rapide (recommandé)

- Après l'onboarding, la CLI ouvre automatiquement le tableau de bord et imprime un lien propre (sans jeton).
- Rouvrir à tout moment : `openclaw dashboard` (copie le lien, ouvre le navigateur si possible, affiche un indice SSH sans tête).
- Si la remise via le presse-papiers et le navigateur échoue, `openclaw dashboard` imprime toujours
  l'URL propre et vous indique d'utiliser le jeton de `OPENCLAW_GATEWAY_TOKEN` ou
  `gateway.auth.token` comme clé de fragment d'URL `token` ; il n'imprime pas les valeurs
  des jetons dans les journaux.
- Si l'interface utilisateur demande une authentification par secret partagé, collez le jeton ou
  le mot de passe configuré dans les paramètres du Control UI.

## Auth basics (local vs remote)

- **Localhost** : ouvrir `http://127.0.0.1:18789/`.
- **Gateway TLS** : lorsque Gateway`gateway.tls.enabled: true`, les liens du tableau de bord/état utilisent
  `https://` et les liens WebSocket du Control UI utilisent `wss://`.
- **Shared-secret token source** : `gateway.auth.token` (ou
  `OPENCLAW_GATEWAY_TOKEN`) ; `openclaw dashboard` peut le transmettre via fragment d'URL
  pour un amorçage unique, et le Control UI le conserve dans sessionStorage pour la
  session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée au lieu de localStorage.
- Si `gateway.auth.token` est géré par SecretRef, `openclaw dashboard`
  imprime/copie/ouvre par conception une URL sans jeton. Cela évite d'exposer
  des jetons gérés en externe dans les journaux du shell, l'historique du presse-papiers ou les arguments de
  lancement du navigateur.
- Si `gateway.auth.token` est configuré en tant que SecretRef et n'est pas résolu dans votre
  shell actuel, `openclaw dashboard` imprime toujours une URL sans jeton ainsi que
  des instructions actionnables pour la configuration de l'authentification.
- **Shared-secret password** : utilisez le `gateway.auth.password` configuré (ou
  `OPENCLAW_GATEWAY_PASSWORD`). Le tableau de bord ne persiste pas les mots de passe
  après un rechargement.
- **Modes porteurs d'identité** : Tailscale Serve peut satisfaire l'authentification UI de contrôle/WebSocket via les en-têtes d'identité lorsque Tailscale`gateway.auth.allowTailscale: true`, et un proxy inverse sensible à l'identité et non bouclé peut satisfaire `gateway.auth.mode: "trusted-proxy"`. Dans ces modes, le tableau de bord n'a pas besoin d'un secret partagé collé pour le WebSocket.
- **Pas localhost** : utilisez Tailscale Serve, une liaison de secret partagé non bouclée, un proxy inverse sensible à l'identité non bouclé avec Tailscale`gateway.auth.mode: "trusted-proxy"`, ou un tunnel SSH. Les API HTTP utilisent toujours l'authentification par secret partagé, sauf si vous exécutez intentionnellement `gateway.auth.mode: "none"` à entrée privée ou l'authentification HTTP de proxy approuvé. Voir [Surfaces Web](/fr/web).

<a id="if-you-see-unauthorized-1008"></a>

## Si vous voyez "unauthorized" / 1008

- Assurez-vous que la passerelle est accessible (local : `openclaw status` ; distant : tunnel SSH `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`).
- Pour `AUTH_TOKEN_MISMATCH`, les clients peuvent effectuer une nouvelle tentative approuvée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative. Cette nouvelle tentative avec jeton mis en cache réutilise les étendues approuvées mises en cache du jeton ; les appelants avec `deviceToken` explicite / `scopes` explicite conservent leur ensemble d'étendues demandées. Si l'authentification échoue toujours après cette nouvelle tentative, résolvez manuellement la dérive du jeton.
- En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- Sur le chemin asynchrone de l'UI de contrôle Tailscale Serve, les tentatives échouées pour le même Tailscale`{scope, ip}` sont sérialisées avant que le limiteur d'authentification échouée ne les enregistre, de sorte que la deuxième mauvaise nouvelle tentative simultanée peut déjà afficher `retry later`.
- Pour les étapes de réparation de la dérive de jeton, suivez la [Liste de contrôle de récupération de la dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist).
- Récupérez ou fournissez le secret partagé à partir de l'hôte de la passerelle :
  - Jeton : `openclaw config get gateway.auth.token`
  - Mot de passe : résolvez le `gateway.auth.password` configuré ou
    `OPENCLAW_GATEWAY_PASSWORD`
  - Jeton géré par SecretRef : résolvez le fournisseur de secret externe ou exportez `OPENCLAW_GATEWAY_TOKEN` dans ce shell, puis relancez `openclaw dashboard`
  - Aucun secret partagé configuré : `openclaw doctor --generate-gateway-token`
- Dans les paramètres du tableau de bord, collez le jeton ou le mot de passe dans le champ d'authentification,
  puis connectez-vous.
- Le sélecteur de langue de l'interface utilisateur se trouve dans **Aperçu -> Accès Gateway -> Langue**.
  Il fait partie de la carte d'accès, et non de la section Apparence.

## Connexes

- [Interface de contrôle](/fr/web/control-ui)
- [WebChat](/fr/web/webchat)
