---
summary: "Questions fréquentes sur la configuration, l'installation et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

# FAQ

Réponses rapides et dépannage approfondi pour des configurations réelles (développement local, VPS, multi-agent, clés OAuth/API, basculement de modèle). Pour les diagnostics d'exécution, voir [Dépannage](/en/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/en/gateway/configuration).

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

   Exécute une sonde de santé de la passerelle en direct, y compris les sondes de canal lorsque prises en charge
   (nécessite une passerelle accessible). Voir [Santé](/en/gateway/health).

5. **Suivre le dernier journal**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Journalisation](/en/logging) et [Dépannage](/en/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la configuration/l'état + exécute des vérifications de santé. Voir [Doctor](/en/gateway/doctor).

7. **Snapshot Gateway**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en cours d'exécution une capture instantanée complète (WS uniquement). Voir [Santé](/en/gateway/health).

## Quick start et configuration au premier lancement

<AccordionGroup>
  <Accordion title="Je suis bloqué, moyen le plus rapide de get unstuck">
    Utilisez un agent IA local qui peut **voir votre machine**. C'est beaucoup plus efficace que de demander
    sur Discord, car la plupart des cas « Je suis bloqué » sont des **problèmes de configuration locale ou d'environnement** que
    les aides à distance ne peuvent pas inspecter.

    - **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

    Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
    au niveau de la machine (PATH, services, permissions, fichiers d'auth). Donnez-leur le **checkout complet des sources** via
    l'installation hackable (git) :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela installe OpenClaw **à partir d'un git checkout**, afin que l'agent puisse lire le code + la documentation et
    raisonner sur la version exacte que vous exécutez. Vous pouvez toujours revenir à la version stable plus tard
    en réexécutant l'installateur sans `--install-method git`.

    Astuce : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis d'exécuter uniquement les
    commandes nécessaires. Cela permet de garder les modifications limitées et plus faciles à auditer.

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

    - `openclaw status` : aperçu rapide de l'état de la passerelle/de l'agent + configuration de base.
    - `openclaw models status` : vérifie l'auth du fournisseur + la disponibilité du model.
    - `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

    Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Boucle de débogage rapide : [First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken).
    Docs d'installation : [Install](/en/install), [Installer flags](/en/install/installer), [Updating](/en/install/updating).

  </Accordion>

  <Accordion title="Le heartbeat continue de sauter. Que signifient les raisons de l'omission ?">
    Raisons courantes de l'omission du heartbeat :

    - `quiet-hours`: en dehors de la fenêtre active-hours configurée
    - `empty-heartbeat-file`: `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou avec uniquement des en-têtes
    - `no-tasks-due`: le mode de tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâche n'est encore prévu
    - `alerts-disabled`: toute la visibilité du heartbeat est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés)

    En mode tâche, les horodatés d'échéance ne sont avancés qu'après l'exécution réelle d'un heartbeat.
    Les exécutions ignorées ne marquent pas les tâches comme terminées.

    Docs : [Heartbeat](/en/gateway/heartbeat), [Automation & Tasks](/en/automation).

  </Accordion>

  <Accordion title="Méthode recommandée pour installer et configurer OpenClaw">
    Le dépôt recommande de l'exécuter à partir des sources et d'utiliser l'onboarding :

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    L'assistant peut également construire automatiquement les actifs de l'interface utilisateur. Après l'onboarding, vous exécutez généralement le Gateway sur le port **18789**.

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

  <Accordion title="Comment authentifier le tableau de bord sur localhost vs distant ?">
    **Localhost (même machine) :**

    - Ouvrez `http://127.0.0.1:18789/`.
    - Si un secret partagé est demandé, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle.
    - Source du jeton : `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`).
    - Source du mot de passe : `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aucun secret partagé n'est encore configuré, générez un jeton avec `openclaw doctor --generate-gateway-token`.

    **Pas sur localhost :**

    - **Tailscale Serve** (recommandé) : gardez la liaison loopback, lancez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface de contrôle/WebSocket (pas de secret partagé collé, suppose un hôte de passerée de confiance) ; les API HTTP nécessitent toujours une authentification par secret partagé, sauf si vous utilisez délibérément `none` private-ingress ou l'authentification HTTP trusted-proxy.
      Les mauvaises tentatives d'authentification Serve simultanées du même client sont sérialisées avant que le limiteur d'échec d'authentification ne les enregistre, la deuxième mauvaise tentative peut donc déjà afficher `retry later`.
    - **Tailnet bind** : lancez `openclaw gateway --bind tailnet --token "<token>"` (ou configurez l'authentification par mot de passe), ouvrez `http://<tailscale-ip>:18789/`, puis collez le secret partagé correspondant dans les paramètres du tableau de bord.
    - **Proxy inverse conscient de l'identité** : gardez la Gateway derrière un proxy de confiance non-loopback, configurez `gateway.auth.mode: "trusted-proxy"`, puis ouvrez l'URL du proxy.
    - **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`. L'authentification par secret partagé s'applique toujours via le tunnel ; collez le jeton ou le mot de passe configuré si demandé.

    Voir [Tableau de bord](/en/web/dashboard) et [Surfaces Web](/en/web) pour les modes de liaison et les détails d'authentification.

  </Accordion>

  <Accordion title="Pourquoi y a-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?">
    Elles contrôlent différentes couches :

    - `approvals.exec` : transfère les demandes d'approbation vers les destinations de chat
    - `channels.<channel>.execApprovals` : fait agir ce channel comme un client d'approbation natif pour les approbations d'exécution

    La stratégie d'exécution de l'hôte reste toujours la véritable porte d'approbation. La configuration du chat contrôle uniquement l'endroit où apparaissent les demandes d'approbation et la manière dont les personnes peuvent y répondre.

    Dans la plupart des configurations, vous n'avez **pas** besoin des deux :

    - Si le chat prend déjà en charge les commandes et les réponses, `/approve` dans le même chat fonctionne via le chemin partagé.
    - Si un channel natif pris en charge peut déduir en toute sécurité les approbateurs, OpenClaw active désormais automatiquement les approbations natives DM en priorité lorsque `channels.<channel>.execApprovals.enabled` est non défini ou `"auto"`.
    - Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal ; l'agent ne doit inclure une commande manuelle `/approve` que si le résultat du tool indique que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    - Utilisez `approvals.exec` uniquement lorsque les demandes doivent également être transférées vers d'autres chats ou des salles d'ops explicites.
    - Utilisez `channels.<channel>.execApprovals.target: "channel"` ou `"both"` uniquement lorsque vous voulez explicitement que les demandes d'approbation soient renvoyées dans la salle/sujet d'origine.
    - Les approbations de plugin sont à nouveau séparées : elles utilisent `/approve` dans le même chat par défaut, un transfert `approvals.plugin` facultatif, et seuls certains canaux natifs conservent le traitement natif des approbations de plugin par-dessus.

    Version courte : le transfert sert au routage, la configuration du client natif sert à une expérience utilisateur spécifique au channel plus riche.
    Voir [Exec Approvals](/en/tools/exec-approvals).

  </Accordion>

  <Accordion title="De quel runtime ai-je besoin ?">
    Node **>= 22** est requis. `pnpm` est recommandé. Bun n'est **pas recommandé** pour le Gateway.
  </Accordion>

  <Accordion title="Est-ce que cela fonctionne sur Raspberry Pi ?">
    Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
    d'espace disque suffisent pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

    Si vous souhaitez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
    pas un minimum absolu.

    Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur/téléphone pour
    un écran/caméra/toile local ou une exécution de commande. Voir [Nodes](/en/nodes).

  </Accordion>

  <Accordion title="Des conseils pour l'installation sur Raspberry Pi ?">
    Version courte : cela fonctionne, mais attendez-vous à des rugosités.

    - Utilisez un OS **64 bits** et gardez Node >= 22.
    - Privilégiez l'**installation hackable (git)** afin de pouvoir voir les journaux et mettre à jour rapidement.
    - Commencez sans canaux/skills, puis ajoutez-les un par un.
    - Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

    Docs : [Linux](/en/platforms/linux), [Install](/en/install).

  </Accordion>

  <Accordion title="C'est bloqué sur wake up my friend / l'onboarding ne démarrera pas. Et maintenant ?">
    Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
    "Wake up, my friend!" automatiquement lors du premier démarrage. Si vous voyez cette ligne avec **sans réponse**
    et que les jetons restent à 0, l'agent ne s'est jamais exécuté.

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
    pointe vers le bon Gateway. Voir [Remote access](/en/gateway/remote).

  </Accordion>

  <Accordion title="Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'intégration ?">
    Oui. Copiez le **répertoire d'état** et l'**espace de travail**, puis exécutez Doctor une fois. Cela
    permet à votre bot de rester "exactement le même" (mémoire, historique des sessions, authentification et état du
    channel) tant que vous copiez **les deux** emplacements :

    1. Installez OpenClaw sur la nouvelle machine.
    2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
    3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
    4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

    Cela préserve la configuration, les profils d'authentification, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
    mode distant, rappelez-vous que l'hôte de la passerelle possède le stockage des sessions et l'espace de travail.

    **Important :** si vous ne faites que valider/pousser votre espace de travail vers GitHub, vous sauvegardez
    la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ni l'authentification. Ceux-ci se trouvent
    sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

    Connexes : [Migration](/en/install/migrating), [Où les choses se trouvent sur le disque](#where-things-live-on-disk),
    [Espace de travail de l'agent](/en/concepts/agent-workspace), [Doctor](/en/gateway/doctor),
    [Mode distant](/en/gateway/remote).

  </Accordion>

  <Accordion title="Où puis-voir ce qu'il y a de neuf dans la dernière version ?">
    Consultez le journal des modifications GitHub :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Les entrées les plus récentes sont en haut. Si la section du haut est marquée **Unreleased**, la prochaine section datée
    est la dernière version publiée. Les entrées sont regroupées par **Points forts**, **Modifications** et
    **Corrections** (plus les sections docs/autres si nécessaire).

  </Accordion>

  <Accordion title="Impossible d'accéder à docs.openclaw.ai (erreur SSL)">
    Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via Xfinity
    Advanced Security. Désactivez-le ou mettez `docs.openclaw.ai` sur la liste autorisée, puis réessayez.
    S'il vous plaît, aidez-nous à débloquer le site en signalant le problème ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si vous ne pouvez toujours pas atteindre le site, la documentation est mise en miroir sur GitHub :
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Différence entre stable et beta">
    **Stable** et **beta** sont des **npm dist-tags**, pas des lignes de code distinctes :

    - `latest` = stable
    - `beta` = version anticipée pour les tests

    Habituellement, une version stable arrive d'abord sur **beta**, puis une étape de promotion explicite déplace cette même version vers `latest`. Les mainteneurs peuvent également publier directement sur `latest` si nécessaire. C'est pourquoi beta et stable peuvent pointer vers la **même version** après la promotion.

    Voir ce qui a changé :
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Pour les commandes d'installation en une ligne et la différence entre beta et dev, voir l'accordéon ci-dessous.

  </Accordion>

  <Accordion title="Comment installer la version bêta et quelle est la différence entre bêta et dev ?">
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

    Plus de détails : [Canaux de développement](/en/install/development-channels) et [Options de l'installeur](/en/install/installer).

  </Accordion>

  <Accordion title="Comment essayer les dernières fonctionnalités ?">
    Deux options :

    1. **Canal Dev (git checkout) :**

    ```bash
    openclaw update --channel dev
    ```

    Cela bascule vers la branche `main` et met à jour à partir de la source.

    2. **Installation modifiable (à partir du site de l'installeur) :**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

    Si vous préférez faire manuellement un clone propre, utilisez :

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Documentation : [Mise à jour](/en/cli/update), [Canaux de développement](/en/install/development-channels),
    [Installation](/en/install).

  </Accordion>

  <Accordion title="Combien de temps prennent généralement l'installation et la prise en main ?">
    Guide approximatif :

    - **Installation :** 2-5 minutes
    - **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

    Si cela bloque, utilisez [Installer bloqué](#quick-start-and-first-run-setup)
    et la boucle de débogage rapide dans [Je suis bloqué](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="L'installateur est bloqué ? Comment obtenir plus de retours ?">
    Relancez l'installateur avec une **sortie verbeuse** :

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

    Équivalent Windows (PowerShell) :

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    Plus d'options : [Flags de l'installateur](/en/install/installer).

  </Accordion>

  <Accordion title="L'installation Windows indique que git est introuvable ou que openclaw n'est pas reconnu">
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
    Documentation : [Windows](/en/platforms/windows).

  </Accordion>

  <Accordion title="La sortie exec Windows affiche du texte chinois illisible - que dois-je faire ?">
    Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells natifs Windows.

    Symptômes :

    - `system.run`/`exec` la sortie affiche le chinois sous forme de caractères illisibles
    - La même commande s'affiche correctement dans un autre profil de terminal

    Solution rapide dans PowerShell :

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Redémarrez ensuite la Windows et réessayez votre commande :

    ```powershell
    openclaw gateway restart
    ```

    Si vous reproduisez toujours ce problème sur la dernière version d'Gateway, suivez ou signalez-le ici :

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?">
    Utilisez l'**installation hackable (git)** afin d'avoir la source et la documentation complètes en local, puis demandez
    à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre précisément.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Plus de détails : [Install](/en/install) et [Installer flags](/en/install/installer).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur Linux ?">
    Réponse courte : suivez le guide Linux, puis exécutez l'onboarding.

    - Chemin rapide Linux + installation du service : [Linux](/en/platforms/linux).
    - Guide complet : [Getting Started](/en/start/getting-started).
    - Installateur + mises à jour : [Install & updates](/en/install/updating).

  </Accordion>

  <Accordion title="Comment installer OpenClaw sur un VPS ?">
    N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour atteindre la Gateway.

    Guides : [exe.dev](/en/install/exe-dev), [Hetzner](/en/install/hetzner), [Fly.io](/en/install/fly).
    Accès distant : [Gateway remote](/en/gateway/remote).

  </Accordion>

  <Accordion title="Où se trouvent les guides d'installation pour le cloud/VPS ?">
    Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

    - [Hébergement VPS](/en/vps) (tous les fournisseurs au même endroit)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    Fonctionnement dans le cloud : la **Gateway tourne sur le serveur**, et vous y accédez
    depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + espace de travail
    résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

    Vous pouvez associer des **nœuds** (Mac/iOS/Android/headless) à cette Gateway cloud pour accéder
    à l'écran/caméra/toile local ou exécuter des commandes sur votre ordinateur tout en gardant la
    Gateway dans le cloud.

    Hub : [Plateformes](/en/platforms). Accès distant : [Gateway distant](/en/gateway/remote).
    Nœuds : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je demander à OpenClaw de se mettre à jour lui-même ?">
    Réponse courte : **possible, non recommandé**. Le processus de mise à jour peut redémarrer la
    Gateway (ce qui coupe la session active), peut nécessiter un git checkout propre et
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

    Documentation : [Mise à jour](/en/cli/update), [Mises à jour](/en/install/updating).

  </Accordion>

  <Accordion title="Que fait réellement l'onboarding ?">
    `openclaw onboard` est le chemin d'installation recommandé. En **mode local**, il vous guide à travers :

    - **Configuration du modèle/de l'auth** (OAuth du provider, clés API, jeton de configuration hérité OAuth, ainsi que les options de modèle local telles que LM Studio)
    - Emplacement de l'**espace de travail** + fichiers d'amorçage
    - Paramètres du **API** (bind/port/auth/tailscale)
    - **Canaux** (Anthropic, Gateway, WhatsApp, Telegram, Discord, Mattermost, ainsi que les plugins de canal groupés comme QQ Bot)
    - **Installation du démon** (LaunchAgent sur Signal ; unité utilisateur systemd sur iMessage/macOS)
    - **Contrôles de santé** et sélection des **compétences**

    Il avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

  </Accordion>

  <Accordion title="Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci ?">
    Non. Vous pouvez exécuter OpenClaw avec des **clés API** (Anthropic/OpenAI/autres) ou avec
    des **modèles exclusivement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
    Pro/Max ou Codex OpenAI) sont des moyens facultatifs d'authentifier ces providers.

    Pour Anthropic dans OpenClaw, la distinction pratique est :

    - **Clé Anthropic API** : facturation normale de l'Anthropic API
    - **Auth par abonnement Claude dans OpenClaw** : Anthropic a informé les utilisateurs de OpenClaw le
      **4 avril 2026 à 12h00 PT / 20h00 BST** que cela nécessite
      une **utilisation supplémentaire** (Extra Usage) facturée séparément de l'abonnement

    Nos reproductions locales montrent également que `claude -p --append-system-prompt ...` peut
    rencontrer la même garde d'utilisation supplémentaire lorsque le prompt ajouté identifie
    OpenClaw, alors que la même chaîne de prompt ne reproduit **pas** ce blocage sur
    le chemin SDK Anthropic + clé API. L'OAuth Codex OpenAI est explicitement
    pris en charge pour les outils externes tels que OAuth.

    OpenClaw prend également en charge d'autres options d'abonnement hébergées, notamment
    le **plan de codage Cloud OpenClaw**, le **plan de codage Qwen**, et
    le **plan de codage Z.AI / MiniMax**.

    Docs : [GLM](/en/providers/anthropic), [Anthropic](/en/providers/openai),
    [OpenAI Cloud](/en/providers/qwen),
    [Qwen](/en/providers/minimax), [Modèles MiniMax](/en/providers/glm),
    [Modèles locaux](/en/gateway/local-models), [Modèles](/en/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser l'abonnement Claude Max sans clé d'API ?">
    Oui, mais considérez-le comme une **authentification par abonnement Claude avec Extra Usage**.

    Les abonnements Claude Pro/Max n'incluent pas de clé d'API. Dans OpenClaw, cela
    signifie que l'avertissement de facturation spécifique à Anthropic de OpenClaw s'applique : le trafic
    d'abonnement nécessite **Extra Usage**. Si vous souhaitez du trafic vers Anthropic sans
    ce parcours Extra Usage, utilisez plutôt une clé d'Anthropic API.

  </Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?">
    Oui, mais l'interprétation prise en charge est désormais :

    - Anthropic dans OpenClaw avec un abonnement signifie **Extra Usage**
    - Anthropic dans OpenClaw sans ce chemin signifie **clé d'API**

    Le setup-token Anthropic est toujours disponible comme chemin OpenClaw legacy/manuel,
    et l'avertissement de facturation spécifique à Anthropic de OpenClaw s'y applique toujours. Nous
    avons également reproduit le même garde de facturation localement avec une utilisation directe de
    `claude -p --append-system-prompt ...` lorsque le prompt ajouté
    identifie OpenClaw, alors que la même chaîne de prompt n'a **pas** reproduit sur le
    chemin SDK Anthropic + clé d'API.

    Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé d'Anthropic API est le
    choix le plus sûr et recommandé. Si vous souhaitez d'autres options hébergées de type abonnement
    dans OpenClaw, voir [OpenAI](/en/providers/openai), [Qwen / Model
    Cloud](/en/providers/qwen), [MiniMax](/en/providers/minimax) et
    [Modèles GLM](/en/providers/glm).

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="Pourquoi vois-je l'erreur HTTP 429 rate_limit_error de la part d'Anthropic ?">
Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
utilisez le **Claude CLI**, attendez que la fenêtre se réinitialise ou augmentez votre plan. Si vous
utilisez une **clé API Anthropic**, vérifiez la console Anthropic
pour l'utilisation/facturation et augmentez les limites si nécessaire.

    Si le message est spécifiquement :
    `Extra usage is required for long context requests`, la demande essaie d'utiliser
    la version bêta du contexte 1M d'Anthropic (`context1m: true`). Cela fonctionne uniquement lorsque votre
    identifiant est éligible à la facturation du contexte long (facturation par clé API ou le
    chemin de connexion Claude d'OpenClaw avec Extra Usage activé).

    Astuce : définissez un **model de secours** pour qu'OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le débit.
    Voir [Models](/en/cli/models), [OAuth](/en/concepts/oauth) et
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="AWS Bedrock est-il pris en charge ?">
  Oui. OpenClaw dispose d'un fournisseur **Amazon Bedrock (Converse)** intégré. Avec les marqueurs d'environnement AWS présents, OpenClaw peut découvrir automatiquement le catalogue Bedrock streaming/texte et le fusionner en tant que fournisseur implicite `amazon-bedrock` ; sinon, vous pouvez explicitement activer `plugins.entries.amazon-bedrock.config.discovery.enabled` ou ajouter une entrée de
  fournisseur manuelle. Voir [Amazon Bedrock](/en/providers/bedrock) et [Fournisseurs de modèles](/en/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.
</Accordion>

<Accordion title="Comment fonctionne l'authentification Codex ?">OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). L'intégration peut exécuter le flux OAuth et définira le modèle par défaut sur `openai-codex/gpt-5.4` si approprié. Voir [Fournisseurs de modèles](/en/concepts/model-providers) et [Intégration (CLI)](/en/start/wizard).</Accordion>

  <Accordion title="Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?">
    Oui. OpenClaw prend entièrement en charge l'**OAuth d'abonnement OpenAI Code (Codex)**.
    OpenAI autorise explicitement l'utilisation de l'OAuth d'abonnement dans les outils/workflows externes
    comme OpenClaw. L'intégration (Onboarding) peut exécuter le flux OAuth pour vous.

    Voir [OAuth](/en/concepts/oauth), [Fournisseurs de modèles](/en/concepts/model-providers) et [Intégration (CLI)](/en/start/wizard).

  </Accordion>

  <Accordion title="Comment configurer OAuth pour la CLI Gemini ?">
    La CLI Gemini utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

    Utilisez plutôt le fournisseur d'API Gemini :

    1. Activez le plugin : `openclaw plugins enable google`
    2. Exécutez `openclaw onboard --auth-choice gemini-api-key`
    3. Définissez un modèle Google tel que `google/gemini-3.1-pro-preview`

  </Accordion>

<Accordion title="Un modèle local est-il adapté aux discussions occasionnelles ?">
  En général, non. OpenClaw nécessite un contexte large + une forte sécurité ; les petites cartes tronquent et fuient des données. Si vous devez le faire, exécutez la construction de modèle la **plus grande** possible en local (LM Studio) et consultez [/gateway/local-models](/en/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de prompt - voir
  [Sécurité](/en/gateway/security).
</Accordion>

<Accordion title="Comment garder le trafic du modèle hébergé dans une région spécifique ?">
  Choisissez des points de terminaison épinglés à une région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en
  respectant le fournisseur régional que vous sélectionnez.
</Accordion>

  <Accordion title="Dois-je acheter un Mac Mini pour installer ceci ?">
    Non. OpenClaw fonctionne sous macOS ou Linux (Windows via WSL2). Un Mac mini est optionnel - certaines personnes
    en achètent un comme hôte toujours allumé, mais un petit VPS, un serveur domestique, ou une boîte de classe Raspberry Pi fonctionne aussi.

    Vous n'avez besoin d'un Mac **que pour les outils exclusifs au macOS**. Pour iMessage, utilisez [BlueBubbles](/en/channels/bluebubbles) (recommandé) - le serveur BlueBubbles fonctionne sur n'importe quel Mac, et le Gateway peut fonctionner sous Linux ou ailleurs. Si vous souhaitez d'autres outils exclusifs au macOS, exécutez le Gateway sur un Mac ou associez un nœud macOS.

    Docs : [BlueBubbles](/en/channels/bluebubbles), [Nœuds](/en/nodes), [Mode Mac distant](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Ai-je besoin d'un Mac mini pour la prise en charge iMessage ?">
    Vous avez besoin **d'un appareil macOS** connecté à Messages. Ce n'est **pas** obligé que ce soit un Mac mini -
    n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/en/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles fonctionne sous macOS, tandis que le Gateway peut fonctionner sous Linux ou ailleurs.

    Configurations courantes :

    - Exécutez le Gateway sur Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
    - Exécutez tout sur le Mac si vous voulez la configuration la plus simple sur une seule machine.

    Docs : [BlueBubbles](/en/channels/bluebubbles), [Nœuds](/en/nodes),
    [Mode Mac distant](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si j'achète un Mac mini pour faire tourner OpenClaw, puis-je le connecter à mon MacBook Pro ?">
    Oui. Le **Mac mini peut faire tourner le Gateway**, et votre MacBook Pro peut se connecter en tant que
    **nœud** (appareil compagnon). Les nœuds ne font pas tourner le Gateway - ils fournissent des capacités supplémentaires comme l'écran/caméra/toile et `system.run` sur cet appareil.

    Modèle courant :

    - Gateway sur le Mac mini (toujours allumé).
    - Le MacBook Pro fait tourner l'application macOS ou un hôte de nœud et s'apparie au Gateway.
    - Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

    Docs : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes).

  </Accordion>

  <Accordion title="Puis-je utiliser Bun ?">
    Bun n'est **pas recommandé**. Nous constatons des bugs d'exécution, notamment avec WhatsApp et Telegram.
    Utilisez **Node** pour des passerelles stables.

    Si vous souhaitez tout de même expérimenter avec Bun, faites-le sur une passerelle non-production
    sans WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram : que faut-il mettre dans allowFrom ?">
    `channels.telegram.allowFrom` est **l'ID utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

    L'intégration accepte une entrée `@username` et la résout en un ID numérique, mais l'autorisation OpenClaw utilise uniquement des ID numériques.

    Plus sécurisé (sans bot tiers) :

    - Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

    Bot API officiel :

    - Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

    Tiers (moins privé) :

    - Envoyez un DM à `@userinfobot` ou `@getidsbot`.

    Voir [/channels/telegram](/en/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?">
  Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne dispose de son propre espace de travail et de son propre magasin de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/en/concepts/multi-agent) et [WhatsApp](/en/channels/whatsapp).
</Accordion>

<Accordion title='Puis-je exécuter un agent "fast chat" et un agent "Opus for coding" ?'>
  Oui. Utilisez le routage multi-agent : attribuez à chaque agent son propre modèle par défaut, puis liez les routes entrantes (compte fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/en/concepts/multi-agent). Voir aussi [Models](/en/concepts/models) et [Configuration](/en/gateway/configuration).
</Accordion>

  <Accordion title="Homebrew fonctionne-t-il sur Linux ?">
    Oui. Homebrew prend en charge Linux (Linuxbrew). Installation rapide :

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés par `brew` soient résolus dans les shells non interactifs.
    Les versions récentes ajoutent également au début les répertoires bin utilisateurs courants sur les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et honorent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

  </Accordion>

  <Accordion title="Différence entre l'installation hackable via git et l'installation via npm">
    - **Installation hackable (git) :** extraction complète du code source, modifiable, idéale pour les contributeurs.
      Vous exécutez les builds localement et pouvez patcher le code/docs.
    - **installation npm :** installation globale de la CLI, sans dépôt, idéale pour "just run it" (lancer simplement).
      Les mises à jour proviennent des dist-tags npm.

    Docs : [Getting started](/en/start/getting-started), [Updating](/en/install/updating).

  </Accordion>

  <Accordion title="Puis-je passer plus tard d'une installation npm à git ?">
    Oui. Installez l'autre version, puis exécutez Doctor pour que le service gateway pointe vers le nouveau point d'entrée.
    Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code OpenClaw. Votre état
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

    Doctor détecte une inadéquation du point d'entrée du service gateway et propose de réécrire la configuration du service pour correspondre à l'installation actuelle (utilisez `--repair` dans l'automatisation).

    Conseils de sauvegarde : voir [Stratégie de sauvegarde](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="Dois-je exécuter la Gateway sur mon ordinateur portable ou un VPS ?">
    Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez la
    friction la plus faible et que vous êtes d'accord avec la mise en veille/redémarrages, exécutez-le localement.

    **Ordinateur portable (Gateway locale)**

    - **Avantages :** aucun coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
    - **Inconvénients :** mise en veille/chutes de réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

    **VPS / cloud**

    - **Avantages :** toujours actif, réseau stable, pas de problèmes de mise en veille, plus facile à maintenir en cours d'exécution.
    - **Inconvénients :** souvent exécuté sans tête (utilisez des captures d'écran), accès aux fichiers à distance uniquement, vous devez utiliser SSH pour les mises à jour.

    **Note spécifique à OpenClaw :** WhatsApp/Telegram/Slack/Mattermost/Discord fonctionnent tous parfaitement depuis un VPS. Le seul vrai compromis est **navigateur sans tête** par rapport à une fenêtre visible. Voir [Navigateur](/en/tools/browser).

    **Par défaut recommandé :** VPS si vous avez eu des déconnexions de la gateway auparavant. Le local est excellent lorsque vous utilisez activement le Mac et que vous voulez un accès aux fichiers locaux ou une automatisation de l'interface utilisateur avec un navigateur visible.

  </Accordion>

  <Accordion title="Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?">
    Non requis, mais **recommandé pour la fiabilité et l'isolation**.

    - **Hôte dédié (VPS/Mac mini/Pi) :** toujours actif, moins d'interruptions dues à la mise en veille/redémarrage, autorisations plus propres, plus facile à maintenir en fonctionnement.
    - **Ordinateur portable/de bureau partagé :** tout à fait adapté pour les tests et une utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou se met à jour.

    Si vous souhaitez profiter du meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nodes](/en/nodes).
    Pour des conseils de sécurité, lisez [Security](/en/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les besoins minimum du VPS et le système d'exploitation recommandé ?">
    OpenClaw est léger. Pour un Gateway de base + un canal de chat :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
    - **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge (journaux, médias, canaux multiples). Les outils de nœud et l'automatisation du navigateur peuvent être gourmands en ressources.

    SE : utilisez **Ubuntu LTS** (ou n'importe quel Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

    Docs : [Linux](/en/platforms/linux), [hébergement VPS](/en/vps).

  </Accordion>

  <Accordion title="Puis-je exécuter OpenClaw dans une VM et quels sont les prérequis ?">
    Oui. Traitez une VM comme un VPS : elle doit être toujours active, accessible et disposer de suffisamment
    de RAM pour le Gateway et tous les canaux que vous activez.

    Recommandations de base :

    - **Minimum absolu :** 1 vCPU, 1 Go de RAM.
    - **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs canaux, une automatisation de navigateur ou des outils multimédias.
    - **SE :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

    Si vous êtes sur Windows, **WSL2 est la configuration de type VM la plus simple** et offre la meilleure compatibilité
    des outils. Voir [Windows](/en/platforms/windows), [hébergement VPS](/en/vps).
    Si vous exécutez macOS dans une VM, voir [VM macOS](/en/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Qu'est-ce qu'OpenClaw ?

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'OpenClaw, en un paragraphe ?">
    OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat et des plugins de canal intégrés tels que QQ Bot) et peut également faire de la voix + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.
  </Accordion>

  <Accordion title="Proposition de valeur">
    OpenClaw n'est pas « juste un enveloppeur Claude ». C'est un **plan de contrôle local d'abord** qui vous permet d'exécuter un assistant capable sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec des sessions avec état, de la mémoire et des outils - sans confier le contrôle de vos flux de travail à un SaaS hébergé.

    Points forts :

    - **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l'espace de travail + l'historique des sessions en local.
    - **Vrais canaux, pas une bac à sable web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc., plus la voix mobile et Canvas sur les plateformes prises en charge.
    - **Agnostique au modèle :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage et une bascule par agent.
    - **Option uniquement locale :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
    - **Routage multi-agent :** agents distincts par canal, compte ou tâche, chacun avec son propre espace de travail et ses valeurs par défaut.
    - **Open source et hackable :** inspectez, étendez et auto-hébergez sans verrouillage fournisseur.

    Docs : [Gateway](/en/gateway), [Canaux](/en/channels), [Multi-agent](/en/concepts/multi-agent),
    [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Je viens de l'installer - que devrais-je faire en premier ?">
    Bons premiers projets :

    - Créer un site web (WordPress, Shopify ou un site statique simple).
    - Prototyper une application mobile (plan, écrans, plan API).
    - Organiser les fichiers et dossiers (nettoyage, nommage, étiquetage).
    - Connecter Gmail et automatiser les résumés ou les suivis.

    Il peut gérer de grandes tâches, mais il fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

  </Accordion>

  <Accordion title="Quels sont les cinq principaux cas d'usage quotidiens pour OpenClaw ?">
    Les réussites quotidiennes ressemblent généralement à ceci :

    - **Briefings personnels :** résumés de votre boîte de réception, de votre agenda et des actualités qui vous intéressent.
    - **Recherche et rédaction :** recherche rapide, résumés et premières versions de courriels ou de documents.
    - **Rappels et suivis :** relances et listes de contrôle pilotées par cron ou heartbeat.
    - **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
    - **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et récupérez le résultat dans le chat.

  </Accordion>

  <Accordion title="OpenClaw peut-il aider avec la génération de leads, la prospection, la publicité et les blogs pour un SaaS ?">
    Oui pour la **recherche, la qualification et la rédaction**. Il peut analyser des sites, constituer des listes restreintes,
    résumer des prospects et rédiger des versions de messages de prospection ou de publicités.

    Pour les **campagnes de prospection ou publicitaires**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
    les politiques des plateformes, et vérifiez tout contenu avant son envoi. Le modèle le plus sûr consiste à laisser
    OpenClaw rédiger et à ce que vous validiez.

    Docs : [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les avantages par rapport à Claude Code pour le développement web ?">
    OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplacement pour un IDE. Utilisez
    Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous
    souhaitez une mémoire persistante, un accès multi-appareils et une orchestration d'outils.

    Avantages :

    - **Mémoire persistante + espace de travail** d'une session à l'autre
    - **Accès multi-plateforme** (WhatsApp, Telegram, TUI, WebChat)
    - **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
    - **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
    - **Nœuds** pour le navigateur/écran/caméra/exécution local

    Présentation : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills et automatisation

<AccordionGroup>
  <Accordion title="Comment personnaliser les compétences sans salir le dépôt ?">
    Utilisez des substitutions gérées au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, donc les substitutions gérées priment toujours sur les compétences groupées sans toucher à git. Si vous avez besoin que la compétence soit installée globalement mais visible seulement pour certains agents, gardez la copie partagée dans `~/.openclaw/skills` et contrôlez la visibilité avec `agents.defaults.skills` et `agents.list[].skills`. Seules les modifications dignes d'être intégrées en amont devraient résider dans le dépôt et être publiées sous forme de PRs.
  </Accordion>

  <Accordion title="Puis-je charger des compétences depuis un dossier personnalisé ?">
    Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (la priorité la plus basse). La priorité par défaut est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` installe dans `./skills` par défaut, qu'OpenClaw considère comme `<workspace>/skills` lors de la prochaine session. Si la compétence ne doit être visible que pour certains agents, associez-la à `agents.defaults.skills` ou `agents.list[].skills`.
  </Accordion>

  <Accordion title="Comment puis-je utiliser différents modèles pour différentes tâches ?">
    Les modèles pris en charge aujourd'hui sont :

    - **Tâches Cron (Cron jobs)** : les tâches isolées peuvent définir une `model` de remplacement par tâche.
    - **Sous-agents** : acheminez les tâches vers des agents séparés avec des modèles par défaut différents.
    - **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

    Voir [Tâches Cron](/en/automation/cron-jobs), [Routage multi-agent](/en/concepts/multi-agent) et [Commandes slash](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Le bot gèle lors de l'exécution de tâches lourdes. Comment décharger cela ?">
    Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
    renvoient un résumé et gardent votre discussion principale réactive.

    Demandez à votre bot de « lancer un sous-agent pour cette tâche » ou utilisez `/subagents`.
    Utilisez `/status` dans la discussion pour voir ce que la Gateway est en train de faire (et si elle est occupée).

    Conseil sur les tokens : les tâches longues et les sous-agents consomment tous deux des tokens. Si le coût est un souci, définissez un
    modèle moins cher pour les sous-agents via `agents.defaults.subagents.model`.

    Documentation : [Sous-agents](/en/tools/subagents), [Tâches d'arrière-plan](/en/automation/tasks).

  </Accordion>

  <Accordion title="Comment fonctionnent les sessions de sous-agent liées aux fils sur Discord ?">
    Utilisez les liaisons de fils. Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

    Flux de base :

    - Créez avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"` pour un suivi persistant).
    - Ou liez manuellement avec `/focus <target>`.
    - Utilisez `/agents` pour inspecter l'état de la liaison.
    - Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le défocus automatique.
    - Utilisez `/unfocus` pour détacher le fil.

    Configuration requise :

    - Valeurs par défaut globales : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Remplacements Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Liaison automatique à la création : définissez `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentation : [Sous-agents](/en/tools/subagents), [Discord](/en/channels/discord), [Référence de configuration](/en/gateway/configuration-reference), [Commandes slash](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Un sous-agent a terminé, mais la mise à jour de complétion est allée au mauvais endroit ou n'a jamais été publiée. Que dois-je vérifier ?">
    Vérifiez d'abord la route du demandeur résolu :

    - La livraison de sous-agent en mode complétion préfère toute route de fil ou de conversation liée lorsqu'une telle route existe.
    - Si l'origine de la complétion ne porte qu'un channel, OpenClaw revient à la route stockée de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe puisse toujours réussir.
    - Si ni une route liée ni une route stockée utilisable n'existent, la livraison directe peut échouer et le résultat revient à une livraison de session en file d'attente au lieu d'être publié immédiatement dans le chat.
    - Des cibles invalides ou obsolètes peuvent toujours forcer le retour en file d'attente ou l'échec final de la livraison.
    - Si la dernière réponse visible de l'assistant de l'enfant est le jeton silencieux exact `NO_REPLY` / `no_reply`, ou exactement `ANNOUNCE_SKIP`, OpenClaw supprime intentionnellement l'annonce au lieu de publier une progression antérieure obsolète.
    - Si l'enfant a expiré après seulement des appels d'outil, l'annonce peut réduire cela à un résumé court de progression partielle au lieu de rejouer la sortie brute de l'outil.

    Débogage :

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Sous-agents](/en/tools/subagents), [Tâches d'arrière-plan](/en/automation/tasks), [Outils de session](/en/concepts/session-tool).

  </Accordion>

  <Accordion title="Cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?">
    Cron s'exécute dans le processus Gateway. Si le Gateway ne fonctionne pas en continu,
    les tâches planifiées ne s'exécuteront pas.

    Liste de contrôle :

    - Confirmez que cron est activé (`cron.enabled`) et que `OPENCLAW_SKIP_CRON` n'est pas défini.
    - Vérifiez que le Gateway fonctionne 24h/24 et 7j/7 (pas de mise en veille/redémarrage).
    - Vérifiez les paramètres de fuseau horaire pour la tâche (`--tz` vs fuseau horaire de l'hôte).

    Débogage :

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Docs : [Tâches Cron](/en/automation/cron-jobs), [Automatisation et tâches](/en/automation).

  </Accordion>

  <Accordion title="Cron déclenché, mais rien n'a été envoyé au channel. Pourquoi ?">
    Vérifiez d'abord le mode de livraison :

    - `--no-deliver` / `delivery.mode: "none"` signifie qu'aucun message externe n'est attendu.
    - Une cible d'annonce manquante ou invalide (`channel` / `to`) signifie que le runner a sauté la livraison sortante.
    - Les échecs d'authentification du channel (`unauthorized`, `Forbidden`) signifient que le runner a essayé de livrer mais que les identifiants l'ont bloqué.
    - Un résultat isolé silencieux (`NO_REPLY` / `no_reply` uniquement) est considéré comme intentionnellement non livrable, donc le runner supprime également la livraison de repli mise en file d'attente.

    Pour les tâches cron isolées, le runner est responsable de la livraison finale. On s'attend à ce que l'agent renvoie un résumé en texte brut pour que le runner l'envoie. `--no-deliver` conserve ce résultat en interne ; il n'autorise pas l'agent à envoyer directement avec l'outil de message à la place.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Tâches Cron](/en/automation/cron-jobs), [Tâches d'arrière-plan](/en/automation/tasks).

  </Accordion>

  <Accordion title="Pourquoi une exécution cron isolée a-t-elle changé de modèle ou réessayé une fois ?">
    C'est généralement le chemin de changement de modèle en direct, et non une planification en double.

    Le cron isolé peut persister un transfert de modèle à l'exécution et réessayer lorsque l'exécution active génère `LiveSessionModelSwitchError`. La nouvelle tentative conserve le provider/modèle changé, et si le changement comportait un nouveau profil d'authentification, le cron le conserve également avant de réessayer.

    Règles de sélection connexes :

    - La priorité du modèle du hook Gmail l'emporte en premier lorsqu'elle est applicable.
    - Ensuite, `model` par tâche.
    - Ensuite, toute substitution de modèle de session cron stockée.
    - Ensuite, la sélection normale du modèle agent/défaut.

    La boucle de nouvelle tentative est limitée. Après la tentative initiale plus 2 nouvelles tentatives de changement, le cron abandonne au lieu de boucler indéfiniment.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Tâches Cron](/en/automation/cron-jobs), [cron CLI](/en/cli/cron).

  </Accordion>

  <Accordion title="Comment installer des compétences sur Linux ?">
    Utilisez les commandes natives `openclaw skills` ou déposez les compétences dans votre espace de travail. L'interface utilisateur Skills de macOS n'est pas disponible sur Linux.
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

    Le `openclaw skills install` natif écrit dans le répertoire de l'espace de travail actif `skills/`.
    N'installez le CLI `clawhub` séparé que si vous souhaitez publier ou
    synchroniser vos propres compétences. Pour les installations partagées entre les agents, placez la compétence sous
    `~/.openclaw/skills` et utilisez `agents.defaults.skills` ou
    `agents.list[].skills` si vous souhaitez restreindre les agents qui peuvent la voir.

  </Accordion>

  <Accordion title="OpenClaw peut-il exécuter des tâches selon un planning ou en continu en arrière-plan ?">
    Oui. Utilisez le planificateur Gateway :

    - **Cron jobs** pour les tâches planifiées ou récurrentes (persistantes après redémarrage).
    - **Heartbeat** pour les vérifications périodiques de la « session principale ».
    - **Isolated jobs** pour les agents autonomes qui publient des résumés ou livrent aux discussions.

    Docs : [Cron jobs](/en/automation/cron-jobs), [Automation & Tasks](/en/automation),
    [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title="Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?"
    Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et elles n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte Gateway**. Sur Linux, les compétences exclusives à `darwin` (comme `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne contourniez le contrôle d'accès.

    Vous disposez de trois modèles pris en charge :

    **Option A - exécuter la Gateway sur un Mac (le plus simple).**
    Exécutez la Gateway là où les binaires macOS existent, puis connectez-vous depuis Linux en [mode distant](#gateway-ports-already-running-and-remote-mode) ou via Tailscale. Les compétences se chargent normalement car l'hôte Gateway est macOS.

    **Option B - utiliser un nœud macOS (pas de SSH).**
    Exécutez la Gateway sur Linux, associez un nœud macOS (application de la barre de menus) et définissez **Node Run Commands** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste autorisée.

    **Option C - proxy des binaires macOS via SSH (avancé).**
    Conservez la Gateway sur Linux, mais faites en sorte que les binaires CLI requis résolvent vers des wrappers SSH qui s'exécutent sur un Mac. Ensuite, remplacez les métadonnées de la compétence pour autoriser Linux afin qu'elle reste éligible.

    1. Créez un wrapper SSH pour le binaire (exemple : `memo` pour Apple Notes) :

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Placez le wrapper sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
    3. Remplacez les métadonnées de la compétence (espace de travail ou `~/.openclaw/skills`) pour autoriser Linux :

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. Démarrez une nouvelle session pour que l'instantané des compétences soit actualisé.

  </Accordion>

  <Accordion title="Avez-vous une intégration Notion ou HeyGen ?">
    Non intégrée nativement pour le moment.

    Options :

    - **Compétence / plugin personnalisé :** le meilleur choix pour un accès fiable à l'API (Notion et HeyGen ont tous deux des API).
    - **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

    Si vous souhaitez conserver le contexte par client (flux de travail d'agence), un modèle simple consiste à :

    - Une page Notion par client (contexte + préférences + travail en cours).
    - Demander à l'agent de récupérer cette page au début d'une session.

    Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une compétence
    ciblant ces API.

    Installer les compétences :

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Les installations natives atterrissent dans le répertoire de l'espace de travail actif `skills/`. Pour les compétences partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Si seuls certains agents doivent voir une installation partagée, configurez `agents.defaults.skills` ou `agents.list[].skills`. Certaines compétences s'attendent à ce que des binaires soient installés via Homebrew ; sous API, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Skills](/en/tools/skills), [Skills config](/en/tools/skills-config) et [Linux](/en/tools/clawhub).

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

    Ce chemin est local à l'hôte. Si le Gateway s'exécute ailleurs, exécutez soit un nœud hôte sur la machine du navigateur, soit utilisez le CDP à distance.

    Limites actuelles sur `existing-session` / `user` :

    - les actions sont basées sur des références, pas sur des sélecteurs CSS
    - les téléchargements nécessitent `ref` / `inputRef` et prennent actuellement en charge un seul fichier à la fois
    - `responsebody`, l'exportation PDF, l'interception des téléchargements et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut

  </Accordion>
</AccordionGroup>

## Sandboxing et mémoire

<AccordionGroup>
  <Accordion title="Existe-t-il une documentation dédiée à l'isolation ?">
    Oui. Voir [Sandboxing](/en/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de bac à sable), voir [Docker](/en/install/docker).
  </Accordion>

  <Accordion title="Docker semble limité - comment activer toutes les fonctionnalités ?">
    L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
    de paquets système, Homebrew ou de navigateurs inclus. Pour une configuration plus complète :

    - Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` pour que les caches survivent.
    - Intégrez les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Installez les navigateurs Playwright via le Docker inclus :
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Définissez `PLAYWRIGHT_BROWSERS_PATH` et assurez-vous que le chemin est persistant.

    Documentation : [Docker](/en/install/docker), [Browser](/en/tools/browser).

  </Accordion>

  <Accordion title="Puis-je garder les DMs personnels mais rendre les groupes publics/sandboxés avec un seul agent ?">
    Oui - si votre trafic privé est constitué de **DMs** et votre trafic public de **groupes**.

    Utilisez `agents.defaults.sandbox.mode: "non-main"` pour que les sessions de groupe/canal (clés non principales) s'exécutent dans Docker, tandis que la session DM principale reste sur l'hôte. Restreignez ensuite les outils disponibles dans les sessions isolées via `tools.sandbox.tools`.

    Guide de configuration + exemple de config : [Groups: personal DMs + public groups](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Référence de configuration clé : [Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="Comment lier un dossier de l'hôte au bac à sable ?">
    Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (p. ex. `"/home/user/src:/src:ro"`). Les liaisons globales et par agent fusionnent ; les liaisons par agent sont ignorées lorsque `scope: "shared"`. Utilisez `:ro` pour tout ce qui est sensible et souvenez-vous que les liaisons contournent les murs du système de fichiers du bac à sable.

    OpenClaw valide les sources de liaison à la fois par rapport au chemin normalisé et au chemin canonique résolu via l'ancêtre existant le plus profond. Cela signifie que les échappements par parents de liens symboliques échouent toujours en mode fermé, même lorsque le dernier segment du chemin n'existe pas encore, et que les vérifications de racine autorisée s'appliquent toujours après la résolution des liens symboliques.

    Voir [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

  </Accordion>

  <Accordion title="Comment fonctionne la mémoire ?">
    La mémoire OpenClaw n'est que des fichiers Markdown dans l'espace de travail de l'agent :

    - Des notes quotidiennes dans `memory/YYYY-MM-DD.md`
    - Des notes à long terme sélectionnées dans `MEMORY.md` (sessions principales/privées uniquement)

    OpenClaw exécute également un **vidage de mémoire silencieux pré-compaction** pour rappeler au model d'écrire des notes durables avant la auto-compaction. Cela ne s'exécute que lorsque l'espace de travail est accessible en écriture (les bacs à sable en lecture seule l'ignorent). Voir [Memory](/en/concepts/memory).

  </Accordion>

  <Accordion title="La mémoire continue d'oublier des choses. Comment faire pour qu'elle les retienne ?">
    Demandez au bot **d'écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
    le contexte à court terme va dans `memory/YYYY-MM-DD.md`.

    C'est encore un domaine que nous améliorons. Il aide de rappeler au model de stocker des souvenirs ;
    il saura quoi faire. S'il continue d'oublier, vérifiez que le Gateway utilise le même
    espace de travail à chaque exécution.

    Documentation : [Memory](/en/concepts/memory), [Agent workspace](/en/concepts/agent-workspace).

  </Accordion>

  <Accordion title="La mémoire persiste-t-elle indéfiniment ? Quelles sont les limites ?">
    Les fichiers de mémoire sont stockés sur disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
    espace de stockage, et non le modèle. Le **contexte de session** est toujours limité par la fenêtre de
    contexte du modèle, de sorte que les longues conversations peuvent être compactées ou tronquées. C'est pourquoi
    la recherche de mémoire existe - elle ne ramène que les parties pertinentes dans le contexte.

    Documentation : [Memory](/en/concepts/memory), [Context](/en/concepts/context).

  </Accordion>

  <Accordion title="La recherche de mémoire sémantique nécessite-t-elle une clé OpenAI API ?">
    Seulement si vous utilisez les **embeddings OpenAI**. OAuth Codex couvre la conversation/complétions et
    ne donne **pas** accès aux embeddings, donc **se connecter avec Codex (OAuth ou la
    connexion CLI Codex)** n'aide pas pour la recherche de mémoire sémantique. Les embeddings OpenAI
    nécessitent toujours une vraie clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

    Si vous ne définissez pas explicitement de fournisseur, OpenClaw sélectionne automatiquement un fournisseur lorsqu'il
    peut résoudre une clé API (profils d'auth, `models.providers.*.apiKey`, ou env vars).
    Il préfère OpenAI si une clé OpenAI est résolue, sinon Gemini si une clé Gemini
    est résolue, puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche de
    mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de modèle local
    configuré et présent, OpenClaw
    préfère `local`. Ollama est pris en charge lorsque vous définissez explicitement
    `memorySearch.provider = "ollama"`.

    Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et facultativement
    `memorySearch.fallback = "none"`). Si vous voulez des embeddings Gemini, définissez
    `memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
    `memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embedding **OpenAI, Gemini, Voyage, Mistral, Ollama ou local**
    - voir [Memory](/en/concepts/memory) pour les détails de configuration.

  </Accordion>
</AccordionGroup>

## Emplacement des fichiers sur le disque

<AccordionGroup>
  <Accordion title="Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement ?">
    Non - **l'état d'OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

    - **Local par défaut :** les sessions, les fichiers de mémoire, la configuration et l'espace de travail résident sur l'hôte du Gateway
      (`~/.openclaw` + votre répertoire de travail).
    - **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) sont envoyés vers
      leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
      serveurs.
    - **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les prompts sur votre machine, mais le trafic
      du canal passe toujours par les serveurs de ce canal.

    Connexes : [Espace de travail de l'agent](/en/concepts/agent-workspace), [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Où OpenClaw stocke-t-il ses données ?">
    Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

    | Chemin                                                            | Objectif                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuration principale (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importation OAuth héritée (copiée dans les profils d'authentification lors de la première utilisation)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Profils d'authentification (OAuth, clés API et `keyRef`/`tokenRef` facultatifs)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Charge utile secrète stockée dans un fichier facultatif pour les fournisseurs SecretRef `file` |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité héritée (entrées `api_key` statiques nettoyées)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique des conversations et état (par agent)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

    Chemin d'agent unique hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

    Votre **espace de travail** (AGENTS.md, fichiers mémoire, compétences, etc.) est séparé et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?">
    Ces fichiers se trouvent dans l'**espace de travail de l'agent**, et non dans `~/.openclaw`.

    - **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (ou solution de repli historique `memory.md` si `MEMORY.md` est absent),
      `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` en option.
    - **Répertoire d'état (`~/.openclaw`)** : configuration, état du canal/fournisseur, profils d'authentification, sessions, journaux,
      et compétences partagées (`~/.openclaw/skills`).

    L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si le bot "oublie" après un redémarrage, vérifiez que le Gateway utilise le même
    espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail
    de l'**hôte de la passerelle**, et non celui de votre ordinateur local).

    Astuce : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
    AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique de discussion.

    Voir [Espace de travail de l'agent](/en/concepts/agent-workspace) et [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Stratégie de sauvegarde recommandée">
    Placez votre **espace de travail de l'agent** dans un dépôt git **privé** et sauvegardez-le quelque part
    de privé (par exemple GitHub privé). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER
    et vous permet de restaurer l'"esprit" de l'assistant plus tard.

    Ne **committez** rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
    Si vous avez besoin d'une restauration complète, sauvegardez l'espace de travail et le répertoire d'état
    séparément (voir la question sur la migration ci-dessus).

    Docs : [Espace de travail de l'agent](/en/concepts/agent-workspace).

  </Accordion>

<Accordion title="Comment désinstaller complètement OpenClaw ?">Voir le guide dédié : [Désinstaller](/en/install/uninstall).</Accordion>

  <Accordion title="Les agents peuvent-ils travailler en dehors de l'espace de travail ?">
    Oui. L'espace de travail est le **cwd par défaut** et l'ancre de la mémoire, et non un sandbox strict.
    Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
    emplacements de l'hôte sauf si le sandboxing est activé. Si vous avez besoin d'isolation, utilisez
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) ou les paramètres de sandbox par agent. Si vous
    voulez qu'un dépôt soit le répertoire de travail par défaut, définissez le
    `workspace` de cet agent à la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez l'
    espace de travail séparé, sauf si vous souhaitez intentionnellement que l'agent travaille à l'intérieur.

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

  <Accordion title="Mode distant : où se trouve le magasin de session ?">
    L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le magasin de sessions qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur portable local. Voir [Gestion de session](/en/concepts/session).
  </Accordion>
</AccordionGroup>

## Config basics

<AccordionGroup>
  <Accordion title="Quel est le format de la configuration ? Où se trouve-t-elle ?">
    OpenClaw lit une configuration **JSON5** optionnelle depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si le fichier est manquant, il utilise des paramètres par défaut sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='J'ai défini gateway.bind : « lan » (ou « tailnet ») et maintenant rien n'écoute / l'interface indique non autorisé'>
    Les liaisons non-boucle **nécessitent un chemin d'authentification de passerelle valide**. En pratique, cela signifie :

    - authentification par secret partagé : jeton ou mot de passe
    - `gateway.auth.mode: "trusted-proxy"` derrière un proxy inverse de conscience de l'identité non-boucle correctement configuré

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

    - `gateway.remote.token` / `.password` n'activent **pas** l'authentification de passerelle locale par eux-mêmes.
    - Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
    - Pour l'authentification par mot de passe, définissez `gateway.auth.mode: "password"` plus `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`) à la place.
    - Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue en mode fermé (aucun masquage de repli distant).
    - Les configurations de l'interface de contrôle par secret partagé s'authentifient via `connect.params.auth.token` ou `connect.params.auth.password` (stockés dans les paramètres de l'application/interface). Les modes porteurs d'identité tels que Tailscale Serve ou `trusted-proxy` utilisent plutôt les en-têtes de requête. Évitez de mettre des secrets partagés dans les URL.
    - Avec `gateway.auth.mode: "trusted-proxy"`, les proxies inverses de boucle sur le même hôte ne satisfont toujours **pas** l'authentification de proxy approuvé. Le proxy approuvé doit être une source non-boucle configurée.

  </Accordion>

  <Accordion title="Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?">
    OpenClaw applique l'authentification de la passerelle par défaut, y compris pour le bouclage. Dans le chemin normal par défaut, cela signifie l'authentification par jeton : si aucun chemin d'authentification explicite n'est configuré, le démarrage de la passerelle résout en mode jeton et en génère un automatiquement, en l'enregistrant dans `gateway.auth.token`, donc **les clients WS locaux doivent s'authentifier**. Cela empêche d'autres processus locaux d'appeler la Gateway.

    Si vous préférez un chemin d'authentification différent, vous pouvez explicitement choisir le mode mot de passe (ou, pour les proxies inversés conscients de l'identité hors bouclage, `trusted-proxy`). Si vous voulez **vraiment** ouvrir le bouclage, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Doctor peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="Dois-je redémarrer après avoir modifié la configuration ?">
    La Gateway surveille la configuration et prend en charge le rechargement à chaud :

    - `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les modifications critiques
    - `hot`, `restart`, `off` sont également pris en charge

  </Accordion>

  <Accordion title="Comment désactiver les slogans drôles de la CLI ?">
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
    - `random` : slogans drôles/saisonniers rotatifs (comportement par défaut).
    - Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="Comment activer la recherche Web (et la récupération Web) ?">
    `web_fetch` fonctionne sans clé API. `web_search` dépend du fournisseur
    sélectionné :

    - Les fournisseurs pris en charge par une API tels que Brave, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Perplexity et Tavily nécessitent leur configuration de clé API habituelle.
    - Ollama Web Search est gratuit, mais il utilise votre hôte Ollama configuré et nécessite `ollama signin`.
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

    La configuration de recherche Web spécifique au fournisseur se trouve maintenant sous `plugins.entries.<plugin>.config.webSearch.*`.
    Les chemins de fournisseur hérités `tools.web.search.*` se chargent encore temporairement pour la compatibilité, mais ils ne devraient pas être utilisés pour les nouvelles configurations.
    La configuration de secours de récupération Web Firecrawl se trouve sous `plugins.entries.firecrawl.config.webFetch.*`.

    Notes :

    - Si vous utilisez des listes d'autorisation, ajoutez `web_search`/`web_fetch`/`x_search` ou `group:web`.
    - `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).
    - Si `tools.web.fetch.provider` est omis, OpenClaw détecte automatiquement le premier fournisseur de secours de récupération prêt parmi les identifiants disponibles. Aujourd'hui, le fournisseur intégré est Firecrawl.
    - Les démons lisent les variables d'environnement à partir de `~/.openclaw/.env` (ou de l'environnement de service).

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

    Évitez cela :

    - Utilisez `openclaw config set` pour les petits changements.
    - Utilisez `openclaw configure` pour les modifications interactives.
    - Utilisez `config.schema.lookup` d'abord lorsque vous n'êtes pas sûr d'un chemin exact ou de la forme d'un champ ; il renvoie un nœud de schéma superficiel plus des résumés des enfants immédiats pour l'exploration.
    - Utilisez `config.patch` pour les modifications RPC partielles ; gardez `config.apply` uniquement pour le remplacement complet de la configuration.
    - Si vous utilisez l'outil `gateway` réservé au propriétaire lors d'une exécution d'agent, il rejettera toujours les écritures sur `tools.exec.ask` / `tools.exec.security` (y compris les alias `tools.bash.*` hérités qui sont normalisés vers les mêmes chemins d'exécution protégés).

    Documentation : [Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="Comment exécuter un Gateway central avec des workers spécialisés sur plusieurs appareils ?">
    Le modèle courant est **un Gateway** (ex. Raspberry Pi) plus des **nodes** et des **agents** :

    - **Gateway (central) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
    - **Nodes (appareils) :** les Mac/iOS/Android se connectent en tant que périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`).
    - **Agents (workers) :** cerveaux/espaces de travail distincts pour des rôles spéciaux (ex. « ops Hetzner », « Données personnels »).
    - **Sous-agents :** lancent des tâches en arrière-plan depuis un agent principal lorsque vous voulez du parallélisme.
    - **TUI :** se connecte au Gateway et permute les agents/sessions.

    Docs : [Nodes](/en/nodes), [Accès distant](/en/gateway/remote), [Routage Multi-Agent](/en/concepts/multi-agent), [Sous-agents](/en/tools/subagents), [TUI](/en/web/tui).

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

    La valeur par défaut est `false` (mode headful). Le mode headless est plus susceptible de déclencher des vérifications anti-bot sur certains sites. Voir [Navigateur](/en/tools/browser).

    Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

    - Aucune fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
    - Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAS, anti-bot).
      Par exemple, X/Twitter bloque souvent les sessions headless.

  </Accordion>

  <Accordion title="Comment utiliser Brave pour le contrôle du navigateur ?">
    Définissez `browser.executablePath` sur votre binaire Brave (ou tout navigateur basé sur Chromium) et redémarrez le Gateway.
    Voir les exemples complets de configuration dans [Navigateur](/en/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Passerelles et nœuds distants

<AccordionGroup>
  <Accordion title="Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?">
    Les messages Telegram sont gérés par la **passerelle**. La passerelle exécute l'agent et
    n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

    Telegram → Telegram → Agent → `node.*` → Nœud → Gateway → Telegram

    Les nœuds ne voient pas le trafic entrant du provider ; ils ne reçoivent que les appels Gateway de nœud.

  </Accordion>

  <Accordion title="Comment mon agent peut-il accéder à mon ordinateur si la passerelle est hébergée à distance ?">
    Réponse courte : **associez votre ordinateur en tant que nœud**. La passerelle s'exécute ailleurs, mais elle peut
    appeler les outils `node.*` (écran, caméra, système) sur votre machine locale via le Gateway WebSocket.

    Configuration type :

    1. Exécutez la passerelle sur l'hôte toujours actif (VPS/serveur domestique).
    2. Placez l'hôte de la passerelle + votre ordinateur sur le même tailnet.
    3. Assurez-vous que le WS de la passerelle est accessible (liaison tailnet ou tunnel SSH).
    4. Ouvrez l'application Gateway localement et connectez-vous en mode **Remote over SSH** (ou tailnet direct)
       afin qu'elle puisse s'enregistrer en tant que nœud.
    5. Approuvez le nœud sur la passerelle :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Aucun pont TCP séparé n'est requis ; les nœuds se connectent via le Gateway WebSocket.

    Rappel de sécurité : associer un nœud Gateway permet `system.run` sur cette machine. N'associez
    que des appareils de confiance, et consultez la section [Sécurité](/en/gateway/security).

    Documentation : [Nœuds](/en/nodes), [Protocole de passerelle](/en/gateway/protocol), [Mode distant Gateway](/en/platforms/mac/remote), [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Tailscale est connecté mais je ne reçois aucune réponse. Et maintenant ?">
    Vérifiez les bases :

    - Tailscale est en cours d'exécution : `openclaw gateway status`
    - Santé du Gateway : `openclaw status`
    - Santé du canal : `openclaw channels status`

    Vérifiez ensuite l'authentification et le routage :

    - Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale` est défini correctement.
    - Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
    - Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

    Docs : [Tailscale](/en/gateway/tailscale), [Accès distant](/en/gateway/remote), [Canaux](/en/channels).

  </Accordion>

  <Accordion title="Deux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?">
    Oui. Il n'y a pas de pont "bot-vers-bot" intégré, mais vous pouvez le configurer de quelques
    manières fiables :

    **Le plus simple :** utilisez un canal de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
    Demandez au Bot A d'envoyer un message au Bot B, puis laissez le Bot B répondre comme d'habitude.

    **Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
    `openclaw agent --message ... --deliver`, en ciblant un chat où l'autre bot
    écoute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
    via SSH/Tailscale (voir [Accès distant](/en/gateway/remote)).

    Modèle d'exemple (exécuté depuis une machine qui peut atteindre le Gateway cible) :

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Astuce : ajoutez une garde-fou pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes d'autorisation de canal, ou une règle "ne pas répondre aux messages des bots").

    Docs : [Accès distant](/en/gateway/remote), [Agent CLI](/en/cli/agent), [Agent send](/en/tools/agent-send).

  </Accordion>

  <Accordion title="Do I need separate VPSes for multiple agents?">
    Non. Un Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, les paramètres par défaut du modèle,
    et le routage. C'est la configuration normale et c'est beaucoup moins cher et plus simple que de faire tourner
    un VPS par agent.

    Utilisez des VPS séparés uniquement lorsque vous avez besoin d'une isolation stricte (limites de sécurité) ou de configurations
    très différentes que vous ne souhaitez pas partager. Sinon, gardez un Gateway et
    utilisez plusieurs agents ou sous-agents.

  </Accordion>

  <Accordion title="Is there a benefit to using a node on my personal laptop instead of SSH from a VPS?">
    Oui - les nœuds constituent la méthode privilégiée pour accéder à votre ordinateur portable depuis un Gateway distant, et ils
    offrent plus qu'un simple accès shell. Le Gateway fonctionne sous macOS/Linux (Windows via WSL2) et est
    léger (un petit VPS ou une boîte de classe Raspberry Pi convient ; 4 Go de RAM suffisent), donc une configuration
    courante est un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

    - **Pas de SSH entrant requis.** Les nœuds se connectent au WebSocket du Gateway et utilisent l'appariement d'appareils.
    - **Contrôles d'exécution plus sûrs.** `system.run` est limité par les listes d'autorisation/approbations de nœud sur cet ordinateur portable.
    - **Plus d'outils d'appareil.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`.
    - **Automatisation du navigateur locale.** Gardez le Gateway sur un VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou attachez-vous au Chrome local sur l'hôte via Chrome MCP.

    Le SSH convient pour un accès shell ponctuel, mais les nœuds sont plus simples pour les workflows d'agents continus et
    l'automatisation des appareils.

    Documentation : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes), [Navigateur](/en/tools/browser).

  </Accordion>

  <Accordion title="Les nœuds exécutent-ils un service de passerelle ?">
    Non. Seule **une passerelle** doit être exécutée par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Passerelles multiples](/en/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
    à la passerelle (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds
    sans interface graphique et le contrôle CLI, voir [CLI de l'hôte de nœud](/en/cli/node).

    Un redémarrage complet est requis pour les modifications de `gateway`, `discovery` et `canvasHost`.

  </Accordion>

  <Accordion title="Existe-t-il un moyen API / RPC pour appliquer la configuration ?">
    Oui.

    - `config.schema.lookup` : inspecter un sous-arbre de configuration avec son nœud de schéma superficiel, l'indicateur d'interface utilisateur correspondant et les résumés des enfants immédiats avant l'écriture
    - `config.get` : récupérer l'instantané actuel + le hachage
    - `config.patch` : mise à jour partielle sécurisée (préféré pour la plupart des modifications RPC)
    - `config.apply` : valider + remplacer la configuration complète, puis redémarrer
    - L'outil d'exécution `gateway` réservé au propriétaire refuse toujours de réécrire `tools.exec.ask` / `tools.exec.security` ; les alias `tools.bash.*` hérités se normalisent vers les mêmes chemins d'exécution protégés

  </Accordion>

  <Accordion title="Configuration minimale saine pour une première installation">
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

    Cela maintient la passerelle liée à loopback et expose HTTPS via Tailscale. Voir [Tailscale](/en/gateway/tailscale).

  </Accordion>

  <Accordion title="Comment connecter un nœud Mac à une Gateway distante (Tailscale Serve) ?">
    Serve expose l'**interface de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS de la Gateway.

    Configuration recommandée :

    1. **Assurez-vous que le VPS et le Mac sont sur le même tailnet**.
    2. **Utilisez l'application macOS en mode Remote** (la cible SSH peut être le nom d'hôte du tailnet).
       L'application va tunneler le port de la Gateway et se connecter en tant que nœud.
    3. **Approuver le nœud** sur la gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentation : [Protocole Gateway](/en/gateway/protocol), [Discovery](/en/gateway/discovery), [Mode distant macOS](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?">
    Si vous avez seulement besoin d'**outils locaux** (écran/caméra/exec) sur le deuxième ordinateur portable, ajoutez-le en tant que
    **nœud**. Cela permet de garder une seule Gateway et évite une configuration en double. Les outils de nœud locaux sont
    actuellement uniquement disponibles sur macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

    Installez une deuxième Gateway uniquement lorsque vous avez besoin d'une **isolation stricte** ou de deux bots entièrement séparés.

    Documentation : [Nœuds](/en/nodes), [CLI Nœuds](/en/cli/nodes), [Gateways multiples](/en/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables d'environnement et chargement .env

<AccordionGroup>
  <Accordion title="Comment OpenClaw charge-t-il les variables d'environnement ?">
    OpenClaw lit les env vars du processus parent (shell, launchd/systemd, CI, etc.) et charge également :

    - `.env` depuis le répertoire de travail actuel
    - un `.env` de repli global depuis `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

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

    Consultez [/environment](/en/help/environment) pour l'ordre de priorité complet et les sources.

  </Accordion>

  <Accordion title="J'ai démarré le Gateway via le service et mes env vars ont disparu. Et maintenant ?">
    Deux solutions courantes :

    1. Placez les clés manquantes dans `~/.openclaw/.env` afin qu'elles soient récupérées même lorsque le service n'hérite pas de votre environnement de shell.
    2. Activez l'importation de shell (confort opt-in) :

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

    Cela exécute votre shell de connexion et n'importe que les clés attendues manquantes (ne remplace jamais). Équivalents en env vars :
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='I set COPILOT_GITHUB_TOKEN, but models status shows "Shell env: off." Why?'>
    `openclaw models status` indique si l'**importation de l'environnement du shell** est activée. « Shell env: off »
    ne signifie **pas** que vos env vars sont manquantes - cela signifie simplement qu'OpenClaw ne chargera
    pas votre shell de connexion automatiquement.

    Si le Gateway s'exécute en tant que service (launchd/systemd), il n'héritera pas de votre
    environnement de shell. Corrigez cela en faisant l'une des opérations suivantes :

    1. Placez le jeton dans `~/.openclaw/.env` :

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
    3. Ou ajoutez-le à votre bloc de configuration `env` (s'applique uniquement en cas d'absence).

    Redémarrez ensuite la passerelle et revérifiez :

    ```bash
    openclaw models status
    ```

    Les jetons Copilot sont lus depuis `COPILOT_GITHUB_TOKEN` (aussi `GH_TOKEN` / `GITHUB_TOKEN`).
    Voir [/concepts/model-providers](/en/concepts/model-providers) et [/environment](/en/help/environment).

  </Accordion>
</AccordionGroup>

## Sessions et conversations multiples

<AccordionGroup>
  <Accordion title="How do I start a fresh conversation?">
    Envoyez `/new` ou `/reset` comme message autonome. Voir [Gestion de session](/en/concepts/session).
  </Accordion>

  <Accordion title="Do sessions reset automatically if I never send /new?">
    Les sessions peuvent expirer après `session.idleMinutes`, mais cela est **désactivé par défaut** (par défaut **0**).
    Définissez-le sur une valeur positive pour activer l'expiration par inactivité. Lorsqu'elle est activée, le message **suivant**
    après la période d'inactivité lance un identifiant de session frais pour cette clé de chat.
    Cela ne supprime pas les transcriptions - cela commence simplement une nouvelle session.

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

    Cela dit, c'est mieux vu comme une **expérience amusante**. C'est lourd en tokens et souvent
    moins efficace que d'utiliser un bot avec des sessions séparées. Le modèle typique que nous
    envisageons est un bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
    bot peut également générer des sous-agents si nécessaire.

    Docs : [Routage multi-agents](/en/concepts/multi-agent), [Sous-agents](/en/tools/subagents), [CLI des agents](/en/cli/agents).

  </Accordion>

  <Accordion title="Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment l'empêcher ?">
    Le contexte de session est limité par la fenêtre du modèle. Les longues discussions, les grandes sorties d'outils ou de nombreux
    fichiers peuvent déclencher une compactage ou une troncation.

    Ce qui aide :

    - Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
    - Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
    - Gardez un contexte important dans l'espace de travail et demandez au bot de le relire.
    - Utilisez des sous-agents pour des travaux longs ou parallèles afin que la discussion principale reste plus petite.
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

    - L'intégration propose également **Réinitialiser** s'il détecte une configuration existante. Voir [Intégration (CLI)](/en/start/wizard).
    - Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (par défaut `~/.openclaw-<profile>`).
    - Réinitialisation Dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + identifiants + sessions + espace de travail).

  </Accordion>

  <Accordion title='Je reçois des erreurs "context too large" - comment réinitialiser ou compacter ?'>
    Utilisez l'une de ces méthodes :

    - **Compacter** (conserve la conversation mais résume les tours précédents) :

      ```
      /compact
      ```

      ou `/compact <instructions>` pour guider le résumé.

    - **Réinitialiser** (nouvel ID de session pour la même clé de chat) :

      ```
      /new
      /reset
      ```

    Si cela continue de se produire :

    - Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
    - Utilisez un modèle avec une fenêtre de contexte plus large.

    Documentation : [Compaction](/en/concepts/compaction), [Session pruning](/en/concepts/session-pruning), [Session management](/en/concepts/session).

  </Accordion>

  <Accordion title='Pourquoi vois-je "LLM request rejected: messages.content.tool_use.input field required" ?'>
    Il s'agit d'une erreur de validation du fournisseur : le modèle a émis un bloc `tool_use` sans le `input` requis. Cela signifie généralement que l'historique de la session est périmé ou corrompu (souvent après de longs fils de discussion ou un changement d'outil/de schéma).

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

    Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API.
    Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide de ce qu'il faut faire.

    Les overrides par agent utilisent `agents.list[].heartbeat`. Documentation : [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title='Dois-je ajouter un « compte bot » à un groupe WhatsApp ?'>
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

  <Accordion title="Comment obtenir le JID d'un groupe WhatsApp ?">
    Option 1 (la plus rapide) : surveillez les journaux (tail logs) et envoyez un message test dans le groupe :

    ```bash
    openclaw logs --follow --json
    ```

    Recherchez `chatId` (ou `from`) se terminant par `@g.us`, par exemple :
    `1234567890-1234567890@g.us`.

    Option 2 (si déjà configuré/autorisé) : lister les groupes depuis la configuration :

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Docs : [WhatsApp](/en/channels/whatsapp), [Répertoire](/en/cli/directory), [Journaux](/en/cli/logs).

  </Accordion>

  <Accordion title="Pourquoi OpenClaw ne répond-il pas dans un groupe ?">
    Deux causes courantes :

    - Le filtrage par mention est activé (par défaut). Vous devez @mentionner le bot (ou correspondre à `mentionPatterns`).
    - Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas sur la liste autorisée.

    Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).

  </Accordion>

<Accordion title="Les groupes/fils de discussion partagent-ils le contexte avec les DMs ?">
  Les discussions directes sont réduites à la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / les fils de discussion Discord sont des sessions distinctes. Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).
</Accordion>

  <Accordion title="Combien d'espaces de travail et d'agents puis-je créer ?">
    Aucune limite stricte. Des dizaines (voire des centaines) sont possibles, mais surveillez :

    - **Croissance du disque :** les sessions + les transcriptions se trouvent sous `~/.openclaw/agents/<agentId>/sessions/`.
    - **Coût des jetons :** plus d'agents signifient plus d'utilisation simultanée de modèles.
    - **Surcharge opérationnelle :** profils d'authentification par agent, espaces de travail et routage de channel.

    Conseils :

    - Conservez un espace de travail **actif** par agent (`agents.defaults.workspace`).
    - Nettoyez les anciennes sessions (supprimez les JSONL ou les entrées de stockage) si le disque grossit.
    - Utilisez `openclaw doctor` pour repérer les espaces de travail orphelins et les inadéquations de profils.

  </Accordion>

  <Accordion title="Puis-je exécuter plusieurs bots ou discussions en même temps (Slack), et comment dois-je configurer cela ?">
    Oui. Utilisez le **routage multi-agents** pour exécuter plusieurs agents isolés et acheminer les messages entrants par
    channel/compte/pair. Slack est pris en charge en tant que channel et peut être lié à des agents spécifiques.

    L'accès via navigateur est puissant mais n'est pas « faire tout ce qu'un humain peut faire » — anti-bot, CAPTCHA et MFA peuvent
    toujours bloquer l'automatisation. Pour le contrôle de navigateur le plus fiable, utilisez Chrome MCP local sur l'hôte,
    ou utilisez CDP sur la machine qui exécute réellement le navigateur.

    Configuration recommandée :

    - Hôte Gateway toujours actif (VPS/Mac mini).
    - Un agent par rôle (liaisons).
    - Channel(s) Slack lié(s) à ces agents.
    - Navigateur local via Chrome MCP ou un nœud si nécessaire.

    Documentation : [Multi-Agent Routing](/en/concepts/multi-agent), [Slack](/en/channels/slack),
    [Browser](/en/tools/browser), [Nodes](/en/nodes).

  </Accordion>
</AccordionGroup>

## Modèles : valeurs par défaut, sélection, alias, basculement

<AccordionGroup>
  <Accordion title='Qu'est-ce que le « modèle par défaut » ?'>
    Le modèle par défaut d'OpenClaw est celui que vous avez défini comme :

    ```
    agents.defaults.model.primary
    ```

    Les modèles sont référencés sous la forme `provider/model` (exemple : `openai/gpt-5.4`). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique avec le fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite au fournisseur par défaut configuré qu'en tant que chemin de compatibilité obsolète. Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un ancien modèle par défaut d'un fournisseur supprimé. Vous devriez toujours définir `provider/model` **explicitement**.

  </Accordion>

  <Accordion title="Quel modèle recommandez-vous ?">
    **Par défaut recommandé :** utilisez le modèle le plus puissant de la dernière génération disponible dans votre pile de fournisseurs.
    **Pour les agents avec outils ou entrées non fiables :** privilégiez la puissance du modèle plutôt que le coût.
    **Pour les discussions routinières ou à faible enjeu :** utilisez des modèles de repli moins chers et acheminez par rôle d'agent.

    MiniMax possède sa propre documentation : [MiniMax](/en/providers/minimax) et
    [Modèles locaux](/en/gateway/local-models).

    Règle empirique : utilisez le **meilleur modèle que vous pouvez vous offrir** pour le travail à enjeux élevés, et un modèle
    moins cher pour les discussions de routine ou les résumés. Vous pouvez acheminer les modèles par agent et utiliser des sous-agents pour
    paralléliser les longues tâches (chaque sous-agent consomme des tokens). Voir [Modèles](/en/concepts/models) et
    [Sous-agents](/en/tools/subagents).

    Avertissement sérieux : les modèles plus faibles ou trop quantifiés sont plus vulnérables aux injections de
    prompt et aux comportements non sécurisés. Voir [Sécurité](/en/gateway/security).

    Plus de contexte : [Modèles](/en/concepts/models).

  </Accordion>

  <Accordion title="Comment changer de model sans effacer ma configuration ?">
    Utilisez les commandes de **model** ou modifiez uniquement les champs du **model**. Évitez les remplacements complets de la configuration.

    Options sûres :

    - `/model` dans le chat (rapide, par session)
    - `openclaw models set ...` (met à jour uniquement la configuration du model)
    - `openclaw configure --section model` (interactif)
    - modifier `agents.defaults.model` dans `~/.openclaw/openclaw.json`

    Évitez `config.apply` avec un objet partiel à moins de vouloir remplacer toute la configuration.
    Pour les modifications RPC, inspectez d'abord avec `config.schema.lookup` et préférez `config.patch`. La charge utile de recherche vous donne le chemin normalisé, la documentation/contraintes du schéma superficiel et les résumés des enfants immédiats.
    pour les mises à jour partielles.
    Si vous avez écrasé la configuration, restaurez-la à partir d'une sauvegarde ou relancez `openclaw doctor` pour réparer.

    Docs : [Models](/en/concepts/models), [Configure](/en/cli/configure), [Config](/en/cli/config), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?">
    Oui. Ollama est la solution la plus simple pour les modèles locaux.

    Installation la plus rapide :

    1. Installez Ollama depuis `https://ollama.com/download`
    2. Téléchargez un modèle local tel que `ollama pull glm-4.7-flash`
    3. Si vous souhaitez également utiliser des modèles cloud, exécutez `ollama signin`
    4. Exécutez `openclaw onboard` et choisissez `Ollama`
    5. Sélectionnez `Local` ou `Cloud + Local`

    Notes :

    - `Cloud + Local` vous donne accès aux modèles cloud ainsi qu'à vos modèles Ollama locaux
    - les modèles cloud tels que `kimi-k2.5:cloud` n'ont pas besoin d'être téléchargés localement
    - pour une commutation manuelle, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

    Note de sécurité : les modèles plus petits ou fortement quantisés sont plus vulnérables à l'injection de prompt.
    Nous recommandons vivement des **modèles de grande taille** pour tout bot pouvant utiliser des outils.
    Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et les listes strictes d'outils autorisés.

    Docs : [Ollama](/en/providers/ollama), [Modèles locaux](/en/gateway/local-models),
    [Fournisseurs de modèles](/en/concepts/model-providers), [Sécurité](/en/gateway/security),
    [Sandboxing](/en/gateway/sandboxing).

  </Accordion>

<Accordion title="Que utilisent OpenClaw, Flawd et Krill pour les modèles ?">
  - Ces déploiements peuvent différer et évoluer avec le temps ; il n'y a pas de recommandation fixe de fournisseur. - Vérifiez le paramètre d'exécution actuel sur chaque passerelle avec `openclaw models status`. - Pour les agents sensibles à la sécurité ou activant des outils, utilisez le modèle le plus puissant de la dernière génération disponible.
</Accordion>

  <Accordion title="Comment changer de model à la volée (sans redémarrage) ?">
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

    Ce sont les alias intégrés. Des alias personnalisés peuvent être ajoutés via `agents.defaults.models`.

    Vous pouvez lister les models disponibles avec `/model`, `/model list`, ou `/model status`.

    `/model` (et `/model list`) affiche un sélecteur compact numéroté. Sélectionnez par numéro :

    ```
    /model 3
    ```

    Vous pouvez également forcer un profil d'authentification spécifique pour le provider (par session) :

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Astuce : `/model status` montre quel agent est actif, quel fichier `auth-profiles.json` est utilisé, et quel profil d'authentification sera essayé ensuite.
    Il montre également le point de terminaison du provider configuré (`baseUrl`) et le mode API (`api`) si disponibles.

    **Comment annuler l'épinglage d'un profil défini avec @profile ?**

    Relancez `/model` **sans** le suffixe `@profile` :

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si vous souhaitez revenir à la valeur par défaut, sélectionnez-la depuis `/model` (ou envoyez `/model <default provider/model>`).
    Utilisez `/model status` pour confirmer quel profil d'authentification est actif.

  </Accordion>

  <Accordion title="Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage ?">
    Oui. Définissez l'un par défaut et changez au besoin :

    - **Changement rapide (par session) :** `/model gpt-5.4` pour les tâches quotidiennes, `/model openai-codex/gpt-5.4` pour le codage avec Codex OAuth.
    - **Par défaut + changement :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.4`, puis passez à `openai-codex/gpt-5.4` lors du codage (ou inversement).
    - **Sous-agents :** acheminez les tâches de codage vers des sous-agents avec un model par défaut différent.

    Voir [Models](/en/concepts/models) et [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Comment configurer le mode rapide pour GPT 5.4 ?">
    Utilisez soit un commutateur de session, soit une configuration par défaut :

    - **Par session :** envoyez `/fast on` alors que la session utilise `openai/gpt-5.4` ou `openai-codex/gpt-5.4`.
    - **Par défaut de model :** définissez `agents.defaults.models["openai/gpt-5.4"].params.fastMode` sur `true`.
    - **Codex OAuth aussi :** si vous utilisez également `openai-codex/gpt-5.4`, définissez le même indicateur.

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

    Pour OpenAI, le mode rapide correspond à `service_tier = "priority"` sur les requêtes Responses natives prises en charge. Le `/fast` de la session remplace les configurations par défaut.

    Voir [Thinking and fast mode](/en/tools/thinking) et [OpenAI fast mode](/en/providers/openai#openai-fast-mode).

  </Accordion>

  <Accordion title='Pourquoi vois-je "Model ... is not allowed" et ensuite aucune réponse ?'>
    Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et toutes
    les substitutions de session. Choisir un model qui n'est pas dans cette liste renvoie :

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Cette erreur est renvoyée **à la place de** une réponse normale. Correctif : ajoutez le model à
    `agents.defaults.models`, supprimez la liste d'autorisation, ou choisissez un model parmi `/model list`.

  </Accordion>

  <Accordion title='Pourquoi vois-je « Unknown model: minimax/MiniMax-M2.7 » ?'>
    Cela signifie que le **fournisseur n'est pas configuré** (aucune configuration de fournisseur MiniMax ou profil d'authentification n'a été trouvé), donc le modèle ne peut pas être résolu.

    Liste de vérification pour la correction :

    1. Mettez à niveau vers une version actuelle d'OpenClaw (ou exécutez à partir du code source `main`), puis redémarrez la passerelle.
    2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou que l'authentification MiniMax
       existe dans les profils env/auth afin que le fournisseur correspondant puisse être injecté
       (`MINIMAX_API_KEY` pour `minimax`, `MINIMAX_OAUTH_TOKEN` ou MiniMax
       OAuth stocké pour `minimax-portal`).
    3. Utilisez l'identifiant exact du modèle (sensible à la casse) pour votre chemin d'authentification :
       `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed` pour la configuration
       par clé API, ou `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` pour la configuration OAuth.
    4. Exécutez :

       ```bash
       openclaw models list
       ```

       et choisissez dans la liste (ou `/model list` dans le chat).

    Voir [MiniMax](/en/providers/minimax) et [Modèles](/en/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes ?">
    Oui. Utilisez **MiniMax par défaut** et changez de modèle **par session** si nécessaire.
    Les basculements (fallbacks) sont pour les **erreurs**, pas pour les « tâches difficiles », utilisez donc `/model` ou un agent séparé.

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

    Documentation : [Modèles](/en/concepts/models), [Routage multi-agent](/en/concepts/multi-agent), [MiniMax](/en/providers/minimax), [OpenAI](/en/providers/openai).

  </Accordion>

  <Accordion title="Les raccourcis opus / sonnet / gpt sont-ils intégrés ?">
    Oui. OpenClaw inclut quelques raccourcis par défaut (uniquement appliqués lorsque le modèle existe dans `agents.defaults.models`) :

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

  <Accordion title="Comment définir ou remplacer les raccourcis de modèle (alias) ?">
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

    Si vous référencez un fournisseur/modèle mais que la clé de fournisseur requise est manquante, vous obtiendrez une erreur d'authentification lors de l'exécution (par ex. `No API key found for provider "zai"`).

    **Aucune clé API trouvée pour le fournisseur après avoir ajouté un nouvel agent**

    Cela signifie généralement que le **nouvel agent** a un stockage d'authentification vide. L'authentification est par agent et
    stockée dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Options de correction :

    - Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
    - Ou copiez `auth-profiles.json` à partir du `agentDir` de l'agent principal vers le `agentDir` du nouvel agent.

    **Ne** réutilisez **pas** `agentDir` entre les agents ; cela provoque des collisions d'authentification/session.

  </Accordion>
</AccordionGroup>

## Basculement de modèle et "Tous les modèles ont échoué"

<AccordionGroup>
  <Accordion title="Comment fonctionne le basculement ?">
    Le basculement se produit en deux étapes :

    1. **Rotation du profil d'authentification** au sein du même fournisseur.
    2. **Basculement de model** vers le model suivant dans `agents.defaults.model.fallbacks`.

    Des temps de refroidissement s'appliquent aux profils en échec (backoff exponentiel), afin qu'OpenClaw puisse continuer à répondre même lorsqu'un fournisseur est limité par son débit ou en échec temporaire.

    Le bucket de limitation de débit inclut plus que de simples réponses `429`. OpenClaw
    traite également les messages tels que `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted`, et les limites
    périodiques de fenêtre d'utilisation (`weekly/monthly limit reached`) comme des limitations
    de débit justifiant un basculement.

    Certaines ressemblances à des réponses de facturation ne sont pas `402`, et certaines réponses HTTP `402`
    restent également dans ce bucket transitoire. Si un fournisseur renvoie
    du texte de facturation explicite sur `401` ou `403`, OpenClaw peut tout de même le conserver dans
    la voie de facturation, mais les correspondances de texte spécifiques au fournisseur restent limitées au
    fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Si un message `402`
    ressemble plutôt à une limite de dépense réessayable de fenêtre d'utilisation ou
    d'organisation/espace de travail (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw le traite comme
    `rate_limit`, et non comme une désactivation longue de la facturation.

    Les erreurs de dépassement de contexte sont différentes : les signatures telles que
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, ou `ollama error: context length
    exceeded` restent sur le chemin de compactage/nouvelle tentative au lieu d'avancer le basculement de model.

    Le texte générique d'erreur serveur est intentionnellement plus restreint que "n'importe quoi avec
    unknown/error dedans". OpenClaw traite bien les formes transitoires limitées au fournisseur
    telles que Anthropic nu `An unknown error occurred`, OpenRouter nu
    `Provider returned error`, les erreurs de raison d'arrêt comme `Unhandled stop reason:
    error`, JSON `api_error` avec du texte serveur transitoire
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` comme
    signaux de dépassement de délai/surcharge justifiant un basculement lorsque le contexte du fournisseur
    correspond.
    Le texte générique de repli interne comme `LLM request failed with an unknown
    error.` reste conservateur et ne déclenche pas par lui-même le basculement de model.

  </Accordion>

  <Accordion title='Que signifie « No credentials found for profile anthropic:default » ?'>
    Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver d'identifiants pour celui-ci dans le magasin d'authentification attendu.

    **Liste de vérification des correctifs :**

    - **Confirmer l'emplacement des profils d'authentification** (nouveaux chemins par rapport aux anciens)
      - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Ancien : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
    - **Confirmer que votre variable d'environnement est chargée par le Gateway**
      - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais que vous exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-la dans `~/.openclaw/.env` ou activez `env.shellEnv`.
    - **Assurez-vous de modifier l'agent correct**
      - Les configurations multi-agents impliquent qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
    - **Vérifier le statut du modèle/de l'authentification**
      - Utilisez `openclaw models status` pour voir les modèles configurés et si les fournisseurs sont authentifiés.

    **Liste de vérification des correctifs pour « No credentials found for profile anthropic »**

    Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que le Gateway
    ne parvient pas à le trouver dans son magasin d'authentification.

    - **Utiliser la CLI Claude**
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
    Si votre configuration de modèle inclut Google Gemini comme solution de repli (ou si vous avez passé à un raccourci Gemini), OpenClaw essaiera de l'utiliser lors du repli de modèle. Si vous n'avez pas configuré les identifiants Google, vous verrez `No API key found for provider "google"`.

    Correction : fournissez soit l'authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias afin que le repli ne soit pas acheminé vers eux.

    **LLM demande rejetée : signature de pensée requise (Google Antigravity)**

    Cause : l'historique de la session contient des **blocs de pensée sans signatures** (souvent provenant d'un flux interrompu/partiel). Google Antigravity nécessite des signatures pour les blocs de pensée.

    Correction : OpenClaw supprime désormais les blocs de pensée non signés pour Google Antigravity Claude. Si cela persiste, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

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

    - `anthropic:default` (courant lorsqu'aucune identité de courriel n'existe)
    - `anthropic:<email>` pour les identités OAuth
    - des ID personnalisés de votre choix (par exemple `anthropic:work`)

  </Accordion>

  <Accordion title="Puis-je contrôler quel profil d'authentification est essayé en premier ?">
    Oui. La configuration prend en charge des métadonnées facultatives pour les profils et un ordre par fournisseur (`auth.order.<provider>`). Cela ne stocke **pas** de secrets ; il mappe les ID au fournisseur/mode et définit l'ordre de rotation.

    OpenClaw peut temporairement ignorer un profil s'il est dans un court **délai de repos** (limitations de délai/délais d'attente/échecs d'authentification) ou un état **désactivé** plus long (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

    Les délais de repos pour les limitations de taux peuvent être limités au modèle. Un profil qui est en refroidissement pour un modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur, tandis que les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil.

    Vous pouvez également définir une priorité d'ordre **par agent** (stockée dans le fichier `auth-profiles.json` de cet agent) via le CLI :

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

    Si un profil stocké est omis de l'ordre explicite, la sonde signale `excluded_by_auth_order` pour ce profil au lieu de l'essayer silencieusement.

  </Accordion>

  <Accordion title="OAuth vs clé API - quelle est la différence ?">
    OpenClaw prend en charge les deux :

    - **OAuth** utilise souvent l'accès par abonnement (le cas échéant).
    - Les **clés API** utilisent la facturation paye par jeton.

    L'assistant prend en charge explicitement le Anthropic de CLI Claude, OpenAI OAuth Codex de API et les clés API.

  </Accordion>
</AccordionGroup>

## Gateway : ports, « déjà en cours d'exécution » et mode distant

<AccordionGroup>
  <Accordion title="Quel port le Gateway utilise-t-il ?">
    `gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (interface de contrôle, hooks, etc.).

    Priorité :

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw indique-t-il "Runtime : running" mais "RPC probe : failed" ?'>
    Parce que "running" est la vue du **superviseur** (launchd/systemd/schtasks). La sonde RPC est la RPC se connectant réellement au WebSocket de la passerelle et appelant `status`.

    Utilisez `openclaw gateway status` et faites confiance à ces lignes :

    - `Probe target:` (l'URL réellement utilisée par la sonde)
    - `Listening:` (ce qui est réellement lié au port)
    - `Last gateway error:` (cause racine courante lorsque le processus est actif mais que le port n'est pas à l'écoute)

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw affiche-t-il des configurations différentes pour "Config (cli)" et "Config (service)" ?'>
    Vous modifiez un fichier de configuration pendant que le service en utilise un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

    Correction :

    ```bash
    openclaw gateway install --force
    ```

    Exécutez cela à partir du même `--profile` / environnement que vous souhaitez que le service utilise.

  </Accordion>

  <Accordion title='Que signifie "another gateway instance is already listening" ?'>
    OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il génère `GatewayLockError` indiquant qu'une autre instance est déjà à l'écoute.

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

    - `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou si vous passez le paramètre de forçage).
    - L'application macOS surveille le fichier de configuration et change de mode en direct lorsque ces valeurs changent.
    - `gateway.remote.token` / `.password` sont des identifiants distants côté client uniquement ; ils n'activent pas par eux-mêmes l'authentification de la passerelle locale.

  </Accordion>

  <Accordion title='L'interface de contrôle indique « non autorisé » (ou se reconnecte en continu). Que faire ?'>
    Le chemin d'authentification de votre passerelle et la méthode d'authentification de l'interface ne correspondent pas.

    Faits (issus du code) :

    - L'interface de contrôle conserve le jeton dans `sessionStorage` pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée, afin que les actualisations dans le même onglet continuent de fonctionner sans restaurer la persistance des jetons localStorage à long terme.
    - Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative délimitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Cette nouvelle tentative avec jeton mis en cache réutilise désormais les étendues approuvées mises en cache stockées avec le jeton d'appareil. Les appelants explicites `deviceToken` / explicites `scopes` conservent toujours leur ensemble d'étendues demandées au lieu d'hériter des étendues mises en cache.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Les vérifications de l'étendue du jeton d'amorçage sont préfixées par rôle. La liste d'autorisation de l'opérateur d'amorçage intégré ne satisfait que les demandes de l'opérateur ; les nœuds ou d'autres rôles non-opérateurs ont toujours besoin d'étendues sous leur propre préfixe de rôle.

    Correction :

    - Le plus rapide : `openclaw dashboard` (imprime + copie l'URL du tableau de bord, tente de l'ouvrir ; affiche un indice SSH sans interface graphique).
    - Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
    - Si à distance, commencez par un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
    - Mode secret partagé : définissez `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ou `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, puis collez le secret correspondant dans les paramètres de l'interface de contrôle.
    - Mode Serve Tailscale : assurez-vous que `gateway.auth.allowTailscale` est activé et que vous ouvrez l'URL de Serve, et non une URL de bouclage/tailnet brute qui contourne les en-têtes d'identité Tailscale.
    - Mode proxy de confiance : assurez-vous que vous passez par le proxy identitaire sans bouclage configuré, et non par un proxy de bouclage sur le même hôte ou par l'URL brute de la passerelle.
    - Si la discordance persiste après la nouvelle tentative unique, faites pivoter/réapprouvez le jeton d'appareil jumelé :
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si cet appel de rotation indique qu'il a été refusé, vérifiez deux choses :
      - les sessions d'appareil jumelé ne peuvent faire pivoter que leur **propre** appareil à moins qu'elles n'aient également `operator.admin`
      - les valeurs `--scope` explicites ne peuvent pas dépasser les étendues d'opérateur actuelles de l'appelant
    - Toujours bloqué ? Exécutez `openclaw status --all` et suivez [Dépannage](/en/gateway/troubleshooting). Voir [Tableau de bord](/en/web/dashboard) pour les détails d'authentification.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind choisit une IP Tailscale parmi vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou si l'interface est désactivée), il n'y a rien à lier.

    Correction :

    - Démarrez Tailscale sur cet hôte (afin qu'il ait une adresse 100.x), ou
    - Basculez sur `gateway.bind: "loopback"` / `"lan"`.

    Remarque : `tailnet` est explicite. `auto` préfère le bouclage ; utilisez `gateway.bind: "tailnet"` lorsque vous souhaitez une liaison tailnet uniquement.

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    Généralement non - un seul Gateway peut exécuter plusieurs canaux de messagerie et agents. Utilisez plusieurs Gateways uniquement lorsque vous avez besoin de redondance (ex : robot de secours) ou d'un isolement strict.

    Oui, mais vous devez isoler :

    - `OPENCLAW_CONFIG_PATH` (configuration par instance)
    - `OPENCLAW_STATE_DIR` (état par instance)
    - `agents.defaults.workspace` (isolement de l'espace de travail)
    - `gateway.port` (ports uniques)

    Configuration rapide (recommandée) :

    - Utilisez `openclaw --profile <name> ...` par instance (crée automatiquement `~/.openclaw-<name>`).
    - Définissez un `gateway.port` unique dans chaque configuration de profil (ou passez `--port` pour les exécutions manuelles).
    - Installez un service par profil : `openclaw --profile <name> gateway install`.

    Les profils suffixent également les noms de service (`ai.openclaw.<profile>` ; ancien `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guide complet : [Multiple gateways](/en/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='Que signifie « invalid handshake » / code 1008 ?'>
    Le Gateway est un serveur **WebSocket**, et il s'attend à ce que le tout premier message soit
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

    Si vous utilisez le CLI ou la TUI, l'URL devrait ressembler à :

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Détails du protocole : [Protocole Gateway](/en/gateway/protocol).

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

    Suivi de journal le plus rapide :

    ```bash
    openclaw logs --follow
    ```

    Journaux de service/superviseur (lorsque la passerelle est exécutée via launchd/systemd) :

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

    **1) WSL2 (recommandé) :** le Gateway s'exécute à l'intérieur de Linux.

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

    Docs : [Windows (WSL2)](/en/platforms/windows), [Manuel de procédure du service Gateway](/en/gateway).

  </Accordion>

  <Accordion title="Le Gateway est opérationnel mais les réponses n'arrivent jamais. Que dois-je vérifier ?">
    Commencez par une vérification rapide de l'état de santé :

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causes courantes :

    - Authentification du modèle non chargée sur l'**hôte gateway** (vérifiez `models status`).
    - Appariement de canal / liste autorisée bloquant les réponses (vérifiez la configuration du canal + les logs).
    - WebChat/Dashboard est ouvert sans le bon jeton.

    Si vous êtes à distance, confirmez que la connexion tunnel/Tailscale est active et que le
    WebSocket du Gateway est accessible.

    Docs : [Canaux](/en/channels), [Dépannage](/en/gateway/troubleshooting), [Accès à distance](/en/gateway/remote).

  </Accordion>

  <Accordion title='"Déconnecté du gateway : aucune raison" - et maintenant ?'>
    Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

    1. Le Gateway est-il en cours d'exécution ? `openclaw gateway status`
    2. Le Gateway est-il en bonne santé ? `openclaw status`
    3. L'interface utilisateur possède-t-elle le bon jeton ? `openclaw dashboard`
    4. Si vous êtes à distance, la liaison tunnel/Tailscale est-elle active ?

    Ensuite, consultez les logs :

    ```bash
    openclaw logs --follow
    ```

    Docs : [Dashboard](/en/web/dashboard), [Accès à distance](/en/gateway/remote), [Dépannage](/en/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Échec de Telegram setMyCommands. Que dois-je vérifier ?">
    Commencez par vérifier les journaux et l'état du channel :

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Ensuite, identifiez l'erreur :

    - `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà au nombre limite de Telegram et réessaie avec moins de commandes, mais certaines entrées du menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le trafic HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

    Si le Gateway est distant, assurez-vous de consulter les journaux sur l'hôte du Gateway.

    Docs : [Telegram](/en/channels/telegram), [Channel troubleshooting](/en/channels/troubleshooting).

  </Accordion>

  <Accordion title="L'interface TUI n'affiche aucune sortie. Que dois-je vérifier ?">
    Confirmez d'abord que le Gateway est accessible et que l'agent peut s'exécuter :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    Dans l'interface TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un channel de chat, assurez-vous que la livraison est activée (`/deliver on`).

    Docs : [TUI](/en/web/tui), [Slash commands](/en/tools/slash-commands).

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

    Docs : [Gateway service runbook](/en/gateway).

  </Accordion>

  <Accordion title="ELI5 : redémarrage de la passerelle openclaw vs openclaw gateway">
    - `openclaw gateway restart` : redémarre le **service en arrière-plan** (launchd/systemd).
    - `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

    Si vous avez installé le service, utilisez les commandes de la passerelle. Utilisez `openclaw gateway` lorsque
    vous souhaitez une exécution ponctuelle, au premier plan.

  </Accordion>

  <Accordion title="Le moyen le plus rapide d'obtenir plus de détails en cas d'échec">
    Démarrez la Gateway avec `--verbose` pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de canal, le routage des modèles et les erreurs RPC.
  </Accordion>
</AccordionGroup>

## Médias et pièces jointes

<AccordionGroup>
  <Accordion title="Ma compétence a généré une image/PDF, mais rien n'a été envoyé">
    Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir [configuration de l'assistant OpenClaw](/en/start/openclaw) et [Envoi d'agent](/en/tools/agent-send).

    Envoi CLI :

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    Vérifiez également :

    - Le canal cible prend en charge les médias sortants et n'est pas bloqué par les listes d'autorisation.
    - Le fichier est dans les limites de taille du fournisseur (les images sont redimensionnées à un maximum de 2048 px).
    - `tools.fs.workspaceOnly=true` limite les envois de chemin local à l'espace de travail, au magasin de médias temporaires et aux fichiers validés par le bac à sable.
    - `tools.fs.workspaceOnly=false` permet à `MEDIA:` d'envoyer des fichiers locaux à l'hôte que l'agent peut déjà lire, mais uniquement pour les médias plus certains types de documents sûrs (images, audio, vidéo, PDF et documents Office). Les fichiers en texte brut et ceux ressemblant à des secrets sont toujours bloqués.

    Voir [Images](/en/nodes/images).

  </Accordion>
</AccordionGroup>

## Sécurité et contrôle d'accès

<AccordionGroup>
  <Accordion title="Est-il sûr d'exposer OpenClaw aux DM entrants ?">
    Traitez les DM entrants comme une entrée non fiable. Les paramètres par défaut sont conçus pour réduire les risques :

    - Le comportement par défaut sur les DM-capable channels est **l'appariement** (pairing) :
      - Les expéditeurs inconnus reçoivent un code d'appariement ; le bot ne traite pas leur message.
      - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Les demandes en attente sont limitées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
    - L'ouverture publique des DM nécessite une adhésion explicite (`dmPolicy: "open"` et liste d'autorisation `"*"`).

    Exécutez `openclaw doctor` pour révéler les politiques de DM risquées.

  </Accordion>

  <Accordion title="L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?">
    Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut DM le bot.
    Si votre assistant lit du contenu externe (recherche/récupération web, pages de navigateur, e-mails,
    docs, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
    de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

    Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé et
    exfiltrer du contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

    - utilisant un agent "lecteur" en lecture seule ou sans outil pour résumer le contenu non fiable
    - gardant `web_search` / `web_fetch` / `browser` désactivés pour les agents avec outils activés
    - traitant le texte des fichiers/documents décodés comme non fiable également : OpenResponses
      `input_file` et l'extraction de pièces jointes médias enveloppent tous deux le texte extrait dans
      des marqueurs de limite de contenu externe explicites au lieu de transmettre le texte brut du fichier
    - utilisant le sandboxing et des listes d'autorisation d'outils strictes

    Détails : [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="Mon bot doit-il avoir sa propre adresse e-mail, compte GitHub ou numéro de téléphone ?">
    Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone séparés
    réduit l'impact en cas de problème. Cela facilite également la rotation des
    identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

    Commencez modestement. Donnez l'accès uniquement aux outils et comptes dont vous avez réellement besoin, et étendez
    plus tard si nécessaire.

    Documentation : [Sécurité](/en/gateway/security), [Appairage](/en/channels/pairing).

  </Accordion>

  <Accordion title="Puis-je lui donner une autonomie sur mes SMS et est-ce sans risque ?">
    Nous ne recommandons **pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

    - Garder les GitHub en **mode appairage** ou dans une liste d'autorisation stricte.
    - Utiliser un **numéro ou un compte séparé** si vous voulez qu'il envoie des messages en votre nom.
    - Laisser-le rédiger, puis **approuver avant l'envoi**.

    Si vous souhaitez expérimenter, faites-le sur un compte dédié et gardez-le isolé. Voir
    [Sécurité](/en/gateway/security).

  </Accordion>

<Accordion title="Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?">
  Oui, **si** l'agent est uniquement conversationnel et que l'entrée est fiable. Les niveaux inférieurs sont plus susceptibles d'être détournés dans leurs instructions, évitez-les donc pour les agents utilisant des outils ou lors de la lecture de contenu non fiable. Si vous devez utiliser un plus petit modèle, verrouillez les outils et exécutez-le dans un bac à sable (sandbox). Voir
  [Sécurité](/en/gateway/security).
</Accordion>

  <Accordion title="J'ai exécuté /start sur Telegram mais je n'ai pas reçu de code d'appairage">
    Les codes d'appairage sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et
    que `dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

    Vérifiez les demandes en attente :

    ```bash
    openclaw pairing list telegram
    ```

    Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste d'autorisation ou définissez `dmPolicy: "open"`
    pour ce compte.

  </Accordion>

  <Accordion title="WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appairage ?">
    Non. La stratégie par défaut pour les DM WhatsApp est l'**appairage**. Les expéditeurs inconnus ne reçoivent qu'un code d'appairage et leur message n'est **pas traité**. OpenClaw ne répond qu'aux conversations qu'il reçoit ou aux envois explicites que vous déclenchez.

    Approuver l'appairage avec :

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lister les demandes en attente :

    ```bash
    openclaw pairing list whatsapp
    ```

    Invite du numéro de téléphone dans l'assistant : elle est utilisée pour définir votre **allowlist/owner** (liste blanche/propriétaire) afin que vos propres DM soient autorisés. Elle n'est pas utilisée pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Commandes de chat, annulation de tâches et "ça ne s'arrête pas"

<AccordionGroup>
  <Accordion title="Comment empêcher l'affichage des messages système internes dans le chat ?">
    La plupart des messages internes ou d'outil n'apparaissent que lorsque le mode **verbose** ou **reasoning** (raisonnement) est activé
    pour cette session.

    Corriger dans le chat où vous le voyez :

    ```
    /verbose off
    /reasoning off
    ```

    Si c'est encore bruyant, vérifiez les paramètres de session dans l'interface de contrôle et définissez verbose
    sur **inherit** (hériter). Vérifiez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
    à `on` dans la configuration.

    Docs : [Thinking and verbose](/en/tools/thinking), [Security](/en/gateway/security#reasoning-verbose-output-in-groups).

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

    Ce sont des déclencheurs d'abandon (et non des commandes slash).

    Pour les processus en arrière-plan (provenant de l'outil exec), vous pouvez demander à l'agent d'exécuter :

    ```
    process action:kill sessionId:XXX
    ```

    Aperçu des commandes slash : voir [Slash commands](/en/tools/slash-commands).

    La plupart des commandes doivent être envoyées comme un message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs autorisés (allowlisted).

  </Accordion>

  <Accordion title='Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")'>
    OpenClaw bloque la messagerie **cross-provider** par défaut. Si un appel d'outil est lié
    à Telegram, il n'enverra pas à Discord sauf si vous l'autorisez explicitement.

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
    Le mode de file d'attente contrôle la façon dont les nouveaux messages interagissent avec une exécution en cours. Utilisez `/queue` pour changer de modes :

    - `steer` - les nouveaux messages redirigent la tâche actuelle
    - `followup` - exécuter les messages un par un
    - `collect` - regrouper les messages et répondre une seule fois (par défaut)
    - `steer-backlog` - diriger maintenant, puis traiter l'arriéré
    - `interrupt` - abandonner l'exécution actuelle et recommencer

    Vous pouvez ajouter des options comme `debounce:2s cap:25 drop:summarize` pour les modes de suivi.

  </Accordion>
</AccordionGroup>

## Divers

<AccordionGroup>
  <Accordion title="Quel est le modèle par défaut pour Anthropic avec une clé API ?">
    Dans OpenClaw, les informations d'identification et la sélection du modèle sont distinctes. Définir `ANTHROPIC_API_KEY` (ou stocker une clé Anthropic API dans les profils d'authentification) active l'authentification, mais le modèle par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-6` ou `anthropic/claude-opus-4-6`). Si
    vous voyez `No credentials found for profile "anthropic:default"`, cela signifie que la Gateway n'a pas pu trouver les informations d'identification Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.
  </Accordion>
</AccordionGroup>

---

Toujours bloqué ? Posez la question sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).
