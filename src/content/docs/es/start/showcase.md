---
title: "Showcase"
description: "Proyectos OpenClaw del mundo real de la comunidad"
summary: "Proyectos e integraciones creados por la comunidad impulsados por OpenClaw"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

{/* markdownlint-disable MD033 */}

# Showcase

<div className="showcase-hero">
  <p className="showcase-kicker">Construido en chats, terminales, navegadores y salas de estar</p>
  <p className="showcase-lead">Los proyectos de OpenClaw no son demostraciones de juguete. Las personas están implementando bucles de revisión de PR, aplicaciones móviles, automatización del hogar, sistemas de voz, herramientas de desarrollo y flujos de trabajo intensivos en memoria desde los canales que ya usan.</p>
  <div className="showcase-actions">
    <a href="#videos">Ver demos</a>
    <a href="#fresh-from-discord">Explorar proyectos</a>
    <a href="https://discord.gg/clawd">Comparte el tuyo</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>Compilaciones nativas de chat</strong>
      <span>Telegram, WhatsApp, Discord, Beeper, chat web y flujos de trabajo primero en terminal.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Automatización real</strong>
      <span>Reservas, compras, soporte, informes y control del navegador sin esperar una API.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Mundo local + físico</strong>
      <span>Impresoras, aspiradoras, cámaras, datos de salud, sistemas del hogar y bases de conocimiento personal.</span>
    </div>
  </div>
</div>

<Info>**¿Quieres ser destacado?** Comparte tu proyecto en [#self-promotion on Discord](https://discord.gg/clawd) o [etiqueta a @openclaw en X](https://x.com/openclaw).</Info>

<div className="showcase-jump-links">
  <a href="#videos">Videos</a>
  <a href="#fresh-from-discord">Reciente de Discord</a>
  <a href="#automation-workflows">Automatización</a>
  <a href="#knowledge-memory">Memoria</a>
  <a href="#voice-phone">Voz &amp; Teléfono</a>
  <a href="#infrastructure-deployment">Infraestructura</a>
  <a href="#home-hardware">Hogar &amp; Hardware</a>
  <a href="#community-projects">Comunidad</a>
  <a href="#submit-your-project">Enviar un proyecto</a>
</div>

<h2 id="videos">Videos</h2>

<p className="showcase-section-intro">Empiece aquí si desea el camino más corto desde "¿qué es esto?" hasta "vale, lo entiendo".</p>

<div className="showcase-video-grid">
  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
        title="OpenClaw: The self-hosted AI that Siri should have been (Full setup)"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Tutorial completo de configuración</h3>
    <p>VelvetShark, 28 minutos. Instale, inicie y llegue hasta su primer asistente funcional de extremo a extremo.</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">Ver en YouTube</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw showcase video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>Video de demostración de la comunidad</h3>
  <p>Un recorrido rápido por proyectos reales, interfaces y flujos de trabajo creados en torno a OpenClaw.</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">Ver en YouTube</a>
</div>

  <div className="showcase-video-card"
    <div className="showcase-video-shell"
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="OpenClaw community showcase"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Proyectos en el mundo real</h3>
    <p>Ejemplos de la comunidad, desde bucles de codificación nativos del chat hasta hardware y automatización personal.</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">Ver en YouTube</a>
  </div>
</div>

<h2 id="fresh-from-discord">Novedades de Discord</h2>

<p className="showcase-section-intro"
  Destacados recientes en programación, herramientas de desarrollo, móviles y creación de productos nativos del chat.
</p>

<CardGroup cols={2}>

<Card title="Revisión de PR → Comentarios en Telegram" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode finaliza el cambio → abre un PR → OpenClaw revisa las diferencias y responde en Telegram con "sugerencias menores" más un veredicto claro de fusión (incluyendo correcciones críticas para aplicar primero).

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="Comentarios de revisión de PR de OpenClaw entregados en Telegram" />
</Card>

<Card title="Habilidad de Bodega de Vinos en Minutos" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

Pidió a "Robby" (@openclaw) una habilidad local para bodega de vinos. Solicita una exportación de muestra en CSV + dónde almacenarla, luego construye/prueba la habilidad rápido (962 botellas en el ejemplo).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw construyendo una habilidad local de bodega de vinos desde CSV" />
</Card>

<Card title="Piloto Automático de Compras Tesco" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de comidas semanal → habituales → reservar ranura de entrega → confirmar pedido. Sin API, solo control del navegador.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Automatización de compras en Tesco vía chat" />
</Card>

<Card title="SNAG Captura de pantalla a Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Tecla de acceso rápido para una región de la pantalla → visión de Gemini → Markdown instantáneo en tu portapapeles.

  <img src="/assets/showcase/snag.png" alt="herramienta SNAG captura de pantalla a markdown" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Aplicación de escritorio para gestionar habilidades/comandos entre Agents, Claude, Codex y OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="Aplicación Agents UI" />
</Card>

<Card title="Notas de voz de Telegram (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

Envuelve el TTS de papla.media y envía los resultados como notas de voz de Telegram (sin reproducción automática molesta).

  <img src="/assets/showcase/papla-tts.jpg" alt="salida de nota de voz de Telegram desde TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Ayudante instalado vía Homebrew para listar/inspeccionar/vigilar sesiones locales de OpenAI Codex (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor en ClawHub" />
</Card>

<Card title="Control de impresora 3D Bambu" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Controla y soluciona problemas de impresoras BambuLab: estado, trabajos, cámara, AMS, calibración y más.

  <img src="/assets/showcase/bambu-cli.png" alt="Bambu CLI skill on ClawHub" />
</Card>

<Card title="Transporte de Viena (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Salidas en tiempo real, interrupciones, estado de ascensores y rutas para el transporte público de Viena.

  <img src="/assets/showcase/wienerlinien.png" alt="Wiener Linien skill on ClawHub" />
</Card>

<Card title="Comidas escolares ParentPay" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Reserva automatizada de comidas escolares en el Reino Unido a través de ParentPay. Utiliza coordenadas del ratón para hacer clic de forma fiable en las celdas de la tabla.

</Card>

<Card title="Subida R2 (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Sube a Cloudflare R2/S3 y genera enlaces de descarga prefirmados seguros. Perfecto para instancias remotas de OpenClaw.

</Card>

<Card title="Aplicación iOS a través de Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

Construyó una aplicación iOS completa con mapas y grabación de voz, desplegada en TestFlight enteramente a través del chat de Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="Aplicación iOS en TestFlight" />
</Card>

<Card title="Asistente de Salud Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Asistente de salud personal de IA que integra los datos del anillo Oura con el calendario, citas y horario del gimnasio.

  <img src="/assets/showcase/oura-health.png" alt="Asistente de salud Oura ring" />
</Card>
<Card title="Equipo de Ensueño de Kev (14+ Agentes)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

14+ agentes bajo una sola puerta de enlace con el orquestador Opus 4.5 delegando a trabajadores Codex. [Artículo técnico completo](https://github.com/adam91holt/orchestrated-ai-articles) que cubre la alineación del Equipo de Ensueño, selección de modelos, sandboxing, webhooks, latidos y flujos de delegación. [Clawdspace](https://github.com/adam91holt/clawdspace) para el aislamiento de agentes. [Entrada de blog](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/).

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

CLI para Linear que se integra con flujos de trabajo de agentes (Claude Code, OpenClaw). Gestiona problemas, proyectos y flujos de trabajo desde la terminal. ¡El primer PR externo fusionado!

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

Lee, envía y archiva mensajes a través de Beeper Desktop. Utiliza la API local de MCP de Beeper para que los agentes puedan gestionar todos tus chats (iMessage, WhatsApp, etc.) en un solo lugar.

</Card>

</CardGroup>

<h2 id="automation-workflows">Automatización &amp; Flujos de trabajo</h2>

<p className="showcase-section-intro">Programación, control del navegador, bucles de soporte y el lado "hazme la tarea" del producto.</p>

<CardGroup cols={2}>

<Card title="Control de purificador de aire Winix" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code descubrió y confirmó los controles del purificador, luego OpenClaw se encarga de gestionar la calidad del aire de la habitación.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Fotos bonitas del cielo desde la cámara" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

Activado por una cámara en el techo: pedir a OpenClaw que tome una foto del cielo cuando se vea bonito — diseñó una habilidad y tomó la foto.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Instantánea del cielo capturada por OpenClaw con la cámara del techo" />
</Card>

<Card title="Escena visual de informe matutino" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

Un prompt programado genera una imagen de "escena" única cada mañana (clima, tareas, fecha, publicación/cita favorita) a través de un persona de OpenClaw.

</Card>

<Card title="Reserva de pistas de pádel" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Comprobador de disponibilidad de Playtomic + CLI de reserva. Nunca pierdas una pista libre de nuevo.
  <img src="/assets/showcase/padel-screenshot.jpg" alt="captura de pantalla de pádel-cli" />
</Card>

<Card title="Ingreso contable" icon="file-invoice-dollar">
  **Comunidad** • `automation` `email` `pdf` Recopila PDFs del correo electrónico, prepara documentos para el asesor fiscal. Contabilidad mensual en piloto automático.
</Card>

<Card title="Modo de desarrollo para vagos" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

Reconstruí todo el sitio personal a través de Telegram mientras veía Netflix — Notion → Astro, 18 publicaciones migradas, DNS a Cloudflare. Nunca abrí una computadora portátil.

</Card>

<Card title="Agente de búsqueda de empleo" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Busca ofertas de empleo, las compara con las palabras clave del CV y devuelve oportunidades relevantes con enlaces. Construido en 30 minutos usando la API de JSearch.

</Card>

<Card title="Constructor de habilidades de Jira" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw se conectó a Jira y luego generó una nueva habilidad sobre la marcha (antes de que existiera en ClawHub).

</Card>

<Card title="Habilidad de Todoist vía Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

Automatizó las tareas de Todoist e hizo que OpenClaw generara la habilidad directamente en el chat de Telegram.

</Card>

<Card title="Análisis de TradingView" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Inicia sesión en TradingView mediante automatización del navegador, captura pantallas de gráficos y realiza análisis técnico bajo demanda. No se necesita API, solo control del navegador.

</Card>

<Card title="Soporte Automático de Slack" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Vigila el canal de Slack de la empresa, responde de manera útil y reenvía notificaciones a Telegram. Corrigió de forma autónoma un error de producción en una aplicación implementada sin que se lo pidieran.

</Card>

</CardGroup>

<h2 id="knowledge-memory">Conocimiento &amp; Memoria</h2>

<p className="showcase-section-intro">Sistemas que indexan, buscan, recuerdan y razonan sobre el conocimiento personal o del equipo.</p>

<CardGroup cols={2}>

<Card title="xuezh Aprendizaje de Chino" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` Motor de aprendizaje de chino con comentarios sobre la pronunciación y flujos de estudio a través de OpenClaw.
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="comentarios de pronunciación xuezh" />
</Card>

<Card title="Bóveda de Memoria de WhatsApp" icon="vault">
  **Comunidad** • `memory` `transcription` `indexing` Ingiere exportaciones completas de WhatsApp, transcribe más de 1000 notas de voz, verifica con registros de git y genera informes de markdown vinculados.
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` Añade búsqueda vectorial a los marcadores de Karakeep utilizando Qdrant + incrustaciones de OpenAI/Ollama.
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **Comunidad** • `memory` `beliefs` `self-model` Gestor de memoria separado que convierte los archivos de sesión en memorias → creencias → modelo propio evolutivo.
</Card>

</CardGroup>

<h2 id="voice-phone">Voz &amp; Teléfono</h2>

<p className="showcase-section-intro">Puntos de entrada con prioridad de voz, puentes telefónicos y flujos de trabajo con gran carga de transcripción.</p>

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Asistente de voz Vapi ↔ puente HTTP OpenClaw. Llamadas telefónicas casi en tiempo real con tu agente.
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcripción de audio multilingüe a través de OpenRouter (Gemini, etc.). Disponible en ClawHub.

</Card>

</CardGroup>

<h2 id="infrastructure-deployment">Infraestructura &amp; Despliegue</h2>

<p className="showcase-section-intro">Empaquetado, despliegue e integraciones que hacen que OpenClaw sea más fácil de ejecutar y ampliar.</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` Puerta de enlace OpenClaw ejecutándose en Home Assistant OS con soporte para túnel SSH y estado persistente.
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` Controla y automatiza dispositivos de Home Assistant mediante lenguaje natural.
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` Configuración de OpenClaw nificada con todo incluido para despliegues reproducibles.
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` Habilidad de calendario usando khal/vdirsyncer. Integración de calendario autoalojado.
</Card>

</CardGroup>

<h2 id="home-hardware">Home &amp; Hardware</h2>

<p className="showcase-section-intro">El lado del mundo físico de OpenClaw: hogares, sensores, cámaras, aspiradoras y otros dispositivos.</p>

<CardGroup cols={2}>

<Card title="GoHome Automatización" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` Domótica nativa de Nix con OpenClaw como interfaz, además de hermosos paneles de Grafana.
  <img src="/assets/showcase/gohome-grafana.png" alt="Panel de Grafana GoHome" />
</Card>

<Card title="Aspiradora Roborock" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` Controla tu aspiradora robot Roborock mediante una conversación natural.
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Estado de Roborock" />
</Card>

</CardGroup>

<h2 id="community-projects">Proyectos de la Comunidad</h2>

<p className="showcase-section-intro">Cosas que crecieron más allá de un solo flujo de trabajo hasta convertirse en productos o ecosistemas más amplios.</p>

<CardGroup cols={2}>

<Card title="Mercado StarSwap" icon="star" href="https://star-swap.com/">
  **Comunidad** • `marketplace` `astronomy` `webapp` Un mercado completo de equipos de astronomía. Construido con/alrededor del ecosistema OpenClaw.
</Card>

</CardGroup>

---

<h2 id="submit-your-project">Envía tu Proyecto</h2>

<p className="showcase-section-intro">Si estás construyendo algo interesante con OpenClaw, envíalo. Las capturas de pantalla fuertes y los resultados concretos ayudan.</p>

¿Tienes algo que compartir? ¡Nos encantaría presentarlo!

<Steps>
  <Step title="Compártelo">Publica en [#self-promotion en Discord](https://discord.gg/clawd) o [tuitea a @openclaw](https://x.com/openclaw)</Step>
  <Step title="Incluir Detalles">Dinos qué hace, enlaza al repositorio/demo, comparte una captura de pantalla si tienes una</Step>
  <Step title="Ser Destacado">Añadiremos los proyectos destacados a esta página</Step>
</Steps>
