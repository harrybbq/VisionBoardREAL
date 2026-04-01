import { useEffect } from 'react';

// ── Shared prose wrapper ─────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontFamily: 'var(--serif, Playfair Display, serif)', fontSize: '16px', fontWeight: 700, color: 'var(--text, #e8eaf0)', margin: '0 0 10px', borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: '8px' }}>
        {title}
      </h2>
      <div style={{ fontSize: '13px', lineHeight: 1.75, color: 'rgba(232,234,240,.8)', fontFamily: 'var(--sans, DM Sans, sans-serif)' }}>
        {children}
      </div>
    </div>
  );
}

function P({ children }) {
  return <p style={{ margin: '0 0 10px' }}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul style={{ margin: '6px 0 10px 18px', padding: 0 }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: '5px' }}>{item}</li>)}
    </ul>
  );
}

// ── Privacy Policy ───────────────────────────────────────────────────────
function PrivacyPolicyContent() {
  return (
    <>
      <Section title="1. Who We Are">
        <P>Vision Board ("the App", "we", "us") is a personal productivity and goal-tracking application. For questions about this policy, contact us via the in-app settings or the email address used when you registered.</P>
        <P>We are the data controller for personal data processed through this App. This policy applies to all users based in the United Kingdom and European Economic Area.</P>
      </Section>

      <Section title="2. Data We Collect">
        <P>We collect only what is necessary to provide the service:</P>
        <Ul items={[
          'Email address — used to create and authenticate your account.',
          'User-generated content — boards, trackers, achievements, shop wish-list items, holiday plans, habit entries, and notes that you create inside the App. This is stored as encrypted JSON in our database.',
          'Session data — a short-lived session token stored in your browser to keep you signed in.',
          'Preferences — colour scheme and background image choice, stored in your browser\'s localStorage.',
        ]} />
        <P>We do not collect payment card details, precise location data, biometric data, or any special-category personal data.</P>
      </Section>

      <Section title="3. Legal Basis for Processing">
        <Ul items={[
          'Performance of a contract — processing your email and app data is necessary to deliver the service you signed up for.',
          'Legitimate interests — storing preferences locally so the app works as expected.',
        ]} />
      </Section>

      <Section title="4. How We Use Your Data">
        <Ul items={[
          'To create and manage your account.',
          'To store and sync your app data across devices.',
          'To send transactional emails (account confirmation, password reset) — no marketing emails.',
        ]} />
      </Section>

      <Section title="5. Data Retention">
        <P>Your data is retained for as long as your account is active. You can delete your account and all associated data at any time via Settings → Danger Zone. Account data is permanently erased within 30 days of deletion.</P>
      </Section>

      <Section title="6. Third Parties">
        <P>We use <strong>Supabase</strong> (hosted in the EU) as our database and authentication provider. Supabase processes your email and app data on our behalf under a Data Processing Agreement. No other third-party services receive your personal data.</P>
        <P>We do not sell, rent, or share your data with advertisers or data brokers.</P>
      </Section>

      <Section title="7. Cookies &amp; Local Storage">
        <P>We use:</P>
        <Ul items={[
          'Session cookies — set by Supabase to keep you authenticated. These are essential and cannot be disabled without breaking the service.',
          'localStorage — used to store preferences (colour scheme, backgrounds, reminder dismissals) locally on your device. No third-party tracking cookies are used.',
        ]} />
      </Section>

      <Section title="8. Your Rights (UK GDPR)">
        <P>You have the right to:</P>
        <Ul items={[
          'Access — request a copy of your personal data.',
          'Erasure — delete your account and all data (available in-app under Settings).',
          'Portability — export your data as a JSON file (available in-app under Settings).',
          'Rectification — correct inaccurate data (edit directly in the App).',
          'Restriction — request we limit processing in certain circumstances.',
          'Object — object to processing based on legitimate interests.',
        ]} />
        <P>To exercise any right not available in-app, contact us at the email used for your account.</P>
      </Section>

      <Section title="9. Children">
        <P>The App is not intended for children under 13. We do not knowingly collect data from anyone under 13. If you believe a child has registered, please contact us and we will delete the account promptly.</P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>We will notify registered users of material changes by updating the "Last updated" date below. Continued use of the App after changes constitutes acceptance.</P>
        <P style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>Last updated: April 2025</P>
      </Section>

      <Section title="11. Complaints">
        <P>If you are unhappy with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <span style={{ fontFamily: 'var(--mono)', color: 'var(--em-light, #4dc485)' }}>ico.org.uk</span> or by calling 0303 123 1113.</P>
      </Section>
    </>
  );
}

// ── Terms of Service ─────────────────────────────────────────────────────
function TermsContent() {
  return (
    <>
      <Section title="1. The Service">
        <P>Vision Board is a personal productivity app that lets you track goals, habits, achievements, a wish-list, and holidays. It is provided free of charge. We reserve the right to introduce paid features in the future; any such changes will be communicated clearly before taking effect.</P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must be at least 13 years old to create an account. By creating an account you confirm you meet this requirement. If you are under 18, you confirm you have permission from a parent or guardian.</P>
      </Section>

      <Section title="3. Your Account">
        <Ul items={[
          'You are responsible for keeping your login credentials secure.',
          'You must not share your account with others.',
          'You are responsible for all activity that takes place under your account.',
          'You must provide a valid email address.',
        ]} />
      </Section>

      <Section title="4. Acceptable Use">
        <P>You agree not to:</P>
        <Ul items={[
          'Use the App for any unlawful purpose.',
          'Attempt to access another user\'s account or data.',
          'Reverse-engineer, decompile, or attempt to extract the App\'s source code.',
          'Use automated scripts to scrape or interact with the App.',
          'Upload content that is defamatory, harassing, or infringes third-party rights.',
        ]} />
      </Section>

      <Section title="5. Your Content">
        <P>You own all content you create in the App. By using the App, you grant us a limited licence to store and display your content solely to provide the service. We do not use your content for any other purpose.</P>
      </Section>

      <Section title="6. Availability &amp; Changes">
        <P>We aim for high availability but do not guarantee uninterrupted access. We may update, suspend, or discontinue features at any time. We will give reasonable notice of significant changes where possible.</P>
      </Section>

      <Section title="7. Subscriptions &amp; Payments">
        <P>The App is currently free to use. If a paid subscription tier is introduced:</P>
        <Ul items={[
          'Pricing, billing frequency, and what is included will be clearly disclosed before purchase.',
          'You will have the right to cancel at any time; no hidden fees.',
          'Refunds will be handled in accordance with UK consumer law.',
          'Free features will remain free unless explicitly communicated otherwise with adequate notice.',
        ]} />
      </Section>

      <Section title="8. Intellectual Property">
        <P>The Vision Board name, logo, and underlying code are our intellectual property. Nothing in these terms grants you any rights in them.</P>
      </Section>

      <Section title="9. Disclaimers">
        <P>The App is provided "as is" without warranty of any kind. We do not warrant that the App will be error-free or meet your specific requirements.</P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>To the maximum extent permitted by law, our total liability to you for any claim arising from your use of the App is limited to £50. We are not liable for loss of data, lost profits, or indirect damages. Nothing in these terms limits liability for death or personal injury caused by negligence, or for fraud.</P>
      </Section>

      <Section title="11. Termination">
        <P>You may close your account at any time in Settings. We may suspend or terminate accounts that violate these terms, with notice where reasonably possible.</P>
      </Section>

      <Section title="12. Governing Law">
        <P>These terms are governed by the law of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
        <P style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>Last updated: April 2025</P>
      </Section>
    </>
  );
}

// ── Main LegalPage overlay ───────────────────────────────────────────────
export default function LegalPage({ page, onClose }) {
  // Trap scroll to the overlay
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isPrivacy = page === 'privacy';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(10,12,18,0.96)',
      backdropFilter: 'blur(12px)',
      overflowY: 'auto',
      fontFamily: 'var(--sans, DM Sans, sans-serif)',
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono, DM Mono, monospace)', fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Vision Board
            </div>
            <h1 style={{ fontFamily: 'var(--serif, Playfair Display, serif)', fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
              borderRadius: '10px', color: 'rgba(255,255,255,.7)', cursor: 'pointer',
              fontSize: '13px', padding: '8px 16px', fontFamily: 'var(--sans)',
            }}
          >
            ← Back
          </button>
        </div>

        {/* Toggle between docs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[['privacy', 'Privacy Policy'], ['terms', 'Terms of Service']].map(([key, label]) => (
            <a
              key={key}
              href={`#${key}`}
              onClick={e => { e.preventDefault(); window.location.hash = key; }}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                textDecoration: 'none', cursor: 'pointer', transition: 'all .15s',
                background: page === key ? 'var(--em, #1a7a4a)' : 'rgba(255,255,255,.07)',
                color: page === key ? '#fff' : 'rgba(255,255,255,.5)',
                border: `1px solid ${page === key ? 'var(--em, #1a7a4a)' : 'rgba(255,255,255,.12)'}`,
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Content */}
        {isPrivacy ? <PrivacyPolicyContent /> : <TermsContent />}
      </div>
    </div>
  );
}
