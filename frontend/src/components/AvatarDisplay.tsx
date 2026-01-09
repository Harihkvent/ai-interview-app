import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
  glbPath: string;
  animationState: 'idle' | 'speaking' | 'listening' | 'thinking';
  isSpeaking?: boolean;
}

function Avatar3DModel({ glbPath, animationState, isSpeaking }: Avatar3DProps) {
  const { scene, animations } = useGLTF(glbPath);
  const modelRef = useRef<THREE.Group>(null);
  const [mixer] = useState(() => new THREE.AnimationMixer(scene));

  // Setup animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      // Play first animation if available (idle animation)
      const action = mixer.clipAction(animations[0]);
      action.play();
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer]);

  // Update mixer on each frame
  useFrame((state, delta) => {
    mixer.update(delta);

    if (modelRef.current) {
      // Simple lip-sync simulation when speaking
      if (isSpeaking && animationState === 'speaking') {
        // Simulate mouth movement with simple jaw rotation
        const time = state.clock.getElapsedTime();
        const jawBone = modelRef.current.getObjectByName('jaw') || modelRef.current.getObjectByName('Jaw');
        
        if (jawBone) {
          // Oscillate jaw for lip-sync effect
          jawBone.rotation.x = Math.sin(time * 10) * 0.1;
        }
      }

      // Subtle head movement for listening state
      if (animationState === 'listening') {
        const time = state.clock.getElapsedTime();
        modelRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
      }

      // Thinking state - slight tilt
      if (animationState === 'thinking') {
        const time = state.clock.getElapsedTime();
        modelRef.current.rotation.z = Math.sin(time * 0.3) * 0.03;
      }
    }
  });

  return <primitive ref={modelRef} object={scene} scale={2.0} position={[0, -1.0, 0]} />;
}

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
    <div className="w-full h-[400px] bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden relative">
      {/* State indicator */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
          animationState === 'speaking' ? 'bg-blue-500/20 text-blue-400' :
          animationState === 'listening' ? 'bg-green-500/20 text-green-400 animate-pulse' :
          animationState === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {animationState === 'speaking' && '🗣️ Speaking'}
          {animationState === 'listening' && '👂 Listening'}
          {animationState === 'thinking' && '🤔 Thinking'}
          {animationState === 'idle' && '😊 Ready'}
        </div>
      </div>

      {loadError ? (
        /* Fallback UI when .glb file is missing */
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="text-8xl mb-6 animate-bounce">🤖</div>
          <h3 className="text-xl font-bold mb-3 text-yellow-400">Avatar File Missing</h3>
          <p className="text-sm text-gray-400 mb-4 max-w-md">
            The 3D avatar file is not found. The interview will continue with voice only.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-xs text-left max-w-md">
            <p className="font-semibold text-blue-300 mb-2">📁 To add the avatar:</p>
            <ol className="space-y-1 text-gray-400">
              <li>1. Place your <code className="bg-black/30 px-1 rounded">.glb</code> file in:</li>
              <li className="ml-4 font-mono text-xs">frontend/public/avatars/interviewer.glb</li>
              <li>2. Refresh the page</li>
            </ol>
          </div>
        </div>
      ) : (
        /* Three.js Canvas */
        <Canvas onCreated={() => setLoadError(false)} onError={() => setLoadError(true)}>
          <PerspectiveCamera makeDefault position={[0, 2.4, 1.2]} fov={40} />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          
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

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

// Preload the GLB file
export function preloadAvatar(glbPath: string = '/avatars/interviewer.glb') {
  useGLTF.preload(glbPath);
}
