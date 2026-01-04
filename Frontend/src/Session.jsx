import gsap from "gsap";
import "./Session.css";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import Sky from "./Animation/Sky";
import { CreateRoom } from "./CreateRoom";
const Session = ({ isloading}) => {
   
  useEffect(() => {
    if (isloading === 1) {
      gsap.to(".session-container", {
        display: "flex",
        duration: 0,
      });
    } else {
      gsap.to(".session-container", {
        display: "none",
        duration: 0,
      });
    }
  }, [isloading]);

  return (
    <>
      <div className="session-container shared-container">
        <section className="Session-overlay">
          <Sky></Sky>
          <h1>Go Live</h1>
          <label></label>
          <CreateRoom></CreateRoom>
        </section>
      </div>
    </>
  );
};
export default Session;
