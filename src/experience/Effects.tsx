import { EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/**
 * The composer renders linear HDR and switches the renderer's own tone mapping off, so ACES
 * is applied here; low quality (no composer) uses the renderer's ACES and looks the same.
 * Two multisamples (with the capped pixel ratio) keep rails and lane lines clean at a fraction
 * of the cost of four. Tone mapping preserves the light range without softening the image.
 */
export default function Effects({ quality }: { quality: 'high' | 'medium' }) {
  return (
    <EffectComposer multisampling={quality === 'high' ? 2 : 0}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
