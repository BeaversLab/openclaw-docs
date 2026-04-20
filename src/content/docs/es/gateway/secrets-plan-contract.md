---
summary: "Contrato para planes `secrets apply`: validación de destino, coincidencia de rutas y alcance de destino `auth-profiles.json`"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Contrato de plan de aplicación de Secrets"
---

# Contrato de plan de aplicación de Secrets

Esta página define el contrato estricto impuesto por `openclaw secrets apply`.

Si un destino no coincide con estas reglas, la aplicación falla antes de mutar la configuración.

## Formato del archivo de plan

`openclaw secrets apply --from <plan.json>` espera una matriz `targets` de destinos de plan:

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## Alcance de destino admitido

Los destinos de plan se aceptan para rutas de credenciales admitidas en:

- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)

## Comportamiento del tipo de destino

Regla general:

- `target.type` debe ser reconocido y debe coincidir con la forma normalizada `target.path`.

Los alias de compatibilidad siguen siendo aceptados para los planes existentes:

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Reglas de validación de rutas

Cada destino se valida con todo lo siguiente:

- `type` debe ser un tipo de destino reconocido.
- `path` debe ser una ruta de puntos no vacía.
- `pathSegments` se puede omitir. Si se proporciona, debe normalizarse a exactamente la misma ruta que `path`.
- Los segmentos prohibidos se rechazan: `__proto__`, `prototype`, `constructor`.
- La ruta normalizada debe coincidir con la forma de ruta registrada para el tipo de destino.
- Si se establece `providerId` o `accountId`, debe coincidir con el id codificado en la ruta.
- Los destinos `auth-profiles.json` requieren `agentId`.
- Al crear una nueva asignación `auth-profiles.json`, incluya `authProfileProvider`.

## Comportamiento de fallo

Si un destino falla la validación, la aplicación se cierra con un error como:

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

No se confirman escrituras para un plan no válido.

## Comportamiento del consentimiento del proveedor exec

- `--dry-run` omite las comprobaciones exec SecretRef de forma predeterminada.
- Los planes que contienen exec SecretRefs/proveedores se rechazan en modo de escritura a menos que se establezca `--allow-exec`.
- Al validar/aplicar planes que contienen exec, pase `--allow-exec` tanto en comandos de simulación como de escritura.

## Notas sobre el alcance de tiempo de ejecución y auditoría

- Las entradas solo de referencia `auth-profiles.json` (`keyRef`/`tokenRef`) se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.
- `secrets apply` escribe objetivos `openclaw.json` admitidos, objetivos `auth-profiles.json` admitidos y objetivos de limpieza opcionales.

## Comprobaciones del operador

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

Si la aplicación falla con un mensaje de ruta de destino no válida, regenere el plan con `openclaw secrets configure` o corrija la ruta de destino a una forma admitida anteriormente.

## Documentos relacionados

- [Gestión de secretos](/es/gateway/secrets)
- [CLI `secrets`](/es/cli/secrets)
- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)
- [Referencia de configuración](/es/gateway/configuration-reference)
