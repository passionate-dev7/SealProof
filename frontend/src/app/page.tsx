'use client';

import Link from 'next/link';
import { Shield, Upload, CheckCircle, Lock, Zap, Users, TrendingUp, Eye } from 'lucide-react';

export default function Home() {
  const stats = [
    { label: 'Content Registered', value: '10,234', icon: Upload },
    { label: 'Verifications', value: '45,678', icon: CheckCircle },
    { label: 'Active Users', value: '2,456', icon: Users },
    { label: 'Trust Score', value: '98.5%', icon: TrendingUp },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Cryptographic Verification',
      description: 'Content is hashed and verified using SHA-256, ensuring immutability and authenticity.',
    },
    {
      icon: Lock,
      title: 'Blockchain Storage',
      description: 'Metadata stored on Sui blockchain with Walrus decentralized storage for content.',
    },
    {
      icon: Zap,
      title: 'AI Detection',
      description: 'Advanced AI analysis to detect synthetic content and verify authenticity.',
    },
    {
      icon: Eye,
      title: 'Full Transparency',
      description: 'Complete chain of custody tracking with public verification.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Upload Content',
      description: 'Upload your content with optional metadata and privacy settings.',
    },
    {
      number: '02',
      title: 'Blockchain Registration',
      description: 'Content is hashed, stored on Walrus, and registered on Sui blockchain.',
    },
    {
      number: '03',
      title: 'Get Certificate',
      description: 'Receive a cryptographic provenance certificate with permanent proof.',
    },
  ];

  const useCases = [
    {
      title: 'Journalism',
      description: 'Verify authenticity of news content and combat misinformation.',
      icon: '📰',
    },
    {
      title: 'Creative Works',
      description: 'Protect original artwork, music, and creative content.',
      icon: '🎨',
    },
    {
      title: 'Legal Documents',
      description: 'Ensure integrity and provenance of legal documents.',
      icon: '⚖️',
    },
    {
      title: 'Academic Research',
      description: 'Verify research data and publications.',
      icon: '🎓',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-primary-100 dark:bg-primary-900 px-4 py-2 rounded-full mb-6">
              <Shield className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                Powered by Sui & Walrus
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text">Verify Truth</span>
              <br />
              in the Digital Age
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              TruthChain provides cryptographic proof of content authenticity using blockchain technology.
              Register, verify, and trust digital content with immutable provenance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/upload" className="btn btn-primary">
                <Upload className="h-5 w-5 mr-2" />
                Register Content
              </Link>
              <Link href="/verify" className="btn btn-outline">
                <CheckCircle className="h-5 w-5 mr-2" />
                Verify Content
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-200 dark:bg-primary-900 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl mb-4">
                    <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Three simple steps to ensure your content's authenticity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-5xl font-bold gradient-text mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Enterprise-grade verification backed by cutting-edge technology
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="card hover:shadow-xl transition-shadow animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-xl inline-block mb-4">
                    <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Use Cases
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Protecting authenticity across industries
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="card text-center hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-5xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Secure Your Content?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of creators, journalists, and organizations protecting their digital assets
          </p>
          <Link href="/upload" className="btn bg-white text-primary-600 hover:bg-gray-100">
            <Shield className="h-5 w-5 mr-2" />
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}
