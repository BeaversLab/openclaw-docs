---
summary: "FAQ : démarrage rapide et configuration du premier lancement — installation, intégration, authentification, abonnements, échecs initiaux"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "FAQ : configuration du premier lancement"
sidebarTitle: "FAQ du premier lancement"
---

Questions-réponses sur le démarrage rapide et la première exécution. Pour les opérations quotidiennes, les modèles, l'authentification, les sessions et le troubleshooting, consultez la [FAQ](/fr/help/faq) principale.

## Démarrage rapide et configuration du premier lancement

<AccordionGroup>
  <Accordion title="Je suis bloqué, moyen le plus rapide de get unstuck">
    Utilisez un agent IA local qui peut **voir votre machine**. C'est beaucoup plus efficace que de demander
    sur Discord, car la plupart des cas "Je suis bloqué" sont des **problèmes de configuration locale ou d'environnement** que
    les assistants à distance ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
    au niveau de la machine (PATH, services, permissions, fichiers d'auth). Donnez-leur le **checkout complet des sources** via
    l'installation piratable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un git checkout**, afin que l'agent puisse lire le code + les docs et
    raisonner sur la version exacte que vous exécutez. Vous pouvez toujours revenir à la version stable plus tard
    en réexécutant l'installateur sans `--install-method git`.

    Astuce : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis d'exécuter uniquement les
    commandes nécessaires. Cela permet de maintenir les modifications mineures et plus faciles à auditer.

    Si vous découvrez un vrai bogue ou une correction, veuillez ouvrir une issue GitHub ou envoyer une PR :
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Commencez par ces commandes (partagez les sorties lorsque vous demandez de l'aide) :

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Ce qu'elles font :

    - `openclaw status` : capture rapide de l'état de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'authentification du provider + la disponibilité des modèles.
    - `openclaw doctor` : valide et répare les problèmes de configuration/état courants.

    Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [First 60 seconds if something is broken](/fr/help/faq#first-60-seconds-if-something-is-broken).
    Documentation d'installation : [Install](/fr/install), [Installer flags](/fr/install/installer), [Updating](/fr/install/updating).

  </Accordion>

  <Accordion title="Le battement de cœur (heartbeat) continue d'être ignoré. Que signifient les motifs d'ignore ?">
    Raisons courantes d'ignore du battement de cœur :

    - `quiet-hours` : en dehors de la fenêtre active-hours configurée
    - `empty-heartbeat-file` : `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou avec uniquement des en-têtes
    - `no-tasks-due` : le mode de tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâche n'est encore arrivé à échéance
    - `alerts-disabled` : toute la visibilité du battement de cœur est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés)

    En mode tâche, les horodatages d'échéance ne sont avancés qu'après l'achèvement d'une exécution réelle du battement de cœur.
    Les exécutions ignorées ne marquent pas les tâches comme terminées.

    Documentation : [Heartbeat](/fr/gateway/heartbeat), [Automation](/fr/automation).

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

    - **Tailscale Serve** (recommandé) : gardez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de secret partagé collé, suppose un hôte de Gateway de confiance) ; les API HTTP nécessitent toujours une authentification par secret partagé, sauf si vous utilisez délibérément un `none` private-ingress ou une authentification HTTP trusted-proxy.
      Les mauvaises tentatives d'authentification Serve simultanées du même client sont sérialisées avant que le limiteur d'échecs d'authentification ne les enregistre, de sorte que la deuxième mauvaise tentative peut déjà afficher `retry later`.
    - **Tailnet bind** : exécutez `openclaw gateway --bind tailnet --token "<token>"` (ou configurez l'authentification par mot de passe), ouvrez `http://<tailscale-ip>:18789/`, puis collez le secret partagé correspondant dans les paramètres du tableau de bord.
    - **Reverse proxy avec identité** : gardez le Gateway derrière un proxy de confiance, configurez `gateway.auth.mode: "trusted-proxy"`, puis ouvrez l'URL du proxy. Les proxies loopback sur le même hôte nécessitent `gateway.auth.trustedProxy.allowLoopback = true` explicite.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`. L'authentification par secret partagé s'applique toujours via le tunnel ; collez le jeton ou le mot de passe configuré si demandé.

    Voir [Dashboard](/fr/web/dashboard) et [Web surfaces](/fr/web) pour les modes de liaison et les détails d'authentification.

  </Accordion>

  <Accordion title="Pourquoi existe-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?">
    Elles contrôlent différentes couches :

    - `approvals.exec` : transfère les invites d'approbation vers les destinations de chat
    - `channels.<channel>.execApprovals` : fait en sorte que ce channel agisse comme un client d'approbation natif pour les approbations d'exécution

    La stratégie d'exécution de l'hôte reste toujours la véritable porte d'approbation. La configuration du chat contrôle uniquement l'endroit où les invites d'approbation apparaissent et la manière dont les personnes peuvent y répondre.

    Dans la plupart des configurations, vous n'avez **pas** besoin des deux :

    - Si le chat prend déjà en charge les commandes et les réponses, `/approve` du même chat fonctionne via le chemin partagé.
    - Si un channel natif pris en charge peut déduire les approbateurs en toute sécurité, OpenClaw active désormais automatiquement les approbations natives DM-first lorsque `channels.<channel>.execApprovals.enabled` n'est pas défini ou `"auto"`.
    - Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal ; l'agent ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    - Utilisez `approvals.exec` uniquement lorsque les invites doivent également être transférées vers d'autres chats ou des salles d'opérations explicites.
    - Utilisez `channels.<channel>.execApprovals.target: "channel"` ou `"both"` uniquement lorsque vous souhaitez explicitement que les invites d'approbation soient renvoyées dans la salle/sujet d'origine.
    - Les approbations de plugins sont à nouveau séparées : elles utilisent `/approve` du même chat par défaut, un transfert `approvals.plugin` facultatif, et seuls certains channels natifs conservent la gestion native des approbations de plugins au-dessus.

    Version courte : le transfert est pour le routage, la configuration du client natif est pour une UX spécifique au channel plus riche.
    Voir [Exec Approvals](/fr/tools/exec-approvals).

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun n'est **pas recommandé** pour le Gateway.
  </Accordion>

  <Accordion title="Does it run on Raspberry Pi?">
    Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque suffisent pour un usage personnel, et notez qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous souhaitez une marge supplémentaire (logs, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum strict.

    Astuce : un petit Raspberry Pi/VPS peut héberger le Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur portable/téléphone pour
    un accès local à l'écran/caméra/canevas ou pour l'exécution de commandes. Voir [Nœuds](/fr/nodes).

  </Accordion>

  <Accordion title="Any tips for Raspberry Pi installs?">
    Version courte : ça fonctionne, mais attendez-vous à quelques aspérités.

    - Utilisez un OS **64 bits** et gardez Node >= 22.
    - Privilégiez l'**installation piratable (git)** afin de pouvoir voir les logs et mettre à jour rapidement.
    - Commencez sans canaux/compétences, puis ajoutez-les un par un.
    - Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

    Documentation : [Linux](/fr/platforms/linux), [Install](/fr/install).

  </Accordion>

  <Accordion title="It is stuck on wake up my friend / onboarding will not hatch. What now?">
    Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
    « Wake up, my friend! » automatiquement au premier éclosion. Si vous voyez cette ligne avec **aucune réponse**
    et que les tokens restent à 0, l'agent n'a jamais démarré.

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

    3. Si ça reste bloqué, exécutez :

    ```bash
    openclaw doctor
    ```

    Si le Gateway est distant, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
    pointe vers le bon Gateway. Voir [Accès distant](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'onboarding ?">
    Oui. Copiez le **répertoire d'état** et le **workspace**, puis exécutez Doctor une fois. Cela
    permet à votre bot de rester "exactement le même" (mémoire, historique des sessions, auth et état du
    channel) tant que vous copiez **les deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre workspace (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'auth, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, souvenez-vous que l'hôte de la passerelle possède le magasin de sessions et le workspace.

    **Important :** si vous ne faites que commit/push votre workspace sur GitHub, vous sauvegardez
    **la mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ni l'auth. Ceux-ci résident
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migrating](/fr/install/migrating), [Where things live on disk](/fr/help/faq#where-things-live-on-disk),
    [Agent workspace](/fr/concepts/agent-workspace), [Doctor](/fr/gateway/doctor),
    [Remote mode](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-je voir les nouveautés de la dernière version ?">
    Consultez le journal des modifications GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section du haut est marquée **Unreleased**, la prochaine section
    datée est la dernière version livrée. Les entrées sont regroupées par **Highlights**, **Changes** et
    **Fixes** (ainsi que des sections docs/autres si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via la sécurité
    avancée Xfinity. Désactivez-la ou mettez `docs.openclaw.ai` sur la liste blanche, puis réessayez.
    Aidez-nous à débloquer le site en le signalant ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne parvenez toujours pas à accéder au site, la documentation est en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **dist-tags npm**, et non des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version précoce pour tests

    Habituellement, une version stable arrive d'abord sur **beta**, puis une étape
    de promotion explicite déplace cette même version vers `latest`. Les mainteneurs peuvent également
    publier directement sur `latest` si nécessaire. C'est pourquoi beta et stable peuvent
    pointer vers la **même version** après promotion.

    Voir ce qui a changé :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les lignes de commande d'installation et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version beta et quelle est la différence entre beta et dev ?">
    **Beta** est le dist-tag npm `beta` (peut correspondre à `latest` après promotion).
    **Dev** est la tête mobile de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

    Lignes de commande (macOS/Linux) :

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Installateur Windows (PowerShell) :
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Indicateurs d'installation](/fr/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les derniers bits ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule vers la branche `main` et met à jour à partir des sources.

    2. **Installation modifiable (à partir du site de l'installateur) :**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

    Si vous préférez un clone manuel propre, utilisez :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Docs : [Mise à jour](/fr/cli/update), [Canaux de développement](/fr/install/development-channels),
    [Installation](/fr/install).

  </Accordion>

  <Accordion title="Combien de temps prennent généralement l'installation et l'onboarding ?">
    Guide approximatif :

    - **Installation :** 2-5 minutes
    - **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

    Si cela bloque, utilisez [Installateur bloqué](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="Installateur bloqué ? Comment obtenir plus de commentaires ?">
    Relancez l'installateur avec une **sortie verbeuse** :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Installation bêta avec mode verbeux :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Pour une installation modifiable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Équivalent Windows (PowerShell) :

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    Plus d'options : [Indicateurs de l'installateur](/fr/install/installer).

  </Accordion>

  <Accordion title="WindowsL'installation sur Windows indique que git est introuvable ou que openclaw n'est pas reconnu"WindowsnpmWindows>
    Deux problèmes courants sous Windows :

    **1) erreur npm spawn git / git non trouvé**

    - Installez **Git pour Windows** et assurez-vous que `git`npm est dans votre PATH.
    - Fermez et rouvrez PowerShell, puis relancez le programme d'installation.

    **2) openclaw n'est pas reconnu après l'installation**

    - Le dossier global bin de npm n'est pas dans le PATH.
    - Vérifiez le chemin :

      ```powershell
      npm config get prefix
      ```

    - Ajoutez ce répertoire au PATH de votre utilisateur (pas de suffixe `\bin`Windows nécessaire sous Windows ; sur la plupart des systèmes c'est `%AppData%\npm`WindowsWSL2WindowsWindows).
    - Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

    Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** à la place de Windows natif.
    Docs : [Windows](/fr/platforms/windows).

  </Accordion>

  <Accordion title="WindowsLa sortie exec de Windows affiche du texte chinois illisible - que dois-je faire ?"Windows>
    Il s'agit généralement d'une inadéquation de la page de code de la console sur les shells Windows natifs.

    Symptômes :

    - La sortie `system.run`/`exec` affiche du chinois sous forme de mojibake
    - La même commande s'affiche correctement dans un autre profil de terminal

    Solution de contournement rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```Gateway

    Redémarrez ensuite la passerelle et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```OpenClaw

    Si vous reproduisez toujours ce problème sur la dernière version d'OpenClaw, suivez/signalez-le ici :

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?">
    Utilisez l'**installation hackable (git)** afin d'avoir la source et la documentation en local, puis demandez
    à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre précisément.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Plus de détails : [Install](/fr/install) et [Installer flags](/fr/install/installer).

  </Accordion>

  <Accordion title="OpenClawLinuxComment installer OpenClaw sur Linux ?"LinuxLinuxLinux>
    Réponse courte : suivez le guide Linux, puis lancez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
    - Guide complet : [Getting Started](/fr/start/getting-started).
    - Installateur + mises à jour : [Install & updates](/fr/install/updating).

  </Accordion>

  <Accordion title="OpenClawComment installer OpenClaw sur un VPS ?"LinuxTailscaleGateway>
    Tout VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour atteindre la Gateway.

    Guides : [exe.dev](/fr/install/exe-devHetzner), [Hetzner](/fr/install/hetznerFly.io), [Fly.io](/fr/install/flyGateway).
    Accès distant : [Gateway remote](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation cloud/VPS ?">
    Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/fr/install/fly)
    - [Hetzner](/fr/install/hetzner)
    - [exe.dev](/fr/install/exe-dev)

    Fonctionnement dans le cloud : le **Gateway s'exécute sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + votre espace de travail
    résident sur le serveur, traitez donc l'hôte comme source de vérité et sauvegardez-le.

    Vous pouvez jumeler des **nœuds** (Mac/iOS/Android/headless) à ce Gateway cloud pour accéder
    à l'écran/à la caméra/au canvas locaux ou exécuter des commandes sur votre ordinateur tout en conservant le
    Gateway dans le cloud.

    Hub : [Plateformes](/fr/platforms). Accès à distance : [Gateway distant](/fr/gateway/remote).
    Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le processus de mise à jour peut redémarrer la
    Gateway (ce qui coupe la session active), peut nécessiter un git checkout propre, et
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

    Documentation : [Mise à jour](/fr/cli/update), [Mises à jour](/fr/install/updating).

  </Accordion>

  <Accordion title="Que fait réellement l'intégration ?">
    `openclaw onboard`OAuthAPIAnthropicGatewayWhatsAppTelegramDiscordMattermostSignaliMessagemacOSLinuxWSL2 est le chemin d'installation recommandé. En **mode local**, il vous guide à travers :

    - **Configuration de modèle/auth** (OAuth du provider, clés API, jeton de configuration Anthropic, ainsi que les options de modèle local comme LM Studio)
    - Emplacement de l'**Espace de travail** + fichiers d'amorçage
    - Paramètres du **Passerelle** (bind/port/auth/tailscale)
    - **Canaux** (WhatsApp, Telegram, Discord, Mattermost, Signal, iMessage, ainsi que les plugins de canal inclus comme QQ Bot)
    - **Installation du démon** (LaunchAgent sur macOS ; unité utilisateur systemd sur Linux/WSL2)
    - **Contrôles de santé** et sélection des **compétences**

    Il vous avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

  </Accordion>

  <Accordion title="OpenAIAi-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci ?"OpenClawAPIAnthropicOpenAIOpenAIAnthropicOpenClawAnthropicAPIAnthropicAPICLIOpenClawAnthropicOpenClaw>
    Non. Vous pouvez exécuter OpenClaw avec des **clés d'API** (Anthropic/OpenAI/autres) ou avec
    des **modèles uniquement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou OpenAI Codex) sont des méthodes facultatives pour authentifier ces fournisseurs.

    Pour Anthropic dans OpenClaw, la distinction pratique est la suivante :

    - **Clé d'API Anthropic** : facturation normale de l'API Anthropic
    - **Authentification via Claude CLI / abonnement Claude dans OpenClaw** : le personnel d'Anthropic
      nous a informés que cet usage est à nouveau autorisé, et OpenClaw considère l'usage de `claude -p`AnthropicAnthropicAPIOpenAIOAuthOpenClawOpenClawQwenMiniMaxGLMAnthropic
      comme approuvé pour cette intégration, sauf si Anthropic publie une nouvelle
      politique

    Pour les hôtes de passerelle à longue durée de vie, les clés d'API Anthropic restent la configuration
    la plus prévisible. L'OAuth OpenAI Codex est explicitement pris en charge pour les outils
    externes tels qu'OpenClaw.

    OpenClaw prend également en charge d'autres options d'abonnement hébergées, notamment
    le **Forfait de codage cloud Qwen**, le **Forfait de codage MiniMax** et
    le **Forfait de codage Z.AI / GLM**.

    Documentation : [Anthropic](/fr/providers/anthropicOpenAI), [OpenAI](/fr/providers/openaiQwen),
    [Qwen Cloud](/fr/providers/qwenMiniMax),
    [MiniMax](/fr/providers/minimaxGLM), [Z.AI (GLM)](/fr/providers/zai),
    [Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé d'API ?">
    Oui.

    Le personnel de Anthropic nous a informé que l'utilisation de la OpenClaw Claude de style CLI est à nouveau autorisée, donc OpenClaw considère l'authentification par abonnement Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Si vous souhaitez la configuration côté serveur la plus prévisible, utilisez plutôt une clé d'Anthropic API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui.

    Le personnel d'Anthropic nous a informés que cet usage est à nouveau autorisé, donc OpenClaw considère
    la réutilisation du CLI Claude et l'utilisation de `claude -p` comme approuvées pour cette intégration
    à moins que Anthropic ne publie une nouvelle politique.

    Le setup-token d'Anthropic est toujours disponible en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw préfère désormais la réutilisation du CLI Claude et `claude -p` lorsqu'ils sont disponibles.
    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé Anthropic API reste le
    choix le plus sûr et le plus prévisible. Si vous souhaitez d'autres options hébergées par abonnement
    dans OpenClaw, consultez [OpenAI](/fr/providers/openai), [Qwen / Model
    Cloud](/fr/providers/qwen), [MiniMax](/fr/providers/minimax) et [GLM
    Models](/fr/providers/zai).

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="Pourquoi vois-je l'erreur HTTP 429 rate_limit_error de la part d'Anthropic ?">
    Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
    utilisez la **CLI Claude**, attendez que la fenêtre se réinitialise ou passez à un plan supérieur. Si vous
    utilisez une **clé Anthropic API**, vérifiez la console Anthropic
    pour l'utilisation/billing et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`, la requête essaie d'utiliser
    la fenêtre de contexte de 1M d'Anthropic (un modèle Claude 4.x 1M compatible GA ou une configuration
    `context1m: true` héritée). Cela ne fonctionne que lorsque vos identifiants sont éligibles
    à la facturation pour contexte long (facturation par clé API ou le chemin de connexion Claude OpenClaw
    avec Extra Usage activé).

    Astuce : définissez un **modèle de secours** pour qu'OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le débit.
    Voir [Modèles](/fr/cli/models), [OAuth](/fr/concepts/oauth) et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?">
  Oui. OpenClaw dispose d'un fournisseur **Amazon Bedrock (Converse)** intégré. Avec les marqueurs d'environnement AWS présents, OpenClaw peut découvrir automatiquement le catalogue Bedrock streaming/texte et le fusionner en tant que fournisseur implicite `amazon-bedrock` ; sinon, vous pouvez activer explicitement `plugins.entries.amazon-bedrock.config.discovery.enabled` ou ajouter une entrée de
  fournisseur manuelle. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'auth Codex ?">
  OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). Utilisez `openai/gpt-5.5` pour la configuration courante : auth d'abonnement ChatGPT/Codex plus exécution native de serveur d'application Codex. Les références GPT Codex héritées sont une configuration héritée réparée par `openclaw doctor --fix`. L'accès direct par clé d'OpenAI API reste disponible pour les surfaces
  d'OpenAI API`openai` non-agent et pour les modèles d'agent via un profil de clé d'API commandé. Voir [Model providers](/fr/concepts/model-providers) et [Onboarding (CLI)](/fr/start/wizard).
</Accordion>

  <Accordion title="OpenClawOpenAIPourquoi OpenClaw mentionne-t-il toujours le préfixe Codex hérité d'OpenAI ?">
    `openai`OpenAIAPIOAuthOpenAI est l'identifiant du fournisseur et du profil d'authentification pour les clés de l'API OpenAI ainsi que pour
    OAuth ChatGPT/Codex. Vous pouvez encore voir le préfixe Codex hérité d'OpenAI dans la configuration héritée et
    les avertissements de migration.
    Les anciennes configurations l'utilisaient également comme préfixe de modèle :

    - `openai/gpt-5.5` = Authentification par abonnement ChatGPT/Codex avec le runtime natif Codex pour les tours de l'agent
    - ref GPT-5.5 Codex héritée = itinéraire de modèle hérité réparé par `openclaw doctor --fix`
    - `openai/gpt-5.5` plus un profil de clé API `openai`APIAPIOpenAI ordonné = Authentification par clé API pour un modèle d'agent OpenAI
    - ids de profil d'authentification Codex hérités = id de profil d'authentification hérité migré par `openclaw doctor --fix`OpenAI

    Si vous souhaitez la voie directe de facturation/limite de la plateforme OpenAI, définissez
    `OPENAI_API_KEY`. Si vous souhaitez l'authentification par abonnement ChatGPT/Codex, connectez-vous avec
    `openclaw models auth login --provider openai`. Conservez la référence du modèle comme
    `openai/gpt-5.5` ; les références de modèle Codex héritées sont une configuration héritée que
    `openclaw doctor --fix` réécrit.

  </Accordion>

  <Accordion title="OAuthPourquoi les limites OAuth Codex peuvent-elles différer de celles de ChatGPT web ?"OAuthOpenAIOpenClaw>
    OAuth Codex utilise des fenêtres de quota gérées par OpenAI et dépendantes du plan. En pratique,
    ces limites peuvent différer de l'expérience du site Web/de l'application ChatGPT, même lorsque
    les deux sont liées au même compte.

    OpenClaw peut afficher les fenêtres d'utilisation/quota du fournisseur actuellement visibles dans
    `openclaw models status`APIOpenAI, mais il n'invente pas et ne normalise pas les droits ChatGPT-web
    en un accès direct à l'API. Si vous souhaitez la voie directe de facturation/limite de la plateforme OpenAI,
    utilisez `openai/*`API avec une clé API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge l'OpenAI d'abonnement **OAuth Code (Codex)**.
    OpenAI autorise explicitement l'utilisation de l'OAuth d'abonnement dans des outils/workflows externes
    tels que OpenClaw. L'intégration peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/fr/concepts/oauth), [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

  </Accordion>

  <Accordion title="Comment configurer CLI OAuth ?">
    CLI Gemini utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

    Étapes :

    1. Installez CLI Gemini localement afin que `gemini` soit sur `PATH`
       - Homebrew : `brew install gemini-cli`
       - npm : `npm install -g @google/gemini-cli`
    2. Activez le plugin : `openclaw plugins enable google`
    3. Connectez-vous : `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modèle par défaut après connexion : `google-gemini-cli/gemini-3-flash-preview`
    5. Si les requêtes échouent, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle

    Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/fr/concepts/model-providers).

  </Accordion>

<Accordion title="Un modèle local est-il adapté aux discussions informelles ?">
  Généralement non. OpenClaw nécessite un contexte important + une forte sécurité ; les petites cartes tronquent et fuient. Si vous le devez, exécutez la construction de modèle la **plus grande** possible localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de prompt - voir
  [Sécurité](/fr/gateway/security).
</Accordion>

<Accordion title="Comment faire pour que le trafic des modèles hébergés reste dans une région spécifique ?">
  Choisissez des points de terminaison épinglés à une région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour que les données restent dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en
  respectant le fournisseur régional que vous avez sélectionné.
</Accordion>

  <Accordion title="Dois-je acheter un Mac Mini pour installer ceci ?">
    Non. OpenClaw fonctionne sous macOS ou Linux (Windows via WSL2). Un Mac mini est facultatif — certaines personnes en achètent un comme hôte toujours actif, mais un petit VPS, un serveur domestique ou une boîte de classe Raspberry Pi fonctionne également.

    Vous n'avez besoin d'un Mac **que pour les outils exclusifs à macOS**. Pour iMessage, utilisez [iMessage](/fr/channels/imessage) avec `imsg` sur n'importe quel Mac connecté à Messages. Si la Gateway fonctionne sous Linux ou ailleurs, définissez `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg` sur ce Mac. Si vous souhaitez d'autres outils exclusifs à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

    Docs : [iMessage](/fr/channels/imessage), [Nodes](/fr/nodes), [Mac remote mode](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="iMessageAi-je besoin d'un Mac mini pour la prise en charge d'iMessage ?"macOSiMessage>
    Vous avez besoin d'un **appareil macOS** connecté à Messages. Ce n'est **pas** obligatoirement un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [iMessage](/fr/channels/imessage)** avec `imsg`Gateway ; la Gateway peut fonctionner sur ce Mac, ou elle peut fonctionner ailleurs avec un wrapper SSH `cliPath`GatewayLinux.

    Configurations courantes :

    - Faites fonctionner la Gateway sur Linux/VPS, et définissez `channels.imessage.cliPath` sur un wrapper SSH qui fait fonctionner `imsg`iMessage sur un Mac connecté à Messages.
    - Faites fonctionner tout sur le Mac si vous souhaitez la configuration monoposte la plus simple.

    Docs : [iMessage](/fr/channels/imessage), [Nodes](/fr/nodes),
    [Mac remote mode](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="OpenClawSi j'achète un Mac mini pour faire fonctionner OpenClaw, puis-je le connecter à mon MacBook Pro ?"GatewayGateway>
    Oui. Le **Mac mini peut faire fonctionner la Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds ne font pas fonctionner la Gateway - ils fournissent des
    fonctionnalités supplémentaires comme l'écran/caméra/toile et `system.run`GatewaymacOSGateway sur cet appareil.

    Motif courant :

    - Gateway sur le Mac mini (toujours allumé).
    - Le MacBook Pro fait fonctionner l'application macOS ou un hôte de nœud et s'apparie à la Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour la voir.

    Docs : [Nodes](/fr/nodesCLI), [Nodes CLI](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun est **déconseillé**. Nous rencontrons des bugs d'exécution, notamment avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez tout de même expérimenter Bun, faites-le sur une passerelle non de production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="TelegramTelegram : que faut-il mettre dans allowFrom ?">
    `channels.telegram.allowFrom`Telegram est **l'ID d'utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'installation demande uniquement des ID d'utilisateur numériques. Si vous avez déjà des entrées `@username` héritées dans la configuration, `openclaw doctor --fix` peut essayer de les résoudre.

    Plus sécurisé (pas de bot tiers) :

    - Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`API.

    API Bot officielle :

    - Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - Envoyez un DM à `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/fr/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="WhatsAppOpenClawPlusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?" WhatsApp>
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId`WhatsApp différent, afin que chaque personne dispose de son propre espace de travail et de son propre magasin de sessions. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès par DM
  (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`WhatsApp) est global par compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agentWhatsApp) et [WhatsApp](/fr/channels/whatsapp).
</Accordion>

<Accordion title="Puis-je exécuter un agent « fast chat » et un agent « Opus for coding » ?">
  Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre modèle par défaut, puis liez les routes entrantes (compte fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Modèles](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).
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
    Les versions récentes ajoutent également au début les répertoires bin utilisateur courants sur les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et respectent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="Différence entre l'installation hackable git et l'installation npm">
    - **Installation hackable (git) :** extraction complète du code source, modifiable, idéale pour les contributeurs.
      Vous exécutez les builds localement et pouvez corriger le code/docs.
    - **Installation npm :** installation globale CLI, sans dépôt, idéale pour "juste l'exécuter".
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/fr/start/getting-started), [Updating](/fr/install/updating).

  </Accordion>

  <Accordion title="npmPuis-je passer ultérieurement d'une installation npm à git ?">
    Oui. Utilisez `openclaw update --channel ...`OpenClawOpenClaw lorsque OpenClaw est déjà installé.
    Cela **ne supprime pas vos données** - cela ne modifie que l'installation du code OpenClaw.
    Votre état (`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`npm) restent intacts.

    De npm vers git :

    ```bash
    openclaw update --channel dev
    ```npm

    De git vers npm :

    ```bash
    openclaw update --channel stable
    ```

    Ajoutez `--dry-run` pour prévisualiser d'abord le changement de mode prévu. Le programme de mise à jour exécute les actions de suivi du Doctor, actualise les sources des plugins pour le channel cible et redémarre la passerelle, sauf si vous passez `--no-restart`.

    Le programme d'installation peut également forcer l'un ou l'autre mode :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](/fr/help/faq#where-things-live-on-disk).

  </Accordion>

  <Accordion title="GatewayDois-je exécuter la passerelle sur mon ordinateur portable ou un VPS ?"GatewayOpenClawWhatsAppTelegramSlackMattermostDiscord>
    Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le moins de frictions et que le sommeil/redémarrages ne vous dérangent pas, exécutez-la en local.

    **Ordinateur portable (passerelle locale)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
    - **Inconvénients :** mise en veille/dconnexions réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours actif, réseau stable, pas de problèmes de mise en veille de l'ordinateur portable, plus facile à maintenir en fonctionnement.
    - **Inconvénients :** souvent sans tête (utilisez des captures d'écran), accès aux fichiers uniquement à distance, vous devez utiliser SSH pour les mises à jour.

    **Note spécifique à OpenClaw :** WhatsApp/Telegram/Slack/Mattermost/Discord fonctionnent tous parfaitement depuis un VPS. Le seul véritable compromis est entre le **navigateur sans tête** et une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

    **Valeur par défaut recommandée :** VPS si vous avez déjà subi des déconnexions de la passerelle. Le mode local est idéal lorsque vous utilisez activement le Mac et que vous voulez un accès aux fichiers locaux ou une automatisation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="OpenClawQuelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?"Raspberry PiGateway>
    Non obligatoire, mais **recommandé pour la fiabilité et l'isolation**.

    - **Hôte dédié (VPS/Mac mini/Raspberry Pi) :** toujours actif, moins d'interruptions dues à la mise en veille/redémarrage, permissions plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait adapté pour les tests et l'utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou se met à jour.

    Si vous voulez le meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nœuds](/fr/nodes).
    Pour des conseils de sécurité, lisez [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quelles sont les exigences minimales du VPS et le système d'exploitation recommandé ?"OpenClawGatewayLinuxLinux>
    OpenClaw est léger. Pour un Gateway de base + un channel de discussion :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (journaux, médias, channels multiples). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    OS : utilisez **Ubuntu LTS** (ou tout Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

    Docs : [Linux](/fr/platforms/linux), [Hébergement VPS](/fr/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une machine virtuelle et quelles sont les prérequis ?">
    Oui. Traitez une machine virtuelle comme un serveur VPS : elle doit être toujours allumée, accessible et disposer de suffisamment
    de RAM pour le Gateway et tous les canaux que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM.
    - **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs canaux, une automatisation du navigateur ou des outils multimédias.
    - **OS :** Ubuntu LTS ou une autre version moderne de Debian/Ubuntu.

    Si vous êtes sur Windows, **WSL2 est la configuration de type VM la plus simple** et offre la meilleure compatibilité
    des outils. Voir [Windows](/fr/platforms/windows), [hébergement VPS](/fr/vps).
    Si vous exécutez macOS dans une machine virtuelle, voir [VM macOS](/fr/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Connexes

- [FAQ](/fr/help/faq) — la FAQ principale (modèles, sessions, passerelle, sécurité, etc.)
- [Aperçu de l'installation](/fr/install)
- [Getting started](/fr/start/getting-started)
- [Dépannage](/fr/help/troubleshooting)
