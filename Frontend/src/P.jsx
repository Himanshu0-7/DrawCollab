import { useRef, useState, Fragment, useEffect } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";

const Canvas = ({
  ActiveTool,
  setActiveTool,
  setPointerEvent,
  setIsEraserEnable,
  encryptionKey, // 🔐 Add this prop
  roomId, // 🔐 Add this prop
}) => {
  const [Shapes, setShapes] = useState([]);
  const [pendingid, setPendingid] = useState([]);
  const [socket, setSocket] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState(new Map());

  const previewNodeRef = useRef(null);
  const layerRef = useRef(null);
  const startPos = useRef(null);
  const shapeRef = useRef({});
  const trRef = useRef(null);
  const isDrawing = useRef(false);
  const isShiftPressed = useRef(false);
  const isDeletePressed = useRef(false);
  const lastPos = useRef(null);
  const ActiveToolRef = useRef(null);
  const isErasingRef = useRef(false);
  const erasedIdsRef = useRef(new Set());

  // 🔐 Initialize WebSocket for real-time collaboration
  useEffect(() => {
    if (!roomId) return;

    const ws = new WebSocket(`ws://localhost:3000/ws?room=${roomId}`);

    ws.onopen = () => {
      console.log("Connected to room:", roomId);
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleWebSocketMessage(message);
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket closed");

    setSocket(ws);

    return () => {
      if (ws) ws.close();
    };
  }, [roomId]);

  // 🔐 Handle incoming WebSocket messages
  const handleWebSocketMessage = async (message) => {
    switch (message.type) {
      case "SCENE_UPDATE":
        await handleRemoteSceneUpdate(message.payload);
        break;

      case "SCENE_UPDATE_DRAWING":
        await handleRemoteDrawingUpdate(message.payload);
        break;

      case "MOUSE_LOCATION":
        handleRemoteMouseLocation(message.payload);
        break;

      case "USER_JOINED":
        console.log("User joined:", message.payload.userName);
        break;

      case "USER_LEFT":
        handleUserLeft(message.payload);
        break;
    }
  };

  // 🔐 Decrypt and merge remote scene updates
  const handleRemoteSceneUpdate = async (payload) => {
    if (!payload.encryptedData || !encryptionKey) return;

    try {
      const decryptedData = await decryptData(
        new Uint8Array(payload.encryptedData),
        encryptionKey,
      );

      const { shapes: remoteShapes } = JSON.parse(decryptedData);

      setShapes((prevShapes) => {
        const shapeMap = new Map(prevShapes.map((s) => [s.id, s]));

        remoteShapes.forEach((remoteShape) => {
          const localShape = shapeMap.get(remoteShape.id);

          if (!localShape || remoteShape.version > localShape.version) {
            shapeMap.set(remoteShape.id, remoteShape);
          }
        });

        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to decrypt scene update:", error);
    }
  };

  // 🔐 Handle live drawing updates (while user is still drawing)
  const handleRemoteDrawingUpdate = async (payload) => {
    if (!payload.encryptedData || !encryptionKey) return;

    try {
      const decryptedData = await decryptData(
        new Uint8Array(payload.encryptedData),
        encryptionKey,
      );

      const { shape: remoteShape } = JSON.parse(decryptedData);

      setShapes((prevShapes) => {
        const shapeMap = new Map(prevShapes.map((s) => [s.id, s]));
        shapeMap.set(remoteShape.id, remoteShape);
        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to decrypt drawing update:", error);
    }
  };

  // Handle remote cursor positions
  const handleRemoteMouseLocation = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.set(payload.userId, {
        x: payload.x,
        y: payload.y,
        userName: payload.userName || "Anonymous",
      });
      return next;
    });

    setTimeout(() => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    }, 3000);
  };

  const handleUserLeft = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.delete(payload.userId);
      return next;
    });
  };

  // 🔐 Encryption helper
  const encryptData = async (data, key) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );

    const blob = new Uint8Array(iv.length + encrypted.byteLength);
    blob.set(iv, 0);
    blob.set(new Uint8Array(encrypted), iv.length);

    return blob;
  };

  // 🔐 Decryption helper
  const decryptData = async (encryptedBlob, key) => {
    const iv = encryptedBlob.slice(0, 12);
    const data = encryptedBlob.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    return new TextDecoder().decode(decrypted);
  };

  // 🔐 Broadcast shape changes to other users
  const broadcastShapeUpdate = async (shapes, isDrawing = false) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !encryptionKey)
      return;

    try {
      const encryptedPayload = await encryptData(
        JSON.stringify({ shapes }),
        encryptionKey,
      );

      socket.send(
        JSON.stringify({
          type: isDrawing ? "SCENE_UPDATE_DRAWING" : "SCENE_UPDATE",
          payload: {
            encryptedData: Array.from(encryptedPayload),
          },
        }),
      );
    } catch (error) {
      console.error("Failed to broadcast update:", error);
    }
  };

  // Send cursor position
  const sendCursorPosition = (x, y) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "MOUSE_LOCATION",
          payload: { x, y },
        }),
      );
    }
  };

  useEffect(() => {
    if (pendingid.length === 0) return;

    const node = pendingid.map((id) => shapeRef.current[id]);
    if (node.length == 0) return;
    trRef.current.nodes(node);
    trRef.current.getLayer().batchDraw();

    setPendingid([]);
  }, [pendingid]);

  useEffect(() => {
    ActiveToolRef.current = ActiveTool;
  }, [ActiveTool]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = true;
        handleUpdateShape();
      }
    };
    const up = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = false;
        handleUpdateShape();
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "Delete") {
        isDeletePressed.current = true;
        handleDeleteShape();
      }
    };
    const up = (e) => {
      if (e.key === "Delete") {
        isDeletePressed.current = false;
        handleDeleteShape();
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const RegisterRef = (id, node) => {
    if (node) {
      shapeRef.current[id] = node;
    } else {
      delete shapeRef.current[id];
    }
  };

  const transformerRef = (id) => {
    const node = shapeRef.current[id];
    if (!node) return;

    const shape = Shapes.find((s) => s.id === id);
    if (!shape || shape.deleted) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();
  };

  const handleDeleteShape = async () => {
    if (!trRef.current) return;

    const selectedNodes = trRef.current.nodes();
    if (selectedNodes.length === 0) return;

    const ids = new Set(selectedNodes.map((node) => node.id()));

    // SOFT DELETE
    const updatedShapes = Shapes.map((shape) =>
      ids.has(shape.id)
        ? { ...shape, deleted: true, version: (shape.version || 0) + 1 }
        : shape,
    );

    setShapes(updatedShapes);

    // 🔐 Broadcast deletion to other users
    await broadcastShapeUpdate(updatedShapes.filter((s) => ids.has(s.id)));

    // cleanup transformer
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  };

  const handleUpdateShape = () => {
    if (!lastPos.current || !startPos.current) return;
    switch (ActiveToolRef.current) {
      case "rect":
        handleRect(lastPos.current, startPos.current.x, startPos.current.y);
        break;
      case "elipse":
        handleElipse(lastPos.current, startPos.current.x, startPos.current.y);
        break;
      case "arrow":
        break;
    }
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
    if (ActiveTool == "") return;
    const point = stage.getPointerPosition();
    startPos.current = { x: point.x, y: point.y };

    if (ActiveTool === "eraser") {
      isDrawing.current = true;
      setIsEraserEnable(true);
      isErasingRef.current = true;
      erasedIdsRef.current.clear();

      const eraserBox = new Konva.Circle({
        x: point.x,
        y: point.y,
        radius: 5,
        listening: false,
      });

      previewNodeRef.current = eraserBox;
      layerRef.current.add(eraserBox);
      layerRef.current.batchDraw();

      setPointerEvent("none");
      return;
    }

    isDrawing.current = true;

    switch (ActiveTool) {
      case "rect":
        previewNodeRef.current = new Konva.Rect({
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          stroke: "black",
          listening: false,
        });
        break;
      case "selection":
        previewNodeRef.current = new Konva.Rect({
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          stroke: "lightblue",
          listening: false,
        });
        break;
      case "elipse":
        previewNodeRef.current = new Konva.Ellipse({
          type: "elipse",
          x: point.x,
          y: point.y,
          radiusX: 0,
          radiusY: 0,
          stroke: "black",
          listening: false,
        });
        break;
      case "arrow":
        previewNodeRef.current = new Konva.Arrow({
          type: "arrow",
          points: [point.x, point.y, point.x, point.y],
          listening: false,
          stroke: "black",
        });
        break;
      case "pencil":
        previewNodeRef.current = new Konva.Line({
          type: "pencil",
          points: [point.x, point.y],
          stroke: "black",
          strokeWidth: "2",
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        });
        break;
    }

    layerRef.current.add(previewNodeRef.current);
    layerRef.current.batchDraw();
    setPointerEvent("none");
  };

  const handleMouseMove = async (e) => {
    if (!isDrawing.current || ActiveTool == "" || !previewNodeRef.current) {
      // 🔐 Send cursor position even when not drawing
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (pos) {
        sendCursorPosition(pos.x, pos.y);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const startX = startPos.current.x;
    const startY = startPos.current.y;
    lastPos.current = pos;

    // 🔐 Send cursor position
    sendCursorPosition(pos.x, pos.y);

    if (ActiveTool === "eraser" && isErasingRef.current) {
      const selectionBox = previewNodeRef.current;

      previewNodeRef.current.setAttrs({
        x: pos.x,
        y: pos.y,
      });
      const box = selectionBox.getClientRect();

      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect()),
        );
      selectedNodes.forEach((node) => {
        node.opacity(0.2);
        erasedIdsRef.current.add(node.id());
      });

      return;
    }

    switch (ActiveTool) {
      case "rect":
        handleRect(pos, startX, startY);
        break;
      case "selection":
        handleRect(pos, startX, startY);
        break;
      case "elipse":
        handleElipse(pos, startX, startY);
        break;
      case "arrow":
        handleArrow(pos, startX, startY);
        break;
      case "pencil":
        handlePencil(pos);
        break;
    }

    // 🔐 Broadcast live drawing updates (throttled)
    if (
      previewNodeRef.current &&
      ActiveTool !== "selection" &&
      ActiveTool !== "eraser"
    ) {
      const attrs = previewNodeRef.current.getAttrs();
      const tempShape = {
        ...attrs,
        id: crypto.randomUUID(), // Temporary ID
        type: ActiveTool,
        version: 1,
        deleted: false,
      };
      await broadcastShapeUpdate([tempShape], true);
    }
  };

  const handleRect = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
    previewNodeRef.current.setAttrs({
      x: Math.min(startX, pos.x),
      y: Math.min(startY, pos.y),
      width: Math.abs(pos.x - startX),
      height: Math.abs(pos.y - startY),
    });
  };

  const handleElipse = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
    const dx = pos.x - startX;
    const dy = pos.y - startY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    let radiusX = Math.abs(dx);
    let radiusY = Math.abs(dy);
    if (isShiftPressed.current) {
      const r = Math.min(radiusX, radiusY);
      radiusX = r;
      radiusY = r;
    }
    previewNodeRef.current.setAttrs({
      radius,
      radiusX,
      radiusY,
    });
  };

  const handleArrow = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
    previewNodeRef.current.setAttrs({
      points: [startX, startY, pos.x, pos.y],
    });
  };

  const handlePencil = (pos) => {
    if (!previewNodeRef.current) return;
    const line = previewNodeRef.current;
    const points = line.points();
    line.points([...points, pos.x, pos.y]);
  };

  const handleMouseUp = async () => {
    if (!isDrawing.current || !previewNodeRef.current || ActiveTool == "")
      return;

    if (ActiveTool === "eraser") {
      layerRef.current.find(".shape").forEach((node) => {
        node.opacity(1);
      });

      const ids = new Set(erasedIdsRef.current);

      const updatedShapes = Shapes.map((shape) =>
        ids.has(shape.id)
          ? { ...shape, deleted: true, version: (shape.version || 0) + 1 }
          : shape,
      );

      setShapes(updatedShapes);

      // 🔐 Broadcast erasure
      await broadcastShapeUpdate(updatedShapes.filter((s) => ids.has(s.id)));

      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();

      previewNodeRef.current.destroy();
      previewNodeRef.current = null;

      erasedIdsRef.current.clear();
      isErasingRef.current = false;
      isDrawing.current = false;

      setIsEraserEnable(false);
      setPointerEvent("");
      return;
    }

    if (ActiveTool === "selection") {
      const selectionBox = previewNodeRef.current;
      const box = selectionBox.getClientRect();
      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect()),
        );

      setPendingid(selectedNodes.map((n) => n.id()));

      selectionBox.destroy();
      previewNodeRef.current = null;

      isDrawing.current = false;
      setActiveTool("selection");
      setPointerEvent("");
      return;
    }

    const attrs = previewNodeRef.current.getAttrs();
    const id = crypto.randomUUID();
    const Name = "shape";
    const newShape = {
      ...attrs,
      id,
      Name,
      type: ActiveTool,
      draggable: true,
      listening: true,
      deleted: false,
      version: 1,
      versionNonce: Math.random(),
    };

    setShapes((prev) => [...prev, newShape]);
    setPendingid([id]);

    // 🔐 Broadcast final shape to other users      
    await broadcastShapeUpdate([newShape]);

    isDrawing.current = false;
    previewNodeRef.current.destroy();
    previewNodeRef.current = null;
    setActiveTool("selection");
    setPointerEvent("");
  };

  return (
    <div className="Canvas-wrapper">
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer ref={layerRef}>
          {Shapes.filter((s) => !s.deleted).map((shape) => {
            return (
              <RenderShape
                key={shape.id}
                shape={shape}
                RegisterRef={RegisterRef}
                transformerRef={transformerRef}
              />
            );
          })}
          <Transformer
            ref={trRef}
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
