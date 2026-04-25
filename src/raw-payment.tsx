// src/pages/raw-payment.tsx
import { Link } from "react-router";

const RawPayment = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 space-y-6">
      <h1 className="text-2xl font-bold">Subscribe to RAW Premium</h1>
      <p className="text-gray-400 text-center max-w-md">
        You’ll be redirected to PayPal to complete your $79/month subscription.
        After payment, click the button below to continue onboarding.
      </p>

      <form
        action="https://www.paypal.com/cgi-bin/webscr"
        method="post"
        target="_blank"
      >
        <input type="hidden" name="cmd" value="_s-xclick" />
        <input type="hidden" name="hosted_button_id" value="L2NGNLH7UEWL6" />
        <input type="hidden" name="currency_code" value="USD" />
        <input
          type="image"
          src="https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_LG.gif"
          style={{ border: 0 }}
          name="submit"
          title="Subscribe with PayPal"
          alt="Subscribe"
        />
      </form>

      <Link
        to="/onboarding"
        className="mt-6 text-cyan-400 underline hover:text-cyan-200"
      >
        I’ve paid — Continue to Onboarding →
      </Link>
    </div>
  );
};

export default RawPayment;
