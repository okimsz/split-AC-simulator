# THERMAL — Split-type AC simulator

A modular JavaScript / Three.js project for VS Code. Includes the interactive model,
exploded and cutaway views, live telemetry, experiment controls, and idle camera tour.
The physics is an educational approximation; see the in-app Guide for assumptions and references.

## Open in VS Code

1. Extract the ZIP, then choose **File → Open Folder** and select `split-ac-vscode`.
2. Install Node.js 20 or newer if it is not already installed.
3. In the VS Code terminal, run `npm run dev`.
4. Open **http://127.0.0.1:5173**. Save your edits and refresh the browser.

No `npm install` is needed: the scripts use Node's built-in modules and Three.js is vendored locally.
You can also press **F5** and choose the Edge or Chrome launch configuration.
If PowerShell blocks `npm.ps1`, use `npm.cmd run dev` or `node scripts/serve.mjs`.
Stop the preview with Ctrl+C in its terminal (or terminate the VS Code preview task).

**Do not double-click `index.html`:** browsers restrict ES module loading over `file://`.
Use the local server for development, or open the already-built file in `dist/` for offline viewing.
VS Code Live Server is another option if you already have that extension.

## File map

| File | What to edit |
| --- | --- |
| `index.html` | Page structure, labels, guide, and controls |
| `src/styles.css` | Layout, colors, typography, responsive styling |
| `src/physics.js` | Shared state, thermal model, RPM, pressure estimates, and motion clocks; no DOM or Three.js dependency |
| `src/scene.js` | Lights, materials, procedural geometry, pipe routes, and component labels |
| `src/components.js` | Component descriptions |
| `src/app.js` | Animation loop, camera, interactions, and telemetry presentation |
| `src/errors.js` | Visible browser error reporting |
| `vendor/` | Pinned Three.js r160.1 and its MIT license |
| `scripts/` | Local preview server and standalone HTML builder |
| `tests/` | Physics regression tests |
| `dist/split-ac-simulator.html` | Generated single-file offline simulator |

The scene returns references to the mechanical parts. The app advances the shared physics
state, poses those parts, updates telemetry, and renders each frame. The physics model
can be tested independently of the browser. Use VS Code's Format Document command to
apply your preferred formatting when editing JavaScript.

## Build and test

```sh
npm test
npm run build
```

The build embeds CSS, Three.js, license text, and app code into **one HTML file**.
Share `dist/split-ac-simulator.html`; it opens directly without Node, a server, or internet.
Never edit `dist/` as source: rebuild it after changing the modules.
The small dependency-free builder supports this project's relative named imports and
named exports. It rejects unsupported module syntax instead of emitting a broken bundle.

## GitHub

This ZIP is ready for a new repository; it contains no Git history, account credentials,
PDF attachment, temporary test dependencies, or screenshots. `dist/` is included in the ZIP
for convenience but ignored by Git because it is generated. Build it after cloning.

Create an empty GitHub repository, then run these commands inside this project folder,
replacing the example remote with your actual URL:

```sh
git init -b main
git add .
git commit -m "Add modular split AC simulator"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Alternatively use VS Code's Source Control panel: Initialize Repository, commit, and
Publish to GitHub. Choose public or private deliberately. Authentication is handled by
GitHub/VS Code; never paste access tokens into source files or the chat.

## Third-party notice

Three.js r160.1 is bundled under the MIT license; see `vendor/three-LICENSE.txt`.
Its original source is https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js.
Reference links in the in-app Guide need internet; the simulator assets do not.
