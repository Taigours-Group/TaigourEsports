
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-black border-t border-primary/10 pt-8 md:pt-16 pb-6 md:pb-8">
    <div className="container mx-auto px-3 md:px-4">
      {/* Main Footer Content */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-12">
        {/* Brand Section */}
        <div className="col-span-2 md:col-span-1">
          <div className="font-orbitron text-xl md:text-2xl font-black mb-3 md:mb-4">
            <span className="text-white">TAIGOUR'S</span>
            <span className="text-primary"> E-SPORTS</span>
          </div>
          <p className="text-gray-400 mb-4 md:mb-6 font-rajdhani text-xs md:text-sm leading-relaxed">Forge Your Legacy, Rule the Game. Join Nepal's elite mobile gaming community.</p>
          <div className="flex gap-3 md:gap-4 text-lg md:text-xl">
            <a href="https://discord.gg/f2bgpfNP" className="hover:text-primary transition-all text-white" target="_blank" rel="noopener noreferrer" title="Discord">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61572485841102" className="hover:text-primary transition-all text-white" target="_blank" rel="noopener noreferrer" title="Facebook">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://www.youtube.com/@TaigoursE-Sports" className="hover:text-primary transition-all text-white" target="_blank" rel="noopener noreferrer" title="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://chat.whatsapp.com/HhUd5QQNVDB5xRA67nMB0n" className="hover:text-primary transition-all text-white" target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <i className="fab fa-whatsapp"></i>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-orbitron text-primary mb-3 md:mb-6 text-xs md:text-sm font-bold uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 md:space-y-3 font-rajdhani text-gray-300 text-xs md:text-sm">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link></li>
            <li><Link to="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link></li>
            <li><Link to="/streams" className="hover:text-primary transition-colors">Live Streams</Link></li>
          </ul>
        </div>

        {/* Popular Games */}
        <div>
          <h4 className="font-orbitron text-primary mb-3 md:mb-6 text-xs md:text-sm font-bold uppercase tracking-wider">Popular Games</h4>
          <ul className="space-y-2 md:space-y-3 font-rajdhani text-gray-300 text-xs md:text-sm">
            <li><a href="#" className="hover:text-primary transition-colors">Free Fire</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">PUBG Mobile</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Ludo King</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Valorant Mobile</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-orbitron text-primary mb-3 md:mb-6 text-xs md:text-sm font-bold uppercase tracking-wider">Contact</h4>
          <ul className="space-y-2 md:space-y-3 font-rajdhani text-gray-300 text-[11px] md:text-sm">
            <li className="flex items-start gap-2">
              <i className="fas fa-envelope text-primary mt-0.5 flex-shrink-0"></i>
              <span className="break-words">info@taigour-esports.com</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-phone text-primary mt-0.5 flex-shrink-0"></i>
              <span className="break-words">+977 9766115626</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-map-marker-alt text-primary mt-0.5 flex-shrink-0"></i>
              <span className="break-words">Janakpur, Nepal</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom - Divider and Copyright */}
      <div className="border-t border-white/5 pt-6 md:pt-8 space-y-2 md:space-y-3 text-center font-rajdhani text-xs md:text-sm">
        <p className="text-gray-600">
          Serving the nation since 2024!
        </p>
        <p className="text-gray-600 text-[10px] md:text-xs">
          &copy; 2026 Taigour's E-Sports. All rights reserved. <br />
          Version 7.0.1 | Developed By: <a href="https://taigra-nexus-labs.onrender.com" className="text-primary font-bold" target='_blank'>Taigra Nexus Labs Pvt. Ltd. Janakpur, Nepal</a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
