---
summary: "通过 Qwen 内置的 qwen 提供商使用 OpenClaw Cloud"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth 已被移除。** 使用 `portal.qwen.ai` 端点的免费层 OAuth 集成
(`qwen-portal`) 不再可用。
请参阅 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景信息。

</Warning>

## 推荐：Qwen Cloud

OpenClaw 现将 Qwen 视为具有规范 ID `qwen` 的一等内置提供商。该内置提供商针对 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端点，并保持旧的 `modelstudio` ID 作为兼容性别名继续工作。

- 提供商：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 出于兼容性也接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 风格：OpenAI 兼容

如果您需要 `qwen3.6-plus`，请首选 **标准版 (按量付费)** 端点。
Coding Plan 的支持可能会滞后于公开目录。

```bash
# Global Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key

# China Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key-cn

# Global Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key

# China Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key-cn
```

旧的 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型引用
仍可作为兼容性别名使用，但新的设置流程应首选规范的
`qwen-*` auth-choice ID 和 `qwen/...` 模型引用。

完成新手引导后，设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "qwen/qwen3.5-plus" },
    },
  },
}
```

## 计划类型和端点

| 计划               | 区域 | 认证选项                   | 端点                                             |
| ------------------ | ---- | -------------------------- | ------------------------------------------------ |
| 标准版 (按量付费)  | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 标准版 (按量付费)  | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (订阅) | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (订阅) | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供商会根据您的认证选项自动选择端点。规范
选项使用 `qwen-*` 系列；`modelstudio-*` 仍仅用于兼容性。
您可以在配置中通过自定义 `baseUrl` 进行覆盖。

Native Model Studio 端点在共享的 `openai-completions` 传输上通告流式使用兼容性。OpenClaw 密钥现在关闭了端点功能，因此针对相同原生主机的 DashScope 兼容自定义提供商 ID 会继承相同的流式使用行为，而无需专门要求内置的 `qwen` 提供商 ID。

## 获取您的 API 密钥

- **管理密钥**：[home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys)
- **文档**：[docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)

## 内置目录

OpenClaw 目前附带此捆绑的 Qwen 目录：

| 模型参考                    | 输入        | 上下文    | 备注                                 |
| --------------------------- | ----------- | --------- | ------------------------------------ |
| `qwen/qwen3.5-plus`         | text, image | 1,000,000 | 默认模型                             |
| `qwen/qwen3.6-plus`         | text, image | 1,000,000 | 当您需要此模型时，首选 Standard 端点 |
| `qwen/qwen3-max-2026-01-23` | text        | 262,144   | Qwen Max 系列                        |
| `qwen/qwen3-coder-next`     | text        | 262,144   | 编程                                 |
| `qwen/qwen3-coder-plus`     | text        | 1,000,000 | 编程                                 |
| `qwen/MiniMax-M2.5`         | text        | 1,000,000 | 启用推理                             |
| `qwen/glm-5`                | text        | 202,752   | GLM                                  |
| `qwen/glm-4.7`              | text        | 202,752   | GLM                                  |
| `qwen/kimi-k2.5`            | text, image | 262,144   | 阿里云上的 Moonshot AI               |

即使模型存在于捆绑目录中，可用性仍可能因端点和计费计划而异。

原生流式使用兼容性适用于 Coding Plan 主机和 Standard DashScope 兼容主机：

- `https://coding.dashscope.aliyuncs.com/v1`
- `https://coding-intl.dashscope.aliyuncs.com/v1`
- `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## Qwen 3.6 Plus 可用性

`qwen3.6-plus` 可在 Standard（按量付费）Model Studio 端点上使用：

- 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
- 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

如果 Coding Plan 端点为 `qwen3.6-plus` 返回“不支持的模型”错误，请切换到 Standard（按量付费），而不是 Coding Plan 端点/密钥对。

## 功能计划

`qwen` 扩展被定位为整个 Qwen Cloud 表面的供应商主页，而不仅仅是编程/文本模型。

- 文本/聊天模型：现已内置
- 工具调用、结构化输出、思考：继承自 OpenAI 兼容传输层
- 图像生成：计划在 提供商-plugin 层实现
- 图像/视频理解：现已内置于 Standard 端点
- 语音/音频：计划在 提供商-plugin 层实现
- 记忆嵌入/重排序：计划通过 embedding adapter 接口实现
- 视频生成：现已通过共享的视频生成能力内置

## 多模态附加功能

`qwen` 扩展现在还公开了：

- 通过 `qwen-vl-max-latest` 进行视频理解
- Wan 视频生成通过：
  - `wan2.6-t2v`（默认）
  - `wan2.6-i2v`
  - `wan2.6-r2v`
  - `wan2.6-r2v-flash`
  - `wan2.7-r2v`

这些多模态接口使用 **Standard** DashScope 端点，而不是
Coding Plan 端点。

- 全球/国际 Standard 基础 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- 中国 Standard 基础 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

对于视频生成，OpenClaw 会在提交作业之前将已配置的 Qwen 区域
映射到匹配的 DashScope AIGC 主机：

- 全球/国际：`https://dashscope-intl.aliyuncs.com`
- 中国：`https://dashscope.aliyuncs.com`

这意味着，一个指向 Coding Plan 或 Standard Qwen 主机的普通
`models.providers.qwen.baseUrl` 仍然会将视频生成保持在正确的
区域性 DashScope 视频端点上。

对于视频生成，请显式设置默认模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

当前内置的 Qwen 视频生成限制：

- 每个请求最多 **1** 个输出视频
- 最多 **1** 张输入图像
- 最多 **4** 个输入视频
- 最长 **10 秒** 时长
- 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 参考图像/视频模式当前需要 **远程 http(s) URL**。由于 DashScope 视频端点不接受
  针对这些引用的上传本地缓冲区，本地文件路径会被预先拒绝。

有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/en/tools/video-generation)。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `QWEN_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
