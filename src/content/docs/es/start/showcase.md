---
title: "Showcase"
description: "Proyectos OpenClaw del mundo real de la comunidad"
summary: "Proyectos e integraciones creados por la comunidad impulsados por OpenClaw"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

# Showcase

<div className="showcase-hero">
  <p className="showcase-kicker">Construido en chats, terminales, navegadores y salas de estar</p>
  <p className="showcase-lead">Los proyectos de OpenClaw no son demostraciones de juguete. La gente está enviando bucles de revisión de PR, aplicaciones móviles, domótica, sistemas de voz, herramientas de desarrollo y flujos de trabajo intensivos en memoria desde los canales que ya utilizan.</p>
  <div className="showcase-actions">
    <a href="#videos">Ver demostraciones</a>
    <a href="#fresh-from-discord">Explorar proyectos</a>
    <a href="https://discord.gg/clawd">Compartir el tuyo</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>Compilaciones nativas de chat</strong>
      <span>Telegram, WhatsApp, Discord, Beeper, chat web y flujos de trabajo basados en terminal.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Automatización real</strong>
      <span>Reservas, compras, soporte, informes y control del navegador sin esperar una API.</span>
    </div>
    <div className="showcase-highlight">
      <strong>Local + mundo físico</strong>
      <span>Impresoras, aspiradoras, cámaras, datos de salud, sistemas del hogar y bases de conocimiento personal.</span>
    </div>
  </div>
</div>

<Info>**¿Quieres ser destacado?** Comparte tu proyecto en [#self-promotion on Discord](https://discord.gg/clawd) o [etiqueta a @openclaw en X](https://x.com/openclaw).</Info>

<div className="showcase-jump-links">
  <a href="#videos">Videos</a>
  <a href="#fresh-from-discord">Novedades de Discord</a>
  <a href="#automation-workflows">Automatización</a>
  <a href="#knowledge-memory">Memoria</a>
  <a href="#voice-phone">Voz &amp; Teléfono</a>
  <a href="#infrastructure-deployment">Infraestructura</a>
  <a href="#home-hardware">Hogar &amp; Hardware</a>
  <a href="#community-projects">Comunidad</a>
  <a href="#submit-your-project">Enviar un proyecto</a>
</div>

## Videos

<p className="showcase-section-intro">Empieza aquí si quieres el camino más corto de “¿qué es esto?” a “vale, lo entiendo”.</p>

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
    <p>VelvetShark, 28 minutos. Instala, incorpora y llega a un primer asistente funcional de extremo a extremo.</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">Ver en YouTube</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw showcase video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>Resumen de la comunidad</h3>
  <p>Un recorrido rápido por proyectos reales, superficies y flujos de trabajo construidos alrededor de OpenClaw.</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">Ver en YouTube</a>
</div>

  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="OpenClaw community showcase"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>Proyectos en el mundo real</h3>
    <p>Ejemplos de la comunidad, desde bucles de código nativos del chat hasta hardware y automatización personal.</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">Ver en YouTube</a>
  </div>
</div>

## Novedades de Discord

<p className="showcase-section-intro">Destacados recientes en programación, herramientas de desarrollo, móviles y creación de productos nativos del chat.</p>

<CardGroup cols={2}>

<Card title="Revisión de PR → Comentarios en Telegram" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode finaliza el cambio → abre un PR → OpenClaw revisa el diff y responde en Telegram con "sugerencias menores" más un veredicto claro de fusión (incluyendo correcciones críticas para aplicar primero).

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="Comentarios de revisión de PR de OpenClaw entregados en Telegram" />
</Card>

<Card title="Habilidad de Bodega en Minutos" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

Pidió una habilidad de bodega local a "Robby" (@openclaw). Solicita una exportación de ejemplo en CSV + dónde almacenarla, luego construye/prueba la habilidad rápidamente (962 botellas en el ejemplo).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw construyendo una habilidad de bodega local desde CSV" />
</Card>

<Card title="Piloto Automático de Compras Tesco" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de comidas semanal → habituales → reservar slot de entrega → confirmar pedido. Sin API, solo control del navegador.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Automatización de compras Tesco vía chat" />
</Card>

<Card title="SNAG Captura de pantalla a Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Tecla de acceso rápido para una región de la pantalla → visión de Gemini → Markdown instantáneo en tu portapapeles.

  <img src="/assets/showcase/snag.png" alt="herramienta SNAG captura de pantalla a markdown" />
</Card>

<Card title="Interfaz de Agents" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Aplicación de escritorio para gestionar habilidades/comandos en Agents, Claude, Codex y OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="Aplicación Agents UI" />
</Card>

<Card title="Notas de voz de Telegram (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Comunidad** • `voice` `tts` `telegram`

Envuelve el TTS de papla.media y envía los resultados como notas de voz de Telegram (sin reproducción automática molesta).

  <img src="/assets/showcase/papla-tts.jpg" alt="salida de nota de voz de Telegram desde TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Auxiliar instalado vía Homebrew para listar/inspeccionar/vigilar sesiones locales de OpenAI Codex (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor en ClawHub" />
</Card>

<Card title="Control de impresora 3D Bambu" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Controla y soluciona problemas de impresoras BambuLab: estado, trabajos, cámara, AMS, calibración y más.

  <img src="/assets/showcase/bambu-cli.png" alt="Skill Bambu CLI en ClawHub" />
</Card>

<Card title="Transporte de Viena (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Salidas en tiempo real, interrupciones, estado de ascensores y rutas para el transporte público de Viena.

  <img src="/assets/showcase/wienerlinien.png" alt="Skill Wiener Linien en ClawHub" />
</Card>

<Card title="Comidas escolares ParentPay" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Reserva automatizada de comidas escolares en el Reino Unido a través de ParentPay. Utiliza coordenadas del ratón para hacer clic de manera fiable en las celdas de la tabla.

</Card>

<Card title="Carga R2 (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Carga a Cloudflare R2/S3 y genera enlaces de descarga prefirmados seguros. Perfecto para instancias remotas de OpenClaw.

</Card>

<Card title="App de iOS vía Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

Construyó una aplicación de iOS completa con mapas y grabación de voz, desplegada en TestFlight totalmente a través del chat de Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="App de iOS en TestFlight" />
</Card>

<Card title="Asistente de Salud de Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Asistente de salud personal de IA que integra los datos del anillo Oura con el calendario, citas y horario del gimnasio.

  <img src="/assets/showcase/oura-health.png" alt="Asistente de salud Oura ring" />
</Card>
<Card title="El Equipo de Sueño de Kev (14+ Agentes)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

14+ agentes bajo una sola puerta de enlace con el orquestador Opus 4.5 delegando a trabajadores Codex. [Escripción técnica completa](https://github.com/adam91holt/orchestrated-ai-articles) que cubre el alineación del Dream Team, selección de modelos, sandboxing, webhooks, latidos y flujos de delegación. [Clawdspace](https://github.com/adam91holt/clawdspace) para el aislamiento de agentes. [Publicación de blog](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/).

</Card>

<Card title="CLI de Linear" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

CLI para Linear que se integra con flujos de trabajo de agentes (Claude Code, OpenClaw). Gestiona incidencias, proyectos y flujos de trabajo desde la terminal. ¡Fusionado el primer PR externo!

</Card>

<Card title="CLI de Beeper" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

Lee, envía y archiva mensajes a través de Beeper Desktop. Utiliza la API local de MCP de Beeper para que los agentes puedan gestionar todos tus chats (iMessage, WhatsApp, etc.) en un solo lugar.

</Card>

</CardGroup>

<a id="automation-workflows"></a>

## Automatización y flujos de trabajo

<p className="showcase-section-intro">Programación, control del navegador, bucles de soporte y el lado de “hazme la tarea” del producto.</p>

<CardGroup cols={2}>

<Card title="Control del purificador de aire Winix" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code descubrió y confirmó los controles del purificador, luego OpenClaw se encarga de gestionar la calidad del aire de la habitación.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Control del purificador de aire Winix mediante OpenClaw" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

Activado por una cámara en el teclado: pedir a OpenClaw que tome una foto del cielo siempre que se vea bonito: diseñó una habilidad y tomó la foto.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

Un mensaje programado genera una imagen de "escena" cada mañana (clima, tareas, fecha, publicación/cita favorita) a través de un persona de OpenClaw.

</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Comprobador de disponibilidad de Playtomic + reserva por CLI. Nunca pierdas una cancha abierta de nuevo.
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting Intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf` Recopila PDFs del correo electrónico, prepara documentos para el asesor fiscal. Contabilidad mensual en piloto automático.
</Card>

<Card title="Modo Dev Couch Potato" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

Reconstruyó todo el sitio personal a través de Telegram mientras veía Netflix: Notion → Astro, 18 publicaciones migradas, DNS a Cloudflare. Nunca abrió un portátil.

</Card>

<Card title="Agente de Búsqueda de Empleo" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Busca ofertas de empleo, las compara con palabras clave del CV y devuelve oportunidades relevantes con enlaces. Construido en 30 minutos usando la API de JSearch.

</Card>

<Card title="Generador de Habilidades de Jira" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw se conectó a Jira y luego generó una nueva habilidad al vuelo (antes de que existiera en ClawHub).

</Card>

<Card title="Habilidad de Todoist vía Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

Automatizó las tareas de Todoist e hizo que OpenClaw generara la habilidad directamente en el chat de Telegram.

</Card>

<Card title="TradingView Analysis" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Inicia sesión en TradingView mediante automatización del navegador, captura pantallas de los gráficos y realiza análisis técnicos bajo demanda. No se necesita ninguna API, solo el control del navegador.

</Card>

<Card title="Slack Auto-Support" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Vigila el canal de Slack de la empresa, responde de manera útil y reenvía las notificaciones a Telegram. Corrigió de forma autónoma un error de producción en una aplicación implementada sin que se le pidiera.

</Card>

</CardGroup>

<a id="knowledge-memory"></a>

## Conocimiento y Memoria

<p className="showcase-section-intro">Sistemas que indexan, buscan, recuerdan y razonan sobre el conocimiento personal o del equipo.</p>

<CardGroup cols={2}>

<Card title="xuezh Chinese Learning" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` Motor de aprendizaje de chino con comentarios sobre la pronunciación y flujos de estudio a través de OpenClaw.
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp Memory Vault" icon="vault">
  **Community** • `memory` `transcription` `indexing` Ingiere exportaciones completas de WhatsApp, transcribe más de 1000 notas de voz, verifica con los registros de git y genera informes de markdown vinculados.
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` Añade búsqueda vectorial a los marcadores de Karakeep utilizando Qdrant + incrustaciones de OpenAI/Ollama.
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **Community** • `memory` `beliefs` `self-model` Gestor de memoria separado que convierte archivos de sesión en memorias → creencias → modelo propio evolutivo.
</Card>

</CardGroup>

<a id="voice-phone"></a>

## Voz y teléfono

<p className="showcase-section-intro">Puntos de entrada primero por voz, puentes telefónicos y flujos de trabajo intensivos en transcripción.</p>

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Puente HTTP entre el asistente de voz Vapi y OpenClaw. Llamadas telefónicas casi en tiempo real con tu agente.
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcripción de audio multilingüe a través de OpenRouter (Gemini, etc.). Disponible en ClawHub.

</Card>

</CardGroup>

<a id="infrastructure-deployment"></a>

## Infraestructura e implementación

<p className="showcase-section-intro">Empaquetado, implementación e integraciones que facilitan la ejecución y extensión de OpenClaw.</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` OpenClaw gateway ejecutándose en Home Assistant OS con soporte para túnel SSH y estado persistente.
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` Control y automatización de dispositivos de Home Assistant mediante lenguaje natural.
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` Configuración de OpenClaw nificada e integral para despliegues reproducibles.
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` Habilidad de calendario usando khal/vdirsyncer. Integración de calendario autoalojado.
</Card>

</CardGroup>

<a id="home-hardware"></a>

## Hogar y Hardware

<p className="showcase-section-intro">El lado del mundo físico de OpenClaw: hogares, sensores, cámaras, aspiradoras y otros dispositivos.</p>

<CardGroup cols={2}>

<Card title="Automatización del hogar" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` Automatización del hogar nativa de Nix con OpenClaw como interfaz, además de hermosos paneles de Grafana.
  <img src="/assets/showcase/gohome-grafana.png" alt="Panel de Grafana de GoHome" />
</Card>

<Card title="Aspiradora Roborock" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` Controla tu aspiradora robot Roborock mediante una conversación natural.
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Estado de Roborock" />
</Card>

</CardGroup>

## Proyectos de la comunidad

<p className="showcase-section-intro">Cosas que crecieron más allá de un solo flujo de trabajo hasta convertirse en productos o ecosistemas más amplios.</p>

<CardGroup cols={2}>

<Card title="Mercado StarSwap" icon="star" href="https://star-swap.com/">
  **Comunidad** • `marketplace` `astronomy` `webapp` Un mercado completo de equipamiento de astronomía. Construido con/alrededor del ecosistema OpenClaw.
</Card>

</CardGroup>

---

## Envía tu proyecto

<p className="showcase-section-intro">Si estás construyendo algo interesante con OpenClaw, envíalo. Las capturas de pantalla claras y los resultados concretos ayudan.</p>

¿Tienes algo que compartir? ¡Nos encantaría presentarlo!

<Steps>
  <Step title="Compártelo">Publica en [#self-promotion en Discord](https://discord.gg/clawd) o [tuitea a @openclaw](https://x.com/openclaw)</Step>
  <Step title="Incluye detalles">Cuéntanos qué hace, enlaza al repositorio/demo, comparte una captura de pantalla si tienes una</Step>
  <Step title="Ser destacado">Añadiremos proyectos destacados a esta página</Step>
</Steps>
