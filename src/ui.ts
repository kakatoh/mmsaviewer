import * as bootstrap from "bootstrap";
import * as glm from "gl-matrix";
import * as Hammer from "hammerjs";
import * as pako from "pako";
import { BuildColorTexture, ColorCollection } from "../src/colors";
import { ParsedFASTA } from "./fasta";
import { CustomWindow, HammerJSEvent } from "./types";
import {
  Clamp,
  ElementByID,
  NewError,
  SetHTMLByID,
  Sleep,
  SleepRedrawValue,
} from "./utils";
import { GLDestroy, GLDraw, GLInitialize, LoadColorTexture } from "./webgl";

declare var window: CustomWindow;

export async function LoadURL(url: string): Promise<void> {
  //Pop the loading screen
  const loading_modal = DoModal("loading_screen_modal");
  //Set up XHR request callbacks
  //We use XHR here because can easily get progress information similar to the file loader
  const xhr = new XMLHttpRequest();
  xhr.onload = async function () {
    if (xhr.status != 200) {
      loading_modal.hide();
      //JS error messages from XHR are not very user friendly so we rewrite the most
      //common ones to be friendlier. More can be added as-needed.
      switch (xhr.status) {
        case 404:
          RecoverableError(
            NewError("Download Error", "File not found at URL.")
          );
          break;
        default:
          RecoverableError(NewError("Download Error", xhr.statusText));
          break;
      }
      return;
    }
    const raw_data = new Uint8Array(xhr.response as ArrayBuffer);
    await LoadAlignment(url, raw_data, loading_modal);

    //Set load URL
    const full_url = new URL(window.location.href);
    full_url.searchParams.set("LoadURL", url);
    window.history.replaceState(null, "", decodeURIComponent(full_url.href));

    //Unhide share URL option
    ElementByID("MAFFTMSAViewer_menu_share_url").style.display = "block";

    //Do position option if available
    const pos_param = full_url.searchParams.get("Pos");
    if (pos_param !== null) {
      const position_box = ElementByID(
        "MAFFTMSAViewer_toolbar_position_input"
      ) as HTMLInputElement;
      position_box.value = pos_param;
      PositionBoxButton(null);
    }

    //Do color scheme option if available
    const color_scheme_param = full_url.searchParams.get("ColorScheme");
    if (color_scheme_param !== null) {
      SetColorScheme(color_scheme_param);
    }
  };
  xhr.onprogress = async function (event: ProgressEvent) {
    const percentage = Math.floor((event.loaded / event.total) * 100.0);
    SetHTMLByID(
      "MAFFTMSAViewerLoadingText",
      "Loading data (" + percentage + "%)..."
    );
  };
  //Actually send the request
  xhr.open("GET", url);
  xhr.responseType = "arraybuffer";
  xhr.send();
}

export async function LoadAlignment(
  filename: string,
  data: Uint8Array,
  loading_modal: bootstrap.Modal
): Promise<void> {
  GLDestroy();
  ResetView();
  //Get magic bytes to decide if we need to decompress
  const sleep_time = SleepRedrawValue();
  const magic_bytes = data.slice(0, 2);
  if (magic_bytes[0] == 0x1f && magic_bytes[1] == 0x8b) {
    SetHTMLByID("MAFFTMSAViewerLoadingText", "Decompressing data...");
    await Sleep(sleep_time);
    try {
      data = pako.inflate(data);
    } catch (err) {
      loading_modal.hide();
      RecoverableError(NewError("Decompression Error", err));
    }
  }
  //Parse as FASTA
  SetHTMLByID("MAFFTMSAViewerLoadingText", "Parsing data...");
  await Sleep(sleep_time);
  const parsed_fasta = new ParsedFASTA(data);
  if (parsed_fasta.Error != null) {
    //Replace loading screen with error message
    loading_modal.hide();
    RecoverableError(parsed_fasta.Error);
    return;
  }
  //Pass the data to the graphics card
  await GLInitialize(parsed_fasta, loading_modal);
  //Unhide toolbar
  ElementByID("MAFFTMSAViewerToolbar").style.display = "block";
  await Sleep(sleep_time);
  //Unhide Share menu
  ElementByID("MAFFTMSAViewer_menu_share_button").style.display = "block";
  await Sleep(sleep_time);
  //Hook up input handlers on the canvas
  HookUpCanvasCallbacks();
  //Draw the first frame
  ResizeCanvas(new MouseEvent("empty"));
  //Make sure our wheel mode labels are coherent with current mode
  SetWheelModeLabels();
  //Clear the loading screen
  loading_modal.hide();
  return;
}

export function RecoverableError(error: Error): void {
  DoModal("error_recoverable");
  SetHTMLByID("MAFFTMSAViewerModalLabel", error.name);
  SetHTMLByID("MAFFTMSAViewerModalBody", error.message);
  return;
}

export function FatalError(error: Error): void {
  console.log("FATAL!");
  DoModal("error_fatal");
  SetHTMLByID("MAFFTMSAViewerErrorLabel", error.name);
  SetHTMLByID("MAFFTMSAViewerErrorText", error.message);
  return;
}

export function ResizeCanvas(event: MouseEvent): void {
  //TODO: why does this zoom in when there's a change in Y?
  var viewer_div = ElementByID("MAFFTMSAViewerMain");
  var control_bar_div = ElementByID("MAFFTMSAViewerControlBar");
  const state = window.MAFFTMSAViewer.State;

  state.Canvas.width = viewer_div.clientWidth;
  state.Canvas.height = viewer_div.clientHeight - control_bar_div.clientHeight;
  CalculateGeometry(false);
  if (state.Initialized) {
    //Prevent position in MSA from bouncing around during resize events by moving
    //it back where it was after the recalculation of the matrices.
    //It may be best to write this into the actual matrix calculation in the future,
    //but would be more complicated.
    const current_msa_tl = state.MSACurrentTopLeft;
    const current_label_tl = state.LabelsCurrentTopLeft;
    const previous_msa_tl = glm.vec3.clone(current_msa_tl);
    const previous_label_tl = glm.vec3.clone(current_label_tl);
    CalculateMatrices(true);
    state.MSAViewPosition[0] += previous_msa_tl[0] - current_msa_tl[0];
    state.MSAViewPosition[1] += previous_msa_tl[1] - current_msa_tl[1];
    state.MSAViewPosition[2] += previous_msa_tl[2] - current_msa_tl[2];
    state.LabelViewPosition[0] += previous_label_tl[0] - current_label_tl[0];
    state.LabelViewPosition[1] += previous_label_tl[1] - current_label_tl[1];
    state.LabelViewPosition[2] += previous_label_tl[2] - current_label_tl[2];
    CalculateMatrices(true);
    GLDraw();
  }
  return;
}

function DragMSALabelsSeparator(end_hammer_point: HammerJSEvent): void {
  const state = window.MAFFTMSAViewer.State;

  //Calculate how far the mouse moved in world space
  var start_position = glm.vec3.fromValues(
    state.HammerJSPan.X,
    state.HammerJSPan.Y,
    0
  );
  const screen_distance = end_hammer_point.X - start_position[0];

  glm.vec3.transformMat4(
    start_position,
    start_position,
    state.MSAScreenToWorldMatrix
  );
  var end_position = glm.vec3.fromValues(
    end_hammer_point.X,
    end_hammer_point.Y,
    0
  );
  glm.vec3.transformMat4(
    end_position,
    end_position,
    state.MSAScreenToWorldMatrix
  );
  glm.vec3.subtract(end_position, start_position, end_position);

  if (end_hammer_point.PanType == "msa") {
    //Panning for the MSA view, move both X and Y
    state.MSAViewPosition[0] += end_position[0];
    state.MSAViewPosition[1] += end_position[1];
  } else if (end_hammer_point.PanType == "separator") {
    //Panning to move the separator
    state.WindowGeometry.SeparatorPosition[0] += screen_distance;
    CalculateGeometry(false);
    //Shift the other views to keep them static while the separator is moved
    state.LabelViewPosition[0] -= end_position[0] / 2.0;
    state.MSAViewPosition[0] += end_position[0] / 2.0;
  } else {
    //Panning for the label view, move X of labels and Y of both
    state.LabelViewPosition[0] += end_position[0];
    state.LabelViewPosition[1] += end_position[1];
    state.MSAViewPosition[1] += end_position[1];
  }

  CalculateMatrices(true);
  GLDraw();
  state.HammerJSPan = end_hammer_point;

  return;
}

function DragHorizontalScrollbarHandle(end_hammer_point: HammerJSEvent): void {
  const state = window.MAFFTMSAViewer.State;
  const geom = state.WindowGeometry;

  var screen_distance = end_hammer_point.X - state.HammerJSPan.X;

  var cell_distance = 0;
  var world_distance = 0;

  switch (end_hammer_point.PanType) {
    case "labels_bottom_scrollbar_handle":
      world_distance =
        (screen_distance / geom.LabelsBottomScrollbarSize[0]) *
        state.MaxLabelWorldPosition[0];
      state.LabelViewPosition[0] += world_distance;
      break;
    case "msa_bottom_scrollbar_handle":
      cell_distance =
        (screen_distance / geom.MSABottomScrollbarSize[0]) *
        state.Sequences.MaxSequenceLength;
      world_distance = cell_distance / state.MSATileMap.TileWidth;
      state.MSAViewPosition[0] += world_distance;
      break;
  }

  CalculateMatrices(true);
  GLDraw();

  state.HammerJSPan = end_hammer_point;

  return;
}

function DragVerticalScrollbarHandle(end_hammer_point: HammerJSEvent): void {
  const state = window.MAFFTMSAViewer.State;
  const geom = state.WindowGeometry;

  var screen_distance = end_hammer_point.Y - state.HammerJSPan.Y;

  var cell_distance = 0;
  var world_distance = 0;

  cell_distance =
    (screen_distance / geom.MSARightScrollbarSize[1]) *
    state.Sequences.SequenceCount();
  world_distance = cell_distance / state.MSATileMap.TileHeight;
  state.MSAViewPosition[1] -= world_distance;

  CalculateMatrices(true);
  GLDraw();

  state.HammerJSPan = end_hammer_point;

  return;
}

function DragToMove(end_hammer_point: HammerJSEvent): void {
  switch (end_hammer_point.PanType) {
    case "msa":
      DragMSALabelsSeparator(end_hammer_point);
      break;
    case "separator":
      DragMSALabelsSeparator(end_hammer_point);
      break;
    case "labels":
      DragMSALabelsSeparator(end_hammer_point);
      break;
    case "labels_bottom_scrollbar_handle":
      DragHorizontalScrollbarHandle(end_hammer_point);
      break;
    case "msa_bottom_scrollbar_handle":
      DragHorizontalScrollbarHandle(end_hammer_point);
      break;
    case "msa_right_scrollbar_handle":
      DragVerticalScrollbarHandle(end_hammer_point);
      break;
    default:
      break;
  }
  return;
}

function TapHandler(point: HammerJSEvent): void {
  const state = window.MAFFTMSAViewer.State;
  const geom = state.WindowGeometry;

  var distance = 0;
  var scroll_distance = 0;
  var world_distance = 0;

  switch (point.TapType) {
    case "labels_bottom_scrollbar":
      distance = point.X - geom.LabelsBottomScrollbarHandlePosition[0];
      scroll_distance = geom.LabelsBottomScrollbarHandleSize[0] / 2;
      scroll_distance /= geom.LabelsBottomScrollbarSize[0];
      world_distance = scroll_distance * state.MaxLabelWorldPosition[0];
      if (distance > 0) {
        state.LabelViewPosition[0] += world_distance;
      } else {
        state.LabelViewPosition[0] -= world_distance;
      }
      CalculateMatrices(true);
      GLDraw();
      break;
    case "msa_bottom_scrollbar":
      distance = point.X - geom.MSABottomScrollbarHandlePosition[0];
      scroll_distance = geom.MSABottomScrollbarHandleSize[0] / 2;
      scroll_distance /= geom.MSABottomScrollbarSize[0];
      world_distance = scroll_distance * state.MaxMSAWorldPosition[0];
      if (distance > 0) {
        state.MSAViewPosition[0] += world_distance;
      } else {
        state.MSAViewPosition[0] -= world_distance;
      }
      CalculateMatrices(true);
      GLDraw();
      break;
    case "msa_right_scrollbar":
      distance = point.Y - geom.MSARightScrollbarHandlePosition[1];
      scroll_distance = geom.MSARightScrollbarHandleSize[1] / 2;
      scroll_distance /= geom.MSARightScrollbarSize[1];
      world_distance = scroll_distance * state.MaxMSAWorldPosition[1];
      if (distance > 0) {
        state.MSAViewPosition[1] -= world_distance;
      } else {
        state.MSAViewPosition[1] += world_distance;
      }
      CalculateMatrices(true);
      GLDraw();
      break;
    default:
      break;
  }
}

function ZoomViewer(scale: number): void {
  const state = window.MAFFTMSAViewer.State;

  //Save world top left coordinate before zoom
  var start_tl_msa = glm.vec3.create();
  glm.vec3.transformMat4(
    start_tl_msa,
    start_tl_msa,
    state.MSAScreenToWorldMatrix
  );
  var start_tl_label = glm.vec3.create();
  glm.vec3.transformMat4(
    start_tl_label,
    start_tl_label,
    state.LabelScreenToWorldMatrix
  );

  //Do zoom
  var starting_pos = glm.vec3.clone(state.MSAViewPosition);
  var reverse_scale = 1.0 / scale;
  var scaled_viewpos = state.ZoomViewPosStart * reverse_scale;
  state.MSAViewPosition[2] = scaled_viewpos;
  state.MSAViewPosition[2] = Clamp(scaled_viewpos, 0.005, 3.0);
  CalculateMatrices(false);

  //Calculate how far we need to move the view so that the top left stays consistent
  //and then apply it to the position
  var end_tl = glm.vec3.create();
  glm.vec3.transformMat4(end_tl, end_tl, state.MSAScreenToWorldMatrix);
  state.MSAViewPosition[0] -= end_tl[0] - start_tl_msa[0];
  state.MSAViewPosition[1] -= end_tl[1] - start_tl_msa[1];
  CalculateMatrices(false);

  //Adjust label position accordingly and also clamp
  glm.vec3.set(end_tl, 0, 0, 0);
  glm.vec3.transformMat4(end_tl, end_tl, state.LabelScreenToWorldMatrix);
  state.LabelViewPosition[0] -= end_tl[0] - start_tl_label[0];
  CalculateMatrices(true);

  //Finalize by drawing
  GLDraw();
  return;
}

export function RectCheck(
  x: number,
  y: number,
  pos: glm.vec2,
  size: glm.vec2
): boolean {
  const left = pos[0];
  const right = left + size[0];
  const bottom = pos[1];
  const top = bottom + size[1];
  if (x >= left && x <= right) {
    if (y >= bottom && y <= top) {
      return true;
    }
  }

  return false;
}

function SetWheelModeLabel(id: string, label: string, state: boolean) {
  var state_glyph = "☐ ";
  if (state == true) {
    state_glyph = "☑ ";
    ElementByID("MAFFTMSAViewer_toolbar_wheelmode_button").innerText =
      "Wheel Mode: " + label;
  }
  ElementByID(id).innerText = `${state_glyph}${label}`;
}

function SetWheelModeLabels(): void {
  SetWheelModeLabel("MAFFTMSAViewer_toolbar_wheelmode_zoom", "Zoom", false);
  SetWheelModeLabel(
    "MAFFTMSAViewer_toolbar_wheelmode_omni",
    "Omnidirectional",
    false
  );
  SetWheelModeLabel(
    "MAFFTMSAViewer_toolbar_wheelmode_horizontal",
    "Horizontal",
    false
  );
  SetWheelModeLabel(
    "MAFFTMSAViewer_toolbar_wheelmode_vertical",
    "Vertical",
    false
  );

  switch (window.MAFFTMSAViewer.State.MouseWheelMode) {
    case "zoom":
      SetWheelModeLabel("MAFFTMSAViewer_toolbar_wheelmode_zoom", "Zoom", true);
      break;
    case "omni":
      SetWheelModeLabel(
        "MAFFTMSAViewer_toolbar_wheelmode_omni",
        "Omnidirectional",
        true
      );
      break;
    case "horizontal":
      SetWheelModeLabel(
        "MAFFTMSAViewer_toolbar_wheelmode_horizontal",
        "Horizontal",
        true
      );
      break;
    case "vertical":
      SetWheelModeLabel(
        "MAFFTMSAViewer_toolbar_wheelmode_vertical",
        "Vertical",
        true
      );
      break;
  }

  return;
}

export function SetWheelMode(event: MouseEvent): void {
  const state = window.MAFFTMSAViewer.State;
  const target = event.target as HTMLAnchorElement;

  switch (target.id) {
    case "MAFFTMSAViewer_toolbar_wheelmode_zoom":
      state.MouseWheelMode = "zoom";
      break;
    case "MAFFTMSAViewer_toolbar_wheelmode_omni":
      state.MouseWheelMode = "omni";
      break;
    case "MAFFTMSAViewer_toolbar_wheelmode_horizontal":
      state.MouseWheelMode = "horizontal";
      break;
    case "MAFFTMSAViewer_toolbar_wheelmode_vertical":
      state.MouseWheelMode = "vertical";
      break;
  }

  SetWheelModeLabels();
  return;
}

export function SetColorScheme(name: string): void {
  const state = window.MAFFTMSAViewer.State;
  const assets = window.MAFFTMSAViewer.Assets;
  assets.MSAColors = ColorCollection[name];
  assets.ColorTexture = BuildColorTexture(assets.MSAColors);
  //Redraw screen to apply changes
  if (state.Initialized) {
    LoadColorTexture();
    GLDraw();
  }
  return;
}

export function FormatUIPercent(
  normalized_value: number,
  decimal_places: number
): number {
  const percent_value = normalized_value * 100;
  const shift_amount = 10 ** decimal_places;
  const shifted_percent_value = Math.round(percent_value * shift_amount);
  return shifted_percent_value / shift_amount;
}

export function UpdatePopperJSTooltip(
  offset_y: number,
  client_x: number,
  client_y: number
): void {
  const state = window.MAFFTMSAViewer.State;
  const tooltip = ElementByID("MAFFTMSAViewerPopperTooltip");
  const popperjs = state.TooltipPopperJSInstance;

  //Bail if actually we shouldn't be showing a tooltip
  if (state.TooltipPopperEnabled == false) {
    tooltip.innerHTML = "";
    tooltip.removeAttribute("data-show");

    popperjs.setOptions((options) => ({
      ...options,
      modifiers: [
        ...options.modifiers,
        { name: "eventListeners", enabled: false },
      ],
    }));

    if (state.TooltipPopperTimeoutID != null) {
      window.clearTimeout(state.TooltipPopperTimeoutID);
      state.TooltipPopperTimeoutID = null;
    }

    return null;
  }

  //Decide label based on cursor position
  const screen_pos = glm.vec3.fromValues(
    client_x - state.WindowGeometry.MSAPosition[0],
    offset_y,
    0.0
  );
  glm.vec3.transformMat4(screen_pos, screen_pos, state.MSAScreenToWorldMatrix);

  const label_i = Math.floor(screen_pos[1] * state.MSATileMap.TileHeight * -1);
  var label = state.Sequences.GetStringLabel(label_i);
  if (label.length > 80) {
    label = label.slice(0, 80);
    label += "...";
  }

  //Decide consensus score based on cursor position
  const consensus_i = Math.floor(screen_pos[0] * state.MSATileMap.TileWidth);
  if (consensus_i > 0) {
    var consensus = state.Sequences.ConsensusScores[consensus_i];
    consensus = FormatUIPercent(consensus, 2);
    label += ` (${consensus}% Consensus)`;
  }

  //Show the hover label
  tooltip.innerHTML = label;
  const virtual_elem = state.TooltipPopperVirtualElement;

  tooltip.setAttribute("data-show", "");
  popperjs.setOptions((options) => ({
    ...options,
    modifiers: [
      ...options.modifiers,
      { name: "eventListeners", enabled: true },
    ],
  }));

  virtual_elem.getBoundingClientRect = function () {
    return new DOMRect(client_x, client_y, 0, 0);
  };
  popperjs.update();

  return;
}

export function HookUpCanvasCallbacks(): void {
  const state = window.MAFFTMSAViewer.State;
  const geom = state.WindowGeometry;

  //Create a HammerJS instance with no recognizers
  var hammer_options: HammerOptions = Hammer.defaults;
  hammer_options.preset = [];
  const hammer_manager = new Hammer(state.Canvas, hammer_options);

  //Add a press recognizer for tooltips
  const press_recognizer = new Hammer.Press({ time: 500 });
  hammer_manager.add(press_recognizer);
  hammer_manager.on("press", function (event: HammerInput) {
    const y = event.center.y - state.Canvas.offsetTop;
    state.TooltipPopperEnabled = true;
    UpdatePopperJSTooltip(y, event.center.x, event.center.y);
  });
  hammer_manager.on("pressup", function (event: HammerInput) {
    const y = event.center.y - state.Canvas.offsetTop;
    state.TooltipPopperEnabled = false;
    UpdatePopperJSTooltip(y, event.center.x, event.center.y);
  });

  //Add a pan recognizer
  const pan_recognizer = new Hammer.Pan({ threshold: 2 });
  hammer_manager.add(pan_recognizer);
  hammer_manager.on("panstart", function (event: HammerInput) {
    //Disable tooltip if we begin to pan
    const y = state.Canvas.height - (event.center.y - state.Canvas.offsetTop);
    state.TooltipPopperEnabled = false;
    UpdatePopperJSTooltip(y, event.center.x, event.center.y);

    //Decide what we're moving
    var pan_type = "";

    //We have to recompute the y here because WebGL starts the y axis from the bottom
    //whereas HTML5 starts it from the top
    const x = event.center.x - state.Canvas.offsetLeft;
    if (RectCheck(x, y, geom.LabelsPosition, geom.LabelsSize)) {
      pan_type = "labels";
    } else if (RectCheck(x, y, geom.SeparatorPosition, geom.SeparatorSize)) {
      pan_type = "separator";
    } else if (RectCheck(x, y, geom.MSAPosition, geom.MSASize)) {
      pan_type = "msa";
    } else if (
      RectCheck(
        x,
        y,
        geom.LabelsBottomScrollbarHandlePosition,
        geom.LabelsBottomScrollbarHandleSize
      )
    ) {
      pan_type = "labels_bottom_scrollbar_handle";
    } else if (
      RectCheck(
        x,
        y,
        geom.MSABottomScrollbarHandlePosition,
        geom.MSABottomScrollbarHandleSize
      )
    ) {
      pan_type = "msa_bottom_scrollbar_handle";
    } else if (
      RectCheck(
        x,
        y,
        geom.MSARightScrollbarHandlePosition,
        geom.MSARightScrollbarHandleSize
      )
    ) {
      pan_type = "msa_right_scrollbar_handle";
    }

    //Note our starting position
    state.HammerJSPan = {
      X: event.center.x,
      Y: event.center.y,
      PanType: pan_type,
      TapType: "",
    };
    return;
  });
  hammer_manager.on("panmove", function (event: HammerInput) {
    var hammer_js_pan: HammerJSEvent = {
      X: event.center.x,
      Y: event.center.y,
      PanType: state.HammerJSPan.PanType,
      TapType: "",
    };
    DragToMove(hammer_js_pan);
    return;
  });
  hammer_manager.on("panstop", function (event: HammerInput) {
    var hammer_js_pan: HammerJSEvent = {
      X: event.center.x,
      Y: event.center.y,
      PanType: state.HammerJSPan.PanType,
      TapType: "",
    };
    DragToMove(hammer_js_pan);
    state.HammerJSPan = null;
  });

  //Add a pinch recognizer
  const pinch_recognizer = new Hammer.Pinch();
  hammer_manager.add(pinch_recognizer);
  hammer_manager.on("pinchstart", function (event: HammerInput) {
    state.ZoomViewPosStart = state.MSAViewPosition[2];
  });
  hammer_manager.on("pinchmove", function (event: HammerInput) {
    ZoomViewer(event.scale);
  });
  hammer_manager.on("pinchend", function (event: HammerInput) {
    ZoomViewer(event.scale);
    state.ZoomViewPosStart = null;
  });

  const tap_recognizer = new Hammer.Tap();
  hammer_manager.add(tap_recognizer);
  hammer_manager.on("tap", function (event: HammerInput) {
    var tap_type = "";

    //We have to recompute the y here because WebGL starts the y axis from the bottom
    //whereas HTML5 starts it from the top
    const x = event.center.x - state.Canvas.offsetLeft;
    const y = state.Canvas.height - (event.center.y - state.Canvas.offsetTop);
    if (
      RectCheck(
        x,
        y,
        geom.LabelsBottomScrollbarHandlePosition,
        geom.LabelsBottomScrollbarHandleSize
      )
    ) {
      //Do nothing because the user will likely move the handle
    } else if (
      RectCheck(
        x,
        y,
        geom.MSABottomScrollbarHandlePosition,
        geom.MSABottomScrollbarHandleSize
      )
    ) {
      //Do nothing because the user will likely move the handle
    } else if (
      RectCheck(
        x,
        y,
        geom.MSARightScrollbarHandlePosition,
        geom.MSARightScrollbarHandleSize
      )
    ) {
      //Do nothing because the user will likely move the handle
    } else if (
      RectCheck(
        x,
        y,
        geom.LabelsBottomScrollbarPosition,
        geom.LabelsBottomScrollbarSize
      )
    ) {
      tap_type = "labels_bottom_scrollbar";
    } else if (
      RectCheck(
        x,
        y,
        geom.MSABottomScrollbarPosition,
        geom.MSABottomScrollbarSize
      )
    ) {
      tap_type = "msa_bottom_scrollbar";
    } else if (
      RectCheck(
        x,
        y,
        geom.MSARightScrollbarPosition,
        geom.MSARightScrollbarSize
      )
    ) {
      tap_type = "msa_right_scrollbar";
    }

    const tap_event: HammerJSEvent = {
      X: x,
      Y: y,
      PanType: "",
      TapType: tap_type,
    };
    TapHandler(tap_event);
  });

  //Hook up the zoom method for mousehweel
  state.Canvas.onwheel = function (event: WheelEvent) {
    var scroll_distance = 0;
    var world_distance = 0;
    switch (window.MAFFTMSAViewer.State.MouseWheelMode) {
      case "zoom":
        state.ZoomViewPosStart = state.MSAViewPosition[2];
        var diff = 0.1;
        if (event.deltaY > 0) {
          diff *= -1;
        }
        ZoomViewer(1 + diff);
        state.ZoomViewPosStart = null;
        break;
      case "omni":
        if (event.deltaX != 0) {
          scroll_distance = geom.LabelsBottomScrollbarHandleSize[0] / 4;
          scroll_distance /= geom.LabelsBottomScrollbarSize[0];
          world_distance = scroll_distance * state.MaxLabelWorldPosition[0];
          if (event.deltaX > 0) {
            world_distance *= -1;
          }
          state.MSAViewPosition[0] -= world_distance;
        }
        if (event.deltaY != 0) {
          scroll_distance = geom.MSARightScrollbarHandleSize[1] / 4;
          scroll_distance /= geom.MSARightScrollbarSize[1];
          world_distance = scroll_distance * state.MaxMSAWorldPosition[1];
          if (event.deltaY > 0) {
            world_distance *= -1;
          }
          state.MSAViewPosition[1] -= world_distance;
        }
        break;
      case "vertical":
        scroll_distance = geom.MSARightScrollbarHandleSize[1] / 4;
        scroll_distance /= geom.MSARightScrollbarSize[1];
        world_distance = scroll_distance * state.MaxMSAWorldPosition[1];
        if (event.deltaY > 0) {
          world_distance *= -1;
        }
        state.MSAViewPosition[1] -= world_distance;
        break;
      case "horizontal":
        scroll_distance = geom.LabelsBottomScrollbarHandleSize[0] / 4;
        scroll_distance /= geom.LabelsBottomScrollbarSize[0];
        world_distance = scroll_distance * state.MaxLabelWorldPosition[0];
        if (event.deltaY > 0) {
          world_distance *= -1;
        }
        state.MSAViewPosition[0] -= world_distance;
        break;
    }
    CalculateMatrices(true);
    GLDraw();
  };

  //Hook up mouseover for canvas
  state.Canvas.onmouseleave = function (event: MouseEvent) {
    state.TooltipPopperEnabled = false;
    UpdatePopperJSTooltip(event.offsetY, event.clientX, event.clientY);
  };

  state.Canvas.onmousemove = function (event: MouseEvent) {
    //First check whether or not we are over the separator
    if (
      RectCheck(
        event.offsetX,
        event.offsetY,
        geom.SeparatorPosition,
        geom.SeparatorSize
      )
    ) {
      //Set cursor to resize cursor and enable tooltip
      window.document.body.style.cursor = "ew-resize";
      state.TooltipPopperEnabled = false;
      UpdatePopperJSTooltip(event.offsetY, event.clientX, event.clientY);
    } else {
      //Set cursor back to normal
      window.document.body.style.cursor = "";

      //Invalidate any existing tooltip
      state.TooltipPopperEnabled = false;
      UpdatePopperJSTooltip(event.offsetY, event.clientX, event.clientY);

      //Event may have been culled by the time the function below runs so we
      //save the values. This fixes an issue in Firefox.
      const offset_y = event.offsetY;
      const client_x = event.clientX;
      const client_y = event.clientY;

      //Update PopperJS Tooltip
      state.TooltipPopperEnabled = true;
      state.TooltipPopperTimeoutID = window.setTimeout(function () {
        UpdatePopperJSTooltip(offset_y, client_x, client_y);
      }, 500);
    }
    state.Canvas.onmouseenter = state.Canvas.onmousemove;
  };

  return;
}

export function DoModal(template_name: string): bootstrap.Modal {
  const modal_wrapper_div_id = "MAFFTMSAViewerModalWindow";
  const modal_div_id = "MAFFTMSAViewerModal";
  //Run template and replace contents of modal div with template results
  const modal_html =
    window.MAFFTMSAViewer.State.HTMLTemplates.Run(template_name);
  SetHTMLByID(modal_wrapper_div_id, modal_html);
  const modal_object = new bootstrap.Modal(ElementByID(modal_div_id));
  //Clear the modal div after the modal is hidden to prevent memory leaks
  ElementByID(modal_div_id).addEventListener(
    "hidden.bs.modal",
    function (event) {
      SetHTMLByID(modal_wrapper_div_id, "");
      modal_object.dispose();
    }
  );
  //Show the modal
  modal_object.show();
  return modal_object;
}

export function GetTemplateNameFromID(event: MouseEvent): string {
  const target = event.target as HTMLButtonElement;
  const template_name = target.id.replace("MAFFTMSAViewer_", "");
  return template_name;
}

export function SimpleModal(event: MouseEvent): bootstrap.Modal {
  return DoModal(GetTemplateNameFromID(event));
}

export function PositionBoxButton(event: MouseEvent): void {
  const state = window.MAFFTMSAViewer.State;

  const position_box = ElementByID(
    "MAFFTMSAViewer_toolbar_position_input"
  ) as HTMLInputElement;

  const full_value = position_box.value;
  const split_value = full_value.split(",");

  if (split_value.length < 3) {
    RecoverableError(
      NewError(
        "Input Error",
        "Position box input must be integer X, Y, and Z coordinates separated by commas."
      )
    );
    CalculateMatrices(true);
    return;
  }

  const x_value = parseInt(split_value[0].trim());
  if (isNaN(x_value)) {
    RecoverableError(
      NewError("Input Error", "X position is not a valid integer")
    );
    return;
  }

  const y_value = parseInt(split_value[1].trim());
  if (isNaN(y_value)) {
    RecoverableError(
      NewError("Input Error", "Y position is not a valid integer")
    );
    return;
  }

  const z_value = parseInt(split_value[2].trim());
  if (isNaN(y_value)) {
    RecoverableError(
      NewError("Input Error", "Z position is not a valid integer")
    );
    return;
  }

  //Do zoom first
  const z = z_value / (2 * state.MSATileMap.TileHeight);
  state.MSAViewPosition[2] = z;
  CalculateMatrices(true);

  //Do x/y movement next
  const x_diff =
    x_value / state.MSATileMap.TileWidth - state.MSACurrentTopLeft[0];
  const y_diff =
    y_value / state.MSATileMap.TileHeight + state.MSACurrentTopLeft[1];
  state.MSAViewPosition[0] += x_diff;
  state.MSAViewPosition[1] -= y_diff;

  CalculateMatrices(true);
  GLDraw();

  return;
}

export function CalculateLabelMatrices(): void {
  const state = window.MAFFTMSAViewer.State;

  //Make sure we are always taking zoom/Y coord from the MSA view
  glm.vec3.set(
    state.LabelViewPosition,
    state.LabelViewPosition[0],
    state.MSAViewPosition[1],
    state.MSAViewPosition[2]
  );
  var lab_view_pos = state.LabelViewPosition;

  //Calculate camera view matrix
  glm.mat4.lookAt(
    state.LabelViewMatrix,
    lab_view_pos, //eye position
    glm.vec3.fromValues(lab_view_pos[0], lab_view_pos[1], 0.0), //
    glm.vec3.fromValues(0, 1, 0) //up vector
  );
  //Calculate projection matrix
  glm.mat4.perspective(
    state.LabelProjectionMatrix,
    Math.PI * 0.5,
    state.WindowGeometry.LabelsSize[0] / state.WindowGeometry.LabelsSize[1],
    0.0001,
    100000
  );

  //Create matrix for going from screen to clip space
  //Precompute model * view matrix
  var lab_mv_mat = glm.mat4.create();
  glm.mat4.multiply(
    lab_mv_mat,
    state.LabelProjectionMatrix,
    state.LabelViewMatrix
  );
  //Project a point so we know how far away the MSA plane is on the Z axis
  //Fill in the X/Y values we need for shifting clip space to 0-2
  var lab_trans_coord = glm.vec3.fromValues(0.0, 0.0, 0.0);
  glm.vec3.transformMat4(lab_trans_coord, lab_trans_coord, lab_mv_mat);
  glm.vec3.set(lab_trans_coord, 1.0, -1.0, -1.0 * lab_trans_coord[2]);
  //Prepare coord to use for scaling from shifted clip space to pixel space
  //We divide by 2 here because the range on clip space is 0-2
  //We divide by -2 for Y because pixel space goes from top->bottom
  var lab_scale_coord = glm.vec3.fromValues(
    state.WindowGeometry.LabelsSize[0] / 2.0,
    state.WindowGeometry.LabelsSize[1] / -2.0,
    1.0
  );
  //Build final matrices
  var lab_wts_mat = state.LabelWorldToScreenMatrix;
  glm.mat4.identity(lab_wts_mat);
  glm.mat4.scale(lab_wts_mat, lab_wts_mat, lab_scale_coord); //rescale to pixel space
  glm.mat4.translate(lab_wts_mat, lab_wts_mat, lab_trans_coord); //handle Z and shift x/y
  glm.mat4.multiply(lab_wts_mat, lab_wts_mat, lab_mv_mat); //world to clip space
  //Build inverse matrix for going the other way
  glm.mat4.invert(
    state.LabelScreenToWorldMatrix,
    state.LabelWorldToScreenMatrix
  );

  return;
}

export function CalculateMSAMatrices(): void {
  const state = window.MAFFTMSAViewer.State;
  var msa_view_pos = state.MSAViewPosition;

  //Calculate camera view matrix
  glm.mat4.lookAt(
    state.MSAViewMatrix,
    msa_view_pos, //eye position
    glm.vec3.fromValues(msa_view_pos[0], msa_view_pos[1], 0.0), //
    glm.vec3.fromValues(0, 1, 0) //up vector
  );
  //Calculate projection matrix
  const msa_width = state.Canvas.width - state.WindowGeometry.MSAPosition[0];
  glm.mat4.perspective(
    state.MSAProjectionMatrix,
    Math.PI * 0.5,
    state.WindowGeometry.MSASize[0] / state.WindowGeometry.MSASize[1],
    0.0001,
    100000
  );

  //Create matrix for going from screen to clip space
  //Precompute model * view matrix
  var msa_mv_mat = glm.mat4.create();
  glm.mat4.multiply(msa_mv_mat, state.MSAProjectionMatrix, state.MSAViewMatrix);
  //Project a point so we know how far away the MSA plane is on the Z axis
  //Fill in the X/Y values we need for shifting clip space to 0-2
  var msa_trans_coord = glm.vec3.fromValues(0.0, 0.0, 0.0);
  glm.vec3.transformMat4(msa_trans_coord, msa_trans_coord, msa_mv_mat);
  glm.vec3.set(msa_trans_coord, 1.0, -1.0, -1.0 * msa_trans_coord[2]);
  //Prepare coord to use for scaling from shifted clip space to pixel space
  //We divide by 2 here because the range on clip space is 0-2
  //We divide by -2 for Y because pixel space goes from top->bottom
  var msa_scale_coord = glm.vec3.fromValues(
    state.WindowGeometry.MSASize[0] / 2.0,
    state.WindowGeometry.MSASize[1] / -2.0,
    1.0
  );
  //Build final matrices
  var msa_wts_mat = state.MSAWorldToScreenMatrix;
  glm.mat4.identity(msa_wts_mat);
  glm.mat4.scale(msa_wts_mat, msa_wts_mat, msa_scale_coord); //rescale to pixel space
  glm.mat4.translate(msa_wts_mat, msa_wts_mat, msa_trans_coord); //handle Z and shift x/y
  glm.mat4.multiply(msa_wts_mat, msa_wts_mat, msa_mv_mat); //world to clip space
  //Build inverse matrix for going the other way
  glm.mat4.invert(state.MSAScreenToWorldMatrix, state.MSAWorldToScreenMatrix);

  return;
}

export function CalculateMatrices(clamp: boolean): void {
  const state = window.MAFFTMSAViewer.State;
  const geom = state.WindowGeometry;

  //Calculate matrices
  CalculateMSAMatrices();
  CalculateLabelMatrices();

  //Bail early if we don't need to do clamping
  if (!clamp) {
    return;
  }

  //Clamp camera position values for MSA view
  var needs_recalculation = false;
  var tl = glm.vec3.create();
  var br = glm.vec3.fromValues(geom.MSASize[0], geom.MSASize[1], 0.0);
  glm.vec3.transformMat4(tl, tl, state.MSAScreenToWorldMatrix);
  glm.vec3.transformMat4(br, br, state.MSAScreenToWorldMatrix);

  //X coords
  var furthest = state.MaxMSAWorldPosition[0] - (br[0] - tl[0]);
  furthest = Clamp(furthest, 0, state.MaxMSAWorldPosition[0]);
  if (tl[0] < 0) {
    //Prevent left edge from passing too far forward
    state.MSAViewPosition[0] -= tl[0];
    needs_recalculation = true;
  } else if (tl[0] > furthest) {
    //Prevent right edge from coming too far in
    state.MSAViewPosition[0] -= tl[0] - furthest;
    needs_recalculation = true;
  }
  //Y coords
  furthest = state.MaxMSAWorldPosition[1] - (br[1] - tl[1]);
  furthest = Clamp(furthest, state.MaxMSAWorldPosition[1], 0);
  if (tl[1] > 0) {
    //Prevent top from coming down too far
    state.MSAViewPosition[1] -= tl[1];
    needs_recalculation = true;
  } else if (tl[1] < furthest) {
    //Prevent bottom from coming up too far
    state.MSAViewPosition[1] -= tl[1] - furthest;
    needs_recalculation = true;
  }

  if (needs_recalculation) {
    CalculateMSAMatrices();
    CalculateLabelMatrices();
  }

  //Clamp camera position values for the labels X (y coord is shared with MSA)
  needs_recalculation = false;
  glm.vec3.set(tl, 0.0, 0.0, 0.0);
  glm.vec3.set(br, geom.LabelsSize[0], geom.LabelsSize[1], 0.0);
  glm.vec3.transformMat4(tl, tl, state.LabelScreenToWorldMatrix);
  glm.vec3.transformMat4(br, br, state.LabelScreenToWorldMatrix);
  furthest = state.MaxLabelWorldPosition[0] - (br[0] - tl[0]);
  furthest = Clamp(furthest, 0, state.MaxLabelWorldPosition[0]);
  if (tl[0] < 0) {
    //Prevent left edge from passing too far forward
    state.LabelViewPosition[0] -= tl[0];
    needs_recalculation = true;
  } else if (tl[0] > furthest) {
    //Prevent right edge from coming too far in
    state.LabelViewPosition[0] -= tl[0] - furthest;
    needs_recalculation = true;
  }

  if (needs_recalculation) {
    CalculateMSAMatrices();
    CalculateLabelMatrices();
  }

  //Calculate top/left and bottom/right positions in world space for future use
  //Labels
  glm.vec3.set(tl, 0, 0, 0);
  glm.vec3.transformMat4(
    state.LabelsCurrentTopLeft,
    tl,
    state.LabelScreenToWorldMatrix
  );
  glm.vec3.set(br, geom.LabelsSize[0], geom.LabelsSize[1], 0);
  glm.vec3.transformMat4(
    state.LabelsCurrentBottomRight,
    br,
    state.LabelScreenToWorldMatrix
  );

  //MSA
  glm.vec3.set(tl, 0, 0, 0);
  glm.vec3.transformMat4(
    state.MSACurrentTopLeft,
    tl,
    state.MSAScreenToWorldMatrix
  );
  glm.vec3.set(br, geom.MSASize[0], geom.MSASize[1], 0);
  glm.vec3.transformMat4(
    state.MSACurrentBottomRight,
    br,
    state.MSAScreenToWorldMatrix
  );

  //Set position box contents
  var x_string = Math.round(
    state.MSACurrentTopLeft[0] * state.MSATileMap.TileWidth
  );
  if (x_string < 0) {
    x_string = 0;
  }
  var y_string = Math.round(
    -1.0 * state.MSACurrentTopLeft[1] * state.MSATileMap.TileHeight
  );
  if (y_string < 0) {
    y_string = 0;
  }
  //Calc below allows Z to roughly match number of residues vertically in window
  const z_string = Math.floor(
    state.MSAViewPosition[2] * state.MSATileMap.TileHeight * 2
  );
  const position_box = ElementByID(
    "MAFFTMSAViewer_toolbar_position_input"
  ) as HTMLInputElement;
  position_box.value = `${x_string},${y_string},${z_string}`;

  //We can't automatically add this to the URL params because it changes too many
  //times per second, and gets throttled by Chrome resulting in weird behavior.

  return;
}

export function CalculateGeometry(initial: boolean): void {
  const canvas = window.MAFFTMSAViewer.State.Canvas;
  const geom = window.MAFFTMSAViewer.State.WindowGeometry;

  //Calculate separator width
  const min_separator_width = 16;
  var separator_width = Math.ceil(
    canvas.width * (min_separator_width / 1920.0)
  );
  separator_width = Math.max(separator_width, min_separator_width);

  //Calculate scrollbar width
  const min_scrollbar_width = 16;
  var scrollbar_width = Math.ceil(
    canvas.width * (min_scrollbar_width / 1920.0)
  );
  scrollbar_width = Math.max(scrollbar_width, min_scrollbar_width);

  //Calculate separator x values
  var separator_start = geom.SeparatorPosition[0];
  var separator_end = separator_start + separator_width;
  if (initial) {
    separator_end = Math.round(canvas.width / 6);
    separator_start = separator_end - separator_width;
  }

  //NOTE: These values get passed to the WebGL renderer
  //WebGL viewport defines the origin as bottom left (0, 0)!
  const msa_and_label_height = canvas.height - scrollbar_width;

  //Set label geometry
  glm.vec2.set(geom.LabelsPosition, 0, scrollbar_width);
  glm.vec2.set(geom.LabelsSize, separator_start, msa_and_label_height);

  //Set separator geometry
  glm.vec2.set(geom.SeparatorPosition, separator_start, 0);
  glm.vec2.set(
    geom.SeparatorSize,
    separator_end - separator_start,
    canvas.height
  );

  //Set MSA right scrollbar geometry
  glm.vec2.set(
    geom.MSARightScrollbarPosition,
    canvas.width - scrollbar_width,
    0
  );
  glm.vec2.set(geom.MSARightScrollbarSize, scrollbar_width, canvas.height);

  //Set MSA geometry
  glm.vec2.set(geom.MSAPosition, separator_end, scrollbar_width);
  glm.vec2.set(
    geom.MSASize,
    geom.MSARightScrollbarPosition[0] - separator_end,
    msa_and_label_height
  );

  //Set MSA bottom scrollbar geometry
  glm.vec2.set(geom.MSABottomScrollbarPosition, geom.MSAPosition[0], 0);
  glm.vec2.set(geom.MSABottomScrollbarSize, geom.MSASize[0], scrollbar_width);

  //Set label bottom scrollbar geometry
  glm.vec2.set(geom.LabelsBottomScrollbarPosition, geom.LabelsPosition[0], 0);
  glm.vec2.set(
    geom.LabelsBottomScrollbarSize,
    geom.LabelsSize[0],
    scrollbar_width
  );
}

export function ResetView() {
  const state = window.MAFFTMSAViewer.State;

  //Reset everything that tracks camera position
  glm.mat4.identity(state.QuadModelMatrix);
  glm.vec3.set(state.QuadPosition, 0, 0, 0);

  glm.vec3.set(state.LabelViewPosition, 0, 0, 1);
  glm.mat4.identity(state.LabelProjectionMatrix);
  glm.mat4.identity(state.LabelScreenToWorldMatrix);
  glm.mat4.identity(state.LabelViewMatrix);
  glm.mat4.identity(state.LabelWorldToScreenMatrix);

  glm.vec3.set(state.MSAViewPosition, 0, 0, 1);
  glm.mat4.identity(state.MSAProjectionMatrix);
  glm.mat4.identity(state.MSAScreenToWorldMatrix);
  glm.mat4.identity(state.MSAViewMatrix);
  glm.mat4.identity(state.MSAWorldToScreenMatrix);

  //Move view so that MSA starts in top left corner
  var tl = glm.vec3.create();
  glm.vec3.transformMat4(tl, tl, state.MSAScreenToWorldMatrix);
  glm.vec3.scale(tl, tl, -1.0);
  state.MSAViewPosition[0] = tl[0];
  state.MSAViewPosition[1] = tl[1];
  state.LabelViewPosition[1] = state.MSAViewPosition[1];
  CalculateMatrices(false);

  //Figure out how far we need to zoom in to get tiles of a certain size
  var max_x_coord = glm.vec3.fromValues(state.Canvas.width, 0, 0);
  glm.vec3.transformMat4(
    max_x_coord,
    max_x_coord,
    state.MSAScreenToWorldMatrix
  );
  var x_tiles = Math.round(state.Canvas.width / state.InitialTileSize);
  var ratio = x_tiles / state.GPUTextureSize / max_x_coord[0];

  //Do the zoom (which moves the view)
  glm.vec3.set(state.MSAViewPosition, 0, 0, ratio);
  glm.vec3.set(state.LabelViewPosition, 0, 0, ratio);
  CalculateMatrices(false);

  //Move MSA back to top left corner
  glm.vec3.set(tl, 0, 0, 0);
  glm.vec3.transformMat4(tl, tl, state.MSAScreenToWorldMatrix);
  glm.vec3.scale(tl, tl, -1.0);
  state.MSAViewPosition[0] = tl[0];
  state.MSAViewPosition[1] = tl[1];
  CalculateMatrices(false);

  //Move label view over flush with left side
  glm.vec3.set(tl, 0, 0, 0);
  glm.vec3.transformMat4(tl, tl, state.LabelScreenToWorldMatrix);
  glm.vec3.scale(tl, tl, -1.0);
  state.LabelViewPosition[0] = tl[0];
  CalculateMatrices(false);

  return;
}
