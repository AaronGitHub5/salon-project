import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');.font-display{font-family:'Cormorant Garamond',serif !important;}`}</style>

      {/* Header */}
      <div className="bg-[#1A1A18] px-6 md:px-16 py-6 flex justify-between items-center">
        <button onClick={() => navigate('/')} className="font-display text-[1.2rem] text-white bg-transparent border-none cursor-pointer">
          Hair by <span style={{ color: '#D4B07A' }}>Amnesia</span>
        </button>
        <button onClick={() => navigate('/')} className="text-[0.72rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Back to Home
        </button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 md:px-16 py-16 md:py-24">
        <p className="text-[0.62rem] tracking-[0.2em] uppercase mb-3" style={{ color: '#B8975A' }}>Legal</p>
        <h1 className="font-display text-[2.4rem] md:text-[3rem] font-light text-[#1A1A18] leading-tight mb-4">Privacy Policy</h1>
        <p className="text-[0.82rem] font-light text-[#7A7870] mb-12">Last updated: April 2026</p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Who we are</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed">
              Hair by Amnesia is a hair salon located at 265 High Street Harlington, Hayes, UB3 5DF. This privacy policy explains how we collect, use, and protect your personal information when you use our online booking system at hairbyamnesia.co.uk.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">What data we collect</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mb-3">When you create an account or book an appointment, we may collect:</p>
            <div className="space-y-2 ml-4">
              {[
                'Your full name',
                'Email address',
                'Phone number (optional)',
                'Booking history and appointment details',
                'Loyalty points balance',
                'Reviews and feedback you submit',
              ].map((item, i) => (
                <p key={i} className="text-[0.85rem] font-light text-[#7A7870] flex items-start gap-2">
                  <span className="text-[0.6rem] mt-1.5" style={{ color: '#B8975A' }}>{'\u2022'}</span>
                  {item}
                </p>
              ))}
            </div>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mt-3">
              For walk-in clients booked by our staff, we may collect your name, phone number, and email address to send appointment confirmations.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Why we collect it</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mb-3">We use your personal data to:</p>
            <div className="space-y-2 ml-4">
              {[
                'Manage your appointments and send booking confirmations',
                'Send appointment reminders 24 hours before your visit',
                'Operate our loyalty programme and issue discount vouchers',
                'Display your reviews on our website (only after admin approval)',
                'Contact you if we need to reschedule or cancel an appointment',
                'Improve our services through anonymised analytics',
              ].map((item, i) => (
                <p key={i} className="text-[0.85rem] font-light text-[#7A7870] flex items-start gap-2">
                  <span className="text-[0.6rem] mt-1.5" style={{ color: '#B8975A' }}>{'\u2022'}</span>
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">How we store your data</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed">
              Your data is stored securely in a cloud-hosted PostgreSQL database provided by Supabase, with encryption at rest and in transit. Access to the database is restricted to our backend server using a private service role key. Row Level Security (RLS) policies are enabled on all database tables to prevent unauthorised access. Your password is hashed by Supabase using bcrypt and is never stored in plain text or accessible to salon staff.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Who can access your data</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mb-3">Your personal information is accessible to:</p>
            <div className="space-y-2 ml-4">
              {[
                'Salon admin staff \u2014 to manage bookings, services, and the loyalty programme',
                'Your assigned stylist \u2014 limited to your name, appointment details, and contact information for the purpose of providing your service',
              ].map((item, i) => (
                <p key={i} className="text-[0.85rem] font-light text-[#7A7870] flex items-start gap-2">
                  <span className="text-[0.6rem] mt-1.5" style={{ color: '#B8975A' }}>{'\u2022'}</span>
                  {item}
                </p>
              ))}
            </div>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mt-3">
              We do not sell, share, or disclose your personal data to any third parties. Transactional emails are sent via Resend, a GDPR-compliant email delivery service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Cookies and local storage</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed">
              Our website does not use tracking cookies or third-party analytics. We use browser local storage solely to maintain your login session via Supabase authentication tokens. No advertising or tracking scripts are present on our site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Data retention</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed">
              We retain your personal data for as long as your account is active. Booking history is kept for business record-keeping purposes. If you wish to have your data deleted, please contact us using the details below and we will remove your account and associated data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Your rights</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mb-3">Under the UK General Data Protection Regulation (UK GDPR), you have the right to:</p>
            <div className="space-y-2 ml-4">
              {[
                'Access the personal data we hold about you',
                'Request correction of inaccurate data',
                'Request deletion of your data',
                'Withdraw consent for us to process your data',
                'Lodge a complaint with the Information Commissioner\u2019s Office (ICO)',
              ].map((item, i) => (
                <p key={i} className="text-[0.85rem] font-light text-[#7A7870] flex items-start gap-2">
                  <span className="text-[0.6rem] mt-1.5" style={{ color: '#B8975A' }}>{'\u2022'}</span>
                  {item}
                </p>
              ))}
            </div>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed mt-3">
              To exercise any of these rights, please contact us at the salon.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-3">Contact us</h2>
            <p className="text-[0.88rem] font-light text-[#7A7870] leading-relaxed">
              Hair by Amnesia<br />
              265 High Street Harlington, Hayes, UB3 5DF<br />
              Phone: 020 8476 7326
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1A1A18] px-6 md:px-16 py-8 flex items-center justify-between flex-wrap gap-4 border-t border-white/5">
        <button onClick={() => navigate('/')} className="font-display text-[1.05rem] bg-transparent border-none cursor-pointer" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Hair by <span style={{ color: '#D4B07A' }}>Amnesia</span>
        </button>
        <div className="text-[0.67rem] tracking-wide" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Hair by Amnesia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
