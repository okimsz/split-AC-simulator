// MODEL: scalar state, motion and telemetry share these values.
const TAU = Math.PI * 2;
const state = {
  on: true,
  room: 28,
  ambient: 35,
  setpoint: 22,
  load: 0.72,
  heatGain: 0.4,
  area: 1,
  conductivity: 205,
  fanMode: "auto",
  speed: 0.03,
  view: "cutaway",
  explode: 0,
  cut: 1,
  selected: "compressor",
  labels: true,
  tour: false,
  autoIdle: true,
  lastInput: performance.now(),
  angle: 0,
  fanAngle: 0,
  outAngle: 0,
  flowPhase: 0,
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
  lerp = (a, b, t) => a + (b - a) * t;
function finEfficiency(k) {
  const mL = Math.sqrt((2 * 35) / (k * 0.00015)) * 0.025;
  return Math.tanh(mL) / mL;
}
function operating(dt) {
  const demand = state.on
    ? clamp((state.room - state.setpoint) * 0.18, 0, 1)
    : 0;
  state.load = lerp(state.load, demand, 1 - Math.exp(-dt * 0.65));
  if (state.load < 0.0001) state.load = 0;
  const fanFactor =
    state.fanMode === "auto"
      ? lerp(0.45, 1, state.load)
      : Number(state.fanMode);
  const rpm = state.load > 0 ? state.load * 5400 : 0,
    indoorRPM = state.on ? fanFactor * 1000 : 0,
    outdoorRPM = state.load * 820;
  const evaporating = 9 - 3 * state.load,
    condensing = state.ambient + 12 * state.load;
  const cop = clamp(
    (0.43 * (evaporating + 273.15)) / Math.max(15, condensing - evaporating),
    2.2,
    5.8,
  );
  const cooling =
    ((3.5 * state.area * finEfficiency(state.conductivity)) /
      finEfficiency(205)) *
    state.load *
    (0.7 + 0.3 * fanFactor) *
    clamp(1 - (state.ambient - 35) * 0.012, 0.8, 1.2);
  const watts =
    cooling / cop + (state.on ? 0.035 * fanFactor : 0) + 0.025 * state.load;
  state.room +=
    (((state.ambient - state.room) * 0.045 + state.heatGain - cooling) / 90) *
    dt;
  const equal = 9.5 * Math.exp(0.027 * (state.room - 7));
  const low = lerp(
      equal,
      9.5 * Math.exp(0.027 * (evaporating - 7)),
      state.load,
    ),
    high = lerp(equal, 9.5 * Math.exp(0.027 * (condensing - 7)), state.load);
  state.angle = (state.angle + (rpm / 60) * TAU * state.speed * dt) % TAU;
  state.fanAngle =
    (state.fanAngle + (indoorRPM / 60) * TAU * state.speed * dt) % TAU;
  state.outAngle =
    (state.outAngle + (outdoorRPM / 60) * TAU * state.speed * dt) % TAU;
  state.flowPhase = (state.flowPhase + state.load * state.speed * dt * 2) % 1;
  return {
    rpm,
    indoorRPM,
    outdoorRPM,
    cooling,
    watts,
    rejected: cooling + watts,
    cop: watts > 0 ? cooling / watts : 0,
    low,
    high,
  };
}

export { state, TAU, clamp, lerp, finEfficiency, operating };
