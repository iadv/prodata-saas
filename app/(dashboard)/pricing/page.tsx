import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
// export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const basePlan = products.find((product) => product.name === 'Plus Plan');
  const plusPlan = products.find((product) => product.name === 'Advantage Plan');
  const enterprisePlan = products.find((product) => product.name === 'Enterprise Plan');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);
  const enterprisePrice = prices.find((price) => price.productId === enterprisePlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Changed to grid-cols-3 for all three cards in one row */}
      <div className="grid md:grid-cols-3 gap-6 mx-auto">
        <PricingCard
          name={basePlan?.name || 'Plus'}
          price={basePrice?.unitAmount || 4900}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 30}
          features={[
            'Unlimited Queries',
            'Upto 5 deep research reports per month',
            'Email Support',
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Advanced'}
          price={plusPrice?.unitAmount || 9900}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 30}
          features={[
            'Everything in Plus, and:',
            'Upto 10 additional deep research reports per month',
            'Access to beta features',
            'Customization where possible',
            'Fast Email Support + Slack Access',
          ]}
          priceId={plusPrice?.id}
        />

        <PricingCard
          name={enterprisePlan?.name || 'Enterprise'}
          price={'nithin@getprodata.com'}
          contactLabel={'Contact us at'}
          interval={enterprisePrice?.interval || 'month'}
          trialDays={enterprisePrice?.trialPeriodDays || 30}
          features={[
            'Everything in Advanced, and:',
            'Custom Integrations (e.g., SAP, Tableau, Oracle)',
            'Advanced analytics and reporting',
            '24/7 Support + Slack Access',
          ]}
          priceId={enterprisePrice?.id}
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  contactLabel,
}: {
  name: string;
  price: number | string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  contactLabel?: string;
}) {
  const formattedPrice =
    typeof price === 'number'
      ? `$${price / 100}`
      : price; // use string as-is if it's not a number

  return (
    <div className="pt-6 h-full flex flex-col border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day risk-free trial
        {/* get your money back if the product is not useful */}
      </p>

      {typeof price === 'number' ? (
        <p className="text-4xl font-medium text-gray-900 mb-6">
          {formattedPrice}{' '}
          <span className="text-xl font-normal text-gray-600">
            per user / {interval}
          </span>
        </p>
      ) : (
        <p className="mb-6">
          <span className="text-sm text-gray-600">{contactLabel}</span>{' '}
          <span className="text-lg font-medium text-gray-900">{formattedPrice}</span>
        </p>
      )}

      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {typeof price === 'number' && priceId && (
        <form action={checkoutAction} className="mt-auto">
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      )}
    </div>
  );
}