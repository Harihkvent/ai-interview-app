import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ─── Viseme groups for lip-sync animation ───
const VISEME_KEYS = [
  'visemeAA', 'visemeO', 'visemeEE', 'visemeU', 'visemeI',
  'visemeSS', 'visemeFF', 'visemeTH', 'visemeDD', 'visemeNN',
  'visemeRR', 'visemePP', 'visemeCH', 'visemeKK',
];

const MOUTH_OPEN_KEYS = ['mouthOpen', 'jawOpen', 'mouth_open'];
const BLINK_KEYS_L = ['eyeBlinkLeft', 'eyeBlink_L', 'eye_blink_left'];
const BLINK_KEYS_R = ['eyeBlinkRight', 'eyeBlink_R', 'eye_blink_right'];
const SMILE_KEYS = ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'];
const BROW_KEYS = ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'];

// Head tilt offset (negative X = look upward) so avatar faces the camera
const HEAD_TILT_UP = -0.15;

// ─── Helper: find first matching morph target index on a mesh ───
function findMorphIndex(mesh: THREE.SkinnedMesh | THREE.Mesh, keys: string[]): number {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return -1;
  for (const key of keys) {
    if (key in dict) return dict[key];
  }
  return -1;
}

// ─── Helper: find all viseme indices ───
function findVisemeIndices(mesh: THREE.SkinnedMesh | THREE.Mesh): number[] {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return [];
  const indices: number[] = [];
  for (const key of VISEME_KEYS) {
    if (key in dict) indices.push(dict[key]);
  }
  return indices;
}

// ─── Helper: set morph target influence safely ───
function setMorph(mesh: THREE.SkinnedMesh | THREE.Mesh, index: number, value: number) {
  if (index >= 0 && mesh.morphTargetInfluences && index < mesh.morphTargetInfluences.length) {
    mesh.morphTargetInfluences[index] = value;
  }
}

// ─── Find all morphable meshes in the scene ───
function getMorphMeshes(scene: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        meshes.push(mesh);
      }
    }
  });
  return meshes;
}

// ─── Find head/jaw bone ───
function findBone(scene: THREE.Object3D, names: string[]): THREE.Object3D | null {
  for (const name of names) {
    const bone = scene.getObjectByName(name);
    if (bone) return bone;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// 3D Avatar Model Component
// ═══════════════════════════════════════════════════

interface Avatar3DProps {
  glbPath: string;
  animationState: 'idle' | 'speaking' | 'listening' | 'thinking';
  isSpeaking?: boolean;
}

function Avatar3DModel({ glbPath, animationState, isSpeaking }: Avatar3DProps) {
  const { scene, animations } = useGLTF(glbPath);
  const modelRef = useRef<THREE.Group>(null);
  const [mixer] = useState(() => new THREE.AnimationMixer(scene));

  // Cached morph data
  const morphData = useMemo(() => {
    const meshes = getMorphMeshes(scene);
    console.log(`[Avatar] Found ${meshes.length} morphable meshes`);

    // Log all available morph targets for debugging
    meshes.forEach((mesh) => {
      if (mesh.morphTargetDictionary) {
        console.log(`[Avatar] Mesh "${mesh.name}" morph targets:`, Object.keys(mesh.morphTargetDictionary));
      }
    });

    const data = meshes.map((mesh) => ({
      mesh,
      visemeIndices: findVisemeIndices(mesh),
      mouthOpenIndex: findMorphIndex(mesh, MOUTH_OPEN_KEYS),
      blinkLeftIndex: findMorphIndex(mesh, BLINK_KEYS_L),
      blinkRightIndex: findMorphIndex(mesh, BLINK_KEYS_R),
      smileIndices: SMILE_KEYS.map(k => findMorphIndex(mesh, [k])).filter(i => i >= 0),
      browIndex: findMorphIndex(mesh, BROW_KEYS),
    }));

    const hasVisemes = data.some(d => d.visemeIndices.length > 0);
    const hasMouthOpen = data.some(d => d.mouthOpenIndex >= 0);
    const hasBlink = data.some(d => d.blinkLeftIndex >= 0);

    console.log(`[Avatar] Visemes: ${hasVisemes}, MouthOpen: ${hasMouthOpen}, Blink: ${hasBlink}`);

    return { meshData: data, hasVisemes, hasMouthOpen, hasBlink };
  }, [scene]);

  // Cached bone references
  const bones = useMemo(() => {
    const headBone = findBone(scene, ['Head', 'head', 'Wolf3D_Head', 'mixamorigHead']);
    const jawBone = findBone(scene, ['Jaw', 'jaw', 'Wolf3D_Jaw', 'mixamorigJaw']);
    const neckBone = findBone(scene, ['Neck', 'neck', 'Wolf3D_Neck', 'mixamorigNeck']);
    console.log(`[Avatar] Bones — Head: ${headBone?.name || 'none'}, Jaw: ${jawBone?.name || 'none'}, Neck: ${neckBone?.name || 'none'}`);
    return { headBone, jawBone, neckBone };
  }, [scene]);

  // Blink timer
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(2 + Math.random() * 4);

  // Store base bone rotations
  const baseRotations = useRef<{
    head?: THREE.Euler;
    jaw?: THREE.Euler;
    neck?: THREE.Euler;
  }>({});

  // Setup animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      const action = mixer.clipAction(animations[0]);
      action.play();
    }

    // Capture base rotations
    if (bones.headBone) baseRotations.current.head = bones.headBone.rotation.clone();
    if (bones.jawBone) baseRotations.current.jaw = bones.jawBone.rotation.clone();
    if (bones.neckBone) baseRotations.current.neck = bones.neckBone.rotation.clone();

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, bones]);

  // ─── Per-frame animation ───
  useFrame((state, delta) => {
    mixer.update(delta);

    const time = state.clock.getElapsedTime();
    const { meshData, hasVisemes, hasMouthOpen, hasBlink } = morphData;
    const speaking = isSpeaking && animationState === 'speaking';

    // ═══ 1. LIP-SYNC ANIMATION ═══
    if (speaking) {
      // -- Morph target viseme cycling --
      if (hasVisemes) {
        meshData.forEach(({ mesh, visemeIndices }) => {
          if (visemeIndices.length === 0) return;

          // Cycle through visemes with varying speeds for natural look
          const cycleSpeed = 8; // words per second approximation
          const phase = time * cycleSpeed;

          visemeIndices.forEach((morphIdx, i) => {
            // Each viseme gets a phase-shifted sine wave
            const offset = (i / visemeIndices.length) * Math.PI * 2;
            const intensity = Math.max(0, Math.sin(phase + offset));
            // Scale down so not all visemes fire at full intensity at once
            const scaled = intensity * 0.6 * (0.5 + 0.5 * Math.sin(time * 3.7 + i));
            setMorph(mesh, morphIdx, scaled);
          });
        });
      }

      // -- Mouth open morph target --
      if (hasMouthOpen) {
        meshData.forEach(({ mesh, mouthOpenIndex }) => {
          if (mouthOpenIndex < 0) return;
          // Oscillate mouth open with varied frequencies for natural speech
          const mouthValue =
            0.15 +
            Math.abs(Math.sin(time * 9.5)) * 0.25 +
            Math.abs(Math.sin(time * 6.3)) * 0.15 +
            Math.abs(Math.sin(time * 13.1)) * 0.1;
          setMorph(mesh, mouthOpenIndex, Math.min(mouthValue, 0.7));
        });
      }

      // -- Jaw bone fallback --
      if (!hasVisemes && !hasMouthOpen && bones.jawBone) {
        const jawBase = baseRotations.current.jaw;
        const jawRot =
          Math.abs(Math.sin(time * 10)) * 0.08 +
          Math.abs(Math.sin(time * 7.3)) * 0.05;
        bones.jawBone.rotation.x = (jawBase?.x || 0) + jawRot;
      }

      // Subtle brow raise while speaking
      meshData.forEach(({ mesh, browIndex }) => {
        if (browIndex >= 0) {
          setMorph(mesh, browIndex, 0.1 + Math.sin(time * 2) * 0.05);
        }
      });
    } else {
      // ═══ RESET MOUTH when not speaking ═══
      meshData.forEach(({ mesh, visemeIndices, mouthOpenIndex, browIndex }) => {
        visemeIndices.forEach((idx) => {
          if (mesh.morphTargetInfluences && idx < mesh.morphTargetInfluences.length) {
            // Smooth return to 0
            mesh.morphTargetInfluences[idx] *= 0.85;
          }
        });
        if (mouthOpenIndex >= 0 && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[mouthOpenIndex] *= 0.85;
        }
        if (browIndex >= 0 && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[browIndex] *= 0.9;
        }
      });

      // Reset jaw bone
      if (bones.jawBone && baseRotations.current.jaw) {
        bones.jawBone.rotation.x += (baseRotations.current.jaw.x - bones.jawBone.rotation.x) * 0.1;
      }
    }

    // ═══ 2. EYE BLINKING ═══
    if (hasBlink) {
      blinkTimerRef.current += delta;

      let blinkVal = 0;
      const timeSinceBlink = blinkTimerRef.current;

      if (timeSinceBlink > nextBlinkRef.current) {
        // Quick blink: 0→1→0 over ~0.15s
        const blinkPhase = timeSinceBlink - nextBlinkRef.current;
        if (blinkPhase < 0.15) {
          blinkVal = Math.sin((blinkPhase / 0.15) * Math.PI);
        } else {
          // Schedule next blink
          blinkTimerRef.current = 0;
          nextBlinkRef.current = 2 + Math.random() * 5;
        }
      }

      meshData.forEach(({ mesh, blinkLeftIndex, blinkRightIndex }) => {
        setMorph(mesh, blinkLeftIndex, blinkVal);
        setMorph(mesh, blinkRightIndex, blinkVal);
      });
    }

    // ═══ 3. IDLE ANIMATIONS (always active) ═══
    if (modelRef.current) {
      // -- Breathing --
      const breathe = Math.sin(time * 1.2) * 0.003;
      modelRef.current.position.y = -1.0 + breathe;

      // -- Head sway --
      const headTarget = bones.headBone || bones.neckBone;
      if (headTarget) {
        const baseRot = baseRotations.current.head || baseRotations.current.neck;

        if (animationState === 'listening') {
          // Attentive slight tilt
          headTarget.rotation.x = (baseRot?.x || 0) + HEAD_TILT_UP;
          headTarget.rotation.z = (baseRot?.z || 0) + Math.sin(time * 0.8) * 0.03;
          headTarget.rotation.y = (baseRot?.y || 0) + Math.sin(time * 0.5) * 0.04;
        } else if (animationState === 'thinking') {
          // Thoughtful slow movement
          headTarget.rotation.x = (baseRot?.x || 0) + HEAD_TILT_UP + Math.sin(time * 0.2) * 0.02;
          headTarget.rotation.z = (baseRot?.z || 0) + Math.sin(time * 0.3) * 0.04;
          headTarget.rotation.y = (baseRot?.y || 0) + Math.sin(time * 0.4) * 0.05;
        } else if (speaking) {
          // Gentle nods while speaking
          headTarget.rotation.x = (baseRot?.x || 0) + HEAD_TILT_UP + Math.sin(time * 2.5) * 0.015;
          headTarget.rotation.y = (baseRot?.y || 0) + Math.sin(time * 1.8) * 0.02;
        } else {
          // Idle: very subtle movement
          headTarget.rotation.x = (baseRot?.x || 0) + HEAD_TILT_UP + Math.sin(time * 0.4) * 0.008;
          headTarget.rotation.y = (baseRot?.y || 0) + Math.sin(time * 0.6) * 0.015;
        }
      } else {
        // No bones found — animate the whole model subtly
        if (animationState === 'listening') {
          modelRef.current.rotation.y = Math.sin(time * 0.8) * 0.04;
        } else if (animationState === 'thinking') {
          modelRef.current.rotation.z = Math.sin(time * 0.3) * 0.03;
          modelRef.current.rotation.y = Math.sin(time * 0.4) * 0.03;
        } else if (speaking) {
          modelRef.current.rotation.y = Math.sin(time * 1.5) * 0.02;
          modelRef.current.rotation.x = Math.sin(time * 2.2) * 0.01;
        } else {
          modelRef.current.rotation.y = Math.sin(time * 0.5) * 0.01;
        }
      }

      // -- Subtle smile during idle/listening --
      if (!speaking) {
        meshData.forEach(({ mesh, smileIndices }) => {
          smileIndices.forEach((idx) => {
            setMorph(mesh, idx, 0.1 + Math.sin(time * 0.3) * 0.05);
          });
        });
      }
    }
  });

  return <primitive ref={modelRef} object={scene} scale={2.0} position={[0, -1.0, 0]} />;
}

// ═══════════════════════════════════════════════════
// CSS Fallback Avatar (when 3D model is not available)
// ═══════════════════════════════════════════════════

const FallbackAvatar: React.FC<{
  animationState: 'idle' | 'speaking' | 'listening' | 'thinking';
}> = ({ animationState }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)' }}
    >
      {/* Ambient particles */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.3,
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            borderRadius: '50%',
            background: animationState === 'speaking' ? '#60a5fa' : '#a78bfa',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* Avatar container */}
      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        {/* Outer ring — pulse during listening */}
        <div style={{
          position: 'absolute', inset: '-20px',
          borderRadius: '50%',
          border: `2px solid ${animationState === 'listening' ? '#34d399' : animationState === 'speaking' ? '#60a5fa' : '#6b7280'}`,
          opacity: animationState === 'idle' ? 0.2 : 0.5,
          animation: animationState === 'listening' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          transition: 'all 0.5s ease',
        }} />

        {/* Main avatar circle */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: `3px solid ${
            animationState === 'speaking' ? '#3b82f6' :
            animationState === 'listening' ? '#10b981' :
            animationState === 'thinking' ? '#f59e0b' : '#374151'
          }`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          transition: 'border-color 0.4s ease',
          boxShadow: animationState === 'speaking' ? '0 0 40px rgba(59,130,246,0.2)' :
                     animationState === 'listening' ? '0 0 40px rgba(16,185,129,0.2)' : 'none',
        }}>
          {/* Eyes */}
          <div style={{ display: 'flex', gap: '28px', marginBottom: '16px' }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                width: '12px', height: animationState === 'thinking' ? '6px' : '12px',
                borderRadius: '50%',
                backgroundColor: '#94a3b8',
                transition: 'all 0.3s ease',
                animation: animationState === 'listening' ? 'eyeLook 3s ease-in-out infinite' : 'blink 4s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>

          {/* Mouth */}
          <div style={{
            position: 'relative',
            width: animationState === 'speaking' ? '24px' : '32px',
            height: animationState === 'speaking' ? '24px' : '4px',
            borderRadius: animationState === 'speaking' ? '50%' : '4px',
            backgroundColor: animationState === 'speaking' ? 'transparent' : '#64748b',
            border: animationState === 'speaking' ? '3px solid #64748b' : 'none',
            transition: 'all 0.2s ease',
            animation: animationState === 'speaking' ? 'mouthMove 0.3s ease-in-out infinite alternate' : 'none',
          }} />
        </div>

        {/* Sound waves during speaking */}
        {animationState === 'speaking' && (
          <div style={{
            position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', gap: '4px', alignItems: 'center',
          }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: '3px',
                backgroundColor: '#3b82f6',
                borderRadius: '2px',
                animation: `soundWave 0.5s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        )}

        {/* Thinking dots */}
        {animationState === 'thinking' && (
          <div style={{
            position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '6px',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                animation: 'thinkDot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.3}s`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); opacity: 0.3; }
          to { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes eyeLook {
          0%, 100% { transform: translateX(0); }
          30% { transform: translateX(3px); }
          60% { transform: translateX(-3px); }
        }
        @keyframes mouthMove {
          from { transform: scaleY(0.6) scaleX(1); }
          to { transform: scaleY(1.3) scaleX(0.85); }
        }
        @keyframes soundWave {
          from { height: 8px; }
          to { height: 28px; }
        }
        @keyframes thinkDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// Main AvatarDisplay Component
// ═══════════════════════════════════════════════════

interface AvatarDisplayProps {
  animationState: 'idle' | 'speaking' | 'listening' | 'thinking';
  isSpeaking?: boolean;
  glbPath?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  animationState,
  isSpeaking = false,
  glbPath = '/avatars/interviewer.glb'
}) => {
  const [loadError, setLoadError] = React.useState(false);

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden relative"
      style={{ background: 'linear-gradient(to bottom, #111827, #000000)' }}
    >
      {/* State indicator */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm ${
          animationState === 'speaking' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          animationState === 'listening' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          animationState === 'thinking' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            animationState === 'speaking' ? 'bg-blue-400 animate-pulse' :
            animationState === 'listening' ? 'bg-green-400 animate-pulse' :
            animationState === 'thinking' ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-400'
          }`} />
          {animationState === 'speaking' && 'Speaking'}
          {animationState === 'listening' && 'Listening'}
          {animationState === 'thinking' && 'Thinking'}
          {animationState === 'idle' && 'Ready'}
        </div>
      </div>

      {loadError ? (
        /* Fallback animated avatar */
        <FallbackAvatar animationState={animationState} />
      ) : (
        /* Three.js Canvas */
        <Canvas onCreated={() => setLoadError(false)} onError={() => setLoadError(true)}>
          <PerspectiveCamera makeDefault position={[0, 2.4, 1.2]} fov={40} />

          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />

          {/* Rim light for depth */}
          <pointLight position={[0, 3, -3]} intensity={0.3} color="#6366f1" />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Avatar Model */}
          <React.Suspense fallback={null}>
            <Avatar3DModel
              glbPath={glbPath}
              animationState={animationState}
              isSpeaking={isSpeaking}
            />
          </React.Suspense>
        </Canvas>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

// Preload the GLB file
export function preloadAvatar(glbPath: string = '/avatars/interviewer.glb') {
  useGLTF.preload(glbPath);
}
