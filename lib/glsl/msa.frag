precision highp float;

varying vec2 uv_coord;

uniform sampler2D msa_data_texture;
uniform sampler2D msa_consensus_texture;
uniform sampler2D msa_color_texture;
uniform sampler2D msa_text_texture;

uniform vec4 font_info; //char width, char height, chars per line, texture_size
uniform vec3 tile_pixel_size; //size of onscreen tile in pixels
uniform vec4 tile_indices; //tile global start x, start y, end x, end y
uniform vec3 consensus_options; //color by consensus, vary by consensus, consensus cutoff

uniform vec2 texture_size; //in pixels
uniform vec3 view_position;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float a_mod_b(float a, float b) {
  return a - (b * floor(a/b));
}

void main(void) {
  //Set background color and check if we should bail
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  vec2 floored_uv = vec2(floor(uv_coord.x), floor(uv_coord.y));
  vec2 msa_data_uv = vec2(floored_uv.x / texture_size.x, floored_uv.y / texture_size.y);

  //Pull ascii data from MSA and attach color
  float normalized_msa_glyph = texture2D(msa_data_texture, msa_data_uv).r;
  //We add 0.5 here to account for the case where float truncating makes it harder to
  //recover the original ASCII
  float msa_glyph = floor( (normalized_msa_glyph * 255.0) + 0.5 );
  float msa_glyph_low = msa_glyph;
  if(msa_glyph < 32.0) {
    return;
  }
  if(msa_glyph >= 127.0) {
    return;
  }
  if(64.0<msa_glyph && msa_glyph<91.0) { //isUpperCase?
    msa_glyph_low = msa_glyph + 32.0; //toLowerCase()?
  }

  //Pull ascii consensus data along with float score
  float global_x = tile_indices.x + floored_uv.x;
  float msa_consensus_pos = a_mod_b(global_x, texture_size.x * texture_size.y);
  float msa_consensus_texture_u = a_mod_b(msa_consensus_pos, texture_size.x) / texture_size.x;
  float msa_consensus_texture_v = floor(msa_consensus_pos / texture_size.x) / texture_size.y;
  vec2 msa_consensus_texture_uv = vec2(msa_consensus_texture_u, msa_consensus_texture_v);
  vec4 normalized_consensus_data = texture2D(msa_consensus_texture,
      msa_consensus_texture_uv);
  float consensus_glyph = floor( (normalized_consensus_data.r * 255.0) + 0.5 );
  float consensus_score = normalized_consensus_data.a;

  //Decide color based on glyph and consensus
  vec4 gap_color = texture2D(msa_color_texture, vec2(45.0/128.0, 0.5));
  float color_index = msa_glyph / 128.0;
  vec4 bg_color = texture2D(msa_color_texture, vec2(color_index, 0.5));
  if( consensus_options.x > 0.0 ) {
    //If color by consensus is enabled, the glyph matches consensus, and it's above cutoff...
    if( (int(msa_glyph_low) == int(consensus_glyph)) && (consensus_score > consensus_options.z) ) {
      //If vary color by consensus is enabled we do a mix
      if( consensus_options.y > 0.0 ) {
        bg_color = mix(gap_color, bg_color, consensus_score);
      }
    } else {
      //If glyph doesn't match or score is too low we make it the same as the gap color
      bg_color = gap_color;
    }
  }

  //Stop here if text is too small to read
  if( tile_pixel_size.x < 4.0) {
    gl_FragColor = bg_color;
    return;
  }

  //Pull ascii glyph from text texture
  float text_glyph = msa_glyph - 32.0;
  float text_width = font_info.x;
  float text_height = font_info.y;
  float chars_per_row = font_info.z;
  float texture_size = font_info.w;
  //Get tile X/Y from text texture
  float text_row = floor(text_glyph / chars_per_row);
  float text_glyph_y = text_row * text_height;
  float text_glyph_x = (text_glyph * text_width) - (text_row * chars_per_row * text_width);
  //Convert to 0-1 UV space based on pixel calculation
  text_glyph_x = (text_glyph_x + 0.5) / texture_size; //add 0.5 to target center of pixel
  text_glyph_y = (text_glyph_y + 0.5) / texture_size; //add 0.5 to garget center of pixel

  //Compute where we are within the tile
  float tile_x = uv_coord.x - floored_uv.x;
  float tile_y = uv_coord.y - floored_uv.y;
  //Center glyph in tile for MSA
  float glyph_margin = ((font_info.y - font_info.x) / 2.0) / font_info.y;
  if(tile_x < glyph_margin) {
    tile_x = 0.0;
  } else {
    tile_x -= glyph_margin;
  }

  tile_x = tile_x / (font_info.x / font_info.y);

  if(tile_x > 1.0) {
    tile_x = 1.0;
  }
  //Convert those to text texture tile pixel space
  //We need to subtract 1 pixel here because our size is actually from
  //the border start of one character to border start of next character
  //so using the raw width/height has us overshoot by one pixel
  //subtracting fixes this issue
  tile_x = (tile_x * (text_width - 1.0)) / texture_size;
  tile_y = (tile_y * (text_height - 1.0)) / texture_size;

  //Compute final text UV and grab text pixel
  vec2 text_glyph_uv = vec2(text_glyph_x + tile_x, text_glyph_y + tile_y);
  vec4 raw_text_pixel = texture2D(msa_text_texture, text_glyph_uv);

  //MSDF calclation (Chlumsky)
  float sd = median(raw_text_pixel.r, raw_text_pixel.g, raw_text_pixel.b);
  float sdf_distance_range = 4.0;
  float size_ratio = tile_pixel_size.x / text_height * sdf_distance_range;
  size_ratio = max(size_ratio, 1.0);
  float screenPxDistance = size_ratio * (sd - 0.5);
  float text_opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  //Decide final text color
  //NTSC formula for converting to grayscale
  float average_bg_color = (0.299*bg_color.r) + (0.587*bg_color.g) + (0.114*bg_color.b);
  //Account for gamma by using a higher midpoint than 128
  vec4 text_color;
  if(average_bg_color < (152.0/255.0)) {
    text_color = vec4(1.0, 1.0, 1.0, 1.0);
  } else {
    text_color = vec4(0.0, 0.0, 0.0, 1.0);
  }

  gl_FragColor = mix(bg_color, text_color, text_opacity);
}
