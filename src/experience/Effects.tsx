import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.5} luminanceThreshold={0.85} luminanceSmoothing={0.4} mipmapBlur />
      <Vignette eskil={false} offset={0.24} darkness={0.32} />
    </EffectComposer>
  );
}
