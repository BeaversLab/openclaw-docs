---
summary: "Models CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - 添加或修改 models CLI（models list/set/scan/aliases/fallbacks）
  - 修改模型回退行为或选择 UX
  - 更新模型扫描探测（tools/images）
title: "Models CLI"
---

# 模型 CLI

参见 [/concepts/model-failover](/zh/concepts/model-failover) 了解 auth profile
轮换、冷却与其与回退的交互。
快速 provider 概览 + 示例：[/concepts/model-providers](/zh/concepts/model-providers)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

1. **Primary** 模型（`agents.defaults.model.primary` 或 `agents.defaults.model`）。
2. **Fallbacks**（`agents.defaults.model.fallbacks`，按顺序）。
3. **Provider auth failover** 在 provider 内完成，然后才进入下一个模型。

相关：

- `agents.defaults.models` 是 OpenClaw 可用模型的 allowlist/目录（含别名）。
- `agents.defaults.imageModel` **仅在** primary 模型不支持图像时使用。
- per-agent 默认值可通过 `agents.list[].model` + bindings 覆盖 `agents.defaults.model`（见 [/concepts/multi-agent](/zh/concepts/multi-agent)）。

## 快速模型选择（经验）

- **GLM**：编码/工具调用略好。
- **MiniMax**：写作与氛围更佳。

## 安装向导（推荐）

若不想手动编辑配置，运行 onboarding 向导：

```bash
openclaw onboard
```

它可为常见 providers 设置 model + auth，包括 **OpenAI Code (Codex)
subscription**（OAuth）与 **Anthropic**（推荐 API key；也支持 `claude
setup-token`）。

## 配置键（概览）

- `agents.defaults.model.primary` 与 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 与 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models`（allowlist + aliases + provider 参数）
- `models.providers`（写入 `models.json` 的自定义 providers）

模型引用会归一为小写。Provider 别名如 `z.ai/*` 会规范化为 `zai/*`。

Provider 配置示例（含 OpenCode Zen）在
[/gateway/configuration](/zh/gateway/configuration#opencode-zen-multi-model-proxy)。

## “Model is not allowed”（以及为何不再回复）

若设置了 `agents.defaults.models`，它会成为 `/model` 与会话覆盖的 **allowlist**。
当用户选择不在 allowlist 中的模型时，OpenClaw 会返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

该错误**发生在**正常回复生成之前，因此会让人感觉“没有回复”。修复方式：

- 将模型加入 `agents.defaults.models`，或
- 清空 allowlist（移除 `agents.defaults.models`），或
- 从 `/model list` 选择模型。

allowlist 配置示例：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-5": { alias: "Opus" },
    },
  },
}
```

## 在聊天中切换模型（`/model`）

你可在当前会话中切换模型，无需重启：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

注：

- `/model`（与 `/model list`）是紧凑的编号选择器（模型系列 + 可用 providers）。
- `/model <#>` 从该选择器中选中。
- `/model status` 为详细视图（auth 候选以及配置时的 provider endpoint `baseUrl` + `api` 模式）。
- 模型引用按**第一个** `/` 分割解析。输入 `/model <ref>` 时使用 `provider/model`。
- 若模型 ID 本身包含 `/`（OpenRouter 风格），必须包含 provider 前缀（示例：`/model openrouter/moonshotai/kimi-k2`）。
- 若省略 provider，OpenClaw 会将输入视为别名或**默认 provider** 的模型（仅在模型 ID 不含 `/` 时生效）。

完整命令行为/配置： [斜杠命令](/zh/tools/slash-commands)。

## CLI 命令

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models`（不带子命令）是 `models status` 的快捷方式。

### `models list`

默认显示已配置模型。常用 flags：

- `--all`：完整目录
- `--local`：仅本地 providers
- `--provider <name>`：按 provider 过滤
- `--plain`：每行一个模型
- `--json`：机器可读输出

### `models status`

显示解析后的 primary 模型、fallbacks、image 模型，以及配置 providers 的 auth 概览。它也会显示 auth store 中 OAuth profile 的过期状态（默认 24 小时内提示）。`--plain` 仅打印解析后的 primary 模型。
OAuth 状态始终显示（且包含在 `--json` 输出中）。若配置的 provider 无凭据，`models status` 会输出 **Missing auth** 部分。
JSON 包含 `auth.oauth`（提示窗口 + profiles）与 `auth.providers`（各 provider 的有效 auth）。
自动化可用 `--check`（缺失/过期退出码 `1`，即将过期退出码 `2`）。

Anthropic 推荐使用 Claude Code CLI 的 setup-token（任意位置运行；必要时在 gateway 主机上粘贴）：

```bash
claude setup-token
openclaw models status
```

## 扫描（OpenRouter 免费模型）

`openclaw models scan` 会检查 OpenRouter 的**免费模型目录**，并可选探测模型的工具与图像支持。

关键 flags：

- `--no-probe`：跳过实时探测（仅元数据）
- `--min-params <b>`：最小参数规模（十亿）
- `--max-age-days <days>`：跳过更旧的模型
- `--provider <name>`：provider 前缀过滤
- `--max-candidates <n>`：fallback 列表大小
- `--set-default`：将 `agents.defaults.model.primary` 设为首个选择
- `--set-image`：将 `agents.defaults.imageModel.primary` 设为首个图像选择

探测需要 OpenRouter API key（来自 auth profiles 或 `OPENROUTER_API_KEY`）。无 key 时请用 `--no-probe` 仅列候选。

扫描结果排序依据：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数规模

输入

- OpenRouter `/models` 列表（过滤 `:free`）
- 需要来自 auth profiles 或 `OPENROUTER_API_KEY` 的 OpenRouter API key（见 [/environment](/zh/environment)）
- 可选过滤：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探测控制：`--timeout`、`--concurrency`

在 TTY 中可交互选择 fallbacks。非交互模式使用 `--yes` 接受默认值。

## Models registry（`models.json`）

`models.providers` 中的自定义 providers 会写入 agent 目录下的 `models.json`（默认 `~/.openclaw/agents/<agentId>/models.json`）。该文件默认合并，除非 `models.mode` 设为 `replace`。
