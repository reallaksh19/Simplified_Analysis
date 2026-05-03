const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));

function intersect3D(pipe1, pipe2) {
    const p1 = pipe1.points[0];
    const p2 = pipe1.points[1];
    const p3 = pipe2.points[0];
    const p4 = pipe2.points[1];

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const v2 = { x: p4.x - p3.x, y: p4.y - p3.y, z: p4.z - p3.z };

    // Find intersection using shortest distance between two lines
    // https://mathworld.wolfram.com/Line-LineIntersection.html
    const cross = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };

    const crossMagSq = cross.x * cross.x + cross.y * cross.y + cross.z * cross.z;

    // Lines are parallel
    if (crossMagSq < 1e-6) {
        return null;
    }

    const t = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

    const tCrossV2 = {
        x: t.y * v2.z - t.z * v2.y,
        y: t.z * v2.x - t.x * v2.z,
        z: t.x * v2.y - t.y * v2.x
    };

    const s = (tCrossV2.x * cross.x + tCrossV2.y * cross.y + tCrossV2.z * cross.z) / crossMagSq;

    return {
        x: p1.x + v1.x * s,
        y: p1.y + v1.y * s,
        z: p1.z + v1.z * s
    };
}

const mockElbow = {
    type: 'ELBOW',
    points: [{x: 10, y: 0, z: 0}, {x: 0, y: 10, z: 0}]
};

const pipe1 = {
    type: 'PIPE',
    points: [{x: 20, y: 0, z: 0}, {x: 10, y: 0, z: 0}]
};

const pipe2 = {
    type: 'PIPE',
    points: [{x: 0, y: 20, z: 0}, {x: 0, y: 10, z: 0}]
};

console.log(intersect3D(pipe1, pipe2));
