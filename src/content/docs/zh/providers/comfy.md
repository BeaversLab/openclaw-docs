---
title: "ComfyUI"
summary: "在 OpenClaw 中设置 ComfyUI 工作流图像、视频和音乐生成"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw 附带了一个用于驱动工作流运行的 ComfyUI `comfy` 插件。该插件完全由工作流驱动，因此 OpenClaw 不会尝试将通用的 `size`、`aspectRatio`、`resolution`、`durationSeconds` 或 TTS 风格的控制映射到您的图表中。

| 属性     | 详情                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 提供商   | `comfy`                                                                              |
| 模型     | `comfy/workflow`                                                                     |
| 共享表面 | `image_generate`、`video_generate`、`music_generate`                                 |
| 身份验证 | 本地 ComfyUI 无需身份验证；Comfy Cloud 需要 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| API      | ComfyUI `/prompt` / `/history` / `/view` 和 Comfy Cloud `/api/*`                     |

## 支持内容

- 根据工作流 JSON 生成图像
- 使用 1 张上传的参考图像进行图像编辑
- 根据工作流 JSON 生成视频
- 使用 1 张上传的参考图像生成视频
- 通过共享 `music_generate` 工具生成音乐或音频
- 从配置的节点或所有匹配的输出节点下载输出

## 入门指南

选择在您自己的机器上运行 ComfyUI 还是使用 Comfy Cloud。

<Tabs>
  <Tab title="Local">
    **最适用于：** 在您的机器或局域网上运行您自己的 ComfyUI 实例。

    <Steps>
      <Step title="本地启动 ComfyUI">
        确保您的本地 ComfyUI 实例正在运行（默认为 `http://127.0.0.1:8188`）。
      </Step>
      <Step title="准备工作流 JSON">
        导出或创建 ComfyUI 工作流 JSON 文件。记下您希望 OpenClaw 读取的提示输入节点和输出节点的节点 ID。
      </Step>
      <Step title="配置提供商">
        设置 `mode: "local"` 并指向您的工作流文件。这是一个最简单的图像示例：

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "local",
                baseUrl: "http://127.0.0.1:8188",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step title="设置默认模型">
        指引 OpenClaw 使用您配置的功能对应的 `comfy/workflow` 模型：

        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Comfy Cloud">
    **最适合：** 在 Comfy Cloud 上运行工作流，而无需管理本地 GPU 资源。

    <Steps>
      <Step title="获取 API 密钥">
        在 [comfy.org](https://comfy.org) 注册，并从您的帐户控制面板生成一个 API 密钥。
      </Step>
      <Step title="设置 API 密钥">
        通过以下任一方式提供您的密钥：

        ```bash
        # Environment variable (preferred)
        export COMFY_API_KEY="your-key"

        # Alternative environment variable
        export COMFY_CLOUD_API_KEY="your-key"

        # Or inline in config
        openclaw config set models.providers.comfy.apiKey "your-key"
        ```
      </Step>
      <Step title="准备工作流 JSON">
        导出或创建一个 ComfyUI 工作流 JSON 文件。记下提示输入节点和输出节点的节点 ID。
      </Step>
      <Step title="配置提供商">
        设置 `mode: "cloud"` 并指向您的工作流文件：

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "cloud",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```

        <Tip>
        云模式默认将 `baseUrl` 设置为 `https://cloud.comfy.org`。仅当您使用自定义云端点时才需要设置 `baseUrl`。
        </Tip>
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="验证">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置

Comfy 支持共享的顶级连接设置以及针对每个功能的工作流部分（`image`、`video`、`music`）：

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

### 共享密钥

| 密钥                  | 类型                   | 描述                                                                            |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `mode`                | `"local"` 或 `"cloud"` | 连接模式。                                                                      |
| `baseUrl`             | 字符串                 | 本地默认为 `http://127.0.0.1:8188`，云端默认为 `https://cloud.comfy.org`。      |
| `apiKey`              | 字符串                 | 可选的内联密钥，是 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 环境变量的替代方案。 |
| `allowPrivateNetwork` | 布尔值                 | 在云模式下允许私有/局域网 `baseUrl`。                                           |

### 针对每个功能的密钥

这些键适用于 `image`、`video` 或 `music` 部分：

| 键                           | 必填 | 默认值   | 描述                                                        |
| ---------------------------- | ---- | -------- | ----------------------------------------------------------- |
| `workflow` 或 `workflowPath` | 是   | --       | ComfyUI 工作流 JSON 文件的路径。                            |
| `promptNodeId`               | 是   | --       | 接收文本提示的节点 ID。                                     |
| `promptInputName`            | 否   | `"text"` | 提示节点上的输入名称。                                      |
| `outputNodeId`               | 否   | --       | 从中读取输出的节点 ID。如果省略，则使用所有匹配的输出节点。 |
| `pollIntervalMs`             | 否   | --       | 轮询作业完成的间隔（毫秒）。                                |
| `timeoutMs`                  | 否   | --       | 工作流运行的超时时间（毫秒）。                              |

`image` 和 `video` 部分还支持：

| 键                    | 必填                 | 默认值    | 描述                        |
| --------------------- | -------------------- | --------- | --------------------------- |
| `inputImageNodeId`    | 是（传递参考图像时） | --        | 接收上传参考图像的节点 ID。 |
| `inputImageInputName` | 否                   | `"image"` | 图像节点上的输入名称。      |

## 工作流详情

<AccordionGroup>
  <Accordion title="图像工作流">
    将默认图像模型设置为 `comfy/workflow`：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    **参考图像编辑示例：**

    要使用上传的参考图像启用图像编辑，请将 `inputImageNodeId` 添加到您的图像配置中：

    ```json5
    {
      models: {
        providers: {
          comfy: {
            image: {
              workflowPath: "./workflows/edit-api.json",
              promptNodeId: "6",
              inputImageNodeId: "7",
              inputImageInputName: "image",
              outputNodeId: "9",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="视频工作流">
    将默认视频模型设置为 `comfy/workflow`：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    Comfy 视频工作流通过配置的图支持文本生成视频和图像生成视频。

    <Note>
    OpenClaw 不会将输入视频传递到 Comfy 工作流中。仅支持文本提示和单个参考图像作为输入。
    </Note>

  </Accordion>

  <Accordion title="音乐工作流">
    捆绑的插件为工作流定义的音频或音乐输出注册了一个音乐生成提供商，通过共享的 `music_generate` 工具呈现：

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    使用 `music` 配置部分指向您的音频工作流 JSON 和输出节点。

  </Accordion>

  <Accordion title="向后兼容">
    现有的顶层图像配置（没有嵌套的 `image` 部分）仍然有效：

    ```json5
    {
      models: {
        providers: {
          comfy: {
            workflowPath: "./workflows/flux-api.json",
            promptNodeId: "6",
            outputNodeId: "9",
          },
        },
      },
    }
    ```

    OpenClaw 将该遗留结构视为图像工作流配置。您无需立即迁移，但对于新设置，建议使用嵌套的 `image` / `video` / `music` 部分。

    <Tip>
    如果您仅使用图像生成，传统的扁平配置和新的嵌套 `image` 部分在功能上是等效的。
    </Tip>

  </Accordion>

  <Accordion title="实时测试">
    捆绑插件存在可供选择的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    除非配置了匹配的 Comfy 工作流部分，否则实时测试会跳过单独的图像、视频或音乐案例。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    图像生成工具的配置和使用。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    视频生成工具的配置和使用。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    音乐和音频生成工具的设置。
  </Card>
  <Card title="提供商目录" href="/zh/providers/index" icon="layers">
    所有提供商和模型引用的概述。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference#agent-defaults" icon="gear">
    包含代理默认值的完整配置参考。
  </Card>
</CardGroup>
