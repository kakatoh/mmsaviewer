//TODO: Error message if highp is not available on the platform
precision highp float;

attribute vec3 in_uv_coord;
attribute vec3 in_vert_coord;

uniform vec4 font_info;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

uniform vec2 texture_size;
uniform vec3 view_position;

varying vec2 uv_coord;
varying vec4 out_coord;

void main(void) {
  uv_coord = vec2(in_uv_coord.x * texture_size.x, in_uv_coord.y * texture_size.y);
  mat4 mvp = projection_matrix * view_matrix * model_matrix;
  out_coord = mvp * vec4(in_vert_coord, 1.0);
  gl_Position = out_coord;
}
