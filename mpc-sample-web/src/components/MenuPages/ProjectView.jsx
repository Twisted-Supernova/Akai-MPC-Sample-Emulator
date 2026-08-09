import { useState } from 'react';
import { useProjectState } from '../../state/ProjectContext';
import { createInitialProject } from '../../state/projectReducer';
import { listSavedProjects, saveProject, loadProject } from '../../storage/projectStorage';
import ScreenChrome from '../Display/ScreenChrome';

export default function ProjectView() {
  const { project, dispatchProject, dispatchUi } = useProjectState();
  const [page, setPage] = useState('menu'); // menu | save | load | confirmNew | sdcard
  const [nameInput, setNameInput] = useState(project.name);

  function close() {
    dispatchUi({ type: 'CLOSE_MENU', menu: 'projectMenuOpen' });
    setPage('menu');
  }

  if (page === 'confirmNew') {
    return (
      <ScreenChrome footer={['No', '', 'Yes']}>
        <div style={{ fontSize: 11, marginBottom: 8 }}>New Project</div>
        <div style={{ fontSize: 10, color: 'var(--screen-text-dim)', marginBottom: 12 }}>Clear everything?</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => setPage('menu')}>No</span>
          <span
            style={{ cursor: 'pointer', color: 'var(--screen-accent)' }}
            onClick={() => {
              dispatchProject({ type: 'LOAD_PROJECT', project: createInitialProject() });
              close();
            }}
          >
            Yes
          </span>
        </div>
      </ScreenChrome>
    );
  }

  if (page === 'save') {
    return (
      <ScreenChrome footer={['Cancel', '', 'Do It!']}>
        <div style={{ fontSize: 10, color: 'var(--screen-text-dim)' }}>Create name</div>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          style={{
            background: '#151719', border: '1px solid #2a2a2a', color: 'var(--screen-accent)',
            fontFamily: 'inherit', fontSize: 14, padding: 4, marginTop: 4, width: '100%',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => setPage('menu')}>Cancel</span>
          <span
            style={{ cursor: 'pointer', color: 'var(--screen-green)' }}
            onClick={() => {
              dispatchProject({ type: 'SET_PROJECT_NAME', name: nameInput });
              saveProject(nameInput, { ...project, name: nameInput });
              close();
            }}
          >
            Do It!
          </span>
        </div>
        <div style={{ fontSize: 8, color: 'var(--screen-text-dim)', marginTop: 8 }}>
          Saves pad params + sequences only - re-attach your own audio files after loading.
        </div>
      </ScreenChrome>
    );
  }

  if (page === 'load') {
    const saved = listSavedProjects();
    return (
      <ScreenChrome footer={['Back', '', '']}>
        <div style={{ fontSize: 10, color: 'var(--screen-text-dim)', marginBottom: 4, cursor: 'pointer' }} onClick={() => setPage('menu')}>
          ◄ Back
        </div>
        {saved.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>No saved projects yet.</div>
        ) : (
          saved.map((n) => (
            <div
              key={n}
              onClick={() => {
                const p = loadProject(n);
                if (p) dispatchProject({ type: 'LOAD_PROJECT', project: p });
                close();
              }}
              style={{ padding: '4px 3px', fontSize: 10, cursor: 'pointer', borderBottom: '1px solid #1c1e22' }}
            >
              {n}
            </div>
          ))
        )}
      </ScreenChrome>
    );
  }

  if (page === 'sdcard') {
    return (
      <ScreenChrome footer={['Back', '', '']}>
        <div style={{ fontSize: 10, color: 'var(--screen-text-dim)', marginBottom: 4, cursor: 'pointer' }} onClick={() => setPage('menu')}>
          ◄ Back
        </div>
        <div style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>
          microSD Card Access is hardware-only (no physical card slot exists in a browser) - shown here as
          an inert placeholder. See README.
        </div>
      </ScreenChrome>
    );
  }

  const rows = [
    { label: 'Load Project', onClick: () => setPage('load') },
    { label: 'Save Project', onClick: () => setPage('save') },
    { label: 'New Project', onClick: () => setPage('confirmNew') },
    { label: 'SD Card Access', onClick: () => setPage('sdcard') },
  ];

  return (
    <ScreenChrome footer={['Back', '', '']}>
      <div style={{ fontSize: 10, color: 'var(--screen-accent)', marginBottom: 4 }}>Project</div>
      {rows.map((r) => (
        <div
          key={r.label}
          onClick={r.onClick}
          style={{ padding: '5px 3px', fontSize: 10, cursor: 'pointer', borderBottom: '1px solid #1c1e22' }}
        >
          {r.label}
        </div>
      ))}
    </ScreenChrome>
  );
}
