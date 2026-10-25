// Blocking, same-origin bootstrap: restore the cached colour before the app loads.
try {
  const key = document.currentScript?.getAttribute('data-paint-key')
  const paint = key ? localStorage.getItem(key) : null
  if (paint && CSS.supports('background-color', paint)) {
    document.documentElement.style.backgroundColor = paint
  }
} catch {
  // Storage can be disabled. The React theme corrects the first frame on mount.
}
