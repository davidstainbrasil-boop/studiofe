/**
 * 🔄 Delta Calculator
 * Efficient JSON diff/patch operations for version history
 */

/**
 * Create a delta (diff) between two objects
 * Returns the changes needed to transform 'from' into 'to'
 */
export function createDelta(
  from: Record<string, unknown>,
  to: Record<string, unknown>
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const fromValue = from[key];
    const toValue = to[key];

    if (fromValue === toValue) {
      continue; // No change
    }

    if (toValue === undefined) {
      // Key was deleted
      delta[key] = { __deleted: true };
    } else if (fromValue === undefined) {
      // Key was added
      delta[key] = { __added: toValue };
    } else if (
      typeof fromValue === 'object' &&
      typeof toValue === 'object' &&
      fromValue !== null &&
      toValue !== null &&
      !Array.isArray(fromValue) &&
      !Array.isArray(toValue)
    ) {
      // Recurse for nested objects
      const nestedDelta = createDelta(
        fromValue as Record<string, unknown>,
        toValue as Record<string, unknown>
      );
      if (Object.keys(nestedDelta).length > 0) {
        delta[key] = { __nested: nestedDelta };
      }
    } else {
      // Value changed (including arrays - no deep diff for arrays)
      delta[key] = { __changed: { from: fromValue, to: toValue } };
    }
  }

  return delta;
}

/**
 * Apply a delta to a base object to produce the new state
 */
export function applyDelta(
  base: Record<string, unknown>,
  delta: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };

  for (const [key, change] of Object.entries(delta)) {
    const changeObj = change as Record<string, unknown>;

    if (changeObj.__deleted) {
      delete result[key];
    } else if (changeObj.__added !== undefined) {
      result[key] = changeObj.__added;
    } else if (changeObj.__changed) {
      result[key] = (changeObj.__changed as { to: unknown }).to;
    } else if (changeObj.__nested) {
      result[key] = applyDelta(
        (base[key] as Record<string, unknown>) || {},
        changeObj.__nested as Record<string, unknown>
      );
    }
  }

  return result;
}

/**
 * Create a human-readable diff between two versions
 */
export function diffVersions(
  versionA: Record<string, unknown>,
  versionB: Record<string, unknown>
): Record<string, unknown> {
  return createDelta(versionA, versionB);
}

/**
 * Check if two objects are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    
    if (aKeys.length !== bKeys.length) return false;
    
    for (const key of aKeys) {
      if (!isEqual(aObj[key], bObj[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Calculate the size of a delta (number of changes)
 */
export function deltaSize(delta: Record<string, unknown>): number {
  let size = 0;
  
  for (const change of Object.values(delta)) {
    const changeObj = change as Record<string, unknown>;
    if (changeObj.__nested) {
      size += deltaSize(changeObj.__nested as Record<string, unknown>);
    } else {
      size += 1;
    }
  }
  
  return size;
}

/**
 * Merge two deltas into one
 * Useful for compacting multiple small deltas
 */
export function mergeDeltas(
  deltaA: Record<string, unknown>,
  deltaB: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...deltaA };

  for (const [key, change] of Object.entries(deltaB)) {
    const changeB = change as Record<string, unknown>;
    const existingChange = merged[key] as Record<string, unknown> | undefined;

    if (!existingChange) {
      merged[key] = changeB;
    } else if (changeB.__deleted) {
      // If B deletes, the final result is deleted
      merged[key] = changeB;
    } else if (changeB.__added !== undefined && existingChange.__deleted) {
      // Deleted then added = changed
      merged[key] = { __changed: { from: undefined, to: changeB.__added } };
    } else if (changeB.__changed && existingChange.__changed) {
      // Both changed = combine
      const existingFrom = (existingChange.__changed as { from: unknown }).from;
      const newTo = (changeB.__changed as { to: unknown }).to;
      merged[key] = { __changed: { from: existingFrom, to: newTo } };
    } else if (changeB.__nested && existingChange.__nested) {
      // Both nested = merge recursively
      merged[key] = {
        __nested: mergeDeltas(
          existingChange.__nested as Record<string, unknown>,
          changeB.__nested as Record<string, unknown>
        )
      };
    } else {
      // Overwrite with newer change
      merged[key] = changeB;
    }
  }

  return merged;
}
