---
summary: "FAQ : démarrage rapide et configuration du premier lancement — installation, intégration, authentification, abonnements, échecs initiaux"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "FAQ : configuration du premier lancement"
sidebarTitle: "FAQ du premier lancement"
---

Q&A sur le démarrage rapide et la première exécution. Pour les opérations quotidiennes, les modèles, l'authentification, les sessions et le dépannage, consultez la FAQ principale [FAQ](/fr/help/faq).

## Démarrage rapide et configuration du premier lancement

<AccordionGroup>
  <Accordion title="Je suis bloqué, moyen le plus rapide de débloquer la situation">
    Utilisez un agent IA local qui peut **voir votre machine**. C'est beaucoup plus efficace que de demander sur Discord, car la plupart des cas "Je suis bloqué" sont des **problèmes de configuration ou d'environnement locaux** que les assistants à distance ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration au niveau de la machine (PATH, services, autorisations, fichiers d'auth). Donnez-leur le **checkout complet des sources** via l'installation hackable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un checkout git**, afin que l'agent puisse lire le code + la documentation et raisonner sur la version exacte que vous exécutez. Vous pourrez toujours revenir à la version stable ultérieurement en réexécutant l'installateur sans `--install-method git`.

    Conseil : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis n'exécutez que les commandes nécessaires. Cela limite les modifications et facilite leur audit.

    Si vous découvrez un vrai bug ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Commencez par ces commandes (partagez les résultats lorsque vous demandez de l'aide) :

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Ce qu'elles font :

    - `openclaw status` : instantané de l'état de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'auth du fournisseur + la disponibilité du modèle.
    - `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

    Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [Premières 60 secondes si quelque chose ne fonctionne pas](/fr/help/faq#first-60-seconds-if-something-is-broken).
    Docs d'installation : [Installer](/fr/install), [Options de l'installateur](/fr/install/installer), [Mise à jour](/fr/install/updating).

  </Accordion>

  <Accordion title="Le heartbeat continue de passer. Que signifient les raisons de l'omission ?">
    Raisons courantes des omissions de heartbeat :

    - `quiet-hours` : en dehors de la fenêtre d'heures actives configurée
    - `empty-heartbeat-file` : `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou avec des en-têtes uniquement
    - `no-tasks-due` : le mode de tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâches n'est encore échu
    - `alerts-disabled` : toute la visibilité du heartbeat est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés)

    En mode tâche, les horodatages d'échéance ne sont avancés qu'une fois qu'une exécution réelle du heartbeat
    est terminée. Les exécutions omises ne marquent pas les tâches comme terminées.

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
    - Si un mot de passe partagé est demandé, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle.
    - Source du jeton : `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
    - Source du mot de passe : `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aucun secret partagé n'est encore configuré, générez un jeton avec `openclaw doctor --generate-gateway-token`.

    **Pas sur localhost :**

    - **Tailscale Serve** (recommandé) : conservez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de secret partagé collé, suppose un hôte de passerelle de confiance) ; les API HTTP nécessitent toujours une authentification par secret partagé, sauf si vous utilisez délibérément l'entrée privée `none` ou l'authentification HTTP de proxy de confiance.
      Les mauvaises tentatives d'authentification Serve concurrentes du même client sont sérialisées avant que le limiteur d'échecs d'authentification ne les enregistre, de sorte que la deuxième mauvaise tentative peut déjà afficher `retry later`.
    - **Liaison Tailnet** : exécutez `openclaw gateway --bind tailnet --token "<token>"` (ou configurez l'authentification par mot de passe), ouvrez `http://<tailscale-ip>:18789/`, puis collez le secret partagé correspondant dans les paramètres du tableau de bord.
    - **Proxy inverse sensible à l'identité** : gardez la Gateway derrière un proxy de confiance, configurez `gateway.auth.mode: "trusted-proxy"`, puis ouvrez l'URL du proxy. Les proxies de bouclage sur le même hôte nécessitent `gateway.auth.trustedProxy.allowLoopback = true` explicite.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`. L'authentification par secret partagé s'applique toujours via le tunnel ; collez le jeton ou le mot de passe configuré si demandé.

    Voir [Tableau de bord](/fr/web/dashboard) et [Surfaces Web](/fr/web) pour les modes de liaison et les détails d'authentification.

  </Accordion>

  <Accordion title="Pourquoi existe-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?">
    Elles contrôlent différentes couches :

    - `approvals.exec` : transfère les invites d'approbation vers les destinations de chat
    - `channels.<channel>.execApprovals` : fait agir ce channel comme un client d'approbation natif pour les approbations d'exécution

    La stratégie d'exécution de l'hôte reste toujours la véritable porte d'approbation. La configuration du chat contrôle uniquement l'emplacement d'apparition des invites d'approbation et la manière dont les personnes peuvent y répondre.

    Dans la plupart des configurations, vous n'avez **pas** besoin des deux :

    - Si le chat prend déjà en charge les commandes et les réponses, le `/approve` de même chat fonctionne via le chemin partagé.
    - Si un channel natif pris en charge peut déduire en toute sécurité les approbateurs, OpenClaw active désormais automatiquement les approbations natives en priorité DM lorsque `channels.<channel>.execApprovals.enabled` n'est pas défini ou `"auto"`.
    - Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal ; l'agent ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    - Utilisez `approvals.exec` uniquement lorsque les invites doivent également être transférées vers d'autres chats ou des salles ops explicites.
    - Utilisez `channels.<channel>.execApprovals.target: "channel"` ou `"both"` uniquement lorsque vous souhaitez explicitement que les invites d'approbation soient renvoyées dans la salle/sujet d'origine.
    - Les approbations de plugins sont à nouveau séparées : elles utilisent le `/approve` de même chat par défaut, un transfert `approvals.plugin` facultatif, et seuls certains channels natifs conservent le traitement plugin-approval-native au-dessus.

    Version courte : le transfert est pour le routage, la configuration du client natif est pour une expérience utilisateur spécifique au channel plus riche.
    Voir [Exec Approvals](/fr/tools/exec-approvals).

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun n'est **pas recommandé** pour le Gateway.
  </Accordion>

  <Accordion title="Raspberry PiEst-ce que cela fonctionne sur Raspberry Pi ?"GatewayRaspberry PiGateway>
    Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque suffisent pour un usage personnel, et notez qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous souhaitez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum strict.

    Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur portable/téléphone pour
    un écran/local/canvas local ou une exécution de commandes. Voir [Nœuds](/fr/nodes).

  </Accordion>

  <Accordion title="Raspberry PiDes conseils pour les installations sur Raspberry Pi ?"Linux>
    Version courte : cela fonctionne, mais attendez-vous à des irrégularités.

    - Utilisez un OS **64 bits** et gardez Node >= 22.
    - Préférez l'**installation (git) hackable** afin de pouvoir voir les journaux et mettre à jour rapidement.
    - Commencez sans canaux/compétences, puis ajoutez-les un par un.
    - Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

    Documentation : [Linux](/fr/platforms/linux), [Installation](/fr/install).

  </Accordion>

  <Accordion title="Il est bloqué sur wake up my friend / l'onboarding ne démarrera pas. Et maintenant ?"GatewayTUIGateway>
    Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
    "Wake up, my friend!" automatiquement au premier démarrage. Si vous voyez cette ligne avec **aucune réponse**
    et que les tokens restent à 0, l'agent n'a jamais été exécuté.

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
    ```GatewayTailscaleGateway

    Si le Gateway est distant, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
    pointe vers le bon Gateway. Voir [Accès à distance](/en/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'onboarding ?">
    Oui. Copiez le **répertoire d'état** (**state directory**) et l'**espace de travail** (**workspace**), puis exécutez Doctor une fois. Cela
    permet de garder votre bot « exactement le même » (mémoire, historique des sessions, auth et état
    du channel) tant que vous copiez **les deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'auth, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, rappelez-vous que l'hôte de la passerelle possède le magasin de sessions et l'espace de travail.

    **Important :** si vous ne faites que commit/push de votre espace de travail vers GitHub, vous sauvegardez
    la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ou l'auth. Ceux-ci résident
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migrating](/en/install/migrating), [Where things live on disk](/en/help/faq#where-things-live-on-disk),
    [Agent workspace](/en/concepts/agent-workspace), [Doctor](/en/gateway/doctor),
    [Remote mode](/en/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-je voir les nouveautés de la dernière version ?">
    Consultez le journal des modifications GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section du haut est marquée **Unreleased** (Non publiée), la prochaine section
    datée correspond à la dernière version publiée. Les entrées sont groupées par **Highlights** (Points forts), **Changes** (Modifications) et
    **Fixes** (Corrections) (ainsi que des sections docs/autres si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via la sécurité
    avancée Xfinity. Désactivez-la ou mettez `docs.openclaw.ai` sur la liste autorisée, puis réessayez.
    Aidez-nous à débloquer le site en signalant le problème ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne parvenez toujours pas à atteindre le site, la documentation est disponible en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **dist-tags npm**, et non des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version de test précoce

    Habituellement, une version stable arrive d'abord sur **beta**, puis une étape
    de promotion explicite déplace cette même version vers `latest`. Les mainteneurs peuvent également
    publier directement vers `latest` si nécessaire. C'est pourquoi beta et stable peuvent
    pointer vers la **même version** après la promotion.

    Voir les changements :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les commandes d'installation en une ligne et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version bêta et quelle est la différence entre bêta et dev ?">
    **Beta** est le dist-tag npm `beta` (peut correspondre à `latest` après promotion).
    **Dev** correspond à la tête mobile de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

    Commandes en une ligne (macOS/Linux) :

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Installeur Windows (PowerShell) :
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Indicateurs d'installation](/fr/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les dernières fonctionnalités ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule vers la branche `main` et met à jour à partir de la source.

    2. **Installation hackable (à partir du site d'installation) :**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

    Si vous préférez un clonage manuel propre, utilisez :

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

    Si cela bloque, utilisez [Installation bloquée](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="Installation bloquée ? Comment obtenir plus de feedback ?">
    Relancez l'installateur avec une **sortie verbose** :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Installation bêta avec verbose :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Pour une installation hackable (git) :

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

  <Accordion title="L'installation Windows indique que git est introuvable ou que openclaw n'est pas reconnu">
    Deux problèmes courants sur Windows :

    **1) erreur npm spawn git / git introuvable**

    - Installez **Git pour Windows** et assurez-vous que `git` est dans votre PATH.
    - Fermez et rouvrez PowerShell, puis relancez le programme d'installation.

    **2) openclaw n'est pas reconnu après l'installation**

    - Votre dossier global bin de npm n'est pas dans le PATH.
    - Vérifiez le chemin :

      ```powershell
      npm config get prefix
      ```

    - Ajoutez ce répertoire à votre PATH utilisateur (aucun suffixe `\bin` n'est nécessaire sur Windows ; sur la plupart des systèmes, c'est `%AppData%\npm`).
    - Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

    Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** au lieu du Windows natif.
    Documentation : [Windows](/fr/platforms/windows).

  </Accordion>

  <Accordion title="La sortie exécutable Windows affiche du texte chinois illisible - que dois-je faire ?">
    Il s'agit généralement d'une inadéquation de la page de codes de la console dans les shells natifs Windows.

    Symptômes :

    - La sortie `system.run`/`exec` affiche du chinois sous forme de mojibake
    - La même commande s'affiche correctement dans un autre profil de terminal

    Solution rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Ensuite, redémarrez la Gateway et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```

    Si vous reproduisez toujours ce problème sur la dernière version d'OpenClaw, suivez-signalez le dans :

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?">
    Utilisez l'**installation (git) hackable** afin de disposer de la source complète et de la documentation localement, puis demandez
    à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre avec précision.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Plus de détails : [Installation](/fr/install) et [Options de l'installateur](/fr/install/installer).

  </Accordion>

  <Accordion title="OpenClawLinuxComment installer OpenClaw sous Linux ?"LinuxLinuxLinux>
    Réponse courte : suivez le guide Linux, puis lancez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
    - Guide complet : [Getting Started](/fr/start/getting-started).
    - Installateur + mises à jour : [Install & updates](/fr/install/updating).

  </Accordion>

  <Accordion title="OpenClawComment installer OpenClaw sur un VPS ?"LinuxTailscaleGateway>
    N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder à la Gateway.

    Guides : [exe.dev](/fr/install/exe-devHetzner), [Hetzner](/fr/install/hetznerFly.io), [Fly.io](/fr/install/flyGateway).
    Accès à distance : [Gateway remote](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation pour le cloud/VPS ?">
    Nous conservons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/fr/install/fly)
    - [Hetzner](/fr/install/hetzner)
    - [exe.dev](/fr/install/exe-dev)

    Fonctionnement dans le cloud : la **Gateway tourne sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + espace de travail
    résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

    Vous pouvez associer des **nœuds** (Mac/iOS/Android/headless) à cette Gateway cloud pour accéder
    à l'écran/caméra/toile local ou exécuter des commandes sur votre ordinateur tout en gardant la
    Gateway dans le cloud.

    Hub : [Plateformes](/fr/platforms). Accès distant : [Gateway distant](/fr/gateway/remote).
    Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le flux de mise à jour peut redémarrer la
    Gateway (ce qui coupe la session active), peut nécessiter un git checkout propre et
    peut demander une confirmation. Plus sûr : lancez les mises à jour depuis un shell en tant qu'opérateur.

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

  <Accordion title="Do I need a Claude or OpenAI subscription to run this?">
    Non. Vous pouvez exécuter OpenClaw avec des **clés d'API** (Anthropic/OpenAI/autres) ou avec
    des **modèles uniquement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou OpenAI Codex) sont des méthodes facultatives pour authentifier ces fournisseurs.

    Pour Anthropic dans OpenClaw, la distinction pratique est la suivante :

    - **Clé d'Anthropic API** : facturation normale de l'Anthropic API
    - **CLI Claude / authentification par abonnement Claude dans OpenClaw** : le personnel de Anthropic
      nous a indiqué que cet usage était à nouveau autorisé, et OpenClaw considère l'utilisation de `claude -p`
      comme approuvée pour cette intégration, à moins que Anthropic ne publie une nouvelle
      politique

    Pour les hôtes de passerelle à longue durée de vie, les clés d'Anthropic API restent la configuration
    la plus prévisible. L'OpenAI OAuth Codex est explicitement pris en charge pour les outils
    externes tels que OpenClaw.

    OpenClaw prend également en charge d'autres options d'abonnement hébergées, notamment
    le **forfait de codage cloud Qwen**, le **forfait de codage MiniMax** et
    le **forfait de codage Z.AI / GLM**.

    Documentation : [Anthropic](/fr/providers/anthropic), [OpenAI](/fr/providers/openai),
    [Qwen Cloud](/fr/providers/qwen),
    [MiniMax](/fr/providers/minimax), [Modèles GLM](/fr/providers/glm),
    [Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé d'API ?">
    Oui.

    Le personnel de Anthropic nous a informé que l'utilisation de la OpenClaw Claude de style CLI est à nouveau autorisée, donc OpenClaw considère l'authentification par abonnement Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Si vous souhaitez la configuration côté serveur la plus prévisible, utilisez plutôt une clé d'Anthropic API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui.

    Le personnel de Anthropic nous a informé que cette utilisation est à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique.

    Le setup-token de Anthropic est toujours disponible en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw privilégie désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'elles sont disponibles.
    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé d'Anthropic de API reste le choix le plus sûr et le plus prévisible. Si vous souhaitez d'autres options hébergées de type abonnement dans OpenClaw, consultez [OpenAI](/fr/providers/openai), [Qwen / Cloud
    Modèle](/fr/providers/qwen), [MiniMax](/fr/providers/minimax) et [Modèles GLM
    ](/fr/providers/glm).

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="AnthropicPourquoi vois-je l'erreur HTTP 429 rate_limit_error de la part d'Anthropic ?"AnthropicCLIAnthropicAPIAnthropic>
    Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous utilisez le **Claude CLI**, attendez que la fenêtre se réinitialise ou passez à un plan supérieur. Si vous utilisez une **clé API Anthropic**, vérifiez la console Anthropic concernant l'utilisation/facturation et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`Anthropic, la requessaie essaie d'utiliser
    la version bêta 1M context d'Anthropic (`context1m: true`APIOpenClawOpenClaw). Cela ne fonctionne que lorsque vos identifiants sont éligibles à la facturation longue contexte (facturation par clé API ou le chemin de connexion Claude OpenClaw avec Extra Usage activé).

    Astuce : définissez un **modèle de repli** afin qu'OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le débit.
    Voir [Modèles](/fr/cli/modelsOAuth), [OAuth](/fr/concepts/oauth), et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?" OpenClawAmazon BedrockOpenClaw>
  Oui. OpenClaw dispose d'un fournisseur **Amazon Bedrock (Converse)** intégré. Avec les marqueurs d'environnement AWS présents, OpenClaw peut détecter automatiquement le catalogue Bedrock streaming/texte et le fusionner en tant que fournisseur `amazon-bedrock` implicite ; sinon, vous pouvez activer explicitement `plugins.entries.amazon-bedrock.config.discovery.enabled`Amazon Bedrock ou ajouter
  une entrée de fournisseur manuelle. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/modelsOpenAI). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'authentification Codex ?">
  OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). Utilisez `openai/gpt-5.5` pour la configuration courante : authentification par abonnement ChatGPT/Codex plus exécution native du serveur d'application Codex. Les références de model `openai-codex/gpt-*` sont une configuration obsolète réparée par `openclaw doctor --fix`. L'accès direct par clé OpenAI API reste
  disponible pour les surfaces OpenAI API non-agent et pour les models agents via un profil de clé API `openai-codex` ordonné. Voir [Model providers](/fr/concepts/model-providers) et [Onboarding (CLI)](/fr/start/wizard).
</Accordion>

  <Accordion title="Pourquoi OpenClaw mentionne-t-il toujours openai-codex ?">
    `openai-codex` est l'identifiant du provider et du profil d'authentification pour OAuth ChatGPT/Codex.
    Les configurations plus anciennes l'utilisaient également comme préfixe de model :

    - `openai/gpt-5.5` = authentification par abonnement ChatGPT/Codex avec runtime Codex natif pour les tours d'agent
    - `openai-codex/gpt-5.5` = itinéraire de model obsolète réparé par `openclaw doctor --fix`
    - `openai/gpt-5.5` plus un profil de clé API `openai-codex` ordonné = authentification par clé API pour un model agent OpenAI
    - `openai-codex:...` = identifiant de profil d'authentification, pas une référence de model

    Si vous souhaitez le chemin direct de facturation/limite de la plateforme OpenAI, définissez
    `OPENAI_API_KEY`. Si vous souhaitez l'authentification par abonnement ChatGPT/Codex, connectez-vous avec
    `openclaw models auth login --provider openai-codex`. Conservez la référence de model sous la forme
    `openai/gpt-5.5` ; les références de model `openai-codex/*` sont une configuration obsolète que
    `openclaw doctor --fix` réécrit.

  </Accordion>

  <Accordion title="OAuthPourquoi les limites OAuth Codex peuvent-elles différer de celles du web ChatGPT ?"OAuth>
    Codex OAuth utilise des fenêtres de quota gérées par OpenAI et dépendantes du plan. En pratique,
    ces limites peuvent différer de l'expérience du site web/application ChatGPT, même lorsque
    les deux sont liées au même compte.

    OpenClaw peut afficher les fenêtres d'utilisation/de quota du provider actuellement visibles dans
    `openclaw models status`, mais il n'invente ni ne normalise les droits ChatGPT-web
    en accès direct à l'API. Si vous souhaitez la voie directe de facturation/limite de la plateforme OpenAI,
    utilisez `openai/*` avec une clé API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge l'**abonnement OpenAI Code (Codex) OAuth**.
    OpenAI autorise explicitement l'utilisation de l'abonnement OAuth dans les outils/workflows externes
    tels que OpenClaw. L'intégration peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/fr/concepts/oauth), [Modèles de providers](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

  </Accordion>

  <Accordion title="CLIOAuthComment configurer OAuth pour la CLI Gemini ?">
    La CLI Gemini utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

    Étapes :

    1. Installez la CLI Gemini localement afin que `gemini` soit dans `PATH`
       - Homebrew : `brew install gemini-cli`
       - npm : `npm install -g @google/gemini-cli`
    2. Activez le plugin : `openclaw plugins enable google`
    3. Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modèle par défaut après la connexion : `google-gemini-cli/gemini-3-flash-preview`
    5. Si les requêtes échouent, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle

    Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/fr/concepts/model-providers).

  </Accordion>

<Accordion title="Un modèle local est-il adapté aux discussions occasionnelles ?">
  Généralement non. OpenClaw a besoin d'un contexte large + d'une sécurité renforcée ; les petites cartes tronquent et fuient. Si vous devez le faire, exécutez la **plus grande** version de modèle que vous pouvez localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de promptes - voir
  [Sécurité](/fr/gateway/security).
</Accordion>

<Accordion title="Comment garder le trafic du modèle hébergé dans une région spécifique ?">
  Choisissez des points de terminaison épinglés par région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en respectant
  le fournisseur régional que vous sélectionnez.
</Accordion>

  <Accordion title="Dois-je acheter un Mac Mini pour installer ceci ?">
    Non. OpenClaw fonctionne sous macOS ou Linux (Windows via WSL2). Un Mac mini est facultatif - certaines personnes
    en achètent un comme hôte toujours allumé, mais un petit VPS, un serveur domestique ou une boîte de classe Raspberry Pi fonctionne aussi.

    Vous n'avez besoin d'un Mac que pour les outils **uniques à macOS**. Pour iMessage, utilisez [iMessage](/fr/channels/imessage) avec `imsg` sur n'importe quel Mac connecté à Messages. Si la Gateway fonctionne sous Linux ou ailleurs, définissez `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg` sur ce Mac. Si vous souhaitez d'autres outils exclusifs à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

    Docs : [iMessage](/fr/channels/imessage), [Nœuds](/fr/nodes), [Mode Mac distant](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="Ai-je besoin d'un Mac mini pour la prise en charge iMessage ?"macOS>
    Vous avez besoin d'un appareil %%PH:GLOSSARY:623:acb0eaa2** connecté à Messages. Ce n'est **pas** obligatoirement un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [iMessage](/fr/channels/imessage)** avec `imsg` ; la Gateway peut fonctionner sur ce Mac, ou elle peut fonctionner ailleurs avec un wrapper SSH `cliPath`.

    Configurations courantes :

    - Exécutez la Gateway sur Linux/VPS et définissez `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg` sur un Mac connecté à Messages.
    - Exécutez tout sur le Mac si vous souhaitez la configuration mono-machine la plus simple.

    Docs : [iMessage](/fr/channels/imessage), [Nœuds](/fr/nodes),
    [Mode Mac distant](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="OpenClawSi j'achète un Mac mini pour faire tourner OpenClaw, puis-je le connecter à mon MacBook Pro ?"GatewayGateway>
    Oui. Le **Mac mini peut faire tourner le Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds ne font pas tourner le Gateway - ils fournissent des
    capacités supplémentaires comme l'écran/l'appareil photo/la zone de dessin et `system.run`GatewaymacOSGateway sur cet appareil.

    Modèle courant :

    - Gateway sur le Mac mini (toujours allumé).
    - Le MacBook Pro fait tourner l'application macOS ou un hôte de nœud et se couple au Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

    Docs : [Nodes](/fr/nodesCLI), [Nodes CLI](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun est **déconseillé**. Nous rencontrons des bugs d'exécution, notamment avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez tout de même expérimenter Bun, faites-le sur une passerelle non de production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="TelegramTelegram : que dois-je mettre dans allowFrom ?">
    `channels.telegram.allowFrom`Telegram est **l'identifiant utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'installation demande uniquement des identifiants utilisateurs numériques. Si vous avez déjà des entrées `@username` héritées dans la configuration, `openclaw doctor --fix` peut essayer de les résoudre.

    Plus sûr (pas de bot tiers) :

    - Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`API.

    Bot API officielle :

    - Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - Envoyez un DM à `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/fr/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="WhatsAppOpenClawPlusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?" WhatsApp>
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId`WhatsApp différent, afin que chaque personne dispose de son propre espace de travail et de son propre stockage de sessions. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès par DM
  (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`WhatsApp) est global pour chaque compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agentWhatsApp) et [WhatsApp](/fr/channels/whatsapp).
</Accordion>

<Accordion title="Puis-je exécuter un agent de « chat rapide » et un agent « Opus pour le codage » ?">
  Oui. Utilisez le routage multi-agent : attribuez à chaque agent son propre model par défaut, puis liez les routes entrantes (compte provider ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Models](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).
</Accordion>

  <Accordion title="LinuxHomebrew fonctionne-t-il sous Linux ?"Linux>
    Oui. Homebrew prend en charge Linux (Linuxbrew). Installation rapide :

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```OpenClaw

    Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés via `brew`Linux soient résolus dans les shells non-login.
    Les versions récentes ajoutent également au début les répertoires bin utilisateur courants pour les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et respectent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="npmDifférence entre l'installation hackable via git et l'installation via npm"npmCLInpm>
    - **Installation hackable (git) :** extraction complète des sources, modifiable, idéale pour les contributeurs.
      Vous exécutez les builds localement et pouvez appliquer des correctifs au code/docs.
    - **installation npm :** installation globale de la CLI, sans dépôt, idéale pour "lancer simplement".
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/en/start/getting-started), [Updating](/en/install/updating).

  </Accordion>

  <Accordion title="npmPuis-je passer ultérieurement entre les installations npm et git ?">
    Oui. Utilisez `openclaw update --channel ...`OpenClawOpenClaw lorsque OpenClaw est déjà installé.
    Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code OpenClaw.
    Votre état (`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`npm) restent intacts.

    De npm vers git :

    ```bash
    openclaw update --channel dev
    ```npm

    De git vers npm :

    ```bash
    openclaw update --channel stable
    ```

    Ajoutez `--dry-run` pour prévisualiser d'abord le changement de mode prévu. Le programme de mise à jour exécute
    les suites de Doctor, actualise les sources des plugins pour le canal cible et
    redémarre la passerelle, sauf si vous passez `--no-restart`.

    Le programme d'installation peut également forcer l'un ou l'autre mode :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](/fr/help/faq#where-things-live-on-disk).

  </Accordion>

  <Accordion title="GatewayDois-je exécuter la passerelle sur mon ordinateur portable ou un VPS ?"GatewayOpenClawWhatsAppTelegramSlackMattermostDiscord>
    Réponse courte : **si vous souhaitez une fiabilité 24/7, utilisez un VPS**. Si vous souhaitez la
    moindre friction et que les mises en veille/redémarrages ne vous dérangent pas, exécutez-la localement.

    **Ordinateur portable (passerelle locale)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
    - **Inconvénients :** mise en veille/dconnexions réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours actif, réseau stable, aucun problème de mise en veille de l'ordinateur portable, plus facile à maintenir en fonctionnement.
    - **Inconvénients :** s'exécute souvent sans interface graphique (utilisez des captures d'écran), accès aux fichiers uniquement à distance, vous devez utiliser SSH pour les mises à jour.

    **Remarque spécifique à OpenClaw :** WhatsApp/Telegram/Slack/Mattermost/Discord fonctionnent tous parfaitement depuis un VPS. Le seul compromis réel est entre **navigateur sans interface graphique** et une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

    **Par défaut recommandé :** VPS si vous avez déjà subi des déconnexions de la passerelle. Le mode local est excellent lorsque vous utilisez activement le Mac et que vous souhaitez un accès aux fichiers locaux ou une automatisation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="OpenClawQuelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?"Gateway>
    Non requis, mais **recommandé pour la fiabilité et l'isolement**.

    - **Hôte dédié (VPS/Mac mini/Pi) :** toujours allumé, moins d'interruptions dues à la mise en veille ou aux redémarrages, autorisations plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait adapté pour les tests et une utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou effectue des mises à jour.

    Si vous voulez le meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils d'écran/caméra/exécution locaux. Voir [Nodes](/fr/nodes).
    Pour des conseils de sécurité, lisez [Security](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quelles sont les exigences minimales du VPS et le système d'exploitation recommandé ?"OpenClawGatewayLinuxLinux>
    OpenClaw est léger. Pour un Gateway de base + un channel de discussion :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (journaux, médias, channels multiples). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    SE : utilisez **Ubuntu LTS** (ou tout Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

    Documentation : [Linux](/fr/platforms/linux), [Hébergement VPS](/fr/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une machine virtuelle et quelles sont les prérequis ?">
    Oui. Traitez une machine virtuelle comme un VPS : elle doit être toujours allumée, accessible et disposer de suffisamment
    de RAM pour le Gateway et tous les canaux que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM.
    - **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs canaux, une automatisation de navigateur ou des outils multimédias.
    - **OS :** Ubuntu LTS ou une autre distribution moderne Debian/Ubuntu.

    Si vous êtes sur Windows, **WSL2 est la configuration de type machine virtuelle la plus simple** et offre la meilleure compatibilité
    des outils. Voir [Windows](/fr/platforms/windows), [Hébergement VPS](/fr/vps).
    Si vous exécutez macOS dans une machine virtuelle, voir [Machine virtuelle macOS](/fr/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Connexes

- [FAQ](/fr/help/faq) — la FAQ principale (modèles, sessions, passerelle, sécurité, plus)
- [Vue d'ensemble de l'installation](/fr/install)
- [Getting started](/fr/start/getting-started)
- [Dépannage](/fr/help/troubleshooting)
