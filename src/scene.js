import { TAU } from "./physics.js";

/** Build procedural geometry once; return the objects animated by app.js. */
export function createWorld(onSelect) {
  const $ = (id) => document.getElementById(id);
  // GEOMETRY: 4 scene units per metre. Relative outer envelopes follow references.
  const host = $("viewport"),
    scene = new THREE.Scene();
  scene.background = new THREE.Color("#f0f2eb");
  scene.fog = new THREE.Fog("#f0f2eb", 23, 45);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (e) {
    host.innerHTML =
      '<div class="error">WebGL is unavailable. Enable hardware acceleration in your browser, then reopen this file.</div>';
    throw e;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4bfa6, 2.5));
  const sun = new THREE.DirectionalLight(0xfff9ed, 3.2);
  sun.position.set(-4, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -9,
    right: 9,
    top: 8,
    bottom: -8,
    near: 0.5,
    far: 25,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc5e1e2, 1.6);
  fill.position.set(5, 4, -4);
  scene.add(fill);
  const mat = (color, metalness = 0, roughness = 0.5, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const M = {
    shell: mat("#edeedc", 0.15, 0.32),
    edge: mat("#a8b2a2", 0.5, 0.4),
    dark: mat("#344b46", 0.5, 0.36),
    steel: mat("#a6b9bb", 0.8, 0.26),
    fin: mat("#739496", 0.65, 0.43),
    copper: mat("#b87a48", 0.7, 0.3),
    cold: mat("#299eac", 0.45, 0.26),
    hot: mat("#d57950", 0.45, 0.28),
    liquid: mat("#c49c4b", 0.5, 0.3),
    blade: mat("#445b50", 0.4, 0.35),
    white: mat("#f9f8ef", 0.1, 0.4),
    green: mat("#42774d", 0.4, 0.4),
  };
  const parts = {},
    pickables = [],
    covers = [],
    labelItems = [];
  function group(name, parent = scene) {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  }
  function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, m, p, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  }
  function cyl(r, h, m, p, x = 0, y = 0, z = 0, r2 = r) {
    return mesh(new THREE.CylinderGeometry(r, r2, h, 40), m, p, x, y, z);
  }
  function pipe(points, material, parent = scene, r = 0.035) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "centripetal",
    );
    const obj = mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(24, points.length * 10),
        r,
        8,
        false,
      ),
      material,
      parent,
    );
    return { obj, curve };
  }
  function torus(r, t, m, p, x = 0, y = 0, z = 0) {
    return mesh(new THREE.TorusGeometry(r, t, 8, 64), m, p, x, y, z);
  }
  function tagPart(g, name) {
    g.traverse((m) => {
      if (m.isMesh) {
        m.userData.part = name;
        pickables.push(m);
      }
    });
    parts[name] = g;
  }
  function cover(obj, offset) {
    covers.push({
      obj,
      base: obj.position.clone(),
      offset: new THREE.Vector3(...offset),
    });
    return obj;
  }
  const floor = box(200, 0.06, 200, mat("#e9ede3", 0, 0.95), scene, 0, -0.1, 0);
  const grid = new THREE.GridHelper(24, 48, 0xcfd7c7, 0xdce2d6);
  grid.position.y = -0.062;
  grid.material.transparent = true;
  grid.material.opacity = 0.48;
  scene.add(grid);
  // Indoor assembly.
  const indoor = group("Indoor unit");
  indoor.position.set(-2.15, 3.05, 0);
  box(3.112, 1.18, 0.07, M.edge, indoor, 0, 0, -0.51);
  box(3.112, 0.06, 1.088, M.white, indoor, 0, -0.56, 0);
  for (const x of [-1.53, 1.53])
    box(0.055, 1.18, 1.088, M.shell, indoor, x, 0, 0);
  const indoorCover = group("Indoor front cover", indoor);
  box(3.02, 0.82, 0.065, M.shell, indoorCover, 0, 0.16, 0.53);
  box(3.02, 0.06, 1.04, M.shell, indoorCover, 0, 0.57, 0);
  box(0.18, 0.035, 0.012, M.green, indoorCover, 1.18, -0.1, 0.57);
  cover(indoorCover, [0, 1.15, 1.05]);
  const filter = group("Washable filter", indoor);
  for (let i = 0; i < 28; i++)
    box(0.012, 0.58, 0.015, M.edge, filter, -1.42 + i * 0.105, 0.15, 0.43);
  for (let i = 0; i < 6; i++)
    box(2.94, 0.012, 0.015, M.edge, filter, 0, -0.12 + i * 0.105, 0.43);
  cover(filter, [0, 0.48, 0.55]);
  const evap = group("Evaporator", indoor);
  const fingeo = new THREE.BoxGeometry(0.012, 0.58, 0.33),
    fins = new THREE.InstancedMesh(fingeo, M.fin, 75),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 75; i++) {
    dummy.position.set(-1.4 + i * 0.038, 0.16, -0.03);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  evap.add(fins);
  fins.castShadow = true;
  fins.receiveShadow = true;
  for (let row = 0; row < 4; row++) {
    const y = -0.06 + row * 0.14;
    pipe(
      [
        [-1.43, y, 0.18],
        [0, y, 0.18],
        [1.43, y, 0.18],
      ],
      M.copper,
      evap,
      0.026,
    );
    if (row < 3)
      pipe(
        [
          [row % 2 ? -1.43 : 1.43, y, 0.18],
          [row % 2 ? -1.5 : 1.5, y + 0.07, 0.18],
          [row % 2 ? -1.43 : 1.43, y + 0.14, 0.18],
        ],
        M.copper,
        evap,
        0.026,
      );
  }
  tagPart(evap, "evaporator");
  const blower = group("Cross-flow blower", indoor);
  blower.position.set(0, -0.32, 0.03);
  const shaft = cyl(0.055, 2.85, M.steel, blower);
  shaft.rotation.z = Math.PI / 2;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU,
      b = box(
        2.8,
        0.012,
        0.07,
        M.blade,
        blower,
        0,
        Math.cos(a) * 0.145,
        Math.sin(a) * 0.145,
      );
    b.rotation.x = -a + 0.35;
  }
  for (let i = 0; i < 8; i++) {
    const disc = cyl(0.17, 0.025, M.dark, blower, -1.4 + i * 0.4, 0, 0);
    disc.rotation.z = Math.PI / 2;
  }
  tagPart(blower, "blower");
  const motor = cyl(0.13, 0.18, M.dark, indoor, 1.43, -0.32, 0.03);
  motor.rotation.z = Math.PI / 2;
  const louver = group("Outlet louver", indoor);
  louver.position.set(0, -0.49, 0.45);
  box(2.9, 0.025, 0.23, M.shell, louver);
  // Outdoor assembly.
  const outdoor = group("Outdoor unit");
  outdoor.position.set(2, 1.24, 0);
  box(3.06, 0.08, 1.14, M.edge, outdoor, 0, -1.06, 0);
  for (const x of [-1.12, 1.12])
    box(0.27, 0.18, 1.28, M.dark, outdoor, x, -1.15, 0);
  const top = box(3.06, 0.065, 1.14, M.shell, outdoor, 0, 1.07, 0);
  cover(top, [0, 1.32, 0]);
  const side = box(0.06, 2.2, 1.14, M.shell, outdoor, 1.5, 0, 0);
  cover(side, [1.2, 0, 0]);
  const left = box(0.06, 2.2, 1.14, M.shell, outdoor, -1.5, 0, 0);
  cover(left, [-0.48, 0, 0]);
  const front = group("Front grille", outdoor);
  front.position.set(0, 0, 0.59);
  box(0.9, 2.12, 0.05, M.shell, front, 1.02, 0, 0);
  box(0.16, 2.12, 0.05, M.shell, front, -1.42, 0, 0);
  box(2.15, 0.16, 0.05, M.shell, front, -0.43, 1, 0);
  box(2.15, 0.16, 0.05, M.shell, front, -0.43, -1, 0);
  for (let i = 1; i <= 10; i++)
    torus(i * 0.087, 0.009, M.edge, front, -0.43, 0, 0.02);
  for (let i = 0; i < 12; i++) {
    const spoke = box(1.78, 0.013, 0.018, M.edge, front, -0.43, 0, 0.025);
    spoke.rotation.z = (i * Math.PI) / 6;
  }
  cover(front, [0, 0, 1.65]);
  const condenser = group("Condenser coil", outdoor);
  box(2.85, 1.93, 0.15, M.dark, condenser, 0, 0, -0.48);
  const cf = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.013, 1.85, 0.17),
    M.fin,
    80,
  );
  for (let i = 0; i < 80; i++) {
    dummy.position.set(-1.38 + i * 0.035, 0, -0.35);
    dummy.updateMatrix();
    cf.setMatrixAt(i, dummy.matrix);
  }
  condenser.add(cf);
  cf.castShadow = true;
  const coilPath = [];
  for (let row = 0; row < 10; row++) {
    const y = 0.84 - row * 0.185;
    coilPath.push(
      [row % 2 ? 1.33 : -1.33, y, -0.23],
      [row % 2 ? -1.33 : 1.33, y, -0.23],
    );
  }
  pipe(coilPath, M.copper, condenser, 0.025);
  tagPart(condenser, "condenser");
  const fan = group("Axial outdoor fan", outdoor);
  fan.position.set(-0.43, 0, 0.28);
  const hub = cyl(0.16, 0.17, M.dark, fan);
  hub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0.1, -0.07);
    shape.bezierCurveTo(0.36, -0.27, 0.72, -0.3, 0.79, -0.06);
    shape.bezierCurveTo(0.8, 0.12, 0.38, 0.31, 0.13, 0.14);
    shape.closePath();
    const blade = mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.012,
      }),
      M.blade,
      fan,
    );
    blade.rotation.z = (i * TAU) / 3;
  }
  tagPart(fan, "fan");
  // Eccentric rolling-piston compressor. R = r + e ensures tangency.
  const compressor = group("Rotary compressor", outdoor);
  compressor.position.set(0.99, -0.3, 0.02);
  cyl(0.33, 0.13, M.dark, compressor, 0, -0.58, 0);
  cyl(0.29, 0.43, M.dark, compressor, 0, -0.31, 0);
  const shellMat = mat("#45605b", 0.6, 0.35, { side: THREE.DoubleSide });
  const shell = mesh(
    new THREE.CylinderGeometry(
      0.31,
      0.31,
      0.72,
      48,
      1,
      true,
      Math.PI * 0.1,
      Math.PI * 1.3,
    ),
    shellMat,
    compressor,
    0,
    0.19,
    0,
  );
  const shellLid = cyl(0.31, 0.05, M.dark, compressor, 0, 0.57, 0);
  cover(shellLid, [0.48, 0.55, 0]);
  const outerFull = cyl(0.315, 0.86, M.dark, compressor, 0, 0.12, 0);
  outerFull.name = "assembled compressor shell";
  const chamber = torus(0.255, 0.023, M.steel, compressor, 0, 0.32, 0);
  chamber.rotation.x = Math.PI / 2;
  const bottom = cyl(0.26, 0.035, M.steel, compressor, 0, 0.2, 0);
  const roller = cyl(0.18, 0.12, M.copper, compressor, 0, 0.285, 0);
  const eccentric = cyl(0.06, 0.19, M.steel, compressor, 0, 0.32, 0);
  const crank = cyl(0.032, 0.47, M.steel, compressor, 0, 0.34, 0);
  const vane = box(0.018, 0.13, 0.1, M.steel, compressor, 0, 0.285, 0.21);
  box(0.07, 0.15, 0.1, M.dark, compressor, 0, 0.285, 0.3);
  tagPart(compressor, "compressor");
  const valve = group("Expansion valve", outdoor);
  valve.position.set(1.07, -0.76, 0.32);
  cyl(0.075, 0.16, M.copper, valve);
  box(0.13, 0.1, 0.12, M.dark, valve, 0, 0.1, 0);
  tagPart(valve, "expansion");
  // Refrigerant route is a continuous circuit with exaggerated, color-coded tubing.
  scene.updateMatrixWorld(true);
  const world = (g, p = [0, 0, 0]) =>
    g.localToWorld(new THREE.Vector3(...p)).toArray();
  const ep = world(evap, [1.43, 0.36, 0.18]),
    es = world(evap, [-1.43, -0.06, 0.18]),
    cs = world(compressor, [0, 0.4, 0]),
    cd = world(condenser, [1.33, 0.84, -0.23]),
    co = world(condenser, [-1.33, -0.825, -0.23]),
    v = world(valve);
  const routes = [];
  function route(points, material) {
    const p = pipe(points, material, scene, 0.038);
    const beads = [];
    for (let i = 0; i < 12; i++) {
      const b = mesh(
        new THREE.SphereGeometry(0.052, 8, 6),
        mat(material.color, 0, 0.3, {
          emissive: material.color,
          emissiveIntensity: 0.3,
        }),
        scene,
      );
      beads.push(b);
    }
    routes.push({ ...p, beads });
  }
  route([cs, [3.0, 2.07, 0.02], [3.33, 2.2, -0.1], cd], M.hot);
  route(
    [
      cd,
      [2.9, 2.08, -0.23],
      [0.67, 1.9, -0.23],
      [0.67, 0.6, -0.23],
      co,
      [2.9, 0.39, -0.15],
      v,
    ],
    M.liquid,
  );
  route(
    [
      v,
      [3.3, 0.39, 0.58],
      [3.65, 0.5, 0.7],
      [3.65, 2.75, 0.7],
      [0.1, 2.75, 0.7],
      [0.1, 3.41, 0.18],
      ep,
    ],
    M.cold,
  );
  route(
    [ep, [-1.0, 3.41, 0.24], [-3.4, 3.41, 0.24], [-3.58, 3.13, 0.24], es],
    M.cold,
  );
  route(
    [
      es,
      [-3.85, 2.95, 0.18],
      [-3.85, 2.45, 0.7],
      [0.0, 2.45, 0.7],
      [0.3, 0.7, 0.7],
      [2.67, 0.7, 0.1],
      [2.78, 1.3, 0.02],
      cs,
    ],
    M.cold,
  );
  // Procedural airflow traces, with direction visible even in still frames.
  const air = [];
  for (let i = 0; i < 12; i++) {
    const m = mesh(
      new THREE.ConeGeometry(0.027, 0.13, 6),
      mat("#71bcc0", 0, 0.6, { transparent: true, opacity: 0.5 }),
      scene,
    );
    air.push({ m, i, type: "in" });
  }
  for (let i = 0; i < 9; i++) {
    const m = mesh(
      new THREE.ConeGeometry(0.027, 0.13, 6),
      mat("#d9a16d", 0, 0.6, { transparent: true, opacity: 0.45 }),
      scene,
    );
    m.rotation.x = Math.PI / 2;
    air.push({ m, i, type: "out" });
  }
  function label(text, g, p, part, hot = false) {
    const el = document.createElement("button");
    el.className = "label" + (hot ? " hot" : "");
    el.textContent = text;
    el.addEventListener("click", () => onSelect(part));
    $("labels").appendChild(el);
    labelItems.push({ el, g, p: new THREE.Vector3(...p), part });
  }
  label("04 / EVAPORATOR", indoor, [0, 0.74, 0.18], "evaporator");
  label("02 / CONDENSER", outdoor, [-0.65, 1.3, -0.35], "condenser", true);
  label("01 / COMPRESSOR", compressor, [0.32, 0.46, 0.18], "compressor", true);
  label("03 / EXPANSION", valve, [0.12, -0.23, 0.4], "expansion");

  return {
    host,
    scene,
    camera,
    renderer,
    M,
    parts,
    pickables,
    covers,
    labelItems,
    fins,
    cf,
    outerFull,
    shell,
    blower,
    fan,
    roller,
    eccentric,
    vane,
    louver,
    routes,
    air,
  };
}
