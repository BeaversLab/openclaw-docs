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
<Step title="Bienvenue et avis de sécurité">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

Modèle de confiance de sécurité :

- Par défaut, OpenClaw est un agent personnel : une limite d'opérateur de confiance.
- Les configurations partagées/multi-utilisateurs nécessitent un verrouillage (séparation des limites de confiance, maintien de l'accès aux outils au minimum et respect des consignes [Sécurité](/fr/gateway/security)).
- L'onboarding local définit désormais les nouvelles configurations sur `tools.profile: "coding"` par défaut, afin que les nouvelles configurations locales conservent les outils de système de fichiers/exécution sans forcer le profil non restreint `full`.
- Si des hooks/webhooks ou d'autres flux de contenu non fiables sont activés, utilisez un niveau de modèle moderne robuste et maintenez une politique d'outil/sandboxing stricte.

</Step>
<Step title="Local vs distant">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

Où le **Gateway** s'exécute-t-il ?

- **Ce Mac (Local uniquement) :** l'onboarding peut configurer l'authentification et écrire les identifiants
  localement.
- **Distant (via SSH/Tailnet) :** l'onboarding ne configure **pas** l'authentification locale ;
  les identifiants doivent exister sur l'hôte de la passerelle.
- **Configurer plus tard :** ignorez la configuration et laissez l'application non configurée.

<Tip>
**Conseil d'authentification du Gateway :**

- L'assistant génère désormais un **jeton** même pour le bouclage local, donc les clients WS locaux doivent s'authentifier.
- Si vous désactivez l'authentification, tout processus local peut se connecter ; utilisez cela uniquement sur des machines entièrement fiables.
- Utilisez un **jeton** pour l'accès multi-machine ou les liaisons non bouclage.

</Tip>
</Step>
<Step title="Autorisations">
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
  L'application peut installer le `openclaw` CLI global via CLI, pnpm ou bun.
  Elle privilégie d'abord CLI, puis pnpm, puis bun si c'est le seul gestionnaire de packages
  détecté. Pour le runtime npm, Node reste la méthode recommandée.
</Step>
<Step title="Onboarding Chat (dedicated session)">
  Après la configuration, l'application ouvre une session de chat d'onboarding dédiée afin que l'agent puisse
  se présenter et guider les prochaines étapes. Cela permet de garder les conseils de premier démarrage séparés
  de votre conversation normale. Voir [Bootstrapping](/fr/start/bootstrapping) pour
  ce qui se passe sur l'hôte de la passerelle lors de la première exécution de l'agent.
</Step>
</Steps>
