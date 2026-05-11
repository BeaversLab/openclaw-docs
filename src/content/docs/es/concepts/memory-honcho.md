---
summary: "Memoria entre sesiones nativa de IA mediante el complemento Honcho"
title: "Memoria de Honcho"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

[Honcho](https://honcho.dev) añade memoria nativa de IA a OpenClaw. Persiste las
conversaciones en un servicio dedicado y crea modelos de usuario y de agente con el tiempo,
dando a tu agente contexto entre sesiones que va más allá de los archivos Markdown
del espacio de trabajo.

## Lo que ofrece

- **Memoria entre sesiones** -- las conversaciones se persisten después de cada turno, por lo que
  el contexto se mantiene a través de restablecimientos de sesión, compactaciones y cambios de canal.
- **Modelado de usuario** -- Honcho mantiene un perfil para cada usuario (preferencias,
  datos, estilo de comunicación) y para el agente (personalidad,
  comportamientos aprendidos).
- **Búsqueda semántica** -- búsqueda sobre observaciones de conversaciones pasadas, no
  solo de la sesión actual.
- **Conciencia multiagente** -- los agentes principales rastrean automáticamente los
  subagentes generados, con los principales añadidos como observadores en las sesiones secundarias.

## Herramientas disponibles

Honcho registra herramientas que el agente puede usar durante la conversación:

**Recuperación de datos (rápida, sin llamada LLM):**

| Herramienta                 | Lo que hace                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `honcho_context`            | Representación completa del usuario a través de sesiones            |
| `honcho_search_conclusions` | Búsqueda semántica sobre conclusiones almacenadas                   |
| `honcho_search_messages`    | Buscar mensajes a través de sesiones (filtrar por remitente, fecha) |
| `honcho_session`            | Historial y resumen de la sesión actual                             |

**Preguntas y respuestas (con LLM):**

| Herramienta  | Lo que hace                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `honcho_ask` | Preguntar sobre el usuario. `depth='quick'` para datos, `'thorough'` para síntesis |

## Para empezar

Instala el complemento y ejecuta la configuración:

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

El comando de configuración solicita tus credenciales de API, escribe la configuración y
opcionalmente migra los archivos de memoria del espacio de trabajo existentes.

<Info>Honcho puede ejecutarse totalmente de forma local (autohospedado) o a través de la API gestionada en `api.honcho.dev`. No se requieren dependencias externas para la opción autohospedada.</Info>

## Configuración

La configuración se encuentra en `plugins.entries["openclaw-honcho"].config`:

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

Para instancias autohospedadas, apunta `baseUrl` a tu servidor local (por ejemplo
`http://localhost:8000`) y omite la clave de API.

## Migrar la memoria existente

Si tiene archivos de memoria del espacio de trabajo existentes (`USER.md`, `MEMORY.md`,
`IDENTITY.md`, `memory/`, `canvas/`), `openclaw honcho setup` los detecta y
ofrece migrarlos.

<Info>La migración no es destructiva: los archivos se cargan en Honcho. Los originales nunca se eliminan ni se mueven.</Info>

## Cómo funciona

Después de cada turno de IA, la conversación se persiste en Honcho. Tanto los mensajes del
usuario como los del agente se observan, lo que permite a Honcho construir y refinar sus modelos con
el tiempo.

Durante la conversación, las herramientas de Honcho consultan el servicio en la fase `before_prompt_build`
, inyectando contexto relevante antes de que el modelo vea el mensaje. Esto asegura
límites de turno precisos y una recuperación relevante.

## Honcho frente a la memoria integrada

|                         | Integrada / QMD                          | Honcho                              |
| ----------------------- | ---------------------------------------- | ----------------------------------- |
| **Almacenamiento**      | Archivos Markdown del espacio de trabajo | Servicio dedicado (local o alojado) |
| **Multisesión**         | A través de archivos de memoria          | Automático, integrado               |
| **Modelado de usuario** | Manual (escribir en MEMORY.md)           | Perfiles automáticos                |
| **Búsqueda**            | Vector + palabra clave (híbrido)         | Semántica sobre observaciones       |
| **Multiagente**         | No rastreado                             | Conciencia padre/hijo               |
| **Dependencias**        | Ninguna (integrada) o binario QMD        | Instalación de complemento          |

Honcho y el sistema de memoria integrado pueden funcionar juntos. Cuando QMD está configurado,
herramientas adicionales estarán disponibles para buscar archivos Markdown locales junto con
la memoria multisesión de Honcho.

## Comandos de CLI

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## Lectura adicional

- [Código fuente del complemento](https://github.com/plastic-labs/openclaw-honcho)
- [Documentación de Honcho](https://docs.honcho.dev)
- [Guía de integración de Honcho con OpenClaw](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [Memoria](/es/concepts/memory) -- Descripción general de la memoria de OpenClaw
- [Motores de contexto](/es/concepts/context-engine) -- cómo funcionan los motores de contexto de los complementos

## Relacionado

- [Resumen de memoria](/es/concepts/memory)
- [Motor de memoria integrado](/es/concepts/memory-builtin)
- [Motor de memoria QMD](/es/concepts/memory-qmd)
