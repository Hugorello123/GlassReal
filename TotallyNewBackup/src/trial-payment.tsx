// src/pages/trial-payment.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TrialPayment = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=BAAyFWZflc-gfx-YK9UCINUYA-VKsWSlHg9YFSpv2uevrvQwxrg8xLqfU_BZz_UJ8tfI2xBoe7NvvMY8EU&components=hosted-buttons&disable-funding=venmo&currency=USD";
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      if (paypal.HostedButtons) {
        // @ts-ignore
        paypal
          .HostedButtons({
            hostedButtonId: "5EAVHHKUVEJF8",
            onApprove: () => {
              navigate("/onboarding");
            },
          })
          .render("#paypal-container-5EAVHHKUVEJF8");
      }
    };

    document.body.appendChild(script);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 space-y-6">
      <h1 className="text-2xl font-bold">Start Your 24-Hour Trial</h1>
      <p className="text-gray-400 text-center max-w-md">
        $3 one-time for full access. Pay securely with PayPal below.
      </p>

      <div id="paypal-container-5EAVHHKUVEJF8"></div>
    </div>
  );
};

export default TrialPayment;
