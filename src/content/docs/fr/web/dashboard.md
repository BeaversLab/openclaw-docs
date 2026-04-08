---
summary: "Accès et authentification au tableau de bord du Gateway (Interface de contrôle)"
read_when:
  - Changing dashboard authentication or exposure modes
title: "Tableau de bord"
---

# Tableau de bord (Interface de contrôle)

Le tableau de bord Gateway est l'interface de contrôle de navigateur servie à `/` par défaut
(remplaçable par `gateway.controlUi.basePath`).

Ouverture rapide (Gateway local) :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))

Références clés :

- [Control UI](/en/web/control-ui) pour l'utilisation et les fonctionnalités de l'interface.
- [Tailscale](/en/gateway/tailscale) pour l'automatisation Serve/Funnel.
- [Web surfaces](/en/web) pour les modes de liaison et les notes de sécurité.

L'authentification est appliquée lors de la poignée de main WebSocket via le chemin d'authentification de la passerelle configuré :

- `connect.params.auth.token`
- `connect.params.auth.password`
- En-têtes d'identité Tailscale Serve lorsque `gateway.auth.allowTailscale: true`
- En-têtes d'identité de proxy de confiance lorsque `gateway.auth.mode: "trusted-proxy"`

Voir `gateway.auth` dans [configuration du Gateway](/en/gateway/configuration).

Note de sécurité : l'interface de contrôle est une **surface d'administration** (chat, configuration, approbations d'exécution).
Ne l'exposez pas publiquement. L'interface conserve les jetons de l'URL du tableau de bord dans sessionStorage
pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée, et les supprime de l'URL après le chargement.
Privilégiez localhost, Tailscale Serve, ou un tunnel SSH.

## Accès rapide (recommandé)

- Après l'onboarding, la CLI ouvre automatiquement le tableau de bord et imprime un lien propre (sans jeton).
- Rouvrir à tout moment : `openclaw dashboard` (copie le lien, ouvre le navigateur si possible, affiche un indice SSH sans tête).
- Si l'interface demande une authentification par secret partagé, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle.

## Notions d'authentification (local vs distant)

- **Localhost** : ouvrir `http://127.0.0.1:18789/`.
- **Source du jeton de secret partagé** : `gateway.auth.token` (ou
  `OPENCLAW_GATEWAY_TOKEN`) ; `openclaw dashboard` peut le transmettre via le fragment d'URL
  pour un amorçage unique, et l'interface de contrôle le conserve dans sessionStorage pour la
  session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée au lieu de localStorage.
- Si `gateway.auth.token` est géré par SecretRef, `openclaw dashboard`
  imprime/copie/ouvre par conception une URL sans jeton. Cela évite d'exposer
  des jetons gérés en externe dans les journaux du shell, l'historique du presse-papiers ou les arguments
  de lancement du navigateur.
- Si `gateway.auth.token` est configuré en tant que SecretRef et n'est pas résolu dans votre
  shell actuel, `openclaw dashboard` imprime toujours une URL sans jeton plus
  des instructions d'installation de l'authentification exploitables.
- **Mot de passe partagé secret** : utilisez le `gateway.auth.password` configuré (ou
  `OPENCLAW_GATEWAY_PASSWORD`). Le tableau de bord ne persiste pas les mots de passe
  entre les rechargements.
- **Modes porteurs d'identité** : Tailscale Serve peut satisfaire l'authentification Control UI/WebSocket
  via les en-têtes d'identité lorsque `gateway.auth.allowTailscale: true`, et un
  proxy inverse conscient de l'identité et non en boucle locale peut satisfaire
  `gateway.auth.mode: "trusted-proxy"`. Dans ces modes, le tableau de bord n'a
  pas besoin d'un secret partagé collé pour le WebSocket.
- **Pas localhost** : utilisez Tailscale Serve, une liaison shared-secret non en boucle locale,
  un proxy inverse conscient de l'identité et non en boucle locale avec
  `gateway.auth.mode: "trusted-proxy"`, ou un tunnel SSH. Les API HTTP utilisent toujours
  l'authentification par secret partagé, sauf si vous exécutez intentionnellement
  `gateway.auth.mode: "none"` private-ingress ou une authentification HTTP trusted-proxy.
  Voir [Web surfaces](/en/web).

<a id="if-you-see-unauthorized-1008"></a>

## Si vous voyez "unauthorized" / 1008

- Assurez-vous que la passerelle est accessible (local : `openclaw status` ; distant : tunnel SSH `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`).
- Pour `AUTH_TOKEN_MISMATCH`, les clients peuvent effectuer une nouvelle tentative approuvée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de réessai. Cette nouvelle tentative avec jeton mis en cache réutilise les portées approuvées mises en cache du jeton ; les appelants `deviceToken` explicites / `scopes` explicites conservent leur ensemble de portées demandées. Si l'authentification échoue toujours après cette nouvelle tentative, résolvez manuellement la dérive des jetons.
- En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- Sur le chemin asynchrone Control UI Tailscale Serve, les tentatives échouées pour le même
  `{scope, ip}` sont sérialisées avant que le limiteur d'authentification échouée ne les enregistre, de sorte que
  la deuxième mauvaise tentative simultanée peut déjà afficher `retry later`.
- Pour les étapes de réparation de la dérive de jetons, suivez la [Checklist de récupération de dérive de jetons](/en/cli/devices#token-drift-recovery-checklist).
- Récupérez ou fournissez le secret partagé depuis l'hôte de la passerelle :
  - Jeton : `openclaw config get gateway.auth.token`
  - Mot de passe : résolvez le `gateway.auth.password` configuré ou
    `OPENCLAW_GATEWAY_PASSWORD`
  - Jeton géré par SecretRef : résolvez le fournisseur de secrets externe ou exportez `OPENCLAW_GATEWAY_TOKEN` dans ce shell, puis relancez `openclaw dashboard`
  - Aucun secret partagé configuré : `openclaw doctor --generate-gateway-token`
- Dans les paramètres du tableau de bord, collez le jeton ou le mot de passe dans le champ d'authentification, puis connectez-vous.
- Le sélecteur de langue de l'interface utilisateur se trouve dans **Overview -> Gateway Access -> Language**. Il fait partie de la carte d'accès, et non de la section Apparence.
