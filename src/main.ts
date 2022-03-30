import { createPopper, Placement } from "@popperjs/core";
import * as glm from "gl-matrix";
import MenuBarCallbacks from "../templates/menu_bar";
import { BMFontData } from "./bmfont";
import { BuildColorTexture, ColorCollection } from "./colors";
import { HTMLTemplates } from "./templates";
import { Assets, CustomWindow, State, WindowGeometry } from "./types";
import { CalculateGeometry, LoadURL, ResizeCanvas } from "./ui";
import {
  ElementByID,
  RemoveByID,
  SetHTMLByID,
  Sleep,
  SleepRedrawValue,
} from "./utils";

declare var window: CustomWindow;

export async function StartMSAViewer(window: CustomWindow): Promise<void> {
  //Load HTML templates
  const html_templates = new HTMLTemplates();
  await html_templates.load("./html/templates.zip");

  //Pop the loading screen
  const sleep_time = SleepRedrawValue();
  SetHTMLByID("MAFFTMSAViewerMain", html_templates.Run("loading_screen"));
  await Sleep(sleep_time);

  //Load the main window
  SetHTMLByID("MAFFTMSAViewerLoadingText", "Initializing window...");
  await Sleep(sleep_time);
  ElementByID("MAFFTMSAViewerMain").innerHTML += html_templates.Run("main");

  //Load the menu and wire up the callbacks
  SetHTMLByID("MAFFTMSAViewerLoadingText", "Initializing menu...");
  await Sleep(sleep_time);
  SetHTMLByID("MAFFTMSAViewerControlBar", html_templates.Run("menu_bar"));
  MenuBarCallbacks();

  //Declare static assets
  const assets: Assets = {
    MSAQuadVerts: new Float32Array([
      0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 0.0, 0.0,
    ]),

    //UV's for this quad are flipped on the Y axis to account for WebGL flipping image data
    //on loading
    MSAQuadUVs: new Float32Array([
      0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    ]),

    //Remember, WebGL wants counter-clockwise winding on verts!
    MSAQuadIndices: new Uint16Array([0, 1, 2, 2, 3, 0]),

    //Placeholders to load shader data into later
    MSAQuadVertCode: "",
    MSAQuadFragCode: "",
    LabelsVertCode: "",
    LabelsFragCode: "",
    FontTexture: new Image(),
    VariableFontTexture: new Image(),
    VariableFontInfo: null,
    MSAColors: ColorCollection["Miyata"],
    ColorTexture: BuildColorTexture(ColorCollection["Miyata"]),
  };

  //Initialize window geometry
  const window_geometry: WindowGeometry = {
    LabelsPosition: glm.vec2.create(),
    LabelsSize: glm.vec2.create(),
    SeparatorPosition: glm.vec2.create(),
    SeparatorSize: glm.vec2.create(),
    MSAPosition: glm.vec2.create(),
    MSASize: glm.vec2.create(),
    LabelsBottomScrollbarPosition: glm.vec2.create(),
    LabelsBottomScrollbarSize: glm.vec2.create(),
    MSABottomScrollbarPosition: glm.vec2.create(),
    MSABottomScrollbarSize: glm.vec2.create(),
    MSARightScrollbarPosition: glm.vec2.create(),
    MSARightScrollbarSize: glm.vec2.create(),

    //Derived geoemtry calculated in GLDraw()
    LabelsBottomScrollbarHandleSize: glm.vec2.create(),
    LabelsBottomScrollbarHandlePosition: glm.vec2.create(),
    MSABottomScrollbarHandleSize: glm.vec2.create(),
    MSABottomScrollbarHandlePosition: glm.vec2.create(),
    MSARightScrollbarHandleSize: glm.vec2.create(),
    MSARightScrollbarHandlePosition: glm.vec2.create(),
  };

  //Initialize PopperJS
  const virtual_element = {
    getBoundingClientRect: function () {
      return new DOMRect(0, 0, 0, 0);
    },
  };
  const popper_options = {
    placement: "top" as Placement,
    modifiers: [{ name: "offset", options: { offset: [0, 2] } }],
  };
  const tooltip_div = ElementByID("MAFFTMSAViewerPopperTooltip");
  const popper_instance = createPopper(
    virtual_element,
    tooltip_div,
    popper_options
  );

  //Build state object
  const canvas = ElementByID("MAFFTMSAViewerWebGLCanvas") as HTMLCanvasElement;
  const state: State = {
    Canvas: ElementByID("MAFFTMSAViewerWebGLCanvas") as HTMLCanvasElement,
    HTMLTemplates: html_templates,
    GLContext: canvas.getContext("webgl"),
    InitialTileSize: 24,
    GPUTextureSize: 1024,
    HammerJSPan: null, //This only gets filled in at the start of a zoom
    ZoomViewPosStart: null, //This only gets filled in at the start of a pinch
    MSATileDimensions: glm.vec2.create(),
    MaxMSAWorldPosition: glm.vec2.create(),
    LabelTileDimensions: glm.vec2.create(),
    MaxLabelWorldPosition: glm.vec2.create(),
    WindowGeometry: window_geometry,
    MouseWheelMode: "zoom",
    TooltipPopperEnabled: false,
    TooltipPopperTimeoutID: null,
    TooltipPopperJSInstance: popper_instance,
    TooltipPopperVirtualElement: virtual_element,

    //Derived state
    LabelsCurrentTopLeft: glm.vec3.create(),
    LabelsCurrentBottomRight: glm.vec3.create(),
    MSACurrentTopLeft: glm.vec3.create(),
    MSACurrentBottomRight: glm.vec3.create(),

    //Initialize matrix stack
    QuadModelMatrix: glm.mat4.create(),
    QuadPosition: glm.vec3.create(),
    LabelProjectionMatrix: glm.mat4.create(),
    LabelViewMatrix: glm.mat4.create(),
    LabelViewPosition: glm.vec3.fromValues(0, 0, 1),
    LabelScreenToWorldMatrix: glm.mat4.create(),
    LabelWorldToScreenMatrix: glm.mat4.create(),
    MSAProjectionMatrix: glm.mat4.create(),
    MSAScreenToWorldMatrix: glm.mat4.create(),
    MSAViewMatrix: glm.mat4.create(),
    MSAViewPosition: glm.vec3.fromValues(0, 0, 1),
    MSAWorldToScreenMatrix: glm.mat4.create(),

    //Filled in during GLInitialize
    Initialized: false,
    Sequences: null,
    MSATileMap: null,
    GPUMSATileMap: null,
    GPUConsensusTileMap: null,
    MSAShader: null,
    LabelsShader: null,
    MSAQuad: null,
    LabelModels: null,
    MSAViewMatrixUniform: null,
    MSAProjectionMatrixUniform: null,
    LabelsViewMatrixUniform: null,
    LabelsProjectionMatrixUniform: null,
    ColorTexture: null,
    FontTexture: null,
    VariableFontTexture: null,
    FontInfo: glm.vec4.create(),

    //Color settings
    BackgroundColor: "#FFFFFF",
    SeparatorColor: "#B8B8B8",
    LabelTextColor: "#000000",
    LabelTextBGColor: "#FFFFFF",
    ScrollbarBGColor: "#777777",
    ScrollbarHandleColor: "#DDDDDD",
    ConsensusColorBy: true,
    ConsensusVaryBy: false,
    ConsensusCutoff: 0.0,
  };

  //Set up global object as a way to share data back and forth
  //without always having to search through the DOM
  window.MAFFTMSAViewer = {
    State: state,
    Assets: assets,
  };

  //Initialize matrices and resize canvas to fit window
  SetHTMLByID("MAFFTMSAViewerLoadingText", "Initializing viewer state...");
  await Sleep(sleep_time);
  window.addEventListener("resize", ResizeCanvas);
  window.addEventListener("orientationchange", ResizeCanvas);
  ResizeCanvas(new MouseEvent("empty"));
  CalculateGeometry(true);

  //Configure/load assets that will be used by the Go code
  SetHTMLByID("MAFFTMSAViewerLoadingText", "Retrieving assets...");
  await Sleep(sleep_time);

  var response = await fetch("./glsl/msa.vert");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.MSAQuadVertCode = await response.text();
  }
  response = await fetch("./glsl/msa.frag");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.MSAQuadFragCode = await response.text();
  }
  response = await fetch("./glsl/labels.vert");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.LabelsVertCode = await response.text();
  }
  response = await fetch("./glsl/labels.frag");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.LabelsFragCode = await response.text();
  }

  //TODO: Load this dynamically from a saved JSON file in web/fonts
  glm.vec4.set(window.MAFFTMSAViewer.State.FontInfo, 24, 43, 42, 1024);
  response = await fetch("./img/meslo_lg_s_dz.png");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.FontTexture.src = URL.createObjectURL(
      await response.blob()
    );
  }
  response = await fetch("./img/spline_sans_atlas.png");
  if (response.ok) {
    window.MAFFTMSAViewer.Assets.VariableFontTexture.src = URL.createObjectURL(
      await response.blob()
    );
  }
  response = await fetch("./img/spline_sans_atlas.json");
  if (response.ok) {
    var json_data = await response.json();
    window.MAFFTMSAViewer.Assets.VariableFontInfo = new BMFontData(
      json_data,
      0.08
    );
  }

  RemoveByID("MAFFTMSAViewerLoadingScreen");

  //Load URL if it has been set (also does position option after loading)
  const full_url = new URL(window.location.href);
  const url_param = full_url.searchParams.get("LoadURL");
  if (url_param !== null) {
    await LoadURL(url_param);
  }

  return;
}
