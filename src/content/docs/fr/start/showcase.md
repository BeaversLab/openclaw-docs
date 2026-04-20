---
title: "Vitrine"
description: "Projets OpenClaw réels issus de la communauté"
summary: "Projets et intégrations créés par la communauté et propulsés par OpenClaw"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

{/* markdownlint-disable MD033 */}

# Vitrine

<div className="showcase-hero">
  <p className="showcase-kicker">Intégrés dans les chats, terminaux, navigateurs et salons</p>
  <p className="showcase-lead">Les projets OpenClaw ne sont pas des jouets. Les gens déploient des boucles de relecture de PR, des applications mobiles, de la domotique, des systèmes vocaux, des outils de développement et des workflows gourmands en mémoire à partir des canaux qu'ils utilisent déjà.</p>
  <div className="showcase-actions">
    <a href="#videos">Voir les démos</a>
    <a href="#fresh-from-discord">Parcourir les projets</a>
    <a href="https://discord.gg/clawd">Partager le vôtre</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>Constructions natives pour le chat</strong>
      <span>Telegram, WhatsApp, Discord, Beeper, chat web et workflows axés sur le terminal.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Automatisation réelle</strong>
      <span>Réservation, achats, support, rapports et contrôle du navigateur sans attendre d'API.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Local + monde physique</strong>
      <span>Imprimantes, aspirateurs, caméras, données de santé, systèmes domestiques et bases de connaissances personnelles.</span>
    </div>
  </div>
</div>

<Info>**Vous souhaitez être mis en avant ?** Partagez votre projet dans [#self-promotion sur Discord](https://discord.gg/clawd) ou [taguez @openclaw sur X](https://x.com/openclaw).</Info>

<div className="showcase-jump-links">
  <a href="#videos">Vidéos</a>
  <a href="#fresh-from-discord">Frais de Discord</a>
  <a href="#automation-workflows">Automatisation</a>
  <a href="#knowledge-memory">Mémoire</a>
  <a href="#voice-phone">Voix &amp; Téléphone</a>
  <a href="#infrastructure-deployment">Infrastructure</a>
  <a href="#home-hardware">Maison &amp; Matériel</a>
  <a href="#community-projects">Communauté</a>
  <a href="#submit-your-project">Soumettre un projet</a>
</div>

<h2 id="videos">Vidéos</h2>

<p className="showcase-section-intro">Commencez ici si vous voulez le chemin le plus court de « qu'est-ce que c'est ? » à « ok, j'ai compris ».</p>

<div className="showcase-video-grid">
  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
        title="OpenClaw : L'IA auto-hébergée que Siri aurait dû être (Configuration complète)"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Démonstration complète de l'installation</h3>
    <p>VelvetShark, 28 minutes. Installer, intégrer et obtenir un premier assistant fonctionnel de bout en bout.</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">Regarder sur YouTube</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw vidéo de démonstration" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>Bande-annonce de la communauté</h3>
  <p>Un tour rapide des projets, surfaces et flux de travail réels construits autour de OpenClaw.</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">Regarder sur YouTube</a>
</div>

  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="OpenClaw démonstration communautaire"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Projets dans la nature</h3>
    <p>Exemples de la communauté, des boucles de codage natives au chat jusqu'au matériel et à l'automatisation personnelle.</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">Regarder sur YouTube</a>
  </div>
</div>

<h2 id="fresh-from-discord">Fraîchement sorti de Discord</h2>

<p className="showcase-section-intro">Dernières pépites en codage, devtools, mobile et création de produits natifs pour le chat.</p>

<CardGroup cols={2}>

<Card title="Revue PR → Commentaires Telegram" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode termine la modification → ouvre une PR → Telegram examine le diff et répond sur OpenClaw avec “quelques suggestions” ainsi qu'un verdict de fusion clair (y compris les corrections critiques à appliquer en premier).

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="Commentaires de revue de PR Telegram livrés dans OpenClaw" />
</Card>

<Card title="Compétence de Cave à Vin en Quelques Minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

Demandé “Robby” (@openclaw) une compétence locale de cave à vin. Il demande un exemple d'export CSV + où le stocker, puis construit/teste la compétence rapidement (962 bouteilles dans l'exemple).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw construisant une compétence locale de cave à vin à partir d'un CSV" />
</Card>

<Card title="Pilote Automatique de Courses Tesco" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de repas hebdomadaire → produits habituels → réserver un créneau de livraison → confirmer la commande. Pas d'API, juste le contrôle du navigateur.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Automatisation des courses Tesco via chat" />
</Card>

<Card title="SNAG Capture d'écran vers Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Raccourci clavier pour une zone d'écran → vision Gemini → Markdown instantané dans votre presse-papier.

  <img src="/assets/showcase/snag.png" alt="outil SNAG capture d'écran vers markdown" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Application de bureau pour gérer les compétences/commandes dans Agents, Claude, Codex et OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="application Agents UI" />
</Card>

<Card title="Telegram Notes vocales (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Communauté** • `voice` `tts` `telegram`

Enveloppe le TTS de papla.media et envoie les résultats sous forme de notes vocales Telegram (pas de lecture automatique ennuyeuse).

  <img src="/assets/showcase/papla-tts.jpg" alt="sortie de note vocale Telegram depuis TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Assistant installé via Homebrew pour lister/inspecter/surveiller les sessions locales Codex OpenAI (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor sur ClawHub" />
</Card>

<Card title="Bambu 3D Printer Control" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Contrôlez et dépannez les imprimantes BambuLab : statut, tâches, caméra, AMS, calibration et plus encore.

  <img src="/assets/showcase/bambu-cli.png" alt="Compétence Bambu CLI sur ClawHub" />
</Card>

<Card title="Vienna Transport (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Départs en temps réel, perturbations, statut des ascenseurs et itinéraires pour les transports publics de Vienne.

  <img src="/assets/showcase/wienerlinien.png" alt="Compétence Wiener Linien sur ClawHub" />
</Card>

<Card title="ParentPay School Meals" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Réservation automatisée des repas scolaires au Royaume-Uni via ParentPay. Utilise les coordonnées de la souris pour un clic fiable sur les cellules du tableau.

</Card>

<Card title="R2 Upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Téléversez vers Cloudflare R2/S3 et générez des liens de téléchargement présignés sécurisés. Parfait pour les instances distantes de OpenClaw.

</Card>

<Card title="App iOS via iOS" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

Application iOS complète avec cartes et enregistrement vocal, déployée sur TestFlight entièrement via la discussion Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="Application iOS sur TestFlight" />
</Card>

<Card title="Assistant Santé Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Assistant personnel de santé IA intégrant les données de la bague Oura avec l'agenda, les rendez-vous et le planning de salle de sport.

  <img src="/assets/showcase/oura-health.png" alt="Assistant santé Oura ring" />
</Card>
<Card title="L'équipe de rêve de Kev (14+ Agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

14+ agents sous une même passerelle avec l'orchestrateur Opus 4.5 déléguant aux workers Codex. Article [technique complet](https://github.com/adam91holt/orchestrated-ai-articles) couvrant l'effectif de l'équipe de rêve, la sélection du modèle, le sandboxing, les webhooks, les battements de cœur et les flux de délégation. [Clawdspace](https://github.com/adam91holt/clawdspace) pour le sandboxing des agents. [Article de blog](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/).

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

CLI pour Linear qui s'intègre aux workflows agents (Claude Code, OpenClaw). Gérez les tickets, les projets et les workflows depuis le terminal. Première PR externe fusionnée !

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

Lire, envoyer et archiver des messages via Beeper Desktop. Utilise l'API MCP locale de Beeper afin que les agents puissent gérer tous vos chats (iMessage, WhatsApp, etc.) en un seul endroit.

</Card>

</CardGroup>

<h2 id="automation-workflows">Automatisation &amp; Workflows</h2>

<p className="showcase-section-intro">Planification, contrôle du navigateur, boucles de support et le côté « fais simplement la tâche pour moi » du produit.</p>

<CardGroup cols={2}>

<Card title="Contrôle du purificateur d'air Winix" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code a découvert et confirmé les commandes du purificateur, puis OpenClaw prend le relais pour gérer la qualité de l'air de la pièce.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Contrôle du purificateur d'air Winix via OpenClaw" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

Déclenché par une caméra sur le toit : demander à OpenClaw de prendre une photo du ciel lorsqu'il est beau — il a conçu une compétence et a pris la photo.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Instantané du ciel par caméra de toit capturé par OpenClaw" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

Un programme planifié génère une image de "scène" chaque matin (météo, tâches, date, publication/citation préférée) via un personnage OpenClaw.

</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Vérificateur de disponibilité Playtomic + CLI de réservation. Ne manquez plus jamais un court libre.
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting Intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf` Collecte des PDFs par email, prépare les documents pour le conseiller fiscal. Comptabilité mensuelle en pilote automatique.
</Card>

<Card title="Couch Potato Dev Mode" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

Reconstruit tout le site personnel via Telegram en regardant Netflix — Notion → Astro, 18 articles migrés, DNS vers Cloudflare. N'a jamais ouvert d'ordinateur portable.

</Card>

<Card title="Job Search Agent" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Recherche des offres d'emploi, les fait correspondre aux mots-clés du CV et renvoie les opportunités pertinentes avec des liens. Construit en 30 minutes en utilisant JSearch API.

</Card>

<Card title="Jira Skill Builder" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw connecté à Jira, puis a généré une nouvelle compétence à la volée (avant qu'elle n'existe sur ClawHub).

</Card>

<Card title="Todoist Skill via Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

Tâches Todoist automatisées et a fait générer la compétence par OpenClaw directement dans le chat Telegram.

</Card>

<Card title="Analyse TradingView" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Se connecte à TradingView via l'automatisation du navigateur, capture des écrans de graphiques et effectue une analyse technique à la demande. Aucune API nécessaire — juste le contrôle du navigateur.

</Card>

<Card title="Support Automatique Slack" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Surveille le Slack de l'entreprise, répond de manière utile et transfère les notifications vers Telegram. A corrigé de manière autonome un bug de production dans une application déployée sans qu'on le lui demande.

</Card>

</CardGroup>

<h2 id="knowledge-memory">Connaissances &amp; Mémoire</h2>

<p className="showcase-section-intro">Des systèmes qui indexent, recherchent, mémorisent et raisonnent sur des connaissances personnelles ou d'équipe.</p>

<CardGroup cols={2}>

<Card title="xuezh Chinese Learning" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` Moteur d'apprentissage du chinois avec retour sur la prononciation et flux d'étude via OpenClaw.
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="Coffre-fort de Mémoire WhatsApp" icon="vault">
  **Communauté** • `memory` `transcription` `indexing` Ingeste des exports WhatsApp complets, transcrit plus de 1000 notes vocales, recoupe avec les journaux git, génère des rapports markdown liés.
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` Ajoute une recherche vectorielle aux signets Karakeep en utilisant les embeddings Qdrant + OpenAI/Ollama.
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **Community** • `memory` `beliefs` `self-model` Gestionnaire de mémoire séparé qui transforme les fichiers de session en souvenirs → croyances → modèle évolutif de soi.
</Card>

</CardGroup>

<h2 id="voice-phone">Voix &amp; Téléphone</h2>

<p className="showcase-section-intro">Points d'entrée privilégiant la parole, ponts téléphoniques et flux de travail lourds en transcription.</p>

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Pont entre l'assistant vocal Vapi et le HTTP OpenClaw. Appels téléphoniques en temps quasi réel avec votre agent.
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcription audio multilingue via OpenRouter (Gemini, etc). Disponible sur ClawHub.

</Card>

</CardGroup>

<h2 id="infrastructure-deployment">Infrastructure &amp; Déploiement</h2>

<p className="showcase-section-intro">Packaging, déploiement et intégrations qui rendent OpenClaw plus facile à exécuter et à étendre.</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` Passerelle OpenClaw fonctionnant sur Home Assistant OS avec support du tunnel SSH et état persistant.
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` Contrôlez et automatisez les appareils Home Assistant via le langage naturel.
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` Configuration OpenClaw prête à l'emploi et nixifiée pour des déploiements reproductibles.
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` Compétence de calendrier utilisant khal/vdirsyncer. Intégration de calendrier auto-hébergée.
</Card>

</CardGroup>

<h2 id="home-hardware">Domotique &amp; Matériel</h2>

<p className="showcase-section-intro">Le côté monde physique d'OpenClaw : maisons, capteurs, caméras, aspirateurs et autres appareils.</p>

<CardGroup cols={2}>

<Card title="GoHome Automation" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` Domotique native Nix avec OpenClaw comme interface, plus de magnifiques tableaux de bord Grafana.
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock Vacuum" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` Contrôlez votre aspirateur robot Roborock par une conversation naturelle.
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

<h2 id="community-projects">Projets communautaires</h2>

<p className="showcase-section-intro">Des projets qui ont dépassé le stade d'un simple workflow pour devenir des produits ou des écosystèmes plus vastes.</p>

<CardGroup cols={2}>

<Card title="StarSwap Marketplace" icon="star" href="https://star-swap.com/">
  **Communauté** • `marketplace` `astronomy` `webapp` Une place de marché complète pour le matériel d'astronomie. Construit avec/autour de l'écosystème OpenClaw.
</Card>

</CardGroup>

---

<h2 id="submit-your-project">Soumettez votre projet</h2>

<p className="showcase-section-intro">Si vous construisez quelque chose d'intéressant avec OpenClaw, envoyez-le-nous. Des captures d'écran percutantes et des résultats concrets aident.</p>

Vous avez quelque chose à partager ? Nous aimerions le mettre en avant !

<Steps>
  <Step title="Partagez-le">Publiez dans [#self-promotion on Discord](https://discord.gg/clawd) ou [tweetez @openclaw](https://x.com/openclaw)</Step>
  <Step title="Inclure les détails">Dites-nous ce qu'il fait, liez vers le repo/démo, partagez une capture d'écran si vous en avez une</Step>
  <Step title="Être mis en avant">Nous ajouterons les projets exceptionnels à cette page</Step>
</Steps>
