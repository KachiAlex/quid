import type { ComponentType, SVGProps } from 'react'
import {
  Car, Wifi, Zap as ZapIcon, Layers, Shield, Home, Smartphone, CreditCard,
  PiggyBank, Plane, GraduationCap, TrendingUp, Bell, CheckCircle2,
  AlertTriangle, Bot, Eye, MessageSquare, Star, Clock,
  BarChart3, Wallet, type LucideIcon,
} from 'lucide-react'
import { UserIcon } from '../components/Icons'

type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>

export const iconMap: Record<string, IconComponent> = {
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
  users: UserIcon,
  star: Star,
  clock: Clock,
  chart: BarChart3,
  wallet: Wallet,
  bell: Bell,
  generic: CheckCircle2,
}

export function getIcon(category: string): IconComponent {
  return iconMap[category] || CheckCircle2
}
