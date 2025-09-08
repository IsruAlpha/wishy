"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [isDarkMode] = useState(true);
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/app');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-modern-black text-modern-primary' : 'bg-white text-gray-900'} relative overflow-hidden`}>
      {/* Spotlight Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none" />
      
      {/* Animated Grid Pattern */}
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
        )}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Text */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-8">
            Share your wishes, get{" "}
            <span className="font-[InstrumentSerif] font-bold italic text-5xl sm:text-6xl lg:text-7xl text-white">
              anonymous
            </span>{" "}
            love
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Send your new year wishes, get likes and comments from anonymous people
          </p>

          {/* Get Started Button */}
          <button
            onClick={handleGetStarted}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-100 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-white/25"
          >
            <Sparkles className="w-5 h-5 text-black group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-black">Get Started</span>
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </button>

        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 opacity-20">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      </div>
      <div className="absolute top-40 right-20 opacity-30">
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000" />
      </div>
      <div className="absolute bottom-40 left-20 opacity-25">
        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-2000" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-20">
        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse delay-500" />
      </div>
    </div>
  );
}
