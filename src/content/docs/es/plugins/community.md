---
summary: "Complementos de OpenClaw mantenidos por la comunidad: explore, instale y envíe los suyos"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Complementos de la comunidad"
---

Los complementos de la comunidad son paquetes de terceros que amplían OpenClaw con nuevos canales, herramientas, proveedores u otras capacidades. Son creados y mantenidos por la comunidad, generalmente publicados en [ClawHub](/es/clawhub) e instalables con un solo comando. Npm sigue siendo el predeterminado de lanzamiento para especificaciones de paquetes básicos, mientras se implementan las instalaciones de paquetes de ClawHub.

ClawHub es la superficie de descubrimiento canónica para los complementos de la comunidad. No abra
PRs solo para documentación con el fin de agregar su complemento aquí para su descubrimiento; en su lugar, publíquelo en
ClawHub.

```bash
openclaw plugins install clawhub:<package-name>
```

Use `openclaw plugins install <package-name>` para paquetes alojados en npm.

## Complementos listados

### Apify

Extraiga datos de cualquier sitio web con más de 20,000 raspadores listos para usar. Permita que su agente
extraiga datos de Instagram, Facebook, TikTok, YouTube, Google Maps, Google
Search, sitios de comercio electrónico y más, simplemente pidiéndolo.

- **npm:** `@apify/apify-openclaw-plugin`
- **repo:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

Puente OpenClaw independiente para conversaciones de Codex App Server. Vincule un chat a
un hilo de Codex, hable con él en texto plano y contólelo con comandos
nativos del chat para reanudar, planificar, revisar, selección de modelo, compactación y más.

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Integración de robot empresarial utilizando el modo Stream. Admite mensajes de texto, imágenes y
archivos a través de cualquier cliente de DingTalk.

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Complemento de gestión de contexto sin pérdidas para OpenClaw. Resumen de conversación
basado en DAG con compactación incremental: preserva la fidelidad completa del contexto
mientras reduce el uso de tokens.

- **npm:** `@martian-engineering/lossless-claw`
- **repositorio:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Complemento oficial que exporta trazas de agentes a Opik. Monitoree el comportamiento del agente,
costo, tokens, errores y más.

- **npm:** `@opik/opik-openclaw`
- **repositorio:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

Dale a tu agente OpenClaw un avatar Live2D con sincronización labial en tiempo real, expresiones de emoción y texto a voz. Incluye herramientas de creador para la generación de activos con IA y el despliegue con un solo clic en el Prometheus Marketplace. Actualmente en alfa.

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repositorio:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

Conecta OpenClaw con QQ a través de la API de QQ Bot. Soporta chats privados, menciones de grupo, mensajes de canal y contenido enriquecido que incluye voz, imágenes, videos y archivos.

Las versiones actuales de OpenClaw incluyen QQ Bot. Utilice la configuración incluida en
[QQ Bot](/es/channels/qqbot) para instalaciones normales; instale este plugin externo solo
cuando desee intencionalmente el paquete independiente mantenido por Tencent.

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repositorio:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Complemento de canal WeCom para OpenClaw por el equipo de Tencent WeCom. Impulsado por conexiones persistentes de WebSocket de WeCom Bot, soporta mensajes directos y chats grupales, respuestas en streaming, mensajería proactiva, procesamiento de imágenes/archivos, formato Markdown, control de acceso integrado y habilidades de documentos/reuniones/mensajería.

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repositorio:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

Complemento de canal Yuanbao para OpenClaw por el equipo de Tencent Yuanbao. Impulsado por conexiones persistentes de WebSocket, admite mensajes directos y chats grupales, respuestas en streaming, mensajería proactiva, procesamiento de imagen/archivo/audio/video, formato Markdown, control de acceso integrado y menús de comandos con barra.

- **npm:** `openclaw-plugin-yuanbao`
- **repositorio:** [github.com/YuanbaoTeam/yuanbao-openclaw-plugin](https://github.com/YuanbaoTeam/yuanbao-openclaw-plugin)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## Envía tu complemento

Damos la bienvenida a los complementos de la comunidad que sean útiles, documentados y seguros de operar.

<Steps>
  <Step title="Publicar en ClawHub o npm">
    Tu complemento debe ser instalable a través de `openclaw plugins install \<package-name\>`.
    Publica en [ClawHub](/es/clawhub) a menos que específicamente necesites
    distribución solo por npm.
    Consulta [Building Plugins](/es/plugins/building-plugins) para la guía completa.

  </Step>

  <Step title="Alojar en GitHub">
    El código fuente debe estar en un repositorio público con documentos de configuración y un seguimiento de problemas.

  </Step>

  <Step title="Use docs PRs only for source-doc changes">
    No necesitas un PR en los documentos solo para hacer que tu plugin sea descubrible. Publícalo
    en ClawHub en su lugar.

    Abre un PR en los documentos solo cuando los documentos fuente de OpenClaw necesiten un cambio real de contenido,
    como corregir las instrucciones de instalación o agregar documentación entre repos
    que pertenezca al conjunto principal de documentos.

  </Step>
</Steps>

## Nivel de calidad

| Requisito                            | Por qué                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| Publicado en ClawHub o npm           | Los usuarios necesitan `openclaw plugins install` para funcionar    |
| Repositorio público de GitHub        | Revisión del código fuente, seguimiento de problemas, transparencia |
| Documentación de configuración y uso | Los usuarios necesitan saber cómo configurarlo                      |
| Mantenimiento activo                 | Actualizaciones recientes o manejo receptivo de problemas           |

Los envoltorios de bajo esfuerzo, la propiedad poco clara o los paquetes sin mantenimiento pueden ser rechazados.

## Relacionado

- [Instalar y configurar complementos](/es/tools/plugin) — cómo instalar cualquier complemento
- [Construir complementos](/es/plugins/building-plugins) — crear el tuyo propio
- [Manifiesto del complemento](/es/plugins/manifest) — esquema del manifiesto
