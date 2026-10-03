import * as THREE from 'three';

// The logo's diamond, in glass: transmission, real dispersion and a thin-film iridescence.
export function createGem(envMap, quality) {
  const pts = [[0.001, -0.95], [1.0, -0.02], [1.0, 0.05], [0.6, 0.4], [0.001, 0.4]].map(([x, y]) => new THREE.Vector2(x, y));
  let geo = new THREE.LatheGeometry(pts, quality === 'high' ? 16 : 12);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 1.6,
    ior: 2.4,
    dispersion: 6,
    iridescence: 0.55,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 520],
    specularIntensity: 1,
    envMap,
    envMapIntensity: 2.4,
    attenuationColor: new THREE.Color(1.0, 0.97, 0.92),
    attenuationDistance: 3,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return mesh;
}
