import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import citySkyline from "@/assets/city-skyline.png";
import { getApiUrl } from "@/lib/utils";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    const initializeApp = async () => {
      try {
 
        progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 2, 90));
        }, 50);
 
        setStatus("Checking authentication...");
        const token = localStorage.getItem("token");
        
        if (token) {
 
          setStatus("Loading user data...");
          try {
            const response = await fetch(`${getApiUrl()}/user/me`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (response.ok) {
              setStatus("Loading map data...");
     
              await fetch(`${getApiUrl()}/issues/live`);
            }
          } catch (error) {
            // Token verification failed, continuing to home
          }
        }
 
        setProgress(100);
        setStatus("Ready!");
 
        setTimeout(() => navigate("/home"), 300);
      } catch (error) {
        console.error("Splash screen error:", error);
 
        setProgress(100);
        setTimeout(() => navigate("/home"), 300);
      }
    };

    initializeApp();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between max-w-md mx-auto">
 
      <div className="flex-1 flex flex-col items-center justify-center px-8">
 
        <div className="mb-6 animate-scale-in">
          <img 
            src="/logo_png.png" 
            alt="Udaay Logo" 
            className="w-32 h-32 object-contain"
          />
        </div>
 
        <h1 className="font-display font-bold text-4xl text-primary mb-2 animate-fade-in">
          Udaay
        </h1>
     
        <p className="text-muted-foreground text-center animate-fade-in">
          AI-powered Smart City Issue Reporting
        </p>

 
        <div className="mt-12 flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">
            {status}
          </span>
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
 
      <div className="w-full relative">
        <img 
          src={citySkyline} 
          alt="City Skyline" 
          className="w-full h-40 object-cover object-top opacity-60"
        />
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">
            v2.4.0 • Digital India Initiative
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
