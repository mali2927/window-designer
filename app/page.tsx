"use client";

import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import MaterialPanel from "../components/MaterialPanel";
import { useWindowDesignerStore } from "../store/useWindowDesignerStore";
import { motion } from "framer-motion";

export default function WindowDesigner() {
  const { undo, redo, toggleGlassFilling, selectedElement } =
    useWindowDesignerStore();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-5 px-6 sm:px-8 lg:px-12">
          <h1 className="text-3xl font-extrabold text-gray-800">
            🪟 Window Visualiser
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex gap-6">
          {/* Sidebar */}

          {/* Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-grow bg-white shadow-lg rounded-lg p-4"
          >
            <Canvas />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
