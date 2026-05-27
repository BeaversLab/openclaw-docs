---
summary: "Flux de configuration du premier démarrage pour OpenClaw (application macOS)"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "Onboarding (application macOS)"
sidebarTitle: "Onboarding : application macOS"
---

Ce document décrit le processus de configuration du premier lancement **actuel**. L'objectif est une expérience fluide dès le « jour 0 » : choisir où le Gateway s'exécute, connecter l'authentification, lancer l'assistant et laisser l'agent s'initialiser.
Pour une vue d'ensemble des chemins d'intégration, voir [Vue d'ensemble de l'onboarding](/fr/start/onboarding-overview).

<Steps>
<Step title="Approuver l'avertissement macOS">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="Approve find local networks">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="Welcome and security notice">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

Modèle de confiance de sécurité :

- Par défaut, OpenClaw est un agent personnel : une limite d'opérateur de confiance.
- Les configurations partagées/multi-utilisateurs nécessitent un verrouillage (séparation des limites de confiance, accès aux outils minimal, et suivre [Sécurité](/fr/gateway/security)).
- L'onboarding local définit désormais les nouvelles configurations sur `tools.profile: "coding"` afin que les nouvelles configurations locales conservent les outils de système de fichiers/exécution sans forcer le profil non restreint `full`.
- Si des hooks/webhooks ou d'autres flux de contenu non fiables sont activés, utilisez un niveau de modèle moderne puissant et maintenez une politique d'outils/sandboxing stricte.

</Step>
<Step title="Local vs Remote">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

Où le **Gateway** s'exécute-t-il ?

- **Ce Mac (Local uniquement) :** l'onboarding peut configurer l'authentification et écrire les identifiants
  localement.
- **Distant (via SSH/Tailnet) :** l'onboarding ne configure **pas** l'authentification locale ;
  les identifiants doivent exister sur l'hôte de la passerelle. Le champ du jeton de passerelle distant
  stocke le jeton utilisé par l'application macOS pour se connecter à ce Gateway ; les valeurs `gateway.remote.token` non en clair existantes sont conservées jusqu'à ce que vous les remplaciez.
- **Configurer plus tard :** ignorez la configuration et laissez l'application non configurée.

<Tip>
**Conseil d'authentification Gateway :**

- L'assistant génère désormais un **jeton** même pour les connexions en boucle, donc les clients WS locaux doivent s'authentifier.
- Si vous désactivez l'authentification, tout processus local peut se connecter ; utilisez cela uniquement sur des machines entièrement fiables.
- Utilisez un **jeton** pour l'accès multi-machine ou les liaisons non en boucle.

</Tip>
</Step>
<Step title="Permissions">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

L'onboarding demande les autorisations TCC nécessaires pour :

- Automatisation (AppleScript)
- Notifications
- Accessibilité
- Enregistrement d'écran
- Microphone
- Reconnaissance vocale
- Caméra
- Localisation

</Step>
<Step title="CLICLI">
  <Info>Cette étape est facultative</Info>
  L'application peut installer le `openclaw`CLI CLI global via npm, pnpm ou bun.
  Elle privilégie d'abord npm, puis pnpm, puis bun si c'est le seul gestionnaire de paquets détecté.
  Pour le runtime du Gateway, Node reste la voie recommandée.
</Step>
<Step title="Onboarding Chat (dedicated session)">
  Après la configuration, l'application ouvre une session de chat d'onboarding dédiée afin que l'agent puisse
  se présenter et guider les étapes suivantes. Cela permet de séparer les instructions de premier démarrage
  de votre conversation normale. Consultez [Bootstrapping](/fr/start/bootstrapping) pour
  savoir ce qui se passe sur l'hôte de la passerelle lors de la première exécution de l'agent.
</Step>
</Steps>

## Connexes

- [Onboarding overview](/fr/start/onboarding-overview)
- [Getting started](/fr/start/getting-started)
