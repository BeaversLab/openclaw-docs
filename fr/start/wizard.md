---
summary: "Onboarding CLI : configuration guidée pour la passerelle, l'espace de travail, les canaux et les compétences"
read_when:
  - Exécution ou configuration de l'onboarding CLI
  - Configuration d'une nouvelle machine
title: "Onboarding (CLI)"
sidebarTitle: "Onboarding : CLI"
---

# Onboarding (CLI)

L'onboarding CLI est la méthode **recommandée** pour configurer OpenClaw sur macOS,
Linux ou Windows (via WSL2 ; fortement recommandé).
Il configure une passerelle Gateway ou une connexion à une passerelle Gateway, ainsi que les canaux, les compétences
et les valeurs par défaut de l'espace de travail dans un flux guidé.

```bash
openclaw onboard
```

<Info>
  Premier chat le plus rapide : ouvrez l'interface de contrôle (Control UI) (aucune configuration de
  canal nécessaire). Exécutez `openclaw dashboard` et discutez dans le navigateur. Documentation :
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
  L'onboarding CLI comprend une étape de recherche web où vous pouvez choisir un fournisseur
  (Perplexity, Brave, Gemini, Grok ou Kimi) et coller votre clé API afin que l'agent puisse utiliser
  `web_search`. Vous pouvez également configurer cela ultérieurement avec `openclaw configure
  --section web`. Documentation : [Outils web](/fr/tools/web).
</Tip>

## Démarrage rapide vs Avancé

L'onboarding commence par **QuickStart** (valeurs par défaut) ou **Advanced** (contrôle total).

<Tabs>
  <Tab title="QuickStart (valeurs par défaut)">
    - Passerelle locale (boucle locale) - Espace de travail par défaut (ou espace de travail
    existant) - Port de Gateway **18789** - Authentification de Gateway par **Jeton** (généré
    automatiquement, même en boucle locale) - Stratégie d'outil par défaut pour les nouvelles
    configurations locales : `tools.profile: "coding"` (le profil explicite existant est préservé) -
    Valeur par défaut d'isolement des DM : l'onboarding local écrit `session.dmScope:
    "per-channel-peer"` si non défini. Détails : [Référence de configuration
    CLI](/fr/start/wizard-cli-reference#outputs-and-internals) - Exposition Tailscale **Désactivée**
    - Les DM Telegram + WhatsApp sont réglés par défaut sur **liste blanche** (vous serez invité à
    entrer votre numéro de téléphone)
  </Tab>
  <Tab title="Avancé (contrôle total)">
    - Expose chaque étape (mode, espace de travail, passerelle, canaux, démon, compétences).
  </Tab>
</Tabs>

## Ce que configure l'onboarding

**Le mode local (par défaut)** vous guide à travers ces étapes :

1. **Modèle/Auth** — choisissez n'importe quel fournisseur/flux d'auth pris en charge (clé API, OAuth, ou jeton de configuration), y compris le fournisseur personnalisé
   (compatible OpenAI, compatible Anthropic, ou détection automatique inconnue). Choisissez un model par défaut.
   Remarque de sécurité : si cet agent doit exécuter des outils ou traiter le contenu des webhooks/hooks, privilégiez le model de dernière génération le plus robuste disponible et gardez une politique d'outils stricte. Les niveaux plus faibles ou plus anciens sont plus faciles à injecter via des invites.
   Pour les exécutions non interactives, `--secret-input-mode ref` stocke des références basées sur des variables d'environnement dans les profils d'auth au lieu des valeurs de clé API en texte brut.
   En mode non-interactif `ref`, la variable d'environnement du fournisseur doit être définie ; le passage d'indicateurs de clé en ligne sans cette variable d'environnement échoue rapidement.
   Dans les exécutions interactives, le choix du mode de référence secrète vous permet de pointer vers une variable d'environnement ou une référence de fournisseur configurée (`file` ou `exec`), avec une validation préalable rapide avant l'enregistrement.
2. **Espace de travail** — Emplacement des fichiers de l'agent (par défaut `~/.openclaw/workspace`). Initialise les fichiers d'amorçage.
3. **Gateway** — Port, adresse de liaison, mode d'auth, exposition Tailscale.
   En mode jeton interactif, choisissez le stockage en texte brut du jeton par défaut ou optez pour SecretRef.
   Chemin SecretRef pour jeton non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
4. **Channels** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles ou iMessage.
5. **Démon** — Installe un LaunchAgent (macOS) ou une unité utilisateur systemd (Linux/WSL2).
   Si l'auth par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement du service de supervision.
   Si l'auth par jeton nécessite un jeton et que la référence secrète du jeton configurée n'est pas résolue, l'installation du démon est bloquée avec des conseils exploitables.
   Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
6. **Health check** — Démarre le Gateway et vérifie qu'il fonctionne.
7. **Skills** — Installe les compétences recommandées et les dépendances facultatives.

<Note>
  La réexécution de l’onboarding **n’**efface rien, sauf si vous choisissez explicitement **Reset**
  (ou si vous transmettez `--reset`). La CLI `--reset` inclut par défaut la configuration, les
  informations d’identification et les sessions ; utilisez `--reset-scope full` pour inclure
  l’espace de travail. Si la configuration n’est pas valide ou contient des clés héritées,
  l’onboarding vous demande d’exécuter d’abord `openclaw doctor`.
</Note>

**Remote mode** ne configure que le client local pour se connecter à un Gateway situé ailleurs.
Il **n’**installe ni ne modifie quoi que ce soit sur l’hôte distant.

## Ajouter un autre agent

Utilisez `openclaw agents add <name>` pour créer un agent distinct avec son propre espace de travail,
sessions et profils d’authentification. L’exécution sans `--workspace` lance l’onboarding.

Ce qu'il définit :

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes :

- Les espaces de travail par défaut suivent `~/.openclaw/workspace-<agentId>`.
- Ajoutez `bindings` pour router les messages entrants (l’onboarding peut le faire).
- Indicateurs non interactifs : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Référence complète

Pour des descriptions détaillées étape par étape et les sorties de configuration, voir
[Référence de la configuration CLI](/fr/start/wizard-cli-reference).
Pour des exemples non interactifs, voir [Automatisation CLI](/fr/start/wizard-cli-automation).
Pour la référence technique approfondie, y compris les détails RPC, voir
[Référence de l’onboarding](/fr/reference/wizard).

## Documentation connexe

- Référence des commandes CLI : [`openclaw onboard`](/fr/cli/onboard)
- Aperçu de l’onboarding : [Aperçu de l’onboarding](/fr/start/onboarding-overview)
- Onboarding de l’application macOS : [Onboarding](/fr/start/onboarding)
- Rituel de première exécution de l’agent : [Amorçage de l’agent](/fr/start/bootstrapping)

import fr from "/components/footer/fr.mdx";

<fr />
