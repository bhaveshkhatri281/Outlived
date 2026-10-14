/**
 * One shared WebGL canvas that sits over whichever product image is hovered
 * (`[data-gl-hover]`, current image URL in `data-gl-src`) and redraws it with
 * a liquid displacement that follows the cursor plus a slight RGB split
 * toward the edges. Raw WebGL1, no dependencies: ~1 draw call per frame, and
 * the loop stops entirely when nothing is hovered.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uHover;
uniform float uTime;
uniform vec2 uMouse;
uniform float uAspect;
uniform vec2 uCover; // object-fit: cover, anchored top
varying vec2 vUv;

vec3 sampleRGB(sampler2D t, vec2 uv, float s) {
  return vec3(texture2D(t, uv + vec2(s, 0.0)).r, texture2D(t, uv).g, texture2D(t, uv - vec2(s, 0.0)).b);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 d = uv - uMouse;
  d.x *= uAspect;
  float r = length(d);
  float fall = smoothstep(0.32, 0.0, r) * uHover;
  float ripple = sin(r * 34.0 - uTime * 2.6) * 0.0045 * fall;
  vec2 dir = d / max(r, 0.0001);
  uv -= dir * (ripple + fall * 0.018);
  float edge = smoothstep(0.18, 0.5, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
  float split = (0.0015 + 0.006 * edge + 0.004 * fall) * uHover;
  uv = vec2(0.5 + (uv.x - 0.5) * uCover.x, uv.y * uCover.y);
  vec3 col = mix(sampleRGB(uA, uv, split), sampleRGB(uB, uv, split), uMix);
  gl_FragColor = vec4(col, 1.0);
}`;

type Tex = { tex: WebGLTexture; ready: boolean };

export function createHoverGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return { destroy() {} };

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uA = u("uA"), uB = u("uB"), uMix = u("uMix"), uHover = u("uHover"), uTime = u("uTime"), uMouse = u("uMouse"), uAspect = u("uAspect"), uCover = u("uCover");
  gl.uniform1i(uA, 0);
  gl.uniform1i(uB, 1);

  const cache = new Map<string, Tex>();
  const texture = (src: string): Tex => {
    let t = cache.get(src);
    if (t) return t;
    const tex = gl.createTexture()!;
    t = { tex, ready: false };
    cache.set(src, t);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t!.ready = true;
    };
    img.src = src;
    return t;
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let target: HTMLElement | null = null;
  let hovering = false;
  let hover = 0;
  let srcA = "", srcB = "";
  let mix = 1;
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let raf = 0;
  let running = false;
  const t0 = performance.now();

  const release = () => {
    if (target) delete target.dataset.glActive;
    target = null;
    canvas.style.opacity = "0";
    running = false;
  };

  const frame = () => {
    if (!target || !target.isConnected) return release();
    hover += ((hovering ? 1 : 0) - hover) * 0.12;
    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;
    const next = target.dataset.glSrc ?? "";
    if (next && next !== srcB) {
      srcA = srcB || next;
      srcB = next;
      mix = srcA === srcB ? 1 : 0;
    }
    mix = Math.min(1, mix + 0.09);
    if (!hovering && hover < 0.01) return release();

    const a = texture(srcA), b = texture(srcB);
    const rect = target.getBoundingClientRect();
    if (a.ready && b.ready && rect.width > 0) {
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      canvas.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, b.tex);
      gl.uniform1f(uMix, mix);
      gl.uniform1f(uHover, hover);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      const frameAspect = rect.width / rect.height;
      const imgAspect = Number(target.dataset.glAspect) || frameAspect;
      if (frameAspect > imgAspect) gl.uniform2f(uCover, 1, imgAspect / frameAspect);
      else gl.uniform2f(uCover, frameAspect / imgAspect, 1);
      gl.uniform1f(uAspect, frameAspect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.style.opacity = "1";
      target.dataset.glActive = "1";
    }
    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-gl-hover]") ?? null;
    if (el !== target && el) {
      if (target) delete target.dataset.glActive;
      target = el;
      srcA = srcB = el.dataset.glSrc ?? "";
      mix = 1;
      hover = 0;
      const r = el.getBoundingClientRect();
      mouse.x = mouse.tx = (e.clientX - r.left) / r.width;
      mouse.y = mouse.ty = (e.clientY - r.top) / r.height;
    }
    hovering = !!el;
    if (target) {
      const r = target.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = (e.clientY - r.top) / r.height;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
  };
  const onDown = () => (hovering = false); // let navigation snapshots use the DOM image

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      release();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
