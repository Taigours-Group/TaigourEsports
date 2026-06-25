import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-bg-dark border-t border-white/5 pt-12 md:pt-20 pb-8">
    <div className="container mx-auto px-4 md:px-6"> 
      {/* Main Footer Content */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
        {/* Brand Section */}
        <div className="col-span-2 md:col-span-1">
          <div className="font-space text-2xl md:text-3xl font-bold mb-4">
            <span className="text-white tracking-tight">TAIGOUR</span>
            <span className="text-cyan"> ESPORTS</span>
          </div>
          <p className="text-gray-400 mb-6 font-inter text-sm leading-relaxed">Nepal's premium competitive mobile esports platform. Trusted event management and tournament organization.</p>
          <div className="flex gap-4 text-xl">
            <a href="https://discord.gg/f2bgpfNP" className="text-gray-400 hover:text-cyan transition-colors" target="_blank" rel="noopener noreferrer" title="Discord">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61572485841102" className="text-gray-400 hover:text-cyan transition-colors" target="_blank" rel="noopener noreferrer" title="Facebook">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://www.youtube.com/@TaigoursE-Sports" className="text-gray-400 hover:text-cyan transition-colors" target="_blank" rel="noopener noreferrer" title="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://chat.whatsapp.com/HhUd5QQNVDB5xRA67nMB0n" className="text-gray-400 hover:text-cyan transition-colors" target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <i className="fab fa-whatsapp"></i>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-space text-white mb-6 text-sm font-semibold uppercase tracking-wider">Platform</h4>
          <ul className="space-y-3 font-inter text-gray-400 text-sm">
            <li><Link to="/" className="hover:text-cyan transition-colors">Home</Link></li>
            <li><Link to="/tournaments" className="hover:text-cyan transition-colors">Tournaments</Link></li>
            <li><Link to="/leaderboard" className="hover:text-cyan transition-colors">Leaderboard</Link></li>
            <li><Link to="/streams" className="hover:text-cyan transition-colors">Live Streams</Link></li>
          </ul>
        </div>

        {/* Popular Games */}
        <div>
          <h4 className="font-space text-white mb-6 text-sm font-semibold uppercase tracking-wider">Titles</h4>
          <ul className="space-y-3 font-inter text-gray-400 text-sm">
            <li><a href="#" className="hover:text-cyan transition-colors">Free Fire</a></li>
            <li><a href="#" className="hover:text-cyan transition-colors">PUBG Mobile</a></li>
            <li><a href="#" className="hover:text-cyan transition-colors">Ludo King</a></li>
            <li><a href="#" className="hover:text-cyan transition-colors">Valorant Mobile</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-space text-white mb-6 text-sm font-semibold uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3 font-inter text-gray-400 text-sm">
            <li className="flex items-center gap-3">
              <i className="fas fa-envelope text-cyan"></i>
              <span>info@taigour-esports.com</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fas fa-phone text-cyan"></i>
              <span>+977 9766115626</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fas fa-map-marker-alt text-cyan"></i>
              <span>Janakpur, Nepal</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-white/5 pt-8 mb-9 flex flex-col md:flex-row justify-between items-center gap-4 font-inter text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Taigour Esports. All rights reserved.</p>
        <p>Powered by <a href="https://taigra-nexus-labs.onrender.com" className="text-cyan hover:underline" target="_blank" rel="noopener noreferrer">Taigra Nexus Labs</a></p>
      </div>
    </div>
  </footer>
);

export default Footer;
