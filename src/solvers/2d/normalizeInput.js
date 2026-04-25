/**
 * Normalizes Canonical Geometry for 2D Simplified Analysis.
 * Extracts relevant physical properties needed for 2D calculations.
 */
export function normalizeInput(geometry = {}) {
  const { project, units, nodes = [], segments = [], materials = [], loads = [] } = geometry;
  const diagnostics = [];
  const warnings = [];

  if (!units) {
    diagnostics.push({ severity: "ERROR", message: "Canonical geometry must define units." });
  }

  // Find primary material or default
  const primaryMaterial = materials[0] || { id: "default", name: "Generic Steel", E: 29000000, density: 0.283 };
  if (materials.length === 0) {
    warnings.push({ code: "NO_MATERIAL", severity: "WARNING", message: "No material defined. Using default generic steel properties." });
  }

  const normalizedSegments = segments.map(seg => {
    const startNode = nodes.find(n => n.id === seg.startNodeId);
    const endNode = nodes.find(n => n.id === seg.endNodeId);

    if (!startNode || !endNode) {
      diagnostics.push({ severity: "ERROR", message: `Segment ${seg.id} has missing nodes.` });
      return null;
    }

    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const dz = endNode.z - startNode.z;
    const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

    if (length <= 0) {
      diagnostics.push({ severity: "WARNING", message: `Segment ${seg.id} has zero length.` });
    }

    const od = seg.outerDiameter || 0;
    const t = seg.wallThickness || 0;
    const innerDiameter = od - 2 * t;

    let I = 0;
    let Z = 0;
    if (od > 0 && t > 0) {
       I = (Math.PI / 64) * (Math.pow(od, 4) - Math.pow(innerDiameter, 4));
       Z = (Math.PI / 32) * (Math.pow(od, 4) - Math.pow(innerDiameter, 4)) / od;
    } else {
      warnings.push({ code: "MISSING_SECTION_PROPS", severity: "WARNING", message: `Segment ${seg.id} is missing outerDiameter or wallThickness.` });
    }

    return {
      id: seg.id,
      startNodeId: seg.startNodeId,
      endNodeId: seg.endNodeId,
      length,
      od,
      t,
      I,
      Z,
      E: primaryMaterial.E
    };
  }).filter(Boolean);

  return {
    normalizedGeometry: {
      units,
      project,
      segments: normalizedSegments,
      loads
    },
    diagnostics,
    warnings
  };
}
