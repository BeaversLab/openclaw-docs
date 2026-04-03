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

- [Interface de contrôle](/en/web/control-ui) pour l'utilisation et les fonctionnalités de l'interface utilisateur.
- [Tailscale](/en/gateway/tailscale) pour l'automatisation Serve/Funnel.
- [Surfaces Web](/en/web) pour les modes de liaison et les notes de sécurité.

L'authentification est appliquée lors de la négociation WebSocket via `connect.params.auth`
(jeton ou mot de passe). Voir `gateway.auth` dans [configuration du Gateway](/en/gateway/configuration).

Note de sécurité : l'interface de contrôle est une **surface d'administration** (chat, configuration, approbations d'exécution).
Ne l'exposez pas publiquement. L'interface conserve les jetons d'URL du tableau de bord dans sessionStorage
pour la session de l'onglet actuel du navigateur et l'URL Gateway sélectionnée, et les supprime de l'URL après le chargement.
Privilégiez localhost, Tailscale Serve ou un tunnel SSH.

## Accès rapide (recommandé)

- Après l'intégration, le CLI ouvre automatiquement le tableau de bord et affiche un lien propre (sans jeton).
- Rouvrir à tout moment : `openclaw dashboard` (copie le lien, ouvre le navigateur si possible, affiche un indice SSH sans interface).
- Si l'interface demande une authentification, collez le jeton depuis `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de l'interface de contrôle.

## Notions de base sur les jetons (local vs distant)

- **Localhost** : ouvrir `http://127.0.0.1:18789/`.
- **Source du jeton** : `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) ; `openclaw dashboard` peut le transmettre via un fragment d'URL pour un démarrage unique, et l'interface de contrôle le conserve dans sessionStorage pour la session de l'onglet actuel et l'URL de la passerelle sélectionnée au lieu de localStorage.
- Si `gateway.auth.token` est géré par SecretRef, `openclaw dashboard` imprime/copie/ouvre par conception une URL sans jeton. Cela évite d'exposer des jetons gérés en externe dans les journaux du shell, l'historique du presse-papiers ou les arguments de lancement du navigateur.
- Si `gateway.auth.token` est configuré en tant que SecretRef et n'est pas résolu dans votre shell actuel, `openclaw dashboard` imprime toujours une URL sans jeton ainsi que des instructions d'configuration de l'authentification exploitables.
- **Pas localhost** : utilisez Tailscale Serve (sans jeton pour l'interface de contrôle/WebSocket si `gateway.auth.allowTailscale: true`, suppose un hôte de passerelle approuvé ; les API HTTP nécessitent toujours un jeton/mot de passe), une liaison tailnet avec un jeton, ou un tunnel SSH. Voir [Surfaces Web](/en/web).

<a id="if-you-see-unauthorized-1008"></a>

## Si vous voyez "unauthorized" / 1008

- Assurez-vous que la passerelle est accessible (locale : `openclaw status` ; distante : tunnel SSH `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`).
- Pour `AUTH_TOKEN_MISMATCH`, les clients peuvent effectuer une nouvelle tentative de confiance avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative. Si l'authentification échoue toujours après cette nouvelle tentative, résolvez manuellement la dérive du jeton.
- Pour les étapes de réparation de la dérive du jeton, suivez la [Liste de contrôle de récupération de la dérive du jeton](/en/cli/devices#token-drift-recovery-checklist).
- Récupérez ou fournissez le jeton à partir de l'hôte de la passerelle :
  - Configuration en texte brut : `openclaw config get gateway.auth.token`
  - Configuration gérée par SecretRef : résolvez le fournisseur de secrets externe ou exportez `OPENCLAW_GATEWAY_TOKEN` dans ce shell, puis réexécutez `openclaw dashboard`
  - Aucun jeton configuré : `openclaw doctor --generate-gateway-token`
- Dans les paramètres du tableau de bord, collez le jeton dans le champ d'authentification, puis connectez-vous.
