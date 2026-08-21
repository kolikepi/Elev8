'use client';

import { useLanguage } from '@/lib/language-context';
import { LegalPage, LegalSection } from '@/components/legal-page';

export default function CookiesPage() {
  const { lang } = useLanguage();
  const sq = lang === 'sq';

  return (
    <LegalPage
      label={sq ? 'Ligjore' : 'Legal'}
      title={sq ? 'Politika e Cookies' : 'Cookie Policy'}
      intro={sq
        ? 'Ne përdorim një numër minimal cookies për të bërë faqen të funksionojë siç duhet.'
        : 'We use a minimal set of cookies to make the site work properly.'}
    >
      <LegalSection heading={sq ? 'Cookies thelbësore' : 'Essential cookies'}>
        <p>{sq
          ? 'Këto cookies janë të nevojshme që faqja të funksionojë — për shembull, për të mbajtur mend shportën tuaj, sesionin e hyrjes dhe preferencën e gjuhës. Ato nuk mund të çaktivizohen.'
          : 'These cookies are required for the site to function — for example, to remember your cart, login session and language preference. They cannot be disabled.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Cookies analitike' : 'Analytics cookies'}>
        <p>{sq
          ? 'Nëse aktivizohen në të ardhmen, cookies analitike do të na ndihmonin të kuptonim si përdoret faqja. Ato nuk ngarkohen pa pëlqimin tuaj.'
          : 'If enabled in the future, analytics cookies would help us understand how the site is used. They are not loaded without your consent.'}</p>
      </LegalSection>

      <LegalSection heading={sq ? 'Menaxhimi i cookies' : 'Managing cookies'}>
        <p>{sq
          ? 'Mund të pastroni ose bllokoni cookies përmes cilësimeve të shfletuesit tuaj në çdo kohë. Bllokimi i cookies thelbësore mund të ndikojë në funksionimin e faqes.'
          : 'You can clear or block cookies through your browser settings at any time. Blocking essential cookies may affect how the site works.'}</p>
      </LegalSection>
    </LegalPage>
  );
}
