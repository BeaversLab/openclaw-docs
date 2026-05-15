---
summary: "CLI构建一个用于注册本地 AI CLI 后端的插件"
title: "CLI构建 CLI 后端插件"
sidebarTitle: "CLICLI 后端插件"
read_when:
  - You are building a local AI CLI backend plugin
  - You want to register a backend for model refs such as acme-cli/model
  - You need to map a third-party CLI into OpenClaw's text fallback runner
---

CLI 后端插件允许 OpenClaw 调用本地 AI CLI 作为文本推理后端。该后端在模型引用中显示为提供商前缀：

```text
acme-cli/acme-large
```

当上游集成已作为本地命令公开，当 CLI 拥有本地登录状态，或者当 API 提供商不可用时 CLI 是一个有用的后备方案时，请使用 CLI 后端。

<Info>如果上游服务公开了标准的 HTTP 模型 API，请改为编写[提供商插件](API/en/plugins/sdk-provider-plugins)。如果上游运行时拥有完整的代理会话、工具事件、压缩或后台任务状态，请使用[代理工具包](/zh/plugins/sdk-agent-harness)。</Info>

## 插件所拥有的内容

CLI 后端插件具有三个约定：

| 约定       | 文件                   | 目的                                             |
| ---------- | ---------------------- | ------------------------------------------------ |
| 包入口     | `package.json`         | 将 OpenClaw 指向插件运行时模块                   |
| 清单所有权 | `openclaw.plugin.json` | 在运行时加载之前声明后端 ID                      |
| 运行时注册 | `index.ts`             | 使用命令默认值调用 `api.registerCliBackend(...)` |

清单是发现元数据。它不执行 CLI 也不注册运行时行为。当插件入口调用 CLI`api.registerCliBackend(...)` 时，运行时行为开始。

## 最小后端插件

<Steps>
  <Step title="创建包元数据">
    ```json package.json
    {
      "name": "@acme/openclaw-acme-cli",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      },
      "dependencies": {
        "openclaw": "^2026.3.24"
      },
      "devDependencies": {
        "typescript": "^5.9.0"
      }
    }
    ```

    已发布的包必须包含构建后的 JavaScript 运行时文件。如果您的源代码入口是 `./src/index.ts`，请添加 `openclaw.runtimeExtensions` 指向构建后的 JavaScript 文件。请参阅 [入口点](/zh/plugins/sdk-entrypoints)。

  </Step>

  <Step title="声明后端所有权">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "Run Acme's local AI CLI through OpenClaw",
      "cliBackends": ["acme-cli"],
      "setup": {
        "cliBackends": ["acme-cli"],
        "requiresRuntime": false
      },
      "activation": {
        "onStartup": false
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```

    `cliBackends` 是运行时所有权列表。它允许当配置或模型选择提及 `acme-cli/...` 时，OpenClaw 自动加载插件。

    `setup.cliBackends` 是以描述符为主的设置界面。当模型发现、 或状态应在不加载插件运行时的情况下识别该后端时，请添加它。仅当这些静态描述符足以完成设置时，才使用 `requiresRuntime: false`。

  </Step>

  <Step title="注册后端">
    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      CLI_FRESH_WATCHDOG_DEFAULTS,
      CLI_RESUME_WATCHDOG_DEFAULTS,
      type CliBackendPlugin,
    } from "openclaw/plugin-sdk/cli-backend";

    function buildAcmeCliBackend(): CliBackendPlugin {
      return {
        id: "acme-cli",
        liveTest: {
          defaultModelRef: "acme-cli/acme-large",
          defaultImageProbe: false,
          defaultMcpProbe: false,
          docker: {
            npmPackage: "@acme/acme-cli",
            binaryName: "acme",
          },
        },
        config: {
          command: "acme",
          args: ["chat", "--json"],
          output: "json",
          input: "stdin",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          reliability: {
            watchdog: {
              fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
              resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
            },
          },
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "Run Acme's local AI CLI through OpenClaw",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    后端 ID 必须与清单中的 `cliBackends` 条目匹配。注册的 `config` 仅作为默认值；`agents.defaults.cliBackends.acme-cli` 下的用户配置会在运行时与其合并。

  </Step>
</Steps>

## 配置形状

`CliBackendConfig` 描述了 OpenClaw 应如何启动和解析 CLI：

| 字段                                      | 用途                                    |
| ----------------------------------------- | --------------------------------------- |
| `command`                                 | 二进制名称或绝对命令路径                |
| `args`                                    | 全新运行的基础 argv                     |
| `resumeArgs`                              | 恢复会话的替代 argv；支持 `{sessionId}` |
| `output` / `resumeOutput`                 | 解析器：`json`、`jsonl` 或 `text`       |
| `input`                                   | 提示词传输：`arg` 或 `stdin`            |
| `modelArg`                                | 模型 ID 之前使用的标志                  |
| `modelAliases`                            | 将 OpenClaw 模型 ID 映射到 CLI 原生 ID  |
| `sessionArg` / `sessionArgs`              | 如何传递会话 ID                         |
| `sessionMode`                             | `always`、`existing` 或 `none`          |
| `sessionIdFields`                         | OpenClaw 从 CLI 输出读取的 JSON 字段    |
| `systemPromptArg` / `systemPromptFileArg` | 系统提示词传输                          |
| `systemPromptWhen`                        | `first`、`always` 或 `never`            |
| `imageArg` / `imageMode`                  | 图片路径支持                            |
| `serialize`                               | 保持相同后端的运行有序                  |
| `reliability.watchdog`                    | 无输出超时调整                          |

首选与 CLI 匹配的最小静态配置。仅针对真正属于后端的行为添加插件回调。

## 高级后端钩子

`CliBackendPlugin` 也可以定义：

| 钩子                               | 用途                                      |
| ---------------------------------- | ----------------------------------------- |
| `normalizeConfig(config, context)` | 在合并后重写旧版用户配置                  |
| `resolveExecutionArgs(ctx)`        | 添加请求范围标志，例如思考强度            |
| `prepareExecution(ctx)`            | 在启动之前创建临时的身份验证或配置桥接    |
| `transformSystemPrompt(ctx)`       | 应用最终的 CLI 特定系统提示词转换         |
| `textTransforms`                   | 双向提示词/输出替换                       |
| `defaultAuthProfileId`             | 首选特定的 OpenClaw 身份验证配置文件      |
| `authEpochMode`                    | 决定身份验证更改如何使存储的 CLI 会话失效 |
| `nativeToolMode`                   | 声明 CLI 是否具有常开的原生工具           |
| `bundleMcp` / `bundleMcpMode`      | 选择加入 OpenClaw 的回环 MCP 工具桥接     |

保持这些钩子由提供商拥有。当后端钩子可以表达该行为时，不要在核心代码中添加 CLI 特定的分支。

## MCP 工具桥接

CLI 后端默认不接收 OpenClaw 工具。如果该 CLI 可以使用 MCP 配置，请显式选择加入：

```typescript
return {
  id: "acme-cli",
  bundleMcp: true,
  bundleMcpMode: "codex-config-overrides",
  config: {
    command: "acme",
    args: ["chat", "--json"],
    output: "json",
  },
};
```

支持的桥接模式包括：

| 模式                     | 用途                                |
| ------------------------ | ----------------------------------- |
| `claude-config-file`     | 接受 MCP 配置文件的 CLI             |
| `codex-config-overrides` | 接受 argv 中的配置覆盖的 CLI        |
| `gemini-system-settings` | 从其系统设置目录读取 MCP 设置的 CLI |

仅当该 CLI 实际可以使用时才启用桥接。如果该 CLI 拥有无法禁用的内置工具层，请设置 `nativeToolMode:
"always-on"`，以便当调用者不需要原生工具时 OpenClaw 能够以失败关闭的方式处理。

## 用户配置

用户可以覆盖任何后端默认值：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "acme-cli": {
          command: "/opt/acme/bin/acme",
          args: ["chat", "--json", "--profile", "work"],
          modelAliases: {
            large: "acme-large-2026",
          },
        },
      },
      model: {
        primary: "openai/gpt-5.5",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

请记录用户可能需要的最小覆盖量。通常，当二进制文件位于 `PATH` 之外时，仅需要 `command`。

## 验证

对于捆绑的插件，请在构建器和设置注册周围添加一个专注的测试，然后运行该插件的针对性测试通道：

```bash
pnpm test extensions/acme-cli
```

对于本地或已安装的插件，验证发现过程和一次真实的模型运行：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

如果后端支持图像或 MCP，请添加一个实时冒烟测试，使用真实的 CLI 证明这些路径。对于提示词、图像、MCP 或会话恢复行为，不要依赖静态检查。

## 检查清单

<Check>`package.json` 拥有 `openclaw.extensions` 并且已发布包的构建运行时条目</Check>
<Check>`openclaw.plugin.json` 声明了 `cliBackends` 和有意的 `activation.onStartup`</Check>
<Check>当设置/模型发现应该冷启动后端时，存在 `setup.cliBackends`</Check>
<Check>`api.registerCliBackend(...)` 使用与清单相同的后端 ID</Check>
<Check>`agents.defaults.cliBackends.<id>` 下的用户覆盖仍然有效</Check>
<Check>会话、系统提示词、图像和输出解析器设置与真实的 CLI 契约匹配</Check>
<Check>针对性测试和至少一个实时 CLI 冒烟测试证明了后端路径</Check>

## 相关

- [CLI 后端](/zh/gateway/cli-backends) - 用户配置和运行时行为
- [构建插件](/zh/plugins/building-plugins) - 包和清单基础
- [插件 SDK 概述](/zh/plugins/sdk-overview) - 注册 API 参考
- [插件清单](/zh/plugins/manifest) - `cliBackends` 和设置描述符
- [Agent 约束](/zh/plugins/sdk-agent-harness) - 完整的外部 Agent 运行时
