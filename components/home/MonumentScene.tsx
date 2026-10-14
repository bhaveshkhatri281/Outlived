"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

/*
 * The Monument: the hero figure on a WebGL plane.
 *  - fold shader: diagonal creases displaced in the vertex shader, shaded per facet; unfolds on load
 *  - noise-displacement dissolve between front → side → back, driven by scroll
 *  - a cone of light with drifting dust (instanced points, additive)
 *  - depth parallax from the pointer
 * Units: the camera is placed so 1 world unit = 1 CSS pixel, origin at the stage centre.
 */

const FIGURE_VERT = /* glsl */ `
uniform float uFold;
uniform vec2 uSize;
varying vec2 vUv;
varying float vShade;
void main() {
  vUv = uv;
  vec3 p = position;
  vec2 dir = normalize(vec2(0.62, 1.0));
  float t = dot(uv - 0.5, dir) * 7.0;
  float f = fract(t) - 0.5;
  float tri = abs(f) - 0.25;
  p.z += tri * uFold * uSize.y * 0.22;
  p.x *= 1.0 - 0.1 * uFold;
  p.y *= 1.0 - 0.04 * uFold;
  vShade = (f > 0.0 ? 1.0 : -1.0) * uFold;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FIGURE_FRAG = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uP;
uniform float uReveal;
uniform float uTime;
varying vec2 vUv;
varying float vShade;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float n = fbm(uv * vec2(3.2, 5.6) + 7.0);
  // Erosion runs top to bottom, broken up by noise.
  n = mix(n, 1.0 - uv.y, 0.45);
  float w = 0.07;
  float p = uP * (1.0 + 2.0 * w) - w;
  float e = smoothstep(p - w, p + w, n);
  // A little displacement around the eroding edge.
  float near = 1.0 - smoothstep(0.0, w * 1.6, abs(n - p));
  vec2 duv = uv + vec2(near * 0.012 * sin(uv.y * 60.0 + uTime), 0.0);
  vec3 a = texture2D(uA, duv).rgb;
  vec3 b = texture2D(uB, duv).rgb;
  vec3 col = mix(a, b, 1.0 - e);
  float midTurn = step(0.002, uP) * step(uP, 0.998);
  col += vec3(0.93, 0.9, 0.85) * pow(near, 7.0) * 0.16 * midTurn;
  col *= 1.0 + vShade * 0.3;
  // Melt the photo backdrop into the page (same pool shape as the CSS .lit mask).
  vec2 q = (uv - vec2(0.5, 0.56)) / vec2(0.62, 0.66);
  float pool = (1.0 - smoothstep(0.42, 1.06, length(q)))
    * smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x)
    * smoothstep(1.0, 0.91, uv.y) * smoothstep(0.0, 0.18, uv.y);
  gl_FragColor = vec4(col, pool * uReveal);
}`;

const CONE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uApex;
varying vec2 vUv;
void main() {
  float y = 1.0 - vUv.y;
  float halfW = mix(0.025, 0.36, pow(y, 0.9));
  float x = abs(vUv.x - uApex);
  float cone = 1.0 - smoothstep(halfW * 0.25, halfW, x);
  float fall = smoothstep(0.0, 0.18, y) * (1.0 - 0.55 * smoothstep(0.55, 1.0, y));
  float breathe = 0.9 + 0.1 * sin(uTime * 0.6);
  float floorGlow = (1.0 - smoothstep(0.0, 0.22, length((vUv - vec2(uApex, 0.06)) * vec2(1.0, 3.2)))) * 0.6;
  float a = (cone * fall + floorGlow) * 0.16 * breathe;
  gl_FragColor = vec4(vec3(0.93, 0.9, 0.84), a);
}`;

const PLAIN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const DUST_VERT = /* glsl */ `
attribute vec3 aCone; // x: -1..1 across the beam, y: 0..1 down the beam, z: seed
uniform float uTime;
uniform float uTop;
uniform float uHeight;
uniform float uApexX;
uniform float uBaseHalf;
uniform float uDpr;
varying float vAlpha;
void main() {
  float seed = aCone.z;
  float v = fract(aCone.y - uTime * (0.006 + 0.012 * seed));
  float halfW = mix(uBaseHalf * 0.07, uBaseHalf, v);
  float x = uApexX + aCone.x * halfW * 0.85 + sin(uTime * 0.25 + seed * 40.0) * 10.0;
  float y = uTop - v * uHeight;
  float z = (seed - 0.5) * 260.0;
  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + seed * 2.2) * uDpr;
  float tw = 0.45 + 0.55 * sin(uTime * (0.4 + seed) + seed * 30.0);
  vAlpha = tw * smoothstep(0.0, 0.12, v) * (1.0 - smoothstep(0.75, 1.0, v)) * (1.0 - abs(aCone.x) * 0.6);
}`;

const DUST_FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.42;
  gl_FragColor = vec4(vec3(0.95, 0.92, 0.86), a);
}`;

export type MonumentProps = {
  textures: [string, string, string];
  stageRef: RefObject<HTMLElement | null>;
  figureRef: RefObject<HTMLElement | null>;
  /** 0 = front, 1 = side, 2 = back (continuous). */
  progress: RefObject<number>;
  /** Pointer, -1..1 on each axis (already smoothed). */
  pointer: RefObject<{ x: number; y: number }>;
  /** Start fully creased and wait for the entry ritual to open. */
  waitForGate: boolean;
  active: boolean;
  onReady: () => void;
  onSlow: () => void;
};

export default function MonumentScene(props: MonumentProps) {
  return (
    <Canvas
      flat
      linear
      dpr={[1, 1.75]}
      frameloop={props.active ? "always" : "never"}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance", premultipliedAlpha: false }}
      camera={{ fov: 30, near: 1, far: 10000, position: [0, 0, 1000] }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}

function Scene({ textures, stageRef, figureRef, progress, pointer, waitForGate, onReady, onSlow }: MonumentProps) {
  const { size, camera } = useThree();
  const maps = useLoader(THREE.TextureLoader, textures);
  const figure = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.Group>(null);
  const cone = useRef<THREE.Mesh>(null);
  const rect = useRef({ x: 0, y: 0, w: 1, h: 1 });
  const state = useRef({ fold: waitForGate ? 1 : 0.55, unfoldAt: waitForGate ? -1 : 0, revealAt: 0, ready: false, smooth: 0, frames: [] as number[], judged: false });

  maps.forEach((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
  });

  const figureMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FIGURE_VERT,
        fragmentShader: FIGURE_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uA: { value: maps[0] },
          uB: { value: maps[1] },
          uP: { value: 0 },
          uFold: { value: 1 },
          uReveal: { value: 0 },
          uTime: { value: 0 },
          uSize: { value: new THREE.Vector2(1, 1) },
        },
      }),
    [maps],
  );
  const coneMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLAIN_VERT,
        fragmentShader: CONE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uApex: { value: 0.5 } },
      }),
    [],
  );
  const mobile = size.width < 768;
  const dust = useMemo(() => {
    const count = mobile ? 220 : 460;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = Math.random() * 2 - 1;
      arr[i * 3 + 1] = Math.random();
      arr[i * 3 + 2] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("aCone", new THREE.BufferAttribute(arr, 3));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: 0 },
        uHeight: { value: 1 },
        uApexX: { value: 0 },
        uBaseHalf: { value: 200 },
        uDpr: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
      },
    });
    return { geometry: g, material: m };
  }, [mobile]);

  // 1 world unit = 1 CSS px.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.z = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    cam.updateProjectionMatrix();
  }, [camera, size]);

  // Align the plane with the DOM figure (the first-paint image) so the swap is invisible.
  useEffect(() => {
    const measure = () => {
      const s = stageRef.current?.getBoundingClientRect();
      const f = figureRef.current?.getBoundingClientRect();
      if (!s || !f) return;
      rect.current = {
        x: f.left + f.width / 2 - (s.left + s.width / 2),
        y: -(f.top + f.height / 2 - (s.top + s.height / 2)),
        w: f.width,
        h: f.height,
      };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [size, stageRef, figureRef]);

  // The entry ritual opening triggers the unfold.
  useEffect(() => {
    if (!waitForGate) return;
    const open = () => (state.current.unfoldAt = performance.now());
    // The gate may already have opened while three.js was still loading.
    if (document.documentElement.dataset.gate !== "pending") {
      open();
      return;
    }
    window.addEventListener("outlived:gate-open", open, { once: true });
    return () => window.removeEventListener("outlived:gate-open", open);
  }, [waitForGate]);

  useEffect(() => () => {
    figureMat.dispose();
    coneMat.dispose();
    dust.geometry.dispose();
    dust.material.dispose();
  }, [figureMat, coneMat, dust]);

  useFrame((_, delta) => {
    const st = state.current;
    const now = performance.now();
    const t = now / 1000;
    const r = rect.current;

    if (!st.ready) {
      st.ready = true;
      st.revealAt = now;
      if (st.unfoldAt === 0) st.unfoldAt = now + 120;
      onReady();
    }

    // Unfold: expo.out over 1.4s.
    let fold = st.fold;
    if (st.unfoldAt > 0) {
      const k = Math.min(1, (now - st.unfoldAt) / 1400);
      fold = st.fold * Math.pow(2, -10 * k) * (1 - k);
    }
    const reveal = Math.min(1, (now - st.revealAt) / 350);

    // Scroll turn, smoothed.
    st.smooth += ((progress.current ?? 0) - st.smooth) * Math.min(1, delta * 9);
    const s = Math.max(0, Math.min(2, st.smooth));
    const idx = Math.min(1, Math.floor(s));
    const u = figureMat.uniforms;
    u.uA.value = maps[idx];
    u.uB.value = maps[idx + 1];
    u.uP.value = s - idx;
    u.uFold.value = fold;
    u.uReveal.value = reveal;
    u.uTime.value = t;
    u.uSize.value.set(r.w, r.h);

    const px = pointer.current?.x ?? 0;
    const py = pointer.current?.y ?? 0;
    if (figure.current) {
      figure.current.position.set(r.x + px * 4, r.y - py * 3, 0);
      figure.current.scale.set(r.w, r.h, 1);
    }
    if (light.current) light.current.position.set(px * 12, -py * 8, 0);

    // Cone: apex above the figure's head, base wider than the figure.
    const stageH = size.height;
    if (cone.current) {
      cone.current.scale.set(size.width * 1.3, stageH, 1);
      cone.current.position.set(0, 0, -1);
      coneMat.uniforms.uApex.value = 0.5 + r.x / (size.width * 1.3);
      coneMat.uniforms.uTime.value = t;
    }
    const du = dust.material.uniforms;
    du.uTime.value = t;
    du.uTop.value = stageH / 2;
    du.uHeight.value = stageH;
    du.uApexX.value = r.x;
    du.uBaseHalf.value = Math.max(r.w * 0.75, 160);

    // Performance guard: if the first ~2s run under 40fps, fall back to the CSS hero.
    if (!st.judged && reveal >= 1) {
      st.frames.push(delta);
      if (st.frames.length >= 120) {
        st.judged = true;
        const avg = st.frames.reduce((a, b) => a + b, 0) / st.frames.length;
        if (avg > 1 / 40) onSlow();
      }
    }
  });

  return (
    <>
      <group ref={light}>
        <mesh ref={cone} renderOrder={2} material={coneMat}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <points geometry={dust.geometry} material={dust.material} renderOrder={3} frustumCulled={false} />
      </group>
      <mesh ref={figure} material={figureMat} renderOrder={1}>
        <planeGeometry args={[1, 1, 48, 90]} />
      </mesh>
    </>
  );
}
