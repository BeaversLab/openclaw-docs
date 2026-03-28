# Kilo Gateway 提供者整合設計

## 概述

本文件概述了將「Kilo Gateway」作為 OpenClaw 中的一級提供者進行整合的設計，該設計以現有的 OpenRouter 實作為範本。Kilo Gateway 使用與 OpenAI 相容的完成 API，但基底 URL 不同。

## 設計決策

### 1. 提供者命名

**建議： `kilocode`**

理由：

- 符合提供的使用者設定範例（`kilocode` 提供者金鑰）
- 與現有的提供者命名模式一致（例如 `openrouter`、`opencode`、`moonshot`）
- 簡短且易於記憶
- 避免與通用的「kilo」或「gateway」術語混淆

考慮過的替代方案： `kilo-gateway` - 已拒絕，因為在程式碼庫中使用連字號命名較不常見，且 `kilocode` 更為簡潔。

### 2. 預設模型參考

**建議：`kilocode/anthropic/claude-opus-4.6`**

理由：

- 根據使用者設定範例
- Claude Opus 4.5 是一個功能強大的預設模型
- 明確的模型選擇可避免依賴自動路由

### 3. 基礎 URL 設定

**建議：使用硬編碼預設值並透過設定覆寫**

- **預設基礎 URL：** `https://api.kilo.ai/api/gateway/`
- **可設定：** 是，透過 `models.providers.kilocode.baseUrl`

這與 Moonshot、Venice 和 Synthetic等其他供應商使用的模式相符。

### 4. 模型掃描

**建議：最初不設置專用的模型掃描端點**

理由：

- Kilo Gateway 代理到 OpenRouter，因此模型是動態的
- 使用者可以在其設定中手動設定模型
- 如果 Kilo Gateway 未來提供 `/models` 端點，則可以新增掃描功能

### 5. 特殊處理

**建議：繼承 OpenRouter 對於 Anthropic 模型的行為**

由於 Kilo Gateway 代理到 OpenRouter，因此應套用相同的特殊處理：

- `anthropic/*` 模型的 Cache TTL 資格
- `anthropic/*` 模型的額外參數 (cacheControlTtl)
- 逐字稿政策遵循 OpenRouter 模式

## 檔案修改

### 核心憑證管理

#### 1. `src/commands/onboard-auth.credentials.ts`

新增：

```typescript
export const KILOCODE_DEFAULT_MODEL_REF = "kilocode/anthropic/claude-opus-4.6";

export async function setKilocodeApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "kilocode:default",
    credential: {
      type: "api_key",
      provider: "kilocode",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
```

#### 2. `src/agents/model-auth.ts`

新增到 `resolveEnvApiKey()` 的 `envMap` 中：

```typescript
const envMap: Record<string, string> = {
  // ... existing entries
  kilocode: "KILOCODE_API_KEY",
};
```

#### 3. `src/config/io.ts`

新增到 `SHELL_ENV_EXPECTED_KEYS`：

```typescript
const SHELL_ENV_EXPECTED_KEYS = [
  // ... existing entries
  "KILOCODE_API_KEY",
];
```

### 設定應用

#### 4. `src/commands/onboard-auth.config-core.ts`

新增新函式：

```typescript
export const KILOCODE_BASE_URL = "https://api.kilo.ai/api/gateway/";

export function applyKilocodeProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[KILOCODE_DEFAULT_MODEL_REF] = {
    ...models[KILOCODE_DEFAULT_MODEL_REF],
    alias: models[KILOCODE_DEFAULT_MODEL_REF]?.alias ?? "Kilo Gateway",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.kilocode;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<string, unknown> as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  providers.kilocode = {
    ...existingProviderRest,
    baseUrl: KILOCODE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyKilocodeConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyKilocodeProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: KILOCODE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}
```

### 驗證選擇系統

#### 5. `src/commands/onboard-types.ts`

新增到 `AuthChoice` 類型：

```typescript
export type AuthChoice =
  // ... existing choices
  "kilocode-api-key";
// ...
```

新增到 `OnboardOptions`：

```typescript
export type OnboardOptions = {
  // ... existing options
  kilocodeApiKey?: string;
  // ...
};
```

#### 6. `src/commands/auth-choice-options.ts`

新增至 `AuthChoiceGroupId`：

```typescript
export type AuthChoiceGroupId =
  // ... existing groups
  "kilocode";
// ...
```

新增至 `AUTH_CHOICE_GROUP_DEFS`：

```typescript
{
  value: "kilocode",
  label: "Kilo Gateway",
  hint: "API key (OpenRouter-compatible)",
  choices: ["kilocode-api-key"],
},
```

新增至 `buildAuthChoiceOptions()`：

```typescript
options.push({
  value: "kilocode-api-key",
  label: "Kilo Gateway API key",
  hint: "OpenRouter-compatible gateway",
});
```

#### 7. `src/commands/auth-choice.preferred-provider.ts`

新增映射：

```typescript
const PREFERRED_PROVIDER_BY_AUTH_CHOICE: Partial<Record<AuthChoice, string>> = {
  // ... existing mappings
  "kilocode-api-key": "kilocode",
};
```

### Auth Choice Application

#### 8. `src/commands/auth-choice.apply.api-providers.ts`

新增匯入：

```typescript
import {
  // ... existing imports
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.js";
```

新增 `kilocode-api-key` 的處理：

```typescript
if (authChoice === "kilocode-api-key") {
  const store = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  const profileOrder = resolveAuthProfileOrder({
    cfg: nextConfig,
    store,
    provider: "kilocode",
  });
  const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
  const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
  let profileId = "kilocode:default";
  let mode: "api_key" | "oauth" | "token" = "api_key";
  let hasCredential = false;

  if (existingProfileId && existingCred?.type) {
    profileId = existingProfileId;
    mode = existingCred.type === "oauth" ? "oauth" : existingCred.type === "token" ? "token" : "api_key";
    hasCredential = true;
  }

  if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "kilocode") {
    await setKilocodeApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
    hasCredential = true;
  }

  if (!hasCredential) {
    const envKey = resolveEnvApiKey("kilocode");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing KILOCODE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setKilocodeApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
  }

  if (!hasCredential) {
    const key = await params.prompter.text({
      message: "Enter Kilo Gateway API key",
      validate: validateApiKeyInput,
    });
    await setKilocodeApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    hasCredential = true;
  }

  if (hasCredential) {
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId,
      provider: "kilocode",
      mode,
    });
  }
  {
    const applied = await applyDefaultModelChoice({
      config: nextConfig,
      setDefaultModel: params.setDefaultModel,
      defaultModel: KILOCODE_DEFAULT_MODEL_REF,
      applyDefaultConfig: applyKilocodeConfig,
      applyProviderConfig: applyKilocodeProviderConfig,
      noteDefault: KILOCODE_DEFAULT_MODEL_REF,
      noteAgentModel,
      prompter: params.prompter,
    });
    nextConfig = applied.config;
    agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
  }
  return { config: nextConfig, agentModelOverride };
}
```

同時在函數頂部新增 tokenProvider 映射：

```typescript
if (params.opts.tokenProvider === "kilocode") {
  authChoice = "kilocode-api-key";
}
```

### CLI Registration

#### 9. `src/cli/program/register.onboard.ts`

新增 CLI 選項：

```typescript
.option("--kilocode-api-key <key>", "Kilo Gateway API key")
```

新增至 action handler：

```typescript
kilocodeApiKey: opts.kilocodeApiKey as string | undefined,
```

更新 auth-choice 說明文字：

```typescript
.option(
  "--auth-choice <choice>",
  "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|kilocode-api-key|ai-gateway-api-key|...",
)
```

### Non-Interactive Onboarding

#### 10. `src/commands/onboard-non-interactive/local/auth-choice.ts`

新增 `kilocode-api-key` 的處理：

```typescript
if (authChoice === "kilocode-api-key") {
  const resolved = await resolveNonInteractiveApiKey({
    provider: "kilocode",
    cfg: baseConfig,
    flagValue: opts.kilocodeApiKey,
    flagName: "--kilocode-api-key",
    envVar: "KILOCODE_API_KEY",
  });
  await setKilocodeApiKey(resolved.apiKey, agentDir);
  nextConfig = applyAuthProfileConfig(nextConfig, {
    profileId: "kilocode:default",
    provider: "kilocode",
    mode: "api_key",
  });
  // ... apply default model
}
```

### Export Updates

#### 11. `src/commands/onboard-auth.ts`

新增匯出：

```typescript
export {
  // ... existing exports
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  KILOCODE_BASE_URL,
} from "./onboard-auth.config-core.js";

export {
  // ... existing exports
  KILOCODE_DEFAULT_MODEL_REF,
  setKilocodeApiKey,
} from "./onboard-auth.credentials.js";
```

### Special Handling (Optional)

#### 12. `src/agents/pi-embedded-runner/cache-ttl.ts`

新增 Kilo Gateway 對 Anthropic 模型的支援：

```typescript
export function isCacheTtlEligibleProvider(provider: string, modelId: string): boolean {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModelId = modelId.toLowerCase();
  if (normalizedProvider === "anthropic") return true;
  if (normalizedProvider === "openrouter" && normalizedModelId.startsWith("anthropic/")) return true;
  if (normalizedProvider === "kilocode" && normalizedModelId.startsWith("anthropic/")) return true;
  return false;
}
```

#### 13. `src/agents/transcript-policy.ts`

新增 Kilo Gateway 處理（類似於 OpenRouter）：

```typescript
const isKilocodeGemini = provider === "kilocode" && modelId.toLowerCase().includes("gemini");

// Include in needsNonImageSanitize check
const needsNonImageSanitize = isGoogle || isAnthropic || isMistral || isOpenRouterGemini || isKilocodeGemini;
```

## 設定結構

### 使用者設定範例

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "kilocode": {
        "baseUrl": "https://api.kilo.ai/api/gateway/",
        "apiKey": "xxxxx",
        "api": "openai-completions",
        "models": [
          {
            "id": "anthropic/claude-opus-4.6",
            "name": "Anthropic: Claude Opus 4.6"
          },
          { "id": "minimax/minimax-m2.5:free", "name": "Minimax: Minimax M2.5" }
        ]
      }
    }
  }
}
```

### 認證設定檔結構

```json
{
  "profiles": {
    "kilocode:default": {
      "type": "api_key",
      "provider": "kilocode",
      "key": "xxxxx"
    }
  }
}
```

## 測試考量

1. **單元測試：**
   - 測試 `setKilocodeApiKey()` 寫入正確的設定檔
   - 測試 `applyKilocodeConfig()` 設定正確的預設值
   - 測試 `resolveEnvApiKey("kilocode")` 傳回正確的環境變數

2. **整合測試：**
   - 測試使用 `--auth-choice kilocode-api-key` 的設定流程
   - 測試使用 `--kilocode-api-key` 的非互動式設定
   - 測試使用 `kilocode/` 前綴的模型選擇

3. **端對端測試：**
   - 測試透過 Kilo Gateway 的實際 API 呼叫（即時測試）

## 遷移注意事項

- 現有使用者不需要遷移
- 新使用者可以立即使用 `kilocode-api-key` 認證選項
- 現有使用 `kilocode` 提供者的手動設定將繼續運作

## 未來考量

1. **模型目錄：** 如果 Kilo Gateway 公開了 `/models` 端點，請添加類似於 `scanOpenRouterModels()` 的掃描支援

2. **OAuth 支援：** 如果 Kilo Gateway 新增了 OAuth，請相應地擴充認證系統

3. **速率限制：** 如有需要，請考慮新增專屬於 Kilo Gateway 的速率限制處理

4. **文件：** 在 `docs/providers/kilocode.md` 新增說明設定與使用的文件

## 變更摘要

| 檔案                                                        | 變更類型 | 描述                                                                  |
| ----------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `src/commands/onboard-auth.credentials.ts`                  | 新增     | `KILOCODE_DEFAULT_MODEL_REF`, `setKilocodeApiKey()`                   |
| `src/agents/model-auth.ts`                                  | 修改     | 新增 `kilocode` 到 `envMap`                                           |
| `src/config/io.ts`                                          | 修改     | 新增 `KILOCODE_API_KEY` 到 shell 環境變數鍵                           |
| `src/commands/onboard-auth.config-core.ts`                  | 新增     | `applyKilocodeProviderConfig()`，`applyKilocodeConfig()`              |
| `src/commands/onboard-types.ts`                             | 修改     | 將 `kilocode-api-key` 加入 `AuthChoice`，將 `kilocodeApiKey` 加入選項 |
| `src/commands/auth-choice-options.ts`                       | 修改     | 新增 `kilocode` 群組和選項                                            |
| `src/commands/auth-choice.preferred-provider.ts`            | 修改     | 新增 `kilocode-api-key` 對應                                          |
| `src/commands/auth-choice.apply.api-providers.ts`           | 修改     | 新增 `kilocode-api-key` 處理                                          |
| `src/cli/program/register.onboard.ts`                       | 修改     | 新增 `--kilocode-api-key` 選項                                        |
| `src/commands/onboard-non-interactive/local/auth-choice.ts` | 修改     | 新增非互動式處理                                                      |
| `src/commands/onboard-auth.ts`                              | 修改     | 匯出新函式                                                            |
| `src/agents/pi-embedded-runner/cache-ttl.ts`                | 修改     | 新增 kilocode 支援                                                    |
| `src/agents/transcript-policy.ts`                           | 修改     | 新增 kilocode Gemini 處理                                             |
