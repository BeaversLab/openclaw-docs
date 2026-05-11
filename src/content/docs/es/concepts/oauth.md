---
summary: "OAuth en OpenClaw: intercambio de tokens, almacenamiento y patrones de múltiples cuentas"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw admite la “autenticación de suscripción” mediante OAuth para los proveedores que la ofrecen
(notablemente **OpenAI Codex (OAuth de ChatGPT)**). Para Anthropic, la división práctica
es ahora:

- **Clave de API de Anthropic**: facturación normal de la API de Anthropic
- **CLI de Anthropic Claude / autenticación de suscripción dentro de OpenClaw**: el personal de
  Anthropic nos informó que este uso está permitido nuevamente

El OAuth de OpenAI Codex es compatible explícitamente para su uso en herramientas externas como
OpenClaw. Esta página explica:

Para Anthropic en producción, la autenticación con clave de API es la ruta recomendada más segura.

- cómo funciona el **intercambio de tokens** de OAuth (PKCE)
- dónde se **almacenan** los tokens (y por qué)
- cómo manejar **múltiples cuentas** (perfiles + anulaciones por sesión)

OpenClaw también admite **complementos de proveedores** que incluyen sus propios flujos de OAuth o claves de API.
Ejecútelos a través de:

```bash
openclaw models auth login --provider <id>
```

## El sumidero de tokens (por qué existe)

Los proveedores de OAuth suelen generar un **nuevo token de actualización** durante los flujos de inicio de sesión/actualización. Algunos proveedores (o clientes de OAuth) pueden invalidar los tokens de actualización anteriores cuando se emite uno nuevo para el mismo usuario/aplicación.

Síntoma práctico:

- inicia sesión a través de OpenClaw _y_ a través de Claude Code / Codex CLI → uno de ellos se “cierra sesión” aleatoriamente más tarde

Para reducir eso, OpenClaw trata `auth-profiles.json` como un **sumidero de tokens**:

- el tiempo de ejecución lee las credenciales de **un solo lugar**
- podemos mantener múltiples perfiles y enrutarlos de manera determinista
- el reuso de CLI externo es específico del proveedor: Codex CLI puede iniciar un perfil
  `openai-codex:default` vacío, pero una vez que OpenClaw tiene un perfil OAuth local,
  el token de actualización local es el canónico; otras integraciones pueden permanecer
  administradas externamente y volver a leer su almacén de autenticación CLI

## Almacenamiento (dónde viven los tokens)

Los secretos se almacenan **por agente**:

- Perfiles de autenticación (OAuth + claves de API + referencias opcionales a nivel de valor): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Archivo de compatibilidad heredado: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (las entradas `api_key` estáticas se eliminan cuando se descubren)

Archivo heredado de solo importación (todavía compatible, pero no el almacén principal):

- `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso)

Todo lo anterior también respeta `$OPENCLAW_STATE_DIR` (anulación del directorio de estado). Referencia completa: [/gateway/configuration](/es/gateway/configuration-reference#auth-storage)

Para obtener información sobre referencias de secretos estáticos y el comportamiento de activación de instantáneas en tiempo de ejecución, consulte [Gestión de secretos](/es/gateway/secrets).

## Compatibilidad con tokens heredados de Anthropic

<Warning>
La documentación pública de Claude Code de Anthropic indica que el uso directo de Claude Code se mantiene dentro de los límites de la suscripción a Claude, y el personal de Anthropic nos informó que el uso de la CLI de Claude al estilo OpenClaw está permitido nuevamente. Por lo tanto, OpenClaw trata el reuso de la CLI de Claude y el uso de `claude -p` como autorizados para esta integración, a menos que Anthropic publique una nueva política.

Para ver la documentación actual del plan directo de Claude Code de Anthropic, consulte [Uso de Claude Code con su plan Pro o
Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
y [Uso de Claude Code con su plan de Empresa o
Team](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si desea otras opciones de estilo de suscripción en OpenClaw, consulte [OpenAI
Codex](/es/providers/openai), [Plan de codificación en la nube de
Qwen](/es/providers/qwen), [Plan de codificación de MiniMax](/es/providers/minimax)
y [Plan de codificación de Z.AI / GLM](/es/providers/glm).

</Warning>

OpenClaw también expone el token de configuración de Anthropic como una ruta de autenticación por token admitida, pero ahora prefiere el reuso de la CLI de Claude y `claude -p` cuando están disponibles.

## Migración de la CLI de Anthropic Claude

OpenClaw admite el reuso de la CLI de Anthropic Claude nuevamente. Si ya tiene un inicio de sesión local de Claude en el host, la incorporación/configuración puede reutilizarlo directamente.

## Intercambio de OAuth (cómo funciona el inicio de sesión)

Los flujos de inicio de sesión interactivo de OpenClaw se implementan en `@mariozechner/pi-ai` y se conectan a los asistentes/comandos.

### Token de configuración de Anthropic

Forma del flujo:

1. iniciar el token de configuración de Anthropic o pegar el token desde OpenClaw
2. OpenClaw almacena la credencial de Anthropic resultante en un perfil de autenticación
3. la selección del modelo se mantiene en `anthropic/...`
4. los perfiles de autenticación de Anthropic existentes siguen disponibles para el control de reversión/orden

### OpenAI Codex (ChatGPT OAuth)

El OAuth de OpenAI Codex es compatible explícitamente para su uso fuera de la CLI de Codex, incluidos los flujos de trabajo de OpenClaw.

Forma del flujo (PKCE):

1. generar verificador/desafío PKCE + `state` aleatorio
2. abrir `https://auth.openai.com/oauth/authorize?...`
3. intentar capturar la devolución de llamada en `http://127.0.0.1:1455/auth/callback`
4. si la devolución de llamada no puede vincularse (o si está en modo remoto/sin interfaz gráfica), pegue la URL/código de redirección
5. intercambiar en `https://auth.openai.com/oauth/token`
6. extraer `accountId` del token de acceso y almacenar `{ access, refresh, expires, accountId }`

La ruta del asistente es `openclaw onboard` → elección de autenticación `openai-codex`.

## Actualización + caducidad

Los perfiles almacenan una marca de tiempo `expires`.

En tiempo de ejecución:

- si `expires` está en el futuro → usar el token de acceso almacenado
- si ha caducado → actualizar (bajo un bloqueo de archivo) y sobrescribir las credenciales almacenadas
- excepción: algunas credenciales de CLI externas siguen siendo gestionadas externamente; OpenClaw
  vuelve a leer esos almacenes de autenticación de CLI en lugar de gastar tokens de actualización copiados.
  El arranque de la CLI de Codex es intencionalmente más limitado: inicializa un perfil
  `openai-codex:default` vacío y, luego, las actualizaciones propiedad de OpenClaw mantienen el perfil
  local como canónico.

El flujo de actualización es automático; generalmente no necesitas gestionar los tokens manualmente.

## Múltiples cuentas (perfiles) + enrutamiento

Dos patrones:

### 1) Recomendado: agentes separados

Si quieres que lo "personal" y lo "laboral" nunca interactúen, usa agentes aislados (sesiones + credenciales + espacio de trabajo separados):

```bash
openclaw agents add work
openclaw agents add personal
```

Luego configura la autenticación por agente (asistente) y enruta los chats al agente correcto.

### 2) Avanzado: múltiples perfiles en un agente

`auth-profiles.json` admite múltiples ID de perfil para el mismo proveedor.

Elige qué perfil se usa:

- globalmente mediante el orden de configuración (`auth.order`)
- por sesión mediante `/model ...@<profileId>`

Ejemplo (anulación de sesión):

- `/model Opus@anthropic:work`

Cómo ver qué ID de perfil existen:

- `openclaw channels list --json` (muestra `auth[]`)

Documentos relacionados:

- [Conmutación por error de modelos](/es/concepts/model-failover) (reglas de rotación + enfriamiento)
- [Comandos de barra](/es/tools/slash-commands) (superficie de comandos)

## Relacionado

- [Autenticación](/es/gateway/authentication) — resumen de autenticación del proveedor de modelos
- [Secretos](/es/gateway/secrets) — almacenamiento de credenciales y SecretRef
- [Referencia de configuración](/es/gateway/configuration-reference#auth-storage) — claves de configuración de autenticación
