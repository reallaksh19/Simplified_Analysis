import React, { useMemo } from 'react';
import { useSketchStore } from './SketcherStore';
import * as THREE from 'three';

// Fixed high-res canvas dimensions — text is always drawn sharp.
// The canvas pixel size is DECOUPLED from world-unit font size.
const CANVAS_H = 64;           // px — canvas height (affects DPI quality)
const FONT_PX = 28;            // px — actual rendered font size on the canvas
const PADDING_X = 14;          // px — horizontal padding inside the label background

/**
 * High-quality canvas sprite label.
 * Text is always rendered at FONT_PX, then the THREE.Sprite world-scale
 * is set by `worldHeight` (in scene mm units).
 */
const SpriteLabel = ({ position, text, worldHeight = 200, color = '#f8fafc', bgAlpha = 0.7 }) => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        ctx.font = `bold ${FONT_PX}px "Courier New", monospace`;
        const textW = ctx.measureText(text).width;

        canvas.width = Math.ceil(textW + PADDING_X * 2);
        canvas.height = CANVAS_H;

        // Re-apply font after canvas resize (resets context state)
        ctx.font = `bold ${FONT_PX}px "Courier New", monospace`;

        // Background pill
        const r = 8;
        ctx.fillStyle = `rgba(2, 6, 23, ${bgAlpha})`;
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, r);
        ctx.fill();

        // Text — vertically centred
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, PADDING_X, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, [text, color, bgAlpha]);

    // Derive world-space width from the canvas aspect ratio
    const aspect = texture.image
        ? texture.image.width / texture.image.height
        : 4;
    const worldWidth = worldHeight * aspect;

    return (
        <sprite position={position} scale={[worldWidth, worldHeight, 1]}>
            <spriteMaterial map={texture} depthTest={false} transparent sizeAttenuation />
        </sprite>
    );
};

export const SketcherAnnotations = ({ is3D }) => {
    const nodes      = useSketchStore(s => s.nodes);
    const segments   = useSketchStore(s => s.segments);
    const annotationScale = useSketchStore(s => s.annotationScale);
    const showNodeLabels   = useSketchStore(s => s.showNodeLabels);
    const showLengthLabels = useSketchStore(s => s.showLengthLabels);

    // World height of a label in mm — scales with annotationScale but is
    // independent of the blurry fontSize-based canvas logic we had before.
    const labelH = (is3D ? 120 : 180) * annotationScale;

    // Node label vertical offset above the node dot (in mm)
    const nodeLabelYOffset = labelH * 0.8;

    return (
        <group>
            {/* ── Node Labels ─────────────────────────────────── */}
            {showNodeLabels && Object.entries(nodes).map(([id, node]) => {
                const labelStr = `${id} (${Math.round(node.pos[0])}, ${Math.round(node.pos[1])}, ${Math.round(node.pos[2])})`;
                return (
                    <SpriteLabel
                        key={`label-${id}`}
                        // Place label directly ABOVE the node dot so it never
                        // collides with length labels (which sit beside segments).
                        position={[
                            node.pos[0],
                            node.pos[1] + nodeLabelYOffset,
                            node.pos[2],
                        ]}
                        text={labelStr}
                        worldHeight={labelH}
                        color="#7dd3fc"   // sky-blue — distinct from white length labels
                        bgAlpha={0.75}
                    />
                );
            })}

            {/* ── Segment Length Labels ────────────────────────── */}
            {showLengthLabels && segments.map(seg => {
                const n1 = nodes[seg.startNode];
                const n2 = nodes[seg.endNode];
                if (!n1 || !n2) return null;

                const startVec = new THREE.Vector3(...n1.pos);
                const endVec   = new THREE.Vector3(...n2.pos);
                const diff     = endVec.clone().sub(startVec);
                const len      = diff.length();
                if (len < 1) return null;

                // Midpoint of the segment
                const mid = startVec.clone().lerp(endVec, 0.5);

                // Perpendicular offset so the label sits BESIDE the pipe line,
                // not on top of it (avoids overlapping with node labels at endpoints).
                let perp;
                const normDir = diff.clone().normalize();
                const worldUp = new THREE.Vector3(0, 1, 0);

                if (Math.abs(normDir.dot(worldUp)) > 0.99) {
                    // Nearly vertical segment — offset in X
                    perp = new THREE.Vector3(1, 0, 0);
                } else {
                    // Rotate 90° in the XY plane (2D view) to get a clean side offset
                    perp = new THREE.Vector3(-normDir.y, normDir.x, 0).normalize();
                }

                const offsetMag = labelH * 1.2;   // clearance from pipe centre-line
                mid.addScaledVector(perp, offsetMag);

                return (
                    <SpriteLabel
                        key={`len-${seg.id}`}
                        position={[mid.x, mid.y, mid.z]}
                        text={`${(len / 1000).toFixed(3)} m`}
                        worldHeight={labelH}
                        color="#f8fafc"   // white
                        bgAlpha={0.65}
                    />
                );
            })}
        </group>
    );
};

export default SketcherAnnotations;
