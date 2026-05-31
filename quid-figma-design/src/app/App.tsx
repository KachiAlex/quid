import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Shield, TrendingUp, Bot, Zap, Users, Clock,
  Sparkles, Check, Star, Lock, Eye, Brain,
  ArrowRight, ChevronRight, Banknote, Target,
  Bell, LineChart, Award, CheckCircle2
} from 'lucide-react';

export default function App() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1E293B] to-[#0A0E27] text-white overflow-x-hidden">
      {/* Navigation */}
      <Nav />

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-32 overflow-hidden"
      >
        <GradientBackground />
        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <HeroContent />
          <DashboardMockup />
        </div>
      </motion.section>

      {/* Features Grid */}
      <FeaturesSection />

      {/* Quid Shield */}
      <QuidShield />

      {/* Hidden Money Finder */}
      <HiddenMoneyFinder />

      {/* AI Financial Coach */}
      <AICoach />

      {/* Autopilot Switching */}
      <AutopilotSwitching />

      {/* Community Insights */}
      <CommunityInsights />

      {/* Savings Timeline */}
      <SavingsTimeline />

      {/* Premium Features */}
      <PremiumFeatures />

      {/* Comparison Table */}
      <ComparisonTable />

      {/* Testimonials */}
      <Testimonials />

      {/* Security */}
      <SecuritySection />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0A0E27]/80 backdrop-blur-xl border-b border-white/10' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">Quid</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-white/70 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors">How it Works</a>
          <a href="#pricing" className="text-white/70 hover:text-white transition-colors">Pricing</a>
          <a href="#security" className="text-white/70 hover:text-white transition-colors">Security</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-white/70 hover:text-white transition-colors">Sign In</button>
          <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium">
            Get Started
          </button>
        </div>
      </div>
    </motion.nav>
  );
}

function GradientBackground() {
  return (
    <>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3B82F6] rounded-full blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B5CF6] rounded-full blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </>
  );
}

function HeroContent() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-8"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
        <Sparkles className="w-4 h-4 text-[#3B82F6]" />
        <span className="text-sm">Your AI Financial Guardian</span>
      </div>

      <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
        Find Hidden Money.<br />
        <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
          Keep More Cash.
        </span>
      </h1>

      <p className="text-xl text-white/70 leading-relaxed max-w-xl">
        Quid uses AI to scan your finances, find overpayments, cancel forgotten subscriptions,
        and protect you from renewal traps. On autopilot.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2 group">
          Start Finding Money
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <button className="px-8 py-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 font-semibold text-lg">
          Watch Demo
        </button>
      </div>

      <div className="flex items-center gap-8 pt-4">
        <div>
          <div className="text-3xl font-bold">$2.3M+</div>
          <div className="text-sm text-white/60">Money Recovered</div>
        </div>
        <div className="w-px h-12 bg-white/20" />
        <div>
          <div className="text-3xl font-bold">50K+</div>
          <div className="text-sm text-white/60">Active Users</div>
        </div>
        <div className="w-px h-12 bg-white/20" />
        <div>
          <div className="text-3xl font-bold">4.9★</div>
          <div className="text-sm text-white/60">User Rating</div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative"
    >
      <div className="relative z-10 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        {/* Dashboard Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60 mb-1">Financial Health Score</div>
              <div className="text-5xl font-bold">92</div>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#06B6D4] flex items-center justify-center">
              <TrendingUp className="w-10 h-10" />
            </div>
          </div>

          {/* Savings Found */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 border border-white/10">
            <div className="text-sm text-white/70 mb-2">Savings Found This Month</div>
            <div className="text-4xl font-bold mb-4">$847.32</div>
            <div className="flex items-center gap-2 text-[#10B981]">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">+23% from last month</span>
            </div>
          </div>

          {/* AI Alerts */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-white/80">Recent AI Alerts</div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium mb-1">Overpayment Detected</div>
                <div className="text-xs text-white/60">Netflix charged $15.99 instead of $9.99</div>
              </div>
              <div className="text-xs font-mono text-[#EF4444]">-$6.00</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium mb-1">Better Deal Found</div>
                <div className="text-xs text-white/60">Switch to Mint Mobile, save $32/mo</div>
              </div>
              <div className="text-xs font-mono text-[#10B981]">+$384/yr</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium mb-1">Renewal Protection Active</div>
                <div className="text-xs text-white/60">Adobe renewal in 7 days - reviewing alternatives</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 rounded-3xl blur-2xl -z-10" />
    </motion.div>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Eye,
      title: "Overpayment Detection",
      description: "AI scans every transaction to catch billing errors and overcharges automatically"
    },
    {
      icon: Shield,
      title: "Renewal Protection",
      description: "Get alerts before auto-renewals with better alternatives already researched"
    },
    {
      icon: Banknote,
      title: "Hidden Money Finder",
      description: "Discovers forgotten refunds, unclaimed rewards, and abandoned subscriptions"
    },
    {
      icon: Brain,
      title: "AI Financial Coach",
      description: "Personalized insights and recommendations based on your spending patterns"
    },
    {
      icon: Zap,
      title: "Autopilot Switching",
      description: "Automatically finds and switches you to better deals without the hassle"
    },
    {
      icon: Users,
      title: "Community Insights",
      description: "See how others save and discover deals you might be missing"
    }
  ];

  return (
    <section id="features" className="relative py-32 px-6 bg-white text-[#0A0E27]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
          <h2 className="text-5xl font-bold mb-6">Your Financial Guardian</h2>
          <p className="text-xl text-[#64748B] max-w-2xl mx-auto">
            Quid works 24/7 to protect your money, find savings, and optimize your finances automatically
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-2xl bg-white border border-[#0A0E27]/10 hover:shadow-2xl hover:shadow-[#3B82F6]/10 transition-all duration-300 hover:-translate-y-2"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[#64748B] leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuidShield() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] to-[#0A0E27]" />
      <GradientBackground />

      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Quid Shield</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Never Get Trapped by<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Renewal Fees Again
            </span>
          </h2>

          <p className="text-xl text-white/70 mb-8 leading-relaxed">
            Quid Shield monitors all your subscriptions and sends smart alerts before renewals.
            We research better alternatives, negotiate on your behalf, or help you cancel hassle-free.
          </p>

          <div className="space-y-4 mb-8">
            {[
              "14-day advance renewal alerts",
              "AI-researched better alternatives",
              "One-click cancellation assistance",
              "Price increase notifications",
              "Annual plan optimization"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#10B981]" />
                </div>
                <span className="text-white/90">{item}</span>
              </div>
            ))}
          </div>

          <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 font-semibold flex items-center gap-2 group">
            Activate Shield Protection
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20">
            <div className="space-y-4">
              {[
                { name: "Adobe Creative Cloud", date: "Renews in 8 days", current: "$54.99/mo", alternative: "Affinity Suite", saving: "$480/yr", status: "better-found" },
                { name: "Spotify Premium", date: "Renews in 12 days", current: "$10.99/mo", status: "protected" },
                { name: "Amazon Prime", date: "Renews in 24 days", current: "$139/yr", status: "monitoring" }
              ].map((sub, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold mb-1">{sub.name}</div>
                      <div className="text-sm text-white/60">{sub.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">{sub.current}</div>
                    </div>
                  </div>

                  {sub.status === 'better-found' && (
                    <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-[#10B981]">Better Alternative Found</div>
                        <div className="text-sm font-mono text-[#10B981]">Save {sub.saving}</div>
                      </div>
                      <div className="text-xs text-white/70">{sub.alternative} offers similar features</div>
                    </div>
                  )}

                  {sub.status === 'protected' && (
                    <div className="flex items-center gap-2 text-[#3B82F6] text-sm">
                      <Shield className="w-4 h-4" />
                      <span>Shield Active - Monitoring for better deals</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HiddenMoneyFinder() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-white to-[#F8FAFC] text-[#0A0E27]">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-2 lg:order-1"
        >
          <div className="p-8 rounded-3xl bg-white border border-[#0A0E27]/10 shadow-2xl">
            <div className="text-sm text-[#64748B] mb-4">Hidden Money Found</div>
            <div className="text-6xl font-bold mb-8 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              $1,247
            </div>

            <div className="space-y-4">
              {[
                { icon: Banknote, label: "Unclaimed Cashback", amount: "$387", color: "emerald" },
                { icon: Award, label: "Credit Card Points", amount: "$425", color: "blue" },
                { icon: CheckCircle2, label: "Forgotten Subscriptions", amount: "$215", color: "purple" },
                { icon: TrendingUp, label: "Billing Errors", amount: "$220", color: "orange" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC]">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center`}>
                      <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="text-xl font-bold text-[#10B981]">{item.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-1 lg:order-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] mb-6">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Hidden Money Finder</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Your Money is Hiding<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              In Plain Sight
            </span>
          </h2>

          <p className="text-xl text-[#64748B] mb-8 leading-relaxed">
            Our AI scans bank accounts, credit cards, and service providers to find money you didn't know you had.
            Unclaimed refunds, forgotten rewards, duplicate charges, and more.
          </p>

          <div className="space-y-6 mb-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Connect Your Accounts</h4>
                <p className="text-[#64748B]">Securely link your financial accounts with bank-level encryption</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI Scans Everything</h4>
                <p className="text-[#64748B]">Machine learning analyzes transactions, subscriptions, and patterns</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Claim Your Money</h4>
                <p className="text-[#64748B]">We guide you through recovering every dollar we find</p>
              </div>
            </div>
          </div>

          <button className="px-8 py-4 rounded-xl bg-[#0A0E27] text-white hover:bg-[#1E293B] transition-all duration-300 font-semibold flex items-center gap-2 group">
            Start Finding Money
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function AICoach() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#1E293B] to-[#0A0E27]" />

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] mb-6">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">AI Financial Coach</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Like Having a CFO<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              For Your Personal Finances
            </span>
          </h2>

          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-16">
            Get personalized insights, spending analysis, and proactive recommendations based on your unique financial patterns
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: LineChart,
              title: "Spending Insights",
              description: "Understand where your money goes with AI-powered categorization and trend analysis"
            },
            {
              icon: Target,
              title: "Smart Recommendations",
              description: "Get personalized suggestions to optimize spending and maximize savings"
            },
            {
              icon: Bell,
              title: "Proactive Alerts",
              description: "Receive timely notifications about unusual charges, better deals, and opportunities"
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-white/70">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutopilotSwitching() {
  return (
    <section className="relative py-32 px-6 bg-white text-[#0A0E27]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] mb-6">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Autopilot Switching</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Better Deals,<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Zero Effort
            </span>
          </h2>

          <p className="text-xl text-[#64748B] max-w-3xl mx-auto">
            When we find a better deal, we handle the switching process for you. No phone calls, no paperwork, no hassle.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "1", label: "We Find Better", detail: "AI discovers superior alternatives" },
            { step: "2", label: "You Approve", detail: "Review and confirm with one tap" },
            { step: "3", label: "We Switch", detail: "Handle all the tedious work" },
            { step: "4", label: "You Save", detail: "Start saving immediately" }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.label}</h3>
                <p className="text-[#64748B]">{item.detail}</p>
              </div>

              {i < 3 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#3B82F6] to-transparent -translate-x-1/2" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunityInsights() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#F8FAFC] to-white text-[#0A0E27]">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] mb-6">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Community Insights</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Learn From 50,000+<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Smart Savers
            </span>
          </h2>

          <p className="text-xl text-[#64748B] mb-8 leading-relaxed">
            See anonymized insights about what others are saving on, trending deals, and optimization strategies that work
          </p>

          <div className="space-y-4">
            {[
              "Top savings opportunities in your area",
              "Trending service switches this month",
              "Average savings by category",
              "Best-rated alternatives for popular services"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#10B981]" />
                </div>
                <span className="text-[#0A0E27]/90">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          {[
            { category: "Mobile Plans", users: "12,453", avgSaving: "$324/yr", trend: "+18%" },
            { category: "Streaming Services", users: "8,921", avgSaving: "$156/yr", trend: "+24%" },
            { category: "Insurance", users: "6,782", avgSaving: "$487/yr", trend: "+12%" }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-[#0A0E27]/10 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{item.category}</h3>
                <div className="flex items-center gap-2 text-[#10B981] text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {item.trend}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#64748B] mb-1">Users Saving</div>
                  <div className="text-2xl font-bold">{item.users}</div>
                </div>
                <div>
                  <div className="text-sm text-[#64748B] mb-1">Avg. Savings</div>
                  <div className="text-2xl font-bold text-[#10B981]">{item.avgSaving}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function SavingsTimeline() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#1E293B] to-[#0A0E27]" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[#3B82F6] mb-6">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Savings Timeline</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Watch Your Savings<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Grow Over Time
            </span>
          </h2>

          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            See exactly how much you've saved with Quid across different categories and timeframes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20"
        >
          <div className="space-y-6">
            {[
              { period: "First Month", amount: "$847", items: "14 opportunities found" },
              { period: "3 Months", amount: "$2,341", items: "38 opportunities found" },
              { period: "6 Months", amount: "$4,892", items: "67 opportunities found" },
              { period: "1 Year", amount: "$9,247", items: "142 opportunities found" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="flex-shrink-0 w-32 text-white/70">{item.period}</div>
                <div className="flex-1 h-12 rounded-xl bg-white/5 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(i + 1) * 25}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-xl flex items-center justify-end pr-4"
                  >
                    <span className="font-bold text-sm">{item.amount}</span>
                  </motion.div>
                </div>
                <div className="flex-shrink-0 w-48 text-sm text-white/60">{item.items}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PremiumFeatures() {
  return (
    <section id="pricing" className="relative py-32 px-6 bg-white text-[#0A0E27]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-6">
            Choose Your<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Protection Level
            </span>
          </h2>

          <p className="text-xl text-[#64748B] max-w-2xl mx-auto">
            Start free and upgrade as you save more. Most users recover the Premium cost in their first month.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              name: "Free",
              price: "$0",
              period: "forever",
              features: [
                "Basic overpayment detection",
                "Manual subscription tracking",
                "Monthly savings report",
                "Community insights",
                "Email support"
              ],
              cta: "Get Started Free",
              highlighted: false
            },
            {
              name: "Premium",
              price: "$9.99",
              period: "per month",
              features: [
                "Everything in Free, plus:",
                "AI-powered renewal protection",
                "Hidden money finder",
                "Autopilot switching",
                "Real-time alerts",
                "Personalized AI coach",
                "Priority support",
                "Bill negotiation assistance"
              ],
              cta: "Start Premium Trial",
              highlighted: true,
              badge: "Most Popular"
            },
            {
              name: "Family",
              price: "$19.99",
              period: "per month",
              features: [
                "Everything in Premium, plus:",
                "Up to 5 family members",
                "Shared savings dashboard",
                "Family spending insights",
                "Multiple account linking",
                "Dedicated success manager"
              ],
              cta: "Start Family Trial",
              highlighted: false
            }
          ].map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-3xl ${
                tier.highlighted
                  ? 'bg-gradient-to-br from-[#0A0E27] to-[#1E293B] text-white border-2 border-[#3B82F6] shadow-2xl scale-105'
                  : 'bg-white border border-[#0A0E27]/10'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-sm font-medium">
                  {tier.badge}
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  <span className={tier.highlighted ? 'text-white/70' : 'text-[#64748B]'}>{tier.period}</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      tier.highlighted ? 'bg-[#10B981]/20' : 'bg-[#10B981]/10'
                    }`}>
                      <Check className="w-3 h-3 text-[#10B981]" />
                    </div>
                    <span className={`text-sm ${tier.highlighted ? 'text-white/90' : 'text-[#0A0E27]/80'} ${feature.endsWith(':') ? 'font-semibold' : ''}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                tier.highlighted
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:shadow-2xl hover:shadow-blue-500/50'
                  : 'bg-[#0A0E27] text-white hover:bg-[#1E293B]'
              }`}>
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[#64748B]">All plans include a 14-day money-back guarantee. No questions asked.</p>
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#F8FAFC] to-white text-[#0A0E27]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-6">
            Why Choose <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">Quid?</span>
          </h2>
          <p className="text-xl text-[#64748B]">
            See how we compare to traditional budgeting apps and comparison sites
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#0A0E27]/20">
                <th className="text-left py-6 px-6 font-semibold text-lg">Feature</th>
                <th className="text-center py-6 px-6 font-semibold text-lg">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white">
                    <Sparkles className="w-4 h-4" />
                    Quid
                  </div>
                </th>
                <th className="text-center py-6 px-6 text-[#64748B]">Budgeting Apps</th>
                <th className="text-center py-6 px-6 text-[#64748B]">Comparison Sites</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "AI-Powered Detection", quid: true, budget: false, comparison: false },
                { feature: "Automatic Money Recovery", quid: true, budget: false, comparison: false },
                { feature: "Renewal Protection", quid: true, budget: false, comparison: false },
                { feature: "Autopilot Switching", quid: true, budget: false, comparison: false },
                { feature: "Overpayment Alerts", quid: true, budget: false, comparison: false },
                { feature: "Manual Tracking", quid: true, budget: true, comparison: true },
                { feature: "Requires Your Effort", quid: false, budget: true, comparison: true }
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#0A0E27]/10 hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-5 px-6 font-medium">{row.feature}</td>
                  <td className="py-5 px-6 text-center">
                    {row.quid ? (
                      <div className="inline-flex w-8 h-8 rounded-full bg-[#10B981]/20 items-center justify-center">
                        <Check className="w-5 h-5 text-[#10B981]" />
                      </div>
                    ) : (
                      <div className="text-[#64748B]">—</div>
                    )}
                  </td>
                  <td className="py-5 px-6 text-center">
                    {row.budget ? (
                      <div className="inline-flex w-8 h-8 rounded-full bg-[#64748B]/20 items-center justify-center">
                        <Check className="w-5 h-5 text-[#64748B]" />
                      </div>
                    ) : (
                      <div className="text-[#64748B]">—</div>
                    )}
                  </td>
                  <td className="py-5 px-6 text-center">
                    {row.comparison ? (
                      <div className="inline-flex w-8 h-8 rounded-full bg-[#64748B]/20 items-center justify-center">
                        <Check className="w-5 h-5 text-[#64748B]" />
                      </div>
                    ) : (
                      <div className="text-[#64748B]">—</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="relative py-32 px-6 bg-white text-[#0A0E27]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-6">
            Loved by <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">Thousands</span>
          </h2>
          <p className="text-xl text-[#64748B]">Real people, real savings, real stories</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "Sarah Chen",
              role: "Product Designer",
              image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
              quote: "Quid found $1,247 in my first month. Money I had completely forgotten about. The renewal protection alone has saved me hundreds.",
              rating: 5,
              savings: "$1,247"
            },
            {
              name: "Marcus Johnson",
              role: "Software Engineer",
              image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
              quote: "I was skeptical at first, but the AI actually works. It caught a billing error my bank missed and negotiated a better internet plan for me.",
              rating: 5,
              savings: "$892"
            },
            {
              name: "Emily Rodriguez",
              role: "Marketing Manager",
              image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
              quote: "The autopilot switching is incredible. I approved the switch and they handled everything. Saved $40/month on my phone plan with zero effort.",
              rating: 5,
              savings: "$480/yr"
            }
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-white to-[#F8FAFC] border border-[#0A0E27]/10 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>

              <p className="text-[#0A0E27]/80 mb-6 leading-relaxed">"{testimonial.quote}"</p>

              <div className="flex items-center gap-4 pt-6 border-t border-[#0A0E27]/10">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-[#64748B]">{testimonial.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#10B981]">{testimonial.savings}</div>
                  <div className="text-xs text-[#64748B]">saved</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#1E293B] to-[#0A0E27]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] mb-6">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Bank-Level Security</span>
          </div>

          <h2 className="text-5xl font-bold mb-6">
            Your Security is<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Our Priority
            </span>
          </h2>

          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            We use the same security standards as major financial institutions to protect your data
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {[
            { icon: Lock, title: "256-bit Encryption", detail: "Military-grade data protection" },
            { icon: Shield, title: "SOC 2 Certified", detail: "Independently audited security" },
            { icon: Eye, title: "Read-Only Access", detail: "We can't move your money" },
            { icon: CheckCircle2, title: "GDPR Compliant", detail: "Your data, your control" }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-white/70">{item.detail}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center"
        >
          <p className="text-white/80 mb-6">Trusted by leading financial institutions and security experts</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
            {["Plaid", "Stripe", "AWS", "Norton"].map((partner, i) => (
              <div key={i} className="text-2xl font-bold text-white/40">{partner}</div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#1E293B] to-[#0A0E27]" />
      <GradientBackground />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-6xl font-bold mb-6">
            Start Protecting<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              Your Money Today
            </span>
          </h2>

          <p className="text-2xl text-white/70 mb-12 leading-relaxed">
            Join 50,000+ users who've recovered over $2.3M with their AI financial guardian
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="px-10 py-5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 font-bold text-xl flex items-center justify-center gap-2 group">
              Get Started Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-10 py-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 font-bold text-xl">
              Schedule Demo
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/60">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#10B981]" />
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#10B981]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#10B981]" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative py-16 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold">Quid</span>
            </div>
            <p className="text-white/60 text-sm">Your AI financial guardian, protecting and optimizing your money 24/7.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <p>© 2026 Quid. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}