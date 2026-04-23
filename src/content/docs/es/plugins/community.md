---
summary: "Complementos de OpenClaw mantenidos por la comunidad: navega, instala y envía los tuyos"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "Complementos de la comunidad"
---

# Complementos de la comunidad

Los complementos de la comunidad son paquetes de terceros que amplían OpenClaw con nuevos
canales, herramientas, proveedores u otras capacidades. Son creados y mantenidos
por la comunidad, publicados en [ClawHub](/es/tools/clawhub) o npm, e
instalables con un solo comando.

ClawHub es la superficie canónica de descubrimiento para complementos de la comunidad. No abra PRs solo para documentación solo para agregar su complemento aquí para que sea descubrible; publíquelo en ClawHub en su lugar.

```bash
openclaw plugins install <package-name>
```

OpenClaw verifica ClawHub primero y recurre automáticamente a npm.

## Complementos listados

### Apify

Extrae datos de cualquier sitio web con más de 20,000 raspadores listos para usar. Permite que tu agente
extraiga datos de Instagram, Facebook, TikTok, YouTube, Google Maps, Google
Search, sitios de comercio electrónico y más, simplemente preguntando.

- **npm:** `@apify/apify-openclaw-plugin`
- **repositorio:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Puente de Codex App Server

Puente independiente de OpenClaw para conversaciones de Codex App Server. Vincula un chat a
un hilo de Codex, háblale con texto plano y contóalo con comandos
nativos del chat para reanudar, planificar, revisar, selección de modelos, compactación y más.

- **npm:** `openclaw-codex-app-server`
- **repositorio:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

Integración de robots empresariales utilizando el modo Stream. Admite mensajes de texto, imágenes y
archivos a través de cualquier cliente de DingTalk.

- **npm:** `@largezhou/ddingtalk`
- **repositorio:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Complemento de gestión de contexto sin pérdidas para OpenClaw. Resumen de conversación
basado en DAG con compactación incremental: preserva la fidelidad total del contexto
mientras reduce el uso de tokens.

- **npm:** `@martian-engineering/lossless-claw`
- **repositorio:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

Complemento oficial que exporta las trazas de los agentes a Opik. Monitorea el comportamiento de los agentes,
costo, tokens, errores y más.

- **npm:** `@opik/opik-openclaw`
- **repositorio:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

Dale a tu agente OpenClaw un avatar Live2D con sincronización labial en tiempo real, expresiones de emoción y texto a voz. Incluye herramientas de creación para generación de activos con IA e implementación con un solo clic en el Mercado de Prometheus. Actualmente en alfa.

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

Conecta OpenClaw con QQ a través de la API de QQ Bot. Soporta chats privados, menciones de grupo, mensajes de canales y medios enriquecidos que incluyen voz, imágenes, videos y archivos.

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Complemento de canal WeCom para OpenClaw por el equipo de Tencent WeCom. Impulsado por conexiones persistentes de WebSocket de WeCom Bot, soporta mensajes directos y chats grupales, respuestas en streaming, mensajería proactiva, procesamiento de imágenes/archivos, formato Markdown, control de acceso integrado y habilidades de documentos/reuniones/mensajería.

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## Envía tu complemento

Damos la bienvenida a los complementos de la comunidad que sean útiles, documentados y seguros de operar.

<Steps>
  <Step title="Publicar en ClawHub o npm">
    Tu complemento debe ser instalable a través de `openclaw plugins install \<package-name\>`.
    Publica en [ClawHub](/es/tools/clawhub) (preferido) o npm.
    Consulta [Building Plugins](/es/plugins/building-plugins) para la guía completa.

  </Step>

  <Step title="Alojar en GitHub">
    El código fuente debe estar en un repositorio público con documentos de configuración y un seguimiento de problemas.

  </Step>

  <Step title="Usar PRs de docs solo para cambios en docs de origen">
    No necesitas un PR de docs solo para hacer que tu complemento sea descubrible. Publícalo en ClawHub en su lugar.

    Abre un PR de docs solo cuando los documentos de origen de OpenClaw necesiten un cambio real de contenido, como corregir la guía de instalación o agregar documentación entre repositorios que pertenezca al conjunto principal de documentos.

  </Step>
</Steps>

## Nivel de calidad

| Requisito                            | Por qué                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| Publicado en ClawHub o npm           | Los usuarios necesitan que `openclaw plugins install` funcione |
| Repositorio público de GitHub        | Revisión de código, seguimiento de problemas, transparencia    |
| Documentación de configuración y uso | Los usuarios necesitan saber cómo configurarlo                 |
| Mantenimiento activo                 | Actualizaciones recientes o gestión responsiva de problemas    |

Pueden rechazarse envoltorios de bajo esfuerzo, propiedad poco clara o paquetes sin mantenimiento.

## Relacionado

- [Instalar y configurar complementos](/es/tools/plugin) — cómo instalar cualquier complemento
- [Construcción de complementos](/es/plugins/building-plugins) — crea el tuyo propio
- [Manifiesto del complemento](/es/plugins/manifest) — esquema del manifiesto
