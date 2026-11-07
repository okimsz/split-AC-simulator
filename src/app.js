import {
  state,
  TAU,
  clamp,
  lerp,
  finEfficiency,
  operating,
} from "./physics.js";
import { createWorld } from "./scene.js";
import { descriptions } from "./components.js";

const $ = (id) => document.getElementById(id);
const {
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
} = createWorld(selectPart);

function activity() {
  state.lastInput = performance.now();
  state.tour = false;
  syncTour();
}
function selectPart(name) {
  activity();
  state.selected = name;
  const d = descriptions[name];
  $("partKicker").textContent = d[0];
  $("partTitle").textContent = d[1];
  $("partDescription").textContent = d[2];
  document.querySelectorAll(".cycle").forEach((el) => {
    el.classList.toggle("selected", el.dataset.part === name);
    el.setAttribute("aria-pressed", el.dataset.part === name);
  });
  if (state.view === "assembled") setView("cutaway");
  const focus = {
    compressor: [2.65, 1.3, 0.1, 6.6],
    condenser: [1.8, 1.4, 0, 8],
    expansion: [2.95, 0.8, 0.3, 6.2],
    evaporator: [-2.15, 3.05, 0, 7.5],
    blower: [-2.15, 2.8, 0, 7],
    fan: [1.57, 1.24, 0.2, 7],
  }[name];
  camTarget.set(...focus.slice(0, 3));
  desiredRadius = focus[3];
  desiredTheta = 0.32;
  desiredPhi = 1.05;
}
function setView(view) {
  activity();
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-pressed", b.dataset.view === view);
  });
  $("modeText").textContent = view.toUpperCase() + " VIEW";
  home();
}
function syncTour() {
  $("tour").classList.toggle("active", state.tour);
  $("tour").setAttribute("aria-pressed", state.tour);
  $("cameraText").textContent = state.tour
    ? "Cinematic orbit · drag to take control"
    : state.autoIdle
      ? "Auto-tour after 12 seconds idle"
      : "Manual camera · auto-tour disabled";
}
function toggleTour() {
  state.tour = !state.tour;
  state.autoIdle = state.tour;
  state.lastInput = performance.now();
  if (state.tour) home(false);
  syncTour();
}
function togglePower() {
  activity();
  state.on = !state.on;
  $("power").classList.toggle("off", !state.on);
  $("power").setAttribute("aria-pressed", state.on);
  $("power").innerHTML = state.on
    ? "⏻ &nbsp; System on"
    : "⏻ &nbsp; System off";
}
// CAMERA: spherical orbit with exponential easing; direct drag cancels the tour.
const target = new THREE.Vector3(0, 1.9, 0),
  camTarget = target.clone();
let theta = 0.35,
  phi = 1.1,
  radius = 14.3,
  desiredTheta = theta,
  desiredPhi = phi,
  desiredRadius = radius;
function home(interact = true) {
  if (interact) activity();
  camTarget.set(0, 1.95, 0);
  desiredTheta = 0.32;
  desiredPhi = 1.1;
  desiredRadius = state.view === "exploded" ? 17.5 : 14.3;
}
let lastTime = performance.now(),
  lastUI = 0,
  airPhase = 0,
  motionTime = 0;
function resize() {
  const w = host.clientWidth,
    h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(host);
resize();
function render(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  const data = operating(dt),
    ease = 1 - Math.exp(-dt * 5);
  state.explode = lerp(state.explode, state.view === "exploded" ? 1 : 0, ease);
  state.cut = lerp(state.cut, state.view === "assembled" ? 0 : 1, ease);
  for (const c of covers) {
    c.obj.position.copy(c.base).addScaledVector(c.offset, state.explode);
    c.obj.visible = state.view === "exploded" || state.cut < 0.95;
  }
  outerFull.visible = state.view === "assembled";
  shell.visible = !outerFull.visible;
  fins.scale.y = state.area;
  cf.scale.y = state.area;
  blower.rotation.x = -state.fanAngle;
  fan.rotation.z = -state.outAngle;
  const e = 0.075,
    r = 0.18,
    cx = e * Math.cos(state.angle),
    cz = e * Math.sin(state.angle);
  roller.position.set(cx, 0.285, cz);
  roller.rotation.y = (-state.angle * e) / r;
  eccentric.position.set(cx, 0.32, cz);
  const hit = cz + Math.sqrt(Math.max(0, r * r - cx * cx)),
    len = 0.32 - hit;
  vane.scale.z = len / 0.1;
  vane.position.z = (0.32 + hit) / 2;
  motionTime += dt * state.speed;
  louver.rotation.x = state.on ? -0.22 - Math.sin(motionTime * 0.35) * 0.15 : 0;
  routes.forEach((p) =>
    p.beads.forEach((b, i) => {
      b.visible = state.load > 0.005;
      b.position.copy(
        p.curve.getPointAt((state.flowPhase + i / p.beads.length) % 1),
      );
    }),
  );
  airPhase += (data.indoorRPM / 1000) * state.speed * dt * 5;
  air.forEach((a) => {
    const t = (airPhase + a.i * 0.131) % 1;
    if (a.type === "in") {
      a.m.visible = state.on;
      a.m.position.set(-3.4 + (a.i % 6) * 0.48, 2.52 - t * 0.55, 0.5 + t * 0.8);
      a.m.rotation.x = 2.2;
    } else {
      a.m.visible = state.load > 0.01;
      a.m.position.set(
        1.57 + Math.cos(a.i * 2.4) * 0.45,
        1.24 + Math.sin(a.i * 2.4) * 0.45,
        0.7 + t * 1.1,
      );
    }
  });
  if (!state.tour && state.autoIdle && now - state.lastInput > 12000) {
    state.tour = true;
    home(false);
    syncTour();
  }
  if (state.tour) {
    desiredTheta += dt * 0.085;
    desiredPhi = 1.05 + Math.sin(now * 0.00015) * 0.1;
  }
  theta = lerp(theta, desiredTheta, ease);
  phi = lerp(phi, desiredPhi, ease);
  radius = lerp(radius, desiredRadius, ease);
  target.lerp(camTarget, ease);
  // Fit both units on portrait screens without sacrificing their scale relationship.
  const fit = Math.max(1, 1 / camera.aspect);
  camera.position.set(
    target.x + radius * fit * Math.sin(phi) * Math.sin(theta),
    target.y + radius * fit * Math.cos(phi),
    target.z + radius * fit * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  labelItems.forEach((item) => {
    const pos = item.g.localToWorld(item.p.clone()).project(camera),
      x = (pos.x * 0.5 + 0.5) * host.clientWidth,
      y = (-pos.y * 0.5 + 0.5) * host.clientHeight;
    item.el.style.left = x + "px";
    item.el.style.top = y + "px";
    item.el.classList.toggle(
      "hide",
      !state.labels ||
        (item.part !== state.selected &&
          (pos.z > 1 ||
            pos.z < -1 ||
            x < 55 ||
            x > host.clientWidth - 55 ||
            y < 190 ||
            y > host.clientHeight - 110)),
    );
    item.el.classList.toggle("selected", item.part === state.selected);
  });
  renderer.render(scene, camera);
  if (now - lastUI > 140) {
    lastUI = now;
    $("finEfficiency").textContent =
      "Fin efficiency: " +
      (finEfficiency(state.conductivity) * 100).toFixed(1) +
      " % · effective area " +
      (state.area * 100).toFixed(0) +
      " %";
    $("rpm").textContent = Math.round(data.rpm).toLocaleString("en-US");
    $("room").textContent = state.room.toFixed(1);
    $("low").textContent = data.low.toFixed(1);
    $("high").textContent = data.high.toFixed(1);
    $("cooling").textContent = data.cooling.toFixed(2) + " kW";
    $("powerValue").textContent = data.watts.toFixed(2) + " kW";
    $("rejected").textContent = data.rejected.toFixed(2) + " kW";
    $("cop").textContent = data.watts > 0 ? data.cop.toFixed(2) : "—";
    $("loadbar").style.width = state.load * 100 + "%";
    $("runText").textContent = !state.on
      ? state.load > 0.01
        ? "SPINNING DOWN"
        : "OFF"
      : state.load > 0.02
        ? "COOLING"
        : "SETPOINT REACHED";
  }
  window.SIM.telemetry = data;
  requestAnimationFrame(render);
}
// INPUT: pointer capture, ray picking and pinch-to-zoom work from file://.
const pointers = new Map();
let dragStart = null,
  moved = false,
  pinch = 0;
host.addEventListener("pointerdown", (e) => {
  activity();
  host.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragStart = { x: e.clientX, y: e.clientY };
  moved = false;
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    moved = true;
  }
});
host.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  activity();
  const prev = pointers.get(e.pointerId);
  if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 4)
    moved = true;
  if (pointers.size === 1) {
    desiredTheta -= (e.clientX - prev.x) * 0.006;
    desiredPhi = clamp(desiredPhi - (e.clientY - prev.y) * 0.006, 0.35, 1.65);
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const p = [...pointers.values()],
      d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    desiredRadius = clamp((desiredRadius * pinch) / Math.max(d, 1), 4, 24);
    pinch = d;
  }
});
const ray = new THREE.Raycaster();
host.addEventListener("pointerup", (e) => {
  if (!moved && pointers.size === 1) {
    const rect = host.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(pickables).find((h) => {
      let p = h.object;
      while (p) {
        if (!p.visible) return false;
        p = p.parent;
      }
      return true;
    });
    if (hit) selectPart(hit.object.userData.part);
  }
  pointers.delete(e.pointerId);
});
host.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));
host.addEventListener("lostpointercapture", (e) =>
  pointers.delete(e.pointerId),
);
host.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    activity();
    desiredRadius = clamp(desiredRadius * Math.exp(e.deltaY * 0.001), 4, 24);
  },
  { passive: false },
);
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
document
  .querySelectorAll("[data-part]")
  .forEach((b) => (b.onclick = () => selectPart(b.dataset.part)));
$("power").onclick = togglePower;
$("tour").onclick = toggleTour;
$("reset").onclick = () => home();
$("labelsToggle").onclick = () => {
  activity();
  state.labels = !state.labels;
  $("labelsToggle").classList.toggle("active", state.labels);
  $("labelsToggle").setAttribute("aria-pressed", state.labels);
};
for (const id of ["setpoint", "ambient"])
  $(id).oninput = () => {
    activity();
    state[id] = Number($(id).value);
    $(id + "Value").textContent = state[id] + " °C";
  };
$("speed").oninput = () => {
  activity();
  const v = Number($("speed").value);
  state.speed = v === 0 ? 0 : Math.pow(10, (v - 100) / 50);
  $("speedValue").textContent =
    state.speed === 0 ? "Paused" : state.speed.toFixed(2) + "×";
};
$("fan").onchange = () => {
  activity();
  state.fanMode = $("fan").value === "0.85" ? "auto" : Number($("fan").value);
};
$("heatGain").oninput = () => {
  activity();
  state.heatGain = Number($("heatGain").value);
  $("heatGainValue").textContent = state.heatGain.toFixed(2) + " kW";
};
$("area").oninput = () => {
  activity();
  state.area = Number($("area").value) / 100;
  $("areaValue").textContent = Math.round(state.area * 100) + " %";
};
$("material").onchange = () => {
  activity();
  state.conductivity = Number($("material").value);
  M.fin.color.set(
    state.conductivity === 385
      ? "#ba885b"
      : state.conductivity === 50
        ? "#828c89"
        : "#739496",
  );
};
$("help").onclick = $("modelInfo").onclick = () => {
  activity();
  $("guide").showModal();
};
$("closeGuide").onclick = () => $("guide").close();
document.addEventListener("keydown", (e) => {
  if (
    $("guide").open ||
    /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePower();
  }
  if (e.key === "1") setView("assembled");
  if (e.key === "2") setView("cutaway");
  if (e.key === "3") setView("exploded");
  if (e.key.toLowerCase() === "t") toggleTour();
  if (e.key.toLowerCase() === "r") home();
});
document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  state.lastInput = lastTime;
});
window.SIM = {
  state,
  scene,
  camera,
  renderer,
  parts,
  operating,
  setView,
  selectPart,
  telemetry: null,
  ready: true,
};
requestAnimationFrame(render);
