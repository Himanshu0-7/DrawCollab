import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Cursor from "./Cursor";

export default function Room() {
  const [cursors, setCursors] = useState([]);
  const wsRef = useRef(null);
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/room?roomId=${roomId}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      setCursors((prev) => {
        const exists = prev.find((c) => c.id === data.id);
        if (exists) {
          return prev.map((c) => (c.id === data.id ? data : c));
        }
        return [...prev, data];
      });
    };

    return () => ws.close();
  }, [roomId]);

  return (
    <>
      <Cursor cursors={cursors} wsRef={wsRef}/>
    </>
  );
}
