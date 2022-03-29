import * as glm from "gl-matrix";
import { BuildColorTexture, ColorCollection, HexColorToFloats } from "./colors";
import { ParsedFASTA } from "./fasta";
import { TileMap } from "./tilemap";
import {
  CustomWindow,
  GPUTextureDict,
  Model,
  Shader,
  ShaderUniformDict,
} from "./types";
import { FatalError } from "./ui";
import { NewError, SetHTMLByID, Sleep, SleepRedrawValue } from "./utils";

declare var window: CustomWindow;

export function GLDraw(): void {
  const start_time = performance.now();

  const state = window.MAFFTMSAViewer.State;
  const assets = window.MAFFTMSAViewer.Assets;
  const gl = state.GLContext;
  const geom = state.WindowGeometry;

  //Clear the screen to background color
  const bg_color = HexColorToFloats(state.BackgroundColor);
  gl.clearColor(bg_color.R, bg_color.G, bg_color.B, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw separator
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(
    geom.SeparatorPosition[0],
    geom.SeparatorPosition[1],
    geom.SeparatorSize[0],
    geom.SeparatorSize[1]
  );
  const separator_color = HexColorToFloats(state.SeparatorColor);
  gl.clearColor(separator_color.R, separator_color.G, separator_color.B, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw Labels bottom scrollbar background
  gl.scissor(
    geom.LabelsBottomScrollbarPosition[0],
    geom.LabelsBottomScrollbarPosition[1],
    geom.LabelsBottomScrollbarSize[0],
    geom.LabelsBottomScrollbarSize[1]
  );
  const scrollbar_bg_color = HexColorToFloats(state.ScrollbarBGColor);
  gl.clearColor(
    scrollbar_bg_color.R,
    scrollbar_bg_color.G,
    scrollbar_bg_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw MSA bottom scrollbar background
  gl.scissor(
    geom.MSABottomScrollbarPosition[0],
    geom.MSABottomScrollbarPosition[1],
    geom.MSABottomScrollbarSize[0],
    geom.MSABottomScrollbarSize[1]
  );
  gl.clearColor(
    scrollbar_bg_color.R,
    scrollbar_bg_color.G,
    scrollbar_bg_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw MSA right scrollbar background
  gl.scissor(
    geom.MSARightScrollbarPosition[0],
    geom.MSARightScrollbarPosition[1],
    geom.MSARightScrollbarSize[0],
    geom.MSARightScrollbarSize[1]
  );
  gl.clearColor(
    scrollbar_bg_color.R,
    scrollbar_bg_color.G,
    scrollbar_bg_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw labels bottom scrollbar handle
  var tl = state.LabelsCurrentTopLeft;
  var br = state.LabelsCurrentBottomRight;

  var scrollbar_handle_length =
    (br[0] - tl[0]) / state.MaxLabelWorldPosition[0];
  scrollbar_handle_length *= Math.ceil(geom.LabelsBottomScrollbarSize[0]);
  const minimum_bottom_handle_length =
    geom.LabelsBottomScrollbarSize[1] * 2.618;
  if (scrollbar_handle_length < minimum_bottom_handle_length) {
    scrollbar_handle_length = minimum_bottom_handle_length;
  }

  var scrollbar_handle_pivot =
    (tl[0] + (br[0] - tl[0]) / 2) / state.MaxLabelWorldPosition[0];

  var scrollbar_handle_start = 0;
  var scrollbar_handle_end = 0;
  if (scrollbar_handle_pivot < 0.5) {
    scrollbar_handle_start = tl[0] / state.MaxLabelWorldPosition[0];
    scrollbar_handle_start *= geom.LabelsBottomScrollbarSize[0];
    scrollbar_handle_end = scrollbar_handle_start + scrollbar_handle_length;
  } else {
    scrollbar_handle_end = br[0] / state.MaxLabelWorldPosition[0];
    scrollbar_handle_end *= geom.LabelsBottomScrollbarSize[0];
    scrollbar_handle_start = scrollbar_handle_end - scrollbar_handle_length;
  }

  if (scrollbar_handle_start < 0) {
    scrollbar_handle_start = 0;
  }
  if (scrollbar_handle_end > geom.LabelsBottomScrollbarSize[0]) {
    scrollbar_handle_start =
      geom.LabelsBottomScrollbarSize[0] - scrollbar_handle_length;
  }

  glm.vec2.set(
    geom.LabelsBottomScrollbarHandlePosition,
    Math.round(geom.LabelsBottomScrollbarPosition[0] + scrollbar_handle_start),
    geom.LabelsBottomScrollbarPosition[1]
  );
  glm.vec2.set(
    geom.LabelsBottomScrollbarHandleSize,
    Math.round(scrollbar_handle_length),
    geom.LabelsBottomScrollbarSize[1]
  );

  gl.scissor(
    geom.LabelsBottomScrollbarHandlePosition[0],
    geom.LabelsBottomScrollbarHandlePosition[1],
    geom.LabelsBottomScrollbarHandleSize[0],
    geom.LabelsBottomScrollbarHandleSize[1]
  );
  const scrollbar_handle_color = HexColorToFloats(state.ScrollbarHandleColor);
  gl.clearColor(
    scrollbar_handle_color.R,
    scrollbar_handle_color.G,
    scrollbar_handle_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw MSA bottom scrollbar handle
  tl = state.MSACurrentTopLeft;
  br = state.MSACurrentBottomRight;

  scrollbar_handle_length = (br[0] - tl[0]) / state.MaxMSAWorldPosition[0];
  scrollbar_handle_length *= Math.ceil(geom.MSABottomScrollbarSize[0]);
  if (scrollbar_handle_length < minimum_bottom_handle_length) {
    scrollbar_handle_length = minimum_bottom_handle_length;
  }

  scrollbar_handle_pivot =
    (tl[0] + (br[0] - tl[0]) / 2) / state.MaxMSAWorldPosition[0];

  scrollbar_handle_start = 0;
  scrollbar_handle_end = 0;
  if (scrollbar_handle_pivot < 0.5) {
    scrollbar_handle_start = tl[0] / state.MaxMSAWorldPosition[0];
    scrollbar_handle_start *= geom.MSABottomScrollbarSize[0];
    scrollbar_handle_end = scrollbar_handle_start + scrollbar_handle_length;
  } else {
    scrollbar_handle_end = br[0] / state.MaxMSAWorldPosition[0];
    scrollbar_handle_end *= geom.MSABottomScrollbarSize[0];
    scrollbar_handle_start = scrollbar_handle_end - scrollbar_handle_length;
  }

  if (scrollbar_handle_start < 0) {
    scrollbar_handle_start = 0;
  }
  if (scrollbar_handle_end > geom.MSABottomScrollbarSize[0]) {
    scrollbar_handle_start =
      geom.MSABottomScrollbarSize[0] - scrollbar_handle_length;
  }

  glm.vec2.set(
    geom.MSABottomScrollbarHandlePosition,
    Math.round(geom.MSABottomScrollbarPosition[0] + scrollbar_handle_start),
    geom.MSABottomScrollbarPosition[1]
  );
  glm.vec2.set(
    geom.MSABottomScrollbarHandleSize,
    Math.round(scrollbar_handle_length),
    geom.MSABottomScrollbarSize[1]
  );

  gl.scissor(
    geom.MSABottomScrollbarHandlePosition[0],
    geom.MSABottomScrollbarHandlePosition[1],
    geom.MSABottomScrollbarHandleSize[0],
    geom.MSABottomScrollbarHandleSize[1]
  );
  gl.clearColor(
    scrollbar_handle_color.R,
    scrollbar_handle_color.G,
    scrollbar_handle_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Draw MSA right scrollbar handle
  scrollbar_handle_length = (br[1] - tl[1]) / state.MaxMSAWorldPosition[1];
  scrollbar_handle_length *= Math.ceil(geom.MSARightScrollbarSize[1]);
  const minimum_right_handle_length = geom.MSARightScrollbarSize[0] * 2.618;
  if (scrollbar_handle_length < minimum_right_handle_length) {
    scrollbar_handle_length = minimum_right_handle_length;
  }

  scrollbar_handle_pivot =
    (tl[1] + (br[1] - tl[1]) / 2) / state.MaxMSAWorldPosition[1];

  var scrollbar_handle_top = 0;
  var scrollbar_handle_bottom = 0;
  if (scrollbar_handle_pivot < 0.5) {
    scrollbar_handle_top = tl[1] / state.MaxMSAWorldPosition[1];
    scrollbar_handle_top *= geom.MSARightScrollbarSize[1];
    scrollbar_handle_top = geom.MSARightScrollbarSize[1] - scrollbar_handle_top;
    scrollbar_handle_bottom = scrollbar_handle_top - scrollbar_handle_length;
  } else {
    scrollbar_handle_bottom = br[1] / state.MaxMSAWorldPosition[1];
    scrollbar_handle_bottom *= geom.MSARightScrollbarSize[1];
    scrollbar_handle_bottom =
      geom.MSARightScrollbarSize[1] - scrollbar_handle_bottom;
    scrollbar_handle_top = scrollbar_handle_bottom + scrollbar_handle_length;
  }

  if (scrollbar_handle_bottom < 0) {
    scrollbar_handle_bottom = 0;
  }
  if (scrollbar_handle_top > geom.MSARightScrollbarSize[1]) {
    scrollbar_handle_top =
      geom.MSARightScrollbarSize[1] - scrollbar_handle_length;
  }

  glm.vec2.set(
    geom.MSARightScrollbarHandlePosition,
    geom.MSARightScrollbarPosition[0],
    Math.round(geom.MSARightScrollbarPosition[1] + scrollbar_handle_bottom)
  );
  glm.vec2.set(
    geom.MSARightScrollbarHandleSize,
    geom.MSARightScrollbarSize[0],
    Math.round(scrollbar_handle_length)
  );

  gl.scissor(
    geom.MSARightScrollbarHandlePosition[0],
    geom.MSARightScrollbarHandlePosition[1],
    geom.MSARightScrollbarHandleSize[0],
    geom.MSARightScrollbarHandleSize[1]
  );
  gl.clearColor(
    scrollbar_handle_color.R,
    scrollbar_handle_color.G,
    scrollbar_handle_color.B,
    1.0
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  //Bind shader and buffers (MSA)
  const msa_quad = state.MSAQuad;
  gl.useProgram(state.MSAShader.Program);

  gl.bindBuffer(gl.ARRAY_BUFFER, msa_quad.VertexBuffer.Buffer);
  const msa_vert_coord = gl.getAttribLocation(
    state.MSAShader.Program,
    "in_vert_coord"
  );
  gl.enableVertexAttribArray(msa_vert_coord);
  gl.vertexAttribPointer(
    msa_vert_coord,
    msa_quad.VertexBuffer.ElementsPerVert,
    msa_quad.VertexBuffer.Type,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, msa_quad.UVBuffer.Buffer);
  const msa_uv_coord = gl.getAttribLocation(
    state.MSAShader.Program,
    "in_uv_coord"
  );
  gl.enableVertexAttribArray(msa_uv_coord);
  gl.vertexAttribPointer(
    msa_uv_coord,
    msa_quad.UVBuffer.ElementsPerVert,
    msa_quad.UVBuffer.Type,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, msa_quad.IndexBuffer.Buffer);

  //Compute onscreen tile size to pass to shader
  const pixel_tl = glm.vec3.create();
  const pixel_br = glm.vec3.fromValues(
    state.Canvas.height,
    state.Canvas.width,
    0.0
  );
  var world_tl = glm.vec3.create();
  var world_br = glm.vec3.create();
  glm.vec3.transformMat4(world_tl, pixel_tl, state.MSAScreenToWorldMatrix);
  glm.vec3.transformMat4(world_br, pixel_br, state.MSAScreenToWorldMatrix);
  const tile_pixel_size = glm.vec3.fromValues(
    (pixel_br[0] - pixel_tl[0]) /
      (world_br[0] - world_tl[0]) /
      state.GPUTextureSize,
    ((pixel_br[1] - pixel_tl[1]) / (world_br[1] - world_tl[1]) / -1.0) *
      state.GPUTextureSize,
    0
  );
  gl.uniform3fv(state.MSAShader.Uniforms["tile_pixel_size"], tile_pixel_size);

  //Begin drawing MSA
  gl.disable(gl.SCISSOR_TEST);
  gl.viewport(
    geom.MSAPosition[0],
    geom.MSAPosition[1],
    geom.MSASize[0],
    geom.MSASize[1]
  );
  gl.uniformMatrix4fv(state.MSAViewMatrixUniform, false, state.MSAViewMatrix);
  gl.uniformMatrix4fv(
    state.MSAProjectionMatrixUniform,
    false,
    state.MSAProjectionMatrix
  );
  gl.uniform3fv(
    state.MSAShader.Uniforms["view_position"],
    state.MSAViewPosition
  );
  glm.vec2.set(
    state.MSATileDimensions,
    state.MSATileMap.TileWidth,
    state.MSATileMap.TileHeight
  );
  gl.uniform2fv(
    state.MSAShader.Uniforms["texture_size"],
    state.MSATileDimensions
  );
  gl.uniform1i(state.MSAShader.Uniforms["msa_color_texture"], 2);
  gl.uniform1i(state.MSAShader.Uniforms["msa_text_texture"], 3);
  gl.uniform4fv(state.MSAShader.Uniforms["font_info"], state.FontInfo);

  //Draw MSA tiles
  //TODO: Optimize this to start late/bail early to prevent overdraw
  var model_matrix = state.QuadModelMatrix;
  var model_pos = state.QuadPosition;
  for (var i = 0; i < state.MSATileMap.Tiles.length; i++) {
    const tile = state.MSATileMap.Tiles[i];
    //Position tile in world
    const quad_x = tile.Index % state.MSATileMap.Stride;
    const quad_y = -1.0 * Math.floor(tile.Index / state.MSATileMap.Stride);
    glm.mat4.identity(model_matrix);
    glm.vec3.set(model_pos, quad_x, quad_y, 0);
    glm.mat4.translate(model_matrix, model_matrix, model_pos);
    gl.uniformMatrix4fv(msa_quad.Matrix, false, model_matrix);
    //Bind proper data texture
    const msa_texture = state.GPUMSATileMap[tile.Index];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, msa_texture);
    gl.uniform1i(state.MSAShader.Uniforms["msa_data_texture"], 0);
    //Bind proper consensus texture
    const consensus_texture = state.GPUConsensusTileMap[tile.Index];
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, consensus_texture);
    gl.uniform1i(state.MSAShader.Uniforms["msa_consensus_texture"], 1);
    //Bind tile info for calculating where we are in global space
    gl.uniform4fv(
      state.MSAShader.Uniforms["tile_indices"],
      glm.vec4.fromValues(tile.StartX, tile.StartY, tile.EndX, tile.EndY)
    );
    //Transfer options for conservation coloring
    const consensus_options = glm.vec3.fromValues(
      state.ConsensusColorBy ? 1 : 0,
      state.ConsensusVaryBy ? 1 : 0,
      state.ConsensusCutoff
    );
    gl.uniform3fv(
      state.MSAShader.Uniforms["consensus_options"],
      consensus_options
    );
    //Do draw
    gl.drawElements(
      gl.TRIANGLES,
      msa_quad.NumberOfVertices,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  //Begin drawing labels
  gl.viewport(
    geom.LabelsPosition[0],
    geom.LabelsPosition[1],
    geom.LabelsSize[0],
    geom.LabelsSize[1]
  );

  //Bind shader and buffers (Labels)
  gl.useProgram(state.LabelsShader.Program);
  const labels_vert_coord = gl.getAttribLocation(
    state.LabelsShader.Program,
    "in_vert_coord"
  );
  gl.enableVertexAttribArray(labels_vert_coord);
  gl.uniformMatrix4fv(
    state.LabelsViewMatrixUniform,
    false,
    state.LabelViewMatrix
  );
  gl.uniformMatrix4fv(
    state.LabelsProjectionMatrixUniform,
    false,
    state.LabelProjectionMatrix
  );
  const label_text_color = HexColorToFloats(state.LabelTextColor);
  gl.uniform4f(
    state.LabelsShader.Uniforms["label_text_color"],
    label_text_color.R,
    label_text_color.G,
    label_text_color.B,
    1.0
  );
  const label_text_bg_color = HexColorToFloats(state.LabelTextBGColor);
  gl.uniform4f(
    state.LabelsShader.Uniforms["label_text_bg_color"],
    label_text_bg_color.R,
    label_text_bg_color.G,
    label_text_bg_color.B,
    1.0
  );
  gl.uniform3fv(
    state.LabelsShader.Uniforms["tile_pixel_size"],
    tile_pixel_size
  );
  gl.uniform1i(state.LabelsShader.Uniforms["labels_text_texture"], 4);
  gl.uniform2fv(
    state.LabelsShader.Uniforms["texture_size"],
    assets.VariableFontInfo.AtlasSize
  );

  glm.mat4.identity(model_matrix);

  for (var labels_model of state.LabelModels) {
    //TODO: clean this up so we can do some of this during initialization
    gl.bindBuffer(gl.ARRAY_BUFFER, labels_model.VertexBuffer.Buffer);
    gl.vertexAttribPointer(
      labels_vert_coord,
      labels_model.VertexBuffer.ElementsPerVert,
      labels_model.VertexBuffer.Type,
      false,
      0,
      0
    );

    gl.uniformMatrix4fv(labels_model.Matrix, false, model_matrix);

    //Draw labels
    gl.drawArrays(gl.TRIANGLES, 0, labels_model.NumberOfVertices);
  }

  //Print to console if a frame ever takes longer than 1/60th of a second
  const ms_taken = performance.now() - start_time;
  if (ms_taken > 16) {
    console.log("Low FPS: ", 1000 / ms_taken);
  }

  return;
}

export function UniformHelper(
  dict: ShaderUniformDict,
  program: WebGLProgram,
  name: string
): void {
  dict[name] = window.MAFFTMSAViewer.State.GLContext.getUniformLocation(
    program,
    name
  );
  return;
}

export function LoadColorTexture(): void {
  const assets = window.MAFFTMSAViewer.Assets;
  const gl = window.MAFFTMSAViewer.State.GLContext;

  if (window.MAFFTMSAViewer.State.ColorTexture != null) {
    gl.deleteTexture(window.MAFFTMSAViewer.State.ColorTexture);
  }

  gl.activeTexture(gl.TEXTURE2);
  const color_texture = gl.createTexture(); //CREATE!!
  gl.bindTexture(gl.TEXTURE_2D, color_texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    128,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    assets.ColorTexture
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  window.MAFFTMSAViewer.State.ColorTexture = color_texture;
}

export async function GLInitialize(
  sequences: ParsedFASTA,
  loading_modal: bootstrap.Modal
): Promise<void> {
  const state = window.MAFFTMSAViewer.State;
  const assets = window.MAFFTMSAViewer.Assets;
  const sleep_time = SleepRedrawValue();

  //Check content of glyphs to see which colors we should load by default
  var atgc_count = 0;
  var other_count = 0;
  Object.keys(sequences.GlyphCounts).forEach((key, _) => {
    switch (key) {
      case "a":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "A":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "t":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "T":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "g":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "G":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "c":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case "C":
        atgc_count += sequences.GlyphCounts[key];
        break;
      case " ":
        break;
      case "-":
        break;
      default:
        other_count += sequences.GlyphCounts[key];
        break;
    }
  });

  const atgc_percentage = (atgc_count / (atgc_count + other_count)) * 100.0;
  //TODO: Write a check here to avoid overwriting colors that were set prior to the
  //loading of an MSA
  if (atgc_percentage > 80) {
    assets.MSAColors = ColorCollection["MAFFT Nucleotide"];
    assets.ColorTexture = BuildColorTexture(assets.MSAColors);
  } else {
    assets.MSAColors = ColorCollection["MAFFT General"];
    assets.ColorTexture = BuildColorTexture(assets.MSAColors);
  }

  //Choose a maximum width/height that's a multiple of the tile size
  const texture_size = state.GPUTextureSize;
  var max_seq_length = sequences.MaxSequenceLength;
  if (max_seq_length % texture_size != 0) {
    max_seq_length =
      Math.floor(max_seq_length / texture_size + 1) * texture_size;
  }

  var max_height = sequences.SequenceCount();
  if (max_height % texture_size != 0) {
    max_height = Math.floor(max_height / texture_size + 1) * texture_size;
  }

  //Initialize consensus tilemap at 2 bytes per pixel
  const gl = state.GLContext;
  var js_img = new Uint8Array(texture_size * texture_size * 2);
  //Clear buffer
  for (var j = 0; j < js_img.length; j++) {
    js_img[j] = 0x00;
  }

  const gpu_consensus_index_map: GPUTextureDict = {};
  const consensus_chunk_size = js_img.length / 2;
  for (
    var x = 0;
    x < sequences.ConsensusSequence.length;
    x += consensus_chunk_size
  ) {
    var seq_chunk = sequences.ConsensusSequence.slice(
      x,
      x + consensus_chunk_size
    );
    var score_chunk = sequences.ConsensusScores.slice(
      x,
      x + consensus_chunk_size
    );
    for (var chunk_i = 0; chunk_i < seq_chunk.length; chunk_i++) {
      var img_i = chunk_i * 2;
      js_img[img_i] = seq_chunk[chunk_i];
      js_img[img_i + 1] = Math.round(score_chunk[chunk_i] * 255.0);
    }

    //Load consensus data on GPU
    gl.activeTexture(gl.TEXTURE1);
    var consensus_texture = gl.createTexture(); //CREATE!!
    gl.bindTexture(gl.TEXTURE_2D, consensus_texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE_ALPHA,
      texture_size,
      texture_size,
      0,
      gl.LUMINANCE_ALPHA,
      gl.UNSIGNED_BYTE,
      js_img
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //Save texture handle for later use
    gpu_consensus_index_map[x] = consensus_texture;
  }

  //Initialize alignment tilemap
  const msa_tile_map = new TileMap(
    max_seq_length,
    max_height,
    texture_size,
    texture_size,
    loading_modal
  );
  const gpu_msa_tile_map: GPUTextureDict = {};
  const gpu_consensus_tile_map: GPUTextureDict = {};
  js_img = new Uint8Array(texture_size * texture_size);

  for (var i = 0; i < msa_tile_map.Tiles.length; i++) {
    if (i % 5 == 0) {
      const percentage = Math.floor((i / msa_tile_map.Tiles.length) * 100.0);
      SetHTMLByID(
        "MAFFTMSAViewerLoadingText",
        "Copying MSA data to the graphics card (" + percentage + "%)..."
      );
      await Sleep(sleep_time);
    }
    const tile = msa_tile_map.Tiles[i];
    //Clear buffer
    for (var j = 0; j < js_img.length; j++) {
      js_img[j] = 0x00;
    }

    //Prepare alignment data for GPU
    var row = 0;
    for (var y = tile.StartY; y < tile.StartY + msa_tile_map.TileHeight; y++) {
      if (y < sequences.SequenceCount()) {
        const full_sequence = sequences.GetUint8Sequence(y);
        var end_x = tile.StartX + msa_tile_map.TileWidth;

        if (end_x > full_sequence.Sequence.length) {
          end_x = full_sequence.Sequence.length;
        }

        const chunk = full_sequence.Sequence.slice(tile.StartX, end_x);

        for (var x = 0; x < chunk.length; x++) {
          const js_img_i = row * msa_tile_map.TileWidth + x;
          js_img[js_img_i] = chunk[x];
        }
      }
      row += 1;
    }

    //Load alignment data on GPU
    gl.activeTexture(gl.TEXTURE0);
    var msa_texture = gl.createTexture(); //CREATE!!
    gl.bindTexture(gl.TEXTURE_2D, msa_texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      msa_tile_map.TileWidth,
      msa_tile_map.TileHeight,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      js_img
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //Save texture handle for later use
    gpu_msa_tile_map[tile.Index] = msa_texture;

    //Decide which consensus texture is associated with this MSA texture
    for (var consensus_index in gpu_consensus_index_map) {
      const first_consensus = parseInt(consensus_index);
      const last_consensus = first_consensus + consensus_chunk_size - 1;
      if (first_consensus <= tile.StartX && last_consensus >= tile.EndX) {
        gpu_consensus_tile_map[tile.Index] =
          gpu_consensus_index_map[consensus_index];
        break;
      }
    }
  }

  //Build vertex data for labels
  const label_models = [];
  const start_time = performance.now();
  const font_info = assets.VariableFontInfo;
  const labels_verts = new Float32Array(300000); //Must be evenly divisible by 6!
  const base_quad_x = font_info.BaseGlyphSize[0] / 8;

  var max_quad_x = 0;
  var label_char_count = 0;

  for (var y = 0; y < sequences.SequenceCount(); y++) {
    const label = sequences.GetUint8Sequence(y).Label;
    var quad_x = base_quad_x;
    const quad_y = -1.0 * y * font_info.BaseGlyphSize[1];

    for (var x = 0; x < label.length; x++) {
      const glyph_id = label[x];
      const glyph_info = font_info.GlyphDict[glyph_id];

      //Position tile in world
      const pos_x = quad_x + glyph_info.NormalizedXOffset;
      const pos_y = quad_y - glyph_info.NormalizedYOffset;

      //Generate vertices
      var v_base_index = label_char_count * 24;

      if (v_base_index >= labels_verts.length) {
        var labels_model: Model = {
          VertexBuffer: {
            Buffer: gl.createBuffer(), //CREATE!!
            ElementsPerVert: 4,
            Type: gl.FLOAT,
          },
          UVBuffer: null, //Unused
          IndexBuffer: null, //Unused
          Matrix: null, //Filled in during shader compilation
          NumberOfVertices: label_char_count * 6,
        };
        gl.bindBuffer(gl.ARRAY_BUFFER, labels_model.VertexBuffer.Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, labels_verts, gl.STATIC_DRAW);
        label_models.push(labels_model);

        //Reset
        label_char_count = 0;
        v_base_index = 0;
      }

      //Vert 0 (top left)
      labels_verts[v_base_index] = pos_x;
      labels_verts[v_base_index + 1] = pos_y;
      labels_verts[v_base_index + 2] = glyph_info.X;
      labels_verts[v_base_index + 3] = glyph_info.Y;

      //Vert 1 (bottom left)
      labels_verts[v_base_index + 4] = labels_verts[v_base_index];
      labels_verts[v_base_index + 5] = pos_y - glyph_info.NormalizedHeight;
      labels_verts[v_base_index + 6] = labels_verts[v_base_index + 2];
      labels_verts[v_base_index + 7] = glyph_info.Y + glyph_info.Height;

      //Vert 2 (bottom right)
      labels_verts[v_base_index + 8] = pos_x + glyph_info.NormalizedWidth;
      labels_verts[v_base_index + 9] = labels_verts[v_base_index + 5];
      labels_verts[v_base_index + 10] = glyph_info.X + glyph_info.Width;
      labels_verts[v_base_index + 11] = labels_verts[v_base_index + 7];

      //Vert 3 (same as 0)
      labels_verts[v_base_index + 12] = labels_verts[v_base_index];
      labels_verts[v_base_index + 13] = labels_verts[v_base_index + 1];
      labels_verts[v_base_index + 14] = labels_verts[v_base_index + 2];
      labels_verts[v_base_index + 15] = labels_verts[v_base_index + 3];

      //Vert 4 (same as vert 2)
      labels_verts[v_base_index + 16] = labels_verts[v_base_index + 8];
      labels_verts[v_base_index + 17] = labels_verts[v_base_index + 9];
      labels_verts[v_base_index + 18] = labels_verts[v_base_index + 10];
      labels_verts[v_base_index + 19] = labels_verts[v_base_index + 11];

      //Vert 5 (top right)
      labels_verts[v_base_index + 20] = labels_verts[v_base_index + 8];
      labels_verts[v_base_index + 21] = labels_verts[v_base_index + 1];
      labels_verts[v_base_index + 22] = labels_verts[v_base_index + 10];
      labels_verts[v_base_index + 23] = labels_verts[v_base_index + 3];

      //Advance horizontally
      quad_x += glyph_info.NormalizedXAdvance;
      if (quad_x > max_quad_x) {
        max_quad_x = quad_x;
      }
      label_char_count += 1;
    }
  }

  //Upload last iteration to GPU
  const last_labels_model: Model = {
    VertexBuffer: {
      Buffer: gl.createBuffer(), //CREATE!!
      ElementsPerVert: 4,
      Type: gl.FLOAT,
    },
    UVBuffer: null, //Unused
    IndexBuffer: null, //Unused
    Matrix: null, //Filled in during shader compilation
    NumberOfVertices: label_char_count * 6,
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, last_labels_model.VertexBuffer.Buffer);
  gl.bufferData(gl.ARRAY_BUFFER, labels_verts, gl.STATIC_DRAW);
  label_models.push(last_labels_model);

  //Calculate maximum world position for MSA
  state.MaxMSAWorldPosition[0] = sequences.MaxSequenceLength / texture_size;
  state.MaxMSAWorldPosition[1] = sequences.SequenceCount() / texture_size;
  state.MaxMSAWorldPosition[1] *= -1.0;

  //Calculate maximum world position for labels
  state.MaxLabelWorldPosition[0] = max_quad_x;
  state.MaxLabelWorldPosition[1] = state.MaxMSAWorldPosition[1];

  SetHTMLByID(
    "MAFFTMSAViewerLoadingText",
    "Initializing GPU shader/models (MSA)"
  );
  await Sleep(sleep_time);

  //Put MSA Quad together
  const msa_quad: Model = {
    VertexBuffer: {
      Buffer: gl.createBuffer(), //CREATE!!
      ElementsPerVert: 3,
      Type: gl.FLOAT,
    },
    UVBuffer: {
      Buffer: gl.createBuffer(), //CREATE!!
      ElementsPerVert: 3,
      Type: gl.FLOAT,
    },
    IndexBuffer: {
      Buffer: gl.createBuffer(), //CREATE!!
      ElementsPerVert: 1,
      Type: gl.UNSIGNED_SHORT,
    },
    Matrix: null, //Filled in during shader compilation
    NumberOfVertices: 6,
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, msa_quad.VertexBuffer.Buffer);
  gl.bufferData(gl.ARRAY_BUFFER, assets.MSAQuadVerts, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, msa_quad.UVBuffer.Buffer);
  gl.bufferData(gl.ARRAY_BUFFER, assets.MSAQuadUVs, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, msa_quad.IndexBuffer.Buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, assets.MSAQuadIndices, gl.STATIC_DRAW);

  //Compile vert shader (MSA)
  const msa_vert_shader = gl.createShader(gl.VERTEX_SHADER); //CREATE!!
  gl.shaderSource(msa_vert_shader, assets.MSAQuadVertCode);
  gl.compileShader(msa_vert_shader);
  if (!gl.getShaderParameter(msa_vert_shader, gl.COMPILE_STATUS)) {
    console.log("Error compiling vertex shader-");
    console.log(gl.getShaderInfoLog(msa_vert_shader));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error compiling vertex shader."));
    return;
  }

  //Compile frag shader (MSA)
  const msa_frag_shader = gl.createShader(gl.FRAGMENT_SHADER); //CREATE!!
  gl.shaderSource(msa_frag_shader, assets.MSAQuadFragCode);
  gl.compileShader(msa_frag_shader);
  if (!gl.getShaderParameter(msa_frag_shader, gl.COMPILE_STATUS)) {
    console.log("Error compiling fragment shader-");
    console.log(gl.getShaderInfoLog(msa_frag_shader));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error compiling fragment shader."));
    return;
  }

  //Finalize shader (MSA)
  const msa_shader: Shader = {
    Program: gl.createProgram(), //CREATE!!
    Uniforms: {},
  };
  gl.attachShader(msa_shader.Program, msa_vert_shader);
  gl.attachShader(msa_shader.Program, msa_frag_shader);
  gl.linkProgram(msa_shader.Program);
  if (!gl.getProgramParameter(msa_shader.Program, gl.LINK_STATUS)) {
    console.log("Error linking shader program-");
    console.log(gl.getProgramInfoLog(msa_shader.Program));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error linking shader program."));
    return;
  }
  gl.deleteShader(msa_vert_shader);
  gl.deleteShader(msa_frag_shader);

  //Gather uniforms (MSA shader)
  msa_quad.Matrix = gl.getUniformLocation(msa_shader.Program, "model_matrix");
  const msa_view_matrix = gl.getUniformLocation(
    msa_shader.Program,
    "view_matrix"
  );
  const msa_projection_matrix = gl.getUniformLocation(
    msa_shader.Program,
    "projection_matrix"
  );

  //MSA and general uniforms (MSA)
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "msa_data_texture");
  UniformHelper(
    msa_shader.Uniforms,
    msa_shader.Program,
    "msa_consensus_texture"
  );
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "msa_color_texture");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "msa_text_texture");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "texture_size");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "view_position");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "font_info");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "tile_pixel_size");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "tile_indices");
  UniformHelper(msa_shader.Uniforms, msa_shader.Program, "consensus_options");

  SetHTMLByID(
    "MAFFTMSAViewerLoadingText",
    "Initializing GPU shader/models (Labels)"
  );
  await Sleep(sleep_time);

  //Compile vert shader (Labels)
  const labels_vert_shader = gl.createShader(gl.VERTEX_SHADER); //CREATE!!
  gl.shaderSource(labels_vert_shader, assets.LabelsVertCode);
  gl.compileShader(labels_vert_shader);
  if (!gl.getShaderParameter(labels_vert_shader, gl.COMPILE_STATUS)) {
    console.log("Error compiling vertex shader-");
    console.log(gl.getShaderInfoLog(labels_vert_shader));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error compiling vertex shader."));
    return;
  }

  //Compile frag shader (Labels)
  const labels_frag_shader = gl.createShader(gl.FRAGMENT_SHADER); //CREATE!!
  gl.shaderSource(labels_frag_shader, assets.LabelsFragCode);
  gl.compileShader(labels_frag_shader);
  if (!gl.getShaderParameter(labels_frag_shader, gl.COMPILE_STATUS)) {
    console.log("Error compiling fragment shader-");
    console.log(gl.getShaderInfoLog(labels_frag_shader));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error compiling fragment shader."));
    return;
  }

  //Finalize shader (Labels)
  const labels_shader: Shader = {
    Program: gl.createProgram(), //CREATE!!
    Uniforms: {},
  };
  gl.attachShader(labels_shader.Program, labels_vert_shader);
  gl.attachShader(labels_shader.Program, labels_frag_shader);
  gl.linkProgram(labels_shader.Program);
  if (!gl.getProgramParameter(labels_shader.Program, gl.LINK_STATUS)) {
    console.log("Error linking shader program-");
    console.log(gl.getProgramInfoLog(labels_shader.Program));
    loading_modal.hide();
    FatalError(NewError("Shader Error", "Error linking shader program."));
    return;
  }
  gl.deleteShader(labels_vert_shader);
  gl.deleteShader(labels_frag_shader);

  //Gather uniforms (Labels)
  for (var labels_model of label_models) {
    labels_model.Matrix = gl.getUniformLocation(
      labels_shader.Program,
      "model_matrix"
    );
  }
  const labels_view_matrix = gl.getUniformLocation(
    labels_shader.Program,
    "view_matrix"
  );
  const labels_projection_matrix = gl.getUniformLocation(
    labels_shader.Program,
    "projection_matrix"
  );
  UniformHelper(labels_shader.Uniforms, labels_shader.Program, "glyph_info");
  UniformHelper(
    labels_shader.Uniforms,
    labels_shader.Program,
    "labels_text_texture"
  );
  UniformHelper(
    labels_shader.Uniforms,
    labels_shader.Program,
    "tile_pixel_size"
  );
  UniformHelper(
    labels_shader.Uniforms,
    labels_shader.Program,
    "label_text_color"
  );
  UniformHelper(
    labels_shader.Uniforms,
    labels_shader.Program,
    "label_text_bg_color"
  );
  UniformHelper(labels_shader.Uniforms, labels_shader.Program, "texture_size");

  SetHTMLByID(
    "MAFFTMSAViewerLoadingText",
    "Loading font and color textures..."
  );
  await Sleep(sleep_time);

  //Load and bind MSA color texture
  LoadColorTexture();

  //Load and bind font texture
  gl.activeTexture(gl.TEXTURE3);
  const font_texture = gl.createTexture(); //CREATE!!
  gl.bindTexture(gl.TEXTURE_2D, font_texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    assets.FontTexture
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  //Load and bind variable font texture
  gl.activeTexture(gl.TEXTURE4);
  const variable_font_texture = gl.createTexture(); //CREATE!!
  gl.bindTexture(gl.TEXTURE_2D, variable_font_texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    assets.VariableFontTexture
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  //Enable back-face culling
  gl.enable(gl.CULL_FACE);

  //Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  //Save values to global state
  state.Sequences = sequences;
  state.MSATileMap = msa_tile_map;
  state.GPUMSATileMap = gpu_msa_tile_map;
  state.GPUConsensusTileMap = gpu_consensus_tile_map;
  state.MSAShader = msa_shader;
  state.LabelsShader = labels_shader;
  state.MSAQuad = msa_quad;
  state.LabelModels = label_models;
  state.MSAViewMatrixUniform = msa_view_matrix;
  state.MSAProjectionMatrixUniform = msa_projection_matrix;
  state.LabelsViewMatrixUniform = labels_view_matrix;
  state.LabelsProjectionMatrixUniform = labels_projection_matrix;
  state.FontTexture = font_texture;
  state.VariableFontTexture = variable_font_texture;

  state.Initialized = true;
  return;
}

export function GLDestroy(): void {
  const state = window.MAFFTMSAViewer.State;
  const gl = state.GLContext;
  if (state !== undefined && state.Initialized) {
    gl.deleteBuffer(state.MSAQuad.VertexBuffer.Buffer);
    gl.deleteBuffer(state.MSAQuad.UVBuffer.Buffer);
    gl.deleteBuffer(state.MSAQuad.IndexBuffer.Buffer);
    for (var labels_model of state.LabelModels) {
      gl.deleteBuffer(labels_model.VertexBuffer.Buffer);
    }
    gl.deleteProgram(state.MSAShader.Program);
    gl.deleteProgram(state.LabelsShader.Program);
    gl.deleteTexture(state.ColorTexture);
    gl.deleteTexture(state.FontTexture);
    gl.deleteTexture(state.VariableFontTexture);
    for (var i = 0; i < state.MSATileMap.Tiles.length; i++) {
      const msa_texture = state.GPUMSATileMap[i];
      gl.deleteTexture(msa_texture);
      const consensus_texture = state.GPUConsensusTileMap[i];
      gl.deleteTexture(consensus_texture);
    }
  }
  return;
}
