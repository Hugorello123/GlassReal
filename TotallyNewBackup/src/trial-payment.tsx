// src/trial-payment.tsx
import React, { useMemo } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function TrialPayment() {
  // 1) Keep SDK options stable (don’t inline the object in JSX)
  const paypalOptions = useMemo(
    () => ({
      clientId:
        "BAAyFWZflc-gfx-YK9UCINUYA-VKsWSlHg9YFSpv2uevrvQwxrg8xLqfU_BZz_UJ8tfI2xBoe7NvvMY8EU",
      components: "buttons",
      currency: "USD",
      disableFunding: "venmo",
      intent: "capture",
    }),
    []
  );

  // 2) Amount and currency — if these don’t change, the buttons won’t re-render
  const amount = "3.00";
  const currency = "USD";

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 space-y-6">
        <h1 className="text-2xl font-bold text-center">Start Your 24-Hour Trial</h1>
        <p className="text-gray-400 text-center max-w-md">
          $3 one-time — Secure PayPal checkout below.
        </p>

        {/* 3) Fixed-size wrapper stops layout jumps */}
        <div style={{ maxWidth: 340, width: "100%" }}>
          <PayPalButtons
            style={{ layout: "vertical" }}
            // Only re-render if these change (prevents flicker)
            forceReRender={[amount, currency]}
            createOrder={(_, actions) =>
              actions.order.create({
                purchase_units: [
                  {
                    description: "24-Hour Trial",
                    amount: { value: amount, currency_code: currency },
                  },
                ],
                intent: "CAPTURE",
              })
            }
            onApprove={(_, actions) =>
              actions.order.capture().then((details) => {
                alert(`Transaction completed by ${details.payer.name?.given_name || "user"}`);
                window.location.href = "/onboarding";
              })
            }
            onError={(err) => {
              console.error("PayPal error:", err);
              alert("PayPal couldn’t complete the checkout. Please try again.");
            }}
          />
        </div>

        <a
          href="/onboarding"
          className="mt-6 text-cyan-400 underline hover:text-cyan-200"
        >
          I’ve paid — Continue to Onboarding →
        </a>
      </div>
    </PayPalScriptProvider>
  );
}
