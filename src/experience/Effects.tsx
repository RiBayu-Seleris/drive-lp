import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/**
 * The composer renders linear HDR and switches the renderer's own tone mapping off, so ACES
 * is applied here; low quality (no composer) uses the renderer's ACES and looks the same.
 * Bloom runs before tone mapping and only catches HDR light: lamps, signals, windows.
 * Two multisamples (with the capped pixel ratio) keep rails and lane lines clean at a fraction
 * of the cost of four; the medium tier also blurs over fewer bloom levels.
 */
export default function Effects({ quality }: { quality: 'high' | 'medium' }) {
  return (
    <EffectComposer multisampling={2}>
      <Bloom mipmapBlur levels={quality === 'high' ? 8 : 6} intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.3} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
