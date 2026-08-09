import { ProjectProvider } from './state/ProjectContext';
import Chassis from './components/Chassis';

export default function App() {
  return (
    <ProjectProvider>
      <Chassis />
    </ProjectProvider>
  );
}
