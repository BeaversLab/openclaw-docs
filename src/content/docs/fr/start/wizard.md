---
summary: "L'onboarding CLI : installation guidée pour la passerelle, l'espace de travail, les canaux et les compétences"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Onboarding (CLI)"
sidebarTitle: "Intégration : CLI"
---

# Onboarding (CLI)

L'onboarding via CLI est la méthode **recommandée** pour configurer OpenClaw sur macOS,
Linux ou Windows (via WSL2 ; fortement recommandé).
Il configure une passerelle (Gateway) locale ou une connexion à une passerelle distante, ainsi que les canaux, les compétences
et les valeurs par défaut de l'espace de travail dans un processus guidé unique.

```bash
openclaw onboard
```

<Info>Premier chat le plus rapide : ouvrez l'interface utilisateur de contrôle (aucune configuration de channel requise). Exécutez `openclaw dashboard` et chattez dans le navigateur. Documentation : [Dashboard](/fr/web/dashboard).</Info>

Pour reconfigurer plus tard :

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` n'implique pas le mode non interactif. Pour les scripts, utilisez `--non-interactive`.</Note>

<Tip>
  L'onboarding CLI inclut une étape de recherche web où vous pouvez choisir un provider tel que Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG ou Tavily. Certains providers nécessitent une clé API, tandis que d'autres n'en ont pas besoin. Vous pouvez également configurer cela plus tard avec `openclaw configure --section web`.
  Documentation : [Web tools](/fr/tools/web).
</Tip>

## Démarrage rapide vs Avancé

L'onboarding commence par **QuickStart** (valeurs par défaut) ou **Advanced** (contrôle total).

<Tabs>
  <Tab title="QuickStart (defaults)">
    - Passerelle locale (loopback) - Espace de travail par défaut (ou espace de travail existant) - Port de la Gateway **18789** - Authentification de la Gateway **Token** (auto‑généré, même en loopback) - Stratégie d'outil par défaut pour les nouvelles configurations locales : `tools.profile: "coding"` (le profil explicite existant est préservé) - Isolation des DM par défaut : l'onboarding local
    écrit `session.dmScope: "per-channel-peer"` si non défini. Détails : [CLI Setup Reference](/fr/start/wizard-cli-reference#outputs-and-internals) - Exposition Tailscale **Désactivée** - Les DM Telegram + WhatsApp sont par défaut sur **allowlist** (votre numéro de téléphone vous sera demandé)
  </Tab>
  <Tab title="Avancé (contrôle total)">- Expose chaque étape (mode, espace de travail, passerelle, canaux, démon, compétences).</Tab>
</Tabs>

## Ce que configure l'onboarding

**Le mode local (par défaut)** vous guide à travers ces étapes :

1. **Modèle/Auth** — choisissez n'importe quel flux fournisseur/auth pris en charge (clé API, OAuth, ou auth manuelle spécifique au fournisseur), y compris Fournisseur personnalisé
   (compatible OpenAI, compatible Anthropic, ou détection automatique inconnue). Choisissez un modèle par défaut.
   Note de sécurité : si cet agent doit exécuter des outils ou traiter le contenu des webhooks/hooks, privilégiez le modèle de la dernière génération le plus robuste disponible et maintenez une politique d'outils stricte. Les niveaux plus faibles/anciens sont plus vulnérables aux injections de prompt.
   Pour les exécutions non interactives, `--secret-input-mode ref` stocke des références sauvegardées dans des variables d'environnement dans les profils d'auth au lieu des valeurs de clé API en clair.
   En mode `ref` non interactif, la variable d'environnement du fournisseur doit être définie ; le passage d'indicateurs de clé en ligne sans cette variable d'environnement échoue rapidement.
   Dans les exécutions interactives, le choix du mode de référence secrète vous permet de pointer vers une variable d'environnement ou une référence de fournisseur configurée (`file` ou `exec`), avec une validation préalable rapide avant l'enregistrement.
   Pour Anthropic, l'intégration/configuration interactive propose **Anthropic Claude CLI** comme chemin local privilégié et la **clé Anthropic API** comme chemin de production recommandé. Le jeton de configuration Anthropic reste également disponible en tant que chemin d'authentification par jeton pris en charge.
2. **Espace de travail** — Emplacement des fichiers de l'agent (par défaut `~/.openclaw/workspace`). Les seeds amorcent les fichiers.
3. **Gateway** — Port, adresse de liaison, mode d'auth, exposition Tailscale.
   En mode jeton interactif, choisissez le stockage de jeton en texte brut par défaut ou optez pour SecretRef.
   Chemin SecretRef de jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
4. **Canaux** — canaux de chat intégrés et groupés tels que BlueBubbles, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, QQ Bot, Signal, Slack, Telegram, WhatsApp, et plus encore.
5. **Daemon** — Installe un LaunchAgent (macOS), une unité utilisateur systemd (Linux/WSL2) ou une tâche planifiée Windows native avec un repli vers le dossier de Démarrage par utilisateur.
   Si l'authentification par jeton nécessite un jeton et `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas le jeton résolu dans les métadonnées d'environnement du service de supervision.
   Si l'authentification par jeton nécessite un jeton et que le SecretRef configuré pour le jeton est non résolu, l'installation du démon est bloquée avec des conseils exploitables.
   Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation du démon est bloquée tant que le mode n'est pas défini explicitement.
6. **Health check** — Démarre le Gateway et vérifie qu'il fonctionne.
7. **Skills** — Installe les compétences recommandées et les dépendances facultatives.

<Note>
  Le fait de relancer l'onboarding ne **supprime** rien, sauf si vous choisissez explicitement **Reset** (ou si vous passez `--reset`). La commande `--reset` de la CLI concerne par défaut la configuration, les informations d'identification et les sessions ; utilisez `--reset-scope full` pour inclure l'espace de travail. Si la configuration n'est pas valide ou contient des clés héritées,
  l'onboarding vous demande d'exécuter d'abord `openclaw doctor`.
</Note>

Le **Remote mode** ne configure que le client local pour se connecter à un Gateway situé ailleurs.
Il n'**installe** ou ne **modifie** rien sur l'hôte distant.

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
- Drapeaux non interactifs : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Référence complète

Pour des ventilations détaillées étape par étape et les sorties de configuration, consultez
[Référence de configuration CLI](/fr/start/wizard-cli-reference).
Pour des exemples non interactifs, consultez [Automatisation CLI](/fr/start/wizard-cli-automation).
Pour la référence technique approfondie, incluant les détails RPC, consultez
[Référence de l'onboarding](/fr/reference/wizard).

## Documentation connexe

- Référence des commandes CLI : [`openclaw onboard`](/fr/cli/onboard)
- Aperçu de l'onboarding : [Aperçu de l'onboarding](/fr/start/onboarding-overview)
- onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Rituel de première exécution de l'agent : [Agent Bootstrapping](/fr/start/bootstrapping)
