import { useGSAP } from "@gsap/react";
import "./Sky.css";
import gsap from "gsap";
import { useRef } from "react";

const Sky = () => {
  const skyRef = useRef(null);
  useGSAP(() => {
    const ctx = gsap.context(() => {
      //   skyRef.current.innerHTML = "";

      for (let i = 0; i < 100; i++) {
        //Small Particle
        const dot = document.createElement("span");
        dot.className = "smallparticle";
        let height = (dot.style.height = Math.random() * 2 + "px");
        dot.style.width = height;
        dot.style.left = Math.random() * 100 + "vw";
        dot.style.right = Math.random() * -80 + "vw";
        dot.style.top = Math.random() * 100 + "vh";
        dot.style.bottom = Math.random() * 100 + "vh";
        skyRef.current.appendChild(dot);
        
        
        //Big Particle
        const dot2 = document.createElement("span");
        dot2.className = "Bigparticle";
        let height2 = (dot2.style.height = Math.random() * 5 + "px");
        dot2.style.width = height2;
        dot2.style.left = Math.random() * 100 + "vw";
        dot2.style.right = Math.random() * -100 + "vw";
        dot2.style.top = Math.random() * 100 + "vh";
        skyRef.current.appendChild(dot2);
      }
      gsap.to(".sky span", {
        y: "-=200",
        duration: 20,
        repeat: -1,
        ease: "circ",
      });
    });
    return () => ctx.revert(); // 🔥 CLEARS EVERYTHING
  }, skyRef);
  return (
    <>
      <div className="sky" ref={skyRef}></div>
    </>
  );
};
export default Sky;
