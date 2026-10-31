import React, { useRef, useEffect, useState } from 'react';

// Types for component props
export interface HeroProps {
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

// WebGL2 Shader
const GLSL3_VERTEX = `#version 300 es
precision highp float;
in vec4 position;
void main(){
  gl_Position = position;
}`;

const GLSL3_FRAGMENT = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*
*	To explore strange new worlds, to seek out new life
*	and new civilizations, to boldly go where no man has
*	gone before.
*/
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(in vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float
  a = rnd(i),
  b = rnd(i + vec2(1.0, 0.0)),
  c = rnd(i + vec2(0.0, 1.0)),
  d = rnd(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float t = 0.0, a = 1.0;
  mat2 m = mat2(1.0, -0.5, 0.2, 1.2);
  for (int i = 0; i < 5; i++) {
    t += a * noise(p);
    p *= 2.0 * m;
    a *= 0.5;
  }
  return t;
}

float clouds(vec2 p) {
  float d = 1.0, t = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float a = d * fbm(i * 10.0 + p.x * 0.2 + 0.2 * (1.0 + i) * p.y + d + i * i + p);
    t = mix(t, d, a);
    d = a;
    p *= 2.0 / (i + 1.0);
  }
  return t;
}

void main(void) {
  vec2 uv = (FC - 0.5 * R) / MN;
  vec2 st = uv * vec2(2.0, 1.0);
  vec3 col = vec3(0.0);
  float bg = clouds(vec2(st.x + T * 0.5, -st.y));
  uv *= 1.0 - 0.3 * (sin(T * 0.2) * 0.5 + 0.5);
  for (float i = 1.0; i < 12.0; i++) {
    uv += 0.1 * cos(i * vec2(0.1 + 0.01 * i, 0.8) + i * i + T * 0.5 + 0.1 * uv.x);
    vec2 p = uv;
    float d = length(p);
    col += 0.00125 / max(d, 0.001) * (cos(sin(i) * vec3(1.0, 2.0, 3.0)) + 1.0);
    float b = noise(i + p + bg * 1.731);
    col += 0.002 * b / max(length(max(p, vec2(b * p.x * 0.02, p.y))), 0.001);
    col = mix(col, vec3(bg * 0.25, bg * 0.137, bg * 0.05), clamp(d, 0.0, 1.0));
  }
  O = vec4(col, 1.0);
}`;

// WebGL 1 Fallback Shader
const GLSL1_VERTEX = `
attribute vec2 position;
void main(){
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const GLSL1_FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(in vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = rnd(i);
  float b = rnd(i + vec2(1.0, 0.0));
  float c = rnd(i + vec2(0.0, 1.0));
  float d = rnd(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float t = 0.0, a = 1.0;
  mat2 m = mat2(1.0, -0.5, 0.2, 1.2);
  for (int i = 0; i < 5; i++) {
    t += a * noise(p);
    p *= 2.0 * m;
    a *= 0.5;
  }
  return t;
}

float clouds(vec2 p) {
  float d = 1.0, t = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float a = d * fbm(i * 10.0 + p.x * 0.2 + 0.2 * (1.0 + i) * p.y + d + i * i + p);
    t = mix(t, d, a);
    d = a;
    p *= 2.0 / (i + 1.0);
  }
  return t;
}

void main(void) {
  vec2 uv = (FC - 0.5 * R) / MN;
  vec2 st = uv * vec2(2.0, 1.0);
  vec3 col = vec3(0.0);
  float bg = clouds(vec2(st.x + T * 0.5, -st.y));
  uv *= 1.0 - 0.3 * (sin(T * 0.2) * 0.5 + 0.5);
  for (float i = 1.0; i < 12.0; i++) {
    uv += 0.1 * cos(i * vec2(0.1 + 0.01 * i, 0.8) + i * i + T * 0.5 + 0.1 * uv.x);
    vec2 p = uv;
    float d = length(p);
    col += 0.00125 / max(d, 0.001) * (cos(sin(i) * vec3(1.0, 2.0, 3.0)) + 1.0);
    float b = noise(i + p + bg * 1.731);
    col += 0.002 * b / max(length(max(p, vec2(b * p.x * 0.02, p.y))), 0.001);
    col = mix(col, vec3(bg * 0.25, bg * 0.137, bg * 0.05), clamp(d, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

class SafeWebGLRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  isWebGL2: boolean = false;
  program: WebGLProgram | null = null;
  vs: WebGLShader | null = null;
  fs: WebGLShader | null = null;
  buffer: WebGLBuffer | null = null;
  posAttr: number = -1;
  timeLoc: WebGLUniformLocation | null = null;
  resLoc: WebGLUniformLocation | null = null;
  mouseMove = [0, 0];
  mouseCoords = [0, 0];
  pointerCoords = [0, 0];
  nbrOfPointers = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    try {
      this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
      if (this.gl) {
        this.isWebGL2 = true;
      }
    } catch (e) {
      this.gl = null;
    }

    if (!this.gl) {
      try {
        this.gl = (canvas.getContext('webgl', { antialias: true, alpha: false }) ||
          canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        this.isWebGL2 = false;
      } catch (e) {
        this.gl = null;
      }
    }

    if (this.gl) {
      this.gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  setup() {
    const gl = this.gl;
    if (!gl) return;

    const vertexSrc = this.isWebGL2 ? GLSL3_VERTEX : GLSL1_VERTEX;
    const fragmentSrc = this.isWebGL2 ? GLSL3_FRAGMENT : GLSL1_FRAGMENT;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.warn('Vertex shader warning:', gl.getShaderInfoLog(vs));
    }

    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn('Fragment shader warning:', gl.getShaderInfoLog(fs));
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Shader link warning:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    this.vs = vs;
    this.fs = fs;

    gl.useProgram(program);

    // Quad geometry
    const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.posAttr = gl.getAttribLocation(program, 'position');
    if (this.posAttr >= 0) {
      gl.enableVertexAttribArray(this.posAttr);
      gl.vertexAttribPointer(this.posAttr, 2, gl.FLOAT, false, 0, 0);
    }

    this.resLoc = gl.getUniformLocation(program, 'resolution');
    this.timeLoc = gl.getUniformLocation(program, 'time');
  }

  resize(width: number, height: number) {
    if (!this.gl) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    if (this.program && this.resLoc) {
      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.resLoc, width, height);
    }
  }

  render(timestamp = 0) {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    if (this.buffer && this.posAttr >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.posAttr);
      gl.vertexAttribPointer(this.posAttr, 2, gl.FLOAT, false, 0, 0);
    }

    if (this.resLoc) {
      gl.uniform2f(this.resLoc, this.canvas.width, this.canvas.height);
    }
    if (this.timeLoc) {
      gl.uniform1f(this.timeLoc, timestamp * 0.001);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) {
      if (this.vs) gl.deleteShader(this.vs);
      if (this.fs) gl.deleteShader(this.fs);
      gl.deleteProgram(this.program);
    }
  }
}

export const useShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const rendererRef = useRef<SafeWebGLRenderer | null>(null);

  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor((canvas.clientWidth || window.innerWidth) * dpr);
    const height = Math.floor((canvas.clientHeight || window.innerHeight) * dpr);
    rendererRef.current.resize(width, height);
  };

  const loop = (timestamp: number) => {
    if (rendererRef.current) {
      rendererRef.current.render(timestamp);
      animFrameRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new SafeWebGLRenderer(canvas);
    rendererRef.current = renderer;
    renderer.setup();
    resize();

    animFrameRef.current = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  return canvasRef;
};

// Reusable Hero Component
export const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = '',
  children,
}) => {
  const canvasRef = useShaderBackground();

  return (
    <div
      className={`relative w-full min-h-screen overflow-hidden bg-[#070503] ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245, 158, 11, 0.25), transparent 70%),
          radial-gradient(ellipse 60% 40% at 50% 120%, rgba(220, 38, 38, 0.2), transparent 70%),
          linear-gradient(to bottom, #070503, #0d0a06)
        `,
      }}
    >
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
      `}</style>

      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block touch-none pointer-events-none"
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Trust Badge */}
        {trustBadge && (
          <div className="mb-8 hero-animate-fade-in-down">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-orange-500/10 backdrop-blur-md border border-orange-400/30 rounded-full text-xs sm:text-sm shadow-xl shadow-orange-950/40">
              {trustBadge.icons && (
                <div className="flex items-center gap-1">
                  {trustBadge.icons.map((icon, index) => (
                    <span
                      key={index}
                      className={
                        index === 0
                          ? 'text-yellow-300'
                          : index === 1
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

        {/* Headings & Subtitle */}
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-orange-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent hero-animate-fade-in-up hero-delay-200 drop-shadow-md">
              {headline.line1}
            </h1>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent hero-animate-fade-in-up hero-delay-400 drop-shadow-md">
              {headline.line2}
            </h1>
          </div>

          <div className="max-w-3xl mx-auto hero-animate-fade-in-up hero-delay-600">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-orange-100/90 font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* CTA Buttons */}
          {buttons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10 hero-animate-fade-in-up hero-delay-800">
              {buttons.primary && (
                <button
                  type="button"
                  onClick={buttons.primary.onClick}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black rounded-full font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30 active:scale-95 shadow-lg"
                >
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button
                  type="button"
                  onClick={buttons.secondary.onClick}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-300/30 hover:border-orange-300/50 text-orange-100 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 backdrop-blur-md active:scale-95"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}

          {children && (
            <div className="mt-8 flex justify-center w-full hero-animate-fade-in-up hero-delay-800">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AnimatedShaderHero = Hero;
export default Hero;
