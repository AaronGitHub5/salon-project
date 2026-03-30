import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import API_URL from './config';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  .font-display { font-family: 'Cormorant Garamond', serif !important; }
  .eyebrow-line::before {
    content:'';display:inline-block;width:24px;height:1px;
    background:#B8975A;vertical-align:middle;margin-right:10px;
  }
  .eyebrow-white::before {
    content:'';display:inline-block;width:24px;height:1px;
    background:#D4B07A;vertical-align:middle;margin-right:10px;
  }
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .shimmer{background:linear-gradient(90deg,#E4E0D8 25%,#F2EFE8 50%,#E4E0D8 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
  .svc-card:hover .svc-inner{background:#1A1A18!important;}
  .svc-card:hover .svc-icon{color:#D4B07A!important;}
  .svc-card:hover .svc-name{color:#fff!important;}
  .svc-card:hover .svc-dur{color:rgba(255,255,255,0.45)!important;}
  .svc-card:hover .svc-price{color:#fff!important;}
  .svc-card:hover .svc-from{color:rgba(255,255,255,0.35)!important;}
  .hero-grid::before{
    content:'';position:absolute;inset:0;pointer-events:none;
    background-image:
      repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(180,168,148,0.15) 39px,rgba(180,168,148,0.15) 40px),
      repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(180,168,148,0.15) 39px,rgba(180,168,148,0.15) 40px);
  }
`;

const FALLBACK_REVIEWS = [
  { comment: "Absolutely transformed my hair. The team listened to exactly what I wanted and delivered something even better.", profiles: { full_name: "Sarah M." }, rating: 5 },
  { comment: "I've been coming here for two years. Consistent, professional and genuinely talented stylists.", profiles: { full_name: "James R." }, rating: 5 },
  { comment: "Booked online in under a minute. Arrived, felt completely at ease. Results speak for themselves.", profiles: { full_name: "Priya K." }, rating: 5 },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Choose Your Service", desc: "Browse cuts, colour, highlights and treatments. Each service shows duration and pricing upfront." },
  { step: "02", title: "Pick a Stylist & Time", desc: "Select your preferred stylist and see their live availability. Choose a date and slot that works for you." },
  { step: "03", title: "Confirm & Relax", desc: "Receive an instant confirmation email. A reminder is sent 24 hours before your appointment." },
];

const FAQS = [
  { q: "How do I book an appointment?", a: "Create a free account on our website, choose your service, stylist and a time slot. The whole process takes under a minute and you'll get a confirmation email straight away." },
  { q: "Can I choose my own stylist?", a: "Yes — when booking you can select any available stylist. You'll see their available time slots update in real time based on your chosen date." },
  { q: "What is your cancellation policy?", a: "You can cancel or reschedule any appointment from your account dashboard at any time before the appointment. We ask that you give as much notice as possible." },
  { q: "Do you have a loyalty programme?", a: "Yes. You earn one stamp for every completed appointment. Once you reach 10 stamps you can redeem them for a 10% discount voucher on your next visit." },
  { q: "Can I book as a guest without an account?", a: "Walk-in and phone bookings can be made by contacting the salon directly on 020 8476 7326. Online booking requires a free account so we can send you confirmation and reminders." },
];

const SVC_ICONS = { haircut: "✂", colour: "◈", highlights: "◎", blowdry: "◇", treatment: "△", consultation: "○" };
function svcIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("cut") || n.includes("trim")) return "✂";
  if (n.includes("colour") || n.includes("color") || n.includes("toner")) return "◈";
  if (n.includes("highlight") || n.includes("balayage")) return "◎";
  if (n.includes("blow") || n.includes("style") || n.includes("finish")) return "◇";
  if (n.includes("treat") || n.includes("condition") || n.includes("keratin")) return "△";
  return "○";
}

function Stars({ n }) {
  return <div className="text-sm tracking-widest mb-5" style={{ color: "#D4B07A" }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</div>;
}



export default function LandingPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average: null, total: 0 });
  const [loadingSvcs, setLoadingSvcs] = useState(true);
  const [loadingStylists, setLoadingStylists] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then(r => r.json())
      .then(d => { setServices(Array.isArray(d) ? d : []); setLoadingSvcs(false); })
      .catch(() => setLoadingSvcs(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/stylists`)
      .then(r => r.json())
      .then(d => { setStylists(Array.isArray(d) ? d : []); setLoadingStylists(false); })
      .catch(() => setLoadingStylists(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews/summary`)
      .then(r => r.json())
      .then(d => {
        setReviews(Array.isArray(d.reviews) && d.reviews.length > 0 ? d.reviews : FALLBACK_REVIEWS);
        if (d.average) setReviewStats({ average: d.average, total: d.total });
      })
      .catch(() => setReviews(FALLBACK_REVIEWS));
  }, []);

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const heroRef     = useRef(null);
  const statsRef    = useRef(null);
  const howRef      = useRef(null);
  const svcsRef     = useRef(null);
  const stylistsRef = useRef(null);
  const loyaltyRef  = useRef(null);
  const reviewsRef  = useRef(null);
  const faqRef      = useRef(null);
  const contactRef  = useRef(null);



  // Derive live stats
  const stylistCount = stylists.length || 3;
  const avgRating = reviewStats.average || 4.8;

  return (
    <div className="font-body bg-[#FAFAF8] text-[#1A1A18] overflow-x-hidden">
      <style>{globalStyles}</style>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-[72px] px-6 md:px-16 bg-[#FAFAF8]/92 backdrop-blur-md border-b border-[#E4E0D8] transition-shadow duration-300 ${scrolled ? "shadow-sm" : ""}`}>
        <a href="/" className="font-display text-[1.3rem] font-medium tracking-wide text-[#1A1A18] no-underline">
          Hair by <span style={{ color: "#B8975A" }}>Amnesia</span>
        </a>
        <ul className="hidden md:flex gap-8 list-none m-0 p-0">
          {[["services","Services"],["stylists","Stylists"],["reviews","Reviews"],["contact","Contact"]].map(([id,label]) => (
            <li key={id}>
              <button onClick={() => scrollTo(id)} className="text-[0.72rem] font-light tracking-[0.12em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0">
                {label}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => navigate("/login")} className="text-[0.72rem] font-medium tracking-[0.1em] uppercase text-white bg-[#1A1A18] hover:bg-[#B8975A] px-6 py-3 border-none cursor-pointer transition-colors duration-200">
          Book Now
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="grid md:grid-cols-2 pt-[72px]" ref={heroRef}>
        <div className="flex flex-col justify-center px-6 md:px-16 py-16 md:py-24 md:pr-12">
          <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase mb-6" style={{ color: "#B8975A" }}>
            Harlington, Hayes · Est. 2019
          </p>
          <h1 className="font-display font-light leading-[1.05] mb-7" style={{ fontSize: "clamp(2.8rem,5.5vw,5rem)" }}>
            Where <em style={{ fontStyle: "italic", color: "#B8975A" }}>style</em><br />finds its voice.
          </h1>
          <p className="font-light text-[#7A7870] leading-relaxed max-w-md mb-10 text-[0.93rem]">
            Expert cuts, colour and treatments in Harlington. Book online in seconds — walk out with a look you love.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <button onClick={() => navigate("/login")} className="text-[0.75rem] font-medium tracking-[0.12em] uppercase text-white bg-[#1A1A18] hover:bg-[#B8975A] px-8 py-4 border-none cursor-pointer transition-colors duration-200">
              Book an Appointment
            </button>
            <button onClick={() => scrollTo("services")} className="text-[0.75rem] font-light tracking-wider text-[#7A7870] hover:text-[#1A1A18] bg-transparent cursor-pointer transition-colors duration-200 pb-0.5" style={{ border:"none", borderBottom:"1px solid #E4E0D8" }}>
              View Services
            </button>
          </div>
          <div className="flex gap-10 mt-12 pt-10 border-t border-[#E4E0D8]">
            {[
              { num: "96",              label: "Google Reviews" },
              { num: `${avgRating}★`,  label: "Avg. Rating" },
              { num: `${stylistCount}`, label: "Expert Stylists" },
            ].map(({ num, label }) => (
              <div key={label}>
                <div className="font-display text-[2rem] font-normal leading-none">{num}</div>
                <div className="text-[0.65rem] font-light tracking-[0.1em] uppercase text-[#7A7870] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden md:block overflow-hidden min-h-[580px]" style={{ background: "linear-gradient(135deg,#E8E2D8 0%,#D4CAB8 50%,#C8BEA8 100%)" }}>
          <div className="hero-grid absolute inset-0" />
          <div className="absolute top-12 right-10 w-20 h-20 rounded-full flex items-center justify-center" style={{ border:"1px solid rgba(184,151,90,0.3)" }}>
            <div className="w-14 h-14 rounded-full" style={{ border:"1px solid rgba(184,151,90,0.2)" }} />
          </div>
          <div className="absolute bottom-10 left-0 bg-white px-7 py-5 shadow-xl min-w-[200px]">
            <div className="text-[0.62rem] tracking-[0.15em] uppercase mb-1.5" style={{ color:"#B8975A" }}>Online Booking</div>
            <div className="font-display text-[1.05rem] font-medium text-[#1A1A18]">Available 24 / 7</div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="bg-[#1A1A18] px-6 md:px-16 py-8" ref={statsRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/10">
          {[
            { num: "400+",           label: "Appointments Booked" },
            { num: "88%",            label: "Returning Clients" },
            { num: `${stylistCount}`,label: "Expert Stylists" },
            { num: "24 / 7",         label: "Online Booking" },
          ].map(({ num, label }) => (
            <div key={label} className="md:px-10 first:pl-0 last:pr-0 text-center md:text-left">
              <div className="font-display text-[2rem] font-light text-white leading-none">{num}</div>
              <div className="text-[0.65rem] tracking-[0.1em] uppercase mt-1" style={{ color:"rgba(255,255,255,0.4)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-20 md:py-28 px-6 md:px-16">
        <div ref={howRef}>
          <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#B8975A" }}>How It Works</p>
          <h2 className="font-display font-light leading-tight text-[#1A1A18] mb-14" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
            Book in 3 simple steps.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="bg-[#FAFAF8] p-8 md:p-10" style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="font-display text-[3rem] font-light leading-none mb-6" style={{ color:"#E4E0D8" }}>{s.step}</div>
              <div className="font-display text-[1.2rem] font-medium text-[#1A1A18] mb-3">{s.title}</div>
              <div className="text-[0.85rem] font-light text-[#7A7870] leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="bg-[#FAFAF8] py-20 md:py-28 px-6 md:px-16" id="services">
        <div ref={svcsRef} className="flex justify-between items-end flex-wrap gap-6 mb-12">
          <div>
            <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#B8975A" }}>Our Services</p>
            <h2 className="font-display font-light leading-tight text-[#1A1A18]" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
              Crafted for every<br />hair type & texture.
            </h2>
          </div>
          <p className="font-light text-[#7A7870] leading-relaxed max-w-sm text-[0.87rem]">
            All services delivered by trained stylists using premium products.
          </p>
        </div>
        {loadingSvcs ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
            {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer h-44" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
            {services.map(s => (
              <div key={s.id} className="svc-card cursor-default">
                <div className="svc-inner bg-white p-7 md:p-9 transition-colors duration-200">
                  <div className="svc-icon text-xl mb-5 transition-colors duration-200" style={{ color:"#B8975A" }}>{svcIcon(s.name)}</div>
                  <div className="svc-name font-display text-[1.1rem] font-medium text-[#1A1A18] mb-1.5 transition-colors duration-200">{s.name}</div>
                  <div className="svc-dur text-[0.7rem] tracking-wide text-[#7A7870] mb-5 transition-colors duration-200">{s.duration_minutes} min</div>
                  <div className="svc-price font-display text-[1.45rem] font-light text-[#1A1A18] transition-colors duration-200">
                    £{s.base_price} <span className="svc-from font-body text-[0.72rem] font-light text-[#7A7870] transition-colors duration-200">from</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── STYLISTS ── */}
      <section className="bg-white py-20 md:py-28 px-6 md:px-16" id="stylists">
        <div ref={stylistsRef}>
          <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#B8975A" }}>Meet the Team</p>
          <h2 className="font-display font-light leading-tight text-[#1A1A18] mb-3" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
            The people behind<br />the transformation.
          </h2>
          <p className="font-light text-[#7A7870] leading-relaxed max-w-md text-[0.87rem] mb-12">
            Our stylists bring years of experience and genuine passion to every appointment.
          </p>
        </div>
        {loadingStylists ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="shimmer h-64" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {stylists.map(s => (
              <div key={s.id} className="bg-[#FAFAF8] border border-[#E4E0D8] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className="w-full flex items-center justify-center font-display text-5xl font-light relative" style={{ aspectRatio:"3/2.2", background:"linear-gradient(145deg,#F2EFE8,#E4E0D8)", color:"#B8975A" }}>
                  {s.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                  <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,#B8975A,transparent)" }} />
                </div>
                <div className="p-6">
                  <div className="font-display text-[1.1rem] font-medium text-[#1A1A18] mb-1">{s.name}</div>
                  <div className="text-[0.66rem] tracking-[0.1em] uppercase mb-3" style={{ color:"#B8975A" }}>
                    {s.base_price >= 60 ? "Senior Stylist" : "Stylist"}
                  </div>
                  <div className="text-[0.82rem] font-light text-[#7A7870] leading-relaxed">
                    Passionate about bringing out the best in every client with precision technique and creative flair.
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── LOYALTY CALLOUT ── */}
      <section className="bg-[#1A1A18] py-16 md:py-20 px-6 md:px-16" ref={loyaltyRef}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-20">
          {/* Stamp visual */}
          <div className="flex-shrink-0 flex gap-2 flex-wrap justify-center" style={{ maxWidth: 200 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors duration-200"
                style={{ borderColor: i < 7 ? "#B8975A" : "rgba(255,255,255,0.15)", background: i < 7 ? "rgba(184,151,90,0.15)" : "transparent", color: i < 7 ? "#D4B07A" : "rgba(255,255,255,0.2)" }}>
                {i < 7 ? "✓" : ""}
              </div>
            ))}
          </div>
          <div>
            <p className="eyebrow-white text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#D4B07A" }}>Loyalty Programme</p>
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-light text-white leading-tight mb-4">
              Earn stamps.<br />Get rewarded.
            </h2>
            <p className="text-[0.88rem] font-light leading-relaxed mb-6" style={{ color:"rgba(255,255,255,0.5)" }}>
              Every completed appointment earns you one stamp. Collect 10 stamps and redeem them for a <strong style={{ color:"#D4B07A", fontWeight:400 }}>10% discount voucher</strong> on your next visit. Your stamps never expire.
            </p>
            <button onClick={() => navigate("/login")} className="text-[0.74rem] font-medium tracking-[0.1em] uppercase text-[#1A1A18] bg-white hover:bg-[#D4B07A] px-8 py-3.5 border-none cursor-pointer transition-colors duration-200">
              Start Earning
            </button>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="bg-[#1A1A18] py-20 md:py-28 px-6 md:px-16" id="reviews">
        <div ref={reviewsRef}>
          <p className="eyebrow-white text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#D4B07A" }}>Client Reviews</p>
          <h2 className="font-display font-light leading-tight text-white mb-3" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
            What our clients say.
          </h2>
          <p className="font-light leading-relaxed max-w-md text-[0.87rem] mb-12" style={{ color:"rgba(255,255,255,0.4)" }}>
            {reviewStats.average
              ? `Rated ${reviewStats.average} stars across ${reviewStats.total} verified review${reviewStats.total !== 1 ? "s" : ""}.`
              : "Don't take our word for it — here's what real clients have shared."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
          {reviews.map((r, i) => (
            <div key={i} className="p-8 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-200">
              <Stars n={r.rating} />
              <p className="font-display text-[1.05rem] font-light italic leading-relaxed mb-5" style={{ color:"rgba(255,255,255,0.82)" }}>
                "{r.comment}"
              </p>
              <div className="text-[0.68rem] tracking-[0.1em] uppercase" style={{ color:"rgba(255,255,255,0.28)" }}>
                — {r.profiles?.full_name || "Verified Client"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-20 md:py-28 px-6 md:px-16">
        <div ref={faqRef}>
          <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase mb-3" style={{ color:"#B8975A" }}>FAQ</p>
          <h2 className="font-display font-light leading-tight text-[#1A1A18] mb-12" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
            Common questions.
          </h2>
        </div>
        <div className="max-w-3xl divide-y divide-[#E4E0D8]">
          {FAQS.map((f, i) => (
            <div key={i} className="py-5">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between text-left bg-transparent border-none cursor-pointer gap-4 p-0"
              >
                <span className="font-display text-[1.05rem] font-normal text-[#1A1A18]">{f.q}</span>
                <span className="flex-shrink-0 text-[1.1rem] transition-transform duration-200 font-light" style={{ color:"#B8975A", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
              </button>
              {openFaq === i && (
                <p className="text-[0.85rem] font-light text-[#7A7870] leading-relaxed mt-4 max-w-2xl">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT + MAP ── */}
      <section className="bg-[#FAFAF8] py-20 md:py-28 px-6 md:px-16" id="contact">
        <div ref={contactRef} className="grid md:grid-cols-2 gap-16 md:gap-20 items-start mb-16">
          <div>
            <h2 className="font-display font-light text-[#1A1A18] mb-10" style={{ fontSize:"clamp(1.8rem,3.5vw,2.8rem)" }}>
              Get in touch.
            </h2>
            <div className="flex flex-col gap-8">
              {[
                { label:"Address", value:<>265 High Street Harlington<br />Hayes, UB3 5DF</> },
                { label:"Phone",   value:<a href="tel:02084767326" className="border-b border-[#E4E0D8] hover:border-[#B8975A] transition-colors no-underline text-[#1A1A18]">020 8476 7326</a> },
                { label:"Email",   value:<a href="mailto:no-reply@hairbyamnesia.co.uk" className="border-b border-[#E4E0D8] hover:border-[#B8975A] transition-colors no-underline text-[#1A1A18]">no-reply@hairbyamnesia.co.uk</a> },
                { label:"Hours",   value:<>Mon – Fri 9am – 6:30pm<br />Sat 9am – 6:30pm</> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[0.62rem] tracking-[0.15em] uppercase mb-1.5" style={{ color:"#B8975A" }}>{label}</div>
                  <div className="font-display text-[1.15rem] font-normal text-[#1A1A18] leading-snug">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1A1A18] p-10 flex flex-col items-start gap-5">
            <div className="font-display text-[1.9rem] font-light text-white leading-snug">Ready for a new look?</div>
            <p className="text-[0.85rem] font-light leading-relaxed" style={{ color:"rgba(255,255,255,0.42)" }}>
              Book your appointment online in under a minute. Choose your stylist, service, and time.
            </p>
            <button onClick={() => navigate("/login")} className="mt-2 text-[0.75rem] font-medium tracking-[0.12em] uppercase text-[#1A1A18] bg-white hover:bg-[#D4B07A] px-9 py-4 border-none cursor-pointer transition-colors duration-200">
              Book Now
            </button>
          </div>
        </div>
        {/* Map */}
        <div>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
            <p className="eyebrow-line text-[0.67rem] tracking-[0.2em] uppercase" style={{ color:"#B8975A" }}>Find Us</p>
            <div className="text-[0.72rem] tracking-wide text-[#7A7870] border border-[#E4E0D8] bg-white px-4 py-2">UB3 5DF · 020 8476 7326</div>
          </div>
          <iframe
            title="Hair by Amnesia location"
            src="https://maps.google.com/maps?q=265%20High%20Street%20Harlington%2C%20Hayes%2C%20UB3%205DF&output=embed"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full border-0 block"
            style={{ height:"clamp(260px,38vw,420px)", filter:"grayscale(15%) contrast(1.02)" }}
          />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1A1A18] px-6 md:px-16 py-8 flex items-center justify-between flex-wrap gap-4 border-t border-white/5">
        <div className="font-display text-[1.05rem]" style={{ color:"rgba(255,255,255,0.5)" }}>
          Hair by <span style={{ color:"#D4B07A" }}>Amnesia</span>
        </div>
        <div className="hidden md:flex gap-8">
          {[["services","Services"],["stylists","Stylists"],["reviews","Reviews"],["contact","Contact"]].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-[0.68rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer transition-colors" style={{ color:"rgba(255,255,255,0.28)" }}>
              {label}
            </button>
          ))}
        </div>
        <div className="text-[0.67rem] tracking-wide" style={{ color:"rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} Hair by Amnesia. All rights reserved.
        </div>
      </footer>

      {/* ── FLOATING BOOK NOW ── */}
      <button
        onClick={() => navigate("/login")}
        className="fixed bottom-6 right-6 z-40 text-[0.72rem] font-medium tracking-[0.1em] uppercase text-white bg-[#1A1A18] hover:bg-[#B8975A] px-6 py-3.5 border-none cursor-pointer transition-colors duration-200 shadow-lg md:hidden"
      >
        Book Now
      </button>
    </div>
  );
}