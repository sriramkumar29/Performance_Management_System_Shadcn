export type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function emitUnauthorized() {
  for (const cb of unauthorizedListeners) {
    try {
      cb();
    } catch {
      // no-op
    }
  }
}

