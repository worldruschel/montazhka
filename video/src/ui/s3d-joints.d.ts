import * as THREE from 'three';

export interface Sand3DJoint {
  name: string;
  type: 'revolute' | 'continuous' | 'prismatic' | string;
  node: THREE.Object3D;
  axis: THREE.Vector3 | null;
  lower: number;
  upper: number;
  baked: number;
  value: number;
  unit: number;
  mimic: { joint: string; multiplier: number } | null;
  followers: Sand3DJoint[];
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
}

export function collectJoints(root: THREE.Object3D): Sand3DJoint[];
export function setJoint(joint: Sand3DJoint, q: number): number;
export function setJoint01(joint: Sand3DJoint, t: number): number;
export function fitToHeight(root: THREE.Object3D, height?: number): number;
