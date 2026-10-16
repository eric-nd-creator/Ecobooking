import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check } from 'lucide-react';

const PLANS = [
  { type: 'monthly', label: 'Monthly', price: 30000, per: '/month', features: ['Full court access', 'Online booking', 'Cancel anytime', 'Member statistics'] },
  { type: 'half_yearly', label: 'Half-Yearly', price: 75000, per: '/6 months', badge: 'Popular', features: ['Full court access', 'Online booking', 'Priority booking', 'Member statistics', 'Coaching discounts'] },
  { type: 'yearly', label: 'Yearly', price: 150000, per: '/year', badge: 'Best Value', features: ['Full court access', 'Online booking', 'Priority booking', 'Member statistics', 'Coaching discounts', 'Free guest pass x2'] },
];

const Membership = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900">
      <Navbar />
      <div className="bg-gradient-to-br from-brand-700 to-brand-500 text-white py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">Membership Plans</h1>
        <p className="text-xl text-blue-200">Choose the plan that works best for you</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map(p => (
            <div key={p.type} className={`card relative flex flex-col ${p.badge === 'Best Value' ? 'ring-2 ring-accent-500 shadow-lg' : ''}`}>
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {p.badge}
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{p.label}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-brand-700 dark:text-brand-300">{p.price.toLocaleString()}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">RWF{p.per}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={3} />{f}
                  </li>
                ))}
              </ul>
              {user?.role === 'member' ? (
                <Link to="/member/membership" className="btn-primary text-center">Subscribe Now</Link>
              ) : user ? (
                <span className="text-center text-gray-400 text-sm py-2">Members only</span>
              ) : (
                <Link to="/register" className="btn-primary text-center">Get Started</Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 card bg-gray-50 dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              ['Can I cancel my membership?', 'Yes, monthly memberships can be cancelled before renewal.'],
              ['What payment methods are accepted?', 'We accept payment via MTN Mobile Money (MoMo).'],
              ['Can I book a court without membership?', 'Only members with active memberships (or those booked by coaches) can reserve courts. Non-members can also book as a guest for a per-session fee.'],
            ].map(([q, a]) => (
              <div key={q} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{q}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Membership;
