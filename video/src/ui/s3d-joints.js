// Joints of Sand3D objects in three.js.
// In a Sand3D GLB every joint is a separate pivot node. GLTFLoader puts its description into
// node.userData.s3d_joint = { name, type, axis, lower, upper, value, mimic }.
//   type      revolute (angle in radians), continuous (angle without limits), prismatic (offset in meters)
//   axis      axis in the node's own frame, already in GLB axes (Y up). Free joints have no axis
//   value     the pose the object was baked with (can be non-zero)
//   mimic     { joint, multiplier }, the joint follows another one with a factor
// Move the joint node itself, all its children follow.
// Checked against the sand3d 1.6.3 exporter (urdf.py, glb_tree).
// Part of sand3d-mcp, MIT license.
import * as THREE from "three";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

// Collect joints. Call right after loading, before scaling individual parts.
export function collectJoints(root) {
  root.updateWorldMatrix(true, true);
  const rootScale = Math.abs(root.getWorldScale(new THREE.Vector3()).x) || 1;
  const joints = [];
  root.traverse((node) => {
    const j = node.userData && node.userData.s3d_joint;
    if (!j) return;
    // inside the file parts are in millimeters under a root with scale 0.001, joint limits are in meters
    const unit = Math.abs(node.parent.getWorldScale(new THREE.Vector3()).x) / rootScale || 1;
    const limited = j.lower !== undefined && j.upper !== undefined;
    joints.push({
      name: j.name, type: j.type, node,
      axis: j.axis ? new THREE.Vector3(j.axis[0], j.axis[1], j.axis[2]).normalize() : null,
      lower: limited ? j.lower : -Infinity,
      upper: limited ? j.upper : Infinity,
      baked: j.value || 0, value: j.value || 0, unit,
      mimic: j.mimic || null, followers: [],
      restPos: node.position.clone(), restQuat: node.quaternion.clone(),
    });
  });
  for (const j of joints) {
    if (!j.mimic) continue;
    const leader = joints.find((k) => k.name === j.mimic.joint);
    if (leader) leader.followers.push(j);
  }
  return joints;
}

function apply(joint, q) {
  joint.value = q;
  if (!joint.axis) return;
  const d = q - joint.baked;
  if (joint.type === "prismatic") {
    _v.copy(joint.axis).applyQuaternion(joint.restQuat).multiplyScalar(d / joint.unit);
    joint.node.position.copy(joint.restPos).add(_v);
  } else {
    _q.setFromAxisAngle(joint.axis, d);
    joint.node.quaternion.copy(joint.restQuat).multiply(_q);
  }
}

// Set the joint to value q (radians or meters). Mimic followers move too.
// Returns the value after clamping to the limits.
export function setJoint(joint, q) {
  q = Math.min(joint.upper, Math.max(joint.lower, q));
  apply(joint, q);
  for (const f of joint.followers) apply(f, q * f.mimic.multiplier);
  return q;
}

// Fraction of travel from 0 to 1. Without limits this is one full turn or 5 cm of travel from the baked pose.
export function setJoint01(joint, t) {
  if (Number.isFinite(joint.lower) && Number.isFinite(joint.upper)) {
    return setJoint(joint, joint.lower + (joint.upper - joint.lower) * t);
  }
  return setJoint(joint, joint.baked + t * (joint.type === "prismatic" ? 0.05 : Math.PI * 2));
}

// Scale the object to the given height (scene units) and stand it on the floor at the origin.
export function fitToHeight(root, height = 1) {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const k = height / (size.y || 1);
  const c = box.getCenter(new THREE.Vector3());
  root.scale.setScalar(k);
  root.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  return k;
}
