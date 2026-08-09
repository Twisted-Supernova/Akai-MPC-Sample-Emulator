import { useRef, useState } from 'react';
import { useProjectState, useCurrentPad } from '../../state/ProjectContext';
import { IMPORT_FORMATS_BROWSER_SUPPORTED } from '../../data/constants';
import ScreenChrome from '../Display/ScreenChrome';

export default function SampleSelectView() {
  const { project, dispatchProject, dispatchUi, engine, registerSample, sampleList } = useProjectState();
  const pad = useCurrentPad();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(true);
  const [error, setError] = useState(null);

  const entries = sampleList.map((s) => [s.id, s.name]);

  function assign(sampleId) {
    const entry = engine.getBufferEntry(sampleId);
    dispatchProject({
      type: 'LOAD_SAMPLE_TO_PAD',
      bank: project.currentPadBank,
      pad: project.currentPad,
      sampleId,
      name: entry?.name ?? '',
    });
  }

  async function handleFiles(fileList) {
    setError(null);
    for (const file of Array.from(fileList)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!IMPORT_FORMATS_BROWSER_SUPPORTED.includes(ext)) {
        setError(`Unsupported format: ${ext}. Try: ${IMPORT_FORMATS_BROWSER_SUPPORTED.join(', ')}`);
        continue;
      }
      try {
        const entry = await engine.loadSampleFromFile(file);
        registerSample(entry);
        assign(entry.id);
      } catch (e) {
        setError(`Could not decode ${file.name}`);
      }
    }
  }

  async function loadDemoKit() {
    const kit = await engine.loadDemoKit();
    kit.forEach((entry) => registerSample(entry));
  }

  return (
    <ScreenChrome footer={['Back', 'Internal/Demo', preview ? 'Preview: On' : 'Preview: Off']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
        <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'sampleSelectOpen' })}>◄ Back</span>
        <span style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>Upload File(s)</span>
        <span style={{ cursor: 'pointer' }} onClick={loadDemoKit}>Load Demo Kit</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <div style={{ fontSize: 8, color: 'var(--screen-red)', marginBottom: 3 }}>{error}</div>}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {entries.length === 0 && (
          <div style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>
            No samples loaded yet. Upload your own files, or load the synthesized placeholder demo kit.
          </div>
        )}
        {entries.map(([id, name]) => (
          <div
            key={id}
            onClick={() => assign(id)}
            style={{
              padding: '3px 3px', fontSize: 10, cursor: 'pointer', borderBottom: '1px solid #1c1e22',
              color: pad.sampleId === id ? 'var(--screen-accent)' : 'var(--screen-text)',
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}
