'use client';

import { useLanguage } from '@/lib/language-context';
import { useSiteSettings } from '@/lib/use-settings';
import { LegalPage, LegalSection, LegalPlaceholder } from '@/components/legal-page';

export default function ReturnsPage() {
  const { lang } = useLanguage();
  const { settings } = useSiteSettings();
  const sq = lang === 'sq';
  const email = settings.publicEmail;

  const hasPolicy = !!(
    settings.returnWindowDays ||
    settings.returnConditions ||
    settings.returnProcedure ||
    settings.nonReturnableItems ||
    settings.returnShippingPaidBy
  );

  const paidByLabel = () => {
    if (settings.returnShippingPaidBy === 'merchant') return sq ? 'Ne mbulojmë koston e kthimit.' : 'We cover the cost of return shipping.';
    if (settings.returnShippingPaidBy === 'customer') return sq ? 'Kostoja e kthimit mbulohet nga klienti.' : 'Return shipping cost is covered by the customer.';
    return null;
  };

  return (
    <LegalPage
      label={sq ? 'Ndihmë' : 'Help'}
      title={sq ? 'Kthimet & Këmbimet' : 'Returns & Exchanges'}
      intro={sq
        ? 'Duam që të jeni të kënaqur me blerjen tuaj. Mëposhtë gjeni politikën tonë të kthimeve.'
        : 'We want you to be happy with your purchase. Our returns policy is below.'}
    >
      {!hasPolicy && (
        <LegalPlaceholder>{sq
          ? 'Politika e detajuar e kthimeve do të konfirmohet dhe publikohet së shpejti. Për çdo kërkesë kthimi, ju lutemi na kontaktoni.'
          : 'The detailed returns policy will be confirmed and published shortly. For any return request, please contact us.'}</LegalPlaceholder>
      )}

      {settings.returnWindowDays ? (
        <LegalSection heading={sq ? 'Afati i kthimit' : 'Return window'}>
          <p>{sq
            ? `Ju mund të ktheni produktet brenda ${settings.returnWindowDays} ditëve nga marrja e porosisë.`
            : `You may return items within ${settings.returnWindowDays} days of receiving your order.`}</p>
        </LegalSection>
      ) : null}

      <LegalSection heading={sq ? 'Këmbimet' : 'Exchanges'}>
        <p>{settings.exchangeAllowed
          ? (sq ? 'Këmbimet për madhësi ose ngjyrë të ndryshme janë të mundshme, sipas disponueshmërisë.' : 'Exchanges for a different size or colour are available, subject to availability.')
          : (sq ? 'Aktualisht nuk ofrojmë këmbime; ju lutemi bëni një kthim dhe një porosi të re.' : 'We currently do not offer exchanges; please make a return and place a new order.')}</p>
      </LegalSection>

      {settings.returnConditions ? (
        <LegalSection heading={sq ? 'Kushtet' : 'Conditions'}>
          <p className="whitespace-pre-line" suppressHydrationWarning>{settings.returnConditions}</p>
        </LegalSection>
      ) : null}

      {settings.nonReturnableItems ? (
        <LegalSection heading={sq ? 'Produkte që nuk kthehen' : 'Non-returnable items'}>
          <p className="whitespace-pre-line" suppressHydrationWarning>{settings.nonReturnableItems}</p>
        </LegalSection>
      ) : null}

      {paidByLabel() ? (
        <LegalSection heading={sq ? 'Kostoja e kthimit' : 'Return shipping cost'}>
          <p suppressHydrationWarning>{paidByLabel()}</p>
        </LegalSection>
      ) : null}

      <LegalSection heading={sq ? 'Si të ktheni' : 'How to return'}>
        {settings.returnProcedure ? (
          <p className="whitespace-pre-line" suppressHydrationWarning>{settings.returnProcedure}</p>
        ) : (
          <p>{sq
            ? 'Na kontaktoni për të nisur një kthim dhe do t’ju udhëzojmë hap pas hapi.'
            : 'Contact us to start a return and we will guide you step by step.'}</p>
        )}
        {email ? (
          <p>{sq ? 'Email:' : 'Email:'} <a href={`mailto:${email}`} className="text-[#32FF6A] hover:underline" suppressHydrationWarning>{email}</a></p>
        ) : null}
      </LegalSection>
    </LegalPage>
  );
}
