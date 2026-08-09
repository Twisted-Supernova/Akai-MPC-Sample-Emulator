// Project persistence via localStorage - pad parameters, sequences, and song data only.
// Audio buffers are never persisted (decided in the build plan, Section 6/8): saved projects are
// small and fast, but reloading requires re-attaching sample files.

const INDEX_KEY = 'mpc-sample-projects-index';
const PROJECT_PREFIX = 'mpc-sample-project-';

export function listSavedProjects() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveProject(name, project) {
  const serializable = { ...project, savedAt: Date.now() };
  localStorage.setItem(PROJECT_PREFIX + name, JSON.stringify(serializable));
  const index = listSavedProjects().filter((n) => n !== name);
  index.unshift(name);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadProject(name) {
  const raw = localStorage.getItem(PROJECT_PREFIX + name);
  return raw ? JSON.parse(raw) : null;
}

export function deleteProject(name) {
  localStorage.removeItem(PROJECT_PREFIX + name);
  const index = listSavedProjects().filter((n) => n !== name);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}
