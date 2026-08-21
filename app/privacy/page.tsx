'use client';

import { useLanguage } from '@/lib/language-context';
import { useSiteSettings } from '@/lib/use-settings';
import { LegalPage, LegalSection, LegalPlaceholder } from '@/components/legal-page';

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const { settings } = useSiteSettings();
  const sq = lang === 'sq';
  const brand = settings.businessName || 'ELEV8';
  const email = settings.publicEmail;

  return (
    <LegalPage
      label={sq ? 'Ligjore' : 'Legal'}
      title={sq ? 'Politika e Privatësisë' : 'Privacy Policy'}
      intro={sq
        ? `Kjo politikë shpjegon si ${brand} mbledh, përdor dhe mbron të dhënat tuaja personale.`
        : `This policy explains how ${brand} collects, uses and protects your personal data.`}
    >
      <LegalSection heading={sq ? 'Të dhënat që mbledhim' : 'Data we collect'}>
        <p>{sq
          ? 'Kur bëni një porosi ose krijoni një llogari, mbledhim emrin, email-in, numrin e telefonit dhe adresën e dërgesës. Këto të dhëna përdoren vetëm për të përpunuar porositë tuaja dhe për t’ju kontaktuar rreth tyre.'
          : 'When you place an order or create an account, we collect your name, email, phone number and delivery address. This data is used solely to process your orders and to contact you about them.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Si i përdorim' : 'How we use it'}>
        <p>{sq
          ? 'Të dhënat tuaja përdoren për të përmbushur porositë, për të dërguar konfirmime dhe përditësime statusi, dhe për t’iu përgjigjur pyetjeve tuaja. Nuk i shesim të dhënat tuaja palëve të treta.'
          : 'Your data is used to fulfil orders, send confirmations and status updates, and respond to your enquiries. We do not sell your data to third parties.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Ruajtja dhe siguria' : 'Storage & security'}>
        <p>{sq
          ? 'Të dhënat ruhen në mënyrë të sigurt dhe aksesohen vetëm nga personeli i autorizuar. Ne ndërmarrim masa të arsyeshme teknike për t’i mbrojtur ato.'
          : 'Data is stored securely and accessed only by authorised personnel. We take reasonable technical measures to protect it.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Të drejtat tuaja' : 'Your rights'}>
        <p>{sq
          ? 'Ju mund të kërkoni akses, korrigjim ose fshirje të të dhënave tuaja personale në çdo kohë duke na kontaktuar.'
          : 'You may request access to, correction of, or deletion of your personal data at any time by contacting us.'}</p>
        {email ? (
          <p>{sq ? 'Na shkruani në' : 'Contact us at'} <a href={`mailto:${email}`} className="text-[#32FF6A] hover:underline" suppressHydrationWarning>{email}</a>.</p>
        ) : (
          <LegalPlaceholder>{sq
            ? 'Adresa e kontaktit do të shtohet së shpejti.'
            : 'A contact address will be added shortly.'}</LegalPlaceholder>
        )}
      </LegalSection>

      <LegalSection heading={sq ? 'Të dhënat e biznesit' : 'Business details'}>
        <LegalPlaceholder>{sq
          ? 'Emri ligjor i regjistruar, numri i regjistrimit të biznesit dhe numri i TVSH-së (nëse aplikohet) do të konfirmohen dhe shtohen këtu.'
          : 'The registered legal name, business registration number and VAT number (if applicable) will be confirmed and added here.'}</LegalPlaceholder>
      </LegalSection>
    </LegalPage>
  );
}
