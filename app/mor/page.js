import PartnerStore from '@/components/PartnerStore';

export const metadata = { title: 'MoR Partner — DomainBazaar' };

// Merchant-of-Record partner: collects payment itself (Buy Now → partner Stripe)
// AND can offer "Pay with name.ai" (redirect to name.ai lander).
export default function MoRPartnerPage() {
  return (
    <PartnerStore
      mode="mor"
      heading="DomainBazaar (Merchant of Record)"
      subtitle="Buy Now charges you on our Stripe; or Pay with name.ai (name.ai collects)."
    />
  );
}
