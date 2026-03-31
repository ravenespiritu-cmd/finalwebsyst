import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { newsletterAPI } from '../../services/api';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await newsletterAPI.subscribe(trimmed);
      const message = response?.data?.message || 'Thanks for subscribing!';
      toast.success(message);
      setEmail('');
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Newsletter Section */}
      <div className="bg-primary-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-semibold text-white">
                Subscribe to Our Newsletter
              </h3>
              <p className="text-primary-100">
                Get exclusive deals, beauty tips, and new arrivals straight to your inbox!
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="px-4 py-3 rounded-l-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-white/30 text-gray-900 disabled:opacity-70"
                aria-label="Email for newsletter"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gray-900 text-white rounded-r-lg hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">
              Ganda Hub
            </h2>
            <p className="text-gray-400 mb-4">
              Your one-stop shop for premium cosmetics and skincare products. 
              Discover beauty that enhances your natural glow.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/share/1H8bFKXeda/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Ganda Hub Cosmetics on Facebook">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/gandahubcosmetics?igsh=MXNtdnUxbDYweDBmbw==" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Ganda Hub Cosmetics on Instagram">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/GandaHub99245" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Ganda Hub Cosmetics on X (Twitter)">
                <FaTwitter className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@ganda.hub.cosmeti?_r=1&_t=ZS-93wBJ9iMqKy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Ganda Hub Cosmetics on TikTok">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/products?on_sale=true" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Sale Items
                </Link>
              </li>
              <li>
                <Link to="/products?featured=true" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shipping-info" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/returns-exchanges" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/faqs" className="text-gray-400 hover:text-primary-400 transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>San Francisco St., Butuan City, Philippines 8600</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span>+63 964 988 7606</span>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=cosmeticsgandahub@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-400 transition-colors break-all"
                  aria-label="Email Ganda Hub Cosmetics (opens Gmail)"
                >
                  cosmeticsgandahub@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {currentYear} Ganda Hub Cosmetics. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <img src="/visa.svg" alt="Visa" className="h-6" onError={(e) => e.target.style.display = 'none'} />
              <img src="/mastercard.svg" alt="Mastercard" className="h-6" onError={(e) => e.target.style.display = 'none'} />
              <img src="/gcash.svg" alt="GCash" className="h-6" onError={(e) => e.target.style.display = 'none'} />
              <span className="text-gray-500 text-sm">Secure Payment</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
