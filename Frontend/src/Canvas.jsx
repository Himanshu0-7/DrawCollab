import { useRef, useState, Fragment, useEffect, version } from "react";
import { Stage, Layer, Rect, Transformer, Shape } from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";
const Canvas = ({
  ActiveTool,
  setActiveTool,
  setPointerEvent,
  setIsEraserEnable,
  roomInfo,
  encryptionKey,
}) => {
  // ______________________________________
  //
  //              STATE
  // ______________________________________

  const [Shapes, setShapes] = useState([]);
  const [pendingid, setPendingid] = useState([]);
  const [socket, setSocket] = useState(null);

  // ______________________________________
  //              REFS
  // ______________________________________

  const layerRef = useRef(null);
  const previewNodeRef = useRef(null);
  const trRef = useRef(null);
  const shapeRef = useRef({});
  const currentDrawingIdRef = useRef(null);
  const isShiftPressed = useRef(false);
  const isDrawing = useRef(false);
  const isDeletePressed = useRef(false);
  const isErasingRef = useRef(false);
  const lastPos = useRef(null);

  const ActiveToolRef = useRef(null);
  const startPos = useRef(null);
  const erasedIdsRef = useRef(new Set());
  const [remoteCUrsors, setRemoteCursors] = useState(new Map());

  /*______________________________________

            useEffects
______________________________________*/
  const [cryptoKey, setCryptoKey] = useState(null);

  useEffect(() => {
    if (!encryptionKey) return;
    crypto.subtle
      .importKey(
        "jwk",
        encryptionKey, // FULL JWK
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      )
      .then((cryptoKey) => {
        setCryptoKey(cryptoKey);
      });
  }, [encryptionKey]);
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

  const initialScenePayload = async () => {
    const payload = await encryptData(JSON.stringify({ Shapes }), cryptoKey);
    await fetch(`http://localhost:3000/api/payload?room=${roomInfo.roomId}`, {
      method: "POST",
      body: payload,
    });

    const ws = new WebSocket(`ws://localhost:3000/ws?room=${roomInfo.roomId}`);

    ws.onopen = () => {
      console.log("ws connected to roomid", roomInfo.roomId);
    };
    ws.onmessage = async (e) => {
      const message = JSON.parse(e.data);
      await handleWebsocketMessgae(message);
    };

    setSocket(ws);
    return () => {
      ws.close();
    };
  };
  /*_________________________________________
  
  Handling Websocket          
  __________________________________________*/

  useEffect(() => {
    if (!roomInfo || !cryptoKey) return;
    initialScenePayload();
  }, [roomInfo, cryptoKey]);

  const handleWebsocketMessgae = async (message) => {
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
        console.log("User Joined", message.payload);
        break;
      case "USER_LEFT":
        handleUserLeft(message.payload);
        break;
    }
  };

  const handleRemoteSceneUpdate = async (payload) => {
    if (!cryptoKey || !roomInfo) return;
    try {
      // console.log("inside Scene Update", payload.encryptedData);

      // console.log(payload.encryptedData.data);
      let arr;
      if (payload.encryptedData.data) {
        arr = payload.encryptedData.data
      } else {
        var obj = payload.encryptedData
        arr = Object.keys(obj)
          .sort((a, b) => Number(a) - Number(b))
          .map(k => obj[k]);
      }
      console.log("inside scene update arr=", arr);
      const decryptedData = await decryptData(
        new Uint8Array(arr),
        cryptoKey,
      );
      console.log("After Drawing");
      const { Shapes: remoteShape } = JSON.parse(decryptedData);

      setShapes((prevShapes) => {
        const shapeMap = new Map(prevShapes.map((s) => [s.id, s]));
        remoteShape.forEach((remoteShape) => {
          const localShape = shapeMap.get(remoteShape.id);
          if (!localShape || remoteShape.version > localShape.version) {
            shapeMap.set(remoteShape.id, remoteShape);
          }
        });
        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to Decrypt Scene Update", error);
    }
  };

  // Update handleRemoteDrawingUpdate to handle preview shapes
  const handleRemoteDrawingUpdate = async (payload) => {
    if (!payload.encryptedData || !cryptoKey) return;

    try {
      var obj = payload.encryptedData;
      const arr = Object.keys(obj)
        .sort((a, b) => Number(a) - Number(b))
        .map(k => obj[k]);
      const decryptedData = await decryptData(
        new Uint8Array(arr),
        cryptoKey,
      );

      const { Shapes: remoteShapes } = JSON.parse(decryptedData);

      if (!Array.isArray(remoteShapes)) return;

      setShapes((prevShapes) => {
        const shapeMap = new Map();

        // ✅ Keep all non-preview shapes
        prevShapes.forEach((shape) => {
          if (!shape.isPreview) {
            shapeMap.set(shape.id, shape);
          }
        });

        // ✅ Add/update with remote shapes (which may be previews)
        remoteShapes.forEach((shape) => {
          shapeMap.set(shape.id, shape);
        });

        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to Update Drawing", error);
    }
  };

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

  const handleRemoteMouseLocation = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.set(payload.userId, {
        x: payload.x,
        y: payload.y,
        userName: payload.userName || "lund",
      });
      return next;
    });
    /* Handling Mouse Delete if inActivity for 3 second */
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
  /* ________________________________

    KeyBoard Handling
    
 _________________________________*/

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

  const encryptData = async (data) => {
    if (!cryptoKey) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encoded,
    );
    const encrypted = new Uint8Array(encryptedBuffer);
    const blob = new Uint8Array(iv.length + encrypted.length);
    blob.set(iv, 0);
    blob.set(encrypted, iv.length);
    return blob;
  };
  const decryptData = async (encryptedBlob, key) => {
    // console.log(encryptedBlob)
    const iv = encryptedBlob.slice(0, 12);
    const data = encryptedBlob.slice(12);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data,
    );
    return new TextDecoder().decode(decryptedBuffer);
  };
  const broadCasteShapeUpdate = async (Shapes, isDrawing = false) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !cryptoKey) return;
    // console.log(shapes);
    try {
      const encryptedPayload = await encryptData(
        JSON.stringify({ Shapes }),
        cryptoKey,
      );
      socket.send(
        JSON.stringify({
          type: isDrawing ? "SCENE_UPDATE_DRAWING" : "SCENE_UPDATE",
          payload: {
            encryptedData: encryptedPayload,
          },
        }),
      );
    } catch (error) {
      console.error("Failed to broadcast update:", error);
    }
  };

  /*___________________________________

  
              Refs Register
  
  _____________________________________*/

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

    // ❗ skip deleted shapes
    const shape = Shapes.find((s) => s.id === id);
    if (!shape || shape.deleted) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();
  };

  /* ____________________________________________________________

                      Handling Soft Delete-Shape 
                      
  _______________________________________________________________*/

  const handleDeleteShape = async () => {
    if (!trRef.current) return;

    const selectedNodes = trRef.current.nodes();
    if (selectedNodes.length === 0) return;

    const ids = new Set(selectedNodes.map((node) => node.id()));

    // ✅ SOFT DELETE (Excalidraw-style)
    setShapes((prev) =>
      prev.map((shape) =>
        ids.has(shape.id)
          ? { ...shape, deleted: true, version: (shape.version || 0) + 1 }
          : shape,
      ),
    );
    await broadCasteShapeUpdate(Shapes.filter((s) => ids.has(s.id)));
    // cleanup transformer
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  };

  /*________________________________________________
  
              Handling Shape-Update While-Drawing 
              
  _________________________________________________*/

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

  /* _____________________________________

               Handling All MouseEvents 
  ________________________________________*/

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

    // ✅ Generate a temporary ID for this drawing session
    currentDrawingIdRef.current = crypto.randomUUID();

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
    if (!isDrawing.current || ActiveTool == "" || !previewNodeRef.current)
      return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const startX = startPos.current.x;
    const startY = startPos.current.y;
    lastPos.current = pos;
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

    // ✅ Use the SAME ID for all intermediate updates
    if (
      previewNodeRef.current &&
      ActiveTool !== "selection" &&
      ActiveTool !== "eraser"
    ) {
      const attrs = previewNodeRef.current.getAttrs();
      const tempShape = {
        ...attrs,
        id: currentDrawingIdRef.current, // ✅ Same ID!
        type: ActiveTool,
        version: 1,
        deleted: false,
        isPreview: true, // ✅ Mark as preview
      };
      await broadCasteShapeUpdate([tempShape], true);
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing.current || !previewNodeRef.current || ActiveTool == "")
      return;

    if (ActiveTool === "eraser") {
      // ... existing eraser logic ...
      layerRef.current.find(".shape").forEach((node) => {
        node.opacity(1);
      });

      const ids = new Set(erasedIdsRef.current);

      setShapes((prev) => {
        const updated = prev.map((s) =>
          ids.has(s.id) ? { ...s, deleted: true, version: s.version + 1 } : s,
        );
        broadCasteShapeUpdate(updated.filter((s) => ids.has(s.id)));
      });

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
    // ✅ Use the same ID from drawing session
    const id = currentDrawingIdRef.current;
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
      isPreview: false, // ✅ No longer a preview
    };

    setShapes((prev) => {
      // ✅ Remove any preview version and add final version
      const filtered = prev.filter(s => s.id !== id);
      const next = [...filtered, newShape];
      broadCasteShapeUpdate(next);
      return next;
    });

    setPendingid([id]);
    isDrawing.current = false;
    previewNodeRef.current.destroy();
    previewNodeRef.current = null;
    currentDrawingIdRef.current = null; // ✅ Clear temp ID
    setActiveTool("selection");
    setPointerEvent("");
  };
  const handleRect = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
    // if(isShiftPressed.current){

    // }
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

  /*___________________________________
  
  Rendering Canvas & Drawing
  _____________________________________*/
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
