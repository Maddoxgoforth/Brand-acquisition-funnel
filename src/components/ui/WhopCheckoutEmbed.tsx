import Script from "next/script";

export default function WhopCheckoutEmbed({ planId }: { planId: string }) {
  return (
    <div id="checkout" className="w-full overflow-hidden rounded-2xl">
      <Script
        src="https://js.whop.com/static/checkout/loader.js"
        strategy="afterInteractive"
      />
      <div
        data-whop-checkout-plan-id={planId}
        data-whop-checkout-theme="dark"
        data-whop-checkout-theme-accent-color="#3358d4"
        data-whop-checkout-hide-price="true"
      />
    </div>
  );
}
