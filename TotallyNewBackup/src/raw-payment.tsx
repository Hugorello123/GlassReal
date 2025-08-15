export default function RawPayment() {
  const hostedId = import.meta.env.VITE_PAYPAL_RAW_BUTTON_ID;
  const currency = import.meta.env.VITE_PAYPAL_CURRENCY || "USD";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 space-y-6">
      <h1 className="text-2xl font-bold">Subscribe to RAW Premium</h1>
      <p className="text-gray-400 text-center max-w-md">
        You’ll be redirected to PayPal to complete your $79/month subscription.
      </p>

      <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank" rel="noopener">
        <input type="hidden" name="cmd" value="_s-xclick" />
        <input type="hidden" name="hosted_button_id" value={hostedId} />
        <input type="hidden" name="currency_code" value={currency} />
        <input
          type="image"
          src="https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_LG.gif"
          alt="Subscribe"
        />
      </form>

      <a href="/onboarding" className="mt-6 text-cyan-400 underline hover:text-cyan-200">
        I’ve paid — Continue to Onboarding →
      </a>
    </div>
  );
}
