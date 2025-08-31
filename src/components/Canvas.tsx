"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  useWindowDesignerStore,
  type Element,
} from "../store/useWindowDesignerStore";

const SNAP_THRESHOLD = 10;
const OUTER_BOX_PADDING = 20;
const RESIZE_HANDLE_SIZE = 8;
const SCALE_INTERVAL = 50; // 50 pixels = 10 inches

// Material prices per inch/square inch
const MATERIAL_PRICES = {
  wood: 0.15, // $0.15 per inch
  aluminum: 0.25, // $0.25 per inch
  glass: 0.1, // $0.10 per square inch
};

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [scale, setScale] = useState(1);

  const {
    elements,
    selectedElement,
    currentTool,
    currentMaterial,
    addElement,
    updateElement,
    setSelectedElement,
    undo,
    redo,
    setElements,
  } = useWindowDesignerStore();
  const handleSave = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/windows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ elements }),
      });
      if (!response.ok) throw new Error("Failed to save");
      alert("Design saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving design");
    }
  };

  // Load elements from API
  const handleLoad = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/windows");
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();

      // Assuming the API returns { elements: [...] }
      if (data.elements) {
        setElements(data.elements);
      }
    } catch (error) {
      console.error("Load error:", error);
      alert("Error loading design");
    }
  };

  const outerBox = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: OUTER_BOX_PADDING,
    y: OUTER_BOX_PADDING,
    width: 760,
    height: 560,
  });

  // Calculate the total cost of the window
  const calculateTotalCost = (): number => {
    let totalCost = 0;

    elements.forEach((element) => {
      if (element.type === "line") {
        // Calculate length of line in pixels
        const length = Math.sqrt(
          Math.pow(element.end.x - element.start.x, 2) +
            Math.pow(element.end.y - element.start.y, 2)
        );

        // Convert to inches (1 pixel = 0.2 inches) and calculate cost
        const lengthInInches = length / 5;
        totalCost +=
          lengthInInches *
          MATERIAL_PRICES[element.material as keyof typeof MATERIAL_PRICES];
      } else if (element.type === "panel") {
        // Calculate perimeter of panel in pixels
        const width = Math.abs(element.end.x - element.start.x);
        const height = Math.abs(element.end.y - element.start.y);
        const perimeter = 2 * (width + height);

        // Convert to inches and calculate frame cost
        const perimeterInInches = perimeter / 5;
        totalCost +=
          perimeterInInches *
          MATERIAL_PRICES[element.material as keyof typeof MATERIAL_PRICES];

        // If panel has glass filling, calculate area cost
        if (element.filling === "glass") {
          const areaInSquareInches = (width / 5) * (height / 5);
          totalCost += areaInSquareInches * MATERIAL_PRICES.glass;
        }
      }
    });

    return totalCost;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawOuterBox(ctx);
      drawElements(ctx);
      drawScale(ctx);
    }
  }, [elements, selectedElement]);

  const drawOuterBox = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      outerBox.current.x,
      outerBox.current.y,
      outerBox.current.width,
      outerBox.current.height
    );
  };

  const drawElements = (ctx: CanvasRenderingContext2D) => {
    elements.forEach((element) => {
      ctx.beginPath();
      if (element.type === "line") {
        ctx.moveTo(element.start.x, element.start.y);
        ctx.lineTo(element.end.x, element.end.y);
        ctx.strokeStyle = getMaterialColor(element.material);
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (element.type === "panel") {
        ctx.rect(
          element.start.x,
          element.start.y,
          element.end.x - element.start.x,
          element.end.y - element.start.y
        );
        if (element.filling === "glass") {
          ctx.fillStyle = getMaterialPattern("glass");
          ctx.fill();
        }
        ctx.strokeStyle = getMaterialColor(element.material);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (element === selectedElement) {
        drawSelectionBox(ctx, element);
      }
    });
  };

  const drawScale = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";

    // Draw X-axis scale with inch markings
    for (
      let x = outerBox.current.x;
      x <= outerBox.current.x + outerBox.current.width;
      x += SCALE_INTERVAL
    ) {
      ctx.beginPath();
      ctx.moveTo(x, outerBox.current.y + outerBox.current.height);
      ctx.lineTo(x, outerBox.current.y + outerBox.current.height + 10);
      ctx.stroke();
      ctx.fillText(
        ((x - outerBox.current.x) / 5).toFixed(0) + '"',
        x,
        outerBox.current.y + outerBox.current.height + 25
      );
    }

    // Draw Y-axis scale with inch markings
    for (
      let y = outerBox.current.y;
      y <= outerBox.current.y + outerBox.current.height;
      y += SCALE_INTERVAL
    ) {
      ctx.beginPath();
      ctx.moveTo(outerBox.current.x, y);
      ctx.lineTo(outerBox.current.x - 10, y);
      ctx.stroke();
      ctx.fillText(
        ((y - outerBox.current.y) / 5).toFixed(0) + '"',
        outerBox.current.x - 25,
        y + 5
      );
    }
  };

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    element: Element
  ) => {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      element.start.x - 5,
      element.start.y - 5,
      element.end.x - element.start.x + 10,
      element.end.y - element.start.y + 10
    );
    ctx.setLineDash([]);

    if (element.type === "panel") {
      const handles = [
        {
          x: element.start.x,
          y: element.start.y,
          cursor: "nwse-resize",
          name: "nw",
        },
        {
          x: element.end.x,
          y: element.start.y,
          cursor: "nesw-resize",
          name: "ne",
        },
        {
          x: element.start.x,
          y: element.end.y,
          cursor: "nesw-resize",
          name: "sw",
        },
        {
          x: element.end.x,
          y: element.end.y,
          cursor: "nwse-resize",
          name: "se",
        },
      ];

      handles.forEach((handle) => {
        ctx.fillStyle = "blue";
        ctx.fillRect(
          handle.x - RESIZE_HANDLE_SIZE / 2,
          handle.y - RESIZE_HANDLE_SIZE / 2,
          RESIZE_HANDLE_SIZE,
          RESIZE_HANDLE_SIZE
        );
      });
    }
  };

  const getMaterialColor = (material: string) => {
    switch (material) {
      case "wood":
        return "#8B4513";
      case "aluminum":
        return "#A9A9A9";
      default:
        return "black";
    }
  };

  const getMaterialPattern = (material: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 20;
      canvas.height = 20;
      ctx.fillStyle = "#87CEFA";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, 0, 20, 20);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(20, 20);
      ctx.moveTo(20, 0);
      ctx.lineTo(0, 20);
      ctx.stroke();
    }
    return ctx?.createPattern(canvas, "repeat") || "";
  };

  const snapToGrid = (point: { x: number; y: number }) => {
    const snappedPoint = { ...point };

    if (Math.abs(point.x - outerBox.current.x) < SNAP_THRESHOLD)
      snappedPoint.x = outerBox.current.x;
    if (
      Math.abs(point.x - (outerBox.current.x + outerBox.current.width)) <
      SNAP_THRESHOLD
    )
      snappedPoint.x = outerBox.current.x + outerBox.current.width;
    if (Math.abs(point.y - outerBox.current.y) < SNAP_THRESHOLD)
      snappedPoint.y = outerBox.current.y;
    if (
      Math.abs(point.y - (outerBox.current.y + outerBox.current.height)) <
      SNAP_THRESHOLD
    )
      snappedPoint.y = outerBox.current.y + outerBox.current.height;

    elements.forEach((element) => {
      if (Math.abs(point.x - element.start.x) < SNAP_THRESHOLD)
        snappedPoint.x = element.start.x;
      if (Math.abs(point.x - element.end.x) < SNAP_THRESHOLD)
        snappedPoint.x = element.end.x;
      if (Math.abs(point.y - element.start.y) < SNAP_THRESHOLD)
        snappedPoint.y = element.start.y;
      if (Math.abs(point.y - element.end.y) < SNAP_THRESHOLD)
        snappedPoint.y = element.end.y;
    });

    return snappedPoint;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = snapToGrid({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    });

    if (currentTool === "select") {
      const clickedElement = elements.find((el) =>
        isPointInElement(mousePos, el)
      );
      setSelectedElement(clickedElement || null);
      if (clickedElement) {
        if (clickedElement.type === "panel") {
          const resizeHandleClicked = getResizeHandle(mousePos, clickedElement);
          if (resizeHandleClicked) {
            setIsResizing(true);
            setResizeHandle(resizeHandleClicked);
          } else {
            setIsDragging(true);
          }
        } else {
          setIsDragging(true);
        }
        setStartPoint(mousePos);
      }
    } else {
      setIsDrawing(true);
      setStartPoint(mousePos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = snapToGrid({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    });

    if (isResizing && selectedElement && startPoint && resizeHandle) {
      const newStart = { ...selectedElement.start };
      const newEnd = { ...selectedElement.end };

      if (resizeHandle.includes("n")) newStart.y = mousePos.y;
      if (resizeHandle.includes("s")) newEnd.y = mousePos.y;
      if (resizeHandle.includes("w")) newStart.x = mousePos.x;
      if (resizeHandle.includes("e")) newEnd.x = mousePos.x;

      updateElement(selectedElement.id, { start: newStart, end: newEnd });
    } else if (isDragging && selectedElement && startPoint) {
      const dx = mousePos.x - startPoint.x;
      const dy = mousePos.y - startPoint.y;
      updateElement(selectedElement.id, {
        start: {
          x: selectedElement.start.x + dx,
          y: selectedElement.start.y + dy,
        },
        end: { x: selectedElement.end.x + dx, y: selectedElement.end.y + dy },
      });
      setStartPoint(mousePos);
    } else if (isDrawing && startPoint) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawOuterBox(ctx);
        drawElements(ctx);
        drawScale(ctx);

        ctx.beginPath();
        if (currentTool === "line") {
          ctx.moveTo(startPoint.x, startPoint.y);
          const endPoint = getSnapEndPoint(startPoint, mousePos);
          ctx.lineTo(endPoint.x, endPoint.y);
        } else if (currentTool === "panel") {
          ctx.rect(
            startPoint.x,
            startPoint.y,
            mousePos.x - startPoint.x,
            mousePos.y - startPoint.y
          );
        }
        ctx.strokeStyle = getMaterialColor(currentMaterial);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    updateCursor(mousePos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    } else if (isDrawing && startPoint) {
      setIsDrawing(false);
      const endPoint = snapToGrid({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      });

      if (currentTool === "line" || currentTool === "panel") {
        const newElement: Element = {
          id: Date.now().toString(),
          type: currentTool,
          start: startPoint,
          end:
            currentTool === "line"
              ? getSnapEndPoint(startPoint, endPoint)
              : endPoint,
          material: currentMaterial,
        };
        addElement(newElement);
      }
    }

    setStartPoint(null);
  };

  const getSnapEndPoint = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    if (dx > dy) {
      return { x: end.x, y: start.y };
    } else {
      return { x: start.x, y: end.y };
    }
  };

  const isPointInElement = (
    point: { x: number; y: number },
    element: Element
  ) => {
    const { start, end } = element;
    return (
      point.x >= Math.min(start.x, end.x) &&
      point.x <= Math.max(start.x, end.x) &&
      point.y >= Math.min(start.y, end.y) &&
      point.y <= Math.max(start.y, end.y)
    );
  };

  const getResizeHandle = (
    point: { x: number; y: number },
    element: Element
  ): string | null => {
    if (element.type !== "panel") return null;

    const handles = [
      { x: element.start.x, y: element.start.y, name: "nw" },
      { x: element.end.x, y: element.start.y, name: "ne" },
      { x: element.start.x, y: element.end.y, name: "sw" },
      { x: element.end.x, y: element.end.y, name: "se" },
    ];

    for (const handle of handles) {
      if (
        Math.abs(point.x - handle.x) <= RESIZE_HANDLE_SIZE / 2 &&
        Math.abs(point.y - handle.y) <= RESIZE_HANDLE_SIZE / 2
      ) {
        return handle.name;
      }
    }

    return null;
  };

  const updateCursor = (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (canvas) {
      if (selectedElement && selectedElement.type === "panel") {
        const resizeHandle = getResizeHandle(point, selectedElement);
        if (resizeHandle) {
          canvas.style.cursor =
            resizeHandle === "nw" || resizeHandle === "se"
              ? "nwse-resize"
              : "nesw-resize";
        } else if (isPointInElement(point, selectedElement)) {
          canvas.style.cursor = "move";
        } else {
          canvas.style.cursor = "default";
        }
      } else {
        canvas.style.cursor = "default";
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newScale = scale + e.deltaY * -0.001;
    setScale(Math.min(Math.max(0.1, newScale), 5));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") undo();
        if (e.key === "y") redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const drawOuterBoxMemo = React.useCallback(drawOuterBox, []);
  const drawElementsMemo = React.useCallback(drawElements, [
    elements,
    selectedElement,
  ]);
  const drawScaleMemo = React.useCallback(drawScale, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-300 bg-white shadow-md"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
      <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow flex flex-col items-end">
        <div>Scale: {scale.toFixed(2)}x</div>
        <div className="font-semibold text-green-600">
          Total Cost: ${calculateTotalCost().toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          Wood: ${MATERIAL_PRICES.wood}/inch | Aluminum: $
          {MATERIAL_PRICES.aluminum}/inch | Glass: ${MATERIAL_PRICES.glass}
          /sq.inch
        </div>
      </div>
    </div>
  );
}
