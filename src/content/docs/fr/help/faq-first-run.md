---
summary: "FAQ : démarrage rapide et configuration du premier lancement — installation, intégration, authentification, abonnements, échecs initiaux"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "FAQ : configuration du premier lancement"
sidebarTitle: "FAQ du premier lancement"
---

Questions-réponses sur le démarrage rapide et le premier lancement. Pour les opérations quotidiennes, les modèles, l'authentification, les sessions et le troubleshooting, consultez la [FAQ](/fr/help/faq) principale.

## Démarrage rapide et configuration du premier lancement

<AccordionGroup>
  <Accordion title="Je suis bloqué, moyen le plus rapide de débloquer la situation">
    Utilisez un agent IA local capable de **voir votre machine**. C'est beaucoup plus efficace que de demander
    sur Discord, car la plupart des cas "Je suis bloqué" sont des **problèmes de configuration locale ou d'environnement** que
    les assistants à distance ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
    au niveau de la machine (PATH, services, autorisations, fichiers d'auth). Donnez-leur le **checkout complet du code source** via
    l'installation « hackable » (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un git checkout**, donc l'agent peut lire le code + les docs et
    raisonner sur la version exacte que vous exécutez. Vous pouvez toujours revenir à la version stable plus tard
    en réexécutant l'installateur sans `--install-method git`.

    Conseil : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis d'exécuter uniquement les
    commandes nécessaires. Cela permet de garder les modifications mineures et plus faciles à vérifier.

    Si vous découvrez un vrai bogue ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Commencez par ces commandes (partagez les résultats lorsque vous demandez de l'aide) :

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Ce qu'elles font :

    - `openclaw status` : instantané de l'état de santé de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'auth du provider + la disponibilité du model.
    - `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

    Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [Premières 60 secondes si quelque chose ne fonctionne pas](#first-60-seconds-if-something-is-broken).
    Docs d'installation : [Installer](/fr/install), [Options de l'installateur](/fr/install/installer), [Mise à jour](/fr/install/updating).

  </Accordion>

  <Accordion title="Le heartbeat continue d'être ignoré. Que signifient les raisons de l'ignorance ?">
    Raisons courantes de l'ignorance du heartbeat :

    - `quiet-hours` : en dehors de la fenêtre d'heures actives configurée
    - `empty-heartbeat-file` : `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou avec uniquement des en-têtes
    - `no-tasks-due` : le mode de tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâche n'est encore échu
    - `alerts-disabled` : toute la visibilité du heartbeat est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés)

    En mode tâche, les horodatages d'échéance ne sont avancés qu'après l'exécution complète d'un vrai heartbeat. Les exécutions ignorées ne marquent pas les tâches comme terminées.

    Docs : [Heartbeat](/fr/gateway/heartbeat), [Automatisation et Tâches](/fr/automation).

  </Accordion>

  <Accordion title="Méthode recommandée pour installer et configurer OpenClaw">
    Le dépôt recommande de lancer à partir du code source et d'utiliser l'onboarding :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    L'assistant peut également construire automatiquement les éléments de l'interface utilisateur. Après l'onboarding, vous exécutez généralement le Gateway sur le port **18789**.

    À partir du code source (contributeurs/dev) :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    Si vous n'avez pas encore d'installation globale, lancez-le via `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="Comment ouvrir le tableau de bord après l'onboarding ?">L'assistant ouvre votre navigateur avec une URL propre (non tokenisée) du tableau de bord juste après l'onboarding et imprime également le lien dans le résumé. Gardez cet onglet ouvert ; s'il ne s'est pas lancé, copiez/collez l'URL imprimée sur la même machine.</Accordion>

  <Accordion title="Comment authentifier le tableau de bord sur localhost vs à distance ?">
    **Localhost (même machine) :**

    - Ouvrez `http://127.0.0.1:18789/`.
    - Si l'authentification par secret partagé est demandée, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle.
    - Source du jeton : `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
    - Source du mot de passe : `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aucun secret partagé n'est encore configuré, générez un jeton avec `openclaw doctor --generate-gateway-token`.

    **Pas sur localhost :**

    - **Tailscale Serve** (recommandé) : gardez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de secret partagé collé, suppose un hôte Gateway de confiance) ; les API HTTP nécessitent toujours une authentification par secret partagé, sauf si vous utilisez délibérément private-ingress `none` ou l'authentification HTTP trusted-proxy.
      Les mauvaises tentatives d'authentification Serve simultanées du même client sont sérialisées avant que le limiteur d'échecs d'authentification ne les enregistre, la deuxième mauvaise tentative peut donc déjà afficher `retry later`.
    - **Liaison Tailnet** : exécutez `openclaw gateway --bind tailnet --token "<token>"` (ou configurez l'authentification par mot de passe), ouvrez `http://<tailscale-ip>:18789/`, puis collez le secret partagé correspondant dans les paramètres du tableau de bord.
    - **Proxy inverse avec reconnaissance d'identité** : gardez le Gateway derrière un proxy de confiance non loopback, configurez `gateway.auth.mode: "trusted-proxy"`, puis ouvrez l'URL du proxy.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`. L'authentification par secret partagé s'applique toujours via le tunnel ; collez le jeton ou le mot de passe configuré si demandé.

    Voir [Dashboard](/fr/web/dashboard) et [Web surfaces](/fr/web) pour les modes de liaison et les détails d'authentification.

  </Accordion>

  <Accordion title="Pourquoi existe-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?">
    Elles contrôlent différentes couches :

    - `approvals.exec` : transfère les invites d'approbation vers les destinations de chat
    - `channels.<channel>.execApprovals` : fait en sorte que ce canal agisse comme un client d'approbation natif pour les approbations d'exécution

    La stratégie d'exécution de l'hôte reste toujours la véritable porte d'approbation. La configuration du chat contrôle uniquement l'endroit où les invites d'approbation apparaissent et la manière dont les personnes peuvent y répondre.

    Dans la plupart des configurations, vous n'avez **pas** besoin des deux :

    - Si le chat prend déjà en charge les commandes et les réponses, la commande `/approve` de même chat fonctionne via le chemin partagé.
    - Si un canal natif pris en charge peut déduir les approbateurs en toute sécurité, OpenClaw active désormais automatiquement les approbations natives par DM en priorité lorsque `channels.<channel>.execApprovals.enabled` n'est pas défini ou `"auto"`.
    - Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal ; l'agent ne doit inclure une commande `/approve` manuelle que si le résultat de l'outil indique que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    - Utilisez `approvals.exec` uniquement lorsque les invites doivent également être transférées vers d'autres chats ou des salles d'opérations explicites.
    - Utilisez `channels.<channel>.execApprovals.target: "channel"` ou `"both"` uniquement lorsque vous souhaitez explicitement que les invites d'approbation soient renvoyées dans la salle/sujet d'origine.
    - Les approbations de plugins sont à nouveau séparées : elles utilisent la commande `/approve` de même chat par défaut, un transfert `approvals.plugin` facultatif, et seuls certains canaux natifs conservent le traitement natif des approbations de plugins par-dessus.

    Version courte : le transfert est pour le routage, la configuration du client natif est pour une expérience utilisateur spécifique au canal plus riche.
    Voir [Exec Approvals](/fr/tools/exec-approvals).

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun est **non recommandé** pour la Gateway.
  </Accordion>

  <Accordion title="Est-ce que cela fonctionne sur Raspberry Pi ?">
    Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque suffisent pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous voulez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum strict.

    Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur portable/téléphone pour
    un écran/caméra/toile local ou une exécution de commande. Voir [Nœuds](/fr/nodes).

  </Accordion>

  <Accordion title="Des conseils pour l'installation sur Raspberry Pi ?">
    Version courte : cela fonctionne, mais attendez-vous à des rugosités.

    - Utilisez un OS **64 bits** et gardez Node >= 22.
    - Privilégiez l'**installation piratable (git)** afin que vous puissiez voir les journaux et mettre à jour rapidement.
    - Commencez sans chaînes/compétences, puis ajoutez-les une par une.
    - Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

    Documentation : [Linux](/fr/platforms/linux), [Installer](/fr/install).

  </Accordion>

  <Accordion title="C'est bloqué sur wake up my friend / l'onboarding ne va pas éclore. Et maintenant ?">
    Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
    "Wake up, my friend!" automatiquement lors de la première éclosion. Si vous voyez cette ligne avec **pas de réponse**
    et que les jetons restent à 0, l'agent n'a jamais été exécuté.

    1. Redémarrez le Gateway :

    ```bash
    openclaw gateway restart
    ```

    2. Vérifiez le statut + l'auth :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si cela bloque toujours, exécutez :

    ```bash
    openclaw doctor
    ```

    Si le Gateway est distant, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
    pointe vers le bon Gateway. Voir [Accès à distance](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'onboarding ?">
    Oui. Copiez le **répertoire d'état** et l'**espace de travail**, puis exécutez Doctor une fois. Cela
    permet de conserver votre bot "exactement le même" (mémoire, historique des sessions, authentification et état du
    channel) tant que vous copiez **les deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'authentification, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, gardez à l'esprit que l'hôte de la passerelle possède le stockage des sessions et l'espace de travail.

    **Important :** si vous ne faites que commit/push de votre espace de travail sur GitHub, vous sauvegardez
    la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ou l'authentification. Ceux-ci résident
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migration](/fr/install/migrating), [Emplacement des fichiers sur le disque](#where-things-live-on-disk),
    [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Doctor](/fr/gateway/doctor),
    [Mode distant](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-je voir les nouveautés de la dernière version ?">
    Consultez le journal des modifications GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section supérieure est marquée **Unreleased** (non publiée), la prochaine section datée
    correspond à la dernière version publiée. Les entrées sont groupées par **Points forts** (Highlights), **Modifications** (Changes) et
    **Corrections** (Fixes) (ainsi que des sections docs/autres si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via Xfinity
    Advanced Security. Désactivez-le ou ajoutez `docs.openclaw.ai` à la liste autorisée, puis réessayez.
    Aidez-nous à débloquer le site en le signalant ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne parvenez toujours pas à atteindre le site, la documentation est disponible en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **dist-tags npm**, pas des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version de test précoce

    Habituellement, une version stable arrive d'abord sur **beta**, puis une étape de promotion explicite déplace cette même version vers `latest`. Les mainteneurs peuvent également publier directement vers `latest` si nécessaire. C'est pourquoi beta et stable peuvent pointer vers la **même version** après promotion.

    Voir ce qui a changé :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les commandes d'installation en une ligne et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version beta et quelle est la différence entre beta et dev ?">
    **Beta** est le dist-tag npm `beta` (peut correspondre à `latest` après promotion).
    **Dev** est la tête en mouvement de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

    Lignes de commande unique (macOS/Linux) :

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Installateur Windows (PowerShell) :
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Options de l'installateur](/fr/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les dernières fonctionnalités ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule vers la branche `main` et met à jour depuis les sources.

    2. **Installation modifiable (depuis le site de l'installateur) :**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

    Si vous préférez effectuer manuellement un clone propre, utilisez :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Documentation : [Mise à jour](/fr/cli/update), [Canaux de développement](/fr/install/development-channels),
    [Installation](/fr/install).

  </Accordion>

  <Accordion title="Combien de temps prennent généralement l'installation et l'onboarding ?">
    Guide approximatif :

    - **Installation :** 2-5 minutes
    - **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

    Si cela bloque, utilisez [Installer bloqué](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="L'installateur est bloqué ? Comment obtenir plus de retours ?">
    Relancez l'installateur avec **sortie verbose** :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Installation bêta avec verbose :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Pour une installation (git) hackable :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows (PowerShell) équivalent :

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    Plus d'options : [Flags de l'installateur](/fr/install/installer).

  </Accordion>

  <Accordion title="L'installation sur Windows indique git introuvable ou openclaw non reconnu">
    Deux problèmes courants sur Windows :

    **1) erreur npm spawn git / git not found**

    - Installez **Git pour Windows** et assurez-vous que `git` est dans votre PATH.
    - Fermez et rouvrez PowerShell, puis relancez l'installateur.

    **2) openclaw n'est pas reconnu après l'installation**

    - Votre dossier global bin npm n'est pas dans le PATH.
    - Vérifiez le chemin :

      ```powershell
      npm config get prefix
      ```

    - Ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows ; sur la plupart des systèmes c'est `%AppData%\npm`).
    - Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

    Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** plutôt que Windows natif.
    Documentation : [Windows](/fr/platforms/windows).

  </Accordion>

  <Accordion title="La sortie exécutive Windows affiche du texte chinois illisible - que dois-je faire ?">
    Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells natifs Windows.

    Symptômes :

    - La sortie `system.run`/`exec` affiche le chinois sous forme de caractères illisibles (mojibake)
    - La même commande s'affiche correctement dans un autre profil de terminal

    Solution rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Redémarrez ensuite le Gateway et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```

    Si vous reproduisez toujours ce problème sur la dernière version d'OpenClaw, suivez ou signalez-le ici :

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?">
    Utilisez l'**installation hackable (git)** afin d'avoir la source complète et la documentation en local, puis demandez
    à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre précisément.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Plus de détails : [Install](/fr/install) et [Installer flags](/fr/install/installer).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur Linux ?">
    Réponse courte : suivez le guide Linux, puis lancez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
    - Guide complet : [Getting Started](/fr/start/getting-started).
    - Installateur + mises à jour : [Install & updates](/fr/install/updating).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur un VPS ?">
    N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder au Gateway.

    Guides : [exe.dev](/fr/install/exe-dev), [Hetzner](/fr/install/hetzner), [Fly.io](/fr/install/fly).
    Accès à distance : [Gateway remote](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation pour le cloud/VPS ?">
    Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/fr/install/fly)
    - [Hetzner](/fr/install/hetzner)
    - [exe.dev](/fr/install/exe-dev)

    Fonctionnement dans le cloud : la **Gateway s'exécute sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + votre espace de travail
    résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

    Vous pouvez associer des **nœuds** (Mac/iOS/Android/headless) à cette Gateway cloud pour accéder
    à l'écran local/caméra/toile ou exécuter des commandes sur votre ordinateur tout en conservant la
    Gateway dans le cloud.

    Hub : [Plateformes](/fr/platforms). Accès distant : [Gateway distant](/fr/gateway/remote).
    Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le processus de mise à jour peut redémarrer la
    Gateway (ce qui interrompt la session active), peut nécessiter un nettoyage git, et
    peut demander une confirmation. Plus sûr : exécutez les mises à jour depuis un shell en tant qu'opérateur.

    Utilisez la CLI :

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    Si vous devez automatiser depuis un agent :

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    Docs : [Mise à jour](/fr/cli/update), [Mises à jour](/fr/install/updating).

  </Accordion>

  <Accordion title="Que fait réellement l'intégration (onboarding) ?">
    `openclaw onboard` est le chemin d'installation recommandé. En **mode local**, il vous guide à travers :

    - **Configuration du modèle/de l'authentification** (OAuth du fournisseur, clés d'OAuth (API), jeton de configuration API, ainsi que les options de modèles locaux comme LM Studio)
    - Emplacement de l'**Espace de travail** (Workspace) + fichiers d'amorçage
    - Paramètres de la **Passerelle** (bind/port/auth/tailscale)
    - **Canaux** (Channels) (Anthropic, Gateway, WhatsApp, Telegram, Discord, Mattermost, ainsi que les plugins de canal groupés comme QQ Bot)
    - **Installation du démon** (LaunchAgent sur Signal ; unité utilisateur systemd sur iMessage/macOS)
    - **Contrôles de santé** et sélection des **compétences** (skills)

    Il avertit également si votre modèle configuré est inconnu ou si l'authentification est manquante.

  </Accordion>

  <Accordion title="Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter cela ?">
    Non. Vous pouvez exécuter OpenClaw avec des **clés d'API** (Anthropic/OpenAI/autres) ou avec des
    **modèles uniquement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou OpenAI Codex) sont des moyens facultatifs d'authentifier ces fournisseurs.

    Pour Anthropic dans OpenClaw, la répartition pratique est :

    - **Clé d'Anthropic (API) API** : facturation normale de l'Anthropic (API) API
    - **Authentification par abonnement Claude CLI (CLI) / Claude dans OpenClaw** : le personnel de Anthropic
      nous a informé que cette utilisation est à nouveau autorisée, et OpenClaw considère l'utilisation de `claude -p`
      comme approuvée pour cette intégration, sauf si Anthropic publie une nouvelle
      politique

    Pour les hôtes de passerèle à longue durée de vie, les clés d'Anthropic (API) API restent la configuration
    plus prévisible. L'OAuth OpenAI Codex est explicitement pris en charge pour les outils
    externes comme OAuth.

    OpenClaw prend également en charge d'autres options d'abonnement hébergées, notamment
    le **Plan de codage Cloud OpenClaw**, le **Plan de codage Qwen** et
    le **Plan de codage Z.AI / MiniMax**.

    Documentation : [GLM](/fr/providers/anthropic), [Anthropic](/fr/providers/openai),
    [OpenAI Cloud](/fr/providers/qwen),
    [Qwen](/fr/providers/minimax), [Modèles MiniMax](/fr/providers/glm),
    [Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé API ?">
    Oui.

    Le personnel d'Anthropic nous a informés que l'utilisation de la ligne de commande Claude style OpenClaw est à nouveau autorisée, donc OpenClaw considère l'authentification par abonnement Claude et l'utilisation de `claude -p` comme approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Si vous souhaitez la configuration côté serveur la plus prévisible, utilisez plutôt une clé API Anthropic.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui.

    Le personnel d'Anthropic nous a informés que cette utilisation est à nouveau autorisée, donc OpenClaw considère la réutilisation de la ligne de commande Claude et l'utilisation de `claude -p` comme approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique.

    Le jeton de configuration (setup-token) d'Anthropic est toujours disponible en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw privilégie désormais la réutilisation de la ligne de commande Claude et `claude -p` lorsqu'elles sont disponibles.
    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé API Anthropic reste le choix le plus sûr et le plus prévisible. Si vous souhaitez d'autres options d'hébergement par abonnement dans OpenClaw, consultez [OpenAI](/fr/providers/openai), [Qwen / Model
    Cloud](/fr/providers/qwen), [MiniMax](/fr/providers/minimax) et [Modèles
    GLM](/fr/providers/glm).

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="Pourquoi je vois HTTP 429 rate_limit_error de la part d'Anthropic ?">
    Cela signifie que votre **quota/limite de taux Anthropic** est épuisé pour la fenêtre actuelle. Si vous
    utilisez **Claude CLI**, attendez que la fenêtre se réinitialise ou augmentez votre plan. Si vous
    utilisez une **clé Anthropic API**, vérifiez la console Anthropic
    pour l'utilisation/la facturation et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`, la requête essaie d'utiliser
    la version bêta de contexte 1M d'Anthropic (`context1m: true`). Cela ne fonctionne que lorsque vos
    identifiants sont éligibles à la facturation à long contexte (facturation par clé API ou le
    chemin de connexion Claude OpenClaw avec Extra Usage activé).

    Astuce : définissez un **model de secours** pour que OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le taux.
    Voir [Modèles](/fr/cli/models), [OAuth](/fr/concepts/oauth) et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?">
  Oui. OpenClaw dispose d'un fournisseur **Amazon Bedrock (Converse)** intégré. Avec les marqueurs d'environnement AWS présents, OpenClaw peut découvrir automatiquement le catalogue Bedrock streaming/texte et le fusionner en tant que fournisseur implicite `amazon-bedrock` ; sinon, vous pouvez explicitement activer `plugins.entries.amazon-bedrock.config.discovery.enabled` ou ajouter une entrée de
  fournisseur manuelle. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'auth Codex ?">
  OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). Utilisez `openai-codex/gpt-5.5` pour l'OAuth Codex via le runner PI par défaut. Utilisez `openai/gpt-5.5` pour un accès direct par clé API OpenAI. GPT-5.5 peut également utiliser l'abonnement/OAuth via `openai-codex/gpt-5.5` ou les exécutions natives du serveur d'application Codex avec `openai/gpt-5.5` et
  `agentRuntime.id: "codex"`. Voir [Fournisseurs de modèles](/fr/concepts/model-providers) et [Onboarding (CLI)](/fr/start/wizard).
</Accordion>

  <Accordion title="Pourquoi OpenClaw mentionne-t-il toujours openai-codex ?">
    `openai-codex` est l'identifiant du fournisseur et du profil d'auth pour ChatGPT/Codex OAuth.
    C'est également le préfixe de modèle PI explicite pour l'OAuth Codex :

    - `openai/gpt-5.5` = itinéraire actuel par clé API OpenAI directe dans PI
    - `openai-codex/gpt-5.5` = itinéraire OAuth Codex dans PI
    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = itinéraire du serveur d'application Codex natif
    - `openai-codex:...` = id du profil d'auth, pas une référence de modèle

    Si vous souhaitez l'itinéraire de facturation/limite direct de la plateforme OpenAI, définissez
    `OPENAI_API_KEY`. Si vous souhaitez l'auth par abonnement ChatGPT/Codex, connectez-vous avec
    `openclaw models auth login --provider openai-codex` et utilisez
    les références de modèle `openai-codex/*` pour les exécutions PI.

  </Accordion>

  <Accordion title="Pourquoi les limites OAuth Codex peuvent-elles différer de celles de ChatGPT web ?">
    L'OAuth Codex utilise des fenêtres de quota gérées par OpenAI et dépendantes du plan. Dans la pratique,
    ces limites peuvent différer de l'expérience du site Web/application ChatGPT, même lorsque
    les deux sont liées au même compte.

    OpenClaw peut afficher les fenêtres d'utilisation/quota du fournisseur actuellement visibles dans
    `openclaw models status`, mais il n'invente pas et ne normalise pas les droits ChatGPT-web
    en accès API direct. Si vous souhaitez l'itinéraire de facturation/limite direct de la plateforme OpenAI,
    utilisez `openai/*` avec une clé API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge **l'abonnement OpenAI Code (Codex) OAuth**.
    OpenAI autorise explicitement l'utilisation de l'abonnement OAuth dans les outils/workflows externes
    tels que OpenClaw. Le processus d'intégration peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/fr/concepts/oauth), [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

  </Accordion>

  <Accordion title="Comment configurer CLI OAuth ?">
    CLI CLI utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

    Étapes :

    1. Installez npm OAuth localement pour que `gemini` soit sur `PATH`
       - Homebrew : `brew install gemini-cli`
       - OAuth : `npm install -g @google/gemini-cli`
    2. Activez le plugin : `openclaw plugins enable google`
    3. Connectez-vous : `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modèle par défaut après la connexion : `google-gemini-cli/gemini-3-flash-preview`
    5. Si les requêtes échouent, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle

    Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/fr/concepts/model-providers).

  </Accordion>

<Accordion title="Un modèle local convient-il pour les discussions décontractées ?">
  En général, non. OpenClaw nécessite un contexte important + une sécurité renforcée ; les petites cartes tronquent et fuient. Si vous devez le faire, exécutez la construction de modèle la plus **grande** possible localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de prompt - voir
  [Sécurité](/fr/gateway/security).
</Accordion>

<Accordion title="Comment garder le trafic du modèle hébergé dans une région spécifique ?">
  Choisissez des points de terminaison épinglés par région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les replis restent disponibles tout en respectant le
  fournisseur régional que vous sélectionnez.
</Accordion>

  <Accordion title="Do I have to buy a Mac Mini to install this?">
    Non. OpenClaw fonctionne sur macOS ou Linux (Windows via WSL2). Un Mac mini est optionnel - certaines personnes
    en achètent un comme hôte toujours actif, mais un petit VPS, un serveur domestique ou une boîte de classe Raspberry Pi fonctionne également.

    Vous n'avez besoin d'un Mac que pour les outils **uniques à macOS**. Pour iMessage, utilisez [BlueBubbles](/fr/channels/bluebubbles) (recommandé) - le serveur BlueBubbles fonctionne sur n'importe quel Mac, et la Gateway peut fonctionner sur Linux ou ailleurs. Si vous souhaitez d'autres outils uniques à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

    Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nodes](/fr/nodes), [Mac remote mode](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="Do I need a Mac mini for iMessage support?">
    Vous avez besoin d'un **appareil macOS connecté** à Messages. Ce n'**pas** obligé que ce soit un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/fr/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles fonctionne sur macOS, tandis que la Gateway peut fonctionner sur Linux ou ailleurs.

    Configurations courantes :

    - Exécutez la Gateway sur Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
    - Exécutez tout sur le Mac si vous souhaitez la configuration la plus simple sur une seule machine.

    Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nodes](/fr/nodes),
    [Mac remote mode](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="If I buy a Mac mini to run OpenClaw, can I connect it to my MacBook Pro?">
    Oui. Le **Mac mini peut exécuter la Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds n'exécutent pas la Gateway - ils fournissent des
    capacités supplémentaires comme écran/caméra/toile et `system.run` sur cet appareil.

    Modèle courant :

    - Gateway sur le Mac mini (toujours actif).
    - Le MacBook Pro exécute l'application macOS ou un hôte de nœud et s'apparie à la Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

    Documentation : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun est **déconseillé**. Nous rencontrons des bugs d'exécution, notamment avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez tout de même expérimenter Bun, faites-le sur une passerelle non de production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram : quoi mettre dans allowFrom ?">
    `channels.telegram.allowFrom` est **l'ID utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'installation demande uniquement des ID utilisateur numériques. Si vous avez déjà des entrées `@username` héritées dans la configuration, `openclaw doctor --fix` peut essayer de les résoudre.

    Plus sécurisé (pas de bot tiers) :

    - Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

    API Officielle de Bot :

    - Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - Envoyez un DM à `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/fr/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec des instances OpenClaw différentes ?">
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne ait son propre espace de travail et son propre stockage de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agent) et [WhatsApp](/fr/channels/whatsapp).
</Accordion>

<Accordion title='Puis-je exécuter un agent de "chat rapide" et un agent "Opus pour le codage" ?'>
  Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre model par défaut, puis liez les routes entrantes (compte fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Models](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).
</Accordion>

  <Accordion title="Homebrew fonctionne-t-il sur Linux ?">
    Oui. Homebrew prend en charge Linux (Linuxbrew). Configuration rapide :

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés par `brew` soient résolus dans les shells non-login.
    Les versions récentes ajoutent également au début les répertoires bin utilisateur courants dans les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et respectent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR`, et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="Différence entre l'installation git modifiable et l'installation npm">
    - **Installation modifiable (git) :** extraction complète des sources, modifiable, idéal pour les contributeurs.
      Vous exécutez les builds localement et pouvez appliquer des correctifs au code/docs.
    - **installation npm :** installation CLI globale, sans dépôt, idéal pour "juste l'exécuter".
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/fr/start/getting-started), [Updating](/fr/install/updating).

  </Accordion>

  <Accordion title="Puis-je passer d'une installation npm à git ultérieurement ?">
    Oui. Utilisez `openclaw update --channel ...` lorsque npm est déjà installé.
    Cela **ne supprime pas vos données** - cela ne fait que modifier l'installation du code OpenClaw.
    Votre état (`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`) restent intacts.

    De npm vers git :

    ```bash
    openclaw update --channel dev
    ```

    De git vers npm :

    ```bash
    openclaw update --channel stable
    ```

    Ajoutez `--dry-run` pour prévisualiser d'abord le changement de mode prévu. Le programme de mise à jour exécute les suites de vérifications du Doctor, actualise les sources des plugins pour le canal cible et redémarre la passerelle, sauf si vous passez `--no-restart`.

    Le programme d'installation peut également forcer l'un ou l'autre mode :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="Dois-je exécuter la passerelle (Gateway) sur mon ordinateur portable ou un VPS ?">
    Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le moins de friction possible et que le mode veille/redémarrage ne vous pose pas de problème, exécutez-le localement.

    **Ordinateur portable (passerelle locale)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur active.
    - **Inconvénients :** mise en veille/pertes de réseau = déconnexions, les mises à jour/redémarrages du OS interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours allumé, réseau stable, pas de problème de mise en veille de l'ordinateur portable, plus facile à maintenir en fonctionnement.
    - **Inconvénients :** souvent sans écran (headless) (utilise des captures d'écran), accès aux fichiers à distance uniquement, vous devez utiliser SSH pour les mises à jour.

    **Remarque spécifique à Gateway :** Gateway/OpenClaw/WhatsApp/Telegram/Slack fonctionnent tous correctement depuis un VPS. Le seul véritable compromis est entre un **navigateur headless** et une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

    **Recommandation par défaut :** VPS si vous avez déjà eu des déconnexions de la passerelle. Le mode local est idéal lorsque vous utilisez activement le Mac et que vous souhaitez accéder aux fichiers locaux ou utiliser l'automatisation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?">
    Ce n'est pas obligatoire, mais **recommandé pour la fiabilité et l'isolement**.

    - **Hôte dédié (VPS/Mac mini/Pi) :** toujours actif, moins d'interruptions dues à la mise en veille ou au redémarrage, autorisations plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait adapté pour les tests et l'utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou effectue des mises à jour.

    Si vous souhaitez combiner le meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nodes](/fr/nodes).
    Pour des conseils de sécurité, lisez [Security](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quelles sont les configuration minimale requise pour un VPS et le système d'exploitation recommandé ?">
    OpenClaw est léger. Pour un Gateway de base + un channel de discussion :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (logs, médias, plusieurs channels). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    OS : utilisez **Ubuntu LTS** (ou n'importe quel Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé sur ces systèmes.

    Documentation : [Linux](/fr/platforms/linux), [Hébergement VPS](/fr/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une VM et quelles sont les exigences ?">
    Oui. Traitez une VM comme un VPS : elle doit être toujours allumée, accessible et disposer de suffisamment
    de RAM pour le Gateway et tous les channels que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM.
    - **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs channels, l'automatisation du navigateur ou des outils multimédias.
    - **OS :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

    Si vous êtes sur Windows, **WSL2 est la configuration de style VM la plus simple** et offre la meilleure compatibilité
    des outils. Voir [Windows](/fr/platforms/windows), [Hébergement VPS](/fr/vps).
    Si vous exécutez macOS dans une VM, voir [macOS VM](/fr/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Connexes

- [FAQ](/fr/help/faq) — la FAQ principale (modèles, sessions, gateway, sécurité, plus)
- [Aperçu de l'installation](/fr/install)
- [Getting started](/fr/start/getting-started)
- [Dépannage](/fr/help/troubleshooting)
