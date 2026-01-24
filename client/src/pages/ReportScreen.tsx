import { useState, useEffect, useRef } from "react";
import { Camera, Upload, MapPin, ChevronRight, Check, AlertTriangle, Trash2, Droplet, Zap, X, Sparkles } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/utils";

const categories = [
  { id: "roads", icon: AlertTriangle, label: "Road Damage", color: "bg-warning/10 text-warning" },
  { id: "garbage", icon: Trash2, label: "Garbage", color: "bg-success/10 text-success" },
  { id: "water", icon: Droplet, label: "Water Issue", color: "bg-primary/10 text-primary" },
  { id: "electricity", icon: Zap, label: "Electricity", color: "bg-warning/10 text-warning" },
];

const ReportScreen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState("roads");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Getting location...");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          // Reverse geocode to get location name
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${apiKey}`)
              .then(res => res.json())
              .then(data => {
                if (data.results && data.results[0]) {
                  setLocationName(data.results[0].formatted_address);
                }
              })
              .catch(() => setLocationName("Location unavailable"));
          } else {
            setLocationName("Location tagged");
          }
        },
        (error) => {
          // Silently handle location permission denial
          if (error.code === 1) {
            setLocationName("Enable location access");
          } else {
            setLocationName("Location unavailable");
          }
        }
      );
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !image || !userLocation) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", JSON.stringify(userLocation));
      
      if (imageFile) {
        formData.append("image", imageFile);
      } else {
        // Fallback to base64 if no file
        formData.append("imageUrl", image);
      }

      const response = await fetch(`${getApiUrl()}/issues/submit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setStep(3);
      } else {
        alert(data.message || "Failed to submit issue");
      }
    } catch (error) {
      console.error("Error submitting issue:", error);
      alert("Failed to submit issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout headerTitle="Report Issue" showNav={false}>
      <div className="px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-1 rounded transition-all ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload Photo */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display font-semibold text-xl mb-2">Upload Issue Photo</h2>
              <p className="text-muted-foreground">Take or upload a clear photo of the issue</p>
            </div>

            {/* Camera/Upload Area */}
            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center">
              {image ? (
                <img src={image} alt="Issue" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Camera size={32} className="text-primary" />
                  </div>
                  <p className="font-medium text-foreground mb-1">Choose an option below</p>
                  <p className="text-sm text-muted-foreground">Camera or Gallery</p>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGalleryClick}
                className="flex-1 btn-civic-outline py-3 gap-2"
              >
                <Upload size={18} />
                Gallery
              </button>
              <button
                onClick={handleCameraClick}
                className="flex-1 btn-civic-primary py-3 gap-2"
              >
                <Camera size={18} />
                Camera
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Issue Details */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="font-display font-semibold text-xl mb-1">Issue Details</h2>
              <p className="text-muted-foreground text-sm">Provide information about the issue</p>
            </div>

            {/* Image Preview */}
            <div className="relative mb-6">
              <img
                src={image || ""}
                alt="Issue"
                className="w-full h-48 object-cover rounded-2xl"
              />
              <button
                onClick={() => {
                  setImage(null);
                  setStep(1);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Issue Category</label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      category === cat.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center mb-2`}>
                      <cat.icon size={20} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title of the issue..."
                className="input-civic"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="input-civic min-h-[100px] resize-none"
              />
            </div>

            {/* Location */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Location</label>
              <div className="w-full input-civic text-left flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                <span className="text-sm">{locationName}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-civic-primary w-full py-4 text-base flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Sparkles size={20} className="animate-spin" />
                  <span>Submitting & AI Validating...</span>
                </>
              ) : (
                <span>Submit Report</span>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-fade-in text-center py-8">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-success" />
            </div>

            <h2 className="font-display font-bold text-2xl mb-2">Report Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for making your city better
            </p>
            
            <div className="card-civic mb-6">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Sparkles size={20} />
                <p className="text-sm font-medium">AI Validation in Progress</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your issue is being validated by AI. Once approved, it will appear on the map.
              </p>
            </div>

            <button
              onClick={() => navigate("/tickets")}
              className="btn-civic-primary w-full py-4 text-base mb-3"
            >
              Track My Ticket
            </button>

            <button
              onClick={() => navigate("/home")}
              className="w-full py-3 text-primary font-medium"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ReportScreen;
