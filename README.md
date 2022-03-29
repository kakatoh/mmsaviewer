### Overview

This is a TypeScript/WebGL project that seeks to make large MSA data viewable smoothly in modern web browsers.

This fork of the project is no longer maintained, but other forks may be.


### Features

* Code
    * Open source
    * Version-controlled with Git
    * No special server code required
    * License: MIT
* Compatibility
    * Chrome (Windows, Mac, Android, and iOS)
    * Firefox (Windows, Mac, Android, and iOS)
    * Safari (Mac, iOS)
    * Edge (Windows)
* MSA
    * Protein residue and nucleotide alignment display
    * Alignment data is split into data textures and cached on the GPU using WebGL
    * Many different color schemes can be selected by the user
    * Zoom-in/zoom-out with mouse wheel
    * Support for special coloring by conservation/etc.
    * Pinch/zoom support on mobile
    * Font rendering is handled using multi-channel signed distance fields
    * Label view with customizable width
    * Ability to share current view with others by URL


### Structure

This project makes use of a few different web technologies:

* TypeScript (JavaScript)
    * Project code is written in a variant of JavaScript called TypeScript which adds type-checking so that code is more reliable.
    * Code reformatting is done with a tool called `prettier`.
    * Dependencies are managed with Conda and NodeJS (`npm`).
    * Packaging is done using Gulp.
* WebGL
    * WebGL is used for the main window because it is the most efficient way to display many thousands of elements on screen at the same time.
* HTML5
    * Basic HTML controls (buttons, text inputs, etc.) are used where appropriate because they work quite well in small numbers and re-implementing our own versions of these things in WebGL is outside the scope of this project.


### Dependencies

This project is managed with Conda.
Most dependencies are JavaScript dependencies from NPM managed with NodeJS.
Currently Conda acts mostly as a wrapper to ensure the correct version of NodeJS.

* Conda packages
  * `conda env create -f dependencies.miniconda3.yml`
* NodeJS Packages
  * `npm install`


### Building

For convenience this project uses `make` with a simple Makefile.
The Makefile runs `build.sh`.

The output of the build system is the `build/dist` folder and a zip file of that folder tagged with the project name and current version.

Note, the font preparation script in the build process produces the metadata below:

```
char width: 24 char height: 43
max width: 24 max height: 43
chars per line: 42
rows: 23
```

If the font generation is changed (e.g. different font) then these values must be manually copied to this line of `src/main.ts`:

```
glm.vec4.set(window.MAFFTMSAViewer.State.FontInfo, 24, 43, 42, 1024);
```


### Unimplemented Feature Requests

* Make pinch to zoom work on PC
  * Desktop browsers intercept the call in order to zoom the entire page, and there's no way to prevent that from happening.


### License Information

This project has been released under MIT license.
Please see the `LICENSE.md` file for more information.

Copyright © 2022 RIKEN
