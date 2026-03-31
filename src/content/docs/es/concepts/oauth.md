---
summary: "OAuth en OpenClaw: intercambio de tokens, almacenamiento y patrones de múltiples cuentas"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw admite "autenticación de suscripción" a través de OAuth para proveedores que la ofrecen (notablemente **OpenAI Codex (ChatGPT OAuth)**). Para las suscripciones de Anthropic, puede usar el flujo de **setup-token** o reutilizar un inicio de sesión local de **Claude CLI** en el host de la puerta de enlace. El uso de suscripciones de Anthropic fuera de Claude Code se ha restringido para algunos usuarios en el pasado, así que trátelo como un riesgo de elección del usuario y verifique la política actual de Anthropic usted mismo. El OAuth de OpenAI Codex es compatible explícitamente para su uso en herramientas externas como OpenClaw. Esta página explica:

Para Anthropic en producción, la autenticación con clave de API es la ruta recomendada más segura en comparación con la autenticación por token de configuración de suscripción.

- cómo funciona el **intercambio de tokens** OAuth (PKCE)
- dónde se **almacenan** los tokens (y por qué)
- cómo manejar **múltiples cuentas** (perfiles + anulaciones por sesión)

OpenClaw también admite **complementos de proveedor** que incluyen sus propios flujos de OAuth o clave de API.
Ejecútelos a través de:

```bash
openclaw models auth login --provider <id>
```

## El sumidero de tokens (por qué existe)

Los proveedores de OAuth comúnmente emiten un **nuevo token de actualización** durante los flujos de inicio de sesión/actualización. Algunos proveedores (o clientes OAuth) pueden invalidar los tokens de actualización más antiguos cuando se emite uno nuevo para el mismo usuario/aplicación.

Síntoma práctico:

- inicia sesión a través de OpenClaw _y_ a través de Claude Code / Codex CLI → uno de ellos se "cierra sesión" aleatoriamente más tarde

Para reducir eso, OpenClaw trata `auth-profiles.json` como un **sumidero de tokens**:

- el tiempo de ejecución lee las credenciales de **un solo lugar**
- podemos mantener múltiples perfiles y enrutarlos de manera determinista

## Almacenamiento (dónde viven los tokens)

Los secretos se almacenan **por agente**:

- Perfiles de autenticación (OAuth + claves de API + referencias opcionales a nivel de valor): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Archivo de compatibilidad heredado: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (las entradas `api_key` estáticas se eliminan cuando se descubren)

Archivo heredado de solo importación (todavía compatible, pero no el almacén principal):

- `~/.openclaw/credentials/oauth.json` (importado en `auth-profiles.json` en el primer uso)

Todo lo anterior también respeta `$OPENCLAW_STATE_DIR` (anulación del directorio de estado). Referencia completa: [/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

Para obtener referencias de secretos estáticos y el comportamiento de activación de instantáneas en tiempo de ejecución, consulte [Gestión de secretos](/en/gateway/secrets).

## Token de configuración de Anthropic (autenticación de suscripción)

<Warning>La compatibilidad con el token de configuración de Anthropic es una compatibilidad técnica, no una garantía política. Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado. Decida por sí mismo si utilizar la autenticación por suscripción y verifique los términos actuales de Anthropic.</Warning>

Ejecute `claude setup-token` en cualquier máquina, luego péguelo en OpenClaw:

```bash
openclaw models auth setup-token --provider anthropic
```

Si generó el token en otro lugar, péguelo manualmente:

```bash
openclaw models auth paste-token --provider anthropic
```

Verificar:

```bash
openclaw models status
```

## Migración de Anthropic Claude CLI

Si Claude CLI ya está instalado y ha iniciado sesión en el host de puerta de enlace, puede
cambiar la selección del modelo de Anthropic al backend de la CLI local:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Acceso directo de incorporación:

```bash
openclaw onboard --auth-choice anthropic-cli
```

Esto mantiene los perfiles de autenticación de Anthropic existentes para la reversión, pero reescribe la ruta principal
del modelo predeterminado de `anthropic/...` a `claude-cli/...`.

## Intercambio de OAuth (cómo funciona el inicio de sesión)

Los flujos de inicio de sesión interactivo de OpenClaw se implementan en `@mariozechner/pi-ai` y se conectan a los asistentes/comandos.

### Token de configuración de Anthropic / Claude CLI

Forma del flujo:

Ruta del token de configuración:

1. ejecutar `claude setup-token`
2. pegar el token en OpenClaw
3. almacenar como un perfil de autenticación de token (sin actualización)

Ruta de Claude CLI:

1. iniciar sesión con `claude auth login` en el host de puerta de enlace
2. ejecutar `openclaw models auth login --provider anthropic --method cli --set-default`
3. no almacenar ningún nuevo perfil de autenticación; cambiar la selección del modelo a `claude-cli/...`

Rutas del asistente:

- `openclaw onboard` → elección de autenticación `anthropic-cli`
- `openclaw onboard` → elección de autenticación `setup-token` (Anthropic)

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth es explícitamente compatible para su uso fuera de la CLI de Codex, incluidos los flujos de trabajo de OpenClaw.

Forma del flujo (PKCE):

1. generar verificador/desafío PKCE + aleatorio `state`
2. abrir `https://auth.openai.com/oauth/authorize?...`
3. intentar capturar la devolución de llamada en `http://127.0.0.1:1455/auth/callback`
4. si la devolución de llamada no puede vincularse (o si está en modo remoto/sin interfaz), pegue la URL/código de redirección
5. intercambiar en `https://auth.openai.com/oauth/token`
6. extraer `accountId` del token de acceso y almacenar `{ access, refresh, expires, accountId }`

La ruta del asistente es `openclaw onboard` → elección de autenticación `openai-codex`.

## Actualización + vencimiento

Los perfiles almacenan una marca de tiempo `expires`.

En tiempo de ejecución:

- si `expires` está en el futuro → usar el token de acceso almacenado
- si ha vencido → actualizar (bajo un bloqueo de archivo) y sobrescribir las credenciales almacenadas

El flujo de actualización es automático; generalmente no necesita administrar los tokens manualmente.

## Múltiples cuentas (perfiles) + enrutamiento

Dos patrones:

### 1) Preferido: agentes separados

Si quieres que lo “personal” y lo “laboral” nunca interactúen, usa agentes aislados (sesiones separadas + credenciales + espacio de trabajo):

```bash
openclaw agents add work
openclaw agents add personal
```

Luego configura la autenticación por agente (asistente) y enruta los chats al agente correcto.

### 2) Avanzado: múltiples perfiles en un solo agente

`auth-profiles.json` admite varios ID de perfil para el mismo proveedor.

Elige qué perfil se usa:

- globalmente mediante el orden de configuración (`auth.order`)
- por sesión mediante `/model ...@<profileId>`

Ejemplo (anulación de sesión):

- `/model Opus@anthropic:work`

Cómo ver qué ID de perfil existen:

- `openclaw channels list --json` (muestra `auth[]`)

Documentación relacionada:

- [/concepts/model-failover](/en/concepts/model-failover) (reglas de rotación + enfriamiento)
- [/tools/slash-commands](/en/tools/slash-commands) (superficie de comandos)
