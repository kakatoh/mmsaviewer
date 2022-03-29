const Jimp = require("jimp");
const fs = require("fs");

const nonpunctuation =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const metadata_file = fs.readFileSync("lib/font_meslo/MesloLGSDZ-Regular.json");
const metadata = JSON.parse(metadata_file);
const texture_size = 1024;

// open a file called "lenna.png"
Jimp.read("lib/font_meslo/MesloLGSDZ-Regular.png", (err, in_texture) => {
  if (err) throw err;

  let min_x_offset = 999999999999999999;
  let min_y_offset = 999999999999999999;
  let max_x_offset = -1;
  let max_y_offset = -1;
  let max_width = -1;
  let max_height = -1;
  for (i = 0; i < metadata["chars"].length; i++) {
    chr = metadata["chars"][i];

    const x_offset = chr["xoffset"];
    let width = chr["width"];
    width += x_offset;
    if (width > max_width) {
      max_width = width;
    }

    const y_offset = chr["yoffset"];
    let height = chr["height"];
    height += y_offset;
    if (height > max_height) {
      max_height = height;
    }

    if (x_offset < min_x_offset) {
      min_x_offset = x_offset;
    }
    if (y_offset < min_y_offset) {
      min_y_offset = y_offset;
    }
  }

  const y_margin = 2;
  const x_margin = 0;

  max_height += y_margin;
  max_width += x_margin;

  const char_width = max_width;
  const char_height = max_height;

  const chars_per_line = Math.floor(texture_size / char_width);
  const rows = Math.floor(texture_size / char_height);
  const stride = chars_per_line * char_width;

  console.log("char width:", char_width, "char height:", char_height);
  console.log("max width:", max_width, "max height:", max_height);
  console.log("chars per line:", chars_per_line);
  console.log("rows:", rows);

  out_texture = new Jimp(texture_size, texture_size, 0x000000);

  metadata["chars"].sort(function (a, b) {
    return a["id"] - b["id"];
  });

  for (i = 0; i < metadata["chars"].length; i++) {
    chr = metadata["chars"][i];
    const in_x = chr["x"];
    const in_y = chr["y"];
    const glyph = chr["id"] - 32;

    let out_x = (glyph * char_width) % stride;
    let out_y = Math.floor((glyph * char_width) / stride) * char_height;

    //Center text horizontally in tile
    const x_skew = Math.round((char_width - chr["width"]) / 2.0);
    out_x += x_skew;

    //Center punctuation vertically in tile
    if (nonpunctuation.includes(chr.char)) {
      out_y += chr["yoffset"] + 1;
    } else {
      const y_skew = Math.floor((char_height - chr["height"]) / 2.0);
      out_y += y_skew;
    }

    for (x = 0; x < chr["width"]; x++) {
      for (y = 0; y < chr["height"]; y++) {
        const color = in_texture.getPixelColor(in_x + x, in_y + y);
        out_texture.setPixelColor(color, out_x + x, out_y + y);
      }
    }
  }

  out_texture.write("build/dist/img/meslo_lg_s_dz.png");
});
