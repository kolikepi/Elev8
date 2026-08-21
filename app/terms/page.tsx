'use client';

import { useLanguage } from '@/lib/language-context';
import { useSiteSettings } from '@/lib/use-settings';
import { LegalPage, LegalSection, LegalPlaceholder } from '@/components/legal-page';

export default function TermsPage() {
  const { lang } = useLanguage();
  const { settings } = useSiteSettings();
  const sq = lang === 'sq';
  const brand = settings.businessName || 'ELEV8';

  return (
    <LegalPage
      label={sq ? 'Ligjore' : 'Legal'}
      title={sq ? 'Kushtet e Përdorimit' : 'Terms & Conditions'}
      intro={sq
        ? `Duke përdorur faqen dhe duke bërë porosi në ${brand}, ju pranoni kushtet e mëposhtme.`
        : `By using this site and placing orders with ${brand}, you agree to the following terms.`}
    >
      <LegalSection heading={sq ? 'Porositë' : 'Orders'}>
        <p>{sq
          ? 'Të gjitha porositë i nënshtrohen disponueshmërisë. Ne ruajmë të drejtën të refuzojmë ose anulojmë një porosi nëse produkti nuk është në gjendje ose nëse ka gabime në çmim.'
          : 'All orders are subject to availability. We reserve the right to refuse or cancel an order if a product is out of stock or if there are pricing errors.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Çmimet dhe pagesa' : 'Pricing & payment'}>
        <p>{sq
          ? 'Çmimet shfaqen në Euro (€). Pagesa pranohet përmes metodave të treguara në checkout. Detajet e pagesës konfirmohen gjatë procesit të porosisë.'
          : 'Prices are shown in Euro (€). Payment is accepted via the methods shown at checkout. Payment details are confirmed during the order process.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Dërgesa' : 'Shipping'}>
        <p>{sq
          ? 'Kushtet dhe tarifat e dërgesës përshkruhen në faqen e Dërgesës. Afatet e dorëzimit janë vlerësime dhe mund të ndryshojnë.'
          : 'Shipping terms and rates are described on the Shipping page. Delivery times are estimates and may vary.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Kthimet' : 'Returns'}>
        <p>{sq
          ? 'Kthimet dhe këmbimet trajtohen sipas politikës sonë të Kthimeve. Ju lutemi lexoni atë faqe për detaje.'
          : 'Returns and exchanges are handled according to our Returns policy. Please read that page for details.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Përgjegjësia' : 'Liability'}>
        <p>{sq
          ? 'Produktet tona janë krijuar për përdorim sportiv dhe të përditshëm. Ne nuk mbajmë përgjegjësi për dëmtime që rrjedhin nga përdorimi i papërshtatshëm.'
          : 'Our products are designed for athletic and everyday use. We are not liable for damage arising from improper use.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Të dhënat ligjore' : 'Legal entity'}>
        <LegalPlaceholder>{sq
          ? 'Emri ligjor i regjistruar dhe të dhënat e kompanisë që qëndrojnë pas këtyre kushteve do të konfirmohen dhe shtohen këtu.'
          : 'The registered legal name and company details behind these terms will be confirmed and added here.'}</LegalPlaceholder>
      </LegalSection>
    </LegalPage>
  );
}
