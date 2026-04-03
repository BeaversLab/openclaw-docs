---
title: "Memoria Honcho"
summary: "Memoria multi-sesión nativa de IA a través del complemento Honcho"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

# Memoria Honcho

[Honcho](https://honcho.dev) añade memoria nativa de IA a OpenClaw. Persiste
las conversaciones en un servicio dedicado y crea modelos de usuario y agente con el tiempo,
dando a su agente contexto entre sesiones que va más allá de los archivos Markdown
del espacio de trabajo.

## Lo que ofrece

- **Memoria multi-sesión** -- las conversaciones se persisten después de cada turno, por lo que
  el contexto se mantiene a través de reinicios de sesión, compactación y cambios de canal.
- **Modelado de usuario** -- Honcho mantiene un perfil para cada usuario (preferencias,
  datos, estilo de comunicación) y para el agente (personalidad, comportamientos
  aprendidos).
- **Búsqueda semántica** -- búsqueda sobre observaciones de conversaciones pasadas, no
  solo de la sesión actual.
- **Conciencia multi-agente** -- los agentes padres rastrean automáticamente los
  sub-agentes generados, con los padres añadidos como observadores en las sesiones hijas.

## Herramientas disponibles

Honcho registra herramientas que el agente puede usar durante la conversación:

**Recuperación de datos (rápido, sin llamada LLM):**

| Herramienta                 | Lo que hace                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `honcho_context`            | Representación completa del usuario a través de sesiones               |
| `honcho_search_conclusions` | Búsqueda semántica sobre conclusiones almacenadas                      |
| `honcho_search_messages`    | Encontrar mensajes a través de sesiones (filtrar por remitente, fecha) |
| `honcho_session`            | Historial y resumen de la sesión actual                                |

**Preguntas y respuestas (impulsado por LLM):**

| Herramienta  | Lo que hace                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `honcho_ask` | Preguntar sobre el usuario. `depth='quick'` para datos, `'thorough'` para síntesis |

## Comenzando

Instale el complemento y ejecute la configuración:

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

El comando de configuración solicita sus credenciales de API, escribe la configuración y
opcionalmente migra los archivos de memoria del espacio de trabajo existentes.

<Info>Honcho puede ejecutarse completamente localmente (autoalojado) o a través de la API gestionada en `api.honcho.dev`. No se requieren dependencias externas para la opción autoalojada.</Info>

## Configuración

La configuración vive bajo `plugins.entries["openclaw-honcho"].config`:

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

Para instancias autoalojadas, apunte `baseUrl` a su servidor local (por ejemplo
`http://localhost:8000`) y omita la clave de API.

## Migrando la memoria existente

Si tienes archivos de memoria del espacio de trabajo existentes (`USER.md`, `MEMORY.md`,
`IDENTITY.md`, `memory/`, `canvas/`), `openclaw honcho setup` los detecta y
ofrece migrarlos.

<Info>La migración no es destructiva: los archivos se cargan en Honcho. Los originales nunca se eliminan ni se mueven.</Info>

## Cómo funciona

Después de cada turno de la IA, la conversación se persiste en Honcho. Se observan tanto los mensajes del usuario como los del agente, lo que permite a Honcho crear y refinar sus modelos con el tiempo.

Durante la conversación, las herramientas de Honcho consultan el servicio en la fase `before_prompt_build`, inyectando contexto relevante antes de que el modelo vea el mensaje. Esto garantiza límites de turno precisos y una recuperación relevante.

## Honcho vs memoria integrada

|                         | Integrada / QMD                          | Honcho                              |
| ----------------------- | ---------------------------------------- | ----------------------------------- |
| **Almacenamiento**      | Archivos Markdown del espacio de trabajo | Servicio dedicado (local o alojado) |
| **Entre sesiones**      | A través de archivos de memoria          | Automático, integrado               |
| **Modelado de usuario** | Manual (write to MEMORY.md)              | Automatic profiles                  |
| **Búsqueda**            | Vector + keyword (hybrid)                | Semantic over observations          |
| **Multi-agente**        | Not tracked                              | Parent/child awareness              |
| **Dependencias**        | None (builtin) or QMD binary             | Instalación del complemento         |

Honcho y el sistema de memoria integrado pueden funcionar juntos. Cuando QMD está configurado,
herramientas adicionales estarán disponibles para buscar archivos Markdown locales junto con
la memoria entre sesiones de Honcho.

## Comandos de CLI

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## Lecturas adicionales

- [Código fuente del complemento](https://github.com/plastic-labs/openclaw-honcho)
- [Documentación de Honcho](https://docs.honcho.dev)
- [Guía de integración de Honcho con OpenClaw](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [Memoria](/en/concepts/memory) -- descripción general de la memoria de OpenClaw
- [Motores de contexto](/en/concepts/context-engine) -- cómo funcionan los motores de contexto de los complementos
