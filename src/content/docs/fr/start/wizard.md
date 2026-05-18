---
summary: "CLIonboarding CLI : configuration guidée pour la passerelle, l'espace de travail, les canaux et les compétences"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "CLIOnboarding (CLI)"
sidebarTitle: "CLIOnboarding : CLI"
---

L'onboarding via CLI est la méthode **recommandée** pour configurer OpenClaw sur macOS,
Linux ou Windows (via WSL2; fortement recommandé).
Il configure une passerelle Gateway locale ou une connexion à une passerelle Gateway distante, ainsi que les channels, les compétences
et les valeurs par défaut de l'espace de travail dans un flux guidé.

```bash
openclaw onboard
```

## Paramètres régionaux

L'assistant CLI localise les copies fixes de l'onboarding. Il résout les paramètres régionaux à partir de CLI`OPENCLAW_LOCALE`, puis `LC_ALL`, puis `LC_MESSAGES`, puis `LANG`, et revient à l'anglais par défaut. Les paramètres régionaux pris en charge par l'assistant sont `en`, `zh-CN` et `zh-TW`.

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

Les noms et les identifiants stables restent littéraux : `OpenClaw`, `Gateway`, `Tailscale`,
les commandes, les clés de configuration, les URL, les ID de fournisseur, les ID de modèle et les étiquettes de plugin/canal
ne sont pas traduits.

<Info>Premier chat le plus rapide : ouvrez l'interface de contrôle (aucune configuration de canal requise). Exécutez `openclaw dashboard` et discutez dans le navigateur. Documentation : [Dashboard](/fr/web/dashboard).</Info>

Pour reconfigurer ultérieurement :

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` n'implique pas le mode non interactif. Pour les scripts, utilisez `--non-interactive`.</Note>

<Tip>
  L'onboarding CLI comprend une étape de recherche Web où vous pouvez choisir un fournisseur tel que Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG ou Tavily. Certains fournisseurs nécessitent une clé API, tandis que d'autres n'en ont pas besoin. Vous pouvez également configurer cela ultérieurement avec
  CLIBraveFirecrawlMiniMaxOllamaPerplexityAPI`openclaw configure --section web`. Documentation : [Web tools](/fr/tools/web).
</Tip>

## Démarrage rapide vs Avancé

L'onboarding commence par **Démarrage rapide** (valeurs par défaut) ou **Avancé** (contrôle total).

<Tabs>
  <Tab title="Démarrage rapide (valeurs par défaut)">
    - GatewayGateway local (boucle locale)
    - Espace de travail par défaut (ou espace de travail existant)
    - Port du CLI **18789**
    - Authentification du Tailscale **Jeton** (généré automatiquement, même en boucle locale)
    - Stratégie d'outil par défaut pour les nouvelles configurations locales : `tools.profile: "coding"` (le profil explicite existant est conservé)
    - Par défaut d'isolement des DM : l'onboarding local écrit `session.dmScope: "per-channel-peer"` s'il n'est pas défini. Détails : [Référence de la configuration Telegram](/fr/start/wizard-cli-reference#outputs-and-internals)
    - Exposition WhatsApp **Désactivée**
    - Les DMs WhatsApp + WhatsApp sont par défaut sur **liste blanche** (votre numéro de téléphone vous sera demandé)

  </Tab>
  <Tab title="Avancé (contrôle total)">
    - Expose chaque étape (mode, espace de travail, passerelle, canaux, démon, compétences).

  </Tab>
</Tabs>

## Configuration de l'onboarding

**Le mode local (par défaut)** vous guide à travers ces étapes :

1. **Modèle/Auth** — choisissez n'importe quel flux provider/auth pris en charge (clé API, OAuth, ou auth manuel spécifique au provider), y compris le Provider Personnalisé
   (compatible OpenAI, compatible Anthropic, ou détection automatique Inconnue). Choisissez un modèle par défaut.
   Note de sécurité : si cet agent doit exécuter des outils ou traiter du contenu de webhook/hooks, préférez le modèle le plus robuste de la dernière génération disponible et maintenez une politique d'outils stricte. Les niveaux plus faibles ou plus anciens sont plus faciles à injecter via le prompt.
   Pour les exécutions non interactives, APIOAuthOpenAIAnthropic`--secret-input-mode ref`API stocke les références basées sur l'environnement dans les profils d'auth au lieu des valeurs de clé API en texte brut.
   En mode non interactif `ref`, la variable d'environnement du provider doit être définie ; le passage d'indicateurs de clé en ligne sans cette variable d'environnement échoue rapidement.
   Dans les exécutions interactives, le choix du mode de référence de secret vous permet de pointer soit vers une variable d'environnement, soit vers une référence de provider configurée (`file` ou `exec`AnthropicAnthropicCLIAnthropicAPIAnthropic), avec une validation préalable rapide avant l'enregistrement.
   Pour Anthropic, l'onboarding/configuration interactif offre **Anthropic Claude CLI** comme chemin local privilégié et **Clé API Anthropic** comme chemin de production recommandé. Le jeton de configuration (setup-token) Anthropic reste également disponible en tant que chemin d'auth par jeton pris en charge.
2. **Espace de travail** — Emplacement des fichiers de l'agent (par défaut `~/.openclaw/workspace`). Initialise les fichiers d'amorçage.
3. **Gateway** — Port, adresse de liaison, mode d'auth, exposition Tailscale.
   En mode jeton interactif, choisissez le stockage de jeton en texte brut par défaut ou optez pour SecretRef.
   Chemin SecretRef pour jeton non interactif : GatewayTailscale`--gateway-token-ref-env <ENV_VAR>`.
4. **Canaux** — canaux de chat intégrés et de plugins officiels tels qu'iMessage, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, Bot QQ, Signal, Slack, Telegram, WhatsApp, et plus encore.
5. **Daemon** — Installe un LaunchAgent (macOS), une unité utilisateur systemd (Linux/WSL2) ou une tâche planifiée native Windows avec repli vers le dossier de démarrage par utilisateur.
   Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne conserve pas le jeton résolu dans les métadonnées d'environnement du service superviseur.
   Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'installation du démon est bloquée avec des conseils actionnables.
   Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
6. **Health check** — Démarre le Gateway et vérifie qu'il fonctionne.
7. **Skills** — Installe les compétences recommandées et les dépendances optionnelles.

<Note>
  Le fait de relancer l'onboarding **n'efface** rien à moins que vous ne choisissiez explicitement **Reset** (ou que vous passiez `--reset`). CLI `--reset` inclut par défaut la configuration, les identifiants et les sessions ; utilisez `--reset-scope full` pour inclure l'espace de travail. Si la configuration est invalide ou contient des clés obsolètes, l'onboarding vous demande d'exécuter d'abord
  `openclaw doctor`.
</Note>

**Remote mode** ne configure que le client local pour se connecter à un Gateway situé ailleurs.
Il **n'installe** ni ne modifie quoi que ce soit sur l'hôte distant.

## Ajouter un autre agent

Utilisez `openclaw agents add <name>` pour créer un agent distinct avec son propre espace de travail,
sessions et profils d'authentification. L'exécution sans `--workspace` lance l'onboarding.

Ce qu'il définit :

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes :

- Les espaces de travail par défaut suivent `~/.openclaw/workspace-<agentId>`.
- Ajoutez `bindings` pour router les messages entrants (l'onboarding peut le faire).
- Indicateurs non interactifs : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Référence complète

Pour des descriptions détaillées étape par étape et les sorties de configuration, voir
[CLI Setup Reference](/fr/start/wizard-cli-reference).
Pour des exemples non interactifs, voir [CLI Automation](/fr/start/wizard-cli-automation).
Pour la référence technique approfondie, incluant les détails RPC, voir
[Onboarding Reference](/fr/reference/wizard).

## Documentation connexe

- Référence de commande CLI : [`openclaw onboard`](/fr/cli/onboard)
- Aperçu de l'onboarding : [Onboarding Overview](/fr/start/onboarding-overview)
- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Rituel de premier exécution de l'Agent : [Agent Bootstrapping](/fr/start/bootstrapping)
