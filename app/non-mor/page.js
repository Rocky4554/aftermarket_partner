import PartnerStore from '@/components/PartnerStore';

export const metadata = { title: 'Non-MoR Partner — DomainBazaar' };

// Non-Merchant-of-Record partner: cannot collect payment. Only offers
// "Pay with name.ai" — the buyer is sent to the name.ai lander to see the price
// and pay; the sale is attributed back to this partner.
export default function NonMoRPartnerPage() {
  return (
    <PartnerStore
      mode="non_mor"
      heading="DomainBazaar (referral / non-MoR)"
      subtitle="We don't collect payment — buyers Pay with name.ai and we earn our cut at settlement."
    />
  );
}
