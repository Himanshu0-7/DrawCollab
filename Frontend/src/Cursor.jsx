import { useEffect, useState } from "react";
import "./Cursor.css";
import gsap from "gsap";
import { CreateRoom } from "./CreateRoom";

const Cursor = ({ cursors , wsRef}) => {
  useEffect(() => {
    const mousemove = (e) => {
      gsap.to(".cursordot", {
        x: e.clientX,
        y: e.clientY,
        duration: .5,
      });
      wsRef.current?.send(
        JSON.stringify({
          x: e.clientX,
          y: e.clientY,
        })
      );
    };
    window.addEventListener("mousemove", mousemove);
    // console.log(roomid);

    return () => {
      window.removeEventListener("mousemove", mousemove);
    };
  }, []);

  return (
    <>
      {cursors.map((cursor) => (
        <div key={cursor.id} id={cursor.id} className="cursordot"></div>
      ))}
    </>
  );
};
export default Cursor;
