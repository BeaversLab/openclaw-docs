---
summary: "Assistant d'intégration CLI : configuration guidée pour la passerelle, l'espace de travail, les canaux et les compétences"
read_when:
  - Running or configuring the onboarding wizard
  - Setting up a new machine
title: "Assistant d'intégration (CLI)"
sidebarTitle: "Intégration : CLI"
---

# Assistant d'intégration (CLI)

L'assistant d'intégration est la méthode **recommandée** pour configurer OpenClaw sur macOS,
Linux ou Windows (via WSL2 ; fortement recommandé).
Il configure une passerelle locale ou une connexion à une passerelle distante, ainsi que les canaux, les compétences
et les valeurs par défaut de l'espace de travail dans un flux guidé unique.

```bash
openclaw onboard
```

<Info>
  Premier chat le plus rapide : ouvrez l'interface de contrôle (aucune configuration de canal
  nécessaire). Exécutez `openclaw dashboard` et discutez dans le navigateur. Documentation :
  [Tableau de bord](/fr/web/dashboard).
</Info>

Pour reconfigurer plus tard :

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
  `--json` n'implique pas le mode non interactif. Pour les scripts, utilisez `--non-interactive`.
</Note>

<Tip>
  L'assistant d'intégration comprend une étape de recherche web où vous pouvez choisir un
  fournisseur (Perplexity, Brave, Gemini, Grok ou Kimi) et coller votre clé API afin que l'agent
  puisse utiliser `web_search`. Vous pouvez également configurer cela plus tard avec `openclaw
  configure --section web`. Documentation : [Outils web](/fr/tools/web).
</Tip>

## Démarrage rapide vs Avancé

L'assistant commence par **Démarrage rapide** (valeurs par défaut) ou **Avancé** (contrôle total).

<Tabs>
  <Tab title="QuickStart (défauts)">
    - Passerelle locale (boucle locale) - Espace de travail par défaut (ou espace de travail
    existant) - Port de la Gateway **18789** - Authentification de la Gateway par **Jeton**
    (auto‑généré, même en boucle locale) - Stratégie d'outil par défaut pour les nouvelles
    configurations locales : `tools.profile: "coding"` (le profil explicite existant est préservé) -
    Isolement des DM par défaut : l'onboarding local écrit `session.dmScope: "per-channel-peer"` si
    non défini. Détails : [Référence de l'CLI
    Onboarding](/fr/start/wizard-cli-reference#outputs-and-internals) - Exposition Tailscale
    **Désactivée** - Les DM Telegram + WhatsApp sont par défaut en **liste blanche** (vous serez
    invité à entrer votre numéro de téléphone)
  </Tab>
  <Tab title="Avancé (contrôle total)">
    - Expose chaque étape (mode, espace de travail, passerelle, canaux, démon, compétences).
  </Tab>
</Tabs>

## Ce que l'assistant configure

**Le mode local (par défaut)** vous guide à travers ces étapes :

1. **Modèle/Auth** — choisissez n'importe quel flux de fournisseur/authentification pris en charge (clé API, OAuth, ou jeton de configuration), y compris le Fournisseur Personnalisé
   (compatible OpenAI, compatible Anthropic, ou détection automatique Inconnue). Choisissez un modèle par défaut.
   Remarque de sécurité : si cet agent exécutera des outils ou traitera le contenu des webhooks/hooks, préférez le modèle le plus récent et le plus robuste disponible et gardez la stratégie d'outil stricte. Les niveaux plus faibles ou plus anciens sont plus faciles à injecter via des invites.
   Pour les exécutions non interactives, `--secret-input-mode ref` stocke des références basées sur des variables d'environnement dans les profils d'authentification au lieu des valeurs de clé API en clair.
   En mode non interactif `ref`, la variable d'environnement du fournisseur doit être définie ; le passage de drapeaux de clé en ligne sans cette variable d'environnement échoue rapidement.
   Dans les exécutions interactives, le choix du mode de référence secrète vous permet de pointer soit vers une variable d'environnement, soit vers une référence de fournisseur configurée (`file` ou `exec`), avec une validation préalable rapide avant l'enregistrement.
2. **Workspace** — Emplacement des fichiers de l'agent (par défaut `~/.openclaw/workspace`). Initialise les fichiers d'amorçage.
3. **Gateway** — Port, adresse de liaison, mode d'authentification, exposition Tailscale.
   En mode jeton interactif, choisissez le stockage en texte clair par défaut ou optez pour SecretRef.
   Chemin SecretRef pour jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
4. **Channels** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles ou iMessage.
5. **Daemon** — Installe un LaunchAgent (macOS) ou une unité utilisateur systemd (Linux/WSL2).
   Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas le jeton résolu dans les métadonnées d'environnement du service de supervision.
   Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'installation du démon est bloquée avec des conseils exploitables.
   Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
6. **Health check** — Démarre le Gateway et vérifie qu'il fonctionne.
7. **Skills** — Installe les compétences recommandées et les dépendances facultatives.

<Note>
  Le fait de relancer l'assistant ne supprime **rien** à moins que vous ne choisissiez explicitement
  **Reset** (ou ne passiez `--reset`). La commande CLI `--reset` concerne par défaut la
  configuration, les identifiants et les sessions ; utilisez `--reset-scope full` pour inclure
  l'espace de travail. Si la configuration n'est pas valide ou contient des clés héritées,
  l'assistant vous demande d'exécuter d'abord `openclaw doctor`.
</Note>

Le **Remote mode** ne configure que le client local pour se connecter à un Gateway situé ailleurs.
Il n'**installe** ou ne **modifie** rien sur l'hôte distant.

## Ajouter un autre agent

Utilisez `openclaw agents add <name>` pour créer un agent distinct avec son propre espace de travail,
sessions et profils d'authentification. L'exécution sans `--workspace` lance l'assistant.

Ce qu'il définit :

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes :

- Les espaces de travail par défaut suivent `~/.openclaw/workspace-<agentId>`.
- Ajoutez `bindings` pour acheminer les messages entrants (l'assistant peut le faire).
- Indicateurs non interactifs : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Référence complète

Pour des descriptions détaillées étape par étape et les sorties de configuration, voir
[CLI Onboarding Reference](/fr/start/wizard-cli-reference).
Pour des exemples non interactifs, voir [CLI Automation](/fr/start/wizard-cli-automation).
Pour la référence technique approfondie, incluant les détails RPC, voir
[Wizard Reference](/fr/reference/wizard).

## Documentation connexe

- Référence des commandes CLI : [`openclaw onboard`](/fr/cli/onboard)
- Aperçu de l'onboarding : [Onboarding Overview](/fr/start/onboarding-overview)
- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Rituel de premier exécution de l'agent : [Agent Bootstrapping](/fr/start/bootstrapping)

import fr from '/components/footer/fr.mdx';

<fr />
