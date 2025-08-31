import { FiMousePointer, FiMinusSquare, FiSquare } from "react-icons/fi";
import { useWindowDesignerStore } from "../store/useWindowDesignerStore";

export default function Toolbar() {
  const { currentTool, setCurrentTool } = useWindowDesignerStore();

  return <div className="mb-4"></div>;
}
