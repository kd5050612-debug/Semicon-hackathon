import { useEffect, useRef } from 'react';

/**
 * CustomCursor
 * -------------
 * A modern, animated custom cursor composed of:
 *  - An inner dot that follows the pointer instantly.
 *  - An outer ring that trails behind smoothly (lerp animation on rAF).
 *  - Hover state that scales the ring up slightly over interactive elements.
 *
 * It is purely visual and does not affect app content or logic. It is
 * automatically disabled on touch / small-screen devices.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable the custom cursor on fine (mouse) pointers / large screens.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let rafId = 0;
    let visible = false;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        'a, button, [role="button"], input, select, textarea, label, [data-cursor="hover"]'
      );
      if (interactive) {
        ring.classList.add('cursor-ring-hover');
      } else {
        ring.classList.remove('cursor-ring-hover');
      }
    };

    const onMouseDown = () => {
      ring.classList.add('cursor-ring-active');
      dot.classList.add('cursor-dot-active');
    };

    const onMouseUp = () => {
      ring.classList.remove('cursor-ring-active');
      dot.classList.remove('cursor-dot-active');
    };

    const onMouseLeave = () => {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
    </>
  );
}
