//TODO: Error message if highp is not available on the platform
precision highp float;

varying vec2 uv_coord;

uniform vec4 label_text_color;
uniform vec4 label_text_bg_color;
uniform vec3 tile_pixel_size;
uniform vec4 glyph_info;

uniform sampler2D labels_text_texture;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main(void) {
  vec4 bg_color = label_text_bg_color;

  //Stop here if text is too small to read
  if( tile_pixel_size.x < 4.0) {
    gl_FragColor = label_text_color;
    return;
  }

  //MSDF calclation (Chlumsky)
  vec4 raw_text_pixel = texture2D(labels_text_texture, uv_coord);
  float sd = median(raw_text_pixel.r, raw_text_pixel.g, raw_text_pixel.b);
  float sdf_distance_range = 4.0;
  //TODO: put the 68 here in as a proper uniform
  float size_ratio = tile_pixel_size.x / 68.0 * sdf_distance_range;
  size_ratio = max(size_ratio, 1.0);
  float screenPxDistance = size_ratio * (sd - 0.5);
  float text_opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  //Decide final text color
  gl_FragColor = mix(bg_color, label_text_color, text_opacity);
  //gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
  //gl_FragColor = raw_text_pixel;
}
