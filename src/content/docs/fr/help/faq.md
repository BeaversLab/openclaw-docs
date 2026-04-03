---
summary: "Questions fréquemment posées sur la configuration, le paramétrage et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

# FAQ

Réponses rapides et troubleshooting approfondi pour des configurations réelles (dev local, VPS, multi-agent, clés OAuth/API, basculement de modèle). Pour les diagnostics d'exécution, voir [Troubleshooting](/en/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/en/gateway/configuration).

## Premières 60 secondes en cas de problème

1. **État rapide (première vérification)**

   ```bash
   openclaw status
   ```

   Résumé local rapide : OS + mise à jour, accessibilité de la passerelle/du service, agents/sessions, configuration du fournisseur + problèmes d'exécution (lorsque la passerelle est accessible).

2. **Rapport collable (sûr à partager)**

   ```bash
   openclaw status --all
   ```

   Diagnostic en lecture seule avec suivi des journaux (jetons expurgés).

3. **Démon + état du port**

   ```bash
   openclaw gateway status
   ```

   Affiche l'exécution du superviseur par rapport à l'accessibilité RPC, l'URL cible de la sonde et la configuration probablement utilisée par le service.

4. **Sondes approfondies**

   ```bash
   openclaw status --deep
   ```

   Exécute des contrôles de santé de la passerelle + des sondes de fournisseur (nécessite une passerelle accessible). Voir [Health](/en/gateway/health).

5. **Suivre le dernier journal**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Logging](/en/logging) et [Troubleshooting](/en/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Réparemigre l'état/la configuration + exécute des contrôles de santé. Voir [Doctor](/en/gateway/doctor).

7. **Snapshot Gateway**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en cours d'exécution un instantané complet (WS uniquement). Voir [Health](/en/gateway/health).

## Quick start et configuration au premier lancement

<AccordionGroup>
  <Accordion title="I am stuck, fastest way to get unstuck">
    Utilisez un agent IA local qui peut **voir votre machine**. C'est beaucoup plus efficace que de demander
    sur Discord, car la plupart des cas « je suis bloqué » sont des **problèmes de configuration locale ou d'environnement** que
    les assistants distants ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **Codex OpenAI** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
    au niveau de la machine (PATH, services, autorisations, fichiers d'auth). Donnez-leur le **checkout complet des sources** via
    l'installation modifiable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un checkout git**, afin que l'agent puisse lire le code + les docs et
    raisonner sur la version exacte que vous exécutez. Vous pouvez toujours revenir à la version stable plus tard
    en ré-exécutant l'installateur sans `--install-method git`.

    Astuce : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis n'exécutez que les
    commandes nécessaires. Cela permet de garder les modifications limitées et plus faciles à auditer.

    Si vous découvrez un vrai bug ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Commencez avec ces commandes (partagez les résultats lorsque vous demandez de l'aide) :

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Ce qu'elles font :

    - `openclaw status` : aperçu rapide de l'état de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'auth du fournisseur + la disponibilité du modèle.
    - `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

    Autres vérifications utiles en CLI : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken).
    Docs d'installation : [Install](/en/install), [Installer flags](/en/install/installer), [Updating](/en/install/updating).

  </Accordion>

  <Accordion title="Méthode recommandée pour installer et configurer OpenClaw">
    Le dépôt recommande d'exécuter à partir du code source et d'utiliser l'onboarding :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    L'assistant peut également générer automatiquement les éléments de l'interface utilisateur. Après l'onboarding, vous exécutez généralement le Gateway sur le port **18789**.

    À partir du code source (contributeurs/dev) :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    Si vous n'avez pas encore d'installation globale, exécutez-le via `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="Comment ouvrir le tableau de bord après l'intégration (onboarding) ?">L'assistant ouvre votre navigateur avec une URL de tableau de bord propre (non tokenisée) juste après l'intégration (onboarding) et affiche également le lien dans le résumé. Gardez cet onglet ouvert ; s'il ne s'est pas lancé, copiez/collez l'URL affichée sur la même machine.</Accordion>

  <Accordion title="Comment authentifier le tableau de bord (jeton) sur localhost vs distant ?">
    **Localhost (même machine) :**

    - Ouvrez `http://127.0.0.1:18789/`.
    - S'il demande une authentification, collez le jeton provenant de `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de l'interface de contrôle.
    - Récupérez-le depuis l'hôte de la passerelle : `openclaw config get gateway.auth.token` (ou générez-en un : `openclaw doctor --generate-gateway-token`).

    **Pas sur localhost :**

    - **Tailscale Serve** (recommandé) : gardez le bind loopback, lancez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de jeton, suppose un hôte de passerelle de confiance) ; les API HTTP nécessitent toujours un jeton/mot de passe.
    - **Tailnet bind** : lancez `openclaw gateway --bind tailnet --token "<token>"`, ouvrez `http://<tailscale-ip>:18789/`, collez le jeton dans les paramètres du tableau de bord.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/` et collez le jeton dans les paramètres de l'interface de contrôle.

    Voir [Dashboard](/en/web/dashboard) et [Web surfaces](/en/web) pour les modes de bind et les détails d'authentification.

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun est **déconseillé** pour le Bun.
  </Accordion>

  <Accordion title="Est-ce que cela fonctionne sur Raspberry Pi ?">
    Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque suffisent pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous souhaitez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum strict.

    Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez jumeler des **nœuds** sur votre ordinateur portable/téléphone pour
    un écran local/caméra/canvas ou l'exécution de commandes. Voir [Nœuds](/en/nodes).

  </Accordion>

  <Accordion title="Des conseils pour les installations sur Raspberry Pi ?">
    Version courte : cela fonctionne, mais attendez-vous à des rugosités.

    - Utilisez un système d'exploitation **64-bit** et gardez Node >= 22.
    - Privilégiez l'**installation (git) hackable** afin de pouvoir voir les journaux et mettre à jour rapidement.
    - Commencez sans chaînes/compétences, puis ajoutez-les une par une.
    - Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

    Docs : [Linux](/en/platforms/linux), [Install](/en/install).

  </Accordion>

  <Accordion title="Il est bloqué sur wake up my friend / onboarding will not hatch. Et maintenant ?">
    Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
    "Wake up, my friend!" automatiquement lors de la première éclosion. Si vous voyez cette ligne avec **aucune réponse**
    et que les tokens restent à 0, l'agent ne s'est jamais exécuté.

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
    pointe vers le bon Gateway. Voir [Accès distant](/en/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'onboarding ?">
    Oui. Copiez le **répertoire d'état** et l'**espace de travail**, puis exécutez Doctor une fois. Cela
    permet de garder votre bot "exactement le même" (mémoire, historique de session, authentification et état du
    channel) tant que vous copiez **les deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'authentification, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, rappelez-vous que l'hôte de la passerelle possède le magasin de sessions et l'espace de travail.

    **Important :** si vous ne faites que committer/pusher votre espace de travail vers GitHub, vous sauvegardez
    la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ni l'authentification. Ceux-ci résident
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migration](/en/install/migrating), [Emplacement des fichiers sur le disque](#where-things-live-on-disk),
    [Espace de travail de l'agent](/en/concepts/agent-workspace), [Doctor](/en/gateway/doctor),
    [Mode distant](/en/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-voir les nouveautés de la dernière version ?">
    Consultez le journal des modifications GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section du haut est marquée **Unreleased**, la prochaine section datée
    est la dernière version publiée. Les entrées sont groupées par **Points forts**, **Modifications** et
    **Corrections** (plus les docs/autres sections si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via Xfinity
    Advanced Security. Désactivez-le ou ajoutez `docs.openclaw.ai` à la liste autorisée, puis réessayez.
    S'il vous plaît, aidez-nous à le débloquer en le signalant ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne parvenez toujours pas à atteindre le site, la documentation est mise en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **dist-tags npm**, et non des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version précoce pour les tests

    Nous publions des versions sur **beta**, les testons, et une fois qu'une version est solide, nous la **promouvon
    s vers `latest`**. C'est pourquoi beta et stable peuvent pointer vers la
    **même version**.

    Voir ce qui a changé :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les commandes d'installation en une ligne et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version bêta et quelle est la différence entre bêta et dev ?">
    **Beta** est le dist-tag npm `beta` (peut correspondre à `latest`).
    **Dev** est la tête mobile de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

    Lignes de commande unique (macOS/Linux) :

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Installer Windows (PowerShell) :
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Plus de détails : [Canaux de développement](/en/install/development-channels) et [Indicateurs d'installation](/en/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les dernières nouveautés ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule sur la branche `main` et met à jour depuis la source.

    2. **Installation modifiable (depuis le site d'installation) :**

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

    Documentation : [Update](/en/cli/update), [Development channels](/en/install/development-channels),
    [Install](/en/install).

  </Accordion>

  <Accordion title="Combien de temps prennent généralement l'installation et l'onboarding ?">
    Guide approximatif :

    - **Install :** 2-5 minutes
    - **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

    Si cela bloque, utilisez [Installer bloqué](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="Installateur bloqué ? Comment obtenir plus de retour d'information ?">
    Relancez l'installateur avec une **sortie verbeuse** (verbose output) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Installation bêta avec mode verbeux :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Pour une installation hackable (git) :

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

    Plus d'options : [Indicateurs de l'installateur](/en/install/installer).

  </Accordion>

  <Accordion title="L'installation sous Windows indique que git est introuvable ou qu'openclaw n'est pas reconnu">
    Deux problèmes courants sous Windows :

    **1) erreur npm spawn git / git not found**

    - Installez **Git pour Windows** et assurez-vous que `git` est dans votre PATH.
    - Fermez et rouvrez PowerShell, puis relancez l'installateur.

    **2) openclaw n'est pas reconnu après l'installation**

    - Votre dossier global bin npm n'est pas dans le PATH.
    - Vérifiez le chemin :

      ```powershell
      npm config get prefix
      ```

    - Ajoutez ce répertoire à votre PATH utilisateur (pas besoin du suffixe `\bin` sous Windows ; sur la plupart des systèmes c'est `%AppData%\npm`).
    - Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

    Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** au lieu de Windows natif.
    Docs : [Windows](/en/platforms/windows).

  </Accordion>

  <Accordion title="La sortie exec Windows affiche du texte chinois illisible - que dois-je faire ?">
    Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells natifs Windows.

    Symptômes :

    - `system.run`/`exec` sortie affiche le chinois comme des mojibake
    - La même commande semble correcte dans un autre profil de terminal

    Solution rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Redémarrez ensuite le Windows et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```

    Si vous reproduisez toujours cela sur la dernière version d'Gateway, suivez/signalez-le ici :

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?">
    Utilisez l'**installation hackable (git)** afin d'avoir la source complète et les docs localement, puis demandez
    à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le repo et répondre précisément.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Plus de détails : [Install](/en/install) et [Installer flags](/en/install/installer).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur Linux ?">
    Réponse courte : suivez le guide Linux, puis lancez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/en/platforms/linux).
    - Guide complet : [Getting Started](/en/start/getting-started).
    - Installer + mises à jour : [Install & updates](/en/install/updating).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur un VPS ?">
    N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder au Gateway.

    Guides : [exe.dev](/en/install/exe-dev), [Hetzner](/en/install/hetzner), [Fly.io](/en/install/fly).
    Accès distant : [Gateway remote](/en/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation cloud/VPS ?">
    Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/en/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    Fonctionnement dans le cloud : la **Gateway tourne sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + espace de travail
    résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

    Vous pouvez associer des **nœuds** (Mac/iOS/Android/headless) à cette Gateway cloud pour accéder
    à l'écran/caméra/canevas local ou exécuter des commandes sur votre ordinateur tout en gardant la
    Gateway dans le cloud.

    Hub : [Plateformes](/en/platforms). Accès distant : [Gateway distant](/en/gateway/remote).
    Nœuds : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le flux de mise à jour peut redémarrer la
    Gateway (ce qui coupe la session active), peut nécessiter un nettoyage git, et
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

    Docs : [Mise à jour](/en/cli/update), [Mises à jour](/en/install/updating).

  </Accordion>

  <Accordion title="Que fait réellement l'intégration ?">
    `openclaw onboard` est la méthode d'installation recommandée. En **mode local**, elle vous guide à travers :

    - **Configuration du modèle/de l'auth** (flux provider OAuth/setup-token et clés API pris en charge, ainsi que les options de modèle local comme LM Studio)
    - Emplacement de l'**espace de travail** + fichiers d'amorçage
    - Paramètres du **Gateway** (bind/port/auth/tailscale)
    - **Fournisseurs** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
    - **Installation du démon** (LaunchAgent sur macOS ; unité utilisateur systemd sur Linux/WSL2)
    - **Contrôles de santé** et sélection des **compétences**

    Elle avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

  </Accordion>

  <Accordion title="Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci ?">
    Non. Vous pouvez exécuter OpenClaw avec des clés **API** (Anthropic/OpenAI/autres) ou avec des
    **modèles exclusivement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou OpenAI Codex) sont des moyens facultatifs pour authentifier ces fournisseurs.

    Si vous choisissez l'authentification par abonnement Anthropic, décidez par vous-même de l'utiliser :
    Anthropic a bloqué par le passé certaines utilisations d'abonnement en dehors de Claude Code.
    Le OpenAI OAuth Codex est explicitement pris en charge pour les outils externes comme OpenClaw.

    Documentation : [Anthropic](/en/providers/anthropic), [OpenAI](/en/providers/openai),
    [Modèles locaux](/en/gateway/local-models), [Modèles](/en/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé d'API ?">
    Oui. Vous pouvez soit utiliser un **setup-token** soit réutiliser une connexion locale **Claude CLI**
    sur l'hôte de la passerelle.

    Les abonnements Claude Pro/Max **n'incluent pas de clé d'API**, c'est donc la
    voie technique pour les comptes abonnés. Mais c'est votre décision : Anthropic
    a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé.
    Si vous souhaitez la voie la plus claire et la plus sûre pour la production, utilisez une clé d'Anthropic API.

  </Accordion>

<Accordion title="Comment fonctionne l'authentification par jeton de configuration Anthropic ?">
  `claude setup-token` génère une **chaîne de jetons** via la CLI Claude Code (elle n'est pas disponible dans la console web). Vous pouvez l'exécuter sur **n'importe quelle machine**. Choisissez **Jeton Anthropic (coller setup-token)** lors de l'intégration ou collez-le avec `openclaw models auth paste-token --provider anthropic`. Le jeton est stocké en tant que profil d'authentification pour le
  fournisseur **anthropic** et utilisé comme une clé API (pas de rafraîchissement automatique). Plus de détails : [OAuth](/en/concepts/oauth).
</Accordion>

  <Accordion title="Où puis-je trouver un jeton de configuration Anthropic ?">
    Il n'est **pas** dans la console Anthropic. Le jeton de configuration est généré par la **CLI Claude Code** sur **n'importe quelle machine** :

    ```bash
    claude setup-token
    ```

    Copiez le jeton qu'il affiche, puis choisissez **Jeton Anthropic (coller le jeton de configuration)** lors de la prise en main. Si vous souhaitez l'exécuter sur l'hôte de la passerelle, utilisez `openclaw models auth setup-token --provider anthropic`. Si vous avez exécuté `claude setup-token` ailleurs, collez-le sur l'hôte de la passerelle avec `openclaw models auth paste-token --provider anthropic`. Voir [Anthropic](/en/providers/anthropic).

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui. Vous pouvez soit :

    - utiliser un **setup-token**
    - réutiliser une connexion **Claude CLI** locale sur l'hôte de la passerelle avec `openclaw models auth login --provider anthropic --method cli --set-default`

    Le setup-token est toujours pris en charge. La migration vers le CLI de Claude est plus simple lorsque l'hôte de la passerelle exécute déjà Claude Code. Voir [Anthropic](/en/providers/anthropic) et [OAuth](/en/concepts/oauth).

    Important : il s'agit d'une compatibilité technique, et non d'une garantie politique. Anthropic
    a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé.
    Vous devez décider de l'utiliser et vérifier les conditions actuelles d'Anthropic.
    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé d'Anthropic API est le choix le plus sûr et recommandé.

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="Pourquoi vois-je l'erreur HTTP 429 rate_limit_error de Anthropic ?">
Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
utilisez un **abonnement Claude** (setup-token), attendez que la fenêtre se
réinitialise ou mettez à niveau votre plan. Si vous utilisez une **clé Anthropic API**, vérifiez la console Anthropic
pour l'utilisation/facturation et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`, la requessaie tente d'utiliser
    la version bêta du contexte 1M de Anthropic (`context1m: true`). Cela ne fonctionne que lorsque vos

identifiants sont éligibles à la facturation à long contexte (facturation par clé API ou abonnement
avec Extra Usage activé).

    Astuce : définissez un **model de repli** pour que OpenClaw puisse continuer à répondre lorsqu'un fournisseur est limité par le taux.
    Voir [Modèles](/en/cli/models), [OAuth](/en/concepts/oauth) et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?">
  Oui - via le fournisseur **Amazon Bedrock (Converse)** de pi-ai avec **configuration manuelle**. Vous devez fournir les identifiants/région AWS sur l'hôte de la passerelle et ajouter une entrée de fournisseur Bedrock dans votre configuration de modèles. Voir [Amazon Bedrock](/en/providers/bedrock) et [Fournisseurs de modèles](/en/providers/models). Si vous préférez un flux de clé géré, un proxy
  compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'authentification Codex ?">OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). L'intégration peut exécuter le flux OAuth et définira le modèle par défaut sur `openai-codex/gpt-5.4` si approprié. Voir [Fournisseurs de modèles](/en/concepts/model-providers) et [Intégration (CLI)](/en/start/wizard).</Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge l'**OAuth d'abonnement OpenAI Code (Codex)**.
    OpenAI autorise explicitement l'utilisation de l'OAuth d'abonnement dans des outils/workflows externes
    comme OpenClaw. Onboarding peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/en/concepts/oauth), [Fournisseurs de modèles](/en/concepts/model-providers) et [Onboarding (CLI)](/en/start/wizard).

  </Accordion>

  <Accordion title="Comment configurer OAuth pour Gemini CLI ?">
    Gemini CLI utilise un **flux d'authentification de plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

    Étapes :

    1. Activer le plugin : `openclaw plugins enable google`
    2. Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`

    Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/en/concepts/model-providers).

  </Accordion>

<Accordion title="Un modèle local est-il adapté aux discussions occasionnelles ?">
  En général non. OpenClaw nécessite un contexte important + une sécurité renforcée ; les petites cartes tronquent et fuient. Si vous devez le faire, exécutez la construction de modèle **la plus grande** possible localement (LM Studio) et consultez [/gateway/local-models](/en/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de promptes - voir
  [Sécurité](/en/gateway/security).
</Accordion>

<Accordion title="Comment garder le trafic du modèle hébergé dans une région spécifique ?">
  Choisissez des points de terminaison épinglés par région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en respectant
  le fournisseur régional que vous sélectionnez.
</Accordion>

  <Accordion title="Dois-je acheter un Mac Mini pour installer cela ?">
    Non. OpenClaw fonctionne sur macOS ou Linux (Windows via WSL2). Un Mac mini est facultatif - certaines personnes
    en achètent un comme hôte toujours allumé, mais un petit VPS, un serveur domestique ou une boîte de classe Raspberry Pi fonctionne également.

    Vous n'avez besoin d'un Mac que pour les **outils exclusifs à macOS**. Pour iMessage, utilisez [BlueBubbles](/en/channels/bluebubbles) (recommandé) - le serveur BlueBubbles fonctionne sur n'importe quel Mac, et la Gateway peut fonctionner sur Linux ou ailleurs. Si vous souhaitez d'autres outils exclusifs à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

    Docs : [BlueBubbles](/en/channels/bluebubbles), [Nœuds](/en/nodes), [Mode Mac distant](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Ai-je besoin d'un Mac mini pour la prise en charge iMessage ?">
    Vous avez besoin d'**un appareil macOS** connecté à Messages. Ce n'est **pas** obligé que ce soit un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/en/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles fonctionne sur macOS, tandis que la Gateway peut fonctionner sur Linux ou ailleurs.

    Configurations courantes :

    - Exécutez la Gateway sur Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
    - Exécutez tout sur le Mac si vous souhaitez la configuration la plus simple sur une seule machine.

    Docs : [BlueBubbles](/en/channels/bluebubbles), [Nœuds](/en/nodes),
    [Mode Mac distant](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si j'achète un Mac mini pour exécuter OpenClaw, puis-je le connecter à mon MacBook Pro ?">
    Oui. Le **Mac mini peut exécuter la Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds n'exécutent pas la Gateway - ils fournissent des
    capacités supplémentaires comme l'écran/camera/toile et `system.run` sur cet appareil.

    Modèle courant :

    - Gateway sur le Mac mini (toujours allumé).
    - Le MacBook Pro exécute l'application macOS ou un hôte de nœud et s'associe à la Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

    Docs : [Nœuds](/en/nodes), [CLI des Nœuds](/en/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun n'est **pas recommandé**. Nous rencontrons des bugs d'exécution, notamment avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez toujours expérimenter avec Bun, faites-le sur une passerelle non-production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram : que dois-je mettre dans allowFrom ?">
    `channels.telegram.allowFrom` est **l'ID utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'onboarding accepte l'entrée `@username` et la résout en un ID numérique, mais l'autorisation OpenClaw n'utilise que les ID numériques.

    Plus sûr (pas de bot tiers) :

    - DM votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

    Bot API officiel :

    - DM votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - DM `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/en/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?">
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (peer `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne ait son propre espace de travail et son propre stockage de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/en/concepts/multi-agent) et [WhatsApp](/en/channels/whatsapp).
</Accordion>

<Accordion title='Puis-je exécuter un agent "chat rapide" et un agent "Opus pour le codage" ?'>
  Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre model par défaut, puis liez les routes entrantes (compte provider ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/en/concepts/multi-agent). Voir aussi [Models](/en/concepts/models) et [Configuration](/en/gateway/configuration).
</Accordion>

  <Accordion title="Homebrew fonctionne-t-il sur Linux ?">
    Oui. Homebrew prend en charge Linux (Linuxbrew). Installation rapide :

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés via `brew` soient résolus dans les shells non-login.
    Les versions récentes ajoutent également au début les répertoires bin utilisateur courants sur les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et honorent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="Différence entre l'installation git hackable et l'installation npm">
    - **Installation hackable (git) :** extraction complète des sources, modifiable, idéale pour les contributeurs.
      Vous exécutez les builds localement et pouvez patcher le code/docs.
    - **installation npm :** installation globale CLI, sans dépôt, idéale pour "juste l'utiliser".
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/en/start/getting-started), [Updating](/en/install/updating).

  </Accordion>

  <Accordion title="Puis-je passer d'une installation npm à git ultérieurement ?">
    Oui. Installez l'autre version, puis exécutez Doctor pour que le service gateway pointe vers le nouveau point d'entrée.
    Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code npm. Votre état
    (`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`) restent intouchés.

    De OpenClaw vers git :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    De git vers npm :

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor détecte une inadéquation du point d'entrée du service gateway et propose de réécrire la configuration du service pour qu'elle corresponde à l'installation actuelle (utilisez `--repair` dans l'automatisation).

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="Dois-je exécuter la Gateway sur mon ordinateur portable ou un VPS ?">
    Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le
    moins de friction et que vous acceptez la mise en veille/redémarrages, exécutez-le localement.

    **Ordinateur portable (Gateway locale)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
    - **Inconvénients :** mise en veille/déconnexions réseau = déconnexions, les mises à jour/redémarrages du système d'exploitation interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours actif, réseau stable, pas de problèmes de mise en veille du portable, plus facile à maintenir en fonctionnement.
    - **Inconvénients :** souvent exécuté sans interface graphique (utilisez des captures d'écran), accès aux fichiers uniquement à distance, vous devez utiliser SSH pour les mises à jour.

    **Note spécifique à Gateway :** Gateway/OpenClaw/WhatsApp/Telegram (plugin)/Slack fonctionnent tous très bien depuis un VPS. Le seul compromis réel est le **navigateur sans interface graphique** par rapport à une fenêtre visible. Voir [Navigateur](/en/tools/browser).

    **Par défaut recommandé :** VPS si vous avez eu des déconnexions de gateway auparavant. Le mode local est excellent lorsque vous utilisez activement le Mac et que vous souhaitez un accès aux fichiers locaux ou une automatisation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?">
    Non obligatoire, mais **recommandé pour la fiabilité et l'isolement**.

    - **Hôte dédié (VPS/Mac mini/Pi) :** toujours en ligne, moins d'interruptions dues à la mise en veille/redémarrage, permissions plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait adapté pour les tests et une utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou se met à jour.

    Si vous voulez le meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nodes](/en/nodes).
    Pour des conseils de sécurité, lisez [Security](/en/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les besoins minimums du VPS et le système d'exploitation recommandé ?">
    OpenClaw est léger. Pour un Gateway de base + un channel de chat :

    - **Minimum absolu :** 1 vCPU, 1Go de RAM, ~500Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2Go de RAM ou plus pour la marge (logs, médias, channels multiples). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    OS : utilisez **Ubuntu LTS** (ou n'importe quel Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

    Docs : [Linux](/en/platforms/linux), [VPS hosting](/en/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une VM et quels sont les besoins ?">
    Oui. Traitez une VM comme un VPS : elle doit être toujours allumée, accessible et avoir suffisamment
    de RAM pour le Gateway et tous les channels que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1Go de RAM.
    - **Recommandé :** 2Go de RAM ou plus si vous exécutez plusieurs channels, l'automatisation du navigateur ou des outils média.
    - **OS :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

    Si vous êtes sur Windows, **WSL2 est la configuration de style VM la plus facile** et offre la meilleure compatibilité des outils.
    Voir [Windows](/en/platforms/windows), [VPS hosting](/en/vps).
    Si vous exécutez macOS dans une VM, voir [macOS VM](/en/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Qu'est-ce qu'OpenClaw ?

<AccordionGroup>
  <Accordion title="Qu'est-ce que OpenClaw, en un paragraphe ?">
    OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les interfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) et peut également utiliser la voix + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.
  </Accordion>

  <Accordion title="Proposition de valeur">
    OpenClaw n'est pas « simplement un enveloppeur pour Claude ». C'est un **plan de contrôle local-first** qui vous permet d'exécuter un assistant capable sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec des sessions avec état, de la mémoire et des outils, sans abandonner le contrôle de vos flux de travail à un SaaS hébergé.

    Points forts :

    - **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l'historique de l'espace de travail + des sessions local.
    - **Vrais canaux, pas une sandbox web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc., ainsi que la voix mobile et le Canvas sur les plateformes prises en charge.
    - **Agnostique au modèle :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage et une basculement (failover) par agent.
    - **Option local uniquement :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
    - **Routage multi-agent :** agents séparés par canal, compte ou tâche, chacun avec son propre espace de travail et ses propres paramètres par défaut.
    - **Open source et hackable :** inspectez, étendez et auto-hébergez sans verrouillage fournisseur.

    Docs : [Gateway](/en/gateway), [Channels](/en/channels), [Multi-agent](/en/concepts/multi-agent),
    [Memory](/en/concepts/memory).

  </Accordion>

  <Accordion title="Je viens de l'installer - que dois-je faire en premier ?">
    Bons premiers projets :

    - Créer un site web (WordPress, Shopify, ou un site statique simple).
    - Prototyper une application mobile (plan, écrans, plan API).
    - Organiser les fichiers et dossiers (nettoyage, nommage, étiquetage).
    - Connecter Gmail et automatiser les résumés ou les suivis.

    Il peut gérer de grandes tâches, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

  </Accordion>

  <Accordion title="Quels sont les cinq cas d'utilisation quotidiens les plus courants pour OpenClaw ?">
    Les gains quotidiens prennent généralement la forme suivante :

    - **Briefings personnels :** résumés de votre boîte de réception, de votre agenda et des actualités qui vous intéressent.
    - **Recherche et rédaction :** recherche rapide, résumés et premières versions de courriels ou de documents.
    - **Rappels et suivis :** relances et listes de contrôle pilotées par cron ou heartbeat.
    - **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
    - **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et récupérez le résultat dans le chat.

  </Accordion>

  <Accordion title="OpenClaw peut-il aider avec la génération de leads, la prospection, la publicité et les blogs pour un SaaS ?">
    Oui pour la **recherche, la qualification et la rédaction**. Il peut analyser des sites, constituer des listes restreintes,
    résumer des prospects et rédiger des versions de messages de prospection ou de publicités.

    Pour les **campagnes de prospection ou de publicité**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
    les politiques des plateformes, et vérifiez tout avant l'envoi. Le modèle le plus sûr est de laisser
    OpenClaw rédiger et que vous approuviez.

    Docs : [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les avantages par rapport à Claude Code pour le développement web ?">
    OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplacement d'IDE. Utilisez
    Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous
    souhaitez une mémoire durable, un accès multi-appareils et une orchestration d'outils.

    Avantages :

    - **Mémoire persistante + espace de travail** d'une session à l'autre
    - **Accès multi-plateforme** (WhatsApp, Telegram, TUI, WebChat)
    - **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
    - **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
    - **Nœuds** pour le navigateur/écran/caméra/exéc local

    Showcase : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills et automatisation

<AccordionGroup>
  <Accordion title="Comment personnaliser les compétences sans salir le dépôt ?">
    Utilisez des remplacements gérés au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` > `~/.openclaw/skills` > groupé, donc les remplacements gérés l'emportent sans toucher à git. Seules les modifications dignes d'intérêt en amont devraient résider dans le dépôt et être envoyées sous forme de PR.
  </Accordion>

  <Accordion title="Puis-je charger des compétences depuis un dossier personnalisé ?">
    Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (la priorité la plus basse). La priorité par défaut reste : `<workspace>/skills` → `~/.openclaw/skills` → groupé → `skills.load.extraDirs`. `clawhub` installe dans `./skills` par défaut, qu'OpenClaw traite comme `<workspace>/skills` lors de la prochaine session.
  </Accordion>

  <Accordion title="Comment utiliser différents modèles pour différentes tâches ?">
    Aujourd'hui, les modèles pris en charge sont :

    - **Tâches Cron** : les tâches isolées peuvent définir une substitution `model` par tâche.
    - **Sous-agents** : acheminez les tâches vers des agents distincts avec des modèles par défaut différents.
    - **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

    Voir [Tâches Cron](/en/automation/cron-jobs), [Routage Multi-Agent](/en/concepts/multi-agent) et [Commandes Slash](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Le bot se fige pendant l'exécution de tâches lourdes. Comment décharger cela ?">
    Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents fonctionnent dans leur propre session,
    renvoient un résumé et gardent votre chat principal réactif.

    Demandez à votre bot de « créer un sous-agent pour cette tâche » ou utilisez `/subagents`.
    Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

    Astuce concernant les jetons : les tâches longues et les sous-agents consomment tous deux des jetons. Si le coût est un problème, définissez un
    modèle moins cher pour les sous-agents via `agents.defaults.subagents.model`.

    Docs : [Sous-agents](/en/tools/subagents), [Tâches d'arrière-plan](/en/automation/tasks).

  </Accordion>

  <Accordion title="Comment fonctionnent les sessions de sous-agent liées aux fils sur Discord ?">
    Utilisez les liaisons de fils. Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

    Flux de base :

    - Créez avec `sessions_spawn` en utilisant `thread: true` (et `mode: "session"` pour un suivi persistant).
    - Ou liez manuellement avec `/focus <target>`.
    - Utilisez `/agents` pour inspecter l'état de la liaison.
    - Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le "auto-unfocus".
    - Utilisez `/unfocus` pour détacher le fil.

    Configuration requise :

    - Valeurs par défaut globales : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Substitutions Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Liaison automatique à la création : définissez `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Docs : [Sous-agents](/en/tools/subagents), [Discord](/en/channels/discord), [Référence de configuration](/en/gateway/configuration-reference), [Commandes slash](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Cron or reminders do not fire. What should I check?">
    Cron runs inside the Gateway process. If the Gateway is not running continuously,
    scheduled jobs will not run.

    Checklist:

    - Confirm cron is enabled (`cron.enabled`) and `OPENCLAW_SKIP_CRON` is not set.
    - Check the Gateway is running 24/7 (no sleep/restarts).
    - Verify timezone settings for the job (`--tz` vs host timezone).

    Debug:

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    Docs: [Cron jobs](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat).

  </Accordion>

  <Accordion title="How do I install skills on Linux?">
    Use native `openclaw skills` commands or drop skills into your workspace. The macOS Skills UI isn't available on Linux.
    Browse skills at [https://clawhub.com](https://clawhub.com).

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Install the separate `clawhub` CLI only if you want to publish or sync your own skills.

  </Accordion>

  <Accordion title="Can OpenClaw run tasks on a schedule or continuously in the background?">
    Yes. Use the Gateway scheduler:

    - **Cron jobs** for scheduled or recurring tasks (persist across restarts).
    - **Heartbeat** for "main session" periodic checks.
    - **Isolated jobs** for autonomous agents that post summaries or deliver to chats.

    Docs: [Cron jobs](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat),
    [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title="Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?">
    Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et ces compétences n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte Gateway**. Sur Linux, les compétences exclusives à `darwin` (telles que `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne contourniez le filtrage.

    Vous avez trois modèles pris en charge :

    **Option A - exécuter le Gateway sur un Mac (le plus simple).**
    Exécutez le Gateway là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#gateway-ports-already-running-and-remote-mode) ou via Tailscale. Les compétences se chargent normalement car l'hôte du Gateway est macOS.

    **Option B - utiliser un nœud macOS (pas de SSH).**
    Exécutez le Gateway sur Linux, associez un nœud macOS (application de la barre de menus) et définissez **Node Run Commands** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.

    **Option C - proxy des binaires macOS via SSH (avancé).**
    Conservez le Gateway sur Linux, mais faites en sorte que les binaires CLI requis pointent vers des wrappers SSH qui s'exécutent sur un Mac. Ensuite, substituez la compétence pour autoriser Linux afin qu'elle reste éligible.

    1. Créez un wrapper SSH pour le binaire (exemple : `memo` pour Apple Notes) :

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Placez le wrapper sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
    3. Substituez les métadonnées de la compétence (espace de travail ou `~/.openclaw/skills`) pour autoriser Linux :

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. Démarrez une nouvelle session pour que l'instantané des compétences soit actualisé.

  </Accordion>

  <Accordion title="Disposez-vous d'une intégration Notion ou HeyGen ?">
    Non intégrée nativement pour le moment.

    Options :

    - **Compétence / plugin personnalisé :** le mieux pour un accès API fiable (Notion et HeyGen ont tous deux des API).
    - **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

    Si vous souhaitez conserver le contexte par client (flux de travail agence), un modèle simple est :

    - Une page Notion par client (contexte + préférences + travail en cours).
    - Demander à l'agent de récupérer cette page au début d'une session.

    Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une compétence
    ciblant ces API.

    Installer les compétences :

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Les installations natives atterrissent dans le répertoire `skills/` de l'espace de travail actif. Pour des compétences partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Certaines compétences s'attendent à des binaires installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Compétences](/en/tools/skills) et [ClawHub](/en/tools/clawhub).

  </Accordion>

  <Accordion title="Comment utiliser mon Chrome connecté existant avec OpenClaw ?">
    Utilisez le profil de navigateur intégré `user`, qui se connecte via Chrome DevTools MCP :

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si vous souhaitez un nom personnalisé, créez un profil MCP explicite :

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Ce chemin est local à l'hôte. Si le Gateway s'exécute ailleurs, exécutez soit un nœud hôte sur la machine du navigateur, soit utilisez le CDP distant.

  </Accordion>
</AccordionGroup>

## Sandboxing et mémoire

<AccordionGroup>
  <Accordion title="Existe-t-il une documentation dédiée au sandboxing ?">
    Oui. Voir [Sandboxing](/en/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de sandbox), voir [Docker](/en/install/docker).
  </Accordion>

  <Accordion title="Docker semble limité - comment activer toutes les fonctionnalités ?">
    L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
    de packages système, Homebrew ni de navigateurs groupés. Pour une configuration plus complète :

    - Rendre persistant `/home/node` avec `OPENCLAW_HOME_VOLUME` pour que les caches survivent.
    - Intégrer les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Installer les navigateurs Playwright via le Docker inclus :
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Définir `PLAYWRIGHT_BROWSERS_PATH` et s'assurer que le chemin est persistant.

    Docs : [CLI](/en/install/docker), [Navigateur](/en/tools/browser).

  </Accordion>

  <Accordion title="Puis-je garder les DMs personnels mais rendre les groupes publics/sandboxés avec un seul agent ?">
    Oui - si votre trafic privé est en **DMs** et votre trafic public est en **groupes**.

    Utilisez `agents.defaults.sandbox.mode: "non-main"` pour que les sessions de groupe/canal (clés non principales) s'exécutent dans Docker, tandis que la session DM principale reste sur l'hôte. Restreignez ensuite les outils disponibles dans les sessions sandboxées via `tools.sandbox.tools`.

    Procédure de configuration + exemple de config : [Groupes : DMs personnels + groupes publics](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Référence de configuration clé : [Configuration Gateway](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="Comment monter un dossier hôte dans le sandbox ?">
  Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (p. ex., `"/home/user/src:/src:ro"`). Les montages globaux et par agent sont fusionnés ; les montages par agent sont ignorés lorsque `scope: "shared"`. Utilisez `:ro` pour tout ce qui est sensible et rappelez-vous que les montages contournent les barrières du système de fichiers du sandbox. Voir
  [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.
</Accordion>

  <Accordion title="Comment fonctionne la mémoire ?">
    La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

    - Des notes quotidiennes dans `memory/YYYY-MM-DD.md`
    - Des notes à long terme triées dans `MEMORY.md` (sessions principales/privées uniquement)

    OpenClaw exécute également une **vidange silencieuse de la mémoire avant compactage** pour rappeler au model
    d'écrire des notes durables avant le compactage automatique. Cela ne s'exécute que lorsque l'espace de travail
    est accessible en écriture (les bac à sable en lecture seule l'ignorent). Voir [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="La mémoire oublie les choses. Comment faire pour qu'elles restent ?">
    Demandez au bot **d'écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
    le contexte à court terme va dans `memory/YYYY-MM-DD.md`.

    C'est encore un domaine que nous améliorons. Il aide de rappeler au model de stocker les mémoires ;
    il saura quoi faire. S'il continue à oublier, vérifiez que le Gateway utilise le même
    espace de travail à chaque exécution.

    Docs : [Mémoire](/en/concepts/memory), [Espace de travail de l'agent](/en/concepts/agent-workspace).

  </Accordion>

  <Accordion title="La mémoire persiste-t-elle pour toujours ? Quelles sont les limites ?">
    Les fichiers de mémoire résident sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
    stockage, et non le model. Le **contexte de session** est toujours limité par la fenêtre de contexte du model,
    donc les longues conversations peuvent être compactées ou tronquées. C'est pourquoi
    la recherche de mémoire existe - elle ne ramène que les parties pertinentes dans le contexte.

    Docs : [Mémoire](/en/concepts/memory), [Contexte](/en/concepts/context).

  </Accordion>

  <Accordion title="La recherche de mémoire sémantique nécessite-t-elle une clé OpenAI API ?">
    Seulement si vous utilisez les **embeddings OpenAI**. OAuth Codex couvre les chat/complétions et
    n'accorde **pas** l'accès aux embeddings, donc **se connecter avec Codex (OAuth ou la
    connexion CLI Codex)** n'aide pas pour la recherche de mémoire sémantique. Les embeddings CLI
    nécessitent toujours une vraie clé OpenAI (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

    Si vous ne définissez pas de fournisseur explicitement, API sélectionne automatiquement un fournisseur lorsqu'il
    peut résoudre une clé OpenClaw (profils d'auth, `models.providers.*.apiKey`, ou env vars).
    Il préfère API si une clé OpenAI est résolue, sinon Gemini si une clé Gemini
    est résolue, puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche de
    mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de modèle local
    configuré et présent, OpenAI
    préfère `local`. OpenClaw est pris en charge lorsque vous définissez explicitement
    `memorySearch.provider = "ollama"`.

    Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et facultativement
    `memorySearch.fallback = "none"`). Si vous voulez des embeddings Gemini, définissez
    `memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
    `memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embedding **Ollama, Gemini, Voyage, Mistral, OpenAI ou local**
    - voir [Mémoire](/en/concepts/memory) pour les détails de configuration.

  </Accordion>
</AccordionGroup>

## Emplacement des fichiers sur le disque

<AccordionGroup>
  <Accordion title="Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement ?">
    Non - **l'état de OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

    - **Local par défaut :** les sessions, les fichiers mémoire, la configuration et l'espace de travail résident sur l'hôte de la Gateway
      (`~/.openclaw` + votre répertoire d'espace de travail).
    - **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) sont envoyés vers
      leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
      serveurs.
    - **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les invites sur votre machine, mais le trafic du
      canal passe toujours par les serveurs du canal.

    Connexes : [Espace de travail de l'agent](/en/concepts/agent-workspace), [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Où OpenClaw stocke-t-il ses données ?">
    Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

    | Chemin                                                            | Objectif                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuration principale (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importation OAuth héritée (copiée dans les profils d'authentification lors de la première utilisation)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Profils d'authentification (OAuth, clés API et `keyRef`/`tokenRef` facultatifs)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Charge utile secrète sauvegardée dans un fichier facultatif pour les fournisseurs `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité hérité (entrées `api_key` statiques nettoyées)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique et état des conversations (par agent)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

    Chemin hérité à agent unique : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

    Votre **espace de travail** (AGENTS.md, fichiers de mémoire, compétences, etc.) est séparé et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?">
    Ces fichiers se trouvent dans l'**espace de travail de l'agent**, et non dans `~/.openclaw`.

    - **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (ou repli de secours `memory.md` si `MEMORY.md` est absent),
      `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` optionnel.
    - **Répertoire d'état (`~/.openclaw`)** : configuration, identifiants, profils d'authentification, sessions, journaux,
      et compétences partagées (`~/.openclaw/skills`).

    L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si le bot « oublie » après un redémarrage, vérifiez que le Gateway utilise le même
    espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail
    de l'**hôte de la passerelle**, et non celui de votre ordinateur portable local).

    Astuce : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
    AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique de discussion.

    Voir [Espace de travail de l'agent](/en/concepts/agent-workspace) et [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Stratégie de sauvegarde recommandée">
    Placez votre **espace de travail de l'agent** dans un dépôt git **privé** et sauvegardez-le quelque part
    de privé (par exemple, un dépôt privé GitHub). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER
    et vous permet de restaurer l'« esprit » de l'assistant plus tard.

    Ne **commitez** rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
    Si vous avez besoin d'une restauration complète, sauvegardez séparément l'espace de travail et le répertoire d'état
    (voir la question sur la migration ci-dessus).

    Documentation : [Espace de travail de l'agent](/en/concepts/agent-workspace).

  </Accordion>

<Accordion title="Comment désinstaller complètement OpenClaw ?">Voir le guide dédié : [Désinstaller](/en/install/uninstall).</Accordion>

  <Accordion title="Les agents peuvent-ils travailler en dehors de l'espace de travail ?">
    Oui. L'espace de travail est le **répertoire de travail par défaut (cwd)** et l'ancre de la mémoire, et non un sandbox strict.
    Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
    emplacements de l'hôte sauf si le sandboxing est activé. Si vous avez besoin d'isolement, utilisez
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) ou les paramètres de sandbox par agent. Si vous
    souhaitez qu'un dépôt soit le répertoire de travail par défaut, pointez le
    `workspace` de cet agent vers la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez l'espace de travail
    séparé sauf si vous souhaitez intentionnellement que l'agent y travaille.

    Exemple (dépôt en tant que cwd par défaut) :

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Mode distant : où se trouve le stockage de session ?">
    L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le stockage de session qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur portable local. Voir [Gestion de session](/en/concepts/session).
  </Accordion>
</AccordionGroup>

## Notions de base de la configuration

<AccordionGroup>
  <Accordion title="Quel est le format de la configuration ? Où se trouve-t-elle ?">
    OpenClaw lit une configuration **JSON5** optionnelle depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si le fichier est manquant, il utilise des paramètres par défaut sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='J'ai défini gateway.bind : "lan" (ou "tailnet") et maintenant rien n'écoute / l'interface indique non autorisé'>
    Les liaisons non-boucle (non-loopback) **nécessitent une authentification**. Configurez `gateway.auth.mode` + `gateway.auth.token` (ou utilisez `OPENCLAW_GATEWAY_TOKEN`).

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    Notes :

    - `gateway.remote.token` / `.password` n'activent **pas** l'authentification locale de la passerelle par eux-mêmes.
    - Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
    - Si `gateway.auth.token` / `gateway.auth.password` sont explicitement configurés via SecretRef et non résolus, la résolution échoue fermement (pas de masquage de repli distant).
    - L'interface de contrôle (Control UI) s'authentifie via `connect.params.auth.token` (stocké dans les paramètres de l'application/interface). Évitez de mettre des jetons dans les URL.

  </Accordion>

  <Accordion title="Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?">
    OpenClaw applique l'authentification par jeton par défaut, y compris pour la boucle locale (loopback). Si aucun jeton n'est configuré, le démarrage de la passerelle en génère un automatiquement et le sauvegarde dans `gateway.auth.token`, donc **les clients WS locaux doivent s'authentifier**. Cela empêche d'autres processus locaux d'appeler la Gateway.

    Si vous voulez **vraiment** une boucle locale ouverte, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Le médecin (Doctor) peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="Dois-je redémarrer après avoir modifié la configuration ?">
    La Gateway surveille la configuration et prend en charge le rechargement à chaud (hot-reload) :

    - `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour celles critiques
    - `hot`, `restart`, `off` sont également pris en charge

  </Accordion>

  <Accordion title="Comment désactiver les slogans amusants de la CLI ?">
    Définissez `cli.banner.taglineMode` dans la configuration :

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off` : masque le texte du slogan mais conserve la ligne de titre/version de la bannière.
    - `default` : utilise `All your chats, one OpenClaw.` à chaque fois.
    - `random` : rotation de slogans amusants/saisonniers (comportement par défaut).
    - Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="Comment activer la recherche web (et la récupération web) ?">
    `web_fetch` fonctionne sans clé API. `web_search` nécessite une clé pour votre
    fournisseur sélectionné (Brave, Gemini, Grok, Kimi ou Perplexity).
    **Recommandé :** lancez `openclaw configure --section web` et choisissez un fournisseur.
    Alternatives d'environnement :

    - Brave : `BRAVE_API_KEY`
    - Gemini : `GEMINI_API_KEY`
    - Grok : `XAI_API_KEY`
    - Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
    - Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "brave",
            maxResults: 5,
          },
          fetch: {
            enabled: true,
          },
        },
      },
    }
    ```

    La configuration de recherche web spécifique au fournisseur se trouve désormais sous `plugins.entries.<plugin>.config.webSearch.*`.
    Les anciens chemins de fournisseur `tools.web.search.*` sont toujours chargés temporairement pour compatibilité, mais ils ne doivent pas être utilisés pour les nouvelles configurations.

    Notes :

    - Si vous utilisez des listes autorisées (allowlists), ajoutez `web_search`/`web_fetch` ou `group:web`.
    - `web_fetch` est activé par défaut (sauf si désactivé explicitement).
    - Les démons lisent les variables d'environnement depuis `~/.openclaw/.env` (ou l'environnement du service).

    Documentation : [Web tools](/en/tools/web).

  </Accordion>

  <Accordion title="config.apply a effacé ma configuration. Comment récupérer et éviter cela ?">
    `config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
    le reste est supprimé.

    Récupération :

    - Restaurez à partir d'une sauvegarde (git ou une copie de `~/.openclaw/openclaw.json`).
    - Si vous n'avez pas de sauvegarde, relancez `openclaw doctor` et reconfigurez les canaux/modèles.
    - Si c'était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
    - Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

    Pour l'éviter :

    - Utilisez `openclaw config set` pour les petits changements.
    - Utilisez `openclaw configure` pour les modifications interactives.

    Docs : [Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="Comment faire fonctionner un Gateway central avec des workers spécialisés sur plusieurs appareils ?">
    Le modèle courant est **un Gateway** (ex. Raspberry Pi) plus des **nodes** et des **agents** :

    - **Gateway (central) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
    - **Nodes (appareils) :** les Macs/iOS/Android se connectent en périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`).
    - **Agents (workers) :** cerveaux/espaces de travail séparés pour des rôles spéciaux (ex. "ops Hetzner", "Données personnels").
    - **Sous-agents :** lancent des tâches en arrière-plan à partir d'un agent principal lorsque vous voulez du parallélisme.
    - **TUI :** se connecte au Gateway et change d'agent/session.

    Docs : [Nodes](/en/nodes), [Remote access](/en/gateway/remote), [Multi-Agent Routing](/en/concepts/multi-agent), [Sub-agents](/en/tools/subagents), [TUI](/en/web/tui).

  </Accordion>

  <Accordion title="Le navigateur OpenClaw peut-il s'exécuter en mode headless ?">
    Oui. C'est une option de configuration :

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    La valeur par défaut est `false` (headful). Le mode headless est plus susceptible de déclencher des vérifications anti-bot sur certains sites. Voir [Navigateur](/en/tools/browser).

    Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

    - Pas de fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
    - Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAs, anti-bot).
      Par exemple, X/Twitter bloque souvent les sessions headless.

  </Accordion>

  <Accordion title="Comment utiliser Brave pour le contrôle du navigateur ?">
    Définissez `browser.executablePath` sur votre binaire Brave (ou tout autre navigateur basé sur Chromium) et redémarrez le Gateway.
    Consultez les exemples complets de configuration dans [Navigateur](/en/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways et nœuds distants

<AccordionGroup>
  <Accordion title="Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?">
    Les messages Telegram sont gérés par la **gateway**. La gateway exécute l'agent et
    n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

    Telegram → Gateway → Agent → `node.*` → Nœud → Gateway → Telegram

    Les nœuds ne voient pas le trafic provider entrant ; ils ne reçoivent que les appels RPC de nœud.

  </Accordion>

  <Accordion title="Comment mon agent peut-il accéder à mon ordinateur si la passerelle est hébergée à distance ?">
    Réponse courte : **associez votre ordinateur en tant que nœud**. La passerelle s'exécute ailleurs, mais elle peut
    appeler des outils `node.*` (écran, caméra, système) sur votre machine locale via la WebSocket de la passerelle.

    Configuration type :

    1. Exécutez la passerelle sur l'hôte toujours actif (VPS/serveur domestique).
    2. Placez l'hôte de la passerelle + votre ordinateur sur le même tailnet.
    3. Assurez-vous que la WS de la passerelle est accessible (liaison tailnet ou tunnel SSH).
    4. Ouvrez l'application macOS localement et connectez-vous en mode **Remote over SSH** (ou tailnet direct)
       pour qu'elle puisse s'enregistrer en tant que nœud.
    5. Approuvez le nœud sur la passerelle :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Aucun pont TCP séparé n'est requis ; les nœuds se connectent via la WebSocket de la passerelle.

    Rappel de sécurité : l'association d'un nœud macOS permet `system.run` sur cette machine. N'associez
    que des appareils de confiance, et consultez la page [Sécurité](/en/gateway/security).

    Documentation : [Nœuds](/en/nodes), [Protocole passerelle](/en/gateway/protocol), [Mode distant macOS](/en/platforms/mac/remote), [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Tailscale est connecté mais je ne reçois aucune réponse. Que faire ?">
    Vérifiez les bases :

    - La passerelle est en cours d'exécution : `openclaw gateway status`
    - État de santé de la passerelle : `openclaw status`
    - État de santé du canal : `openclaw channels status`

    Vérifiez ensuite l'authentification et le routage :

    - Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale` est défini correctement.
    - Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
    - Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

    Documentation : [Tailscale](/en/gateway/tailscale), [Accès distant](/en/gateway/remote), [Canaux](/en/channels).

  </Accordion>

  <Accordion title="Deux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?">
    Oui. Il n'y a pas de pont "bot-à-bot" intégré, mais vous pouvez le configurer de quelques
    manières fiables :

    **Le plus simple :** utilisez un channel de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
    Demandez au Bot A d'envoyer un message au Bot B, puis laissez le Bot B répondre comme d'habitude.

    **Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
    `openclaw agent --message ... --deliver`, en ciblant un chat où l'autre bot
    écoute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
    via SSH/Tailscale (voir [Accès distant](/en/gateway/remote)).

    Exemple de modèle (exécuté depuis une machine qui peut atteindre le Gateway cible) :

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Astuce : ajoutez une garde-fou pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes blanches de channel, ou une règle "ne pas répondre aux messages des bots").

    Docs : [Accès distant](/en/gateway/remote), [Agent CLI](/en/cli/agent), [Agent send](/en/tools/agent-send).

  </Accordion>

  <Accordion title="Ai-je besoin de VPS séparés pour plusieurs agents ?">
    Non. Un seul Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, les model par défaut,
    et le routage. C'est la configuration normale et elle est beaucoup moins chère et plus simple que de faire tourner
    un VPS par agent.

    Utilisez des VPS séparés uniquement lorsque vous avez besoin d'une isolation stricte (limites de sécurité) ou de
    configurations très différentes que vous ne souhaitez pas partager. Sinon, gardez un seul Gateway et
    utilisez plusieurs agents ou sous-agents.

  </Accordion>

  <Accordion title="Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel plutôt qu'un SSH depuis un VPS ?">
    Oui - les nœuds constituent la méthode privilégiée pour atteindre votre ordinateur portable depuis une passerelle distante, et ils offrent plus qu'un simple accès shell. La passerelle fonctionne sur macOS/Linux (Windows via WSL2) et est légère (un petit VPS ou une boîte de type Raspberry Pi convient ; 4 Go de RAM suffisent), une configuration courante consiste donc en un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

    - **Pas de SSH entrant requis.** Les nœuds se connectent à la passerelle via WebSocket et utilisent l'appairage d'appareils.
    - **Contrôles d'exécution plus sûrs.** `system.run` est protégé par des listes d'autorisation/approbations de nœuds sur cet ordinateur portable.
    - **Plus d'outils d'appareil.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`.
    - **Automatisation du navigateur local.** Gardez la passerelle sur un VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou connectez-vous au Chrome local sur l'hôte via Chrome MCP.

    SSH est suffisant pour un accès shell ad hoc, mais les nœuds sont plus simples pour les workflows d'agents continus et l'automatisation des appareils.

    Documentation : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes), [Navigateur](/en/tools/browser).

  </Accordion>

  <Accordion title="Les nœuds exécutent-ils un service de passerelle ?">
    Non. Seule **une seule passerelle** doit fonctionner par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Passerelles multiples](/en/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
    à la passerelle (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds
    sans interface graphique et le contrôle CLI, voir [CLI de l'hôte de nœud](/en/cli/node).

    Un redémarrage complet est requis pour les modifications de `gateway`, `discovery` et `canvasHost`.

  </Accordion>

<Accordion title="Existe-t-il un moyen API / RPC d'appliquer la configuration ?">Oui. `config.apply` valide + écrit la configuration complète et redémarre le Gateway dans le cadre de l'opération.</Accordion>

  <Accordion title="Configuration saine minimale pour une première installation">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Cela définit votre espace de travail et restreint qui peut déclencher le bot.

  </Accordion>

  <Accordion title="Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac ?">
    Étapes minimales :

    1. **Installer + se connecter sur le VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **Installer + se connecter sur votre Mac**
       - Utilisez l'application Tailscale et connectez-vous au même tailnet.
    3. **Activer MagicDNS (recommandé)**
       - Dans la console d'administration Tailscale, activez MagicDNS pour que le VPS ait un nom stable.
    4. **Utiliser le nom d'hôte du tailnet**
       - SSH : `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS : `ws://your-vps.tailnet-xxxx.ts.net:18789`

    Si vous souhaitez l'interface de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Cela permet de garder la passerelle liée à loopback et d'exposer HTTPS via Tailscale. Voir [Tailscale](/en/gateway/tailscale).

  </Accordion>

  <Accordion title="Comment connecter un nœud Mac à une Gateway distante (Tailscale Serve) ?">
    Serve expose l'**interface de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS de la Gateway.

    Configuration recommandée :

    1. **Assurez-vous que le VPS et le Mac sont sur le même tailnet**.
    2. **Utilisez l'application macOS en mode distant** (la cible SSH peut être le nom d'hôte du tailnet).
       L'application va tunneler le port de la Gateway et se connecter en tant que nœud.
    3. **Approuver le nœud** sur la passerelle :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentation : [Protocole Gateway](/en/gateway/protocol), [Discovery](/en/gateway/discovery), [mode distant macOS](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?">
    Si vous avez uniquement besoin d'**outils locaux** (écran/caméra/exéc) sur le deuxième ordinateur portable, ajoutez-le en tant que
    **nœud**. Cela permet de conserver un seul Gateway et d'éviter une configuration en double. Les outils de nœud local sont
    actuellement réservés au macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

    Installez un deuxième Gateway uniquement lorsque vous avez besoin d'un **isolement strict** ou de deux bots entièrement séparés.

    Docs : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes), [Passerelles multiples](/en/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables d'environnement et chargement .env

<AccordionGroup>
  <Accordion title="Comment OpenClaw charge-t-il les variables d'environnement ?">
    OpenClaw lit les variables d'environnement du processus parent (shell, launchd/systemd, CI, etc.) et charge également :

    - `.env` à partir du répertoire de travail actuel
    - un `.env` de repli global à partir de `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

    Aucun fichier `.env` ne remplace les variables d'environnement existantes.

    Vous pouvez également définir des variables d'environnement en ligne dans la configuration (appliquées uniquement si elles sont absentes de l'environnement du processus) :

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consultez [/environment](/en/help/environment) pour connaître la priorité complète et les sources.

  </Accordion>

  <Accordion title="J'ai démarré le Gateway via le service et mes variables d'environnement ont disparu. Et maintenant ?">
    Deux correctifs courants :

    1. Placez les clés manquantes dans `~/.openclaw/.env` afin qu'elles soient détectées même lorsque le service n'hérite pas de votre environnement shell.
    2. Activez l'importation de shell (confort optionnel) :

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    Cela exécute votre shell de connexion et importe uniquement les clés attendues manquantes (ne remplace jamais). Équivalents de variables d'environnement :
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='I set COPILOT_GITHUB_TOKEN, but models status shows "Shell env: off." Why?'>
    `openclaw models status` indique si l'**importation de l'environnement du shell** est activée. "Shell env: off"
    ne signifie **pas** que vos env vars sont manquantes - cela signifie simplement qu'OpenClaw ne chargera
    pas votre shell de connexion automatiquement.

    Si le Gateway s'exécute en tant que service (launchd/systemd), il n'héritera pas de votre environnement
    de shell. Corrigez cela en faisant l'une de ces actions :

    1. Mettez le jeton dans `~/.openclaw/.env` :

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
    3. Ou ajoutez-le à votre bloc de configuration `env` (s'applique uniquement s'il est manquant).

    Redémarrez ensuite la passerelle et revérifiez :

    ```bash
    openclaw models status
    ```

    Les jetons Copilot sont lus depuis `COPILOT_GITHUB_TOKEN` (aussi `GH_TOKEN` / `GITHUB_TOKEN`).
    Voir [/concepts/model-providers](/en/concepts/model-providers) et [/environment](/en/help/environment).

  </Accordion>
</AccordionGroup>

## Sessions et discussions multiples

<AccordionGroup>
  <Accordion title="How do I start a fresh conversation?">
    Envoyez `/new` ou `/reset` comme message autonome. Voir [Session management](/en/concepts/session).
  </Accordion>

  <Accordion title="Do sessions reset automatically if I never send /new?">
    Les sessions peuvent expirer après `session.idleMinutes`, mais cela est **désactivé par défaut** (par défaut **0**).
    Définissez-le sur une valeur positive pour activer l'expiration d'inactivité. Lorsqu'elle est activée, le **prochain**
    message après la période d'inactivité démarre un identifiant de session frais pour cette clé de discussion.
    Cela ne supprime pas les transcriptions - cela démarre simplement une nouvelle session.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="Existe-t-il un moyen de constituer une équipe d'instances OpenClaw (un PDG et plusieurs agents) ?">
    Oui, via le **routage multi-agents** et les **sous-agents**. Vous pouvez créer un agent coordinateur
    et plusieurs agents de travailleurs avec leurs propres espaces de travail et modèles.

    Cela dit, c'est mieux vu comme une **expérience amusante**. C'est coûteux en jetons et souvent
    moins efficace que d'utiliser un bot avec des sessions séparées. Le modèle typique que nous
    envisageons est un bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
    bot peut également générer des sous-agents si nécessaire.

    Docs : [Routage multi-agents](/en/concepts/multi-agent), [Sous-agents](/en/tools/subagents), [CLI Agents](/en/cli/agents).

  </Accordion>

  <Accordion title="Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment l'empêcher ?">
    Le contexte de la session est limité par la fenêtre du modèle. Les longues discussions, les grandes sorties d'outils ou de nombreux
    fichiers peuvent déclencher une compression ou une troncation.

    Ce qui aide :

    - Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
    - Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
    - Gardez un contexte important dans l'espace de travail et demandez au bot de le relire.
    - Utilisez des sous-agents pour des tâches longues ou parallèles afin que la discussion principale reste plus petite.
    - Choisissez un modèle avec une fenêtre de contexte plus grande si cela arrive souvent.

  </Accordion>

  <Accordion title="Comment réinitialiser complètement OpenClaw tout en le gardant installé ?">
    Utilisez la commande de réinitialisation :

    ```bash
    openclaw reset
    ```

    Réinitialisation complète non interactive :

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    Puis relancez la configuration :

    ```bash
    openclaw onboard --install-daemon
    ```

    Notes :

    - L'intégration offre également **Réinitialiser** s'il détecte une configuration existante. Voir [Intégration (CLI)](/en/start/wizard).
    - Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
    - Réinitialisation Dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + identifiants + sessions + espace de travail).

  </Accordion>

  <Accordion title='Je reçois des erreurs « context too large » - comment réinitialiser ou compacter ?'>
    Utilisez l'une de ces méthodes :

    - **Compacter** (conserve la conversation mais résume les tours précédents) :

      ```
      /compact
      ```

      ou `/compact <instructions>` pour guider le résumé.

    - **Réinitialiser** (nouvel ID de session pour la même clé de conversation) :

      ```
      /new
      /reset
      ```

    Si cela continue de se produire :

    - Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
    - Utilisez un modèle avec une fenêtre de contexte plus grande.

    Documentation : [Compaction](/en/concepts/compaction), [Session pruning](/en/concepts/session-pruning), [Session management](/en/concepts/session).

  </Accordion>

  <Accordion title='Pourquoi vois-je « LLM request rejected: messages.content.tool_use.input field required » ?'>
    Il s'agit d'une erreur de validation du fournisseur : le modèle a émis un bloc `tool_use` sans le champ requis
    `input`. Cela signifie généralement que l'historique de la session est périmé ou corrompu (souvent après des longs fils de discussion
    ou un changement d'outil/de schéma).

    Solution : démarrez une nouvelle session avec `/new` (message autonome).

  </Accordion>

  <Accordion title="Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes ?">
    Les heartbeats s'exécutent toutes les **30m** par défaut (**1h** lors de l'utilisation de l'authentification OAuth). Ajustez-les ou désactivez-les :

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes
    markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API.
    Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide de quoi faire.

    Les redéfinitions par agent utilisent `agents.list[].heartbeat`. Documentation : [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title='Do I need to add a "bot account" to a WhatsApp group?'>
    Non. OpenClaw fonctionne sur **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir.
    Par défaut, les réponses de groupe sont bloquées jusqu'à ce que vous autorisiez les expéditeurs (`groupPolicy: "allowlist"`).

    Si vous voulez que **seul vous** puissiez déclencher des réponses de groupe :

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="How do I get the JID of a WhatsApp group?">
    Option 1 (la plus rapide) : surveillez les journaux (tail logs) et envoyez un message de test dans le groupe :

    ```bash
    openclaw logs --follow --json
    ```

    Recherchez `chatId` (ou `from`) se terminant par `@g.us`, comme :
    `1234567890-1234567890@g.us`.

    Option 2 (si déjà configuré/autorisé) : lister les groupes depuis la configuration :

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentation : [WhatsApp](/en/channels/whatsapp), [Répertoire](/en/cli/directory), [Journaux](/en/cli/logs).

  </Accordion>

  <Accordion title="Why does OpenClaw not reply in a group?">
    Deux causes courantes :

    - Le filtrage par mention est activé (par défaut). Vous devez @mentionner le bot (ou correspondre à `mentionPatterns`).
    - Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas autorisé.

    Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).

  </Accordion>

<Accordion title="Do groups/threads share context with DMs?">Les chats directs sont regroupés dans la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / fils de discussion Discord sont des sessions séparées. Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).</Accordion>

  <Accordion title="Combien d'espaces de travail et d'agents puis-je créer ?">
    Aucune limite stricte. Des dizaines (voire des centaines) conviennent, mais surveillez :

    - **Croissance du disque :** les sessions et les transcriptions résident sous `~/.openclaw/agents/<agentId>/sessions/`.
    - **Coût des jetons :** plus d'agents signifie une utilisation simultanée plus importante des modèles.
    - **Surcharge opérationnelle :** profils d'authentification, espaces de travail et routage de canal par agent.

    Conseils :

    - Conservez un espace de travail **actif** par agent (`agents.defaults.workspace`).
    - Supprimez les anciennes sessions (supprimez les entrées JSONL ou du magasin) si l'espace disque augmente.
    - Utilisez `openclaw doctor` pour repérer les espaces de travail orphelins et les inadéquations de profils.

  </Accordion>

  <Accordion title="Puis-je faire fonctionner plusieurs bots ou discussions en même temps (Slack), et comment dois-je configurer cela ?">
    Oui. Utilisez le **routage multi-agent** pour faire fonctionner plusieurs agents isolés et acheminer les messages entrants par canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

    L'accès via navigateur est puissant mais ne permet pas de « faire tout ce qu'un humain peut faire » — anti-bots, CAPTCHAs et MFA peuvent toujours bloquer l'automatisation. Pour le contrôle de navigateur le plus fiable, utilisez Chrome MCP local sur l'hôte, ou utilisez CDP sur la machine qui exécute réellement le navigateur.

    Configuration recommandée :

    - Hôte Gateway toujours actif (VPS/Mac mini).
    - Un agent par rôle (liaisons).
    - Canaux Slack liés à ces agents.
    - Navigateur local via Chrome MCP ou un nœud si nécessaire.

    Documentation : [Multi-Agent Routing](/en/concepts/multi-agent), [Slack](/en/channels/slack),
    [Navigateur](/en/tools/browser), [Nœuds](/en/nodes).

  </Accordion>
</AccordionGroup>

## Modèles : valeurs par défaut, sélection, alias, basculement

<AccordionGroup>
  <Accordion title='Qu'est-ce que le « modèle par défaut » ?'>
    Le modèle par défaut de OpenClaw est celui que vous définissez comme :

    ```
    agents.defaults.model.primary
    ```

    Les modèles sont référencés sous la forme `provider/model` (exemple : `anthropic/claude-opus-4-6`). Si vous omettez le fournisseur, OpenClaw suppose actuellement `anthropic` comme solution de repli de dépréciation temporaire — mais vous devez toujours définir `provider/model` de manière **explicite**.

  </Accordion>

  <Accordion title="Quel modèle recommandez-vous ?">
    **Par défaut recommandé :** utilisez le modèle de dernière génération le plus puissant disponible dans votre pile de fournisseurs.
    **Pour les agents activés par outil ou avec des entrées non fiables :** privilégiez la puissance du modèle plutôt que le coût.
    **Pour le chat de routine ou à faible enjeu :** utilisez des modèles de repli moins chers et routez par rôle d'agent.

    MiniMax possède sa propre documentation : [MiniMax](/en/providers/minimax) et
    [Modèles locaux](/en/gateway/local-models).

    Règle empirique : utilisez le **meilleur modèle que vous pouvez vous offrir** pour le travail à enjeux élevés, et un modèle
    moins cher pour le chat de routine ou les résumés. Vous pouvez router les modèles par agent et utiliser des sous-agents pour
    paralléliser les tâches longues (chaque sous-agent consomme des jetons). Voir [Modèles](/en/concepts/models) et
    [Sous-agents](/en/tools/subagents).

    Avertissement sérieux : les modèles plus faibles ou trop quantifiés sont plus vulnérables à l'injection
    de prompt et aux comportements non sûrs. Voir [Sécurité](/en/gateway/security).

    Plus de contexte : [Modèles](/en/concepts/models).

  </Accordion>

  <Accordion title="Comment changer de modèle sans effacer ma configuration ?">
    Utilisez les **commandes de modèle** ou modifiez uniquement les champs **model**. Évitez les remplacements complets de configuration.

    Options sûres :

    - `/model` dans le chat (rapide, par session)
    - `openclaw models set ...` (met à jour uniquement la configuration du modèle)
    - `openclaw configure --section model` (interactif)
    - modifiez `agents.defaults.model` dans `~/.openclaw/openclaw.json`

    Évitez `config.apply` avec un objet partiel à moins de vouloir remplacer toute la configuration.
    Si vous avez écrasé la configuration, restaurez-la à partir d'une sauvegarde ou relancez `openclaw doctor` pour réparer.

    Documentation : [Modèles](/en/concepts/models), [Configurer](/en/cli/configure), [Config](/en/cli/config), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?">
    Oui. Ollama est la solution la plus simple pour les modèles locaux.

    Installation la plus rapide :

    1. Installez Ollama depuis `https://ollama.com/download`
    2. Téléchargez un modèle local tel que `ollama pull glm-4.7-flash`
    3. Si vous souhaitez également Ollama Cloud, exécutez `ollama signin`
    4. Exécutez `openclaw onboard` et choisissez `Ollama`
    5. Sélectionnez `Local` ou `Cloud + Local`

    Remarques :

    - `Cloud + Local` vous donne accès aux modèles Cloud Ollama ainsi qu'à vos modèles locaux Ollama
    - les modèles cloud tels que `kimi-k2.5:cloud` n'ont pas besoin d'être téléchargés localement
    - pour une commutation manuelle, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

    Note de sécurité : les modèles plus petits ou fortement quantifiés sont plus vulnérables à l'injection de prompts. Nous recommandons fortement l'utilisation de **grands modèles** pour tout bot capable d'utiliser des outils. Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et des listes d'autorisation strictes pour les outils.

    Documentation : [Ollama](/en/providers/ollama), [Modèles locaux](/en/gateway/local-models),
    [Fournisseurs de modèles](/en/concepts/model-providers), [Sécurité](/en/gateway/security),
    [Sandboxing](/en/gateway/sandboxing).

  </Accordion>

<Accordion title="Qu'utilisent OpenClaw, Flawd et Krill pour les modèles ?">
  - Ces déploiements peuvent différer et évoluer avec le temps ; il n'y a pas de recommandation fixe de fournisseur. - Vérifiez le paramètre d'exécution actuel sur chaque passerelle avec `openclaw models status`. - Pour les agents sensibles à la sécurité ou activant les outils, utilisez le modèle de dernière génération le plus robuste disponible.
</Accordion>

  <Accordion title="Comment changer de modèle à la volée (sans redémarrer) ?">
    Utilisez la commande `/model` comme message autonome :

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Il s'agit des alias intégrés. Des alias personnalisés peuvent être ajoutés via `agents.defaults.models`.

    Vous pouvez lister les modèles disponibles avec `/model`, `/model list` ou `/model status`.

    `/model` (et `/model list`) affiche un sélecteur compact numéroté. Sélectionnez par numéro :

    ```
    /model 3
    ```

    Vous pouvez également forcer un profil d'authentification spécifique pour le fournisseur (par session) :

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Astuce : `/model status` indique quel agent est actif, quel fichier `auth-profiles.json` est utilisé et quel profil d'authentification sera essayé ensuite.
    Il affiche également le point de terminaison du fournisseur configuré (`baseUrl`) et le mode API (`api`) lorsqu'ils sont disponibles.

    **Comment annuler l'épinglage d'un profil défini avec @profile ?**

    Relancez `/model` **sans** le suffixe `@profile` :

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si vous souhaitez revenir à la valeur par défaut, sélectionnez-la dans `/model` (ou envoyez `/model <default provider/model>`).
    Utilisez `/model status` pour confirmer le profil d'authentification actif.

  </Accordion>

  <Accordion title="Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage ?">
    Oui. Définissez-en un par défaut et changez selon les besoins :

    - **Changement rapide (par session) :** `/model gpt-5.4` pour les tâches quotidiennes, `/model openai-codex/gpt-5.4` pour le codage avec Codex OAuth.
    - **Par défaut + changement :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.4`, puis passez à `openai-codex/gpt-5.4` lors du codage (ou inversement).
    - **Sous-agents :** routez les tâches de codage vers des sous-agents avec un modèle par défaut différent.

    Voir [Modèles](/en/concepts/models) et [Commandes slash](/en/tools/slash-commands).

  </Accordion>

  <Accordion title='Pourquoi je vois « Model ... is not allowed » et ensuite aucune réponse ?'>
    Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et toute
    priorité de session. Choisir un modèle qui n'est pas dans cette liste renvoie :

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Cette erreur est renvoyée **à la place de** une réponse normale. Correctif : ajoutez le modèle à
    `agents.defaults.models`, supprimez la liste d'autorisation, ou choisissez un modèle depuis `/model list`.

  </Accordion>

  <Accordion title='Pourquoi je vois « Unknown model: minimax/MiniMax-M2.7 » ?'>
    Cela signifie que le **fournisseur n'est pas configuré** (aucune configuration de fournisseur MiniMax ou profil
    d'auth n'a été trouvé), le modèle ne peut donc pas être résolu.

    Liste de vérification pour le correctif :

    1. Mettez à niveau vers une version actuelle de OpenClaw (ou exécutez à partir du code source `main`), puis redémarrez la passerelle.
    2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou qu'une clé MiniMax API
       existe dans les profils env/auth pour que le fournisseur puisse être injecté.
    3. Utilisez l'identifiant exact du modèle (sensible à la casse) : `minimax/MiniMax-M2.7` ou
       `minimax/MiniMax-M2.7-highspeed`.
    4. Exécutez :

       ```bash
       openclaw models list
       ```

       et choisissez dans la liste (ou `/model list` dans le chat).

    Voir [MiniMax](/en/providers/minimax) et [Models](/en/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes ?">
    Oui. Utilisez **MiniMax par défaut** et changez de modèle **par session** si nécessaire.
    Les replis sont pour les **erreurs**, et non pour les « tâches difficiles », donc utilisez `/model` ou un agent séparé.

    **Option A : changer par session**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    Ensuite :

    ```
    /model gpt
    ```

    **Option B : agents séparés**

    - Agent A par défaut : MiniMax
    - Agent B par défaut : OpenAI
    - Acheminez par agent ou utilisez `/agent` pour changer

    Documentation : [Models](/en/concepts/models), [Multi-Agent Routing](/en/concepts/multi-agent), [MiniMax](/en/providers/minimax), [OpenAI](/en/providers/openai).

  </Accordion>

  <Accordion title="Les raccourcis opus / sonnet / gpt sont-ils intégrés ?">
    Oui. OpenClaw fournit quelques raccourcis par défaut (appliqués uniquement lorsque le modèle existe dans `agents.defaults.models`) :

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si vous définissez votre propre alias avec le même nom, votre valeur prévaut.

  </Accordion>

  <Accordion title="Comment définir/remplacer les raccourcis de modèle (alias) ?">
    Les alias proviennent de `agents.defaults.models.<modelId>.alias`. Exemple :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    Ensuite, `/model sonnet` (ou `/<alias>` lorsque pris en charge) est résolu vers cet ID de modèle.

  </Accordion>

  <Accordion title="Comment ajouter des modèles d'autres fournisseurs comme OpenRouter ou Z.AI ?">
    OpenRouter (paiement par jeton ; de nombreux modèles) :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI (modèles GLM) :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    Si vous faites référence à un fournisseur/modèle mais que la clé de fournisseur requise est manquante, vous obtiendrez une erreur d'authentification lors de l'exécution (par exemple `No API key found for provider "zai"`).

    **Aucune clé API trouvée pour le fournisseur après l'ajout d'un nouvel agent**

    Cela signifie généralement que le **nouvel agent** dispose d'un stockage d'authentification vide. L'authentification est par agent et
    stockée dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Options de correction :

    - Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
    - Ou copiez `auth-profiles.json` du `agentDir` de l'agent principal vers le `agentDir` du nouvel agent.

    **Ne** réutilisez **pas** `agentDir` entre les agents ; cela provoque des conflits d'authentification/session.

  </Accordion>
</AccordionGroup>

## Basculement de modèle et "Échec de tous les modèles"

<AccordionGroup>
  <Accordion title="Comment fonctionne le basculement ?">
    Le basculement s'effectue en deux étapes :

    1. **Rotation des profils d'authentification** au sein du même fournisseur.
    2. **Repli de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

    Des temps de refroidissement s'appliquent aux profils en échec (backoff exponentiel), afin que OpenClaw puisse continuer à répondre même lorsqu'un fournisseur est limité par son taux ou échoue temporairement.

  </Accordion>

  <Accordion title='Que signifie « Aucune identifiants trouvés pour le profil anthropic:default » ?'>
    Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver d'identifiants correspondants dans le magasin d'authentification attendu.

    **Liste de vérification des correctifs :**

    - **Confirmer l'emplacement des profils d'authentification** (nouveaux chemins vs anciens chemins)
      - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Ancien (Legacy) : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
    - **Confirmer que votre env var est chargé par le Gateway**
      - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-le dans `~/.openclaw/.env` ou activez `env.shellEnv`.
    - **Assurez-vous de modifier le bon agent**
      - Les configurations multi-agents impliquent qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
    - **Vérification rapide du statut du modèle/de l'authentification**
      - Utilisez `openclaw models status` pour voir les modèles configurés et si les fournisseurs sont authentifiés.

    **Liste de vérification des correctifs pour « No credentials found for profile anthropic »**

    Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que le Gateway
    ne peut pas le trouver dans son magasin d'authentification.

    - **Utiliser un jeton de configuration (setup-token)**
      - Exécutez `claude setup-token`, puis collez-le avec `openclaw models auth setup-token --provider anthropic`.
      - Si le jeton a été créé sur une autre machine, utilisez `openclaw models auth paste-token --provider anthropic`.
    - **Si vous souhaitez utiliser une clé API à la place**
      - Placez `ANTHROPIC_API_KEY` dans `~/.openclaw/.env` sur l'**hôte de la passerelle**.
      - Effacez tout ordre épinglé qui force un profil manquant :

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmez que vous exécutez les commandes sur l'hôte de la passerelle**
      - En mode distant, les profils d'authentification résident sur la machine passerelle, et non sur votre ordinateur portable.

  </Accordion>

  <Accordion title="Pourquoi a-t-il également essayé Google Gemini et échoué ?">
    Si la configuration de votre modèle inclut Google Gemini comme solution de repli (ou si vous avez passé à un raccourci Gemini), OpenClaw essaiera de l'utiliser lors du repli de modèle. Si vous n'avez pas configuré les identifiants Google, vous verrez `No API key found for provider "google"`.

    Solution : fournissez soit l'authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias afin que le repli ne s'y dirige pas.

    **Requête LLM rejetée : signature de réflexion requise (Google Antigravity)**

    Cause : l'historique de la session contient des **blocs de réflexion sans signatures** (souvent issus d'un flux interrompu/partiel). Google Antigravity exige des signatures pour les blocs de réflexion.

    Solution : OpenClaw supprime désormais les blocs de réflexion non signés pour Google Antigravity Claude. Si le problème persiste, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

  </Accordion>
</AccordionGroup>

## Profils d'authentification : ce qu'ils sont et comment les gérer

Connexes : [/concepts/oauth](/en/concepts/oauth) (flux OAuth, stockage des jetons, modèles multi-comptes)

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'un profil d'authentification ?">
    Un profil d'authentification est un enregistrement d'identifiants nommé (OAuth ou clé API) lié à un fournisseur. Les profils résident dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="Quels sont les ID de profil typiques ?">
    OpenClaw utilise des ID préfixés par le fournisseur, tels que :

    - `anthropic:default` (courant lorsqu'aucune identité par e-mail n'existe)
    - `anthropic:<email>` pour les identités OAuth
    - des ID personnalisés de votre choix (p. ex. `anthropic:work`)

  </Accordion>

  <Accordion title="Puis-je contrôler le profil d'authentification essayé en premier ?">
    Oui. La configuration prend en charge les métadonnées facultatives pour les profils et un ordre par fournisseur (`auth.order.<provider>`). Cela ne stocke **pas** de secrets ; il fait correspondre les ID aux fournisseurs/modes et définit l'ordre de rotation.

    OpenClaw peut temporairement ignorer un profil s'il est dans un **refroidissement** (cooldown) court (limites de délai/délais d'attente/échecs d'authentification) ou un état **désactivé** plus long (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

    Vous pouvez également définir une priorité de remplacement **par agent** (stockée dans `auth-profiles.json` de cet agent) via le CLI :

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    Pour cibler un agent spécifique :

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth vs clé API - quelle est la différence ?">
    OpenClaw prend en charge les deux :

    - **OAuth** utilise souvent l'accès par abonnement (le cas échéant).
    - Les **clés API** utilisent la facturation paye-par-jeton.

    L'assistant prend explicitement en charge le jeton de configuration Anthropic et OpenAI Codex OAuth et peut stocker les clés API pour vous.

  </Accordion>
</AccordionGroup>

## Gateway : ports, "déjà en cours d'exécution" et mode distant

<AccordionGroup>
  <Accordion title="Quel port le Gateway utilise-t-il ?">
    `gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (interface de contrôle, hooks, etc.).

    Priorité :

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle openclaw indique-t-il "Runtime : en cours d'exécution" mais "Sonde RPC : échoué" ?'>
    Parce que "en cours d'exécution" est la vue du **superviseur** (launchd/systemd/schtasks). La sonde RPC est le CLI qui se connecte réellement au WebSocket de la passerelle et appelle `status`.

    Utilisez `openclaw gateway status` et faites confiance à ces lignes :

    - `Probe target:` (l'URL réellement utilisée par la sonde)
    - `Listening:` (ce qui est réellement lié au port)
    - `Last gateway error:` (cause racine courante lorsque le processus est actif mais que le port n'écoute pas)

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw affiche-t-il des valeurs différentes pour « Config (cli) » et « Config (service) » ?'>
    Vous modifiez un fichier de configuration alors que le service en utilise un autre (souvent une inadéquation entre `--profile` / `OPENCLAW_STATE_DIR`).

    Correction :

    ```bash
    openclaw gateway install --force
    ```

    Exécutez cela depuis le même `--profile` / environnement que celui que vous souhaitez que le service utilise.

  </Accordion>

  <Accordion title='Que signifie « another gateway instance is already listening » ?'>
    OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il génère `GatewayLockError` indiquant qu'une autre instance écoute déjà.

    Correction : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway située ailleurs) ?">
    Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, éventuellement avec un jeton/mot de passe :

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    Notes :

    - `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou si vous passez le indicateur de substitution).
    - L'application macOS surveille le fichier de configuration et change de mode en direct lorsque ces valeurs changent.

  </Accordion>

  <Accordion title='L'interface de contrôle indique "non autorisé" (ou continue de se reconnecter). Que faire ?'>
    Votre passerelle s'exécute avec l'authentification activée (`gateway.auth.*`), mais l'interface n'envoie pas le jeton/mot de passe correspondant.

    Faits (issus du code) :

    - L'interface de contrôle conserve le jeton dans `sessionStorage` pour l'onglet de navigateur actuel et l'URL de la passerelle sélectionnée, ce qui permet aux actualisations du même onglet de continuer à fonctionner sans restaurer la persistance du jeton localStorage à long terme.
    - Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

    Correctif :

    - Le plus rapide : `openclaw dashboard` (affiche + copie l'URL du tableau de bord, essaie de l'ouvrir ; affiche un indice SSH en mode sans tête).
    - Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
    - Si c'est à distance, créez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
    - Définissez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) sur l'hôte de la passerelle.
    - Dans les paramètres de l'interface de contrôle, collez le même jeton.
    - Si la discordance persiste après la nouvelle tentative, faites pivoter/réapprouvez le jeton de l'appareil couplé :
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Toujours bloqué ? Exécutez `openclaw status --all` et suivez le [Dépannage](/en/gateway/troubleshooting). Voir [Tableau de bord](/en/web/dashboard) pour les détails d'authentification.

  </Accordion>

  <Accordion title="J'ai défini gateway.bind tailnet mais il ne peut pas se lier et rien n'écoute">
    `tailnet` bind choisit une IP Tailscale parmi vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou si l'interface est en panne), il n'y a rien à lier.

    Correctif :

    - Démarrez Tailscale sur cet hôte (afin qu'il ait une adresse 100.x), ou
    - Basculez sur `gateway.bind: "loopback"` / `"lan"`.

    Remarque : `tailnet` est explicite. `auto` préfère le bouclage ; utilisez `gateway.bind: "tailnet"` lorsque vous souhaitez une liaison tailnet uniquement.

  </Accordion>

  <Accordion title="Puis-je exécuter plusieurs Gateway sur le même hôte ?">
    Généralement non - un Gateway peut exécuter plusieurs canaux de messagerie et agents. N'utilisez plusieurs Gateways que lorsque vous avez besoin de redondance (ex : robot de secours) ou d'un isolement strict.

    Oui, mais vous devez isoler :

    - `OPENCLAW_CONFIG_PATH` (configuration par instance)
    - `OPENCLAW_STATE_DIR` (état par instance)
    - `agents.defaults.workspace` (isolement de l'espace de travail)
    - `gateway.port` (ports uniques)

    Installation rapide (recommandée) :

    - Utilisez `openclaw --profile <name> ...` par instance (crée automatiquement `~/.openclaw-<name>`).
    - Définissez un `gateway.port` unique dans chaque configuration de profil (ou passez `--port` pour les exécutions manuelles).
    - Installez un service par profil : `openclaw --profile <name> gateway install`.

    Les profils suffixent également les noms de service (`ai.openclaw.<profile>` ; ancien `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guide complet : [Multiple gateways](/en/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='Que signifie « invalid handshake » / code 1008 ?'>
    Le Gateway est un serveur **WebSocket**, et il s'attend à ce que le tout premier message soit
    une trame `connect`. S'il reçoit autre chose, il ferme la connexion
    avec le **code 1008** (violation de stratégie).

    Causes courantes :

    - Vous avez ouvert l'URL **HTTP** dans un navigateur (`http://...`) au lieu d'un client WS.
    - Vous avez utilisé le mauvais port ou le mauvais chemin.
    - Un proxy ou un tunnel a supprimé les en-têtes d'authentification ou a envoyé une requête non-Gateway.

    Corrections rapides :

    1. Utilisez l'URL WS : `ws://<host>:18789` (ou `wss://...` si HTTPS).
    2. N'ouvrez pas le port WS dans un onglet de navigateur normal.
    3. Si l'authentification est activée, incluez le jeton/mot de passe dans la trame `connect`.

    Si vous utilisez le CLI ou le TUI, l'URL devrait ressembler à :

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Détails du protocole : [Gateway protocol](/en/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Journalisation et débogage

<AccordionGroup>
  <Accordion title="Où se trouvent les journaux ?">
    Journaux de fichiers (structurés) :

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation des fichiers est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

    Affichage le plus rapide des journaux :

    ```bash
    openclaw logs --follow
    ```

    Journaux de service/superviseur (lorsque la passerelle s'exécute via launchd/systemd) :

    - macOS : `$OPENCLAW_STATE_DIR/logs/gateway.log` et `gateway.err.log` (par défaut : `~/.openclaw/logs/...` ; les profils utilisent `~/.openclaw-<profile>/logs/...`)
    - Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Voir [Dépannage](/en/gateway/troubleshooting) pour plus d'informations.

  </Accordion>

  <Accordion title="Comment démarrer/arrêter/redémarrer le service Gateway ?">
    Utilisez les assistants de passerelle :

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous exécutez la passerelle manuellement, `openclaw gateway --force` peut récupérer le port. Voir [Gateway](/en/gateway).

  </Accordion>

  <Accordion title="J'ai fermé mon terminal sur Windows - comment redémarrer OpenClaw ?">
    Il existe **deux modes d'installation Windows** :

    **1) WSL2 (recommandé) :** la Gateway s'exécute à l'intérieur de Linux.

    Ouvrez PowerShell, entrez dans WSL, puis redémarrez :

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous n'avez jamais installé le service, démarrez-le au premier plan :

    ```bash
    openclaw gateway run
    ```

    **2) Windows natif (non recommandé) :** la Gateway s'exécute directement sous Windows.

    Ouvrez PowerShell et exécutez :

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous l'exécutez manuellement (sans service), utilisez :

    ```powershell
    openclaw gateway run
    ```

    Documentation : [Windows (WSL2)](/en/platforms/windows), [Manuel du service Gateway](/en/gateway).

  </Accordion>

  <Accordion title="Le Gateway est opérationnel mais les réponses n'arrivent jamais. Que dois-je vérifier ?">
    Commencez par un contrôle rapide de l'état de santé :

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causes courantes :

    - Authentification du modèle non chargée sur l'**hôte de la passerelle** (vérifiez `models status`).
    - Appariement de canal/liste d'autorisation bloquant les réponses (vérifiez la configuration du canal + les journaux).
    - WebChat/Tableau de bord ouvert sans le bon jeton.

    Si vous êtes à distance, confirmez que la connexion tunnel/Tailscale est active et que le
    WebSocket Gateway est accessible.

    Docs : [Canaux](/en/channels), [Dépannage](/en/gateway/troubleshooting), [Accès à distance](/en/gateway/remote).

  </Accordion>

  <Accordion title='"Déconnecté de la passerelle : aucune raison" - et maintenant ?'>
    Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

    1. Le Gateway fonctionne-t-il ? `openclaw gateway status`
    2. Le Gateway est-il en bonne santé ? `openclaw status`
    3. L'interface utilisateur dispose-t-elle du bon jeton ? `openclaw dashboard`
    4. Si vous êtes à distance, le lien tunnel/Tailscale est-il actif ?

    Ensuite, consultez les journaux :

    ```bash
    openclaw logs --follow
    ```

    Docs : [Tableau de bord](/en/web/dashboard), [Accès à distance](/en/gateway/remote), [Dépannage](/en/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Échec de setMyCommands Telegram. Que dois-je vérifier ?">
    Commencez par les journaux et l'état du canal :

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Ensuite, identifiez l'erreur :

    - `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà à la limite Telegram et réessaie avec moins de commandes, mais certaines entrées du menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

    Si la passerelle est distante, assurez-vous que vous consultez les journaux sur l'hôte de la passerelle.

    Documentation : [Telegram](/en/channels/telegram), [Channel troubleshooting](/en/channels/troubleshooting).

  </Accordion>

  <Accordion title="L'interface TUI n'affiche aucune sortie. Que dois-je vérifier ?">
    Confirmez d'abord que la passerelle est accessible et que l'agent peut fonctionner :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    Dans l'interface TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un canal de discussion, assurez-vous que la livraison est activée (`/deliver on`).

    Documentation : [TUI](/en/web/tui), [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Comment arrêter puis redémarrer complètement la passerelle ?">
    Si vous avez installé le service :

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Cela arrête/démarre le **service supervisé** (launchd sur macOS, systemd sur Linux).
    Utilisez ceci lorsque la passerelle s'exécute en arrière-plan en tant que démon.

    Si vous l'exécutez au premier plan, arrêtez avec Ctrl-C, puis :

    ```bash
    openclaw gateway run
    ```

    Documentation : [Gateway service runbook](/en/gateway).

  </Accordion>

  <Accordion title="ELI5 : redémarrage de la passerelle openclaw vs passerelle openclaw">
    - `openclaw gateway restart` : redémarre le **service en arrière-plan** (launchd/systemd).
    - `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

    Si vous avez installé le service, utilisez les commandes de passerelle. Utilisez `openclaw gateway` lorsque
    vous souhaitez une exécution ponctuelle, au premier plan.

  </Accordion>

  <Accordion title="Le moyen le plus rapide d'obtenir plus de détails en cas d'échec">
    Démarrez la Gateway avec `--verbose` pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de canal, le routage de modèle et les erreurs RPC.
  </Accordion>
</AccordionGroup>

## Médias et pièces jointes

<AccordionGroup>
  <Accordion title="Ma compétence a généré une image/PDF, mais rien n'a été envoyé">
    Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir [Configuration de l'assistant OpenClaw](/en/start/openclaw) et [Envoi par l'agent](/en/tools/agent-send).

    Envoi via CLI :

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    Vérifiez également :

    - Le canal cible prend en charge les médias sortants et n'est pas bloqué par des listes autorisées.
    - Le fichier est dans les limites de taille du fournisseur (les images sont redimensionnées à un maximum de 2048 px).
    - `tools.fs.workspaceOnly=true` limite les envois de chemin local à l'espace de travail, au magasin de médias temporaires et aux fichiers validés par le bac à sable.
    - `tools.fs.workspaceOnly=false` permet à `MEDIA:` d'envoyer des fichiers locaux à l'hôte que l'agent peut déjà lire, mais uniquement pour les médias plus certains types de documents sûrs (images, audio, vidéo, PDF et documents Office). Les fichiers texte brut et similaires à des secrets sont toujours bloqués.

    Voir [Images](/en/nodes/images).

  </Accordion>
</AccordionGroup>

## Sécurité et contrôle d'accès

<AccordionGroup>
  <Accordion title="Est-il sûr d'exposer OpenClaw aux messages entrants (DMs) ?">
    Traitez les messages entrants comme une entrée non fiable. Les valeurs par défaut sont conçues pour réduire les risques :

    - Le comportement par défaut sur les channels compatibles avec les DMs est le **couplage** (pairing) :
      - Les expéditeurs inconnus reçoivent un code de couplage ; le bot ne traite pas leur message.
      - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Les demandes en attente sont plafonnées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
    - L'ouverture publique des DMs nécessite une adhésion explicite (`dmPolicy: "open"` et liste blanche `"*"`).

    Exécutez `openclaw doctor` pour afficher les politiques de DM risquées.

  </Accordion>

  <Accordion title="L'injection de prompt n-est-elle une préoccupation que pour les bots publics ?">
    Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut envoyer un DM au bot.
    Si votre assistant lit du contenu externe (recherche/récupération web, pages de navigateur, e-mails,
    documents, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
    de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

    Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé pour
    exfiltrer du contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

    - utilisant un agent "lecteur" en lecture seule ou sans outil pour résumer le contenu non fiable
    - gardant `web_search` / `web_fetch` / `browser` désactivés pour les agents avec outils activés
    - appliquant une mise en bac à sable (sandboxing) et des listes blanches strictes pour les outils

    Détails : [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Mon bot doit-il avoir son propre e-mail, compte GitHub ou numéro de téléphone ?">
    Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone séparés
    réduit le rayon d'impact en cas de problème. Cela facilite également la rotation des informations d'identification
    ou la révocation de l'accès sans impacter vos comptes personnels.

    Commencez petit. Donnez l'accès uniquement aux outils et comptes dont vous avez réellement besoin, et étendez
    ultérieurement si nécessaire.

    Documentation : [Sécurité](/en/gateway/security), [Couplage](/en/channels/pairing).

  </Accordion>

  <Accordion title="Puis-je lui donner une autonomie sur mes SMS et est-ce sûr ?">
    Nous ne recommandons **pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

    - Garder les DMs en **mode d'appairage** (pairing mode) ou sur une liste d'autorisation stricte.
    - Utiliser un **numéro ou compte distinct** si vous souhaitez qu'il envoie des messages en votre nom.
    - Laissez-le rédiger, puis **approuvez avant l'envoi**.

    Si vous souhaitez expérimenter, faites-le sur un compte dédié et tenez-le isolé. Voir
    [Sécurité](/en/gateway/security).

  </Accordion>

<Accordion title="Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?">
  Oui, **si** l'agent est uniquement conversationnel et si l'entrée est fiable. Les niveaux inférieurs sont plus sensibles au détournement d'instructions, évitez-les donc pour les agents activant des outils ou lors de la lecture de contenu non fiable. Si vous devez utiliser un plus petit modèle, verrouillez les outils et exécutez-le dans un bac à sable. Voir [Sécurité](/en/gateway/security).
</Accordion>

  <Accordion title="J'ai exécuté /start sur Telegram mais je n'ai pas reçu de code d'appairage">
    Les codes d'appairage sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et que
    `dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

    Vérifiez les demandes en attente :

    ```bash
    openclaw pairing list telegram
    ```

    Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste d'autorisation ou définissez `dmPolicy: "open"`
    pour ce compte.

  </Accordion>

  <Accordion title="WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appairage ?">
    Non. La politique par défaut pour les DM WhatsApp est l'**appairage**. Les expéditeurs inconnus ne reçoivent qu'un code d'appairage et leur message est **pas traité**. OpenClaw ne répond qu'aux chats qu'il reçoit ou aux envois explicites que vous déclenchez.

    Approuver l'appairage avec :

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lister les demandes en attente :

    ```bash
    openclaw pairing list whatsapp
    ```

    Invite du numéro de téléphone de l'assistant : il est utilisé pour définir votre **allowlist/owner** afin que vos propres DMs soient autorisés. Il n'est pas utilisé pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Commandes de chat, annulation de tâches et « il ne s'arrêtera pas »

<AccordionGroup>
  <Accordion title="Comment empêcher l'affichage des messages système internes dans le chat ?">
    La plupart des messages internes ou de tool n'apparaissent que lorsque le mode **verbose** ou **reasoning** est activé
    pour cette session.

    Correction dans le chat où vous voyez le problème :

    ```
    /verbose off
    /reasoning off
    ```

    Si cela reste bruyant, vérifiez les paramètres de la session dans l'interface de contrôle et définissez verbose
    sur **inherit**. Confirmez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
    sur `on` dans la configuration.

    Documentation : [Thinking and verbose](/en/tools/thinking), [Security](/en/gateway/security#reasoning-verbose-output-in-groups).

  </Accordion>

  <Accordion title="Comment arrêter/annuler une tâche en cours d'exécution ?">
    Envoyez l'un de ces messages **en tant que message autonome** (sans slash) :

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    Ce sont des déclencheurs d'annulation (et non des commandes slash).

    Pour les processus d'arrière-plan (issus de l'outil exec), vous pouvez demander à l'agent d'exécuter :

    ```
    process action:kill sessionId:XXX
    ```

    Aperçu des commandes slash : voir [Slash commands](/en/tools/slash-commands).

    La plupart des commandes doivent être envoyées en tant que message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs autorisés.

  </Accordion>

  <Accordion title='Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")'>
    OpenClaw bloque la messagerie **cross-provider** par défaut. Si un appel d'outil est lié
    à Telegram, il n'enverra pas vers Discord sauf si vous l'autorisez explicitement.

    Activez la messagerie cross-provider pour l'agent :

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    Redémarrez la passerelle après avoir modifié la configuration.

  </Accordion>

  <Accordion title='Pourquoi a-t-on l'impression que le bot "ignore" les messages en rafale ?'>
    Le mode de file d'attente contrôle la manière dont les nouveaux messages interagissent avec une exécution en cours. Utilisez `/queue` pour changer de mode :

    - `steer` - les nouveaux messages redirigent la tâche actuelle
    - `followup` - exécute les messages un par un
    - `collect` - regroupe les messages et répond une fois (par défaut)
    - `steer-backlog` - dirigez maintenant, puis traitez l'arriéré
    - `interrupt` - abandonne l'exécution actuelle et recommence

    Vous pouvez ajouter des options comme `debounce:2s cap:25 drop:summarize` pour les modes de suivi.

  </Accordion>
</AccordionGroup>

## Divers

<AccordionGroup>
  <Accordion title="Quel est le modèle par défaut pour Anthropic avec une clé API ?">
    Dans OpenClaw, les identifiants et la sélection du modèle sont distincts. Définir `ANTHROPIC_API_KEY` (ou stocker une clé Anthropic de API dans les profils d'authentification) active l'authentification, mais le modèle par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-6` ou `anthropic/claude-opus-4-6`). Si vous voyez `No
    credentials found for profile "anthropic:default"`, cela signifie que la Gateway n'a pas pu trouver les identifiants Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.
  </Accordion>
</AccordionGroup>

---

Toujours bloqué ? Posez la question sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).
