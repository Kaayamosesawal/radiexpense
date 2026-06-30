import React, { useState } from 'react';

const Contact = ({ setView }) => {
  const [formData, setFormData] = useState({ name: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const phoneNumber = "256783091635";
    const text = `Hello RadiExpense! My name is ${formData.name}. ${formData.message}`;
    const encodedText = encodeURIComponent(text);

    window.open(`https://wa.me/${phoneNumber}?text=${encodedText}`, '_blank');

    setStatus("Opening WhatsApp...");

    setTimeout(() => {
      setFormData({ name: '', message: '' });
      setStatus('');
    }, 3000);
  };

  return (
    <div>
      <section id="contact" className="animate-in pt-16 pb-24">
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-soft border border-gray-100">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-radi-dark mb-2 tracking-tighter">Support & Feedback</h2>
            <p className="text-gray-500 font-medium">Send us a message and we'll reply via WhatsApp.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-4 bg-app-bg rounded-2xl border-none focus:ring-2 focus:ring-radi-orange transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
                How can we help?
              </label>
              <textarea
                placeholder="Describe your issue or suggestion..."
                rows="4"
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-4 bg-app-bg rounded-2xl border-none focus:ring-2 focus:ring-radi-orange transition-all font-semibold"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-radi-orange hover:bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 mt-4"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.605 6.006L0 24l6.117-1.605a11.8 11.8 0 005.93 1.587h.005c6.634 0 12.032-5.396 12.035-12.03a11.75 11.75 0 00-3.417-8.467z" />
              </svg>
              Chat on WhatsApp
            </button>

            {status && (
              <p className="text-center text-[10px] font-black uppercase text-radi-orange mt-4 animate-pulse">
                {status}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-radi-dark text-white rounded-t-[2.5rem] mt-4 px-6 pt-14 pb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-radi-orange rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="font-black text-lg">RadiExpense</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              A product of{' '}
              <a href="https://slirus.com" target="_blank" rel="noopener noreferrer" className="text-radi-orange hover:underline font-semibold">
                Slirus Holdings
              </a>
              . Built to help small and medium businesses track smarter, sell faster, and grow confidently.
            </p>
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Slirus Holdings. All rights reserved.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Quick Links</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {[
                { label: 'Features', view: 'features' },
                { label: 'Download', view: 'download' },
                { label: 'Pricing', view: 'pricing' },
                { label: 'Privacy Policy', view: 'privacy' },
              ].map(({ label, view }) => (
                <li key={label}>
                  <button
                    onClick={() => setView(view)}
                    className="text-gray-300 hover:text-radi-orange transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Contact Us</h4>
            <ul className="flex flex-col gap-4 text-sm">

              {/* Address */}
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Slirus Holdings, Uganda</span>
              </li>

              {/* WhatsApp */}
              <li>
                <a
                  href="https://wa.me/256783091635"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-green-400 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>+256 783 091 635</span>
                </a>
              </li>

              {/* Email */}
              <li>
                <a
                  href="mailto:radiexpense@slirus.com"
                  className="flex items-center gap-3 text-gray-300 hover:text-radi-orange transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>radiexpense@slirus.com</span>
                </a>
              </li>

              {/* Website */}
              <li>
                <a
                  href="https://slirus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-radi-orange transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  <span>slirus.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>Made with care by <span className="text-radi-orange font-semibold">Slirus Holdings</span></p>
          <div className="flex items-center gap-5">
            <a
              href="https://slirus.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-radi-orange transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-white/20">|</span>
            <a
              href="https://slirus.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-radi-orange transition-colors"
            >
              Terms of Use
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;