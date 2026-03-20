---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/model, les sorties et les éléments internes"
read_when:
  - Vous avez besoin d'un comportement détaillé pour openclaw onboard
  - Vous déboguez les résultats de l'onboarding ou vous intégrez des clients d'onboarding
title: "Référence de configuration CLI"
sidebarTitle: "Référence CLI"
---

# Référence de configuration CLI

Cette page est la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Ce que fait l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du modèle et de l'authentification (abonnement Code OpenAI OAuth, clé Anthropic ou jeton de configuration API, ainsi que les options MiniMax, GLM, Ollama, Moonshot et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres Gateway (port, liaison, auth, tailscale)
- Canaux et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, plugin Mattermost, Signal)
- Installation du démon (LaunchAgent ou unité utilisateur systemd)
- Contrôle de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Conserver, Modifier ou Réinitialiser.
    - Le fait de relancer l'assistant n'efface rien, sauf si vous choisissez explicitement Réinitialiser (ou si vous passez `--reset`).
    - CLI `--reset` par défaut est `config+creds+sessions` ; utilisez `--reset-scope full` pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés obsolètes, l'assistant s'arrête et vous demande d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)
  </Step>
  <Step title="Modèle et auth">
    - La matrice complète des options se trouve dans [Auth and model options](#auth-and-model-options).
  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires pour le rituel d'amorçage de la première exécution.
    - Disposition de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).
  </Step>
  <Step title="Passerelle">
    - Demande le port, la liaison (bind), le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'authentification par jeton activée même pour la boucle locale (loopback) afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker un jeton en texte clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en texte clair ou par SecretRef.
    - Chemin SecretRef pour jeton non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement de processus d'intégration (onboarding).
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les liaisons non boucle locale nécessitent toujours une authentification.
  </Step>
  <Step title="Canaux">
    - [WhatsApp](/fr/channels/whatsapp) : connexion QR facultative
    - [Telegram](/fr/channels/telegram) : jeton de bot
    - [Discord](/fr/channels/discord) : jeton de bot
    - [Google Chat](/fr/channels/googlechat) : compte de service JSON + audience webhook
    - [Mattermost](/fr/channels/mattermost) plugin : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation facultative de `signal-cli` + configuration du compte
    - [BlueBubbles](/fr/channels/bluebubbles) : recommandé pour iMessage ; URL du serveur + mot de passe + webhook
    - [iMessage](/fr/channels/imessage) : chemin `imsg` de l'ancienne CLI + accès à la base de données
    - Sécurité des DM : la valeur par défaut est le couplage. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes blanches.
  </Step>
  <Step title="Installation du démon">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connectée ; pour les systèmes sans interface (headless), utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` pour que la passerelle reste active après la déconnexion.
      - Peut demander sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - Sélection du runtime : Node (recommandé ; requis pour WhatsApp et Telegram). Bun n'est pas recommandé.
  </Step>
  <Step title="Contrôle de santé">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute des sondes de santé de la passerelle à la sortie de statut.
  </Step>
  <Step title="Skills">
    - Lit les compétences disponibles et vérifie les exigences.
    - Vous permet de choisir le gestionnaire de nœuds : npm ou pnpm (bun non recommandé).
    - Installe les dépendances optionnelles (certaines utilisent Homebrew sur macOS).
  </Step>
  <Step title="Terminer">
    - Résumé et prochaines étapes, y compris les options de l'application iOS, Android et macOS.
  </Step>
</Steps>

<Note>
  Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de
  port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les ressources de
  l'interface de contrôle sont manquantes, l'assistant tente de les construire ; le repli est `pnpm
  ui:build` (installe automatiquement les dépendances de l'interface).
</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ni ne modifie quoi que ce soit sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>
  - Si la passerelle est uniquement en boucle locale, utilisez le tunneling SSH ou un tailnet. -
  Indices de découverte : - macOS : Bonjour (`dns-sd`) - Linux : Avahi (`avahi-browse`)
</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Clé Anthropic API">
    Utilise `ANTHROPIC_API_KEY` si présent ou demande une clé, puis l'enregistre pour une utilisation par le démon.
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS : vérifie l'élément de trousseau "Claude Code-credentials"
    - Linux et Windows : réutilise `~/.claude/.credentials.json` si présent

    Sur macOS, choisissez « Toujours autoriser » afin que les démarrages launchd ne soient pas bloqués.

  </Accordion>
  <Accordion title="Jeton Anthropic (coller setup-token)">
    Exécutez `claude setup-token` sur n'importe quelle machine, puis collez le jeton.
    Vous pouvez le nommer ; vide utilise la valeur par défaut.
  </Accordion>
  <Accordion title="Abonnement Code OpenAI (réutilisation Codex CLI)">
    Si `~/.codex/auth.json` existe, l'assistant peut le réutiliser.
  </Accordion>
  <Accordion title="Abonnement OpenAI Code (OAuth)">
    Flux navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.4` lorsque le modèle n'est pas défini ou `openai/*`.

  </Accordion>
  <Accordion title="Clé API OpenAI">
    Utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis stocke les informations d'identification dans les profils d'authentification.

    Définit `agents.defaults.model` sur `openai/gpt-5.1-codex` lorsque le modèle n'est pas défini, `openai/*` ou `openai-codex/*`.

  </Accordion>
  <Accordion title="Clé API xAI (Grok)">
    Demande `XAI_API_KEY` et configure xAI en tant que fournisseur de modèle.
  </Accordion>
  <Accordion title="OpenCode">
    Demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`) et vous permet de choisir le catalogue Zen ou Go.
    URL de configuration : [opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion title="Clé API (générique)">
    Stocke la clé pour vous.
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    Demande `AI_GATEWAY_API_KEY`.
    Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    Demande l'ID de compte, l'ID de passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax M2.5">
    La configuration est écrite automatiquement.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="Synthetic (compatible Anthropic)">
    Demande `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthetic](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Demande l'URL de base (par défaut `http://127.0.0.1:11434`), puis propose les modes Cloud + Local ou Local.
    Détecte les modèles disponibles et suggère les valeurs par défaut.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Les configurations Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Fournisseur personnalisé">
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'onboarding interactif prend en charge les mêmes options de stockage de clés API que les autres flux de clés API de fournisseur :
    - **Coller la clé API maintenant** (texte en clair)
    - **Utiliser une référence secrète** (réf. env ou réf. fournisseur configurée, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (facultatif ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (facultatif)
    - `--custom-compatibility <openai|anthropic>` (facultatif ; par défaut `openai`)

  </Accordion>
  <Accordion title="Skip">
    Laisse l'authentification non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisit le modèle par défaut parmi les options détectées, ou entre le provider et le modèle manuellement.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou si l'auth est manquante.

Chemins des identifiants et des profils :

- OAuth credentials: `~/.openclaw/credentials/oauth.json`
- Auth profiles (API keys + OAuth): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

Mode de stockage des informations d'identification :

- Le comportement d'onboarding par défaut enregistre les clés API en tant que valeurs en clair dans les profils d'auth.
- `--secret-input-mode ref` enables reference mode instead of plaintext key storage.
  In interactive setup, you can choose either:
  - environment variable ref (for example `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - configured provider ref (`file` or `exec`) with provider alias + id
- Le mode référence interactif exécute une validation préliminaire rapide avant l'enregistrement.
  - Réf Env : valide le nom de la variable + la valeur non vide dans l'environnement d'onboarding actuel.
  - Réf Provider : valide la configuration du provider et résout l'identifiant demandé.
  - Si la validation préliminaire échoue, l'onboarding affiche l'erreur et vous permet de réessayer.
- In non-interactive mode, `--secret-input-mode ref` is env-backed only.
  - Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding.
  - Inline key flags (for example `--openai-api-key`) require that env var to be set; otherwise onboarding fails fast.
  - Pour les providers personnalisés, le mode non-interactif `ref` stocke `models.providers.<id>.apiKey` sous `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de provider personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'onboarding échoue rapidement.
- Les identifiants d'authentification Gateway prennent en charge les choix en texte clair et SecretRef dans la configuration interactive :
  - Mode Jeton : **Générer/stocker le jeton en clair** (par défaut) ou **Utiliser SecretRef**.
  - Mode Mot de passe : en clair ou SecretRef.
- Chemin SecretRef du token non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations en clair existantes continuent de fonctionner sans modification.

<Note>
  Conseil pour headless et serveur : complétez OAuth sur une machine avec un navigateur, puis copiez
  `~/.openclaw/credentials/oauth.json` (ou `$OPENCLAW_STATE_DIR/credentials/oauth.json`) vers l'hôte
  de la passerelle.
</Note>

## Sorties et éléments internes

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'onboarding local définit cela par défaut à `"coding"` si non défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'onboarding local définit cela par défaut à `per-channel-peer` si non défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listes de canaux autorisés (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID si possible)
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et `bindings` en option.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

<Note>
  Certains canaux sont fournis sous forme de plugins. Lorsqu'ils sont sélectionnés lors de la
  configuration, l'assistant demande d'installer le plugin (npm ou chemin local) avant la
  configuration du canal.
</Note>

Assistant de l'Gateway RPC :

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Les clients (application macOS et Interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

Comportement de configuration Signal :

- Télécharge l'actif de version approprié
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`
- Écrit `channels.signal.cliPath` dans la configuration
- Les versions JVM nécessitent Java 21
- Les versions natives sont utilisées lorsqu'elles sont disponibles
- Windows utilise WSL2 et suit le flux signal-cli Linux à l'intérieur de WSL

## Documentation connexe

- Hub d'onboarding : [Onboarding (CLI)](/fr/start/wizard)
- Automatisation et scripts : [Automatisation CLI](/fr/start/wizard-cli-automation)
- Référence des commandes : [`openclaw onboard`](/fr/cli/onboard)

import fr from "/components/footer/fr.mdx";

<fr />
