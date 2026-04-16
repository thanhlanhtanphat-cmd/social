import React, { useState, useEffect } from 'react';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Disc as Discord, 
  Github, 
  Linkedin, 
  Youtube, 
  Globe, 
  Phone, 
  Mail, 
  Heart, 
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Settings,
  Layout,
  ExternalLink,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, Profile } from '../types';
import { cn } from '../lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  discord: Discord,
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  heart: Heart,
  dollar: DollarSign,
};

interface MobilePreviewProps {
  profile: Profile;
  links: Link[];
}

export default function MobilePreview({ profile, links }: MobilePreviewProps) {
  const activeLinks = links.filter(l => l.active).sort((a, b) => a.order - b.order);
  const socialLinks = activeLinks.filter(l => l.type === 'social');
  const actionLinks = activeLinks.filter(l => l.type === 'action');

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center py-12 px-6 overflow-y-auto"
      style={{ 
        background: profile.theme.background,
        color: profile.theme.textColor 
      }}
    >
      {/* Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8 text-center"
      >
        <div className="relative w-32 h-32 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse" />
          <img 
            src={profile.avatarUrl || 'https://picsum.photos/seed/avatar/200/200'} 
            alt={profile.name}
            className="w-full h-full rounded-full object-cover border-4 border-white shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
        <p className="text-sm opacity-80 max-w-[280px] leading-relaxed">
          {profile.bio}
        </p>
      </motion.div>

      {/* Social Links Section */}
      <div className="w-full max-w-[400px] space-y-4 mb-8">
        <AnimatePresence mode="popLayout">
          {socialLinks.map((link, index) => {
            const Icon = ICON_MAP[link.icon.toLowerCase()] || Globe;
            return (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between p-3 rounded-full shadow-lg transition-all"
                style={{ 
                  backgroundColor: profile.theme.cardBackground,
                  color: profile.theme.cardTextColor 
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-semibold">{link.title}</span>
                </div>
                {link.buttonText && (
                  <div 
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: link.color || '#3b82f6' }}
                  >
                    {link.buttonText}
                  </div>
                )}
              </motion.a>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action Links Section */}
      {actionLinks.length > 0 && (
        <div className="w-full max-w-[400px] space-y-3">
          <AnimatePresence mode="popLayout">
            {actionLinks.map((link, index) => {
              const Icon = ICON_MAP[link.icon.toLowerCase()] || Globe;
              return (
                <motion.a
                  key={link.id}
                  href={link.url}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (socialLinks.length + index) * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-3 p-4 rounded-3xl font-bold shadow-md transition-all"
                  style={{ 
                    backgroundColor: link.color || '#1e3a8a',
                    color: '#ffffff'
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {link.title}
                </motion.a>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
