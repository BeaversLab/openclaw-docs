# Vinculaciones persistentes de ACP para canales de Discord y temas de Telegram

Estado: Borrador

## Resumen

Introducir vinculaciones persistentes de ACP que mapeen:

- Canales de Discord (e hilos existentes, cuando sea necesario), y
- Temas de foro de Telegram en grupos/supergrupos (`chatId:topic:topicId`)

a sesiones de ACP de larga duración, con el estado de vinculación almacenado en entradas `bindings[]` de nivel superior utilizando tipos de vinculación explícitos.

Esto hace que el uso de ACP en canales de mensajería de alto tráfico sea predecible y duradero, por lo que los usuarios pueden crear canales/temas dedicados como `codex`, `claude-1` o `claude-myrepo`.

## Por qué

El comportamiento actual de ACP vinculado a hilos está optimizado para flujos de trabajo efímeros de hilos de Discord. Telegram no tiene el mismo modelo de hilos; tiene temas de foro en grupos/supergrupos. Los usuarios quieren espacios de trabajo de ACP estables y siempre activos en las superficies de chat, no solo sesiones temporales de hilos.

## Objetivos

- Soportar vinculación duradera de ACP para:
  - Canales/hilos de Discord
  - Temas de foro de Telegram (grupos/supergrupos)
- Hacer que la fuente de verdad de la vinculación esté basada en configuración.
- Mantener `/acp`, `/new`, `/reset`, `/focus` y el comportamiento de entrega constante entre Discord y Telegram.
- Conservar los flujos de vinculación temporal existentes para uso ad hoc.

## No Objetivos

- Rediseño completo de los internos de tiempo de ejecución/sesión de ACP.
- Eliminación de los flujos de vinculación efímeros existentes.
- Ampliación a cada canal en la primera iteración.
- Implementar temas de mensajes directos de canal de Telegram (`direct_messages_topic_id`) en esta fase.
- Implementar variantes de temas de chat privado de Telegram en esta fase.

## Dirección UX

### 1) Dos tipos de vinculación

- **Vinculación persistente**: guardada en la configuración, reconciliada al inicio, destinada a canales/temas de "espacio de trabajo con nombre".
- **Vinculación temporal**: solo en tiempo de ejecución, expira por política de inactividad/antigüedad máxima.

### 2) Comportamiento del comando

- `/acp spawn ... --thread here|auto|off` sigue disponible.
- Añadir controles explícitos del ciclo de vida de vinculación:
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` incluye si la vinculación es `persistent` o `temporary`.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la sesión ACP vinculada en su lugar y mantienen el vínculo adjunto.

### 3) Identidad de la conversación

- Use IDs de conversación canónicos:
  - Discord: ID de canal/hilo.
  - Tema de Telegram: `chatId:topic:topicId`.
- Nunca use el ID simple de tema como clave para los vínculos de Telegram.

## Modelo de configuración (propuesto)

Unificar la configuración de enrutamiento y vinculación ACP persistente en `bindings[]` de nivel superior con discriminador `type` explícito:

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "runtime": { "type": "embedded" },
      },
      {
        "id": "codex",
        "workspace": "~/.openclaw/workspace-codex",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "codex",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-a",
          },
        },
      },
      {
        "id": "claude",
        "workspace": "~/.openclaw/workspace-claude",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "claude",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-b",
          },
        },
      },
    ],
  },
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "allowedAgents": ["codex", "claude"],
  },
  "bindings": [
    // Route bindings (existing behavior)
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },
    // Persistent ACP conversation bindings
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
      "acp": {
        "label": "codex-main",
        "mode": "persistent",
        "cwd": "/workspace/repo-a",
        "backend": "acpx",
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
      "acp": {
        "label": "claude-repo-b",
        "mode": "persistent",
        "cwd": "/workspace/repo-b",
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1001234567890:topic:42" },
      },
      "acp": {
        "label": "tg-codex-42",
        "mode": "persistent",
      },
    },
  ],
  "channels": {
    "discord": {
      "guilds": {
        "111111111111111111": {
          "channels": {
            "222222222222222222": {
              "enabled": true,
              "requireMention": false,
            },
            "333333333333333333": {
              "enabled": true,
              "requireMention": false,
            },
          },
        },
      },
    },
    "telegram": {
      "groups": {
        "-1001234567890": {
          "topics": {
            "42": {
              "requireMention": false,
            },
          },
        },
      },
    },
  },
}
```

### Ejemplo mínimo (Sin anulaciones de ACP por vínculo)

```jsonc
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "runtime": { "type": "embedded" } },
      {
        "id": "codex",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "codex", "backend": "acpx", "mode": "persistent" },
        },
      },
      {
        "id": "claude",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "claude", "backend": "acpx", "mode": "persistent" },
        },
      },
    ],
  },
  "acp": { "enabled": true, "backend": "acpx" },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },

    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1009876543210:topic:5" },
      },
    },
  ],
}
```

Notas:

- `bindings[].type` es explícito:
  - `route`: enrutamiento normal de agente.
  - `acp`: vinculación persistente de harness ACP para una conversación coincidente.
- Para `type: "acp"`, `match.peer.id` es la clave de conversación canónica:
  - Canal/hilo de Discord: ID de canal/hilo sin procesar.
  - Tema de Telegram: `chatId:topic:topicId`.
- `bindings[].acp.backend` es opcional. Orden de reserva del backend:
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. `acp.backend` global
- `mode`, `cwd` y `label` siguen el mismo patrón de anulación (`binding override -> agent runtime default -> global/default behavior`).
- Mantenga los `session.threadBindings.*` y `channels.discord.threadBindings.*` existentes para políticas de vinculación temporal.
- Las entradas persistentes declaran el estado deseado; el tiempo de ejecución concilia las sesiones/vínculos ACP reales.
- Un vínculo ACP activo por nodo de conversación es el modelo previsto.
- Compatibilidad con versiones anteriores: falta `type` se interpreta como `route` para entradas heredadas.

### Selección de Backend

- La inicialización de la sesión ACP ya usa la selección de backend configurada durante el inicio (`acp.backend` hoy).
- Esta propuesta extiende la lógica de inicio/conciliación para preferir anulaciones de vinculación ACP tipadas:
  - `bindings[].acp.backend` para anulación local de conversación.
  - `agents.list[].runtime.acp.backend` para valores predeterminados por agente.
- Si no existe ninguna anulación, mantenga el comportamiento actual (predeterminado `acp.backend`).

## Integración de la arquitectura en el sistema actual

### Reutilizar componentes existentes

- `SessionBindingService` ya es compatible con las referencias de conversación independientes del canal.
- Los flujos de creación y vinculación de ACP ya son compatibles con la vinculación a través de las API del servicio.
- Telegram ya transporta el contexto del tema/hilo a través de `MessageThreadId` y `chatId`.

### Componentes nuevos o ampliados

- **Adaptador de vinculación de Telegram** (paralelo al adaptador de Discord):
  - registrar adaptador por cuenta de Telegram,
  - resolver/listar/vincular/desvincular/tocar por ID de conversación canónico.
- **Resolutor/índice de vinculación con tipo**:
  - dividir `bindings[]` en las vistas `route` y `acp`,
  - mantener `resolveAgentRoute` solo en las vinculaciones `route`,
  - resolver la intención persistente de ACP solo desde las vinculaciones `acp`.
- **Resolución de vinculación entrante para Telegram**:
  - resolver la sesión vinculada antes de la finalización de la ruta (Discord ya hace esto).
- **Conciliador de vinculación persistente**:
  - al iniciar: cargar las vinculaciones `type: "acp"` de nivel superior configuradas, asegurar que existan las sesiones de ACP, asegurar que existan las vinculaciones.
  - al cambiar la configuración: aplicar los deltas de forma segura.
- **Modelo de transición**:
  - no se lee ningún respaldo de vinculación de ACP local del canal,
  - las vinculaciones persistentes de ACP se obtienen solo de las entradas `bindings[].type="acp"` de nivel superior.

## Entrega por fases

### Fase 1: Base del esquema de vinculación con tipo

- Ampliar el esquema de configuración para admitir el discriminador `bindings[].type`:
  - `route`,
  - `acp` con objeto de anulación opcional `acp` (`mode`, `backend`, `cwd`, `label`).
- Ampliar el esquema del agente con un descriptor de tiempo de ejecución para marcar los agentes nativos de ACP (`agents.list[].runtime.type`).
- Agregar la división del analizador/indicador para la ruta frente a las vinculaciones de ACP.

### Fase 2: Resolución en tiempo de ejecución + paridad Discord/Telegram

- Resolver las vinculaciones persistentes de ACP a partir de las entradas `type: "acp"` de nivel superior para:
  - canales/hilos de Discord,
  - temas del foro de Telegram (`chatId:topic:topicId` IDs canónicos).
- Implementar el adaptador de enlace de Telegram y la paridad de anulación de sesión enlazada entrante con Discord.
- No incluir variantes de tema directo/privado de Telegram en esta fase.

### Fase 3: Paridad de comandos y restablecimientos

- Alinear el comportamiento de `/acp`, `/new`, `/reset` y `/focus` en las conversaciones enlazadas de Telegram/Discord.
- Asegurar que el enlace sobreviva a los flujos de restablecimiento según lo configurado.

### Fase 4: Endurecimiento

- Mejores diagnósticos (`/acp status`, registros de conciliación al inicio).
- Manejo de conflictos y verificaciones de estado.

## Salvaguardas y políticas

- Respetar la habilitación de ACP y las restricciones de sandbox exactamente como hoy.
- Mantener el ámbito de cuenta explícito (`accountId`) para evitar filtraciones entre cuentas.
- Fallo cerrado en enrutamiento ambiguo.
- Mantener el comportamiento de la política de mención/acceso explícito por configuración de canal.

## Plan de pruebas

- Unitarias:
  - normalización del ID de conversación (especialmente los IDs de tema de Telegram),
  - rutas de creación/actualización/eliminación del reconciliador,
  - flujos de `/acp bind --persist` y desvinculación.
- Integración:
  - resolución de tema de Telegram entrante -> sesión ACP enlazada,
  - canal/hilo de Discord entrante -> precedencia de enlace persistente.
- Regresión:
  - los enlaces temporales siguen funcionando,
  - los canales/temas no enlazados mantienen el comportamiento de enrutamiento actual.

## Preguntas abiertas

- ¿Debería `/acp spawn --thread auto` en el tema de Telegram tener como valor predeterminado `here`?
- ¿Deberían los enlaces persistentes omitir siempre el filtrado por menciones en las conversaciones enlazadas, o requerir `requireMention=false` explícito?
- ¿Debería `/focus` obtener `--persist` como un alias para `/acp bind --persist`?

## Despliegue

- Publicar como opt-in por conversación (entrada `bindings[].type="acp"` presente).
- Comenzar solo con Discord + Telegram.
- Añadir documentación con ejemplos para:
  - "un canal/tema por agente"
  - "múltiples canales/temas por el mismo agente con diferentes `cwd`"
  - "patrones de nomenclatura de equipos (`codex-1`, `claude-repo-x`)".
