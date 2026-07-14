import {
  Scissors, Sparkles, Hand, Flower2, Heart, Stethoscope,
  MapPin, Clock, ShieldCheck, Zap, Bell, Star, Globe, Lock, CalendarDays,
  Users, BarChart3, type LucideIcon,
} from 'lucide-react';

/**
 * Content as DATA, not markup.
 *
 * Nine feature cards written as nine <div>s is nine places to fix a typo and
 * nine chances for one to drift. Written as an array, it's one map().
 */
export interface Category { icon: LucideIcon; name: string; desc: string; }

export const CATEGORIES: Category[] = [
  { icon: Scissors,    name: 'Hair Salons', desc: 'Cuts, colour, styling, beard & grooming' },
  { icon: Sparkles,    name: 'Beauty Parlors', desc: 'Makeup, facials, threading, waxing & bridal' },
  { icon: Hand,        name: 'Nail Studios', desc: 'Manicure, pedicure, gel, acrylic & nail art' },
  { icon: Flower2,     name: 'Mehndi Studios', desc: 'Bridal, party & occasion mehndi' },
  { icon: Heart,       name: 'Wellness Centers', desc: 'Spa, massage, therapy & relaxation' },
  // Aesthetic Clinics: cosmetic treatments only. Botox, fillers and PRP are
  // NOT offered — they're prescription-only injectables regulated by the PMC.
  // Laser and anti-aging are consultation-first. Enforced in the DB, not here.
  { icon: Stethoscope, name: 'Aesthetic Clinics', desc: 'Skin treatments & aesthetic consultations' },
];

export const STEPS = [
  { n: '01', icon: MapPin,      title: 'Find',   kicker: 'Discover Nearby Businesses',
    desc: 'Search by category, location, or name. Filter by price, rating, and availability to find exactly what you need.' },
  { n: '02', icon: CalendarDays, title: 'Book',  kicker: 'Confirm in Seconds',
    desc: 'View real-time availability, pick your time slot, choose your service, and confirm instantly — no calls required.' },
  { n: '03', icon: Star,        title: 'Arrive', kicker: 'Walk In, Walk Out Glowing',
    desc: 'Get reminders, navigate to the venue, and enjoy a seamless experience. Rate your visit to help the community.' },
];

export const FEATURES = [
  { icon: MapPin,      title: 'Nearby Search',        desc: 'Find businesses within your neighborhood using smart geo-location.' },
  { icon: Clock,       title: 'Real-time Availability', desc: 'See live time slots. No double bookings, no guessing games.' },
  { icon: ShieldCheck, title: 'Verified Businesses',  desc: 'Every business is vetted and reviewed before listing.' },
  { icon: Zap,         title: 'Instant Booking',      desc: 'Confirm your appointment in under 30 seconds with zero friction.' },
  { icon: Bell,        title: 'Smart Reminders',      desc: 'Never miss an appointment with WhatsApp and push notifications.' },
  { icon: Star,        title: 'Reviews & Ratings',    desc: 'Genuine, verified reviews from real customers you can trust.' },
  { icon: Heart,       title: 'Favourite Businesses', desc: 'Save your go-to spots and rebook with a single tap.' },
  { icon: Lock,        title: 'Secure Platform',      desc: 'Bank-grade security. Your data and payments are always protected.' },
  { icon: Globe,       title: 'Multi-city Coverage',  desc: 'Available across all major cities in Pakistan and growing fast.' },
];

export const BUSINESS_FEATURES = [
  { icon: CalendarDays, title: 'Smart Calendar',      desc: 'Drag-and-drop scheduling with real-time sync across all staff.' },
  { icon: Users,        title: 'Staff Management',    desc: 'Assign services, set hours, track performance — all in one place.' },
  { icon: BarChart3,    title: 'Analytics & Reports', desc: 'Revenue, bookings, peak hours, and customer trends at a glance.' },
  { icon: Bell,         title: 'Automated Reminders', desc: 'Reduce no-shows with automatic WhatsApp and SMS reminders.' },
  { icon: Heart,        title: 'CRM & Loyalty',       desc: 'Know your customers. Track history, preferences, build loyalty.' },
  { icon: Globe,        title: 'Online Presence',     desc: 'Your business page, SEO-optimised and visible to thousands daily.' },
];

export const CUSTOMER_BENEFITS = [
  'Find services near you in seconds',
  'See real-time availability — no calls',
  'Compare prices before you commit',
  'Read verified customer reviews',
  'Get automatic appointment reminders',
  'Rebook favorites with one tap',
];

export const BUSINESS_BENEFITS = [
  'Free business listing on NearAppoint',
  'Reduce no-shows with WhatsApp reminders',
  'Manage all bookings from one dashboard',
  'Access customer analytics and insights',
  'Automated WhatsApp & SMS reminders',
  'Grow your online presence effortlessly',
];

export const FAQS = [
  { q: 'Is NearAppoint free to use for customers?',
    a: 'Yes. Browsing, searching and booking is completely free for customers. You pay the business directly for the service you receive.' },
  { q: 'How do I register my business?',
    a: 'Click "Register Your Business", enter your salon name and mobile number, and verify with the code we send you. Setup takes under ten minutes, and our team will help you load your services and staff.' },
  { q: 'How are no-shows reduced?',
    a: 'Every booking triggers automatic WhatsApp reminders — one the day before, and one two hours before with a "still coming?" button. Customers who can\'t make it tell you while there\'s still time to fill the slot.' },
  { q: 'Which cities is NearAppoint available in?',
    a: 'We\'re launching in Lahore first, with Karachi and Islamabad next. If we\'re not in your city yet, register anyway — we\'ll let you know the moment we arrive.' },
  { q: 'How does NearAppoint verify businesses?',
    a: 'Every business submits owner ID and a photo of the premises. Our team reviews each one within 24 hours. Only verified businesses appear in customer search — that\'s what the badge means.' },
  { q: 'Can I manage multiple branches?',
    a: 'Yes. Each branch gets its own calendar, staff roster, opening hours and pricing, while you see everything from a single dashboard.' },
  { q: 'Is my payment information secure?',
    a: 'We never store card details on our servers. All payments are processed by licensed providers, and everything is encrypted in transit and at rest.' },
];

/**
 * ⚠️  THESE PEOPLE DO NOT EXIST.
 *
 * Fatima Malik. Zara Khan of Pearl Beauty Parlor. Ahmed Raza. They are from the
 * design mock.
 *
 * Publishing invented testimonials with real-sounding names is false
 * advertising. In a market that runs on word of mouth, the first salon owner
 * who asks to speak to Zara is the last one who trusts you.
 *
 * DELETE THIS ARRAY, or set SITE.showTestimonials = false, before you send
 * a single visitor to this page.
 */
export const TESTIMONIALS = [
  { quote: 'I used to spend 20 minutes calling salons on a Friday. Now I open NearAppoint, pick a time, and done. Absolute game-changer for women in Pakistan.',
    name: 'Fatima Malik', role: 'Customer, Lahore', badge: 'Customer', color: '#EC4899' },
  { quote: 'Since joining NearAppoint, our no-shows dropped and we added 40 new clients in the first month. The dashboard is incredibly easy to use.',
    name: 'Zara Khan', role: 'Owner, Pearl Beauty Parlor', badge: 'Business', color: '#0F2140' },
  { quote: 'I found an amazing dentist near my office in under 2 minutes. The reviews helped me choose, and the reminder meant I didn\'t forget.',
    name: 'Ahmed Raza', role: 'Customer, Karachi', badge: 'Customer', color: '#8B5CF6' },
  { quote: 'As someone new to the city, NearAppoint was a lifesaver. I found a great mehndi artist for my cousin\'s wedding in a day.',
    name: 'Sara Tariq', role: 'Customer, Islamabad', badge: 'Customer', color: '#F97316' },
  { quote: 'We scaled from 30 to 80 appointments per week within 60 days of listing. The analytics dashboard shows us exactly what\'s working.',
    name: 'Omar Butt', role: 'Manager, Relax Wellness Center', badge: 'Business', color: '#0EA5E9' },
  { quote: 'The verified badge gives me confidence. I know I\'m booking a real, quality business — not some random listing.',
    name: 'Nadia Shah', role: 'Customer, Rawalpindi', badge: 'Customer', color: '#10B981' },
];
