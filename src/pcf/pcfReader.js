// A rudimentary PCF parser for the standalone app.
// It extracts pipe segments and key fittings from raw PCF text.

export const parsePCF = (pcfText) => {
  const lines = pcfText.split('\n');
  const components = [];
  let currentComponent = null;
  let componentId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    // Detect new component (all caps word without spaces)
    if (/^[A-Z-]+$/.test(line) && line !== 'END') {
      if (currentComponent) {
        components.push(currentComponent);
      }
      currentComponent = {
        id: componentId++,
        type: line,
        points: [],
        attributes: {}
      };
      continue;
    }

    if (currentComponent) {
      if (line.startsWith('END-POINT')) {
        const parts = line.split(/\s+/);
        // END-POINT X Y Z BORE
        if (parts.length >= 4) {
          currentComponent.points.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3])
          });
        }
      } else if (line.startsWith('CENTRE-POINT')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          currentComponent.centrePoint = {
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3])
          };
        }
      } else if (line.startsWith('BRANCH1-POINT')) {
         const parts = line.split(/\s+/);
         if (parts.length >= 4) {
           currentComponent.branch1Point = {
             x: parseFloat(parts[1]),
             y: parseFloat(parts[2]),
             z: parseFloat(parts[3])
           };
         }
      }
    }
  }

  if (currentComponent) {
    components.push(currentComponent);
  }

  // Map to the format expected by the 3D Viewer (start, end, radius)
  const viewerData = components.map(c => {
    
    // For pipes
    if (c.type === 'PIPE' && c.points && c.points.length >= 2) {
      return {
        id: c.id.toString(),
        type: c.type,
        start: [c.points[0].x, c.points[0].y, c.points[0].z],
        end: [c.points[1].x, c.points[1].y, c.points[1].z],
        radius: 100, // Fixed radius for viz
        points: c.points,
        centrePoint: c.centrePoint,
        branch1Point: c.branch1Point
      };
    } else {
        // Fallback for fittings to connect their points to center
        const p1 = (c.points && c.points[0]) || c.centrePoint || { x: 0, y: 0, z: 0 };
        const p2 = (c.points && c.points[1]) || c.centrePoint || c.branch1Point || p1;
        return {
          id: c.id.toString(),
          type: c.type,
          start: [p1.x, p1.y, p1.z],
          end: [p2.x, p2.y, p2.z],
          radius: 150, // Slightly larger for fittings
          points: c.points,
          centrePoint: c.centrePoint,
          branch1Point: c.branch1Point,
          coOrds: c.points && c.points.length > 0 ? c.points[0] : null
        };
    }
  });

  return viewerData;
};
