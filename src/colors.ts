import { ColorCollection } from "./color_schemes/schemes";
import { BasicColor, ColorDict } from "./types";
import { ElementByID } from "./utils";

export function GetColorByID(id: string): string {
  const color_input = ElementByID(id) as HTMLInputElement;
  return color_input.value;
}

export function SetColorByID(id: string, color: string): void {
  const color_input = ElementByID(id) as HTMLInputElement;
  color_input.value = color;
  return;
}

export function HexColorToFloats(hex_color: string): BasicColor {
  const r_int = parseInt("0x" + hex_color.substring(1, 3));
  const g_int = parseInt("0x" + hex_color.substring(3, 5));
  const b_int = parseInt("0x" + hex_color.substring(5, 7));
  const basic_color: BasicColor = {
    R: r_int / 255,
    G: g_int / 255,
    B: b_int / 255,
  };
  return basic_color;
}

export function BuildColorTexture(color_dict: ColorDict): Uint8Array {
  //Makes a 128x1 RGBA texture to pass to WebGL for coloring by ASCII character
  //Initialize texture to all white to make unsupported glyphs easier to see
  var texture = new Uint8Array(4 * 128);
  for (var i = 1; i < 128; i++) {
    texture[i * 4 + 0] = 255;
    texture[i * 4 + 1] = 255;
    texture[i * 4 + 2] = 255;
    texture[i * 4 + 3] = 255;
  }
  //Replace white with actual colors from dictionary
  Object.keys(color_dict.Glyphs).forEach((key, _) => {
    var hex_color = color_dict.Glyphs[key];
    var i = key.charCodeAt(0) * 4;
    texture[i + 0] = parseInt("0x" + hex_color.substring(1, 3));
    texture[i + 1] = parseInt("0x" + hex_color.substring(3, 5));
    texture[i + 2] = parseInt("0x" + hex_color.substring(5, 7));
    texture[i + 3] = 255;
  });

  return texture;
}

export { ColorCollection };
