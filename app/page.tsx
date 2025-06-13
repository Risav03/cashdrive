import { Card } from './components/auth/cards/card';
import { Background } from './components/ui/Background';
import SplineBg from './test/SplineBg';

export default async function Home() {
  return (
    <div className="relative w-full h-screen ">
      <SplineBg position="right" />
      <Background/>
      
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/40 to-purple-950/20 opacity-0 fade-in"></div>
      
      <div className="h-screen flex flex-col items-start max-md:items-center justify-center opacity-0 fade-in md:ml-40">
        <h1 className="text-7xl text-purple-800/80 relative z-10 font-extralight max-md:text-5xl">Payper <span className="font-black text-white">L!nk</span></h1>
        <p className="text-white/50 text-2xl max-md:text-lg relative z-10 font-extralight max-md:text-center mt-5 max-md:w-[90%] w-[400px]">One stop solution to organize, share and monetize your content</p>
        
        <div className="mt-10 w-full max-w-md">
          <Card />
        </div>
      </div>
    </div>
  );
}
