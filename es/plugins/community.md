---
summary: "Complementos de la comunidad: estándar de calidad, requisitos de alojamiento y ruta de envío de PR"
read_when:
  - You want to publish a third-party OpenClaw plugin
  - You want to propose a plugin for docs listing
title: "Complementos de la comunidad"
---

# Complementos de la comunidad

Esta página rastrea complementos de **alto calidad mantenidos por la comunidad** para OpenClaw.

Aceptamos PRs que agreguen complementos de la comunidad aquí cuando cumplan con el estándar de calidad.

## Requisitos para el listado

- El paquete del complemento está publicado en npmjs (instalable vía `openclaw plugins install <npm-spec>`).
- El código fuente está alojado en GitHub (repositorio público).
- El repositorio incluye documentación de configuración/uso y un rastreador de problemas.
- El complemento tiene una señal clara de mantenimiento (mantenedor activo, actualizaciones recientes o gestión de problemas receptiva).

## Cómo enviar

Abre un PR que agregue tu complemento a esta página con:

- Nombre del complemento
- Nombre del paquete npm
- URL del repositorio GitHub
- Descripción de una línea
- Comando de instalación

## Estándar de revisión

Preferimos complementos que sean útiles, documentados y seguros de operar.
Los envoltorios de poco esfuerzo, propiedad poco clara o paquetes no mantenidos pueden ser rechazados.

## Formato de candidato

Usa este formato al agregar entradas:

- **Nombre del complemento** — descripción breve
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## Complementos listados

- **openclaw-dingtalk** — El complemento del canal DingTalk de OpenClaw permite la integración de robots empresariales mediante el modo Stream. Admite mensajes de texto, imágenes y archivos a través de cualquier cliente de DingTalk.
  npm: `@largezhou/ddingtalk`
  repo: `https://github.com/largezhou/openclaw-dingtalk`
  install: `openclaw plugins install @largezhou/ddingtalk`
- **QQbot** — Conecta OpenClaw con QQ a través de la API de QQ Bot. Admite chats privados, menciones de grupo, mensajes de canales y contenidos multimedia enriquecidos, incluyendo voz, imágenes, videos y archivos.
  npm: `@sliverp/qqbot`
  repo: `https://github.com/sliverp/qqbot`
  install: `openclaw plugins install @sliverp/qqbot`

- **WeChat** — Conecta OpenClaw con cuentas personales de WeChat a través de WeChatPadPro (protocolo iPad). Admite el intercambio de texto, imágenes y archivos con conversaciones activadas por palabras clave.
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`

import es from "/components/footer/es.mdx";

<es />
