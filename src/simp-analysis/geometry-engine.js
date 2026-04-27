export const project3DTo2D = (pt3d, plane) => {
  if (plane === 'XY') return [pt3d[0], pt3d[1], 0];
  if (plane === 'XZ') return [pt3d[0], pt3d[2], 0];
  if (plane === 'YZ') return [pt3d[1], pt3d[2], 0];
  return pt3d;
};

export const calcGBM = (E, od, dx, L2) => {
  return (E * od * dx) / (L2 * L2);
};

export const calcReqLength = (E, od, dx, Sa) => {
  return Math.sqrt((E * od * dx) / Sa);
};

export const determineSafety = (Scalc, Sa) => {
  return Scalc <= Sa ? 'green' : 'red';
};
