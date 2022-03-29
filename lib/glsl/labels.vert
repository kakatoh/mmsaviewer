//TODO: Error message if highp is not available on the platform
precision highp float;

attribute vec4 in_vert_coord;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;
uniform vec4 glyph_info;
uniform vec2 texture_size;

varying vec4 out_coord;
varying vec2 uv_coord;

void main(void) {
  uv_coord = vec2(in_vert_coord.z / texture_size.x, in_vert_coord.w / texture_size.y);

  mat4 mvp = projection_matrix * view_matrix * model_matrix;
  out_coord = mvp * vec4(in_vert_coord.x, in_vert_coord.y, 0.0, 1.0);
  gl_Position = out_coord;
}
