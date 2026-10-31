import React, { useRef, useEffect } from 'react';

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time * 0.05;
    float lineWidth = 0.002;

    vec3 color = vec3(0.0);
    float pattern = mod(uv.x + uv.y, 0.2) - length(uv);

    for(int i = 0; i < 5; i++){
      float fi = float(i);
      float weight = lineWidth * float(i * i);

      // Explicit channel unrolling for 100% GLSL compatibility across all WebGL compilers
      color.r += weight / max(abs(fract(t + fi * 0.01) * 5.0 + pattern), 0.001);
      color.g += weight / max(abs(fract(t - 0.01 + fi * 0.01) * 5.0 + pattern), 0.001);
      color.b += weight / max(abs(fract(t - 0.02 + fi * 0.01) * 5.0 + pattern), 0.001);
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface ShaderAnimationProps {
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  children?: React.ReactNode;
}

/**
 * ShaderAnimation component by Ali Imam (@designali-in) from https://21st.dev/@designali-in/components/shader-animation
 * Renders an animated concentric ripple / caustic slatted blind shader in pure WebGL.
 */
export const ShaderAnimation: React.FC<ShaderAnimationProps> = ({
  className = '',
  style = {},
  speed = 1,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number>(0);
  const timeRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // WebGL Context with fallback
    let gl: WebGLRenderingContext | null = null;
    try {
      gl =
        (canvas.getContext('webgl', { antialias: true, alpha: true }) as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    } catch (e) {
      console.warn('WebGL context creation error:', e);
    }

    if (!gl) {
      console.warn('WebGL is not supported on this device/browser.');
      return;
    }

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad covering full clip space
    const quadVertices = new Float32Array([
      -1.0,  1.0,
      -1.0, -1.0,
       1.0,  1.0,
       1.0, -1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    if (posAttr >= 0) {
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
    }

    const timeLoc = gl.getUniformLocation(program, 'time');
    const resLoc = gl.getUniformLocation(program, 'resolution');

    // Handle Resize with ResizeObserver & window fallback
    const updateDimensions = () => {
      if (!container || !canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(container.clientWidth || window.innerWidth || 600, 320);
      const height = Math.max(container.clientHeight || window.innerHeight || 450, 240);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      if (resLoc) {
        gl.uniform2f(resLoc, canvas.width, canvas.height);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', updateDimensions);

    // Animation Loop
    const render = () => {
      if (!gl || !program) return;
      timeRef.current += 0.05 * speed;

      gl.useProgram(program);
      if (buffer && posAttr >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
      }

      if (timeLoc) {
        gl.uniform1f(timeLoc, timeRef.current);
      }
      if (resLoc) {
        gl.uniform2f(resLoc, canvas.width, canvas.height);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        background: '#040714',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(30, 58, 138, 0.3) 0%, #000 80%)',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none pointer-events-none"
      />
      {children && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Exact replica of DemoOne from https://21st.dev/@designali-in/components/shader-animation
 */
export function DemoOne() {
  return (
    <div className="relative flex h-[650px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-blue-700 shadow-2xl">
      <ShaderAnimation />
      <span className="absolute pointer-events-none z-10 text-center text-5xl sm:text-7xl leading-none font-semibold tracking-tighter whitespace-pre-wrap text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        Shader Animation
      </span>
    </div>
  );
}

export default ShaderAnimation;
