import { FiMousePointer, FiMinusSquare, FiSquare } from "react-icons/fi";
import { useWindowDesignerStore } from "../store/useWindowDesignerStore";

export default function Toolbar() {
  const { currentTool, setCurrentTool } = useWindowDesignerStore();

  return (
    <div className="mb-4">
      -- <h2 className="text-lg font-semibold mb-2">Tools</h2>
      -- <div className="flex space-x-2">
      --   <button
      --     className={`p-2 rounded ${
      --       currentTool === "select"
      --         ? "bg-blue-500 text-white"
      --         : "bg-gray-200 hover:bg-gray-300"
      --     }`}
      --     onClick={() => setCurrentTool("select")}
      --     title="Select"
      --   >
      --     <FiMousePointer />
      --   </button>
      --   <button
      --     className={`p-2 rounded ${
      --       currentTool === "line"
      --         ? "bg-blue-500 text-white"
      --         : "bg-gray-200 hover:bg-gray-300"
      --     }`}
      --     onClick={() => setCurrentTool("line")}
      --     title="Draw Line"
      --   >
      --     <FiMinusSquare />
      --   </button>
      --   <button
      --     className={`p-2 rounded ${
      --       currentTool === "panel"
      --         ? "bg-blue-500 text-white"
      --         : "bg-gray-200 hover:bg-gray-300"
      --     }`}
      --     onClick={() => setCurrentTool("panel")}
      --     title="Draw Panel"
      --   >
      --     <FiSquare />
      --   </button>
      -- </div>
    </div>
  );
}
