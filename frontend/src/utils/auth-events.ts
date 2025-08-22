export type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function emitUnauthorized() {
  unauthorizedListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // no-op
    }
  });
}
