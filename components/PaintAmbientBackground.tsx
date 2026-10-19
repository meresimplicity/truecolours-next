'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion } from 'framer-motion'

const vertex = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0., 1.); }
`

const fragment = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scroll;
uniform vec2 u_pointer;

float grain(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(grain(i), grain(i + vec2(1., 0.)), f.x),
    mix(grain(i + vec2(0., 1.)), grain(i + vec2(1.)), f.x), f.y
  );
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1. - uv.y;
  float t = u_time + u_scroll * 1.85;
  float scrollPresence = smoothstep(0., .8, u_scroll);
  float x = uv.x + .009 * sin(uv.y * 7. - t * .4);
  float pointerBend = (u_pointer.y - .5) * .07 * exp(-pow((x - u_pointer.x) * 3., 2.));
  float scrollBend = scrollPresence * .09 * cos(x * 3.14159 + u_scroll * .9);
  float curve = .72 - .2 * x + .13 * sin(x * 6.283 - t * .43) + .035 * sin(x * 13. - t * .28) + pointerBend + scrollBend;
  float d = (uv.y - curve) / (.15 + .028 * sin(x * 5. + t * .32));
  float ribbon = exp(-d * d * 1.3);
  float second = exp(-pow((uv.y - curve + .22) / .14, 2.) * 1.6) * .38;
  float fold = .73 + .27 * sin(d * 4. + x * 10. - t * .72);
  float edge = smoothstep(.015, .13, uv.y) * (1. - smoothstep(.9, 1., uv.y));
  float wisps = .72 + .28 * noise(uv * vec2(17., 14.) + vec2(t * .17, -t * .12));
  float density = clamp((ribbon * fold + second) * edge * wisps, 0., 1.);
  vec2 dotGrid = (gl_FragCoord.xy + vec2(t * 3.5 + u_scroll * 12., sin(t * .4) * 2. + u_scroll * 6.)) / 5.5;
  vec2 dotCenter = fract(dotGrid) - .5;
  float radius = .08 + .29 * density;
  float point = 1. - smoothstep(radius - .045, radius + .045, length(dotCenter));
  float scatter = step(.14, grain(floor(dotGrid)));
  vec3 blue = vec3(.43, .53, .68);
  vec3 clay = vec3(.69, .61, .57);
  vec3 ink = mix(blue, clay, smoothstep(.18, .93, x + .08 * sin(t)));
  float light = grain(floor(gl_FragCoord.xy * .41) + 3.);
  vec3 paper = vec3(.989, .990, .994) + (light - .5) * .009;
  gl_FragColor = vec4(mix(paper, ink, point * scatter * density * (.46 + scrollPresence * .14)), 1.);
}
`

/** Original particle ribbon; the company story bends its phase with page scroll. */
export function PaintAmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  const pointerX = useMotionValue(.5)
  const pointerY = useMotionValue(.5)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, powerPreference: 'low-power', depth: false, stencil: false,
    })
    if (!gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, vertex)
    const fs = compile(gl.FRAGMENT_SHADER, fragment)
    const program = gl.createProgram()
    if (!vs || !fs || !program) {
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      if (program) gl.deleteProgram(program)
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return
    }
    gl.useProgram(program)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const time = gl.getUniformLocation(program, 'u_time')
    const scroll = gl.getUniformLocation(program, 'u_scroll')
    const pointer = gl.getUniformLocation(program, 'u_pointer')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = matchMedia('(max-width: 767px), (pointer: coarse)')
    let frame = 0, last = 0, elapsed = 0, previous = 0, disposed = false
    let story: Element | null = null
    let storyStart = 0, scrollTarget = 0, scrollPhase = 0

    const updateScroll = (remeasure = false) => {
      const nextStory = document.querySelector('.tc-home')
      if (nextStory !== story || remeasure) {
        story = nextStory
        storyStart = story ? story.getBoundingClientRect().top + window.scrollY : 0
      }
      scrollTarget = story && !reduced.matches
        ? Math.max(0, (window.scrollY - storyStart + window.innerHeight * .35) / Math.max(window.innerHeight, 1))
        : 0
    }
    const onScroll = () => updateScroll()

    const draw = () => {
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(time, elapsed)
      gl.uniform1f(scroll, reduced.matches ? 0 : scrollPhase)
      gl.uniform2f(pointer, pointerX.get(), pointerY.get())
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reduced.matches) return
      pointerX.set(event.clientX / Math.max(window.innerWidth, 1))
      pointerY.set(event.clientY / Math.max(window.innerHeight, 1))
    }
    const resize = () => {
      updateScroll(true)
      const dpr = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.35)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      draw()
    }
    const tick = (now: number) => {
      if (disposed || document.hidden || reduced.matches || gl.isContextLost()) return
      if (previous) elapsed += Math.min((now - previous) / 1000, .1)
      previous = now
      if (now - last >= (mobile.matches ? 1000 / 30 : 1000 / 60)) {
        scrollPhase += (scrollTarget - scrollPhase) * (mobile.matches ? .16 : .09)
        draw()
        last = now
      }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      previous = 0
      updateScroll(true)
      if (reduced.matches) scrollPhase = 0
      draw()
      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(tick)
    }
    resize()
    sync()
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    mobile.addEventListener('change', resize)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
      mobile.removeEventListener('change', resize)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [pointerX, pointerY])

  return (
    <motion.div
      className="ambient-background"
      aria-hidden="true"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.6 }}
    >
      <canvas ref={ref} className="ambient-background__canvas" />
    </motion.div>
  )
}
