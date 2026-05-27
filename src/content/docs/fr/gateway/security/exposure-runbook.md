---
summary: "Liste de contrôle préalable et de retour en arrière avant d'exposer un OpenClaw Gateway au-delà du bouclage (loopback)"
title: "Manuel d'exposition de Gateway"
sidebarTitle: "Manuel d'exposition"
read_when:
  - Exposing the Gateway over LAN, tailnet, Tailscale Serve, Funnel, or a reverse proxy
  - Reviewing a deployment before allowing real messaging users
  - Rolling back a risky remote access or DM configuration
---

<Warning>N'exposez le Gateway qu'une fois que vous pouvez expliquer qui peut l'atteindre, comment ils sont authentifiés, quels agents ils peuvent déclencher et quels outils ces agents peuvent utiliser. En cas de doute, revenez à un accès en bouclage (loopback) uniquement et relancez l'audit.</Warning>

Ce manuel transforme les directives plus larges [Sécurité](/fr/gateway/security) en une
liste de contrôle pour l'opérateur concernant l'exposition de l'accès à distance et de la messagerie.

## Choisir le modèle d'exposition

Privilégiez le modèle le plus étroit qui satisfait au flux de travail.

| Modèle                                | Recommandé lorsque                                                | Contrôles requis                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bouclage (loopback) + tunnel SSH      | Usage personnel, accès administrateur, débogage                   | Garder `gateway.bind: "loopback"` et tunnel `127.0.0.1:18789`                                                                                       |
| Bouclage (loopback) + Tailscale Serve | Accès personnel au tailnet pour l'interface de contrôle/WebSocket | Garder le Gateway en bouclage (loopback) uniquement ; s'appuyer uniquement sur les en-têtes d'identité Tailscale pour les surfaces prises en charge |
| Liaison Tailnet/LAN                   | Réseau privé dédié avec appareils connus                          | Authentification du Gateway, liste d'autorisation de pare-feu, aucune redirection de port publique                                                  |
| Proxy inverse approuvé                | SSO/OIDC de l'organisation devant le Gateway                      | Authentification `trusted-proxy`, `trustedProxies` strict, règles de réécriture/suppression d'en-têtes, utilisateurs autorisés explicites           |
| Internet public                       | Déploiements rares et à haut risque                               | Proxy sensible à l'identité, TLS, limites de débit, listes d'autorisation strictes, sessions non principales (sandboxed)                            |

Évitez la redirection de port publique directe vers le Gateway. Si vous avez besoin d'un accès public,
placez un proxy sensible à l'identité devant lui et faites du proxy le seul chemin
réseau vers le Gateway.

## Inventaire préalable

Enregistrez ces éléments avant de modifier la liaison, le proxy, Tailscale ou la stratégie de canal :

- Hôte du Gateway, utilisateur de l'OS et répertoire d'état.
- URL du Gateway et mode de liaison.
- Mode d'authentification, source du jeton/mot de passe ou source d'identité du proxy de confiance.
- Tous les canaux activés et s'ils acceptent les DMs, les groupes ou les webhooks.
- Agents accessibles par des expéditeurs non locaux.
- Profil d'outil, mode bac à sable et stratégie d'outil élevé pour chaque agent accessible.
- Informations d'identification externes disponibles pour ces agents.
- Emplacement de sauvegarde pour `~/.openclaw/openclaw.json` et les informations d'identification.

Si plus d'une personne peut envoyer un message au bot, considérez cela comme une autorisation d'outil déléguée partagée, et non comme une isolation d'hôte par utilisateur.

## Vérifications de référence

Exécutez-les avant d'ouvrir l'accès :

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

Résolvez d'abord les résultats critiques. Les avertissements peuvent être acceptables uniquement lorsqu'ils sont intentionnels et documentés pour le déploiement.

Pour la validation du CLI distant, transmettez explicitement les informations d'identification :

```bash
openclaw gateway probe --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

Ne supposez pas que les informations d'identification de la configuration locale s'appliquent à une URL distante explicite.

## Référence minimale sûre

Utilisez cette forme comme point de départ pour les déploiements exposés :

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

Élargissez ensuite un contrôle à la fois. Par exemple, ajoutez une liste d'autorisation de canal spécifique avant d'activer les outils capables d'écriture, ou activez un proxy inverse avant d'accepter le trafic distant de l'interface de contrôle.

La référence stricte `exec.security: "deny"` bloque tous les appels exec, y compris les diagnostics bénins. Si des diagnostics ou des commandes à faible risque sont nécessaires, assouplissez cela uniquement après avoir choisi les expéditeurs, agents, commandes et mode d'approbation spécifiques qui correspondent à votre modèle de menace.

## Exposition des DMs et des groupes

Les canaux de messagerie sont des surfaces d'entrée non fiables. Avant d'autoriser les DMs ou les groupes :

- Préférez `dmPolicy: "pairing"` ou des listes strictes `allowFrom`.
- Évitez `dmPolicy: "open"` sauf si chaque expéditeur est de confiance.
- Ne combinez pas les listes d'autorisation `"*"` avec un accès étendu aux outils.
- Exigez des mentions dans les groupes, sauf si la salle est étroitement contrôlée.
- Utilisez `session.dmScope: "per-channel-peer"` lorsque plusieurs personnes peuvent envoyer un DM au bot.
- Acheminez les canaux partagés vers des agents avec des outils minimaux et aucune information d'identification personnelle.

Le jumelage approuve l'expéditeur à déclencher le bot. Cela ne fait pas de cet expéditeur une limite de sécurité hôte distincte.

## Vérifications du proxy inverse

Pour les proxys conscients de l'identité :

- Le proxy doit authentifier les utilisateurs avant de transmettre au Gateway.
- L'accès direct au port du Gateway doit être bloqué par un pare-feu ou une stratégie réseau.
- `gateway.trustedProxies` ne doit contenir que les IP sources du proxy.
- Le proxy doit supprimer ou écraser les en-têtes d'identité et de transfert fournis par le client.
- `gateway.auth.trustedProxy.allowUsers` doit lister les utilisateurs attendus lorsque le proxy dessert plus d'un public.
- Le mode proxy de bouclage sur le même hôte doit utiliser `allowLoopback` uniquement lorsque les processus locaux sont approuvés et que le proxy possède les en-têtes d'identité.

Exécutez `openclaw security audit --deep` après les modifications du proxy. Les résultats de trusted-proxy sont
volontairement à fort signal car le proxy devient la limite d'authentification.

## Examen des outils et du bac à sable

Avant d'exposer un agent aux expéditeurs distants :

- Confirmez quelles sessions s'exécutent sur l'hôte par rapport au bac à sable.
- Refusez ou exigez une approbation pour l'exécution sur l'hôte.
- Gardez les outils élevés désactivés, sauf si un expéditeur spécifique et approuvé en a besoin.
- Évitez les outils navigateur, canvas, node, cron, gateway et session-spawn pour les surfaces de messagerie ouvertes ou semi-ouvertes.
- Gardez les montages de liaison étroits et évitez les chemins d'identification, personnels, le socket Docker et les chemins système.
- Utilisez des passerelles, des utilisateurs du système d'exploitation ou des hôtes distincts pour les limites de confiance matériellement différentes.

Si les utilisateurs distants ne sont pas entièrement approuvés, l'isolement doit provenir de déploiements
séparés, et pas seulement des invites ou des étiquettes de session.

## Validation après modification

Après chaque modification d'exposition :

1. Réexécutez `openclaw security audit --deep`.
2. Testez une connexion autorisée réussie.
3. Testez qu'un expéditeur non autorisé ou une session de navigateur est refusé.
4. Confirmez que les journaux expurgent les secrets.
5. Confirmez que le routage DM/groupe atteint uniquement l'agent prévu.
6. Confirmez que les outils à fort impact demandent une approbation ou sont refusés.
7. Documentez les avertissements résiduels acceptés.

Ne passez pas à la modification d'exposition suivante tant que la actuelle n'est pas comprise.

## Plan de retour en arrière

Si le Gateway est peut-être surexposé :

```json5
{
  gateway: {
    bind: "loopback",
  },
  channels: {
    whatsapp: { dmPolicy: "disabled" },
    telegram: { dmPolicy: "disabled" },
    discord: { dmPolicy: "disabled" },
    slack: { dmPolicy: "disabled" },
  },
  tools: {
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

Alors :

1. Arrêtez le transfert public, Tailscale Funnel ou les routes de proxy inverse.
2. Faites tourner les jetots/mots de passe du Gateway et les informations d'identification d'intégration affectées.
3. Supprimez `"*"` et les expéditeurs inattendus des listes d'autorisation.
4. Examinez les journaux d'audit récents, l'historique d'exécution, les appels d'outils et les modifications de configuration.
5. Réexécutez `openclaw security audit --deep`.
6. Réactivez l'accès avec le modèle le plus restrictif qui satisfait le flux de travail.

## Liste de vérification

- Le Gateway reste en boucle locale (loopback-only) sauf s'il existe une raison documentée.
- L'accès non-boucle locale dispose d'une authentification, d'un pare-feu et d'aucune route publique directe.
- Les déploiements de proxy de confiance disposent de contrôles stricts sur les IP et les en-têtes du proxy.
- Les DMs utilisent l'appairage ou des listes d'autorisation, et non un accès ouvert par défaut.
- Les groupes nécessitent des mentions ou des listes d'autorisation explicites.
- Les canaux partagés n'atteignent pas les identifiants personnels.
- Les sessions non principales s'exécutent en mode bac à sable (sandbox).
- L'exécution sur l'hôte et les outils avec élévation de privilèges sont refusés ou soumis à une approbation.
- Les journaux masquent les secrets.
- Les constatations critiques de l'audit sont résolues.
- Les étapes de retour arrière (rollback) sont testées et documentées.
