/**
 * Snap Utils
 * Logic for magnetic snapping of timeline elements
 */

export interface SnapResult {
    snappedTime: number;
    isSnapped: boolean;
    snapTarget?: 'element-start' | 'element-end' | 'playhead' | 'start' | null;
}

/**
 * Calculate the best snap time given a proposed time and snap points.
 * 
 * @param proposedTime The time the user is trying to move to
 * @param snapPoints Array of times to snap to
 * @param pixelsPerSecond Scale factor to convert threshold to time
 * @param thresholdPx Maximum distance in pixels to trigger snap (default 15px)
 */
export function calculateSnapTime(
    proposedTime: number,
    snapPoints: number[],
    pixelsPerSecond: number,
    thresholdPx: number = 15
): SnapResult {
    const thresholdSeconds = thresholdPx / pixelsPerSecond;
    
    let closestDiff = Infinity;
    let bestSnap = proposedTime;
    let isSnapped = false;
    let snapTarget: SnapResult['snapTarget'] = null;

    for (const point of snapPoints) {
        const diff = Math.abs(proposedTime - point);

        if (diff < closestDiff && diff <= thresholdSeconds) {
            closestDiff = diff;
            bestSnap = point;
            isSnapped = true;
            
            // Simple heuristics for target type (can be improved if we pass objects instead of just numbers)
            if (point === 0) snapTarget = 'start';
            // We can't distinguish other types purely from the number array without more context, 
            // but for movement logic, we mostly care about the 'snappedTime'.
        }
    }

    return {
        snappedTime: isSnapped ? bestSnap : proposedTime,
        isSnapped,
        snapTarget
    };
}

/**
 * Generate snap points from project state
 */
export function getSnapPoints(
    project: any, // TimelineProject
    currentTime: number,
    excludeElementId?: string
): number[] {
    const points = new Set<number>();
    
    // Always snap to 0
    points.add(0);

    // Snap to Playhead
    points.add(currentTime);

    if (!project) return Array.from(points);

    // Snap to other elements
    project.layers.forEach((layer: any) => {
        layer.items.forEach((item: any) => {
            if (item.id === excludeElementId) return;
            
            points.add(item.start);
            points.add(item.start + item.duration);
        });
    });

    return Array.from(points);
}
