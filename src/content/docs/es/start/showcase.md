---
summary: "Proyectos e integraciones creados por la comunidad impulsados por OpenClaw"
title: "Showcase"
description: "Proyectos reales de OpenClaw de la comunidad"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

Los proyectos de OpenClaw no son demos de juguete. Las personas están implementando bucles de revisión de PR, aplicaciones móviles, automatización del hogar, sistemas de voz, herramientas de desarrollo y flujos de trabajo intensivos en memoria desde los canales que ya usan: compilaciones nativas de chat en Telegram, WhatsApp, Discord y terminales; automatización real para reservas, compras y soporte sin esperar una API; e integraciones con el mundo físico con impresoras, aspiradoras, cámaras y sistemas del hogar.

<Info>**¿Quieres ser destacado?** Comparte tu proyecto en [#self-promotion en Discord](https://discord.gg/clawd) o [etiqueta a @openclaw en X](https://x.com/openclaw).</Info>

## Novedades de Discord

Destacados recientes en desarrollo, herramientas de desarrollo, móviles y creación de productos nativos de chat.

<CardGroup cols={2}>

<Card title="Comentarios de revisión de PR a Telegram" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode termina el cambio, abre un PR, OpenClaw revisa el diff y responde en Telegram con sugerencias además de un veredicto claro de fusión.

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="Comentarios de revisión de PR de OpenClaw entregados en Telegram" />
</Card>

<Card title="Skill de Bodega de Vinos en Minutos" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

Pidió un "Robby" (@openclaw) para una skill local de bodega de vinos. Solicita una exportación de muestra CSV y una ruta de tienda, luego construye y prueba la skill (962 botellas en el ejemplo).

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw construyendo una skill local de bodega de vinos desde CSV" />
</Card>

<Card title="Piloto Automático de Compras Tesco" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

Plan de comidas semanal, habituales, reservar ranura de entrega, confirmar pedido. Sin APIs, solo control del navegador.

  <img src="/assets/showcase/tesco-shop.jpg" alt="Automatización de compras Tesco vía chat" />
</Card>

<Card title="SNAG captura-de-pantalla-a-Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

Tecla de acceso rápido para una región de la pantalla, visión Gemini, Markdown instantáneo en su portapapeles.

  <img src="/assets/showcase/snag.png" alt="SNAG herramienta de captura-de-pantalla-a-markdown" />
</Card>

<Card title="Interfaz de Agents" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

Aplicación de escritorio para gestionar habilidades y comandos en Agents, Claude, Codex y OpenClaw.

  <img src="/assets/showcase/agents-ui.jpg" alt="App de Interfaz de Agents" />
</Card>

<Card title="Notas de voz de Telegram (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Comunidad** • `voice` `tts` `telegram`

Envuelve el TTS de papla.media y envía los resultados como notas de voz de Telegram (sin reproducción automática molesta).

  <img src="/assets/showcase/papla-tts.jpg" alt="Salida de nota de voz de Telegram desde TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Ayudante instalado mediante Homebrew para listar, inspeccionar y ver sesiones locales de OpenAI Codex (CLI + VS Code).

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor en ClawHub" />
</Card>

<Card title="Control de impresora 3D Bambu" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

Controla y soluciona problemas de impresoras BambuLab: estado, trabajos, cámara, AMS, calibración y más.

  <img src="/assets/showcase/bambu-cli.png" alt="Habilidad Bambu CLI en ClawHub" />
</Card>

<Card title="Transporte de Viena (Wiener Linien)" icon="tren" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

Salidas en tiempo real, interrupciones, estado de los ascensores y rutas para el transporte público de Viena.

  <img src="/assets/showcase/wienerlinien.png" alt="Skill de Wiener Linien en ClawHub" />
</Card>

<Card title="Comidas escolares ParentPay" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

Reserva automatizada de comidas escolares en el Reino Unido a través de ParentPay. Utiliza coordenadas del ratón para hacer clic de forma fiable en las celdas de la tabla.

</Card>

<Card title="R2 upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

Cargar a Cloudflare R2/S3 y generar enlaces de descarga firmados y seguros. Útil para instancias remotas de OpenClaw.

  <img src="/assets/showcase/r2-upload.png" alt="R2 upload skill on ClawHub" />
</Card>

<Card title="Aplicación de iOS a través de Telegram" icon="móvil">
  **@coard** • `ios` `xcode` `testflight`

Construyó una aplicación de iOS completa con mapas y grabación de voz, desplegada en TestFlight completamente a través del chat de Telegram.

  <img src="/assets/showcase/ios-testflight.jpg" alt="Aplicación de iOS en TestFlight" />
</Card>

<Card title="Asistente de salud de Oura Ring" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

Asistente de salud personal con IA que integra los datos de Oura Ring con el calendario, las citas y el horario del gimnasio.

  <img src="/assets/showcase/oura-health.png" alt="Asistente de salud de Oura Ring" />
</Card>

<Card title="El equipo soñado de Kev (14+ agentes)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

14+ agentes bajo una sola pasarela con un orquestador Opus 4.5 que delega a los trabajadores de Codex. Consulte el [artículo técnico](https://github.com/adam91holt/orchestrated-ai-articles) y [Clawdspace](https://github.com/adam91holt/clawdspace) para el aislamiento de agentes.

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

CLI para Linear que se integra con flujos de trabajo de agentes (Claude Code, OpenClaw). Gestiona problemas, proyectos y flujos de trabajo desde la terminal.

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

Lee, envíe y archive mensajes a través de Beeper Desktop. Utiliza la API MCP local de Beeper para que los agentes puedan gestionar todos sus chats (iMessage, WhatsApp y más) en un solo lugar.

</Card>

</CardGroup>

## Automatización y flujos de trabajo

Programación, control del navegador, bucles de soporte y el lado "simplemente haz la tarea por mí" del producto.

<CardGroup cols={2}>

<Card title="Winix air purifier control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code descubrió y confirmó los controles del purificador, luego OpenClaw se encarga de gestionar la calidad del aire de la habitación.

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Pretty sky camera shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

Activado por una cámara en el techo: pedir a OpenClaw que tome una foto del cielo siempre que se vea bonito. Diseñó una habilidad y tomó la foto.

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual morning briefing scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

Un mensaje programado genera una imagen de escena cada mañana (clima, tareas, fecha, publicación favorita o cita) a través de un personaje de OpenClaw.

</Card>

<Card title="Reserva de pistas de pádel" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Verificador de disponibilidad de Playtomic y CLI de reserva. Nunca pierdas una pista libre de nuevo.

  <img src="/assets/showcase/padel-screenshot.jpg" alt="captura de pantalla de padel-cli" />
</Card>

<Card title="Gestión contable" icon="file-invoice-dollar">
  **Comunidad** • `automation` `email` `pdf`

Recopila PDFs del correo electrónico, prepara documentos para un asesor fiscal. Contabilidad mensual en piloto automático.

</Card>

<Card title="Modo desarrollador vagón" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

Reconstruyó un sitio personal completo a través de Telegram mientras veía Netflix — de Notion a Astro, 18 publicaciones migradas, DNS a Cloudflare. Sin abrir un portátil.

</Card>

<Card title="Agente de búsqueda de empleo" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

Busca ofertas de empleo, las compara con palabras clave del CV y devuelve oportunidades relevantes con enlaces. Construido en 30 minutos usando la API JSearch.

</Card>

<Card title="Constructor de habilidades de Jira" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw se conectó a Jira y luego generó una nueva habilidad al vuelo (antes de que existiera en ClawHub).

</Card>

<Card title="Habilidad de Todoist vía Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

Automatizó tareas de Todoist e hizo que OpenClaw generara la habilidad directamente en el chat de Telegram.

</Card>

<Card title="Análisis de TradingView" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

Inicia sesión en TradingView mediante automatización del navegador, captura pantallas de los gráficos y realiza análisis técnico bajo demanda. No se necesita API — solo control del navegador.

</Card>

<Card title="Soporte automático de Slack" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

Supervisa un canal de Slack de la empresa, responde de manera útil y reenvía notificaciones a Telegram. Corrigió de forma autónoma un error de producción en una aplicación implementada sin que se le solicitara.

</Card>

</CardGroup>

## Conocimiento y memoria

Sistemas que indexan, buscan, recuerdan y razonan sobre el conocimiento personal o del equipo.

<CardGroup cols={2}>

<Card title="aprendizaje de chino xuezh" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

Motor de aprendizaje de chino con comentarios sobre la pronunciación y flujos de estudio a través de OpenClaw.

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="comentarios de pronunciación xuezh" />
</Card>

<Card title="Bóveda de memoria de WhatsApp" icon="vault">
  **Comunidad** • `memory` `transcription` `indexing`

Ingesta exportaciones completas de WhatsApp, transcribe más de 1000 notas de voz, contrasta con registros de git, genera informes vinculados en markdown.

</Card>

<Card title="Búsqueda semántica Karakeep" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

Añade búsqueda vectorial a los marcadores de Karakeep utilizando Qdrant junto con incrustaciones de OpenAI u Ollama.

</Card>

<Card title="Memoria Inside-Out-2" icon="brain">
  **Comunidad** • `memory` `beliefs` `self-model`

Gestor de memoria separado que convierte archivos de sesión en recuerdos, luego en creencias y finalmente en un modelo propio evolutivo.

</Card>

</CardGroup>

## Voz y teléfono

Puntos de entrada con prioridad de voz, puentes telefónicos y flujos de trabajo intensivos en transcripción.

<CardGroup cols={2}>

<Card title="Puente telefónico Clawdia" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Asistente de voz Vapi a puente HTTP de OpenClaw. Llamadas telefónicas casi en tiempo real con tu agente.

</Card>

<Card title="Transcripción OpenRouter" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

Transcripción de audio multilingüe a través de OpenRouter (Gemini y más). Disponible en ClawHub.

  <img src="/assets/showcase/openrouter-transcribe.png" alt="Habilidad de transcripción OpenRouter en ClawHub" />
</Card>

</CardGroup>

## Infraestructura e implementación

Empaquetado, implementación e integraciones que hacen que OpenClaw sea más fácil de ejecutar y ampliar.

<CardGroup cols={2}>

<Card title="Complemento de Home Assistant" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

Pasarela OpenClaw ejecutándose en Home Assistant OS con soporte para túnel SSH y estado persistente.

</Card>

<Card title="Habilidad de Home Assistant" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

Controle y automatice dispositivos de Home Assistant mediante lenguaje natural.

  <img src="/assets/showcase/homeassistant.png" alt="Habilidad de Home Assistant en ClawHub" />
</Card>

<Card title="Empaquetado Nix" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

Configuración de OpenClaw nificada e incluida para despliegues reproducibles.

</Card>

<Card title="Calendario CalDAV" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

Habilidad de calendario que utiliza khal y vdirsyncer. Integración de calendario autohospedado.

  <img src="/assets/showcase/caldav-calendar.png" alt="Habilidad de calendario CalDAV en ClawHub" />
</Card>

</CardGroup>

## Hogar y hardware

El lado del mundo físico de OpenClaw: hogares, sensores, cámaras, aspiradoras y otros dispositivos.

<CardGroup cols={2}>

<Card title="Automatización del hogar GoHome" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

Automatización del hogar nativa de Nix con OpenClaw como interfaz, además de paneles de Grafana.

  <img src="/assets/showcase/gohome-grafana.png" alt="Panel de Grafana GoHome" />
</Card>

<Card title="Aspiradora Roborock" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

Controla tu aspiradora robot Roborock a través de una conversación natural.

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Estado de Roborock" />
</Card>

</CardGroup>

## Proyectos de la comunidad

Cosas que crecieron más allá de un solo flujo de trabajo para convertirse en productos o ecosistemas más amplios.

<CardGroup cols={2}>

<Card title="Mercado StarSwap" icon="star" href="https://star-swap.com/">
  **Comunidad** • `marketplace` `astronomy` `webapp`

Mercado completo de equipos de astronomía. Construido con y alrededor del ecosistema OpenClaw.

</Card>

</CardGroup>

## Envía tu proyecto

<Steps>
  <Step title="Compártelo">Publica en [#self-promotion on Discord](https://discord.gg/clawd) o [tuitea @openclaw](https://x.com/openclaw).</Step>
  <Step title="Incluye detalles">Cuéntanos qué hace, comparte el enlace al repositorio o a la demo, y comparte una captura de pantalla si tienes una.</Step>
  <Step title="Consigue que te destaquen">Añadiremos los proyectos destacados a esta página.</Step>
</Steps>

## Relacionado

- [Para empezar](/es/start/getting-started)
- [OpenClaw](/es/start/openclaw)
