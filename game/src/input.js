// Shadow Ledger — keyboard and mouse input.
// One job: track which keys are held and where the mouse clicked.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    clickTarget: null, // {x, y} in canvas pixels, or null
    consumeClick() {
      const target = this.clickTarget;
      this.clickTarget = null;
      return target;
    },
    held(...names) {
      return names.some((name) => keys.has(name));
    },
    get sneak() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    attach() {
      window.addEventListener('keydown', (event) => {
        keys.add(event.code);
        // Keep the page from scrolling on game keys.
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
          event.preventDefault();
        }
      });
      window.addEventListener('keyup', (event) => keys.delete(event.code));
      window.addEventListener('blur', () => keys.clear());
      canvas.addEventListener('mousedown', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        input.clickTarget = {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      });
    },
  };
  return input;
}

// Movement vector from the held keys: -1..1 on each axis, normalised.
export function keyVector(input) {
  let x = 0;
  let y = 0;
  if (input.held('KeyA', 'ArrowLeft')) x -= 1;
  if (input.held('KeyD', 'ArrowRight')) x += 1;
  if (input.held('KeyW', 'ArrowUp')) y -= 1;
  if (input.held('KeyS', 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.hypot(x, y);
    x /= len;
    y /= len;
  }
  return { x, y };
}
