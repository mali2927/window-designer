import Canvas from "./components/Canvas";
import Toolbar from "./components/Toolbar";
import MaterialPanel from "./components/MaterialPanel";
import { useWindowDesignerStore } from "./store/useWindowDesignerStore";

function App() {
  const { undo, redo, toggleGlassFilling, selectedElement } =
    useWindowDesignerStore();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Window Designer</h1>
        </div>
      </header>
      <main className="flex-grow flex">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex">
          <div className="flex-grow">
            <Canvas />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
