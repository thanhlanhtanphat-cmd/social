import { Profile, Link } from './types';

export const DEFAULT_PROFILE: Profile = {
  name: 'Abigail',
  bio: 'Sharing my personal life with my community 😀',
  avatarUrl: 'https://picsum.photos/seed/abigail/200/200',
  theme: {
    background: 'linear-gradient(135deg, #A61D21 0%, #6B1214 100%)',
    textColor: '#ffffff',
    cardBackground: '#ffffff',
    cardTextColor: '#1e293b',
  }
};

export const DEFAULT_LINKS: Link[] = [
  {
    id: '1',
    title: 'Facebook',
    url: 'https://facebook.com',
    icon: 'facebook',
    buttonText: 'Buy now',
    type: 'social',
    order: 1,
    active: true,
    color: '#3b82f6'
  },
  {
    id: '2',
    title: 'Instagram',
    url: 'https://instagram.com',
    icon: 'instagram',
    buttonText: 'Quality photos',
    type: 'social',
    order: 2,
    active: true,
    color: '#db2777'
  },
  {
    id: '3',
    title: 'Twitter',
    url: 'https://twitter.com',
    icon: 'twitter',
    buttonText: 'Contact me',
    type: 'social',
    order: 3,
    active: true,
    color: '#0ea5e9'
  },
  {
    id: '4',
    title: 'Discord',
    url: 'https://discord.com',
    icon: 'discord',
    buttonText: "Let's chat",
    type: 'social',
    order: 4,
    active: true,
    color: '#6366f1'
  },
  {
    id: '5',
    title: 'Donate with Paypal',
    url: 'https://paypal.com',
    icon: 'dollar',
    type: 'action',
    order: 5,
    active: true,
    color: '#1e3a8a'
  },
  {
    id: '6',
    title: 'Donate with Venmo',
    url: 'https://venmo.com',
    icon: 'dollar',
    type: 'action',
    order: 6,
    active: true,
    color: '#2563eb'
  },
  {
    id: '7',
    title: '+1-541-754-3010',
    url: 'tel:+15417543010',
    icon: 'phone',
    type: 'action',
    order: 7,
    active: true,
    color: '#3b82f6'
  }
];
