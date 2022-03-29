import { Instance as PopperInstance, VirtualElement } from "@popperjs/core";
import * as glm from "gl-matrix";
import { BMFontData } from "./bmfont";
import { ParsedFASTA } from "./fasta";
import { HTMLTemplates } from "./templates";
import { TileMap } from "./tilemap";

export interface CustomWindow extends Window {
  MAFFTMSAViewer: MAFFTMSAViewer;
}

export interface MAFFTMSAViewer {
  Assets: Assets;
  State: State;
}

export interface GlyphInfoDict {
  [key: number]: GlyphInfo;
}

export interface GlyphInfo {
  Char: string;
  //Measurements in pixels
  X: number;
  Y: number;
  Height: number;
  Width: number;
  //Measurements normalized to pixels / line height for projection on an arbitrary quad
  NormalizedXOffset: number;
  NormalizedYOffset: number;
  NormalizedHeight: number;
  NormalizedWidth: number;
  NormalizedXAdvance: number;
}

export interface HTMLTemplateDict {
  [key: string]: string;
}

export interface GlyphCountDict {
  [key: string]: number;
}

export interface Uint8CountDict {
  [key: number]: number;
}

export interface BasicColor {
  R: number;
  G: number;
  B: number;
}

export interface ColorDictCollection {
  [key: string]: ColorDict;
}

export interface ColorDict {
  Name: string;
  Glyphs: {
    [key: string]: string;
  };
}

export interface GPUBuffer {
  ElementsPerVert: number;
  Buffer: WebGLBuffer;
  Type: GLenum;
}

export interface GPUTextureDict {
  [key: number]: WebGLTexture;
}

export interface ShaderUniformDict {
  [key: string]: WebGLUniformLocation;
}

export interface Shader {
  Program: WebGLProgram;
  Uniforms: ShaderUniformDict;
}

export interface WindowGeometry {
  LabelsPosition: glm.vec2;
  LabelsSize: glm.vec2;
  SeparatorPosition: glm.vec2;
  SeparatorSize: glm.vec2;
  MSAPosition: glm.vec2;
  MSASize: glm.vec2;
  LabelsBottomScrollbarSize: glm.vec2;
  LabelsBottomScrollbarPosition: glm.vec2;
  MSABottomScrollbarSize: glm.vec2;
  MSABottomScrollbarPosition: glm.vec2;
  MSARightScrollbarSize: glm.vec2;
  MSARightScrollbarPosition: glm.vec2;

  //Derived geoemtry calculated in GLDraw()
  LabelsBottomScrollbarHandleSize: glm.vec2;
  LabelsBottomScrollbarHandlePosition: glm.vec2;
  MSABottomScrollbarHandleSize: glm.vec2;
  MSABottomScrollbarHandlePosition: glm.vec2;
  MSARightScrollbarHandleSize: glm.vec2;
  MSARightScrollbarHandlePosition: glm.vec2;
}

export interface HammerJSEvent {
  X: number;
  Y: number;
  PanType: string;
  TapType: string;
}

export interface Model {
  VertexBuffer: GPUBuffer;
  UVBuffer: GPUBuffer;
  IndexBuffer: GPUBuffer;
  Matrix: WebGLUniformLocation;
  NumberOfVertices: number;
}

export interface Assets {
  MSAColors: ColorDict;
  MSAQuadVerts: Float32Array;
  MSAQuadUVs: Float32Array;
  MSAQuadIndices: Uint16Array;
  MSAQuadVertCode: string;
  MSAQuadFragCode: string;
  LabelsVertCode: string;
  LabelsFragCode: string;
  ColorTexture: Uint8Array;
  FontTexture: HTMLImageElement;
  VariableFontTexture: HTMLImageElement;
  VariableFontInfo: BMFontData;
}

export interface State {
  Canvas: HTMLCanvasElement;
  HTMLTemplates: HTMLTemplates;
  GLContext: WebGLRenderingContext;
  InitialTileSize: number;
  GPUTextureSize: number;
  HammerJSPan: HammerJSEvent;
  ZoomViewPosStart: number;
  MSATileDimensions: glm.vec2;
  MaxMSAWorldPosition: glm.vec2;
  LabelTileDimensions: glm.vec2;
  MaxLabelWorldPosition: glm.vec2;
  WindowGeometry: WindowGeometry;
  MouseWheelMode: string;
  TooltipPopperEnabled: boolean;
  TooltipPopperTimeoutID: number;
  TooltipPopperJSInstance: PopperInstance;
  TooltipPopperVirtualElement: VirtualElement;

  //Derived state
  LabelsCurrentTopLeft: glm.vec3;
  LabelsCurrentBottomRight: glm.vec3;
  MSACurrentTopLeft: glm.vec3;
  MSACurrentBottomRight: glm.vec3;

  //Matrix stacks
  QuadModelMatrix: glm.mat4;
  QuadPosition: glm.vec3;
  LabelProjectionMatrix: glm.mat4;
  LabelScreenToWorldMatrix: glm.mat4;
  LabelViewMatrix: glm.mat4;
  LabelViewPosition: glm.vec3;
  LabelWorldToScreenMatrix: glm.mat4;
  MSAProjectionMatrix: glm.mat4;
  MSAScreenToWorldMatrix: glm.mat4;
  MSAViewMatrix: glm.mat4;
  MSAViewPosition: glm.vec3;
  MSAWorldToScreenMatrix: glm.mat4;

  //Formerly GoState
  Initialized: boolean;
  Sequences: ParsedFASTA;
  MSATileMap: TileMap;
  GPUMSATileMap: GPUTextureDict; //mapping of MSATileMap tile indexes to MSA textures
  GPUConsensusTileMap: GPUTextureDict; //mapping of MSATileMap to consensus textures
  MSAShader: Shader;
  LabelsShader: Shader;
  MSAQuad: Model;
  LabelModels: Model[];
  MSAViewMatrixUniform: WebGLUniformLocation;
  MSAProjectionMatrixUniform: WebGLUniformLocation;
  LabelsViewMatrixUniform: WebGLUniformLocation;
  LabelsProjectionMatrixUniform: WebGLUniformLocation;
  ColorTexture: WebGLTexture;
  FontTexture: WebGLTexture;
  FontInfo: glm.vec4;
  VariableFontTexture: WebGLTexture;

  //Color settings
  BackgroundColor: string;
  SeparatorColor: string;
  LabelTextColor: string;
  LabelTextBGColor: string;
  ScrollbarBGColor: string;
  ScrollbarHandleColor: string;
  ConsensusColorBy: boolean;
  ConsensusVaryBy: boolean;
  ConsensusCutoff: number;
}
