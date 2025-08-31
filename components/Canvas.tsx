"use client";

import { useRef, useEffect, useState } from "react";
import {
  useWindowDesignerStore,
  type Element,
} from "../store/useWindowDesignerStore";

const SNAP_THRESHOLD = 10;
const OUTER_BOX_PADDING = 20;
const RESIZE_HANDLE_SIZE = 8;
const SCALE_INTERVAL = 50;
const WOOD_BORDER_WIDTH = 12;
const WOOD_LINE_WIDTH = 8;
const CENTER_POINT_SIZE = 6;

const MATERIAL_PRICES = {
  wood: 0.15,
  aluminum: 0.25,
  glass: 0.1,
  handle: 50,
};

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [handleImage, setHandleImage] = useState<HTMLImageElement | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [scale, setScale] = useState(1);
  const [woodImage, setWoodImage] = useState<HTMLImageElement | null>(null);
  const [showAddHandlePrompt, setShowAddHandlePrompt] = useState(false);
  const [panelWidth, setPanelWidth] = useState<number>(0);
  const [panelHeight, setPanelHeight] = useState<number>(0);

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
    setCurrentTool,
    setCurrentMaterial,
  } = useWindowDesignerStore();

  const outerBox = useRef({
    x: OUTER_BOX_PADDING,
    y: OUTER_BOX_PADDING,
    width: 1000, // Increased width
    height: 680, // Increased height
  });

  // Check if a panel already exists
  const panelExists = elements.some((element) => element.type === "panel");

  useEffect(() => {
    const img = new Image();
    img.src = "/wood.jpg";
    img.onload = () => {
      setWoodImage(img);
    };
  }, []);

  // Update dimension inputs when selected panel changes
  useEffect(() => {
    if (selectedElement && selectedElement.type === "panel") {
      const width = Math.abs(selectedElement.end.x - selectedElement.start.x);
      const height = Math.abs(selectedElement.end.y - selectedElement.start.y);
      setPanelWidth(Math.round(width / 5)); // Convert pixels to inches
      setPanelHeight(Math.round(height / 5)); // Convert pixels to inches
    }
  }, [selectedElement]);
  useEffect(() => {
    const img = new Image();
    img.src = "/door-handle.png";
    img.onload = () => setHandleImage(img);
  }, []);

  const calculateTotalCost = (): number => {
    let totalCost = 0;
    elements.forEach((element) => {
      if (element.type === "line") {
        const length = Math.sqrt(
          Math.pow(element.end.x - element.start.x, 2) +
            Math.pow(element.end.y - element.start.y, 2)
        );
        const lengthInInches = length / 5;
        totalCost +=
          lengthInInches *
          MATERIAL_PRICES[element.material as keyof typeof MATERIAL_PRICES];
      } else if (element.type === "panel") {
        const width = Math.abs(element.end.x - element.start.x);
        const height = Math.abs(element.end.y - element.start.y);
        const perimeter = 2 * (width + height);
        const perimeterInInches = perimeter / 5;
        totalCost +=
          perimeterInInches *
          MATERIAL_PRICES[element.material as keyof typeof MATERIAL_PRICES];
        if (element.filling === "glass") {
          const areaInSquareInches = (width / 5) * (height / 5);
          totalCost += areaInSquareInches * MATERIAL_PRICES.glass;
        }
        // Add handle cost
        if (element.handle) {
          totalCost += MATERIAL_PRICES.handle;
        }
      }
    });
    return totalCost;
  };

  const handleAddDoorHandle = () => {
    if (selectedElement && selectedElement.type === "panel") {
      updateElement(selectedElement.id, { ...selectedElement, handle: true });
      setShowAddHandlePrompt(false);
    } else {
      alert("Please select a panel first to add a door handle.");
    }
  };

  const createPanelFromDimensions = () => {
    if (panelExists) {
      alert(
        "Only one panel is allowed. Please delete the existing panel first."
      );
      return;
    }

    if (panelWidth <= 0 || panelHeight <= 0) {
      alert("Please enter valid dimensions for the panel.");
      return;
    }

    const startX = outerBox.current.x + 100; // Default starting position
    const startY = outerBox.current.y + 100; // Default starting position
    const endX = startX + panelWidth * 5; // Convert inches to pixels (5 pixels per inch)
    const endY = startY + panelHeight * 5; // Convert inches to pixels (5 pixels per inch)

    const newElement: Element = {
      id: Date.now().toString(),
      type: "panel",
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      material: currentMaterial,
    };

    addElement(newElement);
    setSelectedElement(newElement);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f8fafc"; // Light blue-gray background
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawOuterBox(ctx);
      drawElements(ctx);
      drawScale(ctx);
      drawCostAndMaterials(ctx);

      // Draw center points if a panel is selected
      if (selectedElement && selectedElement.type === "panel") {
        drawCenterPoints(ctx, selectedElement);
      }
    }
  }, [elements, woodImage, selectedElement]);

  const saveData = async () => {
    try {
      const totalCost = calculateTotalCost();
      const payload = {
        elements,
        totalCost,
      };

      const response = await fetch("http://localhost:8000/api/window-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Data saved successfully!");
      } else {
        alert("Failed to save data.");
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const loadData = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/window-design");
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();

      // Update store with loaded data
      // This would need to be implemented in your store
      console.log("Loaded data:", data);
      alert("Data loaded successfully!");
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const drawCostAndMaterials = (ctx: CanvasRenderingContext2D) => {
    const totalCost = calculateTotalCost();
    let materialUsage: Record<string, number> = {};

    elements.forEach((element) => {
      if (!materialUsage[element.material]) materialUsage[element.material] = 0;
      if (element.type === "line") {
        materialUsage[element.material] +=
          Math.sqrt(
            Math.pow(element.end.x - element.start.x, 2) +
              Math.pow(element.end.y - element.start.y, 2)
          ) / 5;
      } else if (element.type === "panel") {
        const width = Math.abs(element.end.x - element.start.x) / 5;
        const height = Math.abs(element.end.y - element.start.y) / 5;
        materialUsage[element.material] += 2 * (width + height);
        if (element.filling === "glass") {
          materialUsage["glass"] =
            (materialUsage["glass"] || 0) + width * height;
        }
      }
    });

    ctx.fillStyle = "#334155";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.textAlign = "right";
    let y = ctx.canvas.height - 40;
    ctx.fillText(
      `Total Price: $${totalCost.toFixed(2)}`,
      ctx.canvas.width - 20,
      y
    );
    y -= 20;
    Object.entries(materialUsage).forEach(([material, amount]) => {
      ctx.fillText(
        `${material}: ${amount.toFixed(2)} inches`,
        ctx.canvas.width - 20,
        y
      );
      y -= 20;
    });
  };

  const drawOuterBox = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      outerBox.current.x,
      outerBox.current.y,
      outerBox.current.width,
      outerBox.current.height
    );
  };

  const drawCenterPoints = (ctx: CanvasRenderingContext2D, panel: Element) => {
    const centerX = (panel.start.x + panel.end.x) / 2;
    const centerY = (panel.start.y + panel.end.y) / 2;

    // Draw center points for width and height
    ctx.fillStyle = "#3b82f6";

    // Horizontal center point (width)
    ctx.beginPath();
    ctx.arc(centerX, panel.start.y, CENTER_POINT_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Vertical center point (height)
    ctx.beginPath();
    ctx.arc(panel.start.x, centerY, CENTER_POINT_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Add labels
    ctx.fillStyle = "#334155";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("W/2", centerX, panel.start.y - 10);
    ctx.fillText("H/2", panel.start.x - 15, centerY);
  };

  const drawDoorHandle = (ctx: CanvasRenderingContext2D, panel: Element) => {
    if (!handleImage) return;

    const centerX = (panel.start.x + panel.end.x) / 2;
    const centerY = (panel.start.y + panel.end.y) / 2;

    const handleWidth = 70; // adjust size
    const handleHeight = 70; // adjust size

    ctx.drawImage(
      handleImage,
      centerX - handleWidth / 2,
      centerY - handleHeight / 2,
      handleWidth,
      handleHeight
    );
  };

  const drawElements = (ctx: CanvasRenderingContext2D) => {
    elements.forEach((element) => {
      if (element.type === "line") {
        if (element.material === "wood" && woodImage) {
          drawWoodLine(ctx, element.start, element.end, woodImage);
        } else {
          ctx.beginPath();
          ctx.moveTo(element.start.x, element.start.y);
          ctx.lineTo(element.end.x, element.end.y);
          ctx.strokeStyle = getMaterialColor(element.material);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (element.type === "panel") {
        if (element.material === "wood" && woodImage) {
          drawWoodPanel(ctx, element.start, element.end, woodImage);
        } else {
          ctx.beginPath();
          ctx.rect(
            element.start.x,
            element.start.y,
            element.end.x - element.start.x,
            element.end.y - element.start.y
          );
          ctx.strokeStyle = getMaterialColor(element.material);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (element.filling === "glass") {
          ctx.fillStyle = getMaterialPattern("glass");
          ctx.fill();
        }

        // Draw handle if exists
        if (element.handle) {
          drawDoorHandle(ctx, element);
        }
      }
      if (element === selectedElement) {
        drawSelectionBox(ctx, element);
      }
    });
  };

  const drawWoodLine = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    woodImage: HTMLImageElement
  ) => {
    const length = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);
    ctx.drawImage(woodImage, 0, -WOOD_LINE_WIDTH / 2, length, WOOD_LINE_WIDTH);
    ctx.restore();
  };

  const drawWoodPanel = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    woodImage: HTMLImageElement
  ) => {
    const width = end.x - start.x;
    const height = end.y - start.y;

    // Draw borders
    ctx.save();

    // Top border
    ctx.drawImage(woodImage, start.x, start.y, width, WOOD_BORDER_WIDTH);

    // Right border
    ctx.save();
    ctx.translate(end.x, start.y);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(woodImage, 0, 0, height, WOOD_BORDER_WIDTH);
    ctx.restore();

    // Bottom border
    ctx.drawImage(
      woodImage,
      start.x,
      end.y - WOOD_BORDER_WIDTH,
      width,
      WOOD_BORDER_WIDTH
    );

    // Left border
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(woodImage, 0, 0, height, WOOD_BORDER_WIDTH);
    ctx.restore();

    // Draw corners
    drawWoodCorner(ctx, start.x, start.y, woodImage);
    drawWoodCorner(ctx, end.x - WOOD_BORDER_WIDTH, start.y, woodImage);
    drawWoodCorner(ctx, start.x, end.y - WOOD_BORDER_WIDTH, woodImage);
    drawWoodCorner(
      ctx,
      end.x - WOOD_BORDER_WIDTH,
      end.y - WOOD_BORDER_WIDTH,
      woodImage
    );

    // Glass filling
    if (selectedElement?.filling === "glass") {
      ctx.fillStyle = getMaterialPattern("glass");
      ctx.fillRect(
        start.x + WOOD_BORDER_WIDTH,
        start.y + WOOD_BORDER_WIDTH,
        width - 2 * WOOD_BORDER_WIDTH,
        height - 2 * WOOD_BORDER_WIDTH
      );
    }

    ctx.restore();
  };

  const drawWoodCorner = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    woodImage: HTMLImageElement
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(woodImage, 0, 0, WOOD_BORDER_WIDTH, WOOD_BORDER_WIDTH);
    ctx.restore();
  };

  const drawScale = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#94a3b8";
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "center";

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
    ctx.strokeStyle = "#3b82f6";
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
        ctx.fillStyle = "#3b82f6";
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
        return "#78350f";
      case "aluminum":
        return "#9ca3af";
      default:
        return "#1e293b";
    }
  };

  const getMaterialPattern = (material: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 20;
      canvas.height = 20;
      ctx.fillStyle = "#bfdbfe";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, 0, 20, 20);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#dbeafe";
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

    // Snap to outer box borders
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

    // Snap to element borders
    elements.forEach((element) => {
      if (Math.abs(point.x - element.start.x) < SNAP_THRESHOLD)
        snappedPoint.x = element.start.x;
      if (Math.abs(point.x - element.end.x) < SNAP_THRESHOLD)
        snappedPoint.x = element.end.x;
      if (Math.abs(point.y - element.start.y) < SNAP_THRESHOLD)
        snappedPoint.y = element.start.y;
      if (Math.abs(point.y - element.end.y) < SNAP_THRESHOLD)
        snappedPoint.y = element.end.y;

      // Snap to center points for panels
      if (element.type === "panel") {
        const centerX = (element.start.x + element.end.x) / 2;
        const centerY = (element.start.y + element.end.y) / 2;

        if (Math.abs(point.x - centerX) < SNAP_THRESHOLD)
          snappedPoint.x = centerX;
        if (Math.abs(point.y - centerY) < SNAP_THRESHOLD)
          snappedPoint.y = centerY;

        // Snap to horizontal center (width)
        if (Math.abs(point.y - element.start.y) < SNAP_THRESHOLD)
          snappedPoint.y = element.start.y;

        // Snap to vertical center (height)
        if (Math.abs(point.x - element.start.x) < SNAP_THRESHOLD)
          snappedPoint.x = element.start.x;
      }
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
      if (clickedElement && clickedElement.type === "panel") {
        const resizeHandleClicked = getResizeHandle(mousePos, clickedElement);
        if (resizeHandleClicked) {
          setIsResizing(true);
          setResizeHandle(resizeHandleClicked);
          setStartPoint(mousePos);
        }
      }
    } else if (currentTool === "panel" && !panelExists) {
      setIsDrawing(true);
      setStartPoint(mousePos);
    } else if (currentTool === "panel" && panelExists) {
      alert(
        "Only one panel is allowed. Please delete the existing panel first."
      );
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

      // Update dimension inputs when resizing
      const width = Math.abs(newEnd.x - newStart.x);
      const height = Math.abs(newEnd.y - newStart.y);
      setPanelWidth(Math.round(width / 5));
      setPanelHeight(Math.round(height / 5));
    } else if (isDrawing && startPoint) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawOuterBox(ctx);
        drawElements(ctx);
        drawScale(ctx);

        // Draw center points if a panel is selected
        if (selectedElement && selectedElement.type === "panel") {
          drawCenterPoints(ctx, selectedElement);
        }

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
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
    } else if (isDrawing && startPoint) {
      setIsDrawing(false);
      const endPoint = snapToGrid({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      });

      if (currentTool === "line") {
        const newElement: Element = {
          id: Date.now().toString(),
          type: currentTool,
          start: startPoint,
          end: getSnapEndPoint(startPoint, endPoint),
          material: currentMaterial,
        };
        addElement(newElement);
      } else if (currentTool === "panel" && !panelExists) {
        const newElement: Element = {
          id: Date.now().toString(),
          type: currentTool,
          start: startPoint,
          end: endPoint,
          material: currentMaterial,
        };
        addElement(newElement);
        setSelectedElement(newElement);

        // Update dimension inputs
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        setPanelWidth(Math.round(width / 5));
        setPanelHeight(Math.round(height / 5));
      }
    }

    setStartPoint(null);
  };

  const getSnapEndPoint = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    // First try to snap to existing elements
    const snappedEnd = snapToGrid(end);

    if (snappedEnd.x === end.x && snappedEnd.y === end.y) {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      if (dx > dy) {
        return { x: end.x, y: start.y };
      } else {
        return { x: start.x, y: end.y };
      }
    }

    return snappedEnd;
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
        } else {
          canvas.style.cursor = "default";
        }
      } else {
        canvas.style.cursor = "default";
      }
    }
  };

  const exportCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawOuterBox(ctx);
    drawElements(ctx);
    drawScale(ctx);

    const totalCost = calculateTotalCost();

    ctx.fillStyle = "#334155";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText(
      `Total Price: $${totalCost.toFixed(2)}`,
      canvas.width - 150,
      canvas.height - 20
    );

    const imageURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = imageURL;
    a.download = "window-design.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const designData = JSON.stringify({ elements, totalCost });
    const blob = new Blob([designData], { type: "application/json" });
    const jsonURL = URL.createObjectURL(blob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonURL;
    jsonLink.download = "window-design.json";
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
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

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-slate-800">
            Window Designer
          </h1>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Tool:</span>
            <select
              value={currentTool}
              onChange={(e) => setCurrentTool(e.target.value as any)}
              className="px-3 py-1 border border-slate-300 rounded-md text-sm"
            >
              <option value="select">Select</option>
              <option value="line">Line</option>
              <option value="panel">Panel</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Material:</span>
            <select
              value={currentMaterial}
              onChange={(e) => setCurrentMaterial(e.target.value as any)}
              className="px-3 py-1 border border-slate-300 rounded-md text-sm"
            >
              <option value="wood">Wood</option>
              <option value="aluminum">Aluminum</option>
            </select>
          </div>

          {/* Panel Dimensions Input */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Width (in):</span>
            <input
              type="number"
              value={panelWidth}
              onChange={(e) => setPanelWidth(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-slate-300 rounded-md text-sm"
              min="0"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Height (in):</span>
            <input
              type="number"
              value={panelHeight}
              onChange={(e) => setPanelHeight(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-slate-300 rounded-md text-sm"
              min="0"
            />
          </div>

          <button
            onClick={createPanelFromDimensions}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
            disabled={panelExists}
          >
            Create Panel
          </button>

          <button
            onClick={() => setShowAddHandlePrompt(true)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
          >
            Add Door Handle
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={saveData}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
          >
            Save
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200 transition-colors"
          >
            Load
          </button>
          <button
            onClick={exportCanvas}
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative inline-block bg-white rounded-lg shadow-lg p-2">
          <canvas
            ref={canvasRef}
            width={1100} // Increased width
            height={800} // Increased height
            className="border border-slate-200 rounded"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />

          {/* Scale Display */}
          <div className="absolute bottom-4 left-4 bg-white/80 px-2 py-1 rounded text-sm text-slate-600">
            Scale: {scale.toFixed(2)}x
          </div>

          {/* Cost Display */}
          <div className="absolute bottom-4 right-4 bg-white/80 px-3 py-2 rounded shadow text-sm">
            <div className="font-semibold text-green-600">
              Total Cost: ${calculateTotalCost().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Add Door Handle Modal */}
      {showAddHandlePrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-slate-800 mb-4">
              Add Door Handle
            </h3>
            <p className="text-slate-600 mb-6">
              {selectedElement
                ? "Are you sure you want to add a door handle to the selected panel?"
                : "Please select a panel first to add a door handle."}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddHandlePrompt(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              {selectedElement && (
                <button
                  onClick={handleAddDoorHandle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Handle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
