---
summary: "Complementos de la comunidad: nivel de calidad, requisitos de alojamiento y ruta de envío de PR"
read_when:
  - Quieres publicar un complemento de terceros de OpenClaw
  - Quieres proponer un complemento para el listado de la documentación
title: "Complementos de la comunidad"
---

# Complementos de la comunidad

Esta página rastrea **complementos mantenidos por la comunidad** de alta calidad para OpenClaw.

Aceptamos PRs que agreguen complementos de la comunidad aquí cuando cumplan con el nivel de calidad.

## Requisitos para el listado

- El paquete del complemento está publicado en npmjs (instalable vía `openclaw plugins install <npm-spec>`).
- El código fuente está alojado en GitHub (repositorio público).
- El repositorio incluye documentación de configuración/uso y un seguimiento de problemas.
- El complemento tiene una señal clara de mantenimiento (mantenedor activo, actualizaciones recientes o manejo de problemas receptivo).

## Cómo enviar

Abre un PR que agregue tu complemento a esta página con:

- Nombre del complemento
- Nombre del paquete npm
- URL del repositorio GitHub
- Descripción de una línea
- Comando de instalación

## Nivel de revisión

Preferimos complementos que sean útiles, documentados y seguros de operar.
Los envoltorios de bajo esfuerzo, la propiedad poco clara o los paquetes no mantenidos pueden ser rechazados.

## Formato de candidato

Usa este formato al agregar entradas:

- **Nombre del Complemento** — breve descripción
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## Complementos listados

- **WeChat** — Conecta OpenClaw con cuentas personales de WeChat vía WeChatPadPro (protocolo iPad). Admite el intercambio de texto, imágenes y archivos con conversaciones activadas por palabras clave.
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`

import es from "/components/footer/es.mdx";

<es />
