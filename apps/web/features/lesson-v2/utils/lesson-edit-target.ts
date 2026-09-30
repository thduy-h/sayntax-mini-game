export interface EditTargetResolution<T> {
  incompatibleSelection: T | null;
  target: T | null;
  usedFallback: boolean;
}

export function resolveAuthoritativeEditTarget<T>(input: {
  fallback: T | null;
  isCompatible: (candidate: T) => boolean;
  selected: T | null;
}): EditTargetResolution<T> {
  if (input.selected) {
    return input.isCompatible(input.selected)
      ? { incompatibleSelection: null, target: input.selected, usedFallback: false }
      : { incompatibleSelection: input.selected, target: null, usedFallback: false };
  }
  return input.fallback && input.isCompatible(input.fallback)
    ? { incompatibleSelection: null, target: input.fallback, usedFallback: true }
    : { incompatibleSelection: null, target: null, usedFallback: false };
}
