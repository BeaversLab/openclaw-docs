---
summary: "L'onboarding CLI : installation guidée pour la passerelle, l'espace de travail, les canaux et les compétences"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Onboarding (CLI)"
sidebarTitle: "Intégration : CLI"
---

L'onboarding via CLI est la méthode **recommandée** pour configurer OpenClaw sur macOS,
Linux ou Windows (via WSL2; fortement recommandé).
Il configure une passerelle Gateway locale ou une connexion à une passerelle Gateway distante, ainsi que les channels, les compétences
et les valeurs par défaut de l'espace de travail dans un flux guidé.

```bash
openclaw onboard
```

<Info>Premier chat le plus rapide : ouvrez l'interface utilisateur de contrôle (aucune configuration de channel nécessaire). Exécutez `openclaw dashboard` et discutez dans le navigateur. Documentation : [Tableau de bord](/fr/web/dashboard).</Info>

Pour reconfigurer ultérieurement :

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` n'implique pas le mode non interactif. Pour les scripts, utilisez `--non-interactive`.</Note>

<Tip>
  L'onboarding via CLI comprend une étape de recherche Web où vous pouvez choisir un fournisseur tel que Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, Recherche MiniMax, Recherche Web Ollama, Perplexity, SearXNG ou Tavily. Certains fournisseurs nécessitent une clé API, tandis que d'autres n'en ont pas besoin. Vous pouvez également configurer cela ultérieurement avec `openclaw configure
  --section web`. Documentation : [Outils Web](/fr/tools/web).
</Tip>

## Démarrage rapide vs Avancé

L'onboarding commence par le **Démarrage rapide** (valeurs par défaut) ou le mode **Avancé** (contrôle total).

<Tabs>
  <Tab title="QuickStart (défauts)">
    - Gateway local (boucle locale)
    - Espace de travail par défaut (ou espace de travail existant)
    - Port Gateway **18789**
    - Authentification Gateway **Token** (généré automatiquement, même en boucle locale)
    - Stratégie d'outil par défaut pour les nouvelles configurations locales : `tools.profile: "coding"` (le profil explicite existant est conservé)
    - Par défaut d'isolation des DM : l'onboarding local écrit `session.dmScope: "per-channel-peer"` s'il n'est pas défini. Détails : [Référence de la configuration CLI](/fr/start/wizard-cli-reference#outputs-and-internals)
    - Exposition Tailscale **Désactivée**
    - Les DM Telegram + WhatsApp sont réglés par défaut sur **allowlist** (votre numéro de téléphone vous sera demandé)

  </Tab>
  <Tab title="Advanced (contrôle total)">
    - Expose chaque étape (mode, espace de travail, gateway, canaux, démon, compétences).

  </Tab>
</Tabs>

## Ce que configure l'onboarding

Le **Mode local (par défaut)** vous guide à travers ces étapes :

1. **Modèle/Auth** — choisissez n'importe quel flux de fournisseur/auth pris en charge (clé API, OAuth ou auth manuelle spécifique au fournisseur), y compris le Fournisseur personnalisé
   (compatible OpenAI, compatible Anthropic ou détection automatique Inconnu). Choisissez un modèle par défaut.
   Note de sécurité : si cet agent doit exécuter des outils ou traiter le contenu des webhooks/hooks, privilégiez le modèle de dernière génération le plus robuste disponible et gardez une stratégie d'outils stricte. Les niveaux plus faibles/plus anciens sont plus faciles à injecter via des invites.
   Pour les exécutions non interactives, `--secret-input-mode ref` stocke des références soutenues par l'environnement dans les profils d'auth au lieu des valeurs de clé API en texte clair.
   En mode `ref` non interactif, la variable d'environnement du fournisseur doit être définie ; le passage de drapeaux de clé en ligne sans cette variable d'environnement échoue rapidement.
   Dans les exécutions interactives, le choix du mode de référence de secret vous permet de pointer vers une variable d'environnement ou une référence de fournisseur configurée (`file` ou `exec`), avec une validation préalable rapide avant l'enregistrement.
   Pour Anthropic, l'intégration/configuration interactive propose le **Anthropic Claude CLI** comme chemin local privilégié et la **clé Anthropic API** comme chemin de production recommandé. Le jeton de configuration Anthropic reste également disponible en tant que chemin d'authentification par jeton pris en charge.
2. **Espace de travail** — Emplacement des fichiers de l'agent (par défaut `~/.openclaw/workspace`). Initialise les fichiers d'amorçage.
3. **Gateway** — Port, adresse de liaison, mode d'auth, exposition Tailscale.
   En mode jeton interactif, choisissez le stockage de jeton en texte clair par défaut ou optez pour SecretRef.
   Chemin SecretRef de jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
4. **Canaux** — canaux de chat intégrés et groupés tels que iMessage, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, QQ Bot, Signal, Slack, Telegram, WhatsApp, et plus encore.
5. **Daemon** — Installe un LaunchAgent (macOS), une unité utilisateur systemd (Linux/WSL2) ou une tâche planifiée Windows native avec un repli sur le dossier de Démarrage par utilisateur.
   Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du daemon le valide mais ne persiste pas le jeton résolu dans les métadonnées d'environnement du service superviseur.
   Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'installation du daemon est bloquée avec des instructions exploitables.
   Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, l'installation du daemon est bloquée jusqu'à ce que le mode soit défini explicitement.
6. **Vérification de santé** — Démarre le Gateway et vérifie qu'il fonctionne.
7. **Skills** — Installe les compétences recommandées et les dépendances facultatives.

<Note>
  Le ré-exécution de l'onboarding **ne** supprime rien, sauf si vous choisissez explicitement **Réinitialiser** (ou si vous transmettez `--reset`). La CLI `--reset` inclut par défaut la configuration, les informations d'identification et les sessions ; utilisez `--reset-scope full` pour inclure l'espace de travail. Si la configuration n'est pas valide ou contient des clés héritées, l'onboarding
  vous demande d'exécuter d'abord `openclaw doctor`.
</Note>

**Mode distant** ne configure que le client local pour se connecter à un Gateway situé ailleurs.
Il **n'** installe ou ne modifie rien sur l'hôte distant.

## Ajouter un autre agent

Utilisez `openclaw agents add <name>` pour créer un agent distinct avec son propre espace de travail,
sessions et profils d'authentification. L'exécution sans `--workspace` lance l'onboarding.

Ce qu'il définit :

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Remarques :

- Les espaces de travail par défaut suivent `~/.openclaw/workspace-<agentId>`.
- Ajoutez `bindings` pour acheminer les messages entrants (l'onboarding peut le faire).
- Indicateurs non interactifs : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Référence complète

Pour des descriptions détaillées étape par étape et les sorties de configuration, consultez
[Référence de la configuration CLI](/fr/start/wizard-cli-reference).
Pour des exemples non interactifs, consultez [Automatisation CLI](/fr/start/wizard-cli-automation).
Pour la référence technique approfondie, y compris les détails RPC, consultez
[Référence de l'onboarding](/fr/reference/wizard).

## Documentation connexe

- Référence de commande CLI : [`openclaw onboard`](/fr/cli/onboard)
- Aperçu de l'onboarding : [Aperçu de l'onboarding](/fr/start/onboarding-overview)
- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Rituel de premier exécution de l'agent : [Amorçage de l'agent](/fr/start/bootstrapping)
