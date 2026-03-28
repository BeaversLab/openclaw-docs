---
summary: "Flux de configuration du premier démarrage pour OpenClaw (application macOS)"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "Onboarding (application macOS)"
sidebarTitle: "Onboarding : application macOS"
---

# Onboarding (application macOS)

Ce document décrit le flux de configuration du **premier** démarrage. L'objectif est une
expérience fluide « jour 0 » : choisir où le Gateway s'exécute, connecter l'authentification, exécuter
l'assistant et laisser l'agent s'initialiser.
Pour une vue d'ensemble des chemins d'onboarding, voir [Onboarding Overview](/fr/start/onboarding-overview).

<Steps>
<Step title="Approve macOS warning">
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

- Par défaut, OpenClaw est un agent personnel : une seule frontière d'opérateur de confiance.
- Les configurations partagées/multi-utilisateurs nécessitent un verrouillage (séparation des frontières de confiance, accès minimal aux outils et respect des [Consignes de sécurité](/fr/gateway/security)).
- L'intégration locale définit désormais les nouvelles configurations par défaut sur `tools.profile: "coding"` afin que les nouvelles installations locales conservent les outils de système de fichiers/exécution sans forcer le profil `full` sans restriction.
- Si des hooks/webhooks ou d'autres flux de contenu non fiables sont activés, utilisez un niveau de modèle moderne robuste et maintenez une politique d'outils et un bac à sable (sandboxing) stricts.

</Step>
<Step title="Local vs Remote">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

Où le **Gateway** s'exécute-t-il ?

- **Ce Mac (Local uniquement) :** l'onboarding peut configurer l'auth et écrire les informations d'identification
  localement.
- **Distant (via SSH/Tailnet) :** l'onboarding configure **pas** l'auth locale ;
  les informations d'identification doivent exister sur l'hôte de la passerelle.
- **Configurer plus tard :** ignorer la configuration et laisser l'application non configurée.

<Tip>
**Conseil d'auth du Gateway :**

- L'assistant génère désormais un **token** même pour le bouclage local (loopback), donc les clients WS locaux doivent s'authentifier.
- Si vous désactivez l'auth, tout processus local peut se connecter ; utilisez cela uniquement sur des machines entièrement fiables.
- Utilisez un **token** pour l'accès multi-machines ou les liaisons non bouclage (non-loopback).

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
<Step title="CLI">
  <Info>Cette étape est facultative</Info>
  L'application peut installer le CLI global `openclaw` via npm/pnpm afin que les flux de travail
  du terminal et les tâches launchd fonctionnent immédiatement.
</Step>
<Step title="Onboarding Chat (dedicated session)">
  Après la configuration, l'application ouvre une session de chat d'onboarding dédiée afin que l'agent puisse
  se présenter et guider les prochaines étapes. Cela permet de séparer les instructions du premier démarrage
  de votre conversation normale. Consultez [Bootstrapping](/fr/start/bootstrapping) pour
  savoir ce qui se passe sur l'hôte de la passerelle lors de la première exécution de l'agent.
</Step>
</Steps>
