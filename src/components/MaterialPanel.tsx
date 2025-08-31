import { useWindowDesignerStore } from "../store/useWindowDesignerStore"

export default function MaterialPanel() {
  const { currentMaterial, setCurrentMaterial } = useWindowDesignerStore()

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Materials</h2>
      <div className="flex flex-col space-y-2">
        <button
          className={`p-2 rounded ${
            currentMaterial === "wood" ? "bg-yellow-700 text-white" : "bg-yellow-200 hover:bg-yellow-300"
          }`}
          onClick={() => setCurrentMaterial("wood")}
        >
          Wood
        </button>
        <button
          className={`p-2 rounded ${
            currentMaterial === "aluminum" ? "bg-gray-500 text-white" : "bg-gray-300 hover:bg-gray-400"
          }`}
          onClick={() => setCurrentMaterial("aluminum")}
        >
          Aluminum
        </button>
      </div>
    </div>
  )
}

