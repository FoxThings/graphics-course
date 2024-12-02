#pragma once

#include <etna/Window.hpp>
#include <etna/PerFrameCmdMgr.hpp>
#include <etna/ComputePipeline.hpp>
#include <etna/Image.hpp>

#include "wsi/OsWindowingManager.hpp"

#include <etna/GraphicsPipeline.hpp>
#include <etna/RenderTargetStates.hpp>
#include <etna/Sampler.hpp>


class App
{
public:
  App();
  ~App();

  void run();

private:
  void drawFrame();
  void textureStage(const vk::CommandBuffer& currentCmdBuf) const;
  void drawStage(
    const vk::CommandBuffer& currentCmdBuf,
    etna::RenderTargetState::AttachmentParams attachmentParams
  ) const;
  void loadResources();

  const char* shaderProgramName = "shader_toy";
  const char* textureProgramName = "texture_shader_toy";

  OsWindowingManager windowing;
  std::unique_ptr<OsWindow> osWindow;

  glm::uvec2 resolution;
  bool useVsync;

  std::unique_ptr<etna::Window> vkWindow;
  std::unique_ptr<etna::PerFrameCmdMgr> commandManager;

  etna::ComputePipeline proceduralTexturePipeline;
  etna::Image proceduralTextureImage;
  etna::Sampler proceduralTextureSampler;

  etna::GraphicsPipeline mainPipeline;
  etna::Image textureImage;
  etna::Sampler textureSampler;
};
