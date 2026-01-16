import { useEffect, useRef, useState } from "react";
import Cursor from "./Cursor";
import { useNavigate } from "react-router-dom";

export function CreateRoom({ setCursors, wsRef }) {
  const roomid = window.crypto.randomUUID();
  const url = `ws://localhost:3000/ws?room=${roomid}`;
  const socket = new WebSocket(url);
  var ivArr = new Uint16Array(12);
  var encryptionKey;
  const msgStr = "kadjfs";
  const createroomId = async () => {
    window.crypto.getRandomValues(ivArr);
    const encodedMsg = new TextEncoder().encode(msgStr);
    const webKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"]
    );
    const encrptedMsg = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: ivArr,
      },
      webKey,
      encodedMsg
    );
    const cypherBytes = new Uint16Array(encrptedMsg);
    const payload = new Uint16Array(ivArr.length + cypherBytes.length);
    payload.set(ivArr, 0);
    payload.set(cypherBytes, ivArr.length);
    await fetch(`http://localhost:3000/api/payload?room=${roomid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: payload.buffer,
    });

    // exporting webkey to jwk
    encryptionKey = await window.crypto.subtle.exportKey("jwk", webKey);
    console.log(encryptionKey);
    window.location.hash = `room=${roomid},${encryptionKey.k}`;
  };

  return (
    <>
      <button id="session-button" onClick={createroomId}>
        Start Session
      </button>
    </>
  );
}
