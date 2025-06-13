"use client"

import React, { useState } from "react";
import SplineBg, { Position } from "./SplineBg";

const Test = () => {

    const [position, setPosition] = useState<Position>('right');

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-black via-slate-950 to-purple-950">

        <SplineBg position={position} />
        
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/60 to-purple-950/40 opacity-0 fade-in"></div>
      
      {/* Content overlay */}
      {/* <div className="h-screen flex items-center justify-center opacity-0 fade-in">
        <h1 className="text-[10rem] text-purple-800/80 relative z-10 font-extralight">Payper <span className="font-black text-white">L!nk</span></h1>
      </div> */}

      <div className="h-screen flex flex-col items-start max-md:items-center justify-center opacity-0 fade-in md:ml-40">
        <h1 className="text-7xl text-purple-800/80 relative z-10 font-extralight max-md:text-5xl">Payper <span className="font-black text-white">L!nk</span></h1>
        <p className="text-white/50 text-2xl max-md:text-lg relative z-10 font-extralight max-md:text-center mt-5 max-md:w-[90%] w-[400px]">One stop solution to organize, share and monetize your content</p>

        <div className="flex items-center justify-center mt-10">
            <button className=" bg-purple-500/10 glass px-8 py-2 text-lg rounded-full hover:scale-105 transition-all duration-200 cursor-pointer text-white/80 font-bold ">Get Started</button>
        </div>
      </div>

    </div>
  );
};

export default Test;
