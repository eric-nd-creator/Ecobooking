import { Link } from 'react-router-dom';
import ImageSlider from '../components/ImageSlider';
import Navbar from '../components/Navbar';
import {
  CalendarClock, Clock3, Trophy, BarChart3, CreditCard, BellRing,
  Users, Smartphone, ChartColumnBig,
} from 'lucide-react';

const FEATURES = [
  { Icon: CalendarClock, title: 'Easy Court Booking', desc: 'Book any of our 6 professional courts online in seconds. Real-time availability at your fingertips.' },
  { Icon: Clock3, title: 'Flexible Scheduling', desc: 'Choose your preferred time slots from 6 AM to 10 PM. Conflict-free automated scheduling.' },
  { Icon: Trophy, title: 'Expert Coaching', desc: 'Book sessions with our certified coaches. Improve your game with professional guidance.' },
  { Icon: BarChart3, title: 'Usage Analytics', desc: 'Track your court usage, attendance history, and performance statistics on your dashboard.' },
  { Icon: CreditCard, title: 'Simple Membership', desc: 'Choose monthly, half-yearly or yearly membership plans. Secure payments via mobile money.' },
  { Icon: BellRing, title: 'Instant Notifications', desc: 'Get confirmations and reminders for your bookings automatically.' },
];

const COURTS = [
  { name: 'Court 1', type: 'Hard Court', color: 'bg-blue-500' },
  { name: 'Court 2', type: 'Clay Court', color: 'bg-orange-500' },
  { name: 'Court 3', type: 'Grass Court', color: 'bg-green-500' },
  { name: 'Court 4', type: 'Hard Court', color: 'bg-blue-500' },
  { name: 'Court 5', type: 'Clay Court', color: 'bg-orange-500' },
  { name: 'Court 6', type: 'Hard Court', color: 'bg-blue-500' },
];

const Home = () => (
  <div className="min-h-screen flex flex-col dark:bg-gray-900">
    <Navbar />
    <ImageSlider />

    {/* Stats bar */}
    <div className="bg-brand-700 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[['6', 'Tennis Courts'], ['3', 'Membership Plans'], ['24/7', 'Online Booking'], ['100+', 'Active Members']].map(([n, l]) => (
          <div key={l}>
            <div className="text-3xl font-bold text-accent-400">{n}</div>
            <div className="text-sm text-blue-200 mt-1">{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* About section */}
    <section className="py-20 bg-white dark:bg-gray-900" id="about">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-accent-500 font-semibold text-sm uppercase tracking-wide">About Us</span>
            <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mt-2 mb-6">College Tennis Management System</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Welcome to our state-of-the-art tennis facility management system. We provide seamless court reservations,
              professional coaching services, and comprehensive usage analytics to enhance your tennis experience.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              Our platform serves members, coaches, ball boys, and administrators, creating a unified ecosystem
              for efficient tennis facility management.
            </p>
            <div className="flex gap-4">
              <Link to="/membership" className="btn-primary">Join Now</Link>
              <Link to="/about" className="btn-outline">Learn More</Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-brand-700 to-brand-500 rounded-3xl p-8 text-white">
            <div className="grid grid-cols-2 gap-6">
              {[[Trophy, 'Professional Courts'], [Users, 'Expert Coaches'], [Smartphone, 'Easy Booking'], [ChartColumnBig, 'Analytics']].map(([Icon, label]) => (
                <div key={label} className="flex flex-col items-center text-center p-4 bg-white/10 rounded-2xl">
                  <Icon className="w-8 h-8 mb-2" strokeWidth={1.5} />
                  <span className="font-medium text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-accent-500 font-semibold text-sm uppercase tracking-wide">Why Choose Us</span>
          <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mt-2">Everything You Need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card hover:shadow-md transition-shadow group animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4">
                <f.Icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Courts */}
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-accent-500 font-semibold text-sm uppercase tracking-wide">Our Facilities</span>
          <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mt-2">6 Professional Courts</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COURTS.map(c => (
            <div key={c.name} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className={`h-40 ${c.color} flex items-center justify-center`}>
                <div className="text-white text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-2" strokeWidth={1.5} />
                  <div className="font-bold text-xl">{c.name}</div>
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{c.type}</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Available</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/booking" className="btn-primary text-lg px-10 py-3">View Availability & Book</Link>
        </div>
      </div>
    </section>

    {/* Membership CTA */}
    <section className="py-20 bg-gradient-to-br from-brand-700 to-brand-500 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Start Playing?</h2>
        <p className="text-xl text-blue-200 mb-10">Join our community and get unlimited access to all facilities.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[['Monthly', '30,000 RWF', '/mo', 'monthly'], ['Half-Yearly', '75,000 RWF', '/6mo', 'half_yearly'], ['Yearly', '150,000 RWF', '/yr', 'yearly']].map(([t, price, per, type]) => (
            <div key={type} className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 ${type === 'yearly' ? 'ring-2 ring-accent-400' : ''}`}>
              {type === 'yearly' && <div className="text-accent-400 font-semibold text-xs uppercase mb-2">Best Value</div>}
              <div className="text-xl font-bold mb-1">{t}</div>
              <div className="text-3xl font-bold text-accent-400">{price}</div>
              <div className="text-blue-200 text-sm mb-4">{per}</div>
              <Link to="/membership" className="block bg-white text-brand-700 font-semibold py-2 rounded-xl hover:bg-gray-100 transition-all">
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 bg-brand-700 rounded-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">TennisCourt Management System</span>
        </div>
        <p className="text-sm">© 2026 TennisCourt. All rights reserved.</p>
      </div>
    </footer>
  </div>
);

export default Home;
