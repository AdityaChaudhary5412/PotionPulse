import React, { useRef, useEffect } from 'react';

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec4 position;
void main() {
  gl_Position = position;
}`;

const FRAGMENT_SHADER = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*
* To explore strange new worlds, to seek out new life
* and new civilizations, to boldly go where no man has
* gone before.
*/
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

// Returns a pseudo random number for a given point (white noise)
float rnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

// Returns a pseudo random number for a given point (value noise)
float noise(in vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float
  a = rnd(i),
  b = rnd(i + vec2(1, 0)),
  c = rnd(i + vec2(0, 1)),
  d = rnd(i + 1.);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Returns a pseudo random number for a given point (fractal noise)
float fbm(vec2 p) {
  float t = .0, a = 1.; mat2 m = mat2(1., -.5, .2, 1.2);
  for (int i = 0; i < 5; i++) {
    t += a * noise(p);
    p *= 2. * m;
    a *= .5;
  }
  return t;
}

float clouds(vec2 p) {
  float d = 1., t = .0;
  for (float i = .0; i < 3.; i++) {
    float a = d * fbm(i * 10. + p.x * .2 + .2 * (1. + i) * p.y + d + i * i + p);
    t = mix(t, d, a);
    d = a;
    p *= 2. / (i + 1.);
  }
  return t;
}

void main(void) {
  vec2 uv = (FC - .5 * R) / MN, st = uv * vec2(2, 1);
  vec3 col = vec3(0);
  float bg = clouds(vec2(st.x + T * .5, -st.y));
  uv *= 1. - .3 * (sin(T * .2) * .5 + .5);
  for (float i = 1.; i < 12.; i++) {
    uv += .1 * cos(i * vec2(.1 + .01 * i, .8) + i * i + T * .5 + .1 * uv.x);
    vec2 p = uv;
    float d = length(p);
    col += .00125 / d * (cos(sin(i) * vec3(1, 2, 3)) + 1.);
    float b = noise(i + p + bg * 1.731);
    col += .002 * b / length(max(p, vec2(b * p.x * .02, p.y)));
    col = mix(col, vec3(bg * .25, bg * .137, bg * .05), d);
  }
  O = vec4(col, 1);
}`;

class WebGLRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null;
  program: WebGLProgram | null = null;
  vs: WebGLShader | null = null;
  fs: WebGLShader | null = null;
  buffer: WebGLBuffer | null = null;
  scale: number;
  shaderSource: string;
  mouseMove: [number, number] = [0, 0];
  mouseCoords: [number, number] = [0, 0];
  pointerCoords: number[] = [0, 0];
  nbrOfPointers: number = 0;
  vertexSrc: string = VERTEX_SHADER;
  vertices: number[] = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    this.gl = canvas.getContext('webgl2');
    if (this.gl) {
      this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
    }
    this.shaderSource = FRAGMENT_SHADER;
  }

  updateShader(source: string) {
    this.reset();
    this.shaderSource = source;
    this.setup();
    this.init();
  }

  updateMove(move: [number, number]) {
    this.mouseMove = move;
  }

  updateMouse(mouse: [number, number]) {
    this.mouseCoords = mouse;
  }

  updatePointerCoords(coords: number[]) {
    this.pointerCoords = coords;
  }

  updatePointerCount(count: number) {
    this.nbrOfPointers = count;
  }

  updateScale(scale: number) {
    this.scale = scale;
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale);
    }
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    if (!gl) return;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', info);
    }
  }

  test(source: string): string | null {
    const gl = this.gl;
    if (!gl) return 'No WebGL context';
    let error: string | null = null;
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!shader) return 'Cannot create shader';
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      error = gl.getShaderInfoLog(shader);
    }
    gl.deleteShader(shader);
    return error;
  }

  reset() {
    const gl = this.gl;
    if (!gl || !this.program) return;
    if (!gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) {
        gl.detachShader(this.program, this.vs);
        gl.deleteShader(this.vs);
      }
      if (this.fs) {
        gl.detachShader(this.program, this.fs);
        gl.deleteShader(this.fs);
      }
      gl.deleteProgram(this.program);
    }
  }

  setup() {
    const gl = this.gl;
    if (!gl) return;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    this.vs = vs;
    this.fs = fs;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, this.shaderSource);
    this.program = gl.createProgram();
    if (!this.program) return;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program));
    }
  }

  init() {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    (program as any).resolution = gl.getUniformLocation(program, 'resolution');
    (program as any).time = gl.getUniformLocation(program, 'time');
    (program as any).move = gl.getUniformLocation(program, 'move');
    (program as any).touch = gl.getUniformLocation(program, 'touch');
    (program as any).pointerCount = gl.getUniformLocation(program, 'pointerCount');
    (program as any).pointers = gl.getUniformLocation(program, 'pointers');
  }

  render(timestamp = 0) {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    gl.uniform2f((program as any).resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f((program as any).time, timestamp * 0.001);
    gl.uniform2f((program as any).move, this.mouseMove[0], this.mouseMove[1]);
    gl.uniform2f((program as any).touch, this.mouseCoords[0], this.mouseCoords[1]);
    gl.uniform1i((program as any).pointerCount, this.nbrOfPointers);
    gl.uniform2fv((program as any).pointers, this.pointerCoords);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

class PointerHandler {
  scale: number;
  active: boolean = false;
  pointers: Map<number, [number, number]> = new Map();
  lastCoords: [number, number] = [0, 0];
  moves: [number, number] = [0, 0];

  constructor(element: HTMLCanvasElement, scale: number) {
    this.scale = scale;
    const mapCoords = (el: HTMLCanvasElement, s: number, x: number, y: number): [number, number] => [
      x * s,
      el.height - y * s,
    ];

    element.addEventListener('pointerdown', (e) => {
      this.active = true;
      this.pointers.set(e.pointerId, mapCoords(element, this.getScale(), e.clientX, e.clientY));
    });

    element.addEventListener('pointerup', (e) => {
      if (this.count === 1) {
        this.lastCoords = this.first;
      }
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });

    element.addEventListener('pointerleave', (e) => {
      if (this.count === 1) {
        this.lastCoords = this.first;
      }
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });

    element.addEventListener('pointermove', (e) => {
      if (this.active) {
        this.lastCoords = [e.clientX, e.clientY];
        this.pointers.set(e.pointerId, mapCoords(element, this.getScale(), e.clientX, e.clientY));
        this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY];
      }
    });
  }

  getScale() {
    return this.scale;
  }

  updateScale(scale: number) {
    this.scale = scale;
  }

  get count() {
    return this.pointers.size;
  }

  get move(): [number, number] {
    return this.moves;
  }

  get coords(): number[] {
    return this.pointers.size > 0 ? Array.from(this.pointers.values()).flat() : [0, 0];
  }

  get first(): [number, number] {
    return this.pointers.values().next().value || this.lastCoords;
  }
}

export function useShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>();
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const pointerRef = useRef<PointerHandler | null>(null);

  const resize = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const scale = Math.max(1, 0.5 * (window.devicePixelRatio || 1));
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;
    if (rendererRef.current) {
      rendererRef.current.updateScale(scale);
    }
    if (pointerRef.current) {
      pointerRef.current.updateScale(scale);
    }
  };

  const loop = (timestamp: number) => {
    if (rendererRef.current && pointerRef.current) {
      rendererRef.current.updateMouse(pointerRef.current.first);
      rendererRef.current.updatePointerCount(pointerRef.current.count);
      rendererRef.current.updatePointerCoords(pointerRef.current.coords);
      rendererRef.current.updateMove(pointerRef.current.move);
      rendererRef.current.render(timestamp);
      animFrameRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const scale = Math.max(1, 0.5 * (window.devicePixelRatio || 1));

    rendererRef.current = new WebGLRenderer(canvas, scale);
    pointerRef.current = new PointerHandler(canvas, scale);

    rendererRef.current.setup();
    rendererRef.current.init();
    resize();

    if (rendererRef.current.test(FRAGMENT_SHADER) === null) {
      rendererRef.current.updateShader(FRAGMENT_SHADER);
    }

    loop(0);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.reset();
      }
    };
  }, []);

  return canvasRef;
}

export interface AnimatedShaderHeroProps {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline: {
    line1: string;
    line2: string;
  };
  subtitle: string;
  buttons?: {
    primary?: {
      text: string;
      onClick?: () => void;
    };
    secondary?: {
      text: string;
      onClick?: () => void;
    };
  };
  className?: string;
  children?: React.ReactNode;
}

/**
 * Animated Shader Hero Component from https://21st.dev/@ravikatiyar162/components/animated-shader-hero
 * Features dynamic WebGL procedural shader canvas, glassmorphic trust badge, gradient typography,
 * and high-impact CTA buttons.
 */
export const AnimatedShaderHero: React.FC<AnimatedShaderHeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = '',
  children,
}) => {
  const canvasRef = useShaderBackground();

  return (
    <div className={`relative w-full min-h-screen overflow-hidden bg-black ${className}`}>
      {/* Dynamic Keyframes for Staggered Hero Entrances */}
      <style>{`
        @keyframes hero-fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes hero-fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .hero-animate-fade-in-down {
          animation: hero-fade-in-down 0.8s ease-out forwards;
        }
        
        .hero-animate-fade-in-up {
          animation: hero-fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .hero-delay-200 {
          animation-delay: 0.2s;
        }
        
        .hero-delay-400 {
          animation-delay: 0.4s;
        }
        
        .hero-delay-600 {
          animation-delay: 0.6s;
        }
        
        .hero-delay-800 {
          animation-delay: 0.8s;
        }

        @keyframes hero-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .hero-animate-gradient {
          background-size: 200% 200%;
          animation: hero-gradient-shift 3s ease infinite;
        }
      `}</style>

      {/* Interactive WebGL Shader Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain touch-none"
        style={{ background: 'black' }}
      />

      {/* Floating Hero Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-4 sm:px-6 lg:px-8 py-16">
        {/* Trust Badge */}
        {trustBadge && (
          <div className="mb-6 sm:mb-8 hero-animate-fade-in-down">
            <div className="flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-3 bg-orange-500/10 backdrop-blur-md border border-orange-300/30 rounded-full text-xs sm:text-sm shadow-lg shadow-orange-950/20">
              {trustBadge.icons && (
                <div className="flex items-center gap-1">
                  {trustBadge.icons.map((icon, idx) => (
                    <span
                      key={idx}
                      className={
                        idx === 0
                          ? 'text-yellow-300'
                          : idx === 1
                          ? 'text-orange-300'
                          : 'text-amber-300'
                      }
                    >
                      {icon}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-orange-100 font-medium">{trustBadge.text}</span>
            </div>
          </div>
        )}

        {/* Headline & Subtitle */}
        <div className="text-center space-y-6 max-w-5xl mx-auto">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-orange-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent hero-animate-fade-in-up hero-delay-200 drop-shadow-sm">
              {headline.line1}
            </h1>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent hero-animate-fade-in-up hero-delay-400 drop-shadow-sm">
              {headline.line2}
            </h1>
          </div>

          <div className="max-w-3xl mx-auto hero-animate-fade-in-up hero-delay-600">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-orange-100/90 font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Action CTAs */}
          {buttons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 sm:mt-10 hero-animate-fade-in-up hero-delay-800">
              {buttons.primary && (
                <button
                  type="button"
                  onClick={buttons.primary.onClick}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black rounded-full font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25 active:scale-95 shadow-md"
                >
                  {buttons.primary.text}
                </button>
              )}

              {buttons.secondary && (
                <button
                  type="button"
                  onClick={buttons.secondary.onClick}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-300/30 hover:border-orange-300/50 text-orange-100 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 backdrop-blur-md active:scale-95"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}

          {/* Optional Injected Content (e.g. Search Bar or Quick Showcase) */}
          {children && (
            <div className="pt-6 hero-animate-fade-in-up hero-delay-800 flex justify-center">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedShaderHero;
