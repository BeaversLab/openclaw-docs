---
summary: "Questions fréquentes sur la configuration, l'installation et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

# FAQ

Réponses rapides et dépannage approfondi pour les configurations réelles (dev local, VPS, multi-agent, clés OAuth/API, basculement de modèle). Pour les diagnostics d'exécution, voir [Troubleshooting](/fr/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/fr/gateway/configuration).

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

   Exécute une sonde de santé active de la passerelle, y compris des sondes de canal lorsque cela est pris en charge
   (nécessite une passerelle accessible). Voir [Health](/fr/gateway/health).

5. **Suivre le dernier journal**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Logging](/fr/logging) et [Troubleshooting](/fr/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la configuration/l'état + exécute des contrôles de santé. Voir [Doctor](/fr/gateway/doctor).

7. **Snapshot Gateway**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en cours d'exécution un instantané complet (WS uniquement). Voir [Health](/fr/gateway/health).

## Quick start et configuration au premier lancement

<AccordionGroup>
  <Accordion title="I am stuck, fastest way to get unstuck">
    Utilisez un agent IA local capable de **voir votre machine**. C'est bien plus efficace que de demander
    sur Discord, car la plupart des cas « je suis bloqué » sont des **problèmes de configuration locale ou d'environnement** que
    les assistants distants ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
    au niveau de la machine (PATH, services, autorisations, fichiers d'authentification). Donnez-leur le **checkout complet des sources** via
    l'installation hackable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un git checkout**, afin que l'agent puisse lire le code + la documentation et
    raisonner sur la version exacte que vous exécutez. Vous pouvez toujours revenir à la version stable plus tard
    en réexécutant l'installateur sans `--install-method git`.

    Conseil : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis n'exécutez que les
    commandes nécessaires. Cela limite les modifications et facilite leur audit.

    Si vous découvrez un vrai bogue ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Commencez par ces commandes (partagez les sorties lorsque vous demandez de l'aide) :

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Ce qu'elles font :

    - `openclaw status` : instantané de l'état de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'authentification du fournisseur + la disponibilité des modèles.
    - `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

    Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken).
    Documentation d'installation : [Install](/fr/install), [Installer flags](/fr/install/installer), [Updating](/fr/install/updating).

  </Accordion>

  <Accordion title="Le battement de cœur (heartbeat) continue d'être ignoré. Que signifient les raisons d'ignorance ?">
    Raisons courantes d'ignorance du battement de cœur :

    - `quiet-hours`: en dehors de la fenêtre active-hours configurée
    - `empty-heartbeat-file`: `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou avec uniquement des en-têtes
    - `no-tasks-due`: le mode tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâches n'est encore échu
    - `alerts-disabled`: toute la visibilité du battement de cœur est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés)

    En mode tâche, les horodatages d'échéance ne sont avancés qu'une fois qu'une exécution réelle du battement de cœur
    est terminée. Les exécutions ignorées ne marquent pas les tâches comme terminées.

    Docs : [Battement de cœur (Heartbeat)](/fr/gateway/heartbeat), [Automatisation et Tâches](/fr/automation).

  </Accordion>

  <Accordion title="Méthode recommandée pour installer et configurer OpenClaw">
    Le dépôt recommande de s'exécuter à partir des sources et d'utiliser l'onboarding :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    L'assistant peut également construire les assets de l'interface utilisateur automatiquement. Après l'onboarding, vous exécutez généralement le Gateway sur le port **18789**.

    À partir des sources (contributeurs/dev) :

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

<Accordion title="Comment ouvrir le tableau de bord après l'onboarding ?">L'assistant ouvre votre navigateur avec une URL de tableau de bord propre (non tokenisée) juste après l'onboarding et imprime également le lien dans le résumé. Gardez cet onglet ouvert ; s'il ne s'est pas lancé, copiez/collez l'URL imprimée sur la même machine.</Accordion>

  <Accordion title="Comment authentifier le tableau de bord sur localhost vs à distance ?">
    **Localhost (même machine) :**

    - Ouvrez `http://127.0.0.1:18789/`.
    - Si un secret partagé est demandé, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle (Control UI).
    - Source du jeton : `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
    - Source du mot de passe : `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aucun secret partagé n'est encore configuré, générez un jeton avec `openclaw doctor --generate-gateway-token`.

    **Pas sur localhost :**

    - **Tailscale Serve** (recommandé) : conservez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de secret partagé collé, suppose un hôte Gateway de confiance) ; les API HTTP nécessitent toujours une authentification par secret partagé, sauf si vous utilisez délibérément `none` private-ingress ou l'authentification HTTP trusted-proxy.
      Les mauvaises tentatives d'authentification Serve simultanées du même client sont sérialisées avant que le limiteur d'échecs d'authentification ne les enregistre, donc la deuxième mauvaise tentative peut déjà afficher `retry later`.
    - **Tailnet bind** : exécutez `openclaw gateway --bind tailnet --token "<token>"` (ou configurez l'authentification par mot de passe), ouvrez `http://<tailscale-ip>:18789/`, puis collez le secret partagé correspondant dans les paramètres du tableau de bord.
    - **Reverse proxy avec reconnaissance d'identité** : gardez la passerelle (Gateway) derrière un proxy de confiance non-loopback, configurez `gateway.auth.mode: "trusted-proxy"`, puis ouvrez l'URL du proxy.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`. L'authentification par secret partagé s'applique toujours via le tunnel ; collez le jeton ou le mot de passe configuré si demandé.

    Voir [Dashboard](/fr/web/dashboard) et [Web surfaces](/fr/web) pour les modes de liaison et les détails d'authentification.

  </Accordion>

  <Accordion title="Pourquoi y a-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?">
    Elles contrôlent différentes couches :

    - `approvals.exec` : transfère les invites d'approbation vers les destinations de chat
    - `channels.<channel>.execApprovals` : fait en sorte que ce channel agisse comme un client d'approbation natif pour les approbations d'exécution

    La stratégie d'exécution de l'hôte reste la véritable porte d'approbation. La configuration du chat contrôle uniquement l'endroit où apparaissent les invites d'approbation et la manière dont les personnes peuvent y répondre.

    Dans la plupart des configurations, vous n'avez **pas** besoin des deux :

    - Si le chat prend déjà en charge les commandes et les réponses, `/approve` du même chat fonctionne via le chemin partagé.
    - Si un canal natif pris en charge peut déduire en toute sécurité les approbateurs, OpenClaw active désormais automatiquement les approbations natives en priorité DM lorsque `channels.<channel>.execApprovals.enabled` n'est pas défini ou `"auto"`.
    - Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal ; l'agent ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les approbations de chat ne sont pas disponibles ou que l'approbation manuelle est le seul chemin.
    - Utilisez `approvals.exec` uniquement lorsque les invites doivent également être transférées vers d'autres chats ou des salles d'opérations explicites.
    - Utilisez `channels.<channel>.execApprovals.target: "channel"` ou `"both"` uniquement lorsque vous souhaitez explicitement que les invites d'approbation soient renvoyées dans la salle/le sujet d'origine.
    - Les approbations de plugins sont à nouveau séparées : elles utilisent `/approve` du même chat par défaut, un transfert `approvals.plugin` facultatif, et seuls certains canaux natifs conservent le traitement natif des approbations de plugins par-dessus.

    Version courte : le transfert est pour le routage, la configuration du client natif est pour une UX spécifique au canal plus riche.
    Voir [Exec Approvals](/fr/tools/exec-approvals).

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun est **non recommandé** pour le Gateway.
  </Accordion>

  <Accordion title="Est-ce que cela fonctionne sur Raspberry Pi ?">
    Oui. La Gateway est légère - la documentation indique **512 Mo-1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque comme suffisant pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous souhaitez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum absolu.

    Astuce : un petit Pi/VPS peut héberger la Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur/téléphone pour
    l'écran local/caméra/canevas ou l'exécution de commandes. Voir [Nœuds](/fr/nodes).

  </Accordion>

  <Accordion title="Des conseils pour les installations sur Raspberry Pi ?">
    Version courte : cela fonctionne, mais attendez-vous à des irrégularités.

    - Utilisez un OS **64 bits** et gardez Node >= 22.
    - Privilégiez l'**installation hackable (git)** afin de voir les journaux et de mettre à jour rapidement.
    - Commencez sans canaux/skills, puis ajoutez-les un par un.
    - Si vous rencontrez d'étranges problèmes binaires, c'est généralement un problème de **compatibilité ARM**.

    Documentation : [Linux](/fr/platforms/linux), [Install](/fr/install).

  </Accordion>

  <Accordion title="C'est bloqué sur wake up my friend / onboarding will not hatch. Que faire ?">
    Cet écran dépend de l'accessibilité et de l'authentification de la Gateway. La TUI envoie également
    "Wake up, my friend!" automatiquement au premier éclos. Si vous voyez cette ligne avec **sans réponse**
    et que les tokens restent à 0, l'agent n'a jamais démarré.

    1. Redémarrez la Gateway :

    ```bash
    openclaw gateway restart
    ```

    2. Vérifiez le statut + l'auth :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si cela reste bloqué, exécutez :

    ```bash
    openclaw doctor
    ```

    Si la Gateway est distante, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
    pointe vers la bonne Gateway. Voir [Accès distant](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'intégration ?">
    Oui. Copiez le **répertoire d'état** et l'**espace de travail**, puis exécutez Doctor une fois. Cela
    conserve votre bot "exactement le même" (mémoire, historique de session, authentification et état
    du canal) tant que vous copiez les **deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'authentification, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, rappelez-vous que l'hôte de la passerelle possède le magasin de sessions et l'espace de travail.

    **Important :** si vous validez/poussez uniquement votre espace de travail vers GitHub, vous sauvegardez
    la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ni l'authentification. Ceux-ci se trouvent
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migration](/fr/install/migrating), [Emplacement des fichiers sur le disque](#where-things-live-on-disk),
    [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Doctor](/fr/gateway/doctor),
    [Mode distant](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-voir les nouveautés de la dernière version ?">
    Consultez le journal des modifications sur GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section du haut est marquée **Unreleased**, la prochaine section datée
    correspond à la dernière version publiée. Les entrées sont groupées par **Highlights**, **Changes** et
    **Fixes** (ainsi que d'autres sections docs/autre si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via Xfinity
    Advanced Security. Désactivez-le ou ajoutez `docs.openclaw.ai` à la liste blanche, puis réessayez.
    Aidez-nous à le débloquer en le signalant ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne pouvez toujours pas accéder au site, la documentation est mise en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **npm dist-tags**, et non des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version anticipée pour les tests

    Habituellement, une version stable arrive d'abord sur **beta**, puis une étape de promotion explicite déplace cette même version vers `latest`. Les mainteneurs peuvent également publier directement sur `latest` si nécessaire. C'est pourquoi beta et stable peuvent pointer vers la **même version** après la promotion.

    Voir ce qui a changé :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les commandes d'installation en une ligne et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version beta et quelle est la différence entre beta et dev ?">
    **Beta** est le npm dist-tag `beta` (peut correspondre à `latest` après promotion).
    **Dev** est la tête mobile de `main` (git) ; lors de la publication, il utilise le npm dist-tag `dev`.

    Lignes de commande unique (macOS/Linux) :

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Installeur Windows (PowerShell) :
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Options de l'installateur](/fr/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les dernières versions ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule vers la branche `main` et met à jour à partir de la source.

    2. **Installation modifiable (depuis le site de l'installateur) :**

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

    Documentation : [Mise à jour](/fr/cli/update), [Canaux de développement](/fr/install/development-channels),
    [Installation](/fr/install).

  </Accordion>

  <Accordion title="Combien de temps prennent généralement l'installation et la onboarding ?">
    Guide approximatif :

    - **Install :** 2-5 minutes
    - **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

    Si cela bloque, utilisez [Installer bloqué](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="L'installateur est bloqué ? Comment obtenir plus d'informations ?">
    Relancez l'installateur avec une **sortie détaillée** (verbose output) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Installation bêta avec mode verbeux :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Pour une installation (git) modifiable :

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

    Plus d'options : [Installer flags](/fr/install/installer).

  </Accordion>

  <Accordion title="L'installation sous Windows indique que git est introuvable ou que openclaw n'est pas reconnu">
    Deux problèmes courants sous Windows :

    **1) erreur npm spawn git / git not found**

    - Installez **Git for Windows** et assurez-vous que `git` est dans votre PATH.
    - Fermez et rouvrez PowerShell, puis relancez l'installateur.

    **2) openclaw n'est pas reconnu après l'installation**

    - Votre dossier global bin npm n'est pas dans le PATH.
    - Vérifiez le chemin :

      ```powershell
      npm config get prefix
      ```

    - Ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sous Windows ; sur la plupart des systèmes c'est `%AppData%\npm`).
    - Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

    Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** au lieu du Windows natif.
    Docs : [Windows](/fr/platforms/windows).

  </Accordion>

  <Accordion title="La sortie exec de Windows affiche du texte chinois illisible - que dois-je faire ?">
    Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells Windows natifs.

    Symptômes :

    - La sortie `system.run`/`exec` affiche le chinois sous forme de caractères incorrects
    - La même commande s'affiche correctement dans un autre profil de terminal

    Solution de contournement rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Ensuite, redémarrez le Windows et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```

    Si vous rencontrez toujours ce problème sur la dernière version d'Gateway, suivez/signalez-le ici :

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
    Réponse courte : suivez le guide Linux, puis exécutez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
    - Guide complet : [Getting Started](/fr/start/getting-started).
    - Installateur + mises à jour : [Install & updates](/fr/install/updating).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur un VPS ?">
    N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder au Gateway.

    Guides : [exe.dev](/fr/install/exe-dev), [Hetzner](/fr/install/hetzner), [Fly.io](/fr/install/fly).
    Accès à distance : [Gateway remote](/fr/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation cloud/VPS ?">
    Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/fr/install/fly)
    - [Hetzner](/fr/install/hetzner)
    - [exe.dev](/fr/install/exe-dev)

    Fonctionnement dans le cloud : le **Gateway s'exécute sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + votre espace de travail
    résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

    Vous pouvez jumeler des **nœuds** (Mac/iOS/Android/sans interface) à cette Gateway cloud pour accéder
    à l'écran/à la caméra/au canvas local ou exécuter des commandes sur votre ordinateur tout en gardant le
    Gateway dans le cloud.

    Hub : [Plateformes](/fr/platforms). Accès distant : [Gateway distant](/fr/gateway/remote).
    Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le flux de mise à jour peut redémarrer le
    Gateway (ce qui coupe la session active), peut nécessiter un git checkout propre, et
    peut demander une confirmation. Plus sûr : lancez les mises à jour depuis un shell en tant qu'opérateur.

    Utilisez le CLI :

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

    - **Configuration du modèle/d'auth** (provider OAuth, clés API), jeton de configuration Anthropic, ainsi que les options de modèle local telles que LM Studio)
    - Emplacement de l'**Espace de travail** + fichiers d'amorçage
    - Paramètres du **Gateway** (bind/port/auth/tailscale)
    - **Canaux** (WhatsApp, Telegram, Discord, Mattermost, Signal, iMessage, ainsi que les plugins de canal groupés comme QQ Bot)
    - **Installation du démon** (LaunchAgent sur macOS ; unité utilisateur systemd sur Linux/WSL2)
    - **Contrôles de santé** et sélection des **compétences**

    Il vous avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

  </Accordion>

  <Accordion title="Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci ?">
    Non. Vous pouvez exécuter OpenClaw avec des **clés API** (Anthropic/OpenAI/autres) ou avec des
    **modèles uniquement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou Codex OpenAI) sont des moyens facultatifs pour authentifier ces fournisseurs.

    Pour Anthropic dans OpenClaw, la distinction pratique est :

    - **Clé Anthropic API** : facturation normale de l'Anthropic API
    - **Authentification par abonnement Claude CLI / Claude dans OpenClaw** : le personnel de Anthropic
      nous a informés que cette utilisation est à nouveau autorisée, et OpenClaw considère l'utilisation de `claude -p`
      comme approuvée pour cette intégration, sauf si Anthropic publie une nouvelle
      politique

    Pour les hôtes de passerée (gateway) à longue durée de vie, les clés Anthropic API restent la configuration la plus prévisible. L'OpenAI Codex OAuth est explicitement pris en charge pour les outils externes comme OpenClaw.

    OpenClaw prend également en charge d'autres options d'abonnement hébergés, notamment
    le **forfait de codage Cloud Qwen**, le **forfait de codage MiniMax** et
    le **forfait de codage Z.AI / GLM**.

    Documentation : [Anthropic](/fr/providers/anthropic), [OpenAI](/fr/providers/openai),
    [Cloud Qwen](/fr/providers/qwen),
    [MiniMax](/fr/providers/minimax), [Modèles GLM](/fr/providers/glm),
    [Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé API ?">
    Oui.

    Le personnel de Anthropic nous a indiqué que l'utilisation de la OpenClaw Claude style CLI est à nouveau autorisée, donc
    OpenClaw considère l'authentification par abonnement Claude et l'utilisation de `claude -p` comme approuvées
    pour cette intégration, sauf si Anthropic publie une nouvelle politique. Si vous souhaitez
    la configuration côté serveur la plus prévisible, utilisez plutôt une clé Anthropic de API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui.

    Le personnel de Anthropic nous a indiqué que cet usage est à nouveau autorisé, donc OpenClaw considère
    la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme approuvées pour cette intégration
    sauf si Anthropic publie une nouvelle politique.

    Le setup-token de Anthropic est toujours disponible en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw privilégie désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'elles sont disponibles.
    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé Anthropic de API reste le
    choix le plus sûr et le plus prévisible. Si vous souhaitez d'autres options d'hébergement par abonnement
    dans OpenClaw, consultez [OpenAI](/fr/providers/openai), [Qwen / Modèle
    Cloud](/fr/providers/qwen), [MiniMax](/fr/providers/minimax) et [Modèles GLM
    ](/fr/providers/glm).

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="Pourquoi vois-je l'erreur HTTP 429 rate_limit_error de Anthropic ?">
Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
utilisez **Claude CLI**, attendez que la fenêtre se réinitialise ou améliorez votre plan. Si vous
utilisez une **clé Anthropic API**, consultez la console Anthropic
pour l'utilisation/facturation et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`, la requessaie tente d'utiliser
    la version bêta de contexte 1M d'Anthropic (`context1m: true`). Cela ne fonctionne que lorsque vos
    identifiants sont éligibles à la facturation de contexte long (facturation par clé API ou le
    chemin de connexion Claude OpenClaw avec Utilisation Extra activée).

    Astuce : définissez un **model de repli** pour que OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le débit.
    Voir [Modèles](/fr/cli/models), [OAuth](/fr/concepts/oauth) et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?">
  Oui. OpenClaw dispose d'un fournisseur **Amazon Bedrock (Converse)** intégré. Avec les marqueurs d'environnement AWS présents, OpenClaw peut découvrir automatiquement le catalogue Bedrock streaming/texte et le fusionner en tant que fournisseur implicite `amazon-bedrock` ; sinon, vous pouvez explicitement activer `plugins.entries.amazon-bedrock.config.discovery.enabled` ou ajouter une entrée de
  fournisseur manuelle. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'authentification Codex ?">OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). L'intégration peut exécuter le flux OAuth et définira le modèle par défaut sur `openai-codex/gpt-5.4` si approprié. Voir [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).</Accordion>

  <Accordion title="Pourquoi ChatGPT GPT-5.4 ne déverrouille-t-il pas openai/gpt-5.4 dans OpenClaw ?">
    OpenClaw traite les deux routes séparément :

    - `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth
    - `openai/gpt-5.4` = API directe de la plateforme OpenAI

    Dans OpenClaw, la connexion ChatGPT/Codex est reliée à la route `openai-codex/*`,
    et non à la route directe `openai/*`. Si vous souhaitez le chemin de l'API directe dans
    OpenClaw, définissez `OPENAI_API_KEY` (ou la configuration du fournisseur OpenAI équivalente).
    Si vous souhaitez la connexion ChatGPT/Codex dans OpenClaw, utilisez `openai-codex/*`.

  </Accordion>

  <Accordion title="Pourquoi les limites OAuth de Codex peuvent-elles différer de ChatGPT web ?">
    `openai-codex/*` utilise la route OAuth de Codex, et ses fenêtres de quota utilisables sont
    gérées par OpenAI et dépendent du plan. En pratique, ces limites peuvent différer de
    l'expérience du site web/application ChatGPT, même lorsque les deux sont liés au même compte.

    OpenClaw peut afficher les fenêtres d'utilisation/quota du fournisseur actuellement visibles dans
    `openclaw models status`, mais il n'invente ni ne normalise les droits
    ChatGPT-web en accès API direct. Si vous souhaitez le chemin de facturation/limite
    direct de la plateforme OpenAI, utilisez `openai/*` avec une clé API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge **l'OAuth d'abonnement OpenAI Code (Codex)**.
    OpenAI autorise explicitement l'utilisation de l'OAuth d'abonnement dans les outils/workflows externes
    tels qu'OpenClaw. L'intégration peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/fr/concepts/oauth), [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

  </Accordion>

  <Accordion title="Comment configurer Gemini CLI OAuth ?">
    Gemini CLI utilise un **flux d'authentification par plugin**, et non un ID client ou un secret dans `openclaw.json`.

    Étapes :

    1. Installez Gemini CLI localement pour que `gemini` soit sur `PATH`
       - Homebrew : `brew install gemini-cli`
       - npm : `npm install -g @google/gemini-cli`
    2. Activez le plugin : `openclaw plugins enable google`
    3. Connectez-vous : `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modèle par défaut après la connexion : `google-gemini-cli/gemini-3-flash-preview`
    5. Si les requêtes échouent, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle

    Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Model providers](/fr/concepts/model-providers).

  </Accordion>

<Accordion title="Un modèle local est-il adapté aux conversations occasionnelles ?">
  Généralement non. OpenClaw nécessite un contexte important + une forte sécurité ; les petites cartes tronquent et fuient. Si vous devez le faire, exécutez la construction de modèle la **plus grande** possible localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de promptes - voir
  [Security](/fr/gateway/security).
</Accordion>

<Accordion title="Comment garder le trafic du modèle hébergé dans une région spécifique ?">
  Choisissez des points de terminaison épinglés à une région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en
  respectant le fournisseur régional que vous sélectionnez.
</Accordion>

  <Accordion title="Dois-je acheter un Mac Mini pour installer cela ?">
    Non. OpenClaw fonctionne sous macOS ou Linux (Windows via WSL2). Un Mac mini est optionnel - certaines personnes
    en achètent un comme hôte permanent, mais un petit VPS, un serveur domestique, ou une boîte de classe Raspberry Pi fonctionne aussi.

    Vous n'avez besoin d'un Mac que pour **les outils exclusifs à macOS**. Pour iMessage, utilisez [BlueBubbles](/fr/channels/bluebubbles) (recommandé) - le serveur BlueBubbles fonctionne sur n'importe quel Mac, et la Gateway peut fonctionner sous Linux ou ailleurs. Si vous voulez d'autres outils exclusifs à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

    Docs : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes), [Mode distant Mac](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="Ai-je besoin d'un Mac mini pour la prise en charge iMessage ?">
    Vous avez besoin d'**un appareil macOS** connecté à Messages. Ce n'est **pas** obligatoirement un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/fr/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles fonctionne sous macOS, tandis que la Gateway peut fonctionner sous Linux ou ailleurs.

    Configurations courantes :

    - Exécutez la Gateway sur Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
    - Exécutez tout sur le Mac si vous souhaitez la configuration machine unique la plus simple.

    Docs : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes),
    [Mode distant Mac](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si j'achète un Mac mini pour exécuter OpenClaw, puis-je le connecter à mon MacBook Pro ?">
    Oui. Le **Mac mini peut exécuter la Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds n'exécutent pas la Gateway - ils fournissent des
    capacités supplémentaires comme l'écran/caméra/toile et `system.run` sur cet appareil.

    Modèle courant :

    - Gateway sur le Mac mini (toujours allumé).
    - Le MacBook Pro exécute l'application macOS ou un hôte de nœud et s'associe à la Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

    Docs : [Nœuds](/fr/nodes), [CLI des Nœuds](/fr/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun n'est **pas recommandé**. Nous rencontrons des bugs d'exécution, surtout avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez tout de même expérimenter Bun, faites-le sur une passerelle qui n'est pas en production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram : que dois-je mettre dans allowFrom ?">
    `channels.telegram.allowFrom` est **l'identifiant utilisateur %%PH:GLOSSARY:1717:260d3c60** de l'expéditeur humain (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'intégration accepte une entrée `@username` et la résout en un identifiant numérique, mais l'autorisation Telegram n'utilise que les identifiants numériques.

    Plus sûr (pas de bot tiers) :

    - Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

    Bot OpenClaw officiel :

    - Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - Envoyez un DM à `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/fr/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec des instances OpenClaw différentes ?">
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne dispose de son propre espace de travail et de son propre magasin de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès par DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agent) et [WhatsApp](/fr/channels/whatsapp).
</Accordion>

<Accordion title="Puis-je exécuter un agent « fast chat » et un agent « Opus pour le codage » ?">
  Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre modèle par défaut, puis liez les routes entrantes (compte de fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Modèles](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).
</Accordion>

  <Accordion title="Homebrew fonctionne-t-il sur Linux ?">
    Oui. Homebrew prend en charge Linux (Linuxbrew). Configuration rapide :

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés par `brew` soient résolus dans les shells non de connexion.
    Les versions récentes ajoutent également au début les répertoires bin utilisateur courants dans les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et respectent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="Différence entre l'installation hackable via git et l'installation npm">
    - **Installation hackable (git) :** extraction complète des sources, modifiable, idéale pour les contributeurs.
      Vous lancez les constructions localement et pouvez patcher le code/docs.
    - **Installation npm :** installation globale CLI, sans dépôt, idéale pour « juste lancer ».
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/fr/start/getting-started), [Updating](/fr/install/updating).

  </Accordion>

  <Accordion title="Puis-je passer par la suite d'une installation npm à git ?">
    Oui. Installez l'autre version, puis lancez Doctor afin que le service OpenClaw pointe vers le nouveau point d'entrée.
    Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code npm. Votre état
    (`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`) restent intouchés.

    De npm vers git :

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

    Doctor détecte une inadéquation du point d'entrée du service de passerelle et propose de réécrire la configuration du service pour qu'elle corresponde à l'installation actuelle (utilisez `--repair` dans l'automatisation).

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="Dois-je exécuter la Gateway sur mon ordinateur portable ou un VPS ?">
    Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le
    moins de friction et que vous êtes à l'aise avec la mise en veille/redémarrages, exécutez-le en local.

    **Ordinateur portable (%(PH:GLOSSARY:1743:75908585)%% local)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
    - **Inconvénients :** mise en veille/déconnexions réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours actif, réseau stable, pas de problème de mise en veille, plus facile à maintenir en marche.
    - **Inconvénients :** souvent sans tête (utilisez des captures d'écran), accès aux fichiers à distance uniquement, vous devez utiliser SSH pour les mises à jour.

    **Note spécifique à Gateway :** OpenClaw/WhatsApp/Telegram/Slack/Mattermost fonctionnent tous très bien depuis un VPS. Le seul compromis réel est le **navigateur sans tête** par rapport à une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

    **Par défaut recommandé :** VPS si vous avez eu des déconnexions de passerelle auparavant. Le local est idéal lorsque vous utilisez activement le Mac et que vous souhaitez un accès aux fichiers locaux ou une automation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?">
    Non requis, mais **recommandé pour la fiabilité et l'isolement**.

    - **Hôte dédié (VPS/Mac mini/Pi) :** toujours actif, moins d'interruptions dues à la mise en veille/redémarrage, permissions plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait correct pour les tests et une utilisation active, mais attendez-vous à des pauses lorsque l'ordinateur se met en veille ou effectue des mises à jour.

    Si vous voulez profiter du meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nœuds](/fr/nodes).
    Pour les conseils de sécurité, lisez [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quelles sont les exigences minimales du VPS et le système d'exploitation recommandé ?">
    OpenClaw est léger. Pour un Gateway de base + un channel de discussion :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (journaux, médias, channels multiples). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    SE : utilisez **Ubuntu LTS** (ou tout Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

    Docs : [Linux](/fr/platforms/linux), [Hébergement VPS](/fr/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une VM et quelles sont les exigences ?">
    Oui. Traitez une VM comme un VPS : elle doit être toujours active, accessible et disposer de suffisamment
    de RAM pour le Gateway et tous les channels que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM.
    - **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs channels, l'automatisation du navigateur ou des outils multimédias.
    - **SE :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

    Si vous êtes sur Windows, **WSL2 est la configuration de style VM la plus simple** et offre la meilleure compatibilité
    des outils. Voir [Windows](/fr/platforms/windows), [Hébergement VPS](/fr/vps).
    Si vous exécutez macOS dans une VM, voir [VM macOS](/fr/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Qu'est-ce qu'OpenClaw ?

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'OpenClaw, en un paragraphe ?">
    OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat et des plugins de canal groupés tels que QQ Bot) et peut également effectuer des vocalisations + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.
  </Accordion>

  <Accordion title="Proposition de valeur">
    OpenClaw n'est pas « juste un wrapper Claude ». C'est un **plan de contrôle local d'abord** qui vous permet d'exécuter un assistant performant sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec des sessions avec état, de la mémoire et des outils - sans confier le contrôle de vos flux de travail à un SaaS hébergé.

    Points forts :

    - **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l'historique de l'espace de travail + des sessions en local.
    - **Vrais canaux, pas une sandbox web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc., ainsi que la voix mobile et Canvas sur les plateformes prises en charge.
    - **Agnostique au modèle :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage et un basculement par agent.
    - **Option uniquement locale :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
    - **Routage multi-agents :** séparez les agents par canal, compte ou tâche, chacun ayant son propre espace de travail et ses propres valeurs par défaut.
    - **Open source et modifiable :** inspectez, étendez et auto-hébergez sans verrouillage fournisseur.

    Docs : [Gateway](/fr/gateway), [Canaux](/fr/channels), [Multi-agent](/fr/concepts/multi-agent),
    [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Je viens de l'installer - que dois-je faire en premier ?">
    Bons premiers projets :

    - Créer un site Web (WordPress, Shopify ou un site statique simple).
    - Prototyper une application mobile (plan, écrans, plan d'API).
    - Organiser les fichiers et dossiers (nettoyage, nommage, balisage).
    - Connecter Gmail et automatiser les résumés ou les suivis.

    Il peut gérer de grandes tâches, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

  </Accordion>

  <Accordion title="Quels sont les cinq cas d'utilisation quotidiens les plus courants pour OpenClaw ?">
    Les réussites quotidiennes prennent généralement la forme suivante :

    - **Brèfings personnels :** résumés de votre boîte de réception, de votre agenda et des actualités qui vous intéressent.
    - **Recherche et rédaction :** recherche rapide, résumés et premières versions pour des e-mails ou des documents.
    - **Rappels et suivis :** rappels et listes de contrôle déclenchés par cron ou par des battements de cœur (heartbeat).
    - **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
    - **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et recevez le résultat dans le chat.

  </Accordion>

  <Accordion title="OpenClaw peut-il aider avec la génération de leads, la prospection, la publicité et les blogs pour un SaaS ?">
    Oui pour la **recherche, la qualification et la rédaction**. Il peut scanner des sites, constituer des listes restreintes,
    résumer des prospects et rédiger des versions de prospection ou de publicités.

    Pour les **campagnes de prospection ou de publicité**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
    les politiques des plateformes, et vérifiez tout contenu avant son envoi. Le modèle le plus sûr consiste à laisser
    OpenClaw rédiger et vous approuver.

    Documentation : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les avantages par rapport à Claude Code pour le développement web ?">
    OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplaçant d'IDE. Utilisez
    Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous souhaitez
    une mémoire persistante, un accès multi-appareils et une orchestration d'outils.

    Avantages :

    - **Mémoire persistante + espace de travail** à travers les sessions
    - **Accès multiplateforme** (WhatsApp, Telegram, TUI, WebChat)
    - **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
    - **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
    - **Nœuds** pour le navigateur/écran/caméra/exécution local

    Démo : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Compétences et automatisation

<AccordionGroup>
  <Accordion title="Comment personnaliser les compétences sans salir le dépôt ?">
    Utilisez des remplacements gérés au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, donc les remplacements gérés l'emportent toujours sur les compétences groupées sans toucher à git. Si vous avez besoin que la compétence soit installée globalement mais visible uniquement pour certains agents, gardez la copie partagée dans `~/.openclaw/skills` et contrôlez la visibilité avec `agents.defaults.skills` et `agents.list[].skills`. Seules les modifications dignes d'être intégrées en amont doivent résider dans le dépôt et être envoyées sous forme de PRs.
  </Accordion>

  <Accordion title="Puis-je charger des compétences depuis un dossier personnalisé ?">
    Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (priorité la plus basse). La priorité par défaut est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` installe par défaut dans `./skills`, qu'OpenClaw traite comme `<workspace>/skills` lors de la prochaine session. Si la compétence ne doit être visible que pour certains agents, associez cela à `agents.defaults.skills` ou `agents.list[].skills`.
  </Accordion>

  <Accordion title="Comment puis-je utiliser différents modèles pour différentes tâches ?">
    Aujourd'hui, les modèles pris en charge sont :

    - **Tâches Cron** : les tâches isolées peuvent définir une surcharge de `model` par tâche.
    - **Sous-agents** : acheminez les tâches vers des agents séparés avec différents modèles par défaut.
    - **Commutateur à la demande** : utilisez `/model` pour changer le modèle de session actuel à tout moment.

    Voir [Tâches Cron](/fr/automation/cron-jobs), [Routage Multi-Agent](/fr/concepts/multi-agent) et [Commandes Slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Le bot se fige pendant l'exécution de tâches lourdes. Comment délester cela ?">
    Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
    renvoient un résumé et gardent votre chat principal réactif.

    Demandez à votre bot de « lancer un sous-agent pour cette tâche » ou utilisez `/subagents`.
    Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

    Conseil sur les jetons : les tâches longues et les sous-agents consomment tous deux des jetons. Si le coût est une préoccupation, définissez un
    modèle moins cher pour les sous-agents via `agents.defaults.subagents.model`.

    Documentation : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks).

  </Accordion>

  <Accordion title="Comment fonctionnent les sessions de sous-agent liées aux fils sur Discord ?">
    Utilisez les liaisons de fils. Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

    Flux de base :

    - Créez avec `sessions_spawn` en utilisant `thread: true` (et facultativement `mode: "session"` pour un suivi persistant).
    - Ou liez manuellement avec `/focus <target>`.
    - Utilisez `/agents` pour inspecter l'état de la liaison.
    - Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le défocalisation automatique.
    - Utilisez `/unfocus` pour détacher le fil.

    Configuration requise :

    - Valeurs globales par défaut : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Remplacements Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Liaison automatique lors de la création : définissez `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentation : [Sous-agents](/fr/tools/subagents), [Discord](/fr/channels/discord), [Référence de configuration](/fr/gateway/configuration-reference), [Commandes slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Un sous-agent a terminé, mais la mise à jour de complétion est allée au mauvais endroit ou n'a jamais été publiée. Que dois-je vérifier ?">
    Vérifiez d'abord la route du demandeur résolue :

    - La livraison de sous-agent en mode complétion préfère toute route de fil ou de conversation liée lorsqu'elle existe.
    - Si l'origine de la complétion ne porte qu'un channel, OpenClaw revient à la route stockée de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe puisse encore réussir.
    - Si ni une route liée ni une route stockée utilisable n'existe, la livraison directe peut échouer et le résultat revient à une livraison de session mise en file d'attente au lieu d'être publié immédiatement dans le chat.
    - Des cibles invalides ou obsolètes peuvent toujours forcer le retour à la file d'attente ou l'échec final de la livraison.
    - Si la dernière réponse visible de l'assistant de l'enfant est le jeton silencieux exact `NO_REPLY` / `no_reply`, ou exactement `ANNOUNCE_SKIP`, OpenClaw supprime intentionnellement l'annonce au lieu de publier une progression antérieure obsolète.
    - Si l'enfant a expiré après seulement des appels d'outil, l'annonce peut réduire cela en un résumé court de progression partielle au lieu de rejouer la sortie brute de l'outil.

    Débogage :

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks), [Outils de session](/fr/concepts/session-tool).

  </Accordion>

  <Accordion title="Le cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?">
    Le cron s'exécute dans le processus Gateway. Si la Gateway ne tourne pas en continu,
    les tâches planifiées ne s'exécuteront pas.

    Liste de contrôle :

    - Confirmez que le cron est activé (`cron.enabled`) et que `OPENCLAW_SKIP_CRON` n'est pas défini.
    - Vérifiez que la Gateway tourne 24/7 (pas de mise en veille/redémarrages).
    - Vérifiez les paramètres de fuseau horaire pour la tâche (`--tz` vs fuseau horaire de l'hôte).

    Débogage :

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Docs : [Tâches cron](/fr/automation/cron-jobs), [Automatisation et tâches](/fr/automation).

  </Accordion>

  <Accordion title="Cron déclenché, mais rien n'a été envoyé au channel. Pourquoi ?">
    Vérifiez d'abord le mode de livraison :

    - `--no-deliver` / `delivery.mode: "none"` signifie qu'aucun message externe n'est attendu.
    - Une cible d'annonce manquante ou invalide (`channel` / `to`) signifie que le runner a ignoré la livraison sortante.
    - Les échecs d'authentification de channel (`unauthorized`, `Forbidden`) signifient que le runner a tenté de livrer mais que les identifiants l'ont bloqué.
    - Un résultat isolé silencieux (`NO_REPLY` / `no_reply` uniquement) est traité comme intentionnellement non livrable, le runner supprime donc également la livraison de repli mise en file d'attente.

    Pour les tâches cron isolées, le runner est propriétaire de la livraison finale. L'agent est censé
    renvoyer un résumé en texte brut pour que le runner l'envoie. `--no-deliver` conserve
    ce résultat en interne ; il n'autorise pas l'agent à envoyer directement à la place avec
    l'outil message.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Cron jobs](/fr/automation/cron-jobs), [Background Tasks](/fr/automation/tasks).

  </Accordion>

  <Accordion title="Pourquoi une exécution cron isolée a-t-elle changé de model ou réessayé une fois ?">
    C'est généralement le chemin de changement de model en direct, et non une planification en double.

    Le cron isolé peut conserver un transfert de model d'exécution (runtime) et réessayer lorsque l'exécution
    active génère `LiveSessionModelSwitchError`. La nouvelle tentative conserve le provider/model
    commuté, et si le changement comportait une nouvelle substitution de profil d'authentification, le cron
    la conserve également avant de réessayer.

    Règles de sélection connexes :

    - La substitution de model par le hook Gmail l'emporte en premier lorsqu'elle est applicable.
    - Puis `model` par tâche.
    - Puis toute substitution de model de session cron stockée.
    - Puis la sélection normale du model par défaut/de l'agent.

    La boucle de nouvelle tentative est limitée. Après la tentative initiale plus 2 nouvelles tentatives de commutation,
    le cron abandonne au lieu de boucler indéfiniment.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Cron jobs](/fr/automation/cron-jobs), [cron CLI](/fr/cli/cron).

  </Accordion>

  <Accordion title="Comment installer des compétences sous Linux ?">
    Utilisez les commandes `openclaw skills` natives ou déposez les compétences dans votre espace de travail. L'interface utilisateur Skills de macOS n'est pas disponible sous Linux.
    Parcourez les compétences sur [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    `openclaw skills install` natif écrit dans le répertoire de l'espace de travail actif `skills/`.
    Installez la `clawhub` CLI séparée uniquement si vous souhaitez publier ou
    synchroniser vos propres compétences. Pour les installations partagées entre les agents, placez la compétence sous
    `~/.openclaw/skills` et utilisez `agents.defaults.skills` ou
    `agents.list[].skills` si vous souhaitez restreindre les agents qui peuvent la voir.

  </Accordion>

  <Accordion title="OpenClaw peut-il exécuter des tâches selon un planning ou en continu en arrière-plan ?">
    Oui. Utilisez le planificateur Gateway :

    - **Cron jobs** pour les tâches planifiées ou récurrentes (persistents après redémarrage).
    - **Heartbeat** pour les vérifications périodiques de la "session principale".
    - **Isolated jobs** pour les agents autonomes qui publient des résumés ou les livrent aux chats.

    Documentation : [Cron jobs](/fr/automation/cron-jobs), [Automation & Tasks](/fr/automation),
    [Heartbeat](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title="Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?">
    Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et elles n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte Gateway**. Sur Linux, les compétences exclusives à `darwin` (telles que `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne contourniez les restrictions.

    Vous avez trois modèles pris en charge :

    **Option A - exécuter la Gateway sur un Mac (le plus simple).**
    Exécutez la Gateway là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#gateway-ports-already-running-and-remote-mode) ou via Tailscale. Les compétences se chargent normalement car l'hôte de la Gateway est macOS.

    **Option B - utiliser un nœud macOS (pas de SSH).**
    Exécutez la Gateway sur Linux, associez un nœud macOS (application de barre de menus) et définissez **Exécuter les commandes du nœud** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.

    **Option C - proxier les binaires macOS via SSH (avancé).**
    Conservez la Gateway sur Linux, mais faites en sorte que les binaires CLI requis résolvent vers des wrappers SSH qui s'exécutent sur un Mac. Ensuite, outrepassez les métadonnées de la compétence pour autoriser Linux afin qu'elle reste éligible.

    1. Créez un wrapper SSH pour le binaire (exemple : `memo` pour Apple Notes) :

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Placez le wrapper sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
    3. Outrepassez les métadonnées de la compétence (espace de travail ou `~/.openclaw/skills`) pour autoriser Linux :

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

    - **Compétence personnalisée / plugin :** le meilleur choix pour un accès fiable à l'API (Notion et HeyGen disposent tous deux d'API).
    - **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

    Si vous souhaitez conserver le contexte par client (flux de travail agence), un modèle simple consiste à :

    - Une page Notion par client (contexte + préférences + travail en cours).
    - Demander à l'agent de récupérer cette page au début d'une session.

    Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une compétence ciblant ces API.

    Installer des compétences :

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Les installations natives atterrissent dans le répertoire de l'espace de travail actif `skills/`. Pour des compétences partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Si seuls certains agents doivent voir une installation partagée, configurez `agents.defaults.skills` ou `agents.list[].skills`. Certaines compétences s'attendent à ce que des binaires soient installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Compétences](/fr/tools/skills), [Configuration des compétences](/fr/tools/skills-config) et [ClawHub](/fr/tools/clawhub).

  </Accordion>

  <Accordion title="Comment utiliser mon Chrome existant connecté avec OpenClaw ?">
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

    Ce chemin est local à l'hôte. Si le Gateway s'exécute ailleurs, exécutez soit un hôte de nœud sur la machine du navigateur, soit utilisez le CDP distant à la place.

    Limites actuelles de `existing-session` / `user` :

    - les actions sont basées sur des références, non sur des sélecteurs CSS
    - les téléchargements nécessitent `ref` / `inputRef` et prennent actuellement en charge un seul fichier à la fois
    - `responsebody`, l'export PDF, l'interception des téléchargements et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut

  </Accordion>
</AccordionGroup>

## Bac à sable et mémoire

<AccordionGroup>
  <Accordion title="Existe-t-il une documentation dédiée au sandboxing ?">
    Oui. Voir [Sandboxing](/fr/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de bac à sable), voir [Docker](/fr/install/docker).
  </Accordion>

  <Accordion title="Docker semble limité - comment activer toutes les fonctionnalités ?">
    L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
    de paquets système, Homebrew ou navigateurs intégrés. Pour une configuration plus complète :

    - Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` pour que les caches survivent.
    - Intégrez les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Installez les navigateurs Playwright via le CLI intégré :
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Définissez `PLAYWRIGHT_BROWSERS_PATH` et assurez-vous que le chemin est persisté.

    Documentation : [Docker](/fr/install/docker), [Browser](/fr/tools/browser).

  </Accordion>

  <Accordion title="Puis-je garder les DMs personnels mais rendre les groupes publics/sandboxés avec un seul agent ?">
    Oui - si votre trafic privé est constitué de **DMs** et votre trafic public de **groupes**.

    Utilisez `agents.defaults.sandbox.mode: "non-main"` pour que les sessions de groupe/canal (clés non principales) s'exécutent dans Docker, tandis que la session DM principale reste sur l'hôte. Restreignez ensuite les outils disponibles dans les sessions sandboxées via `tools.sandbox.tools`.

    Procédure pas à pas de la configuration + exemple : [Groupes : DMs personnels + groupes publics](/fr/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Référence clé de configuration : [configuration du Gateway](/fr/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="Comment monter un dossier hôte dans le bac à sable ?">
    Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (par exemple, `"/home/user/src:/src:ro"`). Les montages globaux + par agent fusionnent ; les montages par agent sont ignorés lorsque `scope: "shared"`. Utilisez `:ro` pour tout ce qui est sensible et rappelez-vous que les montages contournent les murs du système de fichiers du bac à sable.

    OpenClaw valide les sources de montage par rapport à la fois au chemin normalisé et au chemin canonique résolu via l'ancêtre existant le plus profond. Cela signifie que les échappements par lien symbolique parent échouent toujours même lorsque le dernier segment du chemin n'existe pas encore, et que les vérifications de racine autorisée s'appliquent toujours après la résolution du lien symbolique.

    Voir [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

  </Accordion>

  <Accordion title="Comment fonctionne la mémoire ?">
    La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

    - Notes quotidiennes dans `memory/YYYY-MM-DD.md`
    - Notes à long terme curatées dans `MEMORY.md` (sessions principales/privées uniquement)

    OpenClaw exécute également un **vidange de mémoire silencieuse pré-compaction** pour rappeler au modèle
    d'écrire des notes durables avant l'auto-compaction. Cela ne s'exécute que lorsque l'espace de travail
    est accessible en écriture (les bacs à sable en lecture seule l'ignorent). Voir [Memory](/fr/concepts/memory).

  </Accordion>

  <Accordion title="La mémoire continue d'oublier des choses. Comment faire pour qu'elle retienne ?">
    Demandez au bot **d'écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
    le contexte à court terme va dans `memory/YYYY-MM-DD.md`.

    C'est encore un domaine que nous améliorons. Cela aide de rappeler au modèle de stocker les souvenirs ;
    il saura quoi faire. S'il continue d'oublier, vérifiez que le Gateway utilise le même
    espace de travail à chaque exécution.

    Documentation : [Memory](/fr/concepts/memory), [Agent workspace](/fr/concepts/agent-workspace).

  </Accordion>

  <Accordion title="La mémoire persiste-t-elle indéfiniment ? Quelles sont les limites ?">
    Les fichiers de mémoire résident sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
    stockage, et non le model. Le **contexte de session** est toujours limité par la fenêtre de
    contexte du model, les longues conversations peuvent donc être compactées ou tronquées. C'est pourquoi
    la recherche de mémoire existe - elle ne ramène que les parties pertinentes dans le contexte.

    Docs : [Mémoire](/fr/concepts/memory), [Contexte](/fr/concepts/context).

  </Accordion>

  <Accordion title="La recherche sémantique dans la mémoire nécessite-t-elle une clé API OpenAI ?">
    Seulement si vous utilisez les **embeddings OpenAI**. Codex OAuth couvre les chat/completions et
    n'accorde **pas** l'accès aux embeddings, donc **se connecter avec Codex (OAuth ou
    la connexion CLI Codex)** n'aide pas pour la recherche sémantique dans la mémoire. Les embeddings OpenAI
    nécessitent toujours une vraie clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

    Si vous ne définissez pas explicitement un provider, OpenClaw sélectionne automatiquement un provider lorsqu'il
    peut résoudre une clé API (profils d'authentification, `models.providers.*.apiKey`, ou env vars).
    Il préfère OpenAI si une clé OpenAI est résolue, sinon Gemini si une clé Gemini
    est résolue, puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche
    de mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de model local
    configuré et présent, OpenClaw
    préfère `local`. Ollama est pris en charge lorsque vous définissez explicitement
    `memorySearch.provider = "ollama"`.

    Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et optionnellement
    `memorySearch.fallback = "none"`). Si vous voulez des embeddings Gemini, définissez
    `memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
    `memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embedding **OpenAI, Gemini, Voyage, Mistral, Ollama ou local**
    - voir [Mémoire](/fr/concepts/memory) pour les détails de la configuration.

  </Accordion>
</AccordionGroup>

## Emplacement des fichiers sur le disque

<AccordionGroup>
  <Accordion title="Toutes les données utilisées avec OpenClaw sont-elles sauvegardées localement ?">
    Non - **l'état de OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

    - **Local par défaut :** les sessions, les fichiers de mémoire, la configuration et l'espace de travail résident sur l'hôte Gateway
      (`~/.openclaw` + votre répertoire d'espace de travail).
    - **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) sont envoyés à
      leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
      serveurs.
    - **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les invites sur votre machine, mais le trafic
      du canal passe toujours par les serveurs du canal.

    Connexes : [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Où OpenClaw stocke-t-il ses données ?">
    Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

    | Chemin                                                            | Objectif                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuration principale (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Import OAuth hérité (copié dans les profils d'authentification lors de la première utilisation)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Profils d'authentification (OAuth, clés API, et `keyRef`/`tokenRef` optionnels)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Payload de secret optionnel sauvegardé dans un fichier pour les fournisseurs SecretRef `file` |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité hérité (entrées `api_key` statiques nettoyées)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique et état des conversations (par agent)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

    Chemin hérité à agent unique : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

    Votre **espace de travail** (AGENTS.md, fichiers de mémoire, compétences, etc.) est distinct et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?">
    Ces fichiers se trouvent dans l'**espace de travail de l'agent** (agent workspace), et non dans `~/.openclaw`.

    - **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (ou repli de secours `memory.md` si `MEMORY.md` est absent),
      `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` optionnel.
    - **Répertoire d'état (`~/.openclaw`)** : configuration, état du canal/provider, profils d'authentification, sessions, journaux,
      et compétences partagées (`~/.openclaw/skills`).

    L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si le bot "oublie" après un redémarrage, vérifiez que le Gateway utilise le même
    espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail de **l'hôte de la passerelle**,
    et non celui de votre ordinateur portable local).

    Astuce : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
    AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique de discussion.

    Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) et [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Stratégie de sauvegarde recommandée">
    Placez votre **espace de travail de l'agent** dans un dépôt git **privé** et sauvegardez-le quelque part
    de privé (par exemple GitHub privé). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER
    et vous permet de restaurer l'"esprit" de l'assistant plus tard.

    Ne **committez** rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
    Si vous avez besoin d'une restauration complète, sauvegardez séparément l'espace de travail et le répertoire d'état
    (voir la question sur la migration ci-dessus).

    Documentation : [Espace de travail de l'agent](/fr/concepts/agent-workspace).

  </Accordion>

<Accordion title="Comment désinstaller complètement OpenClaw ?">Voir le guide dédié : [Désinstallation](/fr/install/uninstall).</Accordion>

  <Accordion title="Les agents peuvent-ils travailler en dehors de l'espace de travail ?">
    Oui. L'espace de travail est le **répertoire de travail par défaut** et l'ancre de mémoire, et non un bac à sable strict.
    Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
    emplacements de l'hôte, sauf si le sandboxing est activé. Si vous avez besoin d'isolement, utilisez
    [`agents.defaults.sandbox`](/fr/gateway/sandboxing) ou les paramètres de sandbox par agent. Si vous
    souhaitez qu'un dépôt soit le répertoire de travail par défaut, définissez le `workspace`
    de cet agent sur la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez
    l'espace de travail séparé, sauf si vous souhaitez intentionnellement que l'agent travaille à l'intérieur.

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
    L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le stockage de session qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur local. Voir [Gestion de session](/fr/concepts/session).
  </Accordion>
</AccordionGroup>

## Bases de la configuration

<AccordionGroup>
  <Accordion title="Quel est le format de la configuration ? Où se trouve-t-elle ?">
    OpenClaw lit une configuration **JSON5** optionnelle depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si le fichier est manquant, il utilise des valeurs par défaut assez sûres (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='J'ai défini gateway.bind : « lan » (ou « tailnet ») et maintenant rien n'écoute / l'interface indique non autorisé'>
    Les liaisons non-boucle (non-loopback) **nécessitent un chemin d'authentification de passerelle valide**. En pratique, cela signifie :

    - authentification par secret partagé : jeton ou mot de passe
    - `gateway.auth.mode: "trusted-proxy"` derrière un proxy inverse identitaire conscient non-boucle correctement configuré

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

    - `gateway.remote.token` / `.password` n'activent **pas** l'authentification de la passerelle locale par eux-mêmes.
    - Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
    - Pour l'authentification par mot de passe, définissez `gateway.auth.mode: "password"` plus `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`) à la place.
    - Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue en mode fermé (pas de masquage de repli distant).
    - Les configurations de l'interface de contrôle par secret partagé s'authentient via `connect.params.auth.token` ou `connect.params.auth.password` (stockés dans les paramètres de l'application/interface). Les modes porteurs d'identité tels que Tailscale Serve ou `trusted-proxy` utilisent plutôt les en-têtes de requête. Évitez de mettre des secrets partagés dans les URL.
    - Avec `gateway.auth.mode: "trusted-proxy"`, les proxys inverses en boucle sur le même hôte ne satisfont toujours **pas** l'authentification par proxy de confiance. Le proxy de confiance doit être une source non-boucle configurée.

  </Accordion>

  <Accordion title="Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?">
    OpenClaw applique l'authentification de la passerelle par défaut, y compris pour le bouclage (loopback). Dans le chemin par défaut normal, cela signifie l'authentification par jeton : si aucun chemin d'authentification explicite n'est configuré, le démarrage de la passerelle passe en mode jeton et en génère un automatiquement, en l'enregistrant dans `gateway.auth.token`, donc **les clients WS locaux doivent s'authentifier**. Cela empêche d'autres processus locaux d'appeler la Gateway.

    Si vous préférez un chemin d'authentification différent, vous pouvez explicitement choisir le mode mot de passe (ou, pour les proxies inversés conscients de l'identité non bouclage, `trusted-proxy`). Si vous voulez **vraiment** un bouclage ouvert, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Doctor peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="Dois-je redémarrer après avoir modifié la configuration ?">
    La Gateway surveille la configuration et prend en charge le rechargement à chaud (hot-reload) :

    - `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les modifications critiques
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
    - `random` : slogans amusants/saisonniers rotatifs (comportement par défaut).
    - Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="Comment activer la recherche Web (et la récupération Web) ?">
    `web_fetch` fonctionne sans clé API. `web_search` dépend du fournisseur
    sélectionné :

    - Les fournisseurs prenant en charge API tels que Brave, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Perplexity et Tavily nécessitent leur configuration normale de clé API.
    - La recherche Web Ollama est gratuite, mais elle utilise votre hôte Ollama configuré et nécessite `ollama signin`.
    - DuckDuckGo est gratuit, mais il s'agit d'une intégration HTML non officielle.
    - SearXNG est gratuit/auto-hébergé ; configurez `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recommandé :** exécutez `openclaw configure --section web` et choisissez un fournisseur.
    Alternatives d'environnement :

    - Brave : `BRAVE_API_KEY`
    - Exa : `EXA_API_KEY`
    - Firecrawl : `FIRECRAWL_API_KEY`
    - Gemini : `GEMINI_API_KEY`
    - Grok : `XAI_API_KEY`
    - Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
    - MiniMax Search : `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` ou `MINIMAX_API_KEY`
    - Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`
    - SearXNG : `SEARXNG_BASE_URL`
    - Tavily : `TAVILY_API_KEY`

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
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    La configuration de recherche Web spécifique au fournisseur se trouve désormais sous `plugins.entries.<plugin>.config.webSearch.*`.
    Les chemins de fournisseur `tools.web.search.*` hérités se chargent encore temporairement pour des raisons de compatibilité, mais ils ne doivent pas être utilisés pour les nouvelles configurations.
    La configuration de repli de récupération Web Firecrawl se trouve sous `plugins.entries.firecrawl.config.webFetch.*`.

    Notes :

    - Si vous utilisez des listes d'autorisation (allowlists), ajoutez `web_search`/`web_fetch`/`x_search` ou `group:web`.
    - `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).
    - Si `tools.web.fetch.provider` est omis, OpenClaw détecte automatiquement le premier fournisseur de repli de récupération prêt parmi les informations d'identification disponibles. Aujourd'hui, le fournisseur inclus est Firecrawl.
    - Les démons lisent les env vars depuis `~/.openclaw/.env` (ou l'environnement du service).

    Documentation : [Web tools](/fr/tools/web).

  </Accordion>

  <Accordion title="config.apply a effacé ma configuration. Comment récupérer et éviter cela ?">
    `config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
    le reste est supprimé.

    Récupération :

    - Restaurez depuis une sauvegarde (git ou une copie de `~/.openclaw/openclaw.json`).
    - Si vous n'avez pas de sauvegarde, relancez `openclaw doctor` et reconfigurez les canaux/modèles.
    - Si c'était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
    - Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

    Pour l'éviter :

    - Utilisez `openclaw config set` pour les petits changements.
    - Utilisez `openclaw configure` pour les modifications interactives.
    - Utilisez `config.schema.lookup` d'abord lorsque vous n'êtes pas sûr d'un chemin exact ou de la forme d'un champ ; il renvoie un nœud de schéma superficiel plus des résumés d'enfants immédiats pour un forage.
    - Utilisez `config.patch` pour des modifications RPC partielles ; gardez `config.apply` uniquement pour le remplacement complet de la configuration.
    - Si vous utilisez l'outil `gateway` réservé au propriétaire lors d'une exécution d'agent, il rejettera toujours les écritures sur `tools.exec.ask` / `tools.exec.security` (y compris les alias `tools.bash.*` hérités qui se normalisent vers les mêmes chemins d'exécution protégés).

    Docs : [Config](/fr/cli/config), [Configure](/fr/cli/configure), [Doctor](/fr/gateway/doctor).

  </Accordion>

  <Accordion title="Comment faire fonctionner un Gateway central avec des workers spécialisés sur plusieurs appareils ?">
    Le modèle courant est **un Gateway** (ex. Raspberry Pi) plus des **nœuds** et des **agents** :

    - **Gateway (central) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
    - **Nœuds (appareils) :** les Mac/iOS/iOS/Android se connectent en tant que périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`).
    - **Agents (workers) :** des cerveaux/espaces de travail distincts pour des rôles spéciaux (ex. "ops Hetzner", "Données personnelles").
    - **Sous-agents :** lancent des tâches en arrière-plan à partir d'un agent principal lorsque vous voulez du parallélisme.
    - **TUI :** se connecte au Gateway et permet de changer d'agent/session.

    Documentation : [Nœuds](/fr/nodes), [Accès distant](/fr/gateway/remote), [Routage multi-agent](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagents), [TUI](/fr/web/tui).

  </Accordion>

  <Accordion title="Le navigateur OpenClaw peut-il fonctionner en mode headless ?">
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

    La valeur par défaut est `false` (mode graphique). Le mode headless est plus susceptible de déclencher des vérifications anti-bot sur certains sites. Voir [Navigateur](/fr/tools/browser).

    Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

    - Pas de fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
    - Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAS, anti-bot).
      Par exemple, X/Twitter bloque souvent les sessions headless.

  </Accordion>

  <Accordion title="Comment utiliser Brave pour le contrôle du navigateur ?">
    Définissez `browser.executablePath` sur votre binaire Brave (ou tout navigateur basé sur Chromium) et redémarrez le Gateway.
    Voir les exemples de configuration complets dans [Navigateur](/fr/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Passerelles et nœuds distants

<AccordionGroup>
  <Accordion title="Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?">
    Les messages Telegram sont gérés par la **gateway**. La gateway exécute l'agent et
    n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

    Telegram → Telegram → Agent → `node.*` → Node → Gateway → Telegram

    Les nœuds ne voient pas le trafic entrant du provider ; ils ne reçoivent que les appels RPC de nœud.

  </Accordion>

  <Accordion title="Comment mon agent peut-il accéder à mon ordinateur si la Gateway est hébergée à distance ?">
    Réponse courte : **associez votre ordinateur en tant que nœud**. La Gateway s'exécute ailleurs, mais elle peut
    appeler des outils `node.*` (écran, caméra, système) sur votre machine locale via le Gateway WebSocket.

    Configuration typique :

    1. Exécutez la Gateway sur l'hôte toujours actif (VPS/serveur domestique).
    2. Placez l'hôte de la Gateway + votre ordinateur sur le même tailnet.
    3. Assurez-vous que le WS de la Gateway est accessible (liaison tailnet ou tunnel SSH).
    4. Ouvrez l'application Gateway localement et connectez-vous en mode **Remote over SSH** (ou tailnet direct)
       pour qu'elle puisse s'enregistrer en tant que nœud.
    5. Approuvez le nœud sur la Gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Aucun pont TCP séparé n'est requis ; les nœuds se connectent via le Gateway WebSocket.

    Rappel de sécurité : l'association d'un nœud Gateway permet `system.run` sur cette machine. N'associez
    que des appareils de confiance, et consultez la page [Sécurité](/fr/gateway/security).

    Documentation : [Nœuds](/fr/nodes), [Protocole Gateway](/fr/gateway/protocol), [Mode distant macOS](/fr/platforms/mac/remote), [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Tailscale est connecté mais je ne reçois aucune réponse. Et maintenant ?">
    Vérifiez les points de base :

    - Gateway est en cours d'exécution : `openclaw gateway status`
    - Santé de la Gateway : `openclaw status`
    - Santé du channel : `openclaw channels status`

    Ensuite, vérifiez l'authentification et le routage :

    - Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale` est défini correctement.
    - Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
    - Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

    Docs : [Tailscale](/fr/gateway/tailscale), [Accès distant](/fr/gateway/remote), [Channels](/fr/channels).

  </Accordion>

  <Accordion title="Deux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?">
    Oui. Il n'y a pas de pont "bot-to-bot" intégré, mais vous pouvez le configurer de quelques
    manières fiables :

    **Le plus simple :** utilisez un channel de discussion normal auquel les deux bots ont accès (Telegram/Slack/WhatsApp).
    Demandez au Bot A d'envoyer un message au Bot B, puis laissez le Bot B répondre comme d'habitude.

    **Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
    `openclaw agent --message ... --deliver`, en ciblant un chat où l'autre bot
    écoute. Si l'un des bots est sur un VPS distant, dirigez votre CLI vers ce Gateway distant
    via SSH/Tailscale (voir [Accès distant](/fr/gateway/remote)).

    Exemple de modèle (exécuté depuis une machine qui peut atteindre le Gateway cible) :

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Astuce : ajoutez une garde-fou pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes d'autorisation de channel, ou une règle "ne pas répondre aux messages des bots").

    Docs : [Accès distant](/fr/gateway/remote), [Agent CLI](/fr/cli/agent), [Agent send](/fr/tools/agent-send).

  </Accordion>

  <Accordion title="Ai-je besoin de VPS séparées pour plusieurs agents ?">
    Non. Un Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, ses paramètres de modèle par défaut,
    et son routage. C'est la configuration normale et c'est beaucoup moins coûteux et plus simple que de faire tourner
    une VPS par agent.

    Utilisez des VPS séparées uniquement lorsque vous avez besoin d'une isolation stricte (limites de sécurité) ou de configurations
    très différentes que vous ne souhaitez pas partager. Sinon, gardez un Gateway et
    utilisez plusieurs agents ou sous-agents.

  </Accordion>

  <Accordion title="Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel plutôt qu'un SSH depuis une VPS ?">
    Oui - les nœuds sont la méthode privilégiée pour atteindre votre ordinateur portable depuis un Gateway distant, et ils
    offrent plus qu'un simple accès shell. Le Gateway fonctionne sur macOS/Linux (Windows via WSL2) et est
    léger (un petit VPS ou une boîte de classe Raspberry Pi convient ; 4 Go de RAM suffisent), donc une configuration
    courante est un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

    - **Pas de SSH entrant requis.** Les nœuds se connectent au WebSocket du Gateway et utilisent l'appariement d'appareils.
    - **Contrôles d'exécution plus sûrs.** `system.run` est limité par les listes d'autorisation/approbations de nœud sur cet ordinateur portable.
    - **Plus d'outils d'appareil.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`.
    - **Automatisation du navigateur locale.** Gardez le Gateway sur une VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou attachez-vous au Chrome local sur l'hôte via Chrome MCP.

    Le SSH convient pour un accès shell ponctuel, mais les nœuds sont plus simples pour les flux de travail d'agents continus et
    l'automatisation des appareils.

    Documentation : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes), [Navigateur](/fr/tools/browser).

  </Accordion>

  <Accordion title="Les nœuds exécutent-ils un service de passerelle ?">
    Non. Seule **une passerelle** devrait s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Passerelles multiples](/fr/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
    à la passerelle (nœuds iOS/Android, ou « mode nœud » macOS dans l'application de la barre de menus). Pour les hôtes de nœuds
    sans interface graphique et le contrôle CLI, voir [CLI de l'hôte de nœud](/fr/cli/node).

    Un redémarrage complet est requis pour les modifications de `gateway`, `discovery` et `canvasHost`.

  </Accordion>

  <Accordion title="Existe-t-il un moyen API / RPC d'appliquer la configuration ?">
    Oui.

    - `config.schema.lookup`: inspecter un sous-arbre de configuration avec son nœud de schéma superficiel, l'indice d'interface utilisateur correspondant et les résumés des enfants immédiats avant l'écriture
    - `config.get`: récupérer l'instantané actuel + le hachage
    - `config.patch`: mise à jour partielle sécurisée (préférée pour la plupart des modifications RPC) ; rechargement à chaud lorsque cela est possible et redémarrage lorsque cela est requis
    - `config.apply`: valider + remplacer la configuration complète ; rechargement à chaud lorsque cela est possible et redémarrage lorsque cela est requis
    - L'outil d'exécution `gateway` réservé au propriétaire refuse toujours de réécrire `tools.exec.ask` / `tools.exec.security` ; les alias obsolètes `tools.bash.*` se normalisent vers les mêmes chemins d'exécution protégés

  </Accordion>

  <Accordion title="Configuration saine minimale pour une première installation">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Cela définit votre espace de travail et restreint qui peut déclencher le bot.

  </Accordion>

  <Accordion title="Comment configurer Tailscale sur un VPS et s'y connecter depuis mon Mac ?">
    Étapes minimales :

    1. **Installer + se connecter sur le VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **Installer + se connecter sur votre Mac**
       - Utilisez l'application Tailscale et connectez-vous au même tailnet.
    3. **Activer MagicDNS (recommandé)**
       - Dans la console d'administration Tailscale, activez MagicDNS afin que le VPS ait un nom stable.
    4. **Utiliser le nom d'hôte du tailnet**
       - SSH : `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS : `ws://your-vps.tailnet-xxxx.ts.net:18789`

    Si vous souhaitez l'interface de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Cela maintient la passerelle liée au loopback et expose le HTTPS via Tailscale. Voir [Tailscale](/fr/gateway/tailscale).

  </Accordion>

  <Accordion title="Comment connecter un nœud Mac à une Gateway distante (Tailscale Serve) ?">
    Serve expose l'**interface de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS de la Gateway.

    Configuration recommandée :

    1. **Assurez-vous que le VPS et le Mac sont sur le même tailnet**.
    2. **Utilisez l'application macOS en mode distant** (la cible SSH peut être le nom d'hôte du tailnet).
       L'application va tunneler le port de la Gateway et se connecter en tant que nœud.
    3. **Approuver le nœud** sur la gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Docs : [Protocole Gateway](/fr/gateway/protocol), [Discovery](/fr/gateway/discovery), [Mode distant macOS](/fr/platforms/mac/remote).

  </Accordion>

  <Accordion title="Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?">
    Si vous avez uniquement besoin d'**outils locaux** (écran/caméra/exec) sur le deuxième ordinateur portable, ajoutez-le en tant que
    **nœud**. Cela permet de conserver une seule Gateway et évite une configuration dupliquée. Les outils de nœud local sont
    actuellement uniquement disponibles sur macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

    Installez une deuxième Gateway uniquement lorsque vous avez besoin d'une **isolation stricte** ou de deux bots totalement séparés.

    Docs : [Nœuds](/fr/nodes), [CLI Nœuds](/fr/cli/nodes), [Passerelles multiples](/fr/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables d'environnement et chargement .env

<AccordionGroup>
  <Accordion title="Comment OpenClaw charge-t-il les variables d'environnement ?">
    OpenClaw lit les env vars depuis le processus parent (shell, launchd/systemd, CI, etc.) et charge également :

    - `.env` depuis le répertoire de travail actuel
    - un `.env` de secours global depuis `~/.openclaw/.env` (alias `$OPENCLAW_STATE_DIR/.env`)

    Aucun fichier `.env` ne remplace les env vars existants.

    Vous pouvez également définir des env vars en ligne dans la configuration (appliqués uniquement s'ils manquent dans l'environnement du processus) :

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consultez [/environment](/fr/help/environment) pour connaître l'ordre de priorité complet et les sources.

  </Accordion>

  <Accordion title="J'ai démarré le Gateway via le service et mes env vars ont disparu. Et maintenant ?">
    Deux correctifs courants :

    1. Mettez les clés manquantes dans `~/.openclaw/.env` afin qu'elles soient détectées même lorsque le service n'hérite pas de l'environnement de votre shell.
    2. Activez l'importation du shell (confort optionnel) :

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

    Cela exécute votre shell de connexion et importe uniquement les clés attendues manquantes (ne remplace jamais). Équivalents en env var :
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='J'ai défini COPILOT_GITHUB_TOKEN, mais l'état des modèles affiche "Shell env: off." Pourquoi ?'>
    `openclaw models status` indique si l'**importation de l'environnement du shell** est activée. "Shell env: off"
    ne signifie **pas** que vos variables d'environnement sont manquantes - cela signifie simplement que OpenClaw ne chargera
    pas votre shell de connexion automatiquement.

    Si le Gateway s'exécute en tant que service (launchd/systemd), il n'héritera pas de votre
    environnement de shell. Pour corriger cela, faites l'une des choses suivantes :

    1. Mettez le jeton dans `~/.openclaw/.env` :

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
    3. Ou ajoutez-le à votre bloc de configuration `env` (s'applique uniquement en cas d'absence).

    Ensuite, redémarrez la passerelle et vérifiez à nouveau :

    ```bash
    openclaw models status
    ```

    Les jetons Copilot sont lus depuis `COPILOT_GITHUB_TOKEN` (aussi `GH_TOKEN` / `GITHUB_TOKEN`).
    Voir [/concepts/model-providers](/fr/concepts/model-providers) et [/environment](/fr/help/environment).

  </Accordion>
</AccordionGroup>

## Sessions et plusieurs discussions

<AccordionGroup>
  <Accordion title="Comment puis-je commencer une nouvelle conversation ?">
    Envoyez `/new` ou `/reset` comme un message autonome. Voir [Gestion des sessions](/fr/concepts/session).
  </Accordion>

  <Accordion title="Les sessions se réinitialisent-elles automatiquement si je n'envoie jamais /new ?">
    Les sessions peuvent expirer après `session.idleMinutes`, mais cela est **désactivé par défaut** (par défaut **0**).
    Définissez-le sur une valeur positive pour activer l'expiration en cas d'inactivité. Lorsqu'elle est activée, le message
    **suivant** après la période d'inactivité lance un nouvel identifiant de session pour cette clé de discussion.
    Cela ne supprime pas les transcriptions - cela lance simplement une nouvelle session.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="Existe-t-il un moyen de créer une équipe d'instances OpenClaw (un PDG et plusieurs agents) ?">
    Oui, via le **routage multi-agents** et les **sous-agents**. Vous pouvez créer un agent coordinateur
    et plusieurs agents de travail avec leurs propres espaces de travail et modèles.

    Cela dit, il est préférable de voir cela comme une **expérience amusante**. C'est coûteux en tokens et souvent
    moins efficace que d'utiliser un seul bot avec des sessions séparées. Le modèle type que nous
    envisageons est un bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
    bot peut également générer des sous-agents si nécessaire.

    Docs : [Routage multi-agents](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagents), [Agents CLI](/fr/cli/agents).

  </Accordion>

  <Accordion title="Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment l'empêcher ?">
    Le contexte de la session est limité par la fenêtre du modèle. Les longues discussions, les résultats volumineux des outils ou de nombreux
    fichiers peuvent déclencher une compaction ou une troncature.

    Ce qui aide :

    - Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
    - Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
    - Gardez le contexte important dans l'espace de travail et demandez au bot de le relire.
    - Utilisez des sous-agents pour le travail long ou parallèle afin que la discussion principale reste plus légère.
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

    Relancez ensuite la configuration :

    ```bash
    openclaw onboard --install-daemon
    ```

    Notes :

    - L'intégration offre également une option **Réinitialiser** s'il détecte une configuration existante. Voir [Intégration (CLI)](/fr/start/wizard).
    - Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
    - Réinitialisation dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + les identifiants + les sessions + l'espace de travail).

  </Accordion>

  <Accordion title='Je reçois des erreurs "context too large" - comment réinitialiser ou compacter ?'>
    Utilisez l'une de ces méthodes :

    - **Compacter** (conserve la conversation mais résume les tours plus anciens) :

      ```
      /compact
      ```

      ou `/compact <instructions>` pour guider le résumé.

    - **Réinitialiser** (identifiant de session frais pour la même clé de conversation) :

      ```
      /new
      /reset
      ```

    Si cela continue à se produire :

    - Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
    - Utilisez un modèle avec une fenêtre de contexte plus large.

    Documentation : [Compaction](/fr/concepts/compaction), [Session pruning](/fr/concepts/session-pruning), [Session management](/fr/concepts/session).

  </Accordion>

  <Accordion title='Pourquoi je vois "LLM request rejected: messages.content.tool_use.input field required" ?'>
    Il s'agit d'une erreur de validation du fournisseur : le modèle a émis un bloc `tool_use` sans le `input` requis. Cela signifie généralement que l'historique de la session est périmé ou corrompu (souvent après des fils longs ou un changement d'outil/de schéma).

    Solution : démarrez une nouvelle session avec `/new` (message autonome).

  </Accordion>

  <Accordion title="Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes ?">
    Les heartbeats s'exécutent toutes les **30 m** par défaut (**1 h** lors de l'utilisation de l'authentification OAuth). Ajustez-les ou désactivez-les :

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

    Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API.
    Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide quoi faire.

    Les overrides par agent utilisent `agents.list[].heartbeat`. Documentation : [Heartbeat](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title='Do I need to add a "bot account" to a WhatsApp group?'>
    Non. OpenClaw fonctionne sur **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir.
    Par défaut, les réponses de groupe sont bloquées jusqu'à ce que vous autorisiez les expéditeurs (`groupPolicy: "allowlist"`).

    Si vous voulez que seul **vous** puissiez déclencher des réponses de groupe :

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

    Documentation : [WhatsApp](/fr/channels/whatsapp), [Directory](/fr/cli/directory), [Logs](/fr/cli/logs).

  </Accordion>

  <Accordion title="Why does OpenClaw not reply in a group?">
    Deux causes courantes :

    - Le filtrage par mention est activé (par défaut). Vous devez @mentionner le bot (ou correspondre à `mentionPatterns`).
    - Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas sur la liste d'autorisation.

    Voir [Groups](/fr/channels/groups) et [Group messages](/fr/channels/group-messages).

  </Accordion>

<Accordion title="Do groups/threads share context with DMs?">Les discussions directes sont regroupées dans la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / les fils Discord sont des sessions séparées. Voir [Groups](/fr/channels/groups) et [Group messages](/fr/channels/group-messages).</Accordion>

  <Accordion title="Combien d'espaces de travail et d'agents puis-je créer ?">
    Aucune limite stricte. Des dizaines (voire des centaines) conviennent, mais surveillez :

    - **Croissance du disque :** les sessions et les transcriptions résident sous `~/.openclaw/agents/<agentId>/sessions/`.
    - **Coût en jetons :** plus d'agents signifie plus d'utilisation simultanée du modèle.
    - **Frais d'exploitation :** profils d'authentification par agent, espaces de travail et routage des canaux.

    Conseils :

    - Conservez un espace de travail **actif** par agent (`agents.defaults.workspace`).
    - Nettoyez les anciennes sessions (supprimez les fichiers JSONL ou les entrées de magasin) si l'espace disque augmente.
    - Utilisez `openclaw doctor` pour repérer les espaces de travail égarés et les inadéquations de profils.

  </Accordion>

  <Accordion title="Puis-je exécuter plusieurs bots ou chats en même temps (Slack) et comment dois-je configurer cela ?">
    Oui. Utilisez le **routage multi-agent** pour exécuter plusieurs agents isolés et acheminer les messages entrants par
    canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

    L'accès par navigateur est puissant mais ne permet pas de « faire tout ce qu'un humain peut faire » – les anti-bots, les CAPTCHAs et la MFA peuvent
    toujours bloquer l'automatisation. Pour le contrôle du navigateur le plus fiable, utilisez le MCP Chrome local sur l'hôte,
    ou utilisez CDP sur la machine qui exécute réellement le navigateur.

    Configuration recommandée :

    - Hôte Gateway toujours actif (VPS/Mac mini).
    - Un agent par rôle (liaisons).
    - Canal(x) Slack lié(s) à ces agents.
    - Navigateur local via Chrome MCP ou un nœud si nécessaire.

    Documentation : [Routage multi-agent](/fr/concepts/multi-agent), [Slack](/fr/channels/slack),
    [Navigateur](/fr/tools/browser), [Nœuds](/fr/nodes).

  </Accordion>
</AccordionGroup>

## Modèles : valeurs par défaut, sélection, alias, basculement

<AccordionGroup>
  <Accordion title='Qu'est-ce que le « modèle par défaut » ?'>
    Le modèle par défaut d'OpenClaw est celui que vous avez défini comme :

    ```
    agents.defaults.model.primary
    ```

    Les modèles sont référencés sous la forme `provider/model` (exemple : `openai/gpt-5.4`). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite au fournisseur par défaut configuré qu'en tant que chemin de compatibilité obsolète. Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un paramètre par défaut obsolète d'un fournisseur supprimé. Vous devriez toujours définir `provider/model` **explicitement**.

  </Accordion>

  <Accordion title="Quel modèle recommandez-vous ?">
    **Par défaut recommandé :** utilisez le modèle le plus puissant de la dernière génération disponible dans votre pile de fournisseurs.
    **Pour les agents activés pour les outils ou les entrées non fiables :** privilégiez la puissance du modèle plutôt que le coût.
    **Pour les discussions de routine ou à faible enjeu :** utilisez des modèles de repli moins chers et acheminez par rôle d'agent.

    MiniMax possède sa propre documentation : [MiniMax](/fr/providers/minimax) et
    [Modèles locaux](/fr/gateway/local-models).

    Règle empirique : utilisez le **meilleur modèle que vous puissiez vous permettre** pour le travail à enjeux élevés, et un modèle moins cher pour les discussions de routine ou les résumés. Vous pouvez acheminer les modèles par agent et utiliser des sous-agents pour paralléliser les tâches longues (chaque sous-agent consomme des jetons). Voir [Modèles](/fr/concepts/models) et
    [Sous-agents](/fr/tools/subagents).

    Avertissement sérieux : les modèles plus faibles ou sur-quantifiés sont plus vulnérables aux injections de prompt et aux comportements non sécurisés. Voir [Sécurité](/fr/gateway/security).

    Plus de contexte : [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Comment puis-je changer de modèles sans effacer ma configuration ?">
    Utilisez les **commandes de modèle** ou modifiez uniquement les champs de **modèle**. Évitez les remplacements complets de la configuration.

    Options sûres :

    - `/model` dans le chat (rapide, par session)
    - `openclaw models set ...` (met à jour uniquement la configuration du modèle)
    - `openclaw configure --section model` (interactif)
    - modifier `agents.defaults.model` dans `~/.openclaw/openclaw.json`

    Évitez `config.apply` avec un objet partiel à moins que vous ne prévoyiez de remplacer toute la configuration.
    Pour les modifications RPC, inspectez d'abord avec `config.schema.lookup` et préférez `config.patch`. La charge utile de recherche vous donne le chemin normalisé, la documentation/contraintes du schéma superficiel et les résumés des enfants immédiats.
    pour les mises à jour partielles.
    Si vous avez écrasé la configuration, restaurez-la à partir d'une sauvegarde ou relancez `openclaw doctor` pour réparer.

    Docs : [Modèles](/fr/concepts/models), [Configurer](/fr/cli/configure), [Config](/fr/cli/config), [Doctor](/fr/gateway/doctor).

  </Accordion>

  <Accordion title="Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?">
    Oui. Ollama est la solution la plus simple pour les modèles locaux.

    Installation la plus rapide :

    1. Installez Ollama à partir de `https://ollama.com/download`
    2. Téléchargez un modèle local tel que `ollama pull gemma4`
    3. Si vous souhaitez également des modèles cloud, exécutez `ollama signin`
    4. Exécutez `openclaw onboard` et choisissez `Ollama`
    5. Sélectionnez `Local` ou `Cloud + Local`

    Notes :

    - `Cloud + Local` vous offre des modèles cloud ainsi que vos modèles Ollama locaux
    - les modèles cloud tels que `kimi-k2.5:cloud` ne nécessitent pas de téléchargement local
    - pour une commutation manuelle, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

    Note de sécurité : les modèles plus petits ou fortement quantifiés sont plus vulnérables aux
    injections de prompt. Nous recommandons vivement des **modèles volumineux** pour tout bot pouvant utiliser des outils.
    Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et des listes d'autorisation d'outils strictes.

    Documentation : [Ollama](/fr/providers/ollama), [Local models](/fr/gateway/local-models),
    [Model providers](/fr/concepts/model-providers), [Security](/fr/gateway/security),
    [Sandboxing](/fr/gateway/sandboxing).

  </Accordion>

<Accordion title="Qu'utilisent OpenClaw, Flawd et Krill pour les modèles ?">
  - Ces déploiements peuvent différer et évoluer avec le temps ; il n'y a pas de recommandation fixe de fournisseur. - Vérifiez le paramètre d'exécution actuel sur chaque passerelle avec `openclaw models status`. - Pour les agents sensibles à la sécurité/activant les outils, utilisez le modèle de dernière génération le plus puissant disponible.
</Accordion>

  <Accordion title="Comment puis-je changer de model à la volée (sans redémarrer) ?">
    Utilisez la commande `/model` comme un message autonome :

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Ce sont les alias intégrés. Des alias personnalisés peuvent être ajoutés via `agents.defaults.models`.

    Vous pouvez lister les models disponibles avec `/model`, `/model list` ou `/model status`.

    `/model` (et `/model list`) affiche un sélecteur compact numéroté. Sélectionnez par numéro :

    ```
    /model 3
    ```

    Vous pouvez également forcer un profil d'authentification spécifique pour le provider (par session) :

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Astuce : `/model status` montre quel agent est actif, quel fichier `auth-profiles.json` est utilisé et quel profil d'authentification sera essayé ensuite.
    Il montre également le point de terminaison du provider configuré (`baseUrl`) et le mode API (`api`) lorsqu'ils sont disponibles.

    **Comment puis-je désépingler un profil que j'ai défini avec @profile ?**

    Relancez `/model` **sans** le suffixe `@profile` :

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si vous souhaitez revenir à la valeur par défaut, sélectionnez-la depuis `/model` (ou envoyez `/model <default provider/model>`).
    Utilisez `/model status` pour confirmer quel profil d'authentification est actif.

  </Accordion>

  <Accordion title="Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage ?">
    Oui. Définissez-en un par défaut et changez selon les besoins :

    - **Changement rapide (par session) :** `/model gpt-5.4` pour les tâches quotidiennes, `/model openai-codex/gpt-5.4` pour le codage avec l'OAuth Codex.
    - **Par défaut + changement :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.4`, puis basculez sur `openai-codex/gpt-5.4` lors du codage (ou vice-versa).
    - **Sous-agents :** routez les tâches de codage vers des sous-agents avec un model par défaut différent.

    Voir [Models](/fr/concepts/models) et [Slash commands](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Comment configurer le mode rapide pour GPT 5.4 ?">
    Utilisez soit un basculement de session, soit une valeur par défaut de configuration :

    - **Par session :** envoyez `/fast on` alors que la session utilise `openai/gpt-5.4` ou `openai-codex/gpt-5.4`.
    - **Par défaut de model :** définissez `agents.defaults.models["openai/gpt-5.4"].params.fastMode` sur `true`.
    - **OAuth Codex aussi :** si vous utilisez également `openai-codex/gpt-5.4`, définissez le même indicateur à cet endroit.

    Exemple :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
            "openai-codex/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    Pour OpenAI, le mode rapide correspond à `service_tier = "priority"` sur les requêtes Responses natives prises en charge. Le `/fast` de la session remplace les valeurs par défaut de la configuration.

    Voir [Thinking and fast mode](/fr/tools/thinking) et [OpenAI fast mode](/fr/providers/openai#openai-fast-mode).

  </Accordion>

  <Accordion title='Pourquoi vois-je « Model ... is not allowed » et ensuite aucune réponse ?'>
    Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et toutes
    les substitutions de session. Le choix d'un modèle qui n'est pas dans cette liste renvoie :

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Cette erreur est renvoyée **à la place de** une réponse normale. Solution : ajoutez le modèle à
    `agents.defaults.models`, supprimez la liste d'autorisation ou choisissez un modèle parmi `/model list`.

  </Accordion>

  <Accordion title='Pourquoi je vois « Unknown model: minimax/MiniMax-M2.7 » ?'>
    Cela signifie que le **fournisseur n'est pas configuré** (aucune configuration de fournisseur MiniMax ou profil d'authentification n'a été trouvé), donc le modèle ne peut pas être résolu.

    Liste de vérification pour la correction :

    1. Mettez à niveau vers une version actuelle d'OpenClaw (ou exécutez à partir du code source `main`), puis redémarrez la passerelle.
    2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou que l'authentification MiniMax
       existe dans les profils env/auth afin que le fournisseur correspondant puisse être injecté
       (`MINIMAX_API_KEY` pour `minimax`, `MINIMAX_OAUTH_TOKEN` ou MiniMax
       OAuth stocké pour `minimax-portal`).
    3. Utilisez l'identifiant exact du modèle (sensible à la casse) pour votre chemin d'authentification :
       `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed` pour la configuration
       par clé d'API, ou `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` pour la configuration OAuth.
    4. Exécutez :

       ```bash
       openclaw models list
       ```

       et choisissez dans la liste (ou `/model list` dans le chat).

    Voir [MiniMax](/fr/providers/minimax) et [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes ?">
    Oui. Utilisez **MiniMax par défaut** et changez de modèle **par session** si nécessaire.
    Les secours (fallbacks) sont pour les **erreurs**, pas pour les « tâches difficiles », utilisez donc `/model` ou un agent séparé.

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

    Documentation : [Modèles](/fr/concepts/models), [Acheminement Multi-Agent](/fr/concepts/multi-agent), [MiniMax](/fr/providers/minimax), [OpenAI](/fr/providers/openai).

  </Accordion>

  <Accordion title="Les raccourcis opus / sonnet / gpt sont-ils intégrés ?">
    Oui. OpenClaw fournit quelques abréviations par défaut (appliquées uniquement lorsque le model existe dans `agents.defaults.models`) :

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si vous définissez votre propre alias avec le même nom, votre valeur prévaut.

  </Accordion>

  <Accordion title="Comment définir ou remplacer les raccourcis de model (alias) ?">
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

    Ensuite, `/model sonnet` (ou `/<alias>` lorsque pris en charge) est résolu vers cet ID de model.

  </Accordion>

  <Accordion title="Comment ajouter des modèles d'autres providers comme OpenRouter ou Z.AI ?">
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

    Si vous référencez un provider/model mais que la clé provider requise est manquante, vous obtiendrez une erreur d'authentification au runtime (par exemple `No API key found for provider "zai"`).

    **Aucune clé API trouvée pour le provider après l'ajout d'un nouvel agent**

    Cela signifie généralement que le **nouvel agent** a un stockage d'authentification vide. L'authentification est par agent et
    stockée dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Options de correction :

    - Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
    - Ou copiez `auth-profiles.json` depuis le `agentDir` de l'agent principal vers le `agentDir` du nouvel agent.

    N'**utilisez pas** le même `agentDir` pour plusieurs agents ; cela provoque des collisions d'authentification/session.

  </Accordion>
</AccordionGroup>

## Bascule de model et "Échec de tous les modèles"

<AccordionGroup>
  <Accordion title="Comment fonctionne le basculement ?">
    Le basculement se produit en deux étapes :

    1. **Rotation du profil d'authentification** au sein du même fournisseur.
    2. **Modèle de secours** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

    Les temps de recharge s'appliquent aux profils en échec (backoff exponentiel), afin que OpenClaw puisse continuer à répondre même lorsqu'un fournisseur est limité en taux ou en échec temporaire.

    Le compartiment de limite de taux inclut plus que de simples réponses `429`. OpenClaw
    traite également les messages comme `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted`, et les limites
    périodiques de fenêtre d'utilisation (`weekly/monthly limit reached`) comme des limites de taux
    justifiant un basculement.

    Certaines réponses ressemblant à des factures ne sont pas `402`, et certaines réponses HTTP `402`
    restent également dans ce compartiment transitoire. Si un fournisseur renvoie
    un texte de facturation explicite sur `401` ou `403`, OpenClaw peut toujours le conserver
    dans la voie de facturation, mais les correspondances de texte spécifiques au fournisseur restent limitées au
    fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Si un message `402`
    ressemble plutôt à une limite de fenêtre d'utilisation réessaiable ou
    de dépense d'organisation/espace de travail (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw le traite comme
    `rate_limit`, et non comme une désactivation de facturation longue durée.

    Les erreurs de dépassement de contexte sont différentes : les signatures telles que
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, ou `ollama error: context length
    exceeded` restent sur le chemin de compactage/réessai au lieu d'avancer le modèle
    de secours.

    Le texte d'erreur de serveur générique est intentionnellement plus étroit que "n'importe quoi avec
    unknown/error dedans". OpenClaw traite bien les formes transitoires limitées au fournisseur
    telles que Anthropic nu `An unknown error occurred`, OpenRouter nu
    `Provider returned error`, les erreurs de raison d'arrêt comme `Unhandled stop reason:
    error`, JSON `api_error` avec des textes de serveur transitoires
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` comme signaux
    de dépassement de délai/surcharge justifiant un basculement lorsque le contexte du fournisseur
    correspond.
    Le texte de secours interne générique comme `LLM request failed with an unknown
    error.` reste conservateur et ne déclenche pas par lui-même le modèle de secours.

  </Accordion>

  <Accordion title='Que signifie « No credentials found for profile anthropic:default » ?'>
    Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver d'identifiants correspondants dans le magasin d'authentification attendu.

    **Liste de vérification pour la correction :**

    - **Confirmer l'emplacement des profils d'authentification** (nouveaux chemins vs anciens chemins)
      - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Ancien (Legacy) : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
    - **Confirmer que votre env var est chargée par le Gateway**
      - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais que vous exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-le dans `~/.openclaw/.env` ou activez `env.shellEnv`.
    - **Assurez-vous de modifier l'agent correct**
      - Les configurations multi-agents impliquent qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
    - **Vérification rapide du statut du modèle/de l'authentification**
      - Utilisez `openclaw models status` pour voir les modèles configurés et si les fournisseurs sont authentifiés.

    **Liste de vérification pour « No credentials found for profile anthropic »**

    Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que le Gateway
    ne peut pas le trouver dans son magasin d'authentification.

    - **Utiliser le Claude CLI**
      - Exécutez `openclaw models auth login --provider anthropic --method cli --set-default` sur l'hôte de la passerelle.
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
    Si votre configuration de modèle inclut Google Gemini comme solution de repli (ou si vous avez passé à un raccourci Gemini), OpenClaw essaiera de l'utiliser lors du repli de modèle. Si vous n'avez pas configuré d'identifiants Google, vous verrez `No API key found for provider "google"`.

    Solution : fournissez soit l'authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias afin que le repli ne soit pas acheminé vers cet endroit.

    **Requête LLM rejetée : signature de réflexion requise (Google Antigravity)**

    Cause : l'historique de la session contient des **blocs de réflexion sans signatures** (souvent issus d'un flux interrompu/partiel). Google Antigravity nécessite des signatures pour les blocs de réflexion.

    Solution : OpenClaw supprime désormais les blocs de réflexion non signés pour Google Antigravity Claude. Si le problème persiste, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

  </Accordion>
</AccordionGroup>

## Profils d'authentification : ce qu'ils sont et comment les gérer

Connexe : [/concepts/oauth](/fr/concepts/oauth) (flux OAuth, stockage des jetons, modèles multi-comptes)

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'un profil d'authentification ?">
    Un profil d'authentification est un enregistrement d'identifiants nommé (OAuth ou clé API) lié à un fournisseur. Les profils résident dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="Quels sont les ID de profil typiques ?">
    OpenClaw utilise des ID préfixés par le fournisseur, tels que :

    - `anthropic:default` (courant lorsqu'aucune identité d'e-mail n'existe)
    - `anthropic:<email>` pour les identités OAuth
    - des ID personnalisés de votre choix (par exemple `anthropic:work`)

  </Accordion>

  <Accordion title="Puis-je contrôler quel profil d'authentification est essayé en premier ?">
    Oui. La configuration prend en charge les métadonnées optionnelles pour les profils et un ordre par fournisseur (`auth.order.<provider>`). Cela ne stocke **pas** de secrets ; il mappe les ID au fournisseur/mode et définit l'ordre de rotation.

    OpenClaw peut temporairement ignorer un profil s'il est dans un court **refroidissement** (limites de délai/délais d'attente/échecs d'authentification) ou un état plus long **désactivé** (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

    Les temps de recharge pour les limites de débit peuvent être limités au modèle. Un profil qui est en cours de recharge
    pour un modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur,
    tandis que les fenêtres de facturation/désactivation bloquent toujours tout le profil.

    Vous pouvez également définir une priorité d'ordre **par agent** (stockée dans le `auth-state.json` de cet agent) via le CLI :

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

    Pour vérifier ce qui sera réellement essayé, utilisez :

    ```bash
    openclaw models status --probe
    ```

    Si un profil stocké est omis de l'ordre explicite, la sonde signale
    `excluded_by_auth_order` pour ce profil au lieu de l'essayer en silence.

  </Accordion>

  <Accordion title="OAuth vs clé API - quelle est la différence ?">
    OpenClaw prend en charge les deux :

    - **OAuth** utilise souvent l'accès par abonnement (le cas échéant).
    - Les **clés API** utilisent la facturation par jeton.

    L'assistant prend explicitement en charge le Anthropic Claude CLI, le OpenAI Codex OAuth et les clés API.

  </Accordion>
</AccordionGroup>

## Gateway : ports, « déjà en cours d'exécution » et mode distant

<AccordionGroup>
  <Accordion title="Quel port le Gateway utilise-t-il ?">
    `gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (IU de contrôle, crochets, etc.).

    Priorité :

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle openclaw indique-t-il "Runtime : running" mais "RPC probe : failed" ?'>
    Parce que "running" est la vue du **superviseur** (launchd/systemd/schtasks). La sonde RPC correspond à la RPC se connectant réellement au WebSocket de la passerelle et appelant `status`.

    Utilisez `openclaw gateway status` et faites confiance à ces lignes :

    - `Probe target:` (l'URL réellement utilisée par la sonde)
    - `Listening:` (ce qui est réellement lié au port)
    - `Last gateway error:` (cause racine fréquente lorsque le processus est actif mais que le port n'écoute pas)

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle openclaw affiche-t-il "Config (cli)" et "Config (service)" différents ?'>
    Vous modifiez un fichier de configuration alors que le service en utilise un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

    Correction :

    ```bash
    openclaw gateway install --force
    ```

    Exécutez cela à partir du même `--profile` / environnement que celui que vous souhaitez que le service utilise.

  </Accordion>

  <Accordion title='Que signifie "another gateway instance is already listening" ?'>
    OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il lance `GatewayLockError` indiquant qu'une autre instance écoute déjà.

    Correction : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway située ailleurs) ?">
    Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, éventuellement avec des identifiants distants de secret partagé :

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

    - `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou si vous transmettez l'indicateur de substitution).
    - L'application macOS surveille le fichier de configuration et change de mode en direct lorsque ces valeurs changent.
    - `gateway.remote.token` / `.password` sont des identifiants distants côté client uniquement ; ils n'activent pas par eux-mêmes l'authentification de la passerelle locale.

  </Accordion>

  <Accordion title='L'interface de contrôle indique « non autorisé » (ou continue de se reconnecter). Que faire ?'>
    Le chemin d'authentification de votre passerelle et la méthode d'authentification de l'interface ne correspondent pas.

    Faits (tirés du code) :

    - L'interface de contrôle conserve le jeton dans `sessionStorage` pour l'onglet de navigateur actuel et l'URL de la passerelle sélectionnée, afin que les actualisations du même onglet continuent de fonctionner sans restaurer la persistance à long terme du jeton localStorage.
    - Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de réessai (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Cette nouvelle tentative avec jeton mis en cache réutilise désormais les étendues approuvées enregistrées avec le jeton de l'appareil. Les appelants avec `deviceToken` explicite / `scopes` explicite conservent toujours leur ensemble d'étendues demandées au lieu d'hériter des étendues mises en cache.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Les vérifications de l'étendue du jeton d'amorçage sont préfixées par rôle. La liste blanche de l'opérateur d'amorçage intégré ne satisfait que les demandes de l'opérateur ; les nœuds ou autres rôles non-opérateurs ont toujours besoin d'étendues sous leur propre préfixe de rôle.

    Correctif :

    - Le plus rapide : `openclaw dashboard` (imprime + copie l'URL du tableau de bord, essaie de l'ouvrir ; affiche un indice SSH sans interface graphique).
    - Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
    - Si distant, créez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
    - Mode secret partagé : définissez `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ou `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, puis collez le secret correspondant dans les paramètres de l'interface de contrôle.
    - Mode Tailscale Serve : assurez-vous que `gateway.auth.allowTailscale` est activé et que vous ouvrez l'URL de Serve, et non une URL de bouclage/tailnet brute qui contourne les en-têtes d'identité Tailscale.
    - Mode proxy de confiance : assurez-vous que vous passez par le proxy conscient de l'identité non-bouclage configuré, et non par un proxy de bouclage sur le même hôte ou l'URL brute de la passerelle.
    - Si la discordance persiste après la nouvelle tentative, faites pivoter/réapprouvez le jeton de l'appareil couplé :
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si cet appel de rotation indique qu'il a été refusé, vérifiez deux choses :
      - les sessions d'appareils couplés ne peuvent faire pivoter que leur **propre** appareil sauf s'ils ont également `operator.admin`
      - les valeurs `--scope` explicites ne peuvent pas dépasser les étendues d'opérateur actuelles de l'appelant
    - Toujours bloqué ? Exécutez `openclaw status --all` et suivez le [Dépannage](/fr/gateway/troubleshooting). Consultez le [Tableau de bord](/fr/web/dashboard) pour les détails d'authentification.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind picks a Tailscale IP from your network interfaces (100.64.0.0/10). If the machine isn't on Tailscale (or the interface is down), there's nothing to bind to.

    Fix:

    - Start Tailscale on that host (so it has a 100.x address), or
    - Switch to `gateway.bind: "loopback"` / `"lan"`.

    Note: `tailnet` is explicit. `auto` prefers loopback; use `gateway.bind: "tailnet"` when you want a tailnet-only bind.

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    Usually no - one Gateway can run multiple messaging channels and agents. Use multiple Gateways only when you need redundancy (ex: rescue bot) or hard isolation.

    Yes, but you must isolate:

    - `OPENCLAW_CONFIG_PATH` (per-instance config)
    - `OPENCLAW_STATE_DIR` (per-instance state)
    - `agents.defaults.workspace` (workspace isolation)
    - `gateway.port` (unique ports)

    Quick setup (recommended):

    - Use `openclaw --profile <name> ...` per instance (auto-creates `~/.openclaw-<name>`).
    - Set a unique `gateway.port` in each profile config (or pass `--port` for manual runs).
    - Install a per-profile service: `openclaw --profile <name> gateway install`.

    Profiles also suffix service names (`ai.openclaw.<profile>`; legacy `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Full guide: [Multiple gateways](/fr/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='Que signifie « handshake invalide » / code 1008 ?'>
    Le Gateway est un **serveur WebSocket**, et il s'attend à ce que le tout premier message soit
    une trame `connect`. S'il reçoit autre chose, il ferme la connexion
    avec le **code 1008** (violation de politique).

    Causes courantes :

    - Vous avez ouvert l'URL **HTTP** dans un navigateur (`http://...`) au lieu d'un client WS.
    - Vous avez utilisé le mauvais port ou chemin.
    - Un proxy ou un tunnel a supprimé les en-têtes d'authentification ou a envoyé une requête non-Gateway.

    Corrections rapides :

    1. Utilisez l'URL WS : `ws://<host>:18789` (ou `wss://...` si HTTPS).
    2. N'ouvrez pas le port WS dans un onglet de navigateur normal.
    3. Si l'authentification est activée, incluez le jeton/mot de passe dans la trame `connect`.

    Si vous utilisez la CLI ou la TUI, l'URL devrait ressembler à :

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Détails du protocole : [Protocole Gateway](/fr/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Journalisation et débogage

<AccordionGroup>
  <Accordion title="Où se trouvent les journaux ?">
    Journaux de fichiers (structurés) :

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation fichier est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

    Affichage le plus rapide des journaux :

    ```bash
    openclaw logs --follow
    ```

    Journaux de service/superviseur (lorsque la passerelle s'exécute via launchd/systemd) :

    - macOS : `$OPENCLAW_STATE_DIR/logs/gateway.log` et `gateway.err.log` (par défaut : `~/.openclaw/logs/...` ; les profils utilisent `~/.openclaw-<profile>/logs/...`)
    - Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Voir [Dépannage](/fr/gateway/troubleshooting) pour plus d'informations.

  </Accordion>

  <Accordion title="Comment démarrer/arrêter/redémarrer le service Gateway ?">
    Utilisez les assistants de passerelle :

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous exécutez la passerelle manuellement, `openclaw gateway --force` peut récupérer le port. Voir [Gateway](/fr/gateway).

  </Accordion>

  <Accordion title="J'ai fermé mon terminal sous Windows - comment redémarrer OpenClaw ?">
    Il existe **deux modes d'installation Windows** :

    **1) WSL2 (recommandé) :** le Gateway s'exécute à l'intérieur de Linux.

    Ouvrez PowerShell, entrez dans WSL, puis redémarrez :

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous n'avez jamais installé le service, lancez-le au premier plan :

    ```bash
    openclaw gateway run
    ```

    **2) Windows natif (non recommandé) :** le Gateway s'exécute directement sous Windows.

    Ouvrez PowerShell et exécutez :

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous l'exécutez manuellement (sans service), utilisez :

    ```powershell
    openclaw gateway run
    ```

    Docs : [Windows (WSL2)](/fr/platforms/windows), [Guide de service du Gateway](/fr/gateway).

  </Accordion>

  <Accordion title="Le Gateway est opérationnel mais les réponses n'arrivent jamais. Que dois-je vérifier ?">
    Commencez par un contrôle de santé rapide :

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causes courantes :

    - Authentification du modèle non chargée sur l'**hôte du gateway** (vérifiez `models status`).
    - Canal appairage/allowlist bloquant les réponses (vérifiez la config du canal + les logs).
    - WebChat/Dashboard est ouvert sans le bon jeton.

    Si vous êtes à distance, confirmez que la connexion tunnel/Tailscale est active et que le
    WebSocket du Gateway est accessible.

    Docs : [Canaux](/fr/channels), [Dépannage](/fr/gateway/troubleshooting), [Accès à distance](/fr/gateway/remote).

  </Accordion>

  <Accordion title='"Déconnecté du gateway : aucune raison" - et maintenant ?'>
    Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

    1. Le Gateway est-il en cours d'exécution ? `openclaw gateway status`
    2. Le Gateway est-il en bonne santé ? `openclaw status`
    3. L'interface utilisateur possède-t-elle le bon jeton ? `openclaw dashboard`
    4. Si distant, le lien tunnel/Tailscale est-il actif ?

    Ensuite, consultez les logs :

    ```bash
    openclaw logs --follow
    ```

    Docs : [Tableau de bord](/fr/web/dashboard), [Accès à distance](/fr/gateway/remote), [Dépannage](/fr/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Le setMyCommands Telegram échoue. Que dois-je vérifier ?">
    Commencez par les journaux et le statut du channel :

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Ensuite, identifiez l'erreur :

    - `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà au maximum autorisé par Telegram et réessaie avec moins de commandes, mais certaines entrées de menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou des erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

    Si le Gateway est distant, assurez-vous de consulter les journaux sur l'hôte du Gateway.

    Docs : [Telegram](/fr/channels/telegram), [Channel troubleshooting](/fr/channels/troubleshooting).

  </Accordion>

  <Accordion title="Le TUI n'affiche aucune sortie. Que dois-je vérifier ?">
    Confirmez d'abord que le Gateway est accessible et que l'agent peut s'exécuter :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    Dans le TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un channel
    de chat, assurez-vous que la livraison est activée (`/deliver on`).

    Docs : [TUI](/fr/web/tui), [Slash commands](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Comment arrêter complètement puis redémarrer le Gateway ?">
    Si vous avez installé le service :

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Cela arrête/démarre le **service supervisé** (launchd sur macOS, systemd sur Linux).
    Utilisez ceci lorsque le Gateway s'exécute en arrière-plan en tant que démon.

    Si vous l'exécutez au premier plan, arrêtez avec Ctrl-C, puis :

    ```bash
    openclaw gateway run
    ```

    Docs : [Gateway service runbook](/fr/gateway).

  </Accordion>

  <Accordion title="ELI5 : redémarrage de la passerelle OpenClaw vs passerelle OpenClaw">
    - `openclaw gateway restart` : redémarre le **service en arrière-plan** (launchd/systemd).
    - `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

    Si vous avez installé le service, utilisez les commandes de la passerelle. Utilisez `openclaw gateway` lorsque
    vous souhaitez une exécution unique au premier plan.

  </Accordion>

  <Accordion title="Moyen le plus rapide d'obtenir plus de détails en cas d'échec">
    Démarrez la Gateway avec `--verbose` pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de channel, le routage de model et les erreurs RPC.
  </Accordion>
</AccordionGroup>

## Médias et pièces jointes

<AccordionGroup>
  <Accordion title="Ma compétence a généré une image/PDF, mais rien n'a été envoyé">
    Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir [Configuration de l'assistant OpenClaw](/fr/start/openclaw) et [Envoi par l'agent](/fr/tools/agent-send).

    Envoi CLI :

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    Vérifiez également :

    - Le channel cible prend en charge les médias sortants et n'est pas bloqué par des listes d'autorisation.
    - Le fichier est dans les limites de taille du fournisseur (les images sont redimensionnées à un maximum de 2048px).
    - `tools.fs.workspaceOnly=true` limite les envois de chemin local à l'espace de travail, au magasin temp/media et aux fichiers validés par le bac à sable.
    - `tools.fs.workspaceOnly=false` permet à `MEDIA:` d'envoyer des fichiers locaux d'hôte que l'agent peut déjà lire, mais uniquement pour les médias et les types de documents sécurisés (images, audio, vidéo, PDF et documents Office). Les fichiers en texte brut et de type secret sont toujours bloqués.

    Voir [Images](/fr/nodes/images).

  </Accordion>
</AccordionGroup>

## Sécurité et contrôle d'accès

<AccordionGroup>
  <Accordion title="Est-il sécurisé d'exposer OpenClaw aux DM entrants ?">
    Traitez les DM entrants comme une entrée non fiable. Les valeurs par défaut sont conçues pour réduire les risques :

    - Le comportement par défaut sur les canaux compatibles DM est le **jumelage** (pairing) :
      - Les expéditeurs inconnus reçoivent un code de jumelage ; le bot ne traite pas leur message.
      - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Les demandes en attente sont limitées à **3 par canal** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
    - L'ouverture des DM publiquement nécessite une acceptation explicite (`dmPolicy: "open"` et liste autorisée `"*"`).

    Exécutez `openclaw doctor` pour révéler les politiques de DM risquées.

  </Accordion>

  <Accordion title="L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?">
    Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut envoyer un DM au bot.
    Si votre assistant lit du contenu externe (recherche Web/récupération, pages de navigateur, e-mails,
    documents, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
    de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

    Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé et
    exfiltrer du contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

    - utilisant un agent "lecteur" en lecture seule ou sans outils pour résumer le contenu non fiable
    - gardant `web_search` / `web_fetch` / `browser` désactivé pour les agents avec outils
    - traitant le texte des fichiers/documents décodés comme non fiable aussi : OpenResponses
      `input_file` et l'extraction de pièces jointes multimédias encapsulent tous deux le texte extrait dans
      des marqueurs de limite de contenu externe explicites au lieu de transmettre le texte brut du fichier
    - utilisant le sandboxing et des listes autorisées d'outils strictes

    Détails : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Mon bot doit-il avoir sa propre adresse e-mail, compte GitHub ou numéro de téléphone ?">
    Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone distincts
    réduit l'impact en cas de problème. Cela facilite également la rotation des
    identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

    Commencez modestement. Donnez l'accès uniquement aux outils et comptes dont vous avez réellement besoin, et étendez
    par la suite si nécessaire.

    Documentation : [Sécurité](/fr/gateway/security), [Appairage](/fr/channels/pairing).

  </Accordion>

  <Accordion title="Puis-je lui donner une autonomie sur mes SMS et est-ce sûr ?">
    Nous ne recommandons **pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

    - Garder les DMs en **mode d'appairage** ou sur une liste blanche stricte.
    - Utiliser un **numéro ou compte distinct** si vous souhaitez qu'il envoie des messages en votre nom.
    - Laissez-le rédiger, puis **approuvez avant l'envoi**.

    Si vous souhaitez expérimenter, faites-le sur un compte dédié et gardez-le isolé. Voir
    [Sécurité](/fr/gateway/security).

  </Accordion>

<Accordion title="Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?">
  Oui, **si** l'agent est uniquement conversationnel et que l'entrée est fiable. Les niveaux inférieurs sont plus sensibles au détournement d'instructions, évitez-les donc pour les agents avec outils ou lors de la lecture de contenu non fiable. Si vous devez utiliser un modèle plus petit, verrouillez les outils et exécutez-le dans un bac à sable (sandbox). Voir [Sécurité](/fr/gateway/security).
</Accordion>

  <Accordion title="J'ai exécuté /start sur Telegram mais je n'ai pas reçu de code d'appairage">
    Les codes d'appairage sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et
    que `dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

    Vérifiez les demandes en attente :

    ```bash
    openclaw pairing list telegram
    ```

    Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste blanche ou définissez `dmPolicy: "open"`
    pour ce compte.

  </Accordion>

  <Accordion title="WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?">
    Non. La stratégie par défaut pour les DM WhatsApp est l'**appariement** (pairing). Les expéditeurs inconnus reçoivent uniquement un code d'appariement et leur message n'est **pas traité**. OpenClaw ne répond qu'aux conversations qu'il reçoit ou aux envois explicites que vous déclenchez.

    Approuver l'appariement avec :

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lister les demandes en attente :

    ```bash
    openclaw pairing list whatsapp
    ```

    Invite du numéro de téléphone dans l'assistant : elle est utilisée pour définir votre **allowlist/owner** afin que vos propres DM soient autorisés. Elle n'est pas utilisée pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Commandes de chat, annulation de tâches et "ça ne s'arrête pas"

<AccordionGroup>
  <Accordion title="Comment empêcher l'affichage des messages système internes dans le chat ?">
    La plupart des messages internes ou de %%PH:GLOSSARY:1:tool%% n'apparaissent que lorsque **verbose**, **trace** ou **reasoning** est activé
    pour cette %%PH:GLOSSARY:0:session%%.

    Correction dans le chat où vous le voyez :

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    Si c'est encore trop bruyant, vérifiez les paramètres de la session dans l'interface de contrôle et définissez verbose
    à **inherit**. Confirmez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
    à `on` dans la configuration.

    Documentation : [Thinking and verbose](/fr/tools/thinking), [Security](/fr/gateway/security#reasoning-verbose-output-in-groups).

  </Accordion>

  <Accordion title="Comment arrêter/annuler une tâche en cours ?">
    Envoyez l'un de ces éléments **comme un message autonome** (sans slash) :

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

    Ce sont des déclencheurs d'abandon (pas des commandes slash).

    Pour les processus d'arrière-plan (depuis l'outil exec), vous pouvez demander à l'agent d'exécuter :

    ```
    process action:kill sessionId:XXX
    ```

    Aperçu des commandes slash : voir [Slash commands](/fr/tools/slash-commands).

    La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs sur la liste d'autorisation.

  </Accordion>

  <Accordion title='Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")'>
    OpenClaw bloque la messagerie **fournisseurs croisés** par défaut. Si un appel d'outil est lié
    à Telegram, il n'enverra pas à Discord à moins que vous ne l'autorisiez explicitement.

    Activez la messagerie fournisseurs croisés pour l'agent :

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
    - `followup` - exécuter les messages un par un
    - `collect` - regrouper les messages et répondre une fois (par défaut)
    - `steer-backlog` - orienter maintenant, puis traiter l'arriéré
    - `interrupt` - abandonner l'exécution actuelle et recommencer

    Vous pouvez ajouter des options comme `debounce:2s cap:25 drop:summarize` pour les modes de suivi.

  </Accordion>
</AccordionGroup>

## Divers

<AccordionGroup>
  <Accordion title="Quel est le modèle par défaut pour Anthropic avec une clé API ?">
    Dans OpenClaw, les identifiants et la sélection du modèle sont distincts. Définir `ANTHROPIC_API_KEY` (ou stocker une clé API Anthropic dans les profils d'authentification) active l'authentification, mais le modèle par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-6` ou `anthropic/claude-opus-4-6`). Si vous voyez `No
    credentials found for profile "anthropic:default"`, cela signifie que la passerelle n'a pas pu trouver les identifiants Anthropic dans les `auth-profiles.json` attendus pour l'agent en cours d'exécution.
  </Accordion>
</AccordionGroup>

---

Toujours bloqué ? Demandez sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).
