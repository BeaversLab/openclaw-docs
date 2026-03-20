---
summary: "Premier flux de configuration pour OpenClaw (application macOS)"
read_when:
  - Conception de l'assistant d'onboarding macOS
  - Mise en œuvre de l'authentification ou de la configuration de l'identité
title: "Onboarding (application macOS)"
sidebarTitle: "Onboarding : application macOS"
---

# Onboarding (application macOS)

Ce document décrit le flux de configuration actuel lors de la première exécution. L'objectif est une
expérience fluide dès le premier jour (« jour 0 ») : choisir l'emplacement d'exécution du Gateway, connecter l'authentification, exécuter l'assistant
et laisser l'agent s'initialiser.
Pour un aperçu général des parcours d'onboarding, voir [Vue d'ensemble de l'onboarding](/fr/start/onboarding-overview).

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
<Step title="Bienvenue et avis de sécurité">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

Modèle de confiance de sécurité :

- Par défaut, OpenClaw est un agent personnel : une seule limite d'opérateur de confiance.
- Les configurations partagées/multi-utilisateurs nécessitent un verrouillage (séparation des limites de confiance, maintien d'un accès minimal aux outils et respect de [Sécurité](/fr/gateway/security)).
- L'onboarding local définit désormais les nouvelles configurations sur `tools.profile: "coding"` par défaut, afin que les nouvelles installations locales conservent les outils de système de fichiers/d'exécution sans forcer le profil `full` sans restriction.
- Si des hooks/webhooks ou d'autres flux de contenu non fiables sont activés, utilisez un niveau de modèle moderne robuste et maintenez une politique d'outil stricte et un bac à sable (sandboxing).

</Step>
<Step title="Local vs Distant">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

Où le **Gateway** s'exécute-t-il ?

- **Ce Mac (Local uniquement) :** l'onboarding peut configurer l'authentification et écrire les informations d'identification
  localement.
- **Distant (via SSH/Tailnet) :** l'onboarding ne configure **pas** l'authentification locale ;
  les informations d'identification doivent exister sur l'hôte de la passerelle.
- **Configurer ultérieurement :** ignorer la configuration et laisser l'application non configurée.

<Tip>
**Conseil d'authentification Gateway :**

- L'assistant génère désormais un **jeton** même pour la boucle locale, donc les clients WS locaux doivent s'authentifier.
- Si vous désactivez l'authentification, tout processus local peut se connecter ; utilisez cela uniquement sur des machines entièrement fiables.
- Utilisez un **jeton** pour l'accès multi-machine ou les liaisons non bouclées.

</Tip>
</Step>
<Step title="Permissions">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

L'onboarding demande les autorisations TCC nécessaires pour :

- Automation (AppleScript)
- Notifications
- Accessibilité
- Enregistrement d'écran
- Microphone
- Reconnaissance vocale
- Caméra
- Position

</Step>
<Step title="CLI">
  <Info>Cette étape est facultative</Info>
  L'application peut installer la CLI globale `openclaw` via npm/pnpm afin que les
  workflows de terminal et les tâches launchd fonctionnent immédiatement.
</Step>
<Step title="Onboarding Chat (session dédiée)">
  Après la configuration, l'application ouvre une session de chat d'onboarding dédiée afin que l'agent puisse
  se présenter et guider les étapes suivantes. Cela permet de séparer les instructions de premier
  démarrage de votre conversation normale. Voir [Bootstrapping](/fr/start/bootstrapping) pour
  savoir ce qui se passe sur l'hôte de passerelle lors de la première exécution de l'agent.
</Step>
</Steps>

import fr from "/components/footer/fr.mdx";

<fr />
