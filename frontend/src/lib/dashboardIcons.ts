import {
  Car, Wifi, Zap as ZapIcon, Layers, Shield, Home, Smartphone, CreditCard,
  PiggyBank, Plane, GraduationCap, TrendingUp, Bell, CheckCircle2,
  AlertTriangle, Bot, Eye, MessageSquare, User, Star, Clock,
  BarChart3, Wallet, type LucideIcon,
} from 'lucide-react'

export const iconMap: Record<string, LucideIcon> = {
  car_insurance: Car,
  broadband: Wifi,
  energy: ZapIcon,
  subscription: Layers,
  home_insurance: Home,
  mobile: Smartphone,
  credit_card: CreditCard,
  emergency: PiggyBank,
  holiday: Plane,
  house: Home,
  education: GraduationCap,
  trend: TrendingUp,
  shield: Shield,
  scan: CheckCircle2,
  alert: AlertTriangle,
  bot: Bot,
  eye: Eye,
  message: MessageSquare,
  users: User,
  star: Star,
  clock: Clock,
  chart: BarChart3,
  wallet: Wallet,
  bell: Bell,
  generic: CheckCircle2,
}

export function getIcon(category: string): LucideIcon {
  return iconMap[category] || CheckCircle2
}
