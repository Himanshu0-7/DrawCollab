import { useEffect, useRef, useState } from "react";
import Cursor from "./Cursor";
import { useNavigate } from "react-router-dom";
export function CreateRoom({ setCursors ,wsRef}) {
  
    const navigate = useNavigate()
const createroomId= async() =>{
    const res = await fetch("http://localhost:3000/api/room/create");
      const data = await res.json();

      const roomid = data.roomid;
     
      console.log(roomid)

    console.log(roomid)
    navigate(`/room/${data.roomid}`);
    // navigate(`/${roomid}`)
}
  
  return (
    <>
      <button id="session-button" onClick={createroomId}>
        Start Session
      </button>
    </>
  );
}
