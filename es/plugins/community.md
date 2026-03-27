---
summary: "Complementos de OpenClaw mantenidos por la comunidad: busque, instale y envíe los suyos"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Complementos de la comunidad"
---

# Complementos de la comunidad

Los complementos comunitarios son paquetes de terceros que amplían OpenClaw con nuevos
canales, herramientas, proveedores u otras capacidades. Son construidos y mantenidos
por la comunidad, publicados en [ClawHub](/es/tools/clawhub) o npm, e
instalables con un solo comando.

```bash
openclaw plugins install <package-name>
```

OpenClaw verifica ClawHub primero y recurre automáticamente a npm.

## Complementos listados

### Puente del servidor de aplicaciones Codex

Puente independiente de OpenClaw para las conversaciones del servidor de aplicaciones Codex. Vincule un chat a
un hilo de Codex, hable con él en texto plano y controlarlo con comandos
nativos del chat para reanudar, planificar, revisar, selección de modelos, compactación y más.

- **npm:** `openclaw-codex-app-server`
- **repositorio:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Integración de robot empresarial utilizando el modo Stream. Admite texto, imágenes y
mensajes de archivos a través de cualquier cliente de DingTalk.

- **npm:** `@largezhou/ddingtalk`
- **repositorio:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

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

### QQbot

Conecte OpenClaw a QQ a través de la API de QQ Bot. Admite chats privados, menciones de grupo,
mensajes de canal y contenido multimedia enriquecido que incluye voz, imágenes, videos
y archivos.

- **npm:** `@sliverp/qqbot`
- **repositorio:** [github.com/sliverp/qqbot](https://github.com/sliverp/qqbot)

```bash
openclaw plugins install @sliverp/qqbot
```

### wecom

Plugin de canal empresarial de WeCom para OpenClaw.
Un plugin de bot impulsado por conexiones persistentes de WebSocket del Bot de IA de WeCom,
soporta mensajes directos y chats grupales, respuestas en streaming y mensajería proactiva.

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Envía tu plugin

Damos la bienvenida a los plugins de la comunidad que sean útiles, documentados y seguros de operar.

<Steps>
  <Step title="Publicar en ClawHub o npm">
    Tu plugin debe poder instalarse mediante `openclaw plugins install \<package-name\>`.
    Publícalo en [ClawHub](/es/tools/clawhub) (preferible) o npm.
    Consulte [Creación de Plugins](/es/plugins/building-plugins) para obtener la guía completa.

  </Step>

  <Step title="Alojar en GitHub">
    El código fuente debe estar en un repositorio público con documentación de configuración y un
    rastreador de problemas.

  </Step>

  <Step title="Abrir un PR">
    Agrega tu plugin a esta página con:

    - Nombre del plugin
    - Nombre del paquete npm
    - URL del repositorio de GitHub
    - Descripción de una línea
    - Comando de instalación

  </Step>
</Steps>

## Nivel de calidad

| Requisito                            | Por qué                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| Publicado en ClawHub o npm           | Los usuarios necesitan `openclaw plugins install` para funcionar |
| Repositorio público de GitHub        | Revisión del código, seguimiento de problemas, transparencia     |
| Documentación de configuración y uso | Los usuarios necesitan saber cómo configurarlo                   |
| Mantenimiento activo                 | Actualizaciones recientes o manejo de problemas receptivo        |

Los envoltorios de bajo esfuerzo, la propiedad poco clara o los paquetes no mantenidos pueden ser rechazados.

## Relacionado

- [Instalar y configurar plugins](/es/tools/plugin) — cómo instalar cualquier plugin
- [Creación de Plugins](/es/plugins/building-plugins) — crea el tuyo propio
- [Manifiesto de Plugin](/es/plugins/manifest) — esquema de manifiesto

import es from "/components/footer/es.mdx";

<es />
