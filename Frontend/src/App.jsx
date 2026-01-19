import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Session from "./Session";
import Canvas from "./Canvas";
import Cursor from "./Cursor";
import "./Shared.css";
function App() {
  const [isshare, setIshare] = useState(0);
  const [ActiveTool, setActiveTool] = useState("selection");
  const [isEraserEnable, setIsEraserEnable] = useState(false);
  const [pointerEvent, setPointerEvent] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const encryptionKey = useRef(null);
  const shareBtn = () => {
    setIshare((prev) => (prev === 0 ? 1 : 0));
  };

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;

      if (!hash.startsWith("#room=")) {
        setRoomInfo(null);
        return;
      }

      const [, value] = hash.split("#room=");
      const [roomId, key] = value.split(",");

      if (!roomId || !key) {
        setRoomInfo(null);
        return;
      }

      setRoomInfo({ roomId, key });
    };

    parseHash(); // 👈 run once on mount
    window.addEventListener("hashchange", parseHash);

    return () => {
      window.removeEventListener("hashchange", parseHash);
    };
  }, []); // ✅ VERY IMPORTANT

  return (
    <>
      <Navbar
        shareBtn={shareBtn}
        setActiveTool={setActiveTool}
        ActiveTool={ActiveTool}
        pointerEvent={pointerEvent}
      ></Navbar>
      <Cursor isEraserEnable={isEraserEnable} />
      <Canvas
        ActiveTool={ActiveTool}
        setActiveTool={setActiveTool}
        setPointerEvent={setPointerEvent}
        setIsEraserEnable={setIsEraserEnable}
        roomInfo={roomInfo}
        encryptionKey={encryptionKey}
      ></Canvas>
      <Session
        isloading={isshare}
        roomInfo={roomInfo}
        encryptionKey={encryptionKey}
      ></Session>
    </>
  );
}

export default App;
