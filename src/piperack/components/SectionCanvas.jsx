import React, { useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated as _animated } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import { usePipeRackStore } from '../store/usePipeRackStore';

const scale = 0.01;

const InteractionManager = ({ layout, activeId, setActiveId, setGhostData, isMeasureMode, measurePts, setMeasurePts, onLiveDrag }) => {
    const { camera, raycaster, pointer } = useThree();
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

    // Create an invisible plane covering the view to catch pointer move globally
    return (
        <mesh
            position={[0, 0, 0]}
            onPointerMove={(e) => {
                if (activeId && !isMeasureMode) {
                    e.stopPropagation();
                    raycaster.setFromCamera(pointer, camera);
                    const target = new THREE.Vector3();
                    raycaster.ray.intersectPlane(plane, target);

                    const rawX_mm = target.x / scale;
                    const snappedX = Math.round(rawX_mm / 50) * 50;

                    if (onLiveDrag) onLiveDrag(activeId, snappedX);

                    const activePipe = layout.find(l => l.id === activeId);
                    if (!activePipe) return;

                    // Nearest neighbor in SAME TIER
                    const sameTierPipes = layout.filter(l => l.tier === activePipe.tier && l.id !== activeId && !l.isFutureSlot);
                    let nearestNeighbor = null;
                    let minDistance = Infinity;

                    sameTierPipes.forEach(p => {
                        const dist = Math.abs(snappedX - p.x_mm);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestNeighbor = p;
                        }
                    });

                    // Calculate required spacing (S_pipe) between active and neighbor
                    let s_required = null;
                    if (nearestNeighbor) {
                        const active_ins = activePipe.insulationThk || 0;
                        const active_od = activePipe.OD_in * 25.4;
                        const active_flg = activePipe.flgRad_in * 25.4;

                        const neigh_ins = nearestNeighbor.insulationThk || 0;
                        const neigh_od = nearestNeighbor.OD_in * 25.4;
                        const neigh_flg = nearestNeighbor.flgRad_in * 25.4;

                        const physGap = (active_od/2) + active_ins + (neigh_od/2) + neigh_ins;
                        const flgAllow = (activePipe.stagger && nearestNeighbor.stagger) ? Math.max(active_flg, neigh_flg) : (active_flg + neigh_flg);
                        const bowing = Math.max(activePipe.delta_in, nearestNeighbor.delta_in) * 25.4 * 0.15;
                        const standardGap = 75;

                        s_required = physGap + flgAllow + bowing + standardGap;

                        // Terminal Logging for Deep Architect Compliance
                        if (minDistance < s_required) {
                            // Only trigger log if we cross the threshold to prevent spam
                            const storeState = usePipeRackStore.getState();
                            const lastLog = storeState.logStream[storeState.logStream.length - 1] || "";
                            const violationMsg = `[FAIL] [SYS] ${activePipe.id} and ${nearestNeighbor.id} Gap: ${minDistance.toFixed(0)}mm. REQUIRED: ${s_required.toFixed(0)}mm.`;
                            if (!lastLog.includes(violationMsg)) {
                                storeState.pushLog(violationMsg);
                            }
                        }
                    }

                    setGhostData({
                        x_mm: snappedX,
                        y_mm: activePipe.y_mm,
                        neighbor: nearestNeighbor,
                        distance_mm: nearestNeighbor ? minDistance : null,
                        s_required: s_required
                    });
                }
            }}
            onPointerUp={(e) => {
                if (activeId) {
                    e.stopPropagation();
                    if (onLiveDrag) onLiveDrag(null, null);
                    setActiveId(null);
                    setGhostData(null);
                }
            }}
            onPointerOut={() => {
                if (activeId && !isMeasureMode) {
                    if (onLiveDrag) onLiveDrag(null, null);
                    setActiveId(null);
                    setGhostData(null);
                }
            }}
            onClick={(e) => {
                if (isMeasureMode) {
                    e.stopPropagation();
                    raycaster.setFromCamera(pointer, camera);
                    const target = new THREE.Vector3();
                    raycaster.ray.intersectPlane(plane, target);
                    const rawX_mm = target.x / scale;
                    const newPts = [...measurePts, { x: rawX_mm, y: target.y / scale }];
                    if (newPts.length > 2) {
                        setMeasurePts([newPts[2]]); // reset to 1st point of new measurement
                    } else {
                        setMeasurePts(newPts);
                    }
                }
            }}
        >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
    );
};

const PipeCrossSection = ({ line, onStartDrag }) => {
    const OD = line.OD_in * 25.4;
    const ins = line.insulationThk || 0;
    const flgRadius = line.flgRad_in * 25.4;
    const hasFlange = line.hasFlange !== false;

    // Position
    const [hovered, setHover] = useState(false);
    const x = line.x_mm * scale;
    const y = line.y_mm * scale;

    const r = OD / 2;
    const totalRad = r + ins;

    const bind = useDrag(({ active, first, last }) => {
        if (first) {
            onStartDrag(line.id);
        }
        if (active) {
            // Wait for Global Event to capture coordinates via DraggablePlane
        }
        if (last) {
            // Remove the incorrect state reset here. FinalizeDrag on the plane handles the actual drop logic.
            // onStartDrag(line, false) was passing the full object and incorrectly wiping out state prematurely.
        }
    });

    // Shoe Calculation
    let hasShoe = ins > 0;
    let shoeHeight = hasShoe ? Math.max(100, Math.ceil((ins + 25) / 50) * 50) : 0;

    // Adjust y to account for shoe
    const drawY = y + (hasShoe ? shoeHeight * scale : 0) + totalRad * scale + 1;

    const springsShoe = useSpring({
        x: x,
        y: drawY,
        config: { mass: 1, tension: 280, friction: 60 }
    });

    const tierDiff = 3000;
    const loopElevation_mm = tierDiff / 2;

    return (
        <_animated.group
            {...bind()}
            onPointerDown={(e) => {
                // R3F will set capture automatically. Release it immediately so the invisible plane
                // can receive global pointerMove and pointerUp events for dragging.
                e.stopPropagation();
                if (e.target.hasPointerCapture(e.pointerId)) {
                    e.target.releasePointerCapture(e.pointerId);
                }
            }}
            position-x={springsShoe.x}
            position-y={springsShoe.y}
            onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHover(false); }}
        >
            {/* Shoe Graphics */}
            {hasShoe && (
                <group position={[0, -totalRad * scale - (shoeHeight * scale) / 2, 0]}>
                    {/* Vertical web */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[10 * scale, shoeHeight * scale, 5 * scale]} />
                        <meshStandardMaterial color="#94a3b8" />
                    </mesh>
                    {/* Horizontal base flange */}
                    <mesh position={[0, -(shoeHeight * scale) / 2, 0]}>
                        <boxGeometry args={[Math.max(100 * scale, r * scale), 5 * scale, 10 * scale]} />
                        <meshStandardMaterial color="#94a3b8" />
                    </mesh>
                </group>
            )}

            {/* 3D Loop Ghost Representation (Red dashed line going up) */}
            {line.is3DLoop && (
                <group position={[0, 0, 0]}>
                    <Line
                        points={[[0, 0, 0], [0, loopElevation_mm * scale, 0], [1000 * scale * (line.loopDir === 'South' ? -1 : 1), loopElevation_mm * scale, 0]]}
                        color="#ef4444"
                        lineWidth={3}
                        dashed
                        dashSize={5}
                        gapSize={5}
                    />
                </group>
            )}

            {/* Insulation */}
            {ins > 0 && (
                <mesh position={[0, 0, -0.5]}>
                    <circleGeometry args={[totalRad * scale, 32]} />
                    <meshStandardMaterial color={hovered ? '#cbd5e1' : '#64748b'} wireframe={false} opacity={0.6} transparent side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Pipe */}
            <mesh position={[0, 0, 0]}>
                <circleGeometry args={[r * scale, 32]} />
                <meshStandardMaterial color={line.color || '#38bdf8'} side={THREE.DoubleSide} />
            </mesh>

            <mesh position={[0, 0, 1]}>
                <ringGeometry args={[r * scale * 0.9, r * scale, 32]} />
                <meshStandardMaterial color="#0f172a" side={THREE.DoubleSide} />
            </mesh>

            {/* Flange Allowance */}
            {hasFlange && (
                <mesh position={[0, 0, -1]}>
                    <ringGeometry args={[totalRad * scale, flgRadius * scale, 32]} />
                    <meshStandardMaterial color="#cbd5e1" wireframe opacity={0.3} transparent side={THREE.DoubleSide} />
                </mesh>
            )}

            {hovered && (
                <Html position={[0, (totalRad + Math.max(flgRadius, 0)) * scale + 2, 0]} center zIndexRange={[100, 0]}>
                    <div style={{
                        color: '#f8fafc', fontSize: '10px', fontWeight: 'bold',
                        background: '#3b82f6',
                        padding: '4px 6px', borderRadius: '4px', border: `1px solid ${line.color || '#334155'}`,
                        userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
                        boxShadow: '0px 0px 8px #3b82f6',
                        transition: 'all 0.1s ease',
                        textAlign: 'left'
                    }}>
                        <div style={{ color: '#020617', marginBottom: '2px', fontSize: '11px', borderBottom: '1px solid #1e293b', paddingBottom: '2px' }}>{line.id}</div>
                        <div style={{ fontSize: '9px', color: '#f1f5f9', lineHeight: '1.3' }}>{line.sizeNps}" {line.service ? line.service.split('-')[0] : 'Proc'}</div>
                        <div style={{ fontSize: '8px', color: '#e2e8f0', lineHeight: '1.3' }}>Ins: {line.insulationThk || 0}mm | Gd: {line.guide_mm || 0}mm</div>
                        <div style={{ fontSize: '8px', color: '#e2e8f0', lineHeight: '1.3' }}>Stg: {line.stagger ? 'Y' : 'N'} | Flg: {hasFlange ? 'Y' : 'N'}</div>
                    </div>
                </Html>
            )}

            {/* Draw brief static label */}
            {!hovered && (
                <Html position={[0, (totalRad + Math.max(flgRadius, 0)) * scale + 2, 0]} center zIndexRange={[100, 0]}>
                    <div style={{
                        color: line.color || '#38bdf8', fontSize: '10px', fontWeight: 'bold',
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '2px 4px', borderRadius: '4px', border: `1px solid rgba(51, 65, 85, 0.5)`,
                        userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap'
                    }}>
                        {line.id}
                    </div>
                </Html>
            )}
        </_animated.group>
    );
};

export default function SectionCanvas({ isMeasureMode, layout, width_mm, cantilever_mm, tiers, onLiveDrag }) {
    const { setPipeManualPosition, pushLog } = usePipeRackStore();

    // Interaction State
    const [activeId, setActiveId] = useState(null);
    const [ghostData, setGhostData] = useState(null);

    // Measure State
    const [measurePts, setMeasurePts] = useState([]);

    // Clear measure points when mode is toggled off
    React.useEffect(() => {
        if (!isMeasureMode) setMeasurePts([]);
    }, [isMeasureMode]);


    if (!layout || layout.length === 0) return null;


    // Calculate topY based on highest tier instead of last pipe
    // Fallback to 150 if tiers object is empty or no max found
    const safeTiers = tiers || {};
    const maxTierNum = Object.keys(safeTiers).length > 0 ? Math.max(...Object.keys(safeTiers).map(Number)) : 1;
    const storeState = usePipeRackStore.getState();
    const highestTierElev_mm = (storeState.structuralSettings.tierElevations_mm && storeState.structuralSettings.tierElevations_mm[maxTierNum]) || (4600 + (maxTierNum - 1) * 3000);
    const topY = highestTierElev_mm * scale;

    const handleStartDrag = (id) => {
        setActiveId(id);
        const pipe = layout.find(l => l.id === id);
        if (pipe) {
            setGhostData({ x_mm: pipe.x_mm, y_mm: pipe.y_mm, neighbor: null, distance_mm: null });
        }
    };


    const activePipeData = activeId ? layout.find(l => l.id === activeId) : null;

    // A wrapping handler to finalize drag
    const finalizeDrag = () => {
        if (activeId && ghostData) {
            setPipeManualPosition(activeId, ghostData.x_mm);

            // Check spacing violation
            let spacingLog = '';
            if (ghostData.neighbor && ghostData.distance_mm < ghostData.s_required) {
                pushLog(`[WARN] ${activeId} spacing violation with ${ghostData.neighbor.id}. Gap: ${ghostData.distance_mm.toFixed(0)}mm (Req: ${ghostData.s_required.toFixed(0)}mm)`);
            } else if (ghostData.neighbor) {
                spacingLog = `, gap to neighbor=${ghostData.distance_mm.toFixed(0)}mm`;
            }

            pushLog(`[DRAG] ${activeId} placed at X=${ghostData.x_mm}mm${spacingLog}`);

            setActiveId(null);
            setGhostData(null);
            document.body.style.cursor = 'default';
        }
    };

    return (
        <Canvas orthographic camera={{ position: [0, topY / 2, 200], zoom: 15, near: 0.1, far: 1000 }}>
            <color attach="background" args={['#020617']} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[100, 200, 100]} intensity={1.5} castShadow />
            <OrbitControls target={[0, topY / 2, 0]} enableRotate={false} />

            <InteractionManager layout={layout} activeId={activeId} setActiveId={finalizeDrag} setGhostData={setGhostData} isMeasureMode={isMeasureMode} measurePts={measurePts} setMeasurePts={setMeasurePts} onLiveDrag={onLiveDrag} />

            {/* Measure Overlay */}
            {isMeasureMode && measurePts.length === 2 && (
                <group>
                    <Line
                        points={[
                            [measurePts[0].x * scale, measurePts[0].y * scale, 0],
                            [measurePts[1].x * scale, measurePts[0].y * scale, 0] // Horizontal only
                        ]}
                        color="#f59e0b"
                        lineWidth={2}
                    />
                    <Line points={[[measurePts[0].x * scale, (measurePts[0].y * scale) - 0.5, 0], [measurePts[0].x * scale, (measurePts[0].y * scale) + 0.5, 0]]} color="#f59e0b" />
                    <Line points={[[measurePts[1].x * scale, (measurePts[0].y * scale) - 0.5, 0], [measurePts[1].x * scale, (measurePts[0].y * scale) + 0.5, 0]]} color="#f59e0b" />
                    <Html position={[((measurePts[0].x + measurePts[1].x) / 2) * scale, measurePts[0].y * scale + 1, 0]} center>
                        <div style={{ background: '#f59e0b', color: '#000', padding: '2px 4px', fontSize: '10px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {Math.abs(measurePts[1].x - measurePts[0].x).toFixed(0)}mm
                        </div>
                    </Html>
                </group>
            )}

            {/* Render Ground */}
            {(() => {
                // If width_mm is present from the layout (the total width including pipes), use it.
                // Otherwise fallback to 5000.
                const w_mm = width_mm || 5000;
                const beamW = w_mm * scale;
                return (
                    <gridHelper args={[beamW * 2, 20]} position={[0, 0, 0]} material-color="#1e293b" />
                );
            })()}

            <group position={[0, 0, 0]}>
                {/* Ground Footer Beam */}
                {(() => {
                    const w_mm = cantilever_mm || width_mm || 5000;
                    const beamW = w_mm * scale;
                    return (
                        <mesh position={[0, -0.5, 0]}>
                            <boxGeometry args={[beamW + 10, 1, 10]} />
                            <meshStandardMaterial color="#334155" />
                        </mesh>
                    );
                })()}

                {/* Render Transverse Beams per Tier */}
                {Object.keys(tiers || {}).map((tierNum) => {
                    // Always calculate y based on formula from store: minClearanceGrade_mm + ((tierNum - 1) * tierGap_mm)
                    const storeState = usePipeRackStore.getState();
                    const y_mm = (storeState.structuralSettings.tierElevations_mm && storeState.structuralSettings.tierElevations_mm[tierNum]) || (4600 + (Number(tierNum) - 1) * 3000);
                    const y = y_mm * scale;

                    // Transverse beams extend to max cantilever width if pipes are dragged outside
                    const w_mm = cantilever_mm || width_mm || 5000;
                    const beamW = w_mm * scale;

                    return (
                        <group key={`tier-group-${tierNum}`}>
                            <mesh position={[0, y, 0]}>
                                <boxGeometry args={[beamW + 10, 2, 10]} />
                                <meshStandardMaterial color="#64748b" />
                            </mesh>
                            {/* Label anchor stays at column width, not cantilever width */}
                            {(() => {
                                const colW = (width_mm || 5000) * scale;
                                return (
                                    <Html key={`tier-label-${tierNum}`} position={[-(colW/2) - 10, y, 0]} center zIndexRange={[100, 0]}>
                                        <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', background: '#0f172a', padding: '4px 8px', border: '1px solid #334155', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto', whiteSpace: 'nowrap' }}>
                                            <span>T{tierNum}</span>
                                            <span style={{ fontSize: '9px' }}>+</span>
                                            <input
                                                type="number"
                                                step="0.001"
                                                style={{ width: '45px', fontSize: '10px', background: 'transparent', color: '#38bdf8', border: 'none', textAlign: 'right', padding: '0', pointerEvents: 'auto', borderBottom: '1px dashed #334155', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={(y_mm / 1000).toFixed(3)}
                                                onBlur={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) {
                                                        usePipeRackStore.getState().updateTierElevation(tierNum, val * 1000);
                                                    }
                                                    e.target.value = (val).toFixed(3);
                                                }}
                                                onKeyDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.key === 'Enter') {
                                                        e.target.blur();
                                                    }
                                                }}
                                                onPointerDown={(e) => { e.stopPropagation(); }}
                                            />
                                            <span style={{fontSize: '9px', color: '#64748b'}}>m</span>
                                        </div>
                                    </Html>
                                );
                            })()}
                        </group>
                    );
                })}

                {/* Render Vertical Columns - These stay at the original struct base width */}
                {(() => {
                    const w_mm = width_mm || 5000;
                    const beamW = w_mm * scale;
                    return (
                        <>
                            <mesh position={[-(beamW/2), topY / 2, 0]}>
                                <boxGeometry args={[2, topY + 10, 10]} />
                                <meshStandardMaterial color="#64748b" />
                            </mesh>
                            <mesh position={[(beamW/2), topY / 2, 0]}>
                                <boxGeometry args={[2, topY + 10, 10]} />
                                <meshStandardMaterial color="#64748b" />
                            </mesh>
                        </>
                    );
                })()}
            </group>

            {/* Render Pipes and Future Slots */}
            {layout.map((line) => {
                if (line.isFutureSlot) {
                    const rectHeight = 600; // Visual height for the future space bounding box
                    return (
                        <group key={`future-${line.id}`} position={[line.x_mm * scale, line.y_mm * scale, 0]}>
                            <mesh position={[0, (rectHeight / 2) * scale, 0]}>
                                <boxGeometry args={[line.gapWidth_mm * scale, rectHeight * scale, 5 * scale]} />
                                <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} depthWrite={false} />
                            </mesh>
                            <lineSegments position={[0, (rectHeight / 2) * scale, 0]}>
                                <edgesGeometry args={[new THREE.BoxGeometry(line.gapWidth_mm * scale, rectHeight * scale, 5 * scale)]} />
                                <lineDashedMaterial color="#3b82f6" dashSize={2} gapSize={2} />
                            </lineSegments>
                            <Html key={`html-future-${line.id}`} center position={[0, (rectHeight / 2) * scale, 0]}>
                                <div style={{ color: '#38bdf8', fontSize: '9px', fontWeight: 'bold', textShadow: '0px 0px 4px #000', textAlign: 'center', background: 'rgba(2, 6, 23, 0.7)', padding: '2px 4px', borderRadius: '4px', border: '1px dashed #3b82f6' }}>
                                    FUTURE SPACE<br/>({line.gapWidth_mm}mm)
                                </div>
                            </Html>
                        </group>
                    );
                }

                // Dim the active pipe
                if (line.id === activeId) {
                    const ins = line.insulationThk || 0;
                    const r = (line.OD_in * 25.4 / 2);
                    return (
                        <group key={line.id} position={[line.x_mm * scale, line.y_mm * scale + (ins > 0 ? Math.max(100, Math.ceil((ins + 25) / 50) * 50) : 0) * scale + (r + ins) * scale + 1, 0]}>
                             <mesh>
                                <circleGeometry args={[r * scale, 32]} />
                                <meshStandardMaterial color="#334155" opacity={0.5} transparent side={THREE.DoubleSide} />
                            </mesh>
                        </group>
                    );
                }

                return <PipeCrossSection key={line.id} line={line} layout={layout} onStartDrag={handleStartDrag} />;
            })}

            {/* Render Ghost Overlay for Dragging */}
            {activeId && ghostData && activePipeData && (
                <group>
                    {(() => {
                        const ins = activePipeData.insulationThk || 0;
                        const r = (activePipeData.OD_in * 25.4 / 2);
                        return (
                            <mesh position={[ghostData.x_mm * scale, ghostData.y_mm * scale + (ins > 0 ? Math.max(100, Math.ceil((ins + 25) / 50) * 50) : 0) * scale + (r + ins) * scale + 1, 0]}>
                                <circleGeometry args={[r * scale, 32]} />
                                <meshStandardMaterial color="#facc15" wireframe opacity={0.8} transparent side={THREE.DoubleSide} />
                            </mesh>
                        );
                    })()}

                    {/* Dimension Line to Nearest Neighbor */}
                    {ghostData.neighbor && (() => {
                        const isViolation = ghostData.distance_mm < ghostData.s_required;
                        const color = isViolation ? '#ef4444' : '#0ea5e9';

                        // Offset the dimension line vertically so it floats above the pipes instead of crossing through them
                        const dimY_offset_mm = 600;

                        return (
                            <group>
                                <Line
                                    points={[[ghostData.x_mm * scale, (ghostData.y_mm + dimY_offset_mm) * scale, 0], [ghostData.neighbor.x_mm * scale, (ghostData.neighbor.y_mm + dimY_offset_mm) * scale, 0]]}
                                    color={color}
                                    lineWidth={2}
                                />
                                {/* Tick Marks */}
                                <Line points={[[ghostData.x_mm * scale, (ghostData.y_mm + dimY_offset_mm - 100) * scale, 0], [ghostData.x_mm * scale, (ghostData.y_mm + dimY_offset_mm + 100) * scale, 0]]} color={color} />
                                <Line points={[[ghostData.neighbor.x_mm * scale, (ghostData.neighbor.y_mm + dimY_offset_mm - 100) * scale, 0], [ghostData.neighbor.x_mm * scale, (ghostData.neighbor.y_mm + dimY_offset_mm + 100) * scale, 0]]} color={color} />

                                {/* Gap Text Label */}
                                <Html position={[((ghostData.x_mm + ghostData.neighbor.x_mm) / 2) * scale, (ghostData.y_mm + dimY_offset_mm + 100) * scale, 0]} center>
                                    <div style={{ background: '#0f172a', border: `1px solid ${color}`, color: color, fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {ghostData.distance_mm.toFixed(0)}mm
                                    </div>
                                </Html>
                            </group>
                        );
                    })()}
                </group>
            )}

        </Canvas>
    );
}
