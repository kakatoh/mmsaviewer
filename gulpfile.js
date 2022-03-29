var gulp = require("gulp");

var ts = require("gulp-typescript");
gulp.task("ts_compile", function () {
  return gulp
    .src(["src/*", "src/*/*", "templates/*.ts"], { base: "." })
    .pipe(
      ts({
        target: "ES6",
        moduleResolution: "node",
        module: "commonjs",
        allowJs: false,
        noImplicitAny: true,
        noEmitOnError: true,
      })
    )
    .pipe(gulp.dest("build/ts"));
});

var browserify = require("browserify");
var uglify = require("gulp-uglify");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
gulp.task("ts_package", function () {
  return browserify("build/ts/src/index.js")
    .bundle()
    .pipe(source("index.js"))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest("build/dist/js"));
});

var concatCss = require("gulp-concat-css");
var cleanCSS = require('gulp-clean-css');
gulp.task("all_css", function () {
  return gulp
    .src(["node_modules/bootstrap/dist/css/bootstrap.css", "lib/css/*.css"])
    .pipe(concatCss("msa_viewer_bundle.css", { rebaseUrls: false }))
    .pipe(cleanCSS())
    .pipe(gulp.dest("build/dist/css/"));
});

gulp.task("ts", gulp.series("ts_compile", "ts_package"));
gulp.task("default", gulp.parallel("ts", "all_css"));
