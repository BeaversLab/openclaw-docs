---
summary: "Projets et intégrations développés par la communauté et propulsés par OpenClaw"
title: "Vitrine"
description: "Projets OpenClaw réels de la communauté"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

Les projets OpenClaw ne sont pas de simples démonstrations. Les gens mettent en production des boucles de revue de PR, des applications mobiles, de la domotique, des systèmes vocaux, des outils de développement et des flux de travail gourmands en mémoire à partir des canaux qu'ils utilisent déjà — des builds natifs via chat sur Telegram, WhatsApp, Discord et les terminaux ; une véritable automatisation pour les réservations, les achats et le support sans attendre une API ; et des intégrations avec le monde physique via des imprimantes, des aspirateurs, des caméras et des systèmes domestiques.

<Info>**Vous souhaitez être mis en avant ?** Partagez votre projet dans [#self-promotion sur Discord](Discordhttps://discord.gg/clawd) ou [en taguant @openclaw sur X](https://x.com/openclaw).</Info>

## Nouveautés de Discord

Récentes mentions remarquables dans le domaine du codage, des devtools, du mobile et de la création de produits natifs pour le chat.

<CardGroup cols={2}>

<Card title="TelegramPR Review to Telegram Feedback" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`OpenClawTelegram

OpenCode termine la modification, ouvre une PR, OpenClaw examine le diff et répond sur Telegram avec des suggestions ainsi qu'un verdict de fusion clair.

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClawTelegramOpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="Wine Cellar Skill in Minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

A demandé « Robby » (@openclaw) une compétence locale pour le wine cellar. Il demande un exemple d'export CSV et un chemin de stockage, puis construit et teste la compétence (962 bouteilles dans l'exemple).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClawOpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco Shop Autopilot" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de repas hebdomadaire, articles habituels, réservation d'un créneau de livraison, confirmation de la commande. Pas d'API, juste un contrôle du navigateur.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG capture d'écran vers Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Raccourci clavier pour une zone d'écran, vision Gemini, Markdown instantané dans votre presse-papiers.

  <img src="/assets/showcase/snag.png" alt="outil SNAG capture d'écran vers Markdown" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Application de bureau pour gérer les compétences et les commandes sur Agents, Claude, Codex et OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="application Agents UI" />
</Card>

<Card title="Telegram notes vocales (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

Enveloppe le TTS papla.media et envoie les résultats sous forme de notes vocales Telegram (pas de lecture automatique agaçante).

  <img src="/assets/showcase/papla-tts.jpg" alt="sortie de note vocale Telegram depuis le TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`OpenAICLI

Assistant installé via Homebrew pour lister, inspecter et surveiller les sessions locales OpenAI Codex (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="ClawHubCodexMonitor sur ClawHub" />
</Card>

<Card title="Contrôle d'imprimante 3D Bambu" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Contrôlez et dépannez les imprimantes BambuLab : statut, travaux, caméra, AMS, calibration, et plus encore.

  <img src="/assets/showcase/bambu-cli.png" alt="CLIClawHubCompétence Bambu CLI sur ClawHub" />
</Card>

<Card title="Transports de Vienne (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Départs en temps réel, perturbations, statut des ascenseurs et itinéraires pour les transports publics de Vienne.

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHubCompétence Wiener Linien sur ClawHub" />
</Card>

<Card title="Repas scolaires ParentPay" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Réservation automatisée de repas scolaires au Royaume-Uni via ParentPay. Utilise les coordonnées de la souris pour un clic fiable sur les cellules du tableau.

</Card>

<Card title="R2 upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Téléverser vers Cloudflare R2/S3 et générer des liens de téléchargement présignés sécurisés. Utile pour les instances OpenClaw distantes.

  <img src="/assets/showcase/r2-upload.png" alt="R2 upload skill on ClawHub" />
</Card>

<Card title="iOSTelegramApplication iOS via Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`iOS

Application iOS complète avec cartes et enregistrement vocal, déployée sur TestFlight entièrement via le chat Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="iOSApplication iOS sur TestFlight" />
</Card>

<Card title="Assistant santé Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Assistant personnel de santé IA intégrant les données de la bague Oura avec le calendrier, les rendez-vous et le programme de salle de sport.

  <img src="/assets/showcase/oura-health.png" alt="Oura ring health assistant" />
</Card>

<Card title="L'équipe de rêve de Kev (14+ agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

Plus de 14 agents sous une seule passerelle avec un orchestrateur Opus 4.5 déléguant aux workers Codex. Voir la [description technique](https://github.com/adam91holt/orchestrated-ai-articles) et [Clawdspace](https://github.com/adam91holt/clawdspace) pour le sandboxing des agents.

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

CLI pour Linear qui s'intègre aux workflows agents (Claude Code, OpenClaw). Gérez les tickets, les projets et les workflows depuis le terminal.

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`API

Lire, envoyer et archiver des messages via Beeper Desktop. Utilise l'API MCP locale de Beeper pour que les agents puissent gérer tous vos chats (iMessage, WhatsApp, et plus) en un seul endroit.

</Card>

</CardGroup>

## Automatisation et flux de travail

Planification, contrôle du navigateur, boucles de support et le côté « fais simplement la tâche pour moi » du produit.

<CardGroup cols={2}>

<Card title="Contrôle du purificateur d'air Winix" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code a découvert et confirmé les commandes du purificateur, puis OpenClaw prend le relais pour gérer la qualité de l'air de la pièce.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Contrôle du purificateur d'air Winix via OpenClaw" />
</Card>

<Card title="Jolis clichés du ciel par caméra" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

Déclenché par une caméra sur le toit : demander à OpenClaw de prendre une photo du ciel dès qu'il a l'air joli. Il a conçu une compétence et a pris la photo.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Instantané du ciel par la caméra du toit capturé par OpenClaw" />
</Card>

<Card title="Scène visuelle de briefing matinal" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

Une invite planifiée génère une image de scène chaque matin (météo, tâches, date, article favori ou citation) via un persona OpenClaw.

</Card>

<Card title="Réservation de terrain de padel" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Vérificateur de disponibilité Playtomic plus CLI de réservation. Ne manquez plus jamais un terrain libre.

  <img src="/assets/showcase/padel-screenshot.jpg" alt="capture d'écran de padel-cli" />
</Card>

<Card title="Collecte de comptabilité" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf`

Collecte les PDFs par e-mail, prépare les documents pour un conseiller fiscal. Comptabilité mensuelle en pilote automatique.

</Card>

<Card title="Couch potato dev mode" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

Reconstruit un site personnel entier via Telegram tout en regardant Netflix — Notion vers Astro, 18 articles migrés, DNS vers Cloudflare. N'a jamais ouvert d'ordinateur portable.

</Card>

<Card title="Job search agent" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Recherche des offres d'emploi, les fait correspondre aux mots-clés du CV et renvoie les opportunités pertinentes avec des liens. Créé en 30 minutes en utilisant la JSearch API.

</Card>

<Card title="Jira skill builder" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw connecté à Jira, puis a généré une nouvelle compétence à la volée (avant qu'elle n'existe sur ClawHub).

</Card>

<Card title="Todoist skill via Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

Tâches Todoist automatisées et fait générer la compétence par OpenClaw directement dans le chat Telegram.

</Card>

<Card title="Analyse TradingView" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Se connecte à TradingView via l'automatisation du navigateur, capture des écrans de graphiques et effectue une analyse technique à la demande. Aucune API nécessaire — juste le contrôle du navigateur.

</Card>

<Card title="Support automatique Slack" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Surveille un Slack d'entreprise, répond de manière utile et transfère les notifications vers Telegram. A corrigé de manière autonome un bug de production dans une application déployée sans qu'on le lui demande.

</Card>

</CardGroup>

## Connaissance et mémoire

Systèmes qui indexent, recherchent, mémorisent et raisonnent sur des connaissances personnelles ou d'équipe.

<CardGroup cols={2}>

<Card title="Apprentissage du chinois xuezh" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

Moteur d'apprentissage du chinois avec retour sur la prononciation et flux d'étude via OpenClaw.

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="Coffre-fort mémoire WhatsApp" icon="vault">
  **Communauté** • `memory` `transcription` `indexing`

Ingère des exportations complètes WhatsApp, transcrit plus de 1000 notes vocales, fait des recoupements avec les journaux git, et génère des rapports markdown liés.

</Card>

<Card title="Recherche sémantique Karakeep" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

Ajoute la recherche vectorielle aux signets Karakeep à l'aide de Qdrant et des embeddings OpenAI ou Ollama.

</Card>

<Card title="Mémoire type Vice-versa-2" icon="brain">
  **Communauté** • `memory` `beliefs` `self-model`

Gestionnaire de mémoire séparé qui transforme les fichiers de session en souvenirs, puis en croyances, et enfin en un auto-modèle évolutif.

</Card>

</CardGroup>

## Voix et téléphone

Points d'entrée basés sur la voix, ponts téléphoniques et workflows intensifs en transcription.

<CardGroup cols={2}>

<Card title="Pont téléphonique Clawdia" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Assistant vocal Vapi vers pont HTTP OpenClaw. Appels téléphoniques en quasi temps réel avec votre agent.

</Card>

<Card title="Transcription OpenRouter" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcription audio multilingue via OpenRouter (Gemini, et plus). Disponible sur ClawHub.

  <img src="/assets/showcase/openrouter-transcribe.png" alt="Compétence de transcription OpenRouter sur ClawHub" />
</Card>

</CardGroup>

## Infrastructure et déploiement

Empaquetage, déploiement et intégrations qui facilitent l'exécution et l'extension de OpenClaw.

<CardGroup cols={2}>

<Card title="Home Assistant add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`OpenClaw

Passerelle OpenClaw fonctionnant sur Home Assistant OS avec support du tunnel SSH et état persistant.

</Card>

<Card title="Home Assistant skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

Contrôlez et automatisez les appareils Home Assistant via le langage naturel.

  <img src="/assets/showcase/homeassistant.png" alt="Home Assistant skill on ClawHub" />
</Card>

<Card title="Nix packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`OpenClaw

Configuration OpenClaw nixifiée complète pour des déploiements reproductibles.

</Card>

<Card title="CalDAV calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

Compétence de calendrier utilisant khal et vdirsyncer. Intégration de calendrier auto-hébergée.

  <img src="/assets/showcase/caldav-calendar.png" alt="CalDAV calendar skill on ClawHub" />
</Card>

</CardGroup>

## Home and hardware

Le côté monde physique d'OpenClaw : maisons, capteurs, caméras, aspirateurs et autres appareils.

<CardGroup cols={2}>

<Card title="Domotique GoHome" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

Domotique native Nix avec OpenClaw comme interface, plus des tableaux de bord Grafana.

  <img src="/assets/showcase/gohome-grafana.png" alt="Tableau de bord Grafana GoHome" />
</Card>

<Card title="Aspirateur Roborock" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

Contrôlez votre aspirateur robot Roborock par une conversation naturelle.

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Statut Roborock" />
</Card>

</CardGroup>

## Projets communautaires

Des projets qui ont dépassé le stade d'un simple workflow pour devenir des produits ou des écosystèmes plus vastes.

<CardGroup cols={2}>

<Card title="Place de marché StarSwap" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp`

Place de marché complète d'équipements astronomiques. Construit avec et autour de l'écosystème OpenClaw.

</Card>

</CardGroup>

## Soumettre votre projet

<Steps>
  <Step title="Partagez-le">Publiez dans [#self-promotion on Discord](https://discord.gg/clawd) ou [tweetez @openclaw](https://x.com/openclaw).</Step>
  <Step title="Incluez les détails">Dites-nous ce qu'il fait, liez le dépôt ou la démo, et partagez une capture d'écran si vous en avez une.</Step>
  <Step title="Soyez mis en avant">Nous ajouterons les projets remarquables à cette page.</Step>
</Steps>

## Connexes

- [Getting started](/fr/start/getting-started)
- [OpenClaw](/fr/start/openclaw)
