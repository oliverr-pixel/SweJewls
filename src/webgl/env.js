import * as THREE from 'three';

// A dark photo studio baked into a PMREM map: overhead softbox, two tall strip lights,
// a low warm rim and a weak cool fill. The stone shader mirrors the same layout analytically.
export function createEnvironment(renderer) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vDir; void main(){ vec3 c = mix(vec3(0.003,0.004,0.006), vec3(0.04,0.042,0.052), smoothstep(-0.5, 0.9, vDir.y)); gl_FragColor = vec4(c, 1.0); }',
    }),
  );
  scene.add(dome);

  const panel = (w, h, color, intensity, pos) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(12, 5, 0xffffff, 4.5, new THREE.Vector3(0, 10, 0.5));
  panel(1.6, 14, 0xffffff, 8, new THREE.Vector3(-10, 1, 2));
  panel(1.2, 12, 0xfff1dd, 5.5, new THREE.Vector3(10, 0, -1));
  panel(18, 1.6, 0xffbf6b, 3.2, new THREE.Vector3(0, -2, -10));
  panel(5, 5, 0xbcd2ff, 1.2, new THREE.Vector3(3.5, 2, 10));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.015);
  pmrem.dispose();
  scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return rt.texture;
}
