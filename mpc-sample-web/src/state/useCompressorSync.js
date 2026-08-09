import { useEffect } from 'react';
import { useProjectState } from './ProjectContext';

// Keeps the audio engine's master-bus compressor in sync with project.compressor - without this,
// the Compressor screen updates but engine.setCompressorState() is never called.
export function useCompressorSync() {
  const { project, engine } = useProjectState();
  const { bypass, attack, release, amount, inBoost, color } = project.compressor;

  useEffect(() => {
    engine.ensureContext();
    engine.setCompressorState({ bypass, attack, release, amount, inBoost, color });
  }, [bypass, attack, release, amount, inBoost, color, engine]);
}
