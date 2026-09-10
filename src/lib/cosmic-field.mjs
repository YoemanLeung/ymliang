/** Real Mini-Millennium galaxy positions with illustrative smoothing.
 * The browser receives XYZ and local smoothing moments. See ASSETS.md.
 */
export function decodeCosmicCatalogue(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 16) throw new Error('Incomplete cosmic catalogue');
  const view = new DataView(buffer);
  if (view.getUint32(0, false) !== 0x43574542 || view.getUint16(4, true) !== 2 || view.getUint16(6, true) !== 20) {
    throw new Error('Unsupported cosmic catalogue format');
  }
  const count = view.getUint32(8, true), boxSize = view.getFloat32(12, true);
  if (count < 1 || count > 25000 || buffer.byteLength !== 16 + count * 20 || boxSize !== 62.5) {
    throw new Error('Invalid cosmic catalogue dimensions');
  }
  const positions = new Float32Array(count * 3), radii = new Float32Array(count);
  const covariance = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    for (let axis = 0; axis < 3; axis++) positions[3*i+axis] = view.getUint16(16+20*i+2*axis, true) / 65535 * boxSize;
    radii[i] = view.getUint16(22+20*i, true) / 65535 * 16;
    if (radii[i] <= 0) throw new Error('Invalid cosmic smoothing radius');
    for (let k = 0; k < 6; k++) covariance[6*i+k] = view.getInt16(24+20*i+2*k, true) / 32767 * 4 * radii[i]**2;
    const [xx, yy, zz, xy, xz, yz] = covariance.subarray(6*i, 6*i+6);
    if (xx <= 0 || xx*yy-xy*xy <= 0 || xx*yy*zz+2*xy*xz*yz-xx*yz*yz-yy*xz*xz-zz*xy*xy <= 0) {
      throw new Error('Invalid cosmic smoothing covariance');
    }
  }
  return {positions, radii, covariance, boxSize, count};
}

const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x-a)/(b-a)));
  return t*t*(3-2*t);
};

// Hash row indices so mobile sampling is independent of catalogue ordering.
function selectionRank(index) {
  let x = (index + 7021) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export function createCosmicField(catalogue, density = 1) {
  if (!Number.isFinite(density) || density <= 0 || density > 1) throw new Error('Density must be in (0, 1]');
  const {positions: source, radii, covariance, count, boxSize} = catalogue;
  const positions = [], variances = [], covariances = [], opacities = [], tones = [];
  const scale = 36 / boxSize;
  for (let i = 0; i < count; i++) {
    if (selectionRank(i) >= density) continue;
    const x = source[3*i] - boxSize/2, y = source[3*i+1] - boxSize/2, z = source[3*i+2] - boxSize/2;
    // A thick slice preserves readable voids instead of superposing the box.
    // Fade boundaries, preserving the original three-dimensional positions.
    const window = (1-smoothstep(10, 16, Math.abs(z))) * (1-smoothstep(26, 31.25, Math.max(Math.abs(x), Math.abs(y))));
    if (window < .015) continue;
    const radius = radii[i];
    positions.push(x*scale, y*scale, z*scale);
    for (let k = 0; k < 3; k++) {
      variances.push(covariance[6*i+k] * scale**2 + .002);
      covariances.push(covariance[6*i+k+3] * scale**2);
    }
    opacities.push(window * Math.min(.13, .024 * Math.pow(2.4/radius, .65)) / Math.sqrt(density));
    tones.push(Math.max(0, Math.min(1, Math.log(4.5/radius)/Math.log(35))));
  }
  return {positions: new Float32Array(positions), variances: new Float32Array(variances), covariances: new Float32Array(covariances),
    opacities: new Float32Array(opacities), tones: new Float32Array(tones)};
}
