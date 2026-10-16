import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { User, Trophy, Users2 as BallBoyIcon, Settings, Check } from 'lucide-react';

const About = () => (
  <div className="min-h-screen flex flex-col dark:bg-gray-900">
    <Navbar />
    {/* Hero */}
    <div className="bg-gradient-to-br from-brand-700 to-brand-500 text-white py-20 text-center">
      <h1 className="text-5xl font-bold mb-4">About Us</h1>
      <p className="text-xl text-blue-200 max-w-2xl mx-auto">
        Modernizing tennis facility management for a better playing experience.
      </p>
    </div>

    <div className="max-w-7xl mx-auto px-4 py-16 space-y-20">
      {/* Mission */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-accent-500 font-semibold text-sm uppercase">Our Mission</span>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2 mb-4">Streamlining Tennis Management</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The Automated Tennis Court Reservation and Usage Analytics System was developed to address the
            operational challenges faced by college tennis facilities, including scheduling conflicts,
            inefficient resource utilization, and limited data-driven insights.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Our platform bridges the gap between traditional management and modern digital solutions,
            providing a seamless experience for members, coaches, ball boys, and administrators.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { n: '6', l: 'Professional Courts', c: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
            { n: '3', l: 'Membership Plans', c: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
            { n: '4', l: 'User Roles', c: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
            { n: '24/7', l: 'Online Access', c: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' }
          ].map(({ n, l, c }) => (
            <div key={l} className={`rounded-2xl p-6 text-center ${c}`}>
              <div className="text-3xl font-bold">{n}</div>
              <div className="text-sm font-medium mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* System roles */}
      <section>
        <div className="text-center mb-12">
          <span className="text-accent-500 font-semibold text-sm uppercase">System Users</span>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">Four Roles, One Platform</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: 'Member', Icon: User, color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
              items: ['Book courts', 'Pay membership', 'View availability', 'Track statistics'] },
            { role: 'Coach', Icon: Trophy, color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
              items: ['Book courts', 'Manage sessions', 'View schedules', 'Track statistics'] },
            { role: 'Ball Boy', Icon: BallBoyIcon, color: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
              items: ['View courts', 'Receive assignments', 'Track schedule', 'View bookings'] },
            { role: 'Administrator', Icon: Settings, color: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
              items: ['Manage all users', 'Oversee bookings', 'View analytics', 'Assign ball boys'] },
          ].map(({ role, Icon, color, items }) => (
            <div key={role} className={`card border-2 ${color}`}>
              <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-black/20 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">{role}</h3>
              <ul className="space-y-2">
                {items.map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={3} />{i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-gradient-to-br from-brand-700 to-brand-500 rounded-3xl p-12 text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
        <p className="text-blue-200 mb-8">Sign up today and get access to all our facilities.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/register" className="bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-all">
            Register Now
          </Link>
          <Link to="/membership" className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/20 transition-all">
            View Plans
          </Link>
        </div>
      </section>
    </div>
  </div>
);

export default About;
