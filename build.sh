#!/bin/sh

#Clean build folder
rm -rf build
mkdir -p build/dist

#Build font texture for Meslo for MSA field
mkdir -p build/dist/img
npx msdf-bmfont -f json -s 36 -m 1024,1024 lib/font_meslo/MesloLGSDZ-Regular.ttf
cp lib/font_meslo/MesloLGSDZ-Regular.json build/dist/img/meslo_lg_s_dz_atlas.json
cp lib/font_meslo/MesloLGSDZ-Regular.png build/dist/img/meslo_lg_s_dz_atlas.png
node build_font.js

#Build font texture for Spline Sans for label view
npx msdf-bmfont -f json -s 64 -m 1024,1024 lib/font_spline_sans/static/SplineSans-Regular.ttf
cp  lib/font_spline_sans/static/SplineSans-Regular.json build/dist/img/spline_sans_atlas.json
cp  lib/font_spline_sans/static/SplineSans-Regular.png build/dist/img/spline_sans_atlas.png

#Compress HTML templates
mkdir -p build/dist/html
zip -j build/dist/html/templates.zip templates/*.html

#Copy shaders
mkdir -p build/dist/glsl
cp -a lib/glsl/* build/dist/glsl/

#Copy sample inputs
cp -a lib/sample_inputs build/dist/

#Copy HTML index file
cp -a lib/html/index.html build/dist/index.html

#Copy version file
cp -a templates/version.html build/dist/VERSION

#Copy license information
cp -a LICENSE.md build/dist/
cp -a LICENSE_NOTICES build/dist/

#Build JS/CSS bundles with gulp
npm run build

#Copy and compress build folder
export BUILDTAG=MAFFTMSAViewer_$(cat VERSION)
cd build
cp -a dist ${BUILDTAG}
zip -r ${BUILDTAG}.zip ${BUILDTAG}
