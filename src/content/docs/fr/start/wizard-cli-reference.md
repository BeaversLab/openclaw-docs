---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/modèle, les sorties et les éléments internes"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Référence de la configuration CLI"
sidebarTitle: "CLI reference"
---

Cette page constitue la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Action de l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du model et de l'authentification (abonnement Code OpenAI OAuth, Anthropic Claude CLI ou clé API, ainsi que les options MiniMax, GLM, Ollama, Moonshot, StepFun et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres du Gateway (port, liaison, authentification, tailscale)
- Chaînes et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, Mattermost, Signal, iMessage et autres plugins de chaîne inclus)
- Installation du démon (LaunchAgent, unité utilisateur systemd ou tâche planifiée native Windows avec repli vers le dossier Démarrage)
- Vérification de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Conserver, Modifier ou Réinitialiser.
    - Le fait de relancer l'assistant n'efface rien, sauf si vous choisissez explicitement Réinitialiser (ou si vous passez `--reset`).
    - L'option CLI `--reset` correspond par défaut à `config+creds+sessions` ; utilisez `--reset-scope full` pour supprimer également l'espace de travail.
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
    - Initialise les fichiers de l'espace de travail nécessaires pour le rituel de bootstrap de la première exécution.
    - Disposition de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).

  </Step>
  <Step title="Gateway">
    - Demande le port, la liaison, le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'authentification par jeton activée même pour le bouclage local afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive propose :
      - **Générer/stocker un jeton en texte brut** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en texte brut ou par SecretRef.
    - Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement du processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les liaisons non bouclage local nécessitent toujours une authentification.

  </Step>
  <Step title="Canaux"WhatsApp>
    - [WhatsApp](/fr/channels/whatsappTelegram) : connexion QR facultative
    - [Telegram](/fr/channels/telegramDiscord) : jeton de bot
    - [Discord](/en/channels/discordGoogle Chat) : jeton de bot
    - [Google Chat](/fr/channels/googlechatMattermost) : JSON de compte de service + audience webhook
    - [Mattermost](/fr/channels/mattermostSignal) : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation facultative de `signal-cli`iMessage + configuration du compte
    - [iMessage](/fr/channels/imessage) : chemin du `imsg` CLI + accès à la base de données Messages ; utilisez un wrapper SSH lorsque le Gateway s'exécute hors-Mac
    - Sécurité DM : la valeur par défaut est le jumelage. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Installation du démon">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connectée ; pour sans tête, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` pour que la passerelle reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - Windows natif : Tâche planifiée d'abord
      - Si la création de la tâche est refusée, OpenClaw revient à un élément de connexion par utilisateur dans le dossier Démarrage et démarre la passerelle immédiatement.
      - Les tâches planifiées restent préférées car elles offrent un meilleur statut de superviseur.
    - Sélection du runtime : Node (recommandé ; requis pour WhatsApp et Telegram). Bun n'est pas recommandé.

  </Step>
  <Step title="Vérification de l'état">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute la sonde de santé de la passerelle en direct à la sortie de statut, y compris les sondes de canal lorsqu'elles sont prises en charge.

  </Step>
  <Step title="Skills"npmmacOS>
    - Lit les compétences disponibles et vérifie les prérequis.
    - Vous permet de choisir le gestionnaire de nœuds : npm, pnpm ou bun.
    - Installe les dépendances facultatives (certains utilisent Homebrew sur macOS).

  </Step>
  <Step title="Finish"iOSAndroidmacOS>
    - Résumé et prochaines étapes, y compris les options d'application iOS, Android et macOS.

  </Step>
</Steps>

<Note>Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle sont manquants, l'assistant tente de les construire ; le repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ou ne modifie rien sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>
- Si la passerelle est en boucle locale uniquement, utilisez un tunnel SSH ou un tailnet.
- Indications de découverte :
  - macOS : Bonjour (`dns-sd`)
  - Linux : Avahi (`avahi-browse`)

</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Clé API AnthropicAPI">
    Utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour utilisation par le démon.
  </Accordion>
  <Accordion title="Abonnement Code OpenAI (OAuth)">
    Flux navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai/gpt-5.5` via le runtime Codex lorsque le modèle n'est pas défini ou déjà de la famille OpenAI.

  </Accordion>
  <Accordion title="Abonnement Code OpenAI (appareil)">
    Flux de jumelage navigateur avec un code d'appareil à courte durée de vie.

    Définit `agents.defaults.model` sur `openai/gpt-5.5` via le runtime Codex lorsque le modèle n'est pas défini ou déjà de la famille OpenAI.

  </Accordion>
  <Accordion title="OpenAIAPIClé API OpenAI">
    Utilise `OPENAI_API_KEY` si présent ou demande une clé, puis stocke les informations d'identification dans les profils d'authentification.

    Définit `agents.defaults.model` sur `openai/gpt-5.5` lorsque le model n'est pas défini, `openai/*`, ou `openai-codex/*`.

  </Accordion>
  <Accordion title="OAuthxAI (Grok) OAuth"OpenClaw>
    Connexion via navigateur pour les comptes SuperGrok ou X Premium éligibles. C'est la
 méthode recommandée pour la plupart des utilisateurs xAI. OpenClaw stocke le profil d'authentification
 résultant pour les models Grok, `x_search`, et `code_execution`.
  </Accordion>
  <Accordion title="Code d'appareil xAI (Grok)"Docker>
    Connexion via navigateur adaptée aux accès distants avec un code court au lieu d'un rappel
 localhost. Utilisez ceci depuis SSH, Docker, ou des hôtes VPS.
  </Accordion>
  <Accordion title="APIClé API xAI (Grok)">
    Demande `XAI_API_KEY`APIOAuth et configure xAI en tant que provider de model. Utilisez ceci
 lorsque vous souhaitez une clé de console API xAI au lieu d'un abonnement OAuth.
  </Accordion>
  <Accordion title="OpenCode">
    Demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`) et vous permet de choisir le catalogue Zen ou Go.
    URL de configuration : [opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion title="APIClé API (générique)">
    Stocke la clé pour vous.
  </Accordion>
  <Accordion title="VercelGatewayVercel AI Gateway">
    Demande `AI_GATEWAY_API_KEY`VercelGateway.
    Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    Demande l'ID de compte, l'ID de passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    La configuration est écrite automatiquement. L'hébergement par défaut est `MiniMax-M2.7` ; la configuration de la clé API utilise
    `minimax/...`, et la configuration OAuth utilise `minimax-portal/...`.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    La configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison Chine ou mondiaux.
    Standard inclut actuellement `step-3.5-flash`, et Step Plan inclut également `step-3.5-flash-2603`.
    Plus de détails : [StepFun](/fr/providers/stepfun).
  </Accordion>
  <Accordion title="Synthétique (compatible Anthropic)">
    Demande `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthétique](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Demande d'abord `Cloud + Local`, `Cloud only` ou `Local only`.
    `Cloud only` utilise `OLLAMA_API_KEY` avec `https://ollama.com`.
    Les modes pris en charge par l'hôte demandent l'URL de base (par défaut `http://127.0.0.1:11434`), découvrent les modèles disponibles et suggèrent des valeurs par défaut.
    `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="MoonshotMoonshot et Kimi Coding"MoonshotMoonshot>
    Les configs Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Fournisseur personnalisé"OpenAIAnthropicAPIAPIAPI>
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'onboarding interactif prend en charge les mêmes options de stockage de clé API que les autres flux de clés API de fournisseur :
    - **Coller la clé API maintenant** (en texte clair)
    - **Utiliser une référence secrète** (réf env ou réf de fournisseur configurée, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (facultatif ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (facultatif)
    - `--custom-compatibility <openai|anthropic>` (facultatif ; par défaut `openai`)
    - `--custom-image-input` / `--custom-text-input` (facultatif ; remplace la capacité d'entrée du modèle déduite)

  </Accordion>
  <Accordion title="Ignorer">
    Laisse l'auth non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisissez le modèle par défaut parmi les options détectées, ou saisissez le fournisseur et le modèle manuellement.
- L'onboarding du fournisseur personnalisé déduit la prise en charge des images pour les ID de modèle courants et ne demande que lorsque le nom du modèle est inconnu.
- Lorsque l'onboarding démarre à partir d'un choix d'auth de fournisseur, le sélecteur de modèle privilégie
  automatiquement ce fournisseur. Pour Volcengine et BytePlus, la même préférence
  correspond également à leurs variantes de plan de codage (`volcengine-plan/*`,
  `byteplus-plan/*`).
- Si ce filtre de fournisseur préféré devait être vide, le sélecteur revient au
  catalogue complet au lieu de n'afficher aucun modèle.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une auth.

Chemins des identifiants et des profils :

- Profils d'authentification (clés d'API + OAuth) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Importation héritée OAuth : `~/.openclaw/credentials/oauth.json`

Mode de stockage des identifiants :

- Le comportement d'intégration par défaut conserve les clés API en tant que valeurs en texte brut dans les profils d'authentification.
- `--secret-input-mode ref` active le mode de référence au lieu du stockage de clé en texte brut.
  Dans la configuration interactive, vous pouvez choisir :
  - réf. de variable d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - réf. de provider configuré (`file` ou `exec`) avec l'alias + l'ID du provider
- Le mode référence interactif exécute une validation préliminaire rapide avant l'enregistrement.
  - Références d'env : valide le nom de la variable + la valeur non vide dans l'environnement d'intégration actuel.
  - Références de provider : valide la configuration du provider et résout l'ID demandé.
  - Si la validation préliminaire échoue, l'intégration affiche l'erreur et vous permet de réessayer.
- En mode non interactif, `--secret-input-mode ref` est basé uniquement sur les variables d'environnement.
  - Définissez la variable d'environnement du provider dans l'environnement du processus d'intégration.
  - Les indicateurs de clé en ligne (par exemple `--openai-api-key`) exigent que cette variable d'environnement soit définie ; sinon, l'intégration échoue rapidement.
  - Pour les providers personnalisés, le mode non interactif `ref` stocke `models.providers.<id>.apiKey` en tant que `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de provider personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'intégration échoue rapidement.
- Les identifiants d'authentification Gateway prennent en charge les choix de texte brut et SecretRef dans la configuration interactive :
  - Mode Jeton : **Générer/stocker le jeton en texte brut** (par défaut) ou **Utiliser SecretRef**.
  - Mode Mot de passe : texte brut ou SecretRef.
- Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations existantes en texte brut continuent de fonctionner sans modification.

<Note>
Astuce pour les serveurs et sans interface (headless) : complétez OAuth sur une machine disposant d'un navigateur, puis copiez
le `auth-profiles.json` de cet agent (par exemple
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin correspondant
`$OPENCLAW_STATE_DIR/...`) vers l'hôte de la passerelle. `credentials/oauth.json`
n'est qu'une source d'importation héritée.
</Note>

## Sorties et fonctionnement interne

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` lorsque `--skip-bootstrap` est passé
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'onboarding local définit `"coding"` par défaut s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'onboarding local définit ceci à `per-channel-peer` par défaut s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes de canaux autorisés (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID si possible)
- `skills.install.nodeManager`
  - L'option `setup --node-manager` accepte `npm`, `pnpm` ou `bun`.
  - La configuration manuelle peut toujours définir `skills.install.nodeManager: "yarn"` ultérieurement.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et l'optionnel `bindings`.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

<Note>Certains canaux sont fournis sous forme de plugins. Lorsqu'ils sont sélectionnés lors de la configuration, l'assistant invite à installer le plugin (npm ou chemin local) avant la configuration du canal.</Note>

Assistant Gateway RPC :

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Les clients (application macOS et interface de contrôle) peuvent afficher les étapes sans avoir à réimplémenter la logique d'onboarding.

Comportement de la configuration Signal :

- Télécharge l'actif de version approprié
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`
- Écrit `channels.signal.cliPath` dans la configuration
- Les builds JVM nécessitent Java 21
- Les builds natifs sont utilisés lorsqu'ils sont disponibles
- Windows utilise WSL2 et suit le flux signal-cli Linux à l'intérieur de WSL

## Documentation connexe

- Hub d'onboarding : [Onboarding (CLI)](/fr/start/wizard)
- Automatisation et scripts : [Automatisation CLI](/fr/start/wizard-cli-automation)
- Référence des commandes : [`openclaw onboard`](/fr/cli/onboard)
