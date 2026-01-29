import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, Loader2 } from "lucide-react";
import cityBanner from "@/assets/city-banner.png";
import { sendOTP, verifyOTP, initializeRecaptcha } from "@/lib/auth-dev";
import { useToast } from "@/hooks/use-toast";

const LoginScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const from = (location.state as any)?.from || "/home";

  // Initialize reCAPTCHA on component mount
  useEffect(() => {
    initializeRecaptcha('recaptcha-container');

    return () => {
      // Cleanup reCAPTCHA on unmount
      const recaptchaVerifier = (window as any).recaptchaVerifier;
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
    };
  }, []);

  const handleGetOtp = async () => {
    if (phone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
      
      // Store phone temporarily for OTP verification
      localStorage.setItem('tempPhone', formattedPhone);
      
      const response = await sendOTP(formattedPhone);

      setShowOtp(true);
      
      // Show OTP in toast for prototype mode
      if (response.data?.prototypeOTP) {
        toast({
          title: "🔐 Prototype OTP",
          description: `Your OTP is: ${response.data.prototypeOTP}`,
          duration: 10000, // Show for 10 seconds
        });
      } else {
        toast({
          title: "OTP Sent!",
          description: "Check server console for OTP (Prototype Mode)",
        });
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }

      if (newOtp.every(digit => digit) && index === 5) {
        handleVerifyOtp(newOtp.join(""));
      }
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    setLoading(true);
    try {
      const response = await verifyOTP(otpCode);

      toast({
        title: "Login Successful!",
        description: `Welcome, ${response.data.user.name}!`,
      });

      setTimeout(() => navigate(from, { replace: true }), 500);
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Invalid OTP. Please try again.",
      });
      // Reset OTP inputs on error
      setOtp(["", "", "", "", "", ""]);
      const firstInput = document.getElementById('otp-0');
      firstInput?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setOtp(["", "", "", "", "", ""]);
    try {
      const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
      await sendOTP(formattedPhone);

      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your phone",
      });
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to resend OTP. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex flex-col max-w-md mx-auto">
      {/* Header with Logo */}
      <div className="px-6 pt-8 pb-6 flex items-end gap-3">
        <img
          src="/logo_png.png"
          alt="Udaay Logo"
          className="h-12 w-auto object-contain"
        />
        <h1 className="font-display font-bold text-3xl text-foreground">Udaay</h1>
      </div>

      {/* City Banner with Welcome */}
      <div className="px-6 pb-8">
        <div className="relative rounded-3xl overflow-hidden shadow-xl mb-8">
          <div className="relative h-48">
            <img
              src={cityBanner}
              alt="City"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="font-display font-bold text-5xl text-white drop-shadow-lg">
              Welcome
            </h2>
          </div>
        </div>

        {!showOtp ? (
          /* Phone Input Screen */
          <>
            <div className="card-civic-elevated p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Secure Login</h3>
                  <p className="text-xs text-muted-foreground">Verify with OTP</p>
                </div>
              </div>

              <label className="block text-sm font-medium text-foreground mb-3">
                Enter Mobile Number
              </label>
              <div className="flex gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl border-2 border-border bg-muted/30">
                  <span className="text-xl">🇮🇳</span>
                  <span className="text-base font-semibold text-foreground">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="00000 00000"
                  className="input-civic flex-1 text-lg py-3.5"
                  maxLength={10}
                  autoFocus
                />
              </div>

              <button
                onClick={handleGetOtp}
                disabled={phone.length < 10 || loading}
                className="btn-civic-primary w-full py-4 text-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    Get OTP
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/home')}
                className="w-full py-3 mt-3 text-center text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                ← Go Home
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card-civic text-center py-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Shield size={20} className="text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground">Verified</p>
                <p className="text-xs text-muted-foreground">Secure Platform</p>
              </div>
              <div className="card-civic text-center py-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <Lock size={20} className="text-success" />
                </div>
                <p className="text-xs font-medium text-foreground">Private</p>
                <p className="text-xs text-muted-foreground">Data Protected</p>
              </div>
            </div>
          </>
        ) : (
          /* OTP Screen */
          <div className="animate-fade-in">
            <div className="card-civic-elevated p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-success flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                  <Lock size={36} className="text-white" />
                </div>
                <h2 className="font-display font-semibold text-2xl mb-2">Enter OTP</h2>
                <p className="text-muted-foreground">
                  Sent to <span className="font-semibold text-foreground">+91 {phone}</span>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    disabled={loading}
                    className="w-12 h-14 rounded-xl border-2 border-border text-center text-xl font-bold 
                             focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed bg-muted/30"
                    maxLength={1}
                  />
                ))}
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-primary mb-4 py-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-medium">Verifying...</span>
                </div>
              )}

              <button
                onClick={handleResendOtp}
                disabled={isResending || loading}
                className="w-full text-center text-muted-foreground text-sm py-3 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <>
                    Didn't receive code? <span className="text-primary font-semibold">Resend</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => {
                setShowOtp(false);
                setOtp(["", "", "", "", "", ""]);
              }}
              className="w-full text-center text-muted-foreground py-3 hover:text-foreground transition-colors font-medium"
            >
              ← Change Phone Number
            </button>
          </div>
        )}

        {/* reCAPTCHA container - invisible */}
        <div id="recaptcha-container"></div>
      </div>

      <div className="pb-8"></div>
    </div>
  );
};

export default LoginScreen;
