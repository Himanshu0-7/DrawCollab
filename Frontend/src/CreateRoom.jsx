import { useEffect, useRef, useState } from "react";

export function CreateRoom({ setEncrptionKey }) {
  const roomIdRef = useRef(crypto.randomUUID());
  const [sessionActive, setSessionActive] = useState(false);

  /*____________________________________
  
        Handling SessionStatus & RoomId 
        
  ______________________________________*/

  const startSession = async () => {
    const cryptoKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"],
    );
    const jwk = await window.crypto.subtle.exportKey(
      "jwk",
      cryptoKey,
    );
    

    window.location.hash = `#room=${roomIdRef.current},${jwk.k}`;
    setEncrptionKey(jwk)
    setSessionActive(true);

    // exporting webkey to jwk
  };
  const stopSession = () => {
    window.location.hash = "";
    setSessionActive(false);
  };

  return (
    <>
      <button
        className={sessionActive ? "stop-session" : "start-session"}
        onClick={sessionActive ? stopSession : startSession}
      >
        {sessionActive ? "Stop Session" : "Start Session"}
      </button>
    </>
  );
}
