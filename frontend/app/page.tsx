'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, Clock, GitBranch, Shield, BarChart3, Zap, Github, Linkedin, Twitter, Mail, ChevronDown } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4, staggerChildren: 0.1 },
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.5]);

  return (
    <div className="bg-deadman-bg text-deadman-text overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-deadman-cyanGlow via-deadman-cyanLight/5 to-deadman-bg pointer-events-none"
          style={{ opacity: bgOpacity }}
        />
        
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#7EC8E3 1px, transparent 1px), linear-gradient(90deg, #7EC8E3 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-8"
          >
            <Logo size={64} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-heading font-bold mb-6"
          >
            Production fires don&apos;t wait.
            <span className="block text-deadman-cyan mt-2">Neither does DeadMan.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-deadman-muted mb-10 max-w-2xl mx-auto"
          >
            Automated incident response that thinks before you wake up.
            Ingest alerts from any source, execute runbooks automatically,
            and resolve incidents in minutes, not hours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth/signup"
              className="group flex items-center gap-2 px-8 py-3.5 bg-deadman-cyan text-deadman-bg font-semibold rounded-xl hover:bg-deadman-cyan/90 transition-all hover:shadow-lg hover:shadow-deadman-cyan/20"
            >
              Start Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-3.5 text-deadman-muted hover:text-deadman-text transition-colors text-sm"
            >
              How it works
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8"
        >
          <ChevronDown size={24} className="text-deadman-muted" />
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Incident Response is Broken
            </h2>
            <p className="text-deadman-muted text-lg">The old way costs you sleep, customers, and revenue</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: AlertTriangle, title: 'Alert at 2 AM', desc: 'Pager goes off for the third time this week. You groggily reach for your laptop.', crossed: true },
              { icon: Clock, title: '20 min to understand', desc: 'Context switching costs you precious minutes. What changed? Who deployed?', crossed: true },
              { icon: GitBranch, title: 'Manual chaos', desc: 'SSH into boxes, check logs, run scripts. Every incident is a fire drill.', crossed: true },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative bg-deadman-surface border border-deadman-border rounded-xl p-6 text-center group hover:border-deadman-danger/30 hover:shadow-lg hover:shadow-deadman-danger/5 transition-all"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-deadman-border flex items-center justify-center group-hover:bg-deadman-danger/10 transition-colors">
                  <item.icon size={24} className="text-deadman-danger" />
                </div>
                <h3 className="text-lg font-heading font-semibold mb-2 line-through opacity-50">{item.title}</h3>
                <p className="text-sm text-deadman-muted">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <span className="text-2xl font-heading font-bold text-deadman-cyan">→ DeadMan changes this</span>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-deadman-surface/50">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">How It Works</h2>
            <p className="text-deadman-muted text-lg">From alert to resolution in four automated steps</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Alert', desc: 'Grafana, Datadog, Prometheus, or manual trigger', color: 'text-deadman-danger' },
              { step: '02', title: 'Detect', desc: 'AI-powered analysis identifies root cause', color: 'text-deadman-warning' },
              { step: '03', title: 'Execute', desc: 'Runbook runs automatically with every step logged', color: 'text-deadman-cyan' },
              { step: '04', title: 'Report', desc: 'Situation report generated for post-mortem', color: 'text-deadman-success' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <motion.div
                  className={`text-5xl font-heading font-bold ${item.color} mb-4`}
                  whileHover={{ scale: 1.1 }}
                >
                  {item.step}
                </motion.div>
                <h3 className="text-lg font-heading font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-deadman-muted">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 text-deadman-muted/30">
                    <ArrowRight size={20} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Enterprise Features</h2>
            <p className="text-deadman-muted text-lg">Everything you need to run incident response at scale</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Webhook Ingestion', desc: 'Receive alerts from Grafana, Datadog, Prometheus, and any custom source via universal webhook endpoint.' },
              { icon: GitBranch, title: 'Runbook Engine', desc: 'Visual drag-and-drop runbook builder with HTTP, Shell, Slack, AWS, and Wait step types.' },
              { icon: Shield, title: 'Dry-Run Mode', desc: 'Test runbooks without side effects. Safe execution mode for validating complex workflows.' },
              { icon: BarChart3, title: 'Situation Reports', desc: 'AI-generated reports combining recent deploys, error rates, and similar past incidents.' },
              { icon: Clock, title: 'MTTR Analytics', desc: 'Track Mean Time To Resolution trends, identify bottlenecks, and measure team performance.' },
              { icon: Zap, title: 'Slack Integration', desc: 'Real-time notifications, escalation workflows, and runbook-triggered Slack messages.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-deadman-surface border border-deadman-border rounded-xl p-6 hover:border-deadman-cyanLight/30 hover:bg-deadman-cyanLight/5 transition-all group hover:shadow-lg hover:shadow-deadman-cyanLight/5"
              >
                <div className="w-10 h-10 rounded-lg bg-deadman-cyanLight/15 flex items-center justify-center mb-4 group-hover:bg-deadman-cyanLight/25 transition-colors">
                  <feature.icon size={20} className="text-deadman-cyanLight" />
                </div>
                <h3 className="font-heading font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-deadman-muted">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4 bg-deadman-surface/50">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 {...fadeInUp} className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Built For Modern Infrastructure
          </motion.h2>
          <motion.p {...fadeInUp} className="text-deadman-muted mb-12">
            Powered by industry-standard tools and frameworks
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-8 items-center"
          >
            {[
              { name: 'Next.js', desc: 'React Framework' },
              { name: 'Node.js', desc: 'Runtime' },
              { name: 'PostgreSQL', desc: 'Database' },
              { name: 'Redis', desc: 'Queue & Cache' },
              { name: 'BullMQ', desc: 'Job Queue' },
              { name: 'Socket.io', desc: 'WebSocket' },
              { name: 'Docker', desc: 'Container' },
              { name: 'TypeScript', desc: 'Language' },
            ].map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="px-6 py-4 bg-deadman-surface border border-deadman-border rounded-xl hover:border-deadman-cyanLight/30 hover:shadow-md hover:shadow-deadman-cyanLight/5 transition-all"
              >
                <p className="font-mono text-sm font-semibold text-deadman-text">{tech.name}</p>
                <p className="text-xs text-deadman-muted mt-0.5">{tech.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Ready to automate your incident response?
          </h2>
          <p className="text-deadman-muted text-lg mb-8">
            Get started in minutes. Connect your monitoring, create runbooks, and let DeadMan handle the rest.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-deadman-cyan text-deadman-bg font-semibold rounded-xl hover:bg-deadman-cyan/90 transition-all hover:shadow-lg hover:shadow-deadman-cyan/20"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-deadman-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-xs text-deadman-muted">© 2024 DeadMan. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            {[
              { icon: Github, href: 'https://github.com/H4rshalshah', label: 'GitHub' },
              { icon: Linkedin, href: 'https://www.linkedin.com/in/h4rshal/', label: 'LinkedIn' },
              { icon: Twitter, href: 'https://x.com/H4rshalshah', label: 'Twitter' },
              { icon: Mail, href: 'mailto:h4rshal.workspace@gmail.com', label: 'Email' },
            ].map((social, i) => (
              <motion.a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-deadman-border text-deadman-muted hover:text-deadman-text transition-all"
                whileHover={{ scale: 1.1 }}
                title={social.label}
              >
                <social.icon size={18} />
              </motion.a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
