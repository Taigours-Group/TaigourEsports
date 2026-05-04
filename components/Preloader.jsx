
import React, { useState, useEffect, useRef } from 'react';

const Preloader = () => {
  const [progress, setProgress] = useState(0);
  const [consoleText, setConsoleText] = useState('Initializing Core Systems...');
  const timerRef = useRef(null);
  const textTimerRef = useRef(null);

  const terminalLines = [
    'Initializing Core Systems...',
    'Syncing Tactical Data...',
    'Bypassing Security Firewalls...',
    'Loading Combat Modules...',
    'Establishing Satellite Uplink...',
    'Sector Scan Complete.',
    'Ready for Deployment.'
  ];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.floor(Math.random() * 15) + 5;
        if (newProgress >= 100) {
          clearInterval(timerRef.current);
          clearInterval(textTimerRef.current);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    textTimerRef.current = setInterval(() => {
      setConsoleText(terminalLines[Math.floor(Math.random() * terminalLines.length)]);
    }, 400);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(textTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-bg-dark z-[1000] flex flex-col items-center justify-center overflow-hidden font-rajdhani">
      {/* Background Cinematic Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanlines Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%]"></div>
        
        {/* Glowing Radial Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full animate-pulse"></div>
        
        {/* Moving Grid lines */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-20 flex flex-col items-center max-w-sm w-full px-6">
        {/* Logo Hub */}
        <div className="relative mb-12">
          {/* Rotating Rings */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border border-primary/10 border-t-primary border-r-primary/40 animate-spin transition-all duration-1000 ease-in-out"></div>
          <div className="absolute inset-2 rounded-full border border-pink/5 border-b-pink/40 animate-spin [animation-direction:reverse] [animation-duration:3s]"></div>
          
          {/* Tiger Logo with Glitch Effect */}
          <div className="absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
            <img 
              src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768567786/tiger-logo_jcf2zj.png" 
              alt="Loading" 
              className="w-full h-full drop-shadow-[0_0_30px_rgba(0,212,255,0.8)] animate-pulse"
            />
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mb-10">
          <h3 className="font-orbitron font-black text-white text-3xl md:text-4xl tracking-[0.2em] mb-2 relative group">
            TAIGOUR<span className="text-primary">'</span>S
            <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </h3>
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40"></span>
            <p className="text-primary uppercase tracking-[0.6em] text-[10px] font-black">Elite Protocols</p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40"></span>
          </div>
        </div>

        {/* Tactical Progress Section */}
        <div className="w-full space-y-4">
          <div className="flex justify-between items-end">
             <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">System Console</span>
                <span className="text-[11px] text-primary/80 font-mono italic animate-pulse h-4 truncate max-w-[200px]">
                  {consoleText}
                </span>
             </div>
             <span className="text-xl font-orbitron font-black text-white tracking-tighter">
                {Math.min(progress, 100)}%
             </span>
          </div>
          
          {/* Multi-layered Progress Bar */}
          <div className="h-2.5 w-full bg-white/5 rounded-full border border-white/5 relative p-0.5">
             <div 
               className="h-full bg-primary shadow-[0_0_15px_#00d4ff] rounded-full overflow-hidden transition-all duration-200 ease-linear relative"
               style={{ width: `${progress}%` }}
             >
                {/* Highlight line */}
                <div className="absolute top-0 right-0 w-8 h-full bg-white/40 blur-sm"></div>
             </div>
          </div>
          
          <div className="flex justify-between text-[8px] text-gray-600 font-bold uppercase tracking-[0.3em]">
             <span>Auth Level: Supreme</span>
             <span className="animate-pulse">Active Uplink...</span>
          </div>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="absolute bottom-8 text-[9px] text-gray-700 font-mono tracking-widest uppercase flex gap-8">
        <span>Nexus_OS_v2.0.6</span>
        <span className="hidden md:inline">Secure_Terminal_01</span>
        <span>LAT_26.7271_LON_85.9221</span>
      </div>
    </div>
  );
};

export default Preloader;
