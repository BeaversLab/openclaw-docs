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

ClawHub es la superficie canónica de descubrimiento para complementos de la comunidad. No abra PRs solo para documentación solo para agregar su complemento aquí para que sea descubrible; publíquelo en ClawHub en su lugar.

```bash
openclaw plugins install <package-name>
```

OpenClaw verifica ClawHub primero y recurre automáticamente a npm.

## Complementos listados

### Puente del servidor de aplicaciones Codex

Puente independiente de OpenClaw para conversaciones del servidor de aplicaciones Codex. Vincule un chat a un hilo de Codex, hable con él en texto plano y contólelo con comandos nativos del chat para reanudar, planificar, revisar, seleccionar modelos, compactación y más.

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Integración de robot empresarial usando el modo Stream. Soporta mensajes de texto, imágenes y archivos a través de cualquier cliente de DingTalk.

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Complemento de gestión de contexto sin pérdidas para OpenClaw. Resumen de conversaciones basado en DAG con compactación incremental: preserva la fidelidad completa del contexto mientras reduce el uso de tokens.

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Complemento oficial que exporta trazas de agentes a Opik. Monitoree el comportamiento del agente, costos, tokens, errores y más.

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

Conecte OpenClaw a QQ a través de la API de QQ Bot. Soporta chats privados, menciones de grupo, mensajes de canales y contenido multimedia enriquecido que incluye voz, imágenes, videos y archivos.

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Complemento de canal WeCom para OpenClaw por el equipo de Tencent WeCom. Impulsado por conexiones persistentes de WebSocket del bot WeCom, admite mensajes directos y chats grupales, respuestas en streaming, mensajería proactiva, procesamiento de imágenes/archivos, formato Markdown, control de acceso integrado y habilidades de documentación/reuniones/mensajería.

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Envíe su complemento

Damos la bienvenida a complementos de la comunidad que sean útiles, documentados y seguros de operar.

<Steps>
  <Step title="Publicar en ClawHub o npm">
    Su complemento debe ser instalable a través de `openclaw plugins install \<package-name\>`.
    Publíquelo en [ClawHub](/es/tools/clawhub) (preferido) o npm.
    Consulte [Building Plugins](/es/plugins/building-plugins) para obtener la guía completa.

  </Step>

  <Step title="Alojar en GitHub">
    El código fuente debe estar en un repositorio público con documentación de configuración y un seguimiento de problemas.

  </Step>

  <Step title="Usar PRs de documentos solo para cambios en documentos fuente">
    No necesita un PR de documentos solo para que su complemento sea detectable. Publíquelo en ClawHub en su lugar.

    Abra un PR de documentos solo cuando los documentos fuente de OpenClaw necesiten un cambio real de contenido, como corregir la guía de instalación o agregar documentación entre repositorios que pertenezca al conjunto principal de documentos.

  </Step>
</Steps>

## Nivel de calidad

| Requisito                            | Por qué                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| Publicado en ClawHub o npm           | Los usuarios necesitan `openclaw plugins install` para que funcione |
| Repositorio público de GitHub        | Revisión del código fuente, seguimiento de problemas, transparencia |
| Documentación de configuración y uso | Los usuarios necesitan saber cómo configurarlo                      |
| Mantenimiento activo                 | Actualizaciones recientes o manejo de problemas responsivo          |

Los envoltorios de bajo esfuerzo, la propiedad poco clara o los paquetes no mantenidos pueden ser rechazados.

## Relacionado

- [Install and Configure Plugins](/es/tools/plugin) — cómo instalar cualquier complemento
- [Building Plugins](/es/plugins/building-plugins) — crear el suyo propio
- [Plugin Manifest](/es/plugins/manifest) — esquema de manifiesto
