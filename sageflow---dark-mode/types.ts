import { LucideIcon } from 'lucide-react';

export interface Feature {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  company: string;
  initial: string;
}

export interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

export interface Stat {
  id: number;
  value: string;
  label: string;
}