import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { TransformControls } from './TransformControls';
import { CheckCircle, AlertCircle, Settings2, Database, ArrowRight } from 'lucide-react';
import { transformTo2D } from '../transform/projection';
import { extractSubGraph, analyzePipingSystem } from '../simp-analysis/smart2Dconverter';
import { log } from '../utils/logger';
import { transformPayloadToCanonicalGeometry } from '../core/geometry/adapters/transformToCanonicalGeometry';
import { canonicalToSimplified2D } from '../core/geometry/adapters/canonicalToSimplified2D';
import { getAvailableMaterials, getMaterialProperties } from '../utils/materialUtils';

// Very simple 2D Wireframe render with interactive anchors
const GhostProjectionCanvas = ({ segments2D, plane, anchors, onToggleAnchor }) => {
    const canvasRef = useRef(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [nodeMap, setNodeMap] = useState([]); // Array of {x, y, rawIdx}

    useEffect(() => {
        if (!canvasRef.current || !segments2D || segments2D.length === 0) return;
        const ctx = canvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        ctx.clearRect(0, 0, width, height);

        // Find bounding box to scale and center
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        segments2D.forEach(seg => {
            minX = Math.min(minX, seg.start2D[0], seg.end2D[0]);
            maxX = Math.max(maxX, seg.start2D[0], seg.end2D[0]);
            minY = Math.min(minY, seg.start2D[1], seg.end2D[1]);
            maxY = Math.max(maxY, seg.start2D[1], seg.end2D[1]);
        });

        const padding = 40;
        const dX = maxX - minX || 1;
        const dY = maxY - minY || 1;

        const scale = Math.min((width - padding*2) / dX, (height - padding*2) / dY);

        ctx.strokeStyle = '#38bdf8'; // Light blue wireframe
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        segments2D.forEach((seg) => {
            const x1 = padding + (seg.start2D[0] - minX) * scale;
            const y1 = height - (padding + (seg.start2D[1] - minY) * scale); // Flip Y
            const x2 = padding + (seg.end2D[0] - minX) * scale;
            const y2 = height - (padding + (seg.end2D[1] - minY) * scale);

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        });
        ctx.stroke();

        // Draw nodes and collect map for clicking
        const nodes = [];
        segments2D.forEach((seg, i) => {
             const x1 = padding + (seg.start2D[0] - minX) * scale;
             const y1 = height - (padding + (seg.start2D[1] - minY) * scale);

             // In UNIFIED mode, we want to place anchors ON segments, not nodes.
             // In Geo splits, we just show nodes.
             // We'll calculate the mid-point of the segment for hover/anchor visual
             const x2 = padding + (seg.end2D[0] - minX) * scale;
             const y2 = height - (padding + (seg.end2D[1] - minY) * scale);

             // Just rendering the normal nodes
             nodes.push({ x: x1, y: y1, isSegmentNode: false, id: seg.id }); // Start of segment i
             if (i === segments2D.length - 1) {
                 nodes.push({ x: x2, y: y2, isSegmentNode: false, id: null }); // Very end node
             }

             // Midpoint node for placing anchors
             const midX = (x1 + x2) / 2;
             const midY = (y1 + y2) / 2;
             nodes.push({ x: midX, y: midY, isSegmentNode: true, segmentIndex: i, id: null });
        });
        setNodeMap(nodes);

        nodes.forEach(node => {
             if (!node.isSegmentNode) {
                 // Draw standard nodes
                 ctx.fillStyle = '#f8fafc';
                 ctx.beginPath(); ctx.arc(node.x, node.y, 4, 0, 2*Math.PI); ctx.fill();

                 // Show sequence ID text (e.g. 118 from "comp-118-...")
                 if (node.id) {
                     const parts = node.id.split('-');
                     const seqId = parts.length > 1 ? parts[1] : node.id;
                     ctx.fillStyle = '#94a3b8';
                     ctx.font = '10px monospace';
                     ctx.fillText(seqId, node.x + 8, node.y - 8);
                 }
             } else {
                 // It's a segment mid-point, handle anchor display
                 // Map the segment index to the absolute distances we saved in the table
                 // The anchors array stores: { absoluteDist, originalSegmentId }
                 // We need to match it against this segment's absolute position.
                 // We can roughly check if any anchor exists inside this segment.
                 let segDistAccum = 0;
                 let isAnchor = false;
                 for (let j = 0; j <= node.segmentIndex; j++) {
                     if (j === node.segmentIndex) {
                         // Check if any anchor falls in this segment's bounds
                         const startDist = segDistAccum;
                         const endDist = segDistAccum + segments2D[j].trueLength;
                         isAnchor = anchors.find(a => a.absoluteDist >= startDist - 0.1 && a.absoluteDist <= endDist + 0.1);
                     }
                     segDistAccum += segments2D[j].trueLength;
                 }

                 const isHover = hoveredNode === node.segmentIndex;
                 const isValidToAnchor = onToggleAnchor !== null;

                 if (isAnchor) {
                     // Draw Red Triangle for Anchor
                     ctx.fillStyle = '#0f172a';
                     ctx.strokeStyle = '#ef4444'; // Red
                     ctx.lineWidth = 3;
                     const size = 10;
                     ctx.beginPath();
                     ctx.moveTo(node.x, node.y - size);
                     ctx.lineTo(node.x + size, node.y + size);
                     ctx.lineTo(node.x - size, node.y + size);
                     ctx.closePath();
                     ctx.fill();
                     ctx.stroke();
                 } else if (isHover && isValidToAnchor) {
                     // Draw ghost anchor on valid segment
                     ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
                     ctx.strokeStyle = '#fca5a5';
                     ctx.lineWidth = 2;
                     const size = 10;
                     ctx.beginPath();
                     ctx.moveTo(node.x, node.y - size);
                     ctx.lineTo(node.x + size, node.y + size);
                     ctx.lineTo(node.x - size, node.y + size);
                     ctx.closePath();
                     ctx.fill();
                     ctx.stroke();
                 }
             }
        });

    }, [segments2D, plane, anchors, hoveredNode]);

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let found = null;
        for (const node of nodeMap) {
            if (!node.isSegmentNode) continue;
            const dx = node.x - x;
            const dy = node.y - y;
            if (dx*dx + dy*dy < 400) { // radius 20 hover zone for segments
                found = node.segmentIndex;
                break;
            }
        }
        setHoveredNode(found);
        canvasRef.current.style.cursor = found !== null ? 'pointer' : 'default';
    };

    const handleClick = (e) => {
        if (hoveredNode !== null && onToggleAnchor) {
            // Need the true length of the segment to set initial default dist
            const seg = segments2D[hoveredNode];
            onToggleAnchor(hoveredNode, seg ? seg.trueLength : 0);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '250px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 8, left: 12, fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                Ghost Projection ({plane}) - Click nodes to place/remove anchors
            </div>
            <canvas
                ref={canvasRef}
                width={600} height={250}
                style={{ width: '100%', height: '100%' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={handleClick}
            />
        </div>
    );
};


export const TransformTab = () => {
  const selectedIds = useAppStore(state => state.selectedIds);
  const components = useAppStore(state => state.components);
  const mode = useAppStore(state => state.transformMode);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const setBatchAnalysisData = useAppStore(state => state.setBatchAnalysisData);
  const setTransform2DPayload = useAppStore(state => state.setTransform2DPayload);
  const setSimplifiedGeometry = useAppStore(state => state.setSimplifiedGeometry);
  const setActiveCanonicalGeometry = useAppStore(state => state.setActiveCanonicalGeometry);

  const smart2DConversionEnabled = useAppStore(state => state.smart2DConversionEnabled);
  const setSmart2DConversionEnabled = useAppStore(state => state.setSmart2DConversionEnabled);

  const processParams = useAppStore(state => state.processParams);
  const setProcessParams = useAppStore(state => state.setProcessParams);

  const materialMapping = useAppStore(state => state.materialMapping);
  const updateMaterialMapping = useAppStore(state => state.updateMaterialMapping);

  const setProcessingStage = useAppStore(state => state.setProcessingStage);
  const setAnalysisPayload = useAppStore(state => state.setAnalysisPayload);

  const activeGeoTab = useAppStore(state => state.activeGeoTab);
  const setActiveGeoTab = useAppStore(state => state.setActiveGeoTab);
  const tabTransformModes = useAppStore(state => state.tabTransformModes);

  const availableMaterials = useMemo(() => getAvailableMaterials(), []);

  const selectedComps = useMemo(() => components.filter(c => selectedIds.has(c.id)), [components, selectedIds]);

  // Anchor splitting states
  // Array of { absoluteDist: distanceFromStartOfPipeline }
  const [anchors, setAnchors] = useState([]);

  // Find unique materials to map
  const uniqueMaterials = useMemo(() => {
    const mats = new Set();
    selectedComps.forEach(c => {
      const mat = c.attributes?.MATERIAL || c.attributes?.['ITEM-CODE'];
      if (mat) mats.add(mat);
    });
    return Array.from(mats);
  }, [selectedComps]);

  // Handle material selection change
  const handleMaterialChange = (caMaterial, bundleMaterial) => {
    updateMaterialMapping(caMaterial, bundleMaterial);
    // Recalculate properties based on this newly selected material
    const props = getMaterialProperties(bundleMaterial, processParams.deltaT, processParams.od);
    setProcessParams({
        E: Number(props.E),
        alpha: Number(props.alpha),
        Sa: Number(props.Sa),
        I: Number(props.I)
    });
  };

  // Recalculate properties if temp or OD changes
  useEffect(() => {
     // Check if we have mapped any material
     if (uniqueMaterials.length > 0) {
         const mat = uniqueMaterials[0];
         const mappedMat = materialMapping[mat];
         if (mappedMat) {
            const props = getMaterialProperties(mappedMat, processParams.deltaT, processParams.od);
            setProcessParams({
                E: Number(props.E),
                alpha: Number(props.alpha),
                Sa: Number(props.Sa),
                I: Number(props.I)
            });
         }
     }
  }, [processParams.deltaT, processParams.od]);

  // Base raw segments mapping from 3D components
  const baseSegments3D = useMemo(() => {
    return selectedComps.filter(c => c.type === 'PIPE').map(c => {
        return {
            id: c.id,
            start: [c.points[0].x, c.points[0].y, c.points[0].z],
            end: [c.points[1].x, c.points[1].y, c.points[1].z],
            material: c.attributes?.MATERIAL || c.attributes?.['ITEM-CODE'],
            rawComp: c
        };
    });
  }, [selectedComps]);

  // Pre-calculate sequential splits on the 3D data so we can apply modes per-tab
  const splits3D = useMemo(() => {
      if (!baseSegments3D || baseSegments3D.length === 0) return { UNIFIED: [] };

      const splits = { UNIFIED: baseSegments3D };

      if (anchors.length > 0) {
          const sortedAnchors = [...anchors].sort((a, b) => a.absoluteDist - b.absoluteDist);
          let currentSplitIdx = 1;
          let currentSegs = [];
          let accumL = 0;

          baseSegments3D.forEach((seg, i) => {
              const dx = seg.end[0] - seg.start[0];
              const dy = seg.end[1] - seg.start[1];
              const dz = seg.end[2] - seg.start[2];
              const trueL = Math.sqrt(dx*dx + dy*dy + dz*dz);

              // Find first anchor that falls within this raw segment
              const anchor = sortedAnchors.find(a => a.absoluteDist > accumL && a.absoluteDist <= accumL + trueL + 0.1);

              if (anchor) {
                  const localDist = anchor.absoluteDist - accumL;
                  const ratio = Math.max(0, Math.min(1, localDist / trueL));

                  const midPt = [
                      seg.start[0] + dx * ratio,
                      seg.start[1] + dy * ratio,
                      seg.start[2] + dz * ratio
                  ];

                  const part1 = { ...seg, end: midPt, isSplitHalf: true };
                  const part2 = { ...seg, start: midPt, isSplitHalf: true };

                  currentSegs.push(part1);
                  splits[`GEO${currentSplitIdx}`] = currentSegs;
                  currentSplitIdx++;

                  currentSegs = [part2];
              } else {
                  currentSegs.push(seg);
              }
              accumL += trueL;
          });

          if (currentSegs.length > 0) {
              splits[`GEO${currentSplitIdx}`] = currentSegs;
          }
      }

      return splits;
  }, [baseSegments3D, anchors]);

  // Compute the 2D transformation data for all splits based on their respective transform modes
  const { transformedData, logs, geometrySplits } = useMemo(() => {
    if (selectedComps.length === 0) return { transformedData: null, logs: [], geometrySplits: { UNIFIED: [] } };

    const splits2D = {};
    const processLogs = [];
    let unifiedTransformedData = null; // We'll keep the UNIFIED data to represent the overall view

    Object.keys(splits3D).forEach(tabName => {
        const segments3D = splits3D[tabName];
        const tabMode = tabTransformModes[tabName] || tabTransformModes['UNIFIED'] || 'Auto';

        if (smart2DConversionEnabled) {
            // Logical approach
            const rawLegs = segments3D.map(seg => {
                const n1 = seg.start;
                const n2 = seg.end;
                const dx = n2[0] - n1[0];
                const dy = n2[1] - n1[1];
                const dz = n2[2] - n1[2];

                let axis = 'X'; let sign = '+';
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > Math.abs(dz)) { axis = 'X'; sign = dx > 0 ? '+' : '-'; }
                else if (Math.abs(dy) > Math.abs(dz)) { axis = 'Y'; sign = dy > 0 ? '+' : '-'; }
                else { axis = 'Z'; sign = dz > 0 ? '+' : '-'; }

                return {
                    start: n1,
                    end: n2,
                    axis,
                    sign,
                    length: Math.sqrt(dx*dx + dy*dy + dz*dz),
                    hasGuide: false
                };
            });

            const result = analyzePipingSystem(rawLegs);
            let curX = 0; let curY = 0;
            const projectedSegs = result.processedGeometry.map((leg, i) => {
                 const l = leg.length;
                 const start2D = [curX, curY, 0];
                 if (leg.axis === 'X') curX += (leg.sign === '+' ? l : -l);
                 else if (leg.axis === 'Y' || leg.axis === 'Z') curY += (leg.sign === '+' ? l : -l);
                 const end2D = [curX, curY, 0];
                 return {
                     id: `${tabName}-${i+1}`,
                     start2D,
                     end2D,
                     trueLength: l,
                     axis: leg.axis,
                     material: segments3D[i]?.material
                 };
            });

            const projData = { plane: 'Auto (Logical)', segments2D: projectedSegs };
            splits2D[tabName] = projectedSegs;
            if (tabName === 'UNIFIED') unifiedTransformedData = projData;
            if (result.logs) processLogs.push(...result.logs.map(l => `[${tabName}] ${l}`));

        } else {
            // Matrix approach
            const targetPlane = tabMode === 'Auto' ? 'Auto' : (tabMode === 'L' || tabMode === 'Z') ? 'XZ' : 'XY';
            const proj = transformTo2D(segments3D, targetPlane);

            // map material over to proj segments since projection function drops it
            proj.segments2D.forEach((s, i) => s.material = segments3D[i]?.material);

            splits2D[tabName] = proj.segments2D;
            if (tabName === 'UNIFIED') unifiedTransformedData = proj;
            processLogs.push(`[${tabName}] Matrix projection successful. Plane: ${proj.plane}`);
        }
    });

    return {
        transformedData: unifiedTransformedData,
        logs: processLogs,
        geometrySplits: splits2D
    };
  }, [selectedComps, splits3D, smart2DConversionEnabled, tabTransformModes]);

  useEffect(() => {
     if(transformedData) {
         setProcessingStage('stage2', transformedData);
     }
  }, [transformedData, setProcessingStage]);

  // Dynamic Basic Classification
  const activeSegments = geometrySplits[activeGeoTab] || transformedData?.segments2D || [];
  let resultType = 'None';
  if (activeSegments.length > 0) {
      const modeToUse = tabTransformModes[activeGeoTab] || 'Auto';
      if (modeToUse === 'L') resultType = 'L-Bend';
      else if (modeToUse === 'Z') resultType = 'Z-Bend';
      else if (modeToUse === 'Loop') resultType = 'Loop';
      else resultType = activeSegments.length === 2 ? 'L-Bend' : activeSegments.length === 3 ? 'Z-Bend' : 'Complex';
  }

  const toggleAnchor = (segmentIndex, trueLength) => {
      // Calculate absolute distance to start of this segment
      let distToStart = 0;
      for (let i = 0; i < segmentIndex; i++) {
          distToStart += activeSegments[i].trueLength || 0;
      }
      const targetAbsoluteDist = distToStart + (trueLength / 2);

      setAnchors(prev => {
          const existsIdx = prev.findIndex(a => a.absoluteDist > distToStart - 0.1 && a.absoluteDist < distToStart + trueLength + 0.1);
          if (existsIdx >= 0) {
              const copy = [...prev];
              copy.splice(existsIdx, 1);
              return copy;
          }
          return [...prev, { absoluteDist: targetAbsoluteDist }];
      });
      setActiveGeoTab('UNIFIED');
  };

  const updateAnchorDist = (segmentIndex, newLocalDist) => {
      let distToStart = 0;
      for (let i = 0; i < segmentIndex; i++) {
          distToStart += activeSegments[i].trueLength || 0;
      }
      const newAbsoluteDist = distToStart + Number(newLocalDist);
      setAnchors(prev => {
          const existsIdx = prev.findIndex(a => a.absoluteDist > distToStart - 0.1 && a.absoluteDist < distToStart + activeSegments[segmentIndex].trueLength + 0.1);
          if (existsIdx >= 0) {
              const copy = [...prev];
              copy[existsIdx] = { absoluteDist: newAbsoluteDist };
              return copy;
          }
          return prev;
      });
  };

  const handleProceed = () => {
    if (!transformedData) return;

    // We send a batch containing all the geometry splits to analysis
    const batch = [];
    if (Object.keys(geometrySplits).length > 1) {
        // If there are multiple tabs (Geo 1, Geo 2), send them
        Object.keys(geometrySplits).forEach(tab => {
            if (tab !== 'UNIFIED') {
                batch.push({
                    name: tab,
                    plane: transformedData.plane,
                    segments: geometrySplits[tab],
                    matrix: transformedData.matrix,
                    materials: materialMapping,
                    snapshotId: `transform-${tab}`
                });
            }
        });
    } else {
        // Just the UNIFIED or initial payload
        batch.push({
            name: 'Geo 1',
            plane: transformedData.plane,
            segments: geometrySplits['UNIFIED'] || transformedData.segments2D || [],
            matrix: transformedData.matrix,
            materials: materialMapping,
            snapshotId: 'transform-Geo-1'
        });
    }

    setBatchAnalysisData(batch);

    // Phase 3: convert Transform output into canonical geometry, then into a solver-ready 2D payload.
    const activePayload = batch[0] || { name: 'Geo 1', plane: transformedData.plane, segments: [] };
    const transformPayload = {
        ...activePayload,
        schemaVersion: 'transform-2d-v1',
        source: 'transform-tab',
        segments2D: activePayload.segments || [],
        diagnostics: logs.map((message) => ({ severity: 'info', code: 'TRANSFORM_LOG', message })),
        summary: { segmentCount: (activePayload.segments || []).length }
    };
    const canonicalFromTransform = transformPayloadToCanonicalGeometry(transformPayload, { source: 'transform-tab', unit: 'mm' });
    const simplifiedPayload = canonicalToSimplified2D(canonicalFromTransform, { source: 'transform-tab', plane: transformPayload.plane || 'AUTO' });

    setTransform2DPayload(transformPayload);
    setActiveCanonicalGeometry(canonicalFromTransform);
    setSimplifiedGeometry(simplifiedPayload);
    setAnalysisPayload(simplifiedPayload);
    setActiveTab('simpAnalysis');
    log('info', 'TransformTab', 'Proceeded to Simplified Analysis with canonical Phase 3 payload', { batch, simplifiedPayload });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', background: '#0f172a' }}>
      <TransformControls />
      <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', gap: '24px' }}>

        {/* LEFT COLUMN: Settings & Mapping */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 16px 0' }}>
                    <Settings2 size={18} /> Processing Engine
                </h3>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={smart2DConversionEnabled}
                        onChange={e => setSmart2DConversionEnabled(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500' }}>Smart 2D Conversion</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Use logical reduction (L/Z detection, negligible leg removal). If off, uses strict matrix projection.</span>
                    </div>
                </label>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 16px 0', textTransform: 'uppercase', color: '#94a3b8' }}>
                    PROCESS PARAMETERS
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>Change in Temperature, deltaT (Deg C)</label>
                        <input
                            type="number" step="0.1"
                            value={processParams.deltaT}
                            onChange={e => setProcessParams({ deltaT: parseFloat(e.target.value) || 0 })}
                            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>Outer Diameter, OD (mm)</label>
                        <input
                            type="number" step="0.01"
                            value={processParams.od}
                            onChange={e => setProcessParams({ od: parseFloat(e.target.value) || 0 })}
                            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>Elastic Modulus, E (MPa)</label>
                        <input
                            type="number"
                            value={processParams.E}
                            onChange={e => setProcessParams({ E: parseFloat(e.target.value) || 0 })}
                            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>Thermal Expansion, Alpha (mm/mm/C)</label>
                        <input
                            type="number" step="0.00000001"
                            value={processParams.alpha}
                            onChange={e => setProcessParams({ alpha: parseFloat(e.target.value) || 0 })}
                            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>Allowable Stress, Sa (MPa)</label>
                        <input
                            type="number" step="0.1"
                            value={processParams.Sa}
                            onChange={e => setProcessParams({ Sa: parseFloat(e.target.value) || 0 })}
                            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                        />
                    </div>
                </div>

                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '24px 0 16px 0' }}>
                    <Database size={18} /> Material Database Mapping
                </h3>
                {uniqueMaterials.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No materials found in selection.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {uniqueMaterials.map(mat => (
                            <div key={mat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>3D CA: <b>{mat}</b></label>
                                <select
                                    value={materialMapping[mat] || ''}
                                    onChange={e => handleMaterialChange(mat, e.target.value)}
                                    style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', appearance: 'none' }}
                                >
                                    <option value="" disabled>Select Database Material</option>
                                    {availableMaterials.map(dbMat => (
                                        <option key={dbMat} value={dbMat}>{dbMat.length > 30 ? dbMat.substring(0, 30) + '...' : dbMat}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleProceed}
                disabled={selectedComps.length === 0}
                style={{
                    marginTop: 'auto',
                    padding: '16px',
                    background: selectedComps.length > 0 ? '#10b981' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: selectedComps.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                Proceed to Analysis <ArrowRight size={18} />
            </button>
        </div>

        {/* RIGHT COLUMN: Table & Preview */}
        <div style={{ flex: 1, background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0', color: '#f8fafc' }}>
                Transformation Status
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                {selectedComps.length} active segments analyzed. Projection Plane: <b style={{color: '#38bdf8'}}>{transformedData?.plane || 'None'}</b>
              </p>
            </div>
            {resultType !== 'None' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '999px', fontWeight: '600', fontSize: '14px' }}>
                <CheckCircle size={18} />
                {resultType} Detected
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '999px', fontWeight: '600', fontSize: '14px' }}>
                <AlertCircle size={18} />
                No selection
              </div>
            )}
          </div>

          <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
            {selectedComps.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                <p>Please select segments in the 3D Viewer first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Geometry Tabs */}
                {Object.keys(geometrySplits).length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                        {Object.keys(geometrySplits).map(tabName => (
                            <button
                                key={tabName}
                                onClick={() => setActiveGeoTab(tabName)}
                                style={{
                                    background: activeGeoTab === tabName ? '#ef4444' : 'transparent',
                                    color: activeGeoTab === tabName ? '#fff' : '#94a3b8',
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                {tabName}
                            </button>
                        ))}
                    </div>
                )}

                {/* 2D Ghost Preview Canvas */}
                <GhostProjectionCanvas
                    segments2D={geometrySplits[activeGeoTab] || transformedData?.segments2D}
                    plane={transformedData?.plane}
                    anchors={(activeGeoTab === 'UNIFIED' || !smart2DConversionEnabled) ? anchors : []} // Only show interactive anchors in Unified view or if smart mode is disabled
                    onToggleAnchor={(activeGeoTab === 'UNIFIED' || !smart2DConversionEnabled) ? toggleAnchor : null}
                />

                {/* 2D Transformation Table */}
                <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#e2e8f0' }}>2D Transformation Table ({activeGeoTab})</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                                <th style={{ padding: '12px 8px' }}>Leg / ID</th>
                                <th style={{ padding: '12px 8px' }}>Start 2D [X, Y, Z]</th>
                                <th style={{ padding: '12px 8px' }}>End 2D [X, Y, Z]</th>
                                <th style={{ padding: '12px 8px' }}>True L.</th>
                                <th style={{ padding: '12px 8px' }}>Mapped Material</th>
                                {activeGeoTab === 'UNIFIED' && (
                                    <>
                                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Anchor Distance from Start 2D</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Split Geometry</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {(geometrySplits[activeGeoTab] || transformedData?.segments2D)?.map((seg, i, arr) => {
                                const matRaw = seg.material || 'Unknown';
                                const mapped = materialMapping[matRaw] || 'Not Mapped';
                                let distToStart = 0;
                                if (activeGeoTab === 'UNIFIED') {
                                    for (let j = 0; j < i; j++) {
                                        distToStart += activeSegments[j].trueLength || 0;
                                    }
                                }
                                const segLength = seg.trueLength || 0;
                                const isAnchored = activeGeoTab === 'UNIFIED' && anchors.find(a => a.absoluteDist > distToStart - 0.1 && a.absoluteDist < distToStart + segLength + 0.1);
                                const localDistVal = isAnchored ? (isAnchored.absoluteDist - distToStart).toFixed(1) : '-';

                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                                        <td style={{ padding: '12px 8px', color: '#38bdf8', fontWeight: '500' }}>{seg.id || `Leg-${i+1}`}</td>
                                        <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>
                                            {seg.start2D ? `[${seg.start2D.map(n=>n.toFixed(1)).join(', ')}]` : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>
                                            {seg.end2D ? `[${seg.end2D.map(n=>n.toFixed(1)).join(', ')}]` : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 8px' }}>{seg.trueLength?.toFixed(1) || '0.0'}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{
                                                background: mapped === 'Not Mapped' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: mapped === 'Not Mapped' ? '#f87171' : '#34d399',
                                                padding: '2px 6px', borderRadius: '4px'
                                            }}>
                                                {mapped}
                                            </span>
                                        </td>
                                        {(activeGeoTab === 'UNIFIED' || !smart2DConversionEnabled) && (
                                            <>
                                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                    {isAnchored ? (
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={localDistVal}
                                                            onChange={e => updateAnchorDist(i, e.target.value)}
                                                            style={{
                                                                width: '80px',
                                                                background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '4px', textAlign: 'center'
                                                            }}
                                                        />
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => toggleAnchor(i, seg.trueLength)}
                                                        style={{
                                                            background: isAnchored ? 'transparent' : '#334155',
                                                            border: isAnchored ? '1px solid #ef4444' : 'none',
                                                            color: isAnchored ? '#ef4444' : '#cbd5e1',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isAnchored ? 'Remove Anchor' : 'Place Anchor Here'}
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Engine Logs */}
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' }}>Processing Engine Logs</h4>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {logs.length > 0 ? logs.map((l, i) => <div key={i}>{l}</div>) : 'No logs generated.'}
                    </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
