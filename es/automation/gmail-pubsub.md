---
summary: "Gmail Pub/Sub push conectado a los webhooks de OpenClaw a través de gogcli"
read_when:
  - Conectar los disparadores de la bandeja de entrada de Gmail a OpenClaw
  - Configurar Pub/Sub push para activar el agente
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

Objetivo: Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> webhook de OpenClaw.

## Requisitos previos

- `gcloud` instalado e iniciado sesión ([guía de instalación](https://docs.cloud.google.com/sdk/docs/install-sdk)).
- `gog` (gogcli) instalado y autorizado para la cuenta de Gmail ([gogcli.sh](https://gogcli.sh/)).
- Ganchos de OpenClaw habilitados (ver [Webhooks](/es/automation/webhook)).
- `tailscale` iniciado sesión ([tailscale.com](https://tailscale.com/)). La configuración admitida utiliza Tailscale Funnel para el endpoint HTTPS público.
  Otros servicios de túnel pueden funcionar, pero son de bricolaje/no admitidos y requieren una conexión manual.
  Por ahora, Tailscale es lo que admitimos.

Configuración de gancho de ejemplo (habilitar la asignación preestablecida de Gmail):

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"],
  },
}
```

Para entregar el resumen de Gmail a una superficie de chat, anule el valor preestablecido con una asignación
que establezca `deliver` + opcional `channel`/`to`:

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "New email from {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last",
        // to: "+15551234567"
      },
    ],
  },
}
```

Si desea un canal fijo, establezca `channel` + `to`. De lo contrario, `channel: "last"`
utiliza la última ruta de entrega (recurre a WhatsApp).

Para forzar un modelo más económico para las ejecuciones de Gmail, establezca `model` en la asignación
(`provider/model` o alias). Si hace cumplir `agents.defaults.models`, inclúyalo allí.

Para establecer un modelo y un nivel de pensamiento predeterminados específicamente para los ganchos de Gmail, añada
`hooks.gmail.model` / `hooks.gmail.thinking` en su configuración:

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

Notas:

- `model`/`thinking` por gancho en la asignación aún anula estos valores predeterminados.
- Orden de reserva: `hooks.gmail.model` → `agents.defaults.model.fallbacks` → primario (auth/rate-limit/timeouts).
- Si `agents.defaults.models` está establecido, el modelo de Gmail debe estar en la lista de permitidos.
- El contenido del gancho de Gmail se envuelve con límites de seguridad de contenido externo de forma predeterminada.
  Para desactivar (peligroso), establezca `hooks.gmail.allowUnsafeExternalContent: true`.

Para personalizar aún más el manejo de la carga útil, añada `hooks.mappings` o un módulo de transformación JS/TS
bajo `~/.openclaw/hooks/transforms` (consulte [Webhooks](/es/automation/webhook)).

## Asistente (recomendado)

Use el asistente de OpenClaw para conectar todo (instala dependencias en macOS a través de brew):

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

Valores predeterminados:

- Usa Tailscale Funnel para el punto final de inserción público.
- Escribe la configuración `hooks.gmail` para `openclaw webhooks gmail run`.
- Activa el preajuste de enlace de Gmail (`hooks.presets: ["gmail"]`).

Nota sobre la ruta: cuando `tailscale.mode` está activado, OpenClaw establece automáticamente
`hooks.gmail.serve.path` en `/` y mantiene la ruta pública en
`hooks.gmail.tailscale.path` (predeterminado `/gmail-pubsub`) porque Tailscale
elimina el prefijo de ruta establecida antes de realizar el proxy.
Si necesita que el backend reciba la ruta con prefijo, establezca
`hooks.gmail.tailscale.target` (o `--tailscale-target`) en una URL completa como
`http://127.0.0.1:8788/gmail-pubsub` y haga coincidir `hooks.gmail.serve.path`.

¿Quiere un punto final personalizado? Use `--push-endpoint <url>` o `--tailscale off`.

Nota sobre la plataforma: en macOS el asistente instala `gcloud`, `gogcli` y `tailscale`
a través de Homebrew; en Linux instálelos manualmente primero.

Inicio automático de la puerta de enlace (recomendado):

- Cuando `hooks.enabled=true` y `hooks.gmail.account` están configurados, la puerta de enlace inicia
  `gog gmail watch serve` al arrancar y renueva automáticamente la vigilancia.
- Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para optar por no participar (útil si ejecuta el demonio usted mismo).
- No ejecute el demonio manual al mismo tiempo, o encontrará
  `listen tcp 127.0.0.1:8788: bind: address already in use`.

Demonio manual (inicia `gog gmail watch serve` + renovación automática):

```bash
openclaw webhooks gmail run
```

## Configuración única

1. Seleccione el proyecto de GCP **que posee el cliente OAuth** utilizado por `gog`.

```bash
gcloud auth login
gcloud config set project <project-id>
```

Nota: La vigilancia de Gmail requiere que el tema de Pub/Sub resida en el mismo proyecto que el cliente OAuth.

2. Active las API:

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. Cree un tema:

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. Permita que la inserción de Gmail publique:

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## Iniciar la vigilancia

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

Guarde el `history_id` de la salida (para depuración).

## Ejecutar el controlador de inserción

Ejemplo local (autenticación de token compartido):

```bash
gog gmail watch serve \
  --account openclaw@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <shared> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token OPENCLAW_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

Notas:

- `--token` protege el punto final de inserción (`x-gog-token` o `?token=`).
- `--hook-url` apunta al `/hooks/gmail` de OpenClaw (mapeado; ejecución aislada + resumen al principal).
- `--include-body` y `--max-bytes` controlan el fragmento del cuerpo enviado a OpenClaw.

Recomendado: `openclaw webhooks gmail run` envuelve el mismo flujo y renueva la vigilancia automáticamente.

## Exponer el controlador (avanzado, no compatible)

Si necesitas un túnel que no sea de Tailscale, configúralo manualmente y usa la URL pública en la suscripción de inserción (no compatible, sin medidas de seguridad):

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

Usa la URL generada como el punto final de inserción:

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

Producción: usa un punto final HTTPS estable y configura Pub/Sub OIDC JWT, luego ejecuta:

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## Prueba

Envía un mensaje a la bandeja de entrada vigilada:

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

Comprueba el estado y el historial de la vigilancia:

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## Solución de problemas

- `Invalid topicName`: discordancia de proyecto (el tema no está en el proyecto del cliente OAuth).
- `User not authorized`: falta `roles/pubsub.publisher` en el tema.
- Mensajes vacíos: la inserción de Gmail solo proporciona `historyId`; obtén mediante `gog gmail history`.

## Limpieza

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```

import es from "/components/footer/es.mdx";

<es />
