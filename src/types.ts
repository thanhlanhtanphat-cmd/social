export interface Link {
  id: string;
  title: string;
  url: string;
  icon: string; // Lucide icon name
  buttonText?: string;
  type: 'social' | 'action';
  order: number;
  active: boolean;
  color?: string;
}

export interface Profile {
  name: string;
  bio: string;
  avatarUrl: string;
  theme: {
    background: string;
    textColor: string;
    cardBackground: string;
    cardTextColor: string;
  };
}
