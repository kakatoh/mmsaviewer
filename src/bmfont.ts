import * as glm from "gl-matrix";
import { GlyphInfo, GlyphInfoDict } from "./types";

export class BMFontData {
  public GlyphDict: GlyphInfoDict;
  public AtlasSize: glm.vec2;
  public LineHeight: number;
  public BaseGlyphSize: glm.vec2;

  constructor(json_data: any, margin_ratio: number) {
    this.AtlasSize = glm.vec2.fromValues(
      json_data.common.scaleW,
      json_data.common.scaleH
    );
    this.BaseGlyphSize = glm.vec2.fromValues(
      1 / this.AtlasSize[0],
      1 / this.AtlasSize[1]
    );
    this.GlyphDict = {};

    //Find largest glyph and then add margin
    let max_pixels = 0;
    for (let char_info of json_data.chars) {
      if (char_info.height > max_pixels) {
        max_pixels = char_info.height;
      }
      if (char_info.width > max_pixels) {
        max_pixels = char_info.width;
      }
    }
    this.LineHeight = max_pixels + max_pixels * margin_ratio;

    for (let char_info of json_data.chars) {
      const info: GlyphInfo = {
        Char: char_info.char,
        //Measurements in pixels
        X: char_info.x,
        Y: char_info.y,
        Width: char_info.width,
        Height: char_info.height,
        //Measurements normalized to pixels / line height for projection on
        //an arbitrary quad
        NormalizedXOffset:
          (char_info.xoffset / this.LineHeight) * this.BaseGlyphSize[0],
        NormalizedYOffset:
          (char_info.yoffset / this.LineHeight) * this.BaseGlyphSize[1],
        NormalizedWidth:
          (char_info.width / this.LineHeight) * this.BaseGlyphSize[0],
        NormalizedHeight:
          (char_info.height / this.LineHeight) * this.BaseGlyphSize[1],
        NormalizedXAdvance:
          (char_info.xadvance / this.LineHeight) * this.BaseGlyphSize[0],
      };
      this.GlyphDict[char_info.id] = info;
    }
  }
}
