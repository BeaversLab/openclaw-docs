---
title: "Vitrine"
description: "Projets OpenClaw réels issus de la communauté"
summary: "Projets et intégrations créés par la communauté et propulsés par OpenClaw"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

# Vitrine

<div className="showcase-hero">
  <p className="showcase-kicker">Construit dans les salons de discussion, les terminaux, les navigateurs et les salons</p>
  <p className="showcase-lead">Les projets OpenClaw ne sont pas des jouets de démonstration. Les gens mettent en production des boucles de révision de PR, des applications mobiles, de la domotique, des systèmes vocaux, des outils de développement et des flux de travail gourmands en mémoire à partir des canaux qu'ils utilisent déjà.</p>
  <div className="showcase-actions">
    <a href="#videos">Voir les démos</a>
    <a href="#fresh-from-discord">Parcourir les projets</a>
    <a href="https://discord.gg/clawd">Partager le vôtre</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>Constructions natives pour le chat</strong>
      <span>Telegram, WhatsApp, Discord, Beeper, web chat, et workflows d'abord en terminal.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Automatisation réelle</strong>
      <span>Réservation, achats, support, rapports et contrôle du navigateur sans attendre une API.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Local + monde physique</strong>
      <span>Imprimantes, aspirateurs, caméras, données de santé, systèmes domestiques et bases de connaissances personnelles.</span>
    </div>
  </div>
</div>

<Info>**Vous souhaitez être mis en avant ?** Partagez votre projet dans [#self-promotion sur Discord](https://discord.gg/clawd) ou [taggez @openclaw sur X](https://x.com/openclaw).</Info>

<div className="showcase-jump-links">
  <a href="#videos">Vidéos</a>
  <a href="#fresh-from-discord">Nouveautés de Discord</a>
  <a href="#automation-workflows">Automatisation</a>
  <a href="#knowledge-memory">Mémoire</a>
  <a href="#voice-phone">Voix &amp; Téléphone</a>
  <a href="#infrastructure-deployment">Infrastructure</a>
  <a href="#home-hardware">Domotique &amp; Matériel</a>
  <a href="#community-projects">Communauté</a>
  <a href="#submit-your-project">Soumettre un projet</a>
</div>

## Vidéos

<p className="showcase-section-intro">Commencez ici si vous souhaitez le chemin le plus court de « c'est quoi ? » à « ok, j'ai compris. »</p>

<div className="showcase-video-grid">
  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
        title="OpenClaw : l'IA auto-hébergée que Siri aurait dû être (Configuration complète)"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Tutoriel de configuration complet</h3>
    <p>VelvetShark, 28 minutes. Installer, embarquer et obtenir un premier assistant fonctionnel de bout en bout.</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">Regarder sur YouTube</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="Vidéo de présentation OpenClaw" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>Bande-annonce de la communauté</h3>
  <p>Une présentation rapide de projets réels, d'interfaces et de flux de travail construits autour d'OpenClaw.</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">Regarder sur YouTube</a>
</div>

  <div className="showcase-video-card"
    <div className="showcase-video-shell"
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="Présentation communautaire OpenClaw"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Projets en nature</h3>
    <p>Exemples de la communauté, allant des boucles de codage natives au chat jusqu'au matériel et à l'automatisation personnelle.</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">Regarder sur YouTube</a>
  </div>
</div>

## Fraîchement sorti de Discord

<p className="showcase-section-intro"
  Récentes performances remarquables dans le codage, les devtools, le mobile et la création de produits natifs pour le chat.
</p>

<CardGroup cols={2}>

<Card title="Revue PR → Commentaires Telegram" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode termine la modification → ouvre une PR → OpenClaw passe en revue le diff et répond sur Telegram avec "suggestions mineures" plus un verdict de fusion clair (y compris les corrections critiques à appliquer en premier).

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="Commentaires de revue de PR OpenClaw livrés sur Telegram" />
</Card>

<Card title="Compétence de cave à vin en minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

A demandé "Robby" (@openclaw) une compétence de cave à vin locale. Il demande un exemple d'export CSV + où le stocker, puis construit/teste la compétence rapidement (962 bouteilles dans l'exemple).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw construisant une compétence de cave à vin locale à partir d'un CSV" />
</Card>

<Card title="Pilote automatique de courses Tesco" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de repas hebdomadaire → articles réguliers → réserver un créneau de livraison → confirmer la commande. Pas d'API, juste le contrôle du navigateur.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Automatisation de courses Tesco via chat" />
</Card>

<Card title="SNAG Capture d'écran vers Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Raccourci clavier pour une zone d'écran → vision Gemini → Markdown instantané dans votre presse-papiers.

  <img src="/assets/showcase/snag.png" alt="SNAG outil screenshot-to-markdown" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Application de bureau pour gérer les compétences/commandes sur Agents, Claude, Codex et OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="application Agents UI" />
</Card>

<Card title="Telegram Notes vocales (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

Enveloppe papla.media TTS et envoie les résultats sous forme de notes vocales Telegram (pas de lecture automatique agaçante).

  <img src="/assets/showcase/papla-tts.jpg" alt="sortie de note vocale Telegram depuis TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Assistant installé via Homebrew pour lister/inspecter/surveiller les sessions locales Codex OpenAI (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor sur ClawHub" />
</Card>

<Card title="Contrôle d'imprimante 3D Bambu" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Contrôlez et dépannez les imprimantes BambuLab : statut, travaux, caméra, AMS, calibration et plus encore.

  <img src="/assets/showcase/bambu-cli.png" alt="Compétence Bambu CLI sur ClawHub" />
</Card>

<Card title="Transport de Vienne (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Départs en temps réel, perturbations, statut des ascenseurs et itinéraires pour les transports publics de Vienne.

  <img src="/assets/showcase/wienerlinien.png" alt="Compétence Wiener Linien sur ClawHub" />
</Card>

<Card title="Repas d'école ParentPay" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Réservation automatisée des repas scolaires au Royaume-Uni via ParentPay. Utilise les coordonnées de la souris pour un clic fiable sur les cellules du tableau.

</Card>

<Card title="Téléchargement R2 (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Téléversez vers Cloudflare R2/S3 et générez des liens de téléchargement présignés sécurisés. Parfait pour les instances distantes de OpenClaw.

</Card>

<Card title="App iOS via Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

A développé une application iOS complète avec cartes et enregistrement vocal, déployée sur TestFlight entièrement via une discussion Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="application iOS sur TestFlight" />
</Card>

<Card title="Assistant de santé Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Assistant de santé IA personnel intégrant les données de la bague Oura avec le calendrier, les rendez-vous et le planning de salle de sport.

  <img src="/assets/showcase/oura-health.png" alt="assistant de santé bague Oura" />
</Card>
<Card title="L'équipe de rêve de Kev (14+ Agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

Plus de 14 agents sous une seule passerelle avec l'orchestrateur Opus 4.5 déléguant aux workers Codex. [Article technique complet](https://github.com/adam91holt/orchestrated-ai-articles) couvrant l'effectif de l'équipe de rêve, la sélection du modèle, le sandboxing, les webhooks, les battements de cœur et les flux de délégation. [Clawdspace](https://github.com/adam91holt/clawdspace) pour le sandboxing d'agents. [Article de blog](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/).

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

CLI pour Linear qui s'intègre aux flux de travail d'agents (Claude Code, OpenClaw). Gérez les problèmes, les projets et les flux de travail depuis le terminal. Première PR externe fusionnée !

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

Lire, envoyer et archiver des messages via Beeper Desktop. Utilise l'API MCP locale de Beeper afin que les agents puissent gérer tous vos chats (API, iMessage, etc.) au même endroit.

</Card>

</CardGroup>

<a id="automation-workflows"></a>

## Automatisation et flux de travail

<p className="showcase-section-intro">Planification, contrôle du navigateur, boucles de support et le côté « fais simplement la tâche pour moi » du produit.</p>

<CardGroup cols={2}>

<Card title="Winix Air Purifier Control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code a découvert et confirmé les contrôles du purificateur, puis OpenClaw prend le relais pour gérer la qualité de l'air de la pièce.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Jolis clichés de caméra du ciel" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

Déclenché par une caméra sur le toit : demander à OpenClaw de prendre une photo du ciel dès qu'il a l'air joli — il a conçu une compétence et a pris la photo.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Instantané du ciel par la caméra du toit capturé par OpenClaw" />
</Card>

<Card title="Scène de briefing visuel du matin" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

Une invite planifiée génère chaque matin une image unique de « scène » (météo, tâches, date, publication favori/citation) via un personnage OpenClaw.

</Card>

<Card title="Réservation de court de Padel" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Vérificateur de disponibilité Playtomic + CLI de réservation. Ne manquez plus jamais un court libre.
  <img src="/assets/showcase/padel-screenshot.jpg" alt="capture d'écran de padel-cli" />
</Card>

<Card title="Collecte comptable" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf` Collecte les PDFs par e-mail, prépare les documents pour le consultant fiscal. Comptabilité mensuelle en pilote automatique.
</Card>

<Card title="Mode Dev Canapé" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

Site personnel entièrement reconstruit via Telegram tout en regardant Netflix — Notion → Astro, 18 articles migrés, DNS vers Cloudflare. N'a jamais ouvert d'ordinateur portable.

</Card>

<Card title="Agent de Recherche d'Emploi" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Recherche les offres d'emploi, les fait correspondre aux mots-clés du CV et renvoie les opportunités pertinentes avec des liens. Construit en 30 minutes en utilisant l'API JSearch.

</Card>

<Card title="Générateur de Compétence Jira" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw connecté à Jira, puis a généré une nouvelle compétence à la volée (avant qu'elle n'existe sur ClawHub).

</Card>

<Card title="Compétence Todoist via Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

Tâches Todoist automatisées et fait générer la compétence par OpenClaw directement dans le chat Telegram.

</Card>

<Card title="Analyse TradingView" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Se connecte à TradingView via l'automatisation du navigateur, capture des écrans des graphiques et effectue une analyse technique à la demande. Aucune API nécessaire, juste le contrôle du navigateur.

</Card>

<Card title="Support Auto Slack" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Surveille le Slack de l'entreprise, répond de manière utile et transfère les notifications vers Telegram. A corrigé de manière autonome un bug de production dans une application déployée sans qu'on le lui demande.

</Card>

</CardGroup>

<a id="knowledge-memory"></a>

## Connaissance & Mémoire

<p className="showcase-section-intro">Systèmes qui indexent, recherchent, mémorisent et raisonnent sur des connaissances personnelles ou d'équipe.</p>

<CardGroup cols={2}>

<Card title="Apprentissage du chinois xuezh" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` Moteur d'apprentissage du chinois avec retour sur la prononciation et flux d'étude via OpenClaw.
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="Coffre-fort Mémoire WhatsApp" icon="vault">
  **Communauté** • `memory` `transcription` `indexing` Ingeste des exportations complètes WhatsApp, transcrit plus de 1000 notes vocales, vérifie avec les journaux git, produit des rapports markdown liés.
</Card>

<Card title="Karakeep Recherche Sémantique" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` Ajoute une recherche vectorielle aux signets Karakeep en utilisant Qdrant + les embeddings OpenAI/Ollama.
</Card>

<Card title="Inside-Out-2 Mémoire" icon="brain">
  **Communauté** • `memory` `beliefs` `self-model` Gestionnaire de mémoire distinct qui transforme les fichiers de session en souvenirs → croyances → modèle personnel évolutif.
</Card>

</CardGroup>

<a id="voice-phone"></a>

## Voix & Téléphone

<p className="showcase-section-intro">Points d'entrée privilégiant la voix, ponts téléphoniques et workflows basés sur la transcription.</p>

<CardGroup cols={2}>

<Card title="Pont Téléphonique Clawdia" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Assistant vocal Vapi ↔ Pont HTTP OpenClaw. Appels téléphoniques quasi en temps réel avec votre agent.
</Card>

<Card title="Transcription OpenRouter" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcription audio multilingue via OpenRouter (Gemini, etc). Disponible sur ClawHub.

</Card>

</CardGroup>

<a id="infrastructure-deployment"></a>

## Infrastructure & Déploiement

<p className="showcase-section-intro">Packaging, déploiement et intégrations qui rendent OpenClaw plus facile à exécuter et à étendre.</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` OpenClaw gateway tournant sur Home Assistant OS avec prise en charge du tunnel SSH et état persistant.
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` Contrôlez et automatisez les appareils Home Assistant via le langage naturel.
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` Configuration OpenClaw nixifiée tout-en-un pour des déploiements reproductibles.
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` Skill de calendrier utilisant khal/vdirsyncer. Intégration de calendrier auto-hébergée.
</Card>

</CardGroup>

<a id="home-hardware"></a>

## Home & Hardware

<p className="showcase-section-intro">Le côté monde physique d'OpenClaw : maisons, capteurs, caméras, aspirateurs et autres appareils.</p>

<CardGroup cols={2}>

<Card title="GoHome Automation" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` Domotique native Nix avec OpenClaw comme interface, plus de magnifiques tableaux de bord Grafana.
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock Vacuum" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` Contrôlez votre aspirateur robot Roborock par conversation naturelle.
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## Projets communautaires

<p className="showcase-section-intro">
  Des projets qui ont dépassé le stade d'un simple workflow pour devenir des produits ou des écosystèmes plus vastes.</p>
</p>

<CardGroup cols={2}>

<Card title="StarSwap Marketplace" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp` Place de marché complète pour le matériel d'astronomie. Construite avec et autour de l'écosystème OpenClaw.
</Card>

</CardGroup>

---

## Soumettez votre projet

<p className="showcase-section-intro">
  Si vous construisez quelque chose d'intéressant avec OpenClaw, envoyez-le nous. Les captures d'écran claires et les résultats concrets aident.</p>
</p>

Vous avez quelque chose à partager ? Nous aimerions le mettre en avant !

<Steps>
  <Step title="Partagez-le">Publiez dans [#self-promotion on Discord](https://discord.gg/clawd) ou [tweetez @openclaw](https://x.com/openclaw)</Step>
  <Step title="Incluez les détails">Dites-nous ce que cela fait, liez vers le dépôt/démo, partagez une capture d'écran si vous en avez une</Step>
  <Step title="Être mis en avant">Nous ajouterons les projets remarquables à cette page</Step>
</Steps>
