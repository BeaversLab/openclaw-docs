---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/modèle, les sorties et les éléments internes"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Référence de configuration CLI"
sidebarTitle: "CLI reference"
---

# Référence de configuration CLI

Cette page est la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Ce que fait l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du modèle et de l'authentification (abonnement Code OpenAI OAuth, Anthropic Claude CLI ou clé API, ainsi que les options MiniMax, GLM, Ollama, Moonshot, StepFun et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres Gateway (port, liaison, auth, tailscale)
- Canaux et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, Mattermost, Signal, BlueBubbles et autres plugins de canal inclus)
- Installation du démon (LaunchAgent, unité utilisateur systemd, ou tâche planifiée native Windows avec repli vers le dossier de démarrage)
- Contrôle de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Conserver, Modifier ou Réinitialiser.
    - Relancer l'assistant n'efface rien, sauf si vous choisissez explicitement Réinitialiser (ou si vous passez `--reset`).
    - Le CLI `--reset` est par défaut `config+creds+sessions` ; utilisez `--reset-scope full` pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés héritées, l'assistant s'arrête et vous demande d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)
  </Step>
  <Step title="Modèle et authentification">
    - La matrice complète des options se trouve dans [Auth and model options](#auth-and-model-options).
  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires pour le rituel d'amorçage de la première exécution.
    - Disposition de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).
  </Step>
  <Step title="Gateway">
    - Demande le port, le bind, le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'authentification par jeton activée même pour le loopback afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker un jeton en clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en clair ou par SecretRef.
    - Chemin SecretRef pour jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement du processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites entièrement confiance à chaque processus local.
    - Les bind non-loopback nécessitent toujours une authentification.
  </Step>
  <Step title="Canaux">
    - [WhatsApp](/fr/channels/whatsapp) : connexion QR optionnelle
    - [Telegram](/fr/channels/telegram) : jeton de bot
    - [Discord](/fr/channels/discord) : jeton de bot
    - [Google Chat](/fr/channels/googlechat) : compte de service JSON + audience webhook
    - [Mattermost](/fr/channels/mattermost) : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation optionnelle de `signal-cli` + configuration du compte
    - [BlueBubbles](/fr/channels/bluebubbles) : recommandé pour iMessage ; URL du serveur + mot de passe + webhook
    - [iMessage](/fr/channels/imessage) : chemin de l'ancien `imsg` CLI + accès à la BD
    - Sécurité DM : la valeur par défaut est le jumelage. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connecté ; pour une utilisation sans interface graphique, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` afin que la passerelle reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - Windows natif : Tâche planifiée d'abord
      - Si la création de la tâche est refusée, OpenClaw revient à un élément de connexion dans le dossier Démarrage par utilisateur et démarre la passerelle immédiatement.
      - Les Tâches planifiées restent privilégiées car elles offrent un meilleur statut de superviseur.
    - Sélection du runtime : Node (recommandé ; requis pour WhatsApp et Telegram). Bun n'est pas recommandé.
  </Step>
  <Step title="Health check">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute la sonde de santé de la passerelle en direct à la sortie de statut, y compris les sondes de canal lorsque prises en charge.
  </Step>
  <Step title="Skills">
    - Lit les compétences disponibles et vérifie les exigences.
    - Vous permet de choisir le gestionnaire de nœuds : npm, pnpm ou bun.
    - Installe les dépendances optionnelles (certaines utilisent Homebrew sur macOS).
  </Step>
  <Step title="Finish">
    - Résumé et prochaines étapes, y compris les options d'application iOS, Android et macOS.
  </Step>
</Steps>

<Note>Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les ressources de l'interface de contrôle sont manquantes, l'assistant tente de les compiler ; la solution de repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ni ne modifie quoi que ce soit sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>- Si la passerelle est en boucle locale uniquement, utilisez le tunneling SSH ou un tailnet. - Indices de découverte : - macOS : Bonjour (`dns-sd`) - Linux : Avahi (`avahi-browse`)</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Anthropic API key">
    Utilise `ANTHROPIC_API_KEY` si présent ou demande une clé, puis l'enregistre pour une utilisation par le démon.
  </Accordion>
  <Accordion title="Abonnement Code OpenAI (OAuth)">
    Flux du navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.4` lorsque le modèle n'est pas défini ou `openai/*`.

  </Accordion>
  <Accordion title="Abonnement Code OpenAI (jumelage d'appareil)">
    Flux de jumelage du navigateur avec un code d'appareil à courte durée de vie.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.4` lorsque le modèle n'est pas défini ou `openai/*`.

  </Accordion>
  <Accordion title="Clé d'API OpenAI">
    Utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis stocke les informations d'identification dans les profils d'authentification.

    Définit `agents.defaults.model` sur `openai/gpt-5.4` lorsque le modèle n'est pas défini, `openai/*` ou `openai-codex/*`.

  </Accordion>
  <Accordion title="Clé d'API xAI (Grok)">
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
    Demande l'identifiant du compte, l'identifiant de la passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    La configuration est écrite automatiquement. L'hébergement par défaut est `MiniMax-M2.7` ; la configuration de la clé API utilise
    `minimax/...`, et la configuration OAuth utilise `minimax-portal/...`.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    La configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison chinois ou mondiaux.
    Le standard inclut actuellement `step-3.5-flash`, et Step Plan inclut également `step-3.5-flash-2603`.
    Plus de détails : [StepFun](/fr/providers/stepfun).
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    Demande `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthetic](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Demande `Cloud + Local`, `Cloud only`, ou `Local only` d'abord.
    `Cloud only` utilise `OLLAMA_API_KEY` avec `https://ollama.com`.
    Les modes hébergés demandent l'URL de base (par défaut `http://127.0.0.1:11434`), découvrent les modèles disponibles et suggèrent des valeurs par défaut.
    `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Les configs Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Custom provider">
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'intégration interactive prend en charge les mêmes options de stockage de clé API que les autres flux de clés API de provider :
    - **Coller la clé API maintenant** (en clair)
    - **Utiliser une référence secrète** (réf. env ou réf. provider configurée, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (facultatif ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (facultatif)
    - `--custom-compatibility <openai|anthropic>` (facultatif ; par défaut `openai`)

  </Accordion>
  <Accordion title="Ignorer">
    Laisse l'authentification non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisissez le modèle par défaut parmi les options détectées, ou entrez le fournisseur et le modèle manuellement.
- Lorsque l'intégration commence par un choix d'authentification de provider, le sélecteur de modèle préfère
  automatiquement ce provider. Pour Volcengine et BytePlus, la même préférence
  correspond également à leurs variantes de plan de codage (`volcengine-plan/*`,
  `byteplus-plan/*`).
- Si ce filtre de fournisseur préféré devait être vide, le sélecteur revient au catalogue complet au lieu de n'afficher aucun modèle.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une authentification.

Chemins des identifiants et des profils :

- Profils d'authentification (clés API + OAuth) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Importation OAuth héritée : `~/.openclaw/credentials/oauth.json`

Mode de stockage des identifiants :

- Le comportement d'intégration par défaut enregistre les clés API sous forme de valeurs en texte clair dans les profils d'authentification.
- `--secret-input-mode ref` active le mode de référence au lieu du stockage de clé en texte brut.
  Dans la configuration interactive, vous pouvez choisir entre :
  - référence de variable d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - référence de fournisseur configurée (`file` ou `exec`) avec l'alias et l'ID du fournisseur
- Le mode de référence interactif exécute une validation préalable rapide avant l'enregistrement.
  - Réf. d'environnement : valide le nom de la variable + une valeur non vide dans l'environnement d'intégration actuel.
  - Réf. de fournisseur : valide la configuration du fournisseur et résout l'ID demandé.
  - Si la préconfiguration échoue, l'onboarding affiche l'erreur et vous permet de réessayer.
- En mode non interactif, `--secret-input-mode ref` est uniquement basé sur les variables d'environnement.
  - Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding.
  - Les indicateurs de clé en ligne (par exemple `--openai-api-key`) exigent que cette variable d'environnement soit définie ; sinon, l'intégration échoue rapidement.
  - Pour les fournisseurs personnalisés, le mode non interactif `ref` stocke `models.providers.<id>.apiKey` sous la forme `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de fournisseur personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'intégration échoue rapidement.
- Les identifiants d'authentification du Gateway prennent en charge les choix de texte en clair et de SecretRef dans la configuration interactive :
  - Mode jeton : **Générer/stocker un jeton en texte en clair** (par défaut) ou **Utiliser SecretRef**.
  - Mode mot de passe : texte en clair ou SecretRef.
- Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations existantes en texte en clair continuent de fonctionner sans changement.

<Note>
Conseil pour headless et serveur : terminez OAuth sur une machine disposant d'un navigateur, puis copiez
le `auth-profiles.json` de cet agent (par exemple
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin
`$OPENCLAW_STATE_DIR/...` correspondant) vers l'hôte de la passerelle. `credentials/oauth.json`
n'est qu'une source d'importation héritée.
</Note>

## Sorties et éléments internes

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'intégration locale par défaut est `"coding"` si non défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'intégration locale définit cela par défaut à `per-channel-peer` si non défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes d'autorisation de canaux (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible)
- `skills.install.nodeManager`
  - L'indicateur `setup --node-manager` accepte `npm`, `pnpm` ou `bun`.
  - La configuration manuelle peut toujours définir `skills.install.nodeManager: "yarn"` plus tard.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et `bindings` en option.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

<Note>Certains canaux sont fournis sous forme de plugins. Lorsqu'ils sont sélectionnés lors de la configuration, l'assistant invite à installer le plugin (npm ou chemin local) avant la configuration du canal.</Note>

Assistant Gateway RPC :

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Les clients (application macOS et interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

Comportement de la configuration Signal :

- Télécharge l'actif de version approprié
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`
- Écrit `channels.signal.cliPath` dans la configuration
- Les builds JVM nécessitent Java 21
- Les builds natifs sont utilisés lorsqu'ils sont disponibles
- Windows utilise WSL2 et suit le flux signal-cli Linux à l'intérieur de WSL

## Documentation connexe

- Hub d'intégration : [Intégration (CLI)](/fr/start/wizard)
- Automatisation et scripts : [Automatisation CLI](/fr/start/wizard-cli-automation)
- Référence des commandes : [`openclaw onboard`](/fr/cli/onboard)
