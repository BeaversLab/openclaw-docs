---
title: "Chutes"
summary: "Configuración de Chutes (OAuth o clave de API, descubrimiento de modelos, alias)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) expone catálogos de modelos de código abierto a través de
una API compatible con OpenAI. OpenClaw admite tanto OAuth de navegador como
autenticación directa con clave de API para el proveedor `chutes` incluido.

- Proveedor: `chutes`
- API: Compatible con OpenAI
- URL base: `https://llm.chutes.ai/v1`
- Autenticación:
  - OAuth a través de `openclaw onboard --auth-choice chutes`
  - Clave de API a través de `openclaw onboard --auth-choice chutes-api-key`
  - Variables de entorno de ejecución: `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`

## Inicio rápido

### OAuth

```bash
openclaw onboard --auth-choice chutes
```

OpenClaw inicia el flujo del navegador localmente o muestra una URL y un flujo
de redirección y pegado en hosts remotos o sin interfaz gráfica. Los tokens de
OAuth se actualizan automáticamente a través de los perfiles de autenticación
de OpenClaw.

Opciones opcionales de OAuth:

- `CHUTES_CLIENT_ID`
- `CHUTES_CLIENT_SECRET`
- `CHUTES_OAUTH_REDIRECT_URI`
- `CHUTES_OAUTH_SCOPES`

### Clave de API

```bash
openclaw onboard --auth-choice chutes-api-key
```

Obtenga su clave en
[chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys).

Ambas rutas de autenticación registran el catálogo Chutes incluido y establecen el
modelo predeterminado en `chutes/zai-org/GLM-4.7-TEE`.

## Comportamiento de descubrimiento

Cuando la autenticación de Chutes está disponible, OpenClaw consulta el catálogo
de Chutes con esas credenciales y utiliza los modelos descubiertos. Si el
descubrimiento falla, OpenClaw recurre a un catálogo estático incluido para que
la incorporación y el inicio sigan funcionando.

## Alias predeterminados

OpenClaw también registra tres alias de conveniencia para el catálogo Chutes
incluido:

- `chutes-fast` -> `chutes/zai-org/GLM-4.7-FP8`
- `chutes-pro` -> `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes-vision` -> `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`

## Catálogo de inicio integrado

El catálogo de respaldo incluido contiene referencias actuales de Chutes, tales como:

- `chutes/zai-org/GLM-4.7-TEE`
- `chutes/zai-org/GLM-5-TEE`
- `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`
- `chutes/moonshotai/Kimi-K2.5-TEE`
- `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`
- `chutes/Qwen/Qwen3-Coder-Next-TEE`
- `chutes/openai/gpt-oss-120b-TEE`

## Ejemplo de configuración

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

## Notas

- Ayuda de OAuth y requisitos de la aplicación de redirección: [Documentación de OAuth de Chutes](https://chutes.ai/docs/sign-in-with-chutes/overview)
- El descubrimiento mediante clave de API y OAuth utilizan el mismo id. de proveedor `chutes`.
- Los modelos de Chutes se registran como `chutes/<model-id>`.
