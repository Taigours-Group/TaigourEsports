
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-black border-t border-primary/10 pt-16 pb-8">
    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="font-orbitron text-2xl font-black mb-4">
          <span className="text-white">TAIGOUR'S</span>
          <span className="text-primary"> E-SPORTS</span>
        </div>
        <p className="text-gray-400 mb-6 font-rajdhani">Forge Your Legacy, Rule the Game. Join Nepal's elite mobile gaming community.</p>
        <div className="flex gap-4 text-xl">
          <a href="https://discord.gg/f2bgpfNP" className="hover:text-primary transition-all text-white" target="_blank"><i className="fab fa-discord"></i></a>
          <a href="https://www.facebook.com/profile.php?id=61572485841102" className="hover:text-primary transition-all text-white" target="_blank"><i className="fab fa-facebook"></i></a>
          <a href="https://www.youtube.com/@TaigoursE-Sports" className="hover:text-primary transition-all text-white" target="_blank"><i className="fab fa-youtube"></i></a>
          <a href="https://chat.whatsapp.com/HhUd5QQNVDB5xRA67nMB0n" className="hover:text-primary transition-all text-white" target="_blank"><i className="fab fa-whatsapp"></i></a>
        </div>
      </div>
      <div>
        <h4 className="font-orbitron text-primary mb-6">Quick Links</h4>
        <ul className="space-y-3 font-rajdhani text-gray-300">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li><Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link></li>
          <li><Link to="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link></li>
          <li><Link to="/streams" className="hover:text-primary transition-colors">Live Streams</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-orbitron text-primary mb-6">Popular Games</h4>
        <ul className="space-y-3 font-rajdhani text-gray-300">
          <li><a href="#" className="hover:text-primary transition-colors">Free Fire</a></li>
          <li><a href="#" className="hover:text-primary transition-colors">PUBG Mobile</a></li>
          <li><a href="#" className="hover:text-primary transition-colors">Ludo King</a></li>
          <li><a href="#" className="hover:text-primary transition-colors">Valorant Mobile</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-orbitron text-primary mb-6">Contact</h4>
        <ul className="space-y-3 font-rajdhani text-gray-300 text-sm">
          <li><i className="fas fa-envelope text-primary mr-2"></i> info@taigour-esports.com</li>
          <li><i className="fas fa-phone text-primary mr-2"></i> +977 9766115626</li>
          <li><i className="fas fa-map-marker-alt text-primary mr-2"></i> Janakpur, Nepal</li>
        </ul>
      </div>
    </div>
    <div className="mt-16 text-center border-t border-white/5 pt-8 font-rajdhani text-gray-500">
      &copy; 2025 Taigour's E-Sports. All rights reserved.
    </div>
    <div className="mt-0 text-center font-rajdhani text-gray-500">
      Version 3.4.0
    </div>

    <div className="mt-0 text-center font-rajdhani text-gray-500">
      Developed By: TigraTech Pvt. Ltd.
    </div>
  </footer>
);

export default Footer;
