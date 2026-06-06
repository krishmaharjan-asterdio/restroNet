import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, MapPin, Twitter, Instagram, Github, ArrowUpRight } from 'lucide-react';

const TICKER_ITEMS = [
  'Fine Dining', 'Rooftop Views', 'Authentic Nepali', 'Craft Cocktails',
  'Date Night', 'Family Tables', 'Artisan Coffee', 'Hidden Gems',
  'Chef Specials', 'Local Flavors', 'Live Music', 'Seasonal Menus',
];

/* ─────────────────────────────────────────────────────────────
   Footer
───────────────────────────────────────────────────────────── */
const Footer = () => {
  const year = new Date().getFullYear();
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <footer className="relative bg-[#0d0d0d] dark:bg-[#080808] overflow-hidden">

      {/* Marquee ticker at top of footer */}
      <div className="overflow-hidden py-3.5 border-b border-[#1a1814]/80">
        <div className="marquee-track-slow">
          {doubled.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.3em] mx-7 text-[#3a3530]"
            >
              <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Subtle warm glow behind logo area */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at top, #fa6500 0%, transparent 70%)',
        }}
      />

      {/* Top section */}
      <div className="relative section-container pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">

          {/* Brand column — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-5">
              <div
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white
                           transition-transform duration-200 group-hover:scale-105
                           shadow-[0_2px_12px_rgba(250,101,0,0.4)]"
              >
                <Utensils size={17} strokeWidth={2.2} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                RESTRO<span className="text-primary">NET</span>
              </span>
            </Link>

            {/* Tagline */}
            <p
              className="text-[#787060] text-sm leading-relaxed max-w-[260px] mb-6"
              style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}
            >
              Discover the finest dining experiences Kathmandu has to offer — curated, honest, and delightful.
            </p>

            {/* Location pill */}
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#5a5248] border border-[#232020] rounded-full px-3.5 py-1.5">
              <MapPin size={11} className="text-primary shrink-0" />
              Kathmandu, Nepal
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2 mt-6">
              <SocialIcon href="https://twitter.com" label="Twitter">
                <Twitter size={14} />
              </SocialIcon>
              <SocialIcon href="https://instagram.com" label="Instagram">
                <Instagram size={14} />
              </SocialIcon>
              <SocialIcon href="https://github.com" label="GitHub">
                <Github size={14} />
              </SocialIcon>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4a4540] mb-5">
              Company
            </h4>
            <ul className="space-y-3.5">
              <FooterLink href="#">About Us</FooterLink>
              <FooterLink href="#">Blog</FooterLink>
              <FooterLink href="#">Careers</FooterLink>
              <FooterLink href="#">Press</FooterLink>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4a4540] mb-5">
              Explore
            </h4>
            <ul className="space-y-3.5">
              <FooterLink to="/search">Search Restaurants</FooterLink>
              <FooterLink to="/discover">Discover</FooterLink>
              <FooterLink to="/search?cuisine=nepali">Nepali Cuisine</FooterLink>
              <FooterLink to="/search?sort=top_rated">Top Rated</FooterLink>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4a4540] mb-5">
              Legal
            </h4>
            <ul className="space-y-3.5">
              <FooterLink href="#">Privacy Policy</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
              <FooterLink href="#">Cookie Policy</FooterLink>
              <FooterLink href="#">Contact</FooterLink>
            </ul>
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="section-container">
        <div className="h-px bg-gradient-to-r from-transparent via-[#2a2520] to-transparent" />
      </div>

      {/* Bottom bar */}
      <div className="relative section-container py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#3d3830]">
            &copy; {year} RestroNet. All rights reserved.
          </p>
          <p className="text-[12px] text-[#3d3830] flex items-center gap-1.5">
            Made with
            <span className="text-primary" aria-label="love">♥</span>
            for Kathmandu
          </p>
        </div>
      </div>

    </footer>
  );
};

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

/** Footer nav link — supports both internal (to) and external (href) */
const FooterLink = ({ to, href, children }) => {
  const cls = `
    group flex items-center gap-1 text-sm text-[#5a5248]
    hover:text-[#c8b99a] transition-colors duration-200 w-fit
  `;

  if (to) {
    return (
      <li>
        <Link to={to} className={cls}>
          {children}
          <ArrowUpRight
            size={11}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-0.5 translate-y-0.5 group-hover:translate-x-0 group-hover:translate-y-0 text-primary"
          />
        </Link>
      </li>
    );
  }

  return (
    <li>
      <a href={href ?? '#'} className={cls}>
        {children}
        <ArrowUpRight
          size={11}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-0.5 translate-y-0.5 group-hover:translate-x-0 group-hover:translate-y-0 text-primary"
        />
      </a>
    </li>
  );
};

/** Small circular social icon button */
const SocialIcon = ({ href, label, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-8 h-8 rounded-lg border border-[#232020] flex items-center justify-center
               text-[#4a4540] hover:text-white hover:border-[#3a3530]
               hover:bg-[#1a1814] transition-all duration-200"
  >
    {children}
  </a>
);

export default Footer;
