import { createContext, useContext, useReducer, useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { projectReducer, createInitialProject, padKey, seqKey } from './projectReducer';
import { uiReducer, createInitialUiState } from './uiReducer';
import { audioEngine } from '../audio/AudioEngine';

const ProjectStateContext = createContext(null);
const UNDOABLE_ACTION_TYPES = new Set([
  'UPDATE_PAD', 'UPDATE_PAD_NESTED', 'LOAD_SAMPLE_TO_PAD', 'UPDATE_SEQUENCE', 'ADD_SEQUENCE_EVENT',
  'REMOVE_SEQUENCE_EVENTS_FOR_PAD', 'SET_SEQUENCE_EVENTS', 'HALVE_SEQUENCE', 'DOUBLE_SEQUENCE',
  'SET_SONG', 'ADD_SONG_STEP', 'REMOVE_SONG_STEP',
]);

export function ProjectProvider({ children }) {
  const [project, dispatchProjectRaw] = useReducer(projectReducer, undefined, createInitialProject);
  const [ui, dispatchUi] = useReducer(uiReducer, undefined, createInitialUiState);
  const [sampleList, setSampleList] = useState([]); // [{id, name}] mirrors engine registry, reactively
  const recorderRef = useRef({ mediaRecorder: null, chunks: [] });
  const [recordingState, setRecordingState] = useState({ recording: false, bank: null, pad: null });
  const historyRef = useRef({ past: [], future: [] });
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const dispatchProject = useCallback((action) => {
    if (UNDOABLE_ACTION_TYPES.has(action.type)) {
      historyRef.current.past.push(projectRef.current);
      if (historyRef.current.past.length > 50) historyRef.current.past.shift();
      historyRef.current.future = [];
    }
    dispatchProjectRaw(action);
  }, []);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const previous = past.pop();
    future.push(projectRef.current);
    dispatchProjectRaw({ type: 'LOAD_PROJECT', project: previous });
  }, []);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const next = future.pop();
    past.push(projectRef.current);
    dispatchProjectRaw({ type: 'LOAD_PROJECT', project: next });
  }, []);

  const registerSample = useCallback((entry) => {
    setSampleList((prev) => (prev.some((s) => s.id === entry.id) ? prev : [...prev, { id: entry.id, name: entry.name }]));
  }, []);

  const startSampleRecording = useCallback((bank, pad, stream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mr.start();
    recorderRef.current = { mediaRecorder: mr, chunks };
    setRecordingState({ recording: true, bank, pad });
  }, []);

  const stopSampleRecording = useCallback(() => {
    const { mediaRecorder, chunks } = recorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        recorderRef.current = { mediaRecorder: null, chunks: [] };
        setRecordingState({ recording: false, bank: null, pad: null });
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  const value = useMemo(
    () => ({
      project,
      dispatchProject,
      ui,
      dispatchUi,
      engine: audioEngine,
      registerSample,
      sampleList,
      padKey,
      seqKey,
      recordingState,
      startSampleRecording,
      stopSampleRecording,
      undo,
      redo,
    }),
    [project, ui, registerSample, sampleList, recordingState, startSampleRecording, stopSampleRecording, undo, redo]
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}

export function useProjectState() {
  const ctx = useContext(ProjectStateContext);
  if (!ctx) throw new Error('useProjectState must be used within ProjectProvider');
  return ctx;
}

export function useCurrentPad() {
  const { project } = useProjectState();
  const key = padKey(project.currentPadBank, project.currentPad);
  return project.pads[key];
}

export function useCurrentSequence() {
  const { project } = useProjectState();
  const key = seqKey(project.currentSeqBank, project.currentSeq);
  return project.sequences[key];
}
